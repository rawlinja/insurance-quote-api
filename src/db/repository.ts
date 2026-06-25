import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { AppError } from '../errors.js';
import { type ApplicationDTO } from '../types.js';
import { applications, primaryDrivers, additionalDrivers, vehicles } from './schema.js';
import { db, type DbConnection } from './index.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export const repository = {
    createApplication(body: Record<string, unknown>): ApplicationDTO {
        const applicationId = randomUUID();
        const timestamp = now();

        db.transaction((tx) => {
            tx.insert(applications)
                .values({
                    id: applicationId,
                    status: 'started',
                    mailingAddress: (body.mailingAddress as ApplicationDTO['mailingAddress']),
                    garagingAddress: (body.garagingAddress as ApplicationDTO['garagingAddress']),
                    createdAt: timestamp,
                    updatedAt: timestamp,
                })
                .run();

            savePrimaryDriver(
                tx,
                applicationId,
                (body.primaryDriver as ApplicationDTO['primaryDriver']) ?? {},
                timestamp
            );

            saveVehicles(
                tx,
                applicationId,
                (body.vehicles as ApplicationDTO['vehicles']) ?? {},
                timestamp
            );

            saveAdditionalDrivers(
                tx,
                applicationId,
                (body.additionalDrivers as ApplicationDTO['additionalDrivers']) ?? {},
                timestamp
            );
        });

        return this.findByApplicationId(applicationId);
    },

    findByApplicationId(id: string): ApplicationDTO {
        const app = db.query.applications
            .findFirst({
                where: eq(applications.id, id),
                with: { primaryDriver: true, additionalDrivers: true, vehicles: true },
            })
            .sync();

        if (!app) throw new AppError(404, { error: 'not found' });

        return toApplicationDTO(app);
    },

    updateApplication(id: string, dto: ApplicationDTO): void {
        const timestamp = now();

        db.transaction((tx) => {
            tx.update(applications)
                .set({
                    mailingAddress: dto.mailingAddress ?? null,
                    garagingAddress: dto.garagingAddress ?? null,
                    updatedAt: timestamp,
                })
                .where(eq(applications.id, id))
                .run();

            savePrimaryDriver(tx, id, dto.primaryDriver, timestamp);
            saveVehicles(tx, id, dto.vehicles, timestamp);
            saveAdditionalDrivers(tx, id, dto.additionalDrivers, timestamp);
        });
    },

    deleteField(applicationId: string, path: string, dto: ApplicationDTO): void {
        const timestamp = now();
        const [section, ...rest] = path.split('.');
        const handler = DELETE_HANDLERS[section];

        db.transaction((tx) => {
            handler(tx, applicationId, rest, dto, timestamp);
        });
    },

    deleteApplication(id: string): void {
        db.delete(applications).where(eq(applications.id, id)).run();
    },

    submitApplication(id: string, quote: number): void {
        db.update(applications)
            .set({ status: 'submitted', finalQuote: quote, updatedAt: now() })
            .where(eq(applications.id, id))
            .run();
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────
type AppRow = typeof applications.$inferSelect;

type PrimaryDriverRow = typeof primaryDrivers.$inferSelect;

type AdditionalDriverRow = typeof additionalDrivers.$inferSelect;

type VehicleRow = typeof vehicles.$inferSelect;

type AppWithRelations = AppRow & {
    primaryDriver: PrimaryDriverRow | null;
    additionalDrivers: AdditionalDriverRow[];
    vehicles: VehicleRow[];
};

function toApplicationDTO(application: AppWithRelations): ApplicationDTO {
    return {
        id: application.id,
        status: application.status,
        primaryDriver: application.primaryDriver
            ? rowToPrimaryDriver(application.primaryDriver)
            : {},
        mailingAddress: application.mailingAddress ?? null,
        garagingAddress: application.garagingAddress ?? null,
        vehicles: Object.fromEntries(
            application.vehicles.map((vehicle) => [vehicle.vehicleId, rowToVehicle(vehicle)])
        ),
        additionalDrivers: Object.fromEntries(
            application.additionalDrivers.map((driver) => [
                driver.driverId,
                rowToAdditionalDriver(driver),
            ])
        ),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        finalQuote: application.finalQuote,
    };
}

function rowToPrimaryDriver(row: PrimaryDriverRow): ApplicationDTO['primaryDriver'] {
    const driversLicense = rowToDriversLicense(row);

    return compact({
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        maritalStatus: row.maritalStatus,
        driversLicense,
    }) as ApplicationDTO['primaryDriver'];
}

function rowToDriversLicense(
    row: PrimaryDriverRow
): ApplicationDTO['primaryDriver']['driversLicense'] | null {
    if (row.licenseNumber === null && row.licenseState === null) {
        return null;
    }

    return compact({
        number: row.licenseNumber,
        state: row.licenseState,
    }) as ApplicationDTO['primaryDriver']['driversLicense'];
}

function rowToAdditionalDriver(
    row: AdditionalDriverRow
): ApplicationDTO['additionalDrivers'][string] {
    return compact({
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        relationship: row.relationship,
    }) as ApplicationDTO['additionalDrivers'][string];
}

function rowToVehicle(row: VehicleRow): ApplicationDTO['vehicles'][string] {
    return compact({
        make: row.make,
        model: row.model,
        year: row.year,
        vin: row.vin,
    }) as ApplicationDTO['vehicles'][string];
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function savePrimaryDriver(
    conn: DbConnection,
    applicationId: string,
    primaryDriver: ApplicationDTO['primaryDriver'],
    timestamp: string
): void {
    const values = {
        applicationId,
        firstName: primaryDriver.firstName ?? null,
        lastName: primaryDriver.lastName ?? null,
        dateOfBirth: primaryDriver.dateOfBirth ?? null,
        gender: primaryDriver.gender ?? null,
        maritalStatus: primaryDriver.maritalStatus ?? null,
        licenseNumber: primaryDriver.driversLicense?.number ?? null,
        licenseState: primaryDriver.driversLicense?.state ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    conn.insert(primaryDrivers)
        .values(values)
        .onConflictDoUpdate({
            target: primaryDrivers.applicationId,
            set: {
                firstName: values.firstName,
                lastName: values.lastName,
                dateOfBirth: values.dateOfBirth,
                gender: values.gender,
                maritalStatus: values.maritalStatus,
                licenseNumber: values.licenseNumber,
                licenseState: values.licenseState,
                updatedAt: timestamp,
            },
        })
        .run();
}

function saveVehicles(
    conn: DbConnection,
    applicationId: string,
    vehiclesById: ApplicationDTO['vehicles'],
    timestamp: string
): void {
    for (const [vehicleId, vehicle] of Object.entries(vehiclesById)) {
        const values = {
            applicationId,
            vehicleId: vehicleId,
            make: vehicle.make ?? null,
            model: vehicle.model ?? null,
            year: vehicle.year ?? null,
            vin: vehicle.vin ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        conn.insert(vehicles)
            .values(values)
            .onConflictDoUpdate({
                target: [vehicles.vehicleId, vehicles.applicationId],
                set: {
                    make: values.make,
                    model: values.model,
                    year: values.year,
                    vin: values.vin,
                    updatedAt: timestamp,
                },
            })
            .run();
    }
}

function saveAdditionalDrivers(
    conn: DbConnection,
    applicationId: string,
    driversById: ApplicationDTO['additionalDrivers'],
    timestamp: string
): void {
    for (const [driverId, driver] of Object.entries(driversById)) {
        const values = {
            applicationId,
            driverId,
            firstName: driver.firstName ?? null,
            lastName: driver.lastName ?? null,
            dateOfBirth: driver.dateOfBirth ?? null,
            gender: driver.gender ?? null,
            relationship: driver.relationship ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        conn.insert(additionalDrivers)
            .values(values)
            .onConflictDoUpdate({
                target: [additionalDrivers.driverId, additionalDrivers.applicationId],
                set: {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    dateOfBirth: values.dateOfBirth,
                    gender: values.gender,
                    relationship: values.relationship,
                    updatedAt: timestamp,
                },
            })
            .run();
    }
}

function updateApplicationTimestamp(
    conn: DbConnection,
    applicationId: string,
    timestamp: string
): void {
    conn.update(applications)
        .set({ updatedAt: timestamp })
        .where(eq(applications.id, applicationId))
        .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type DeleteHandler = (
    conn: DbConnection,
    id: string,
    rest: string[],
    dto: ApplicationDTO,
    timestamp: string
) => void;

const DELETE_HANDLERS: Record<string, DeleteHandler> = {
    primaryDriver: deletePrimaryDriverField,
    mailingAddress: deleteAddressFieldFactory('mailingAddress'),
    garagingAddress: deleteAddressFieldFactory('garagingAddress'),
    vehicles: deleteVehicle,
    additionalDrivers: deleteAdditionalDriver,
};

function deletePrimaryDriverField(
    conn: DbConnection,
    applicationId: string,
    rest: string[],
    _dto: ApplicationDTO,
    timestamp: string
): void {
    const nullFields = DRIVER_DELETE_MAP[rest.join('.')];

    conn.update(primaryDrivers)
        .set({ ...nullFields, updatedAt: timestamp })
        .where(eq(primaryDrivers.applicationId, applicationId))
        .run();

    updateApplicationTimestamp(conn, applicationId, timestamp);
}

function deleteAddressFieldFactory(column: 'mailingAddress' | 'garagingAddress'): DeleteHandler {
    return (conn, id, rest, dto, timestamp) => {
        const field = rest[0];
        const address = dto[column];

        if (!address) {
            throw new AppError(400, { errors: [{ message: `${column} is not set` }] });
        }

        const updatedAddress = { ...address };
        delete (updatedAddress as Record<string, unknown>)[field];

        conn.update(applications)
            .set({ [column]: updatedAddress, updatedAt: timestamp } as Partial<
                typeof applications.$inferInsert
            >)
            .where(eq(applications.id, id))
            .run();
    };
}

function deleteVehicle(
    conn: DbConnection,
    applicationId: string,
    rest: string[],
    dto: ApplicationDTO,
    timestamp: string
): void {
    const vehicleId = rest[0];

    if (!dto.vehicles[vehicleId]) {
        throw new AppError(400, {
            errors: [{ message: `vehicle '${vehicleId}' not found` }],
        });
    }

    conn.delete(vehicles)
        .where(and(eq(vehicles.applicationId, applicationId), eq(vehicles.vehicleId, vehicleId)))
        .run();

    updateApplicationTimestamp(conn, applicationId, timestamp);
}

function deleteAdditionalDriver(
    conn: DbConnection,
    id: string,
    rest: string[],
    dto: ApplicationDTO,
    timestamp: string
): void {
    const driverId = rest[0];

    if (!dto.additionalDrivers[driverId])
        throw new AppError(400, {
            errors: [{ message: `additional driver '${driverId}' not found` }],
        });

    conn.delete(additionalDrivers)
        .where(
            and(eq(additionalDrivers.applicationId, id), eq(additionalDrivers.driverId, driverId))
        )
        .run();

    updateApplicationTimestamp(conn, id, timestamp);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function now(): string {
    return new Date().toISOString();
}

// Removes null and undefined so fields that were never set don't appear in the API response.
function compact(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, values]) => values !== null && values !== undefined)
    );
}

type PrimaryDriverNullFields = {
    firstName?: null;
    lastName?: null;
    dateOfBirth?: null;
    gender?: null;
    maritalStatus?: null;
    licenseNumber?: null;
    licenseState?: null;
};

const DRIVER_DELETE_MAP: Record<string, PrimaryDriverNullFields> = {
    firstName: { firstName: null },
    lastName: { lastName: null },
    dateOfBirth: { dateOfBirth: null },
    gender: { gender: null },
    maritalStatus: { maritalStatus: null },
    'driversLicense.number': { licenseNumber: null },
    'driversLicense.state': { licenseState: null },
    driversLicense: { licenseNumber: null, licenseState: null },
};
