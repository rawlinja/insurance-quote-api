import { z } from 'zod';
import { US_STATES, type ApplicationDTO } from './types.js';
import type { ValidationError } from './errors.js';
import { calcAge } from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// ERROR FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

export function mapZodErrors(error: z.ZodError): ValidationError[] {
    return error.issues.flatMap((issue) => {
        if (issue.code === 'unrecognized_keys') {
            return issue.keys.map((key) => ({
                field: formatPath([...issue.path, key]),
                message: 'unknown field',
            }));
        }
        return {
            field: formatPath(issue.path),
            message: issue.message,
        };
    });
}

function formatPath(path: PropertyKey[]): string | undefined {
    return path.length > 0 ? path.join('.') : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETENESS CHECK
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY_DRIVER_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus'];
const DRIVERS_LICENSE_FIELDS = ['number', 'state'];
const ADDRESS_FIELDS = ['street', 'city', 'state', 'zip'];
const VEHICLE_FIELDS = ['make', 'model', 'year', 'vin'];
const ADDITIONAL_DRIVER_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'relationship'];

// Zod validates field formats when values are present.
// This validates whether all required values are present.
export function checkCompleteness(dto: ApplicationDTO): ValidationError[] {
    const errors: ValidationError[] = [];

    requireFields(dto.primaryDriver, 'primaryDriver', PRIMARY_DRIVER_FIELDS, errors);

    requireFields(
        dto.primaryDriver?.driversLicense,
        'primaryDriver.driversLicense',
        DRIVERS_LICENSE_FIELDS,
        errors
    );

    requireObjectFields(dto.mailingAddress, 'mailingAddress', ADDRESS_FIELDS, errors);
    requireObjectFields(dto.garagingAddress, 'garagingAddress', ADDRESS_FIELDS, errors);

    requireVehicles(dto.vehicles, errors);

    requireAdditionalDrivers(dto.additionalDrivers, errors);

    return errors;
}

function requireObjectFields(
    obj: Record<string, unknown> | null | undefined,
    field: string,
    requiredFields: string[],
    errors: ValidationError[]
): void {
    if (!obj) {
        errors.push({ field, message: 'required' });
        return;
    }
    requireFields(obj, field, requiredFields, errors);
}

function requireVehicles(vehicles: ApplicationDTO['vehicles'], errors: ValidationError[]): void {
    if (Object.keys(vehicles).length === 0) {
        errors.push({ field: 'vehicles', message: 'at least one vehicle is required' });
        return;
    }
    for (const [vehicleId, vehicle] of Object.entries(vehicles)) {
        requireFields(vehicle, `vehicles.${vehicleId}`, VEHICLE_FIELDS, errors);
    }
}

function requireAdditionalDrivers(
    drivers: ApplicationDTO['additionalDrivers'],
    errors: ValidationError[]
): void {
    for (const [driverId, driver] of Object.entries(drivers)) {
        requireFields(driver, `additionalDrivers.${driverId}`, ADDITIONAL_DRIVER_FIELDS, errors);
    }
}

function requireFields(
    obj: Record<string, unknown> | null | undefined,
    prefix: string,
    requiredFields: readonly string[],
    errors: ValidationError[]
): void {
    for (const field of requiredFields) {
        if (isMissing(obj?.[field])) {
            errors.push({
                field: `${prefix}.${field}`,
                message: 'required',
            });
        }
    }
}

function isMissing(value: unknown): boolean {
    return value === undefined || value === null || value === '';
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const usState = z.enum(US_STATES);
const currentYear = () => new Date().getFullYear();

const DriversLicenseSchema = z
    .object({
        number: z.string().regex(/^[A-Z0-9]{9}$/, 'must be 9 uppercase alphanumeric characters'),
        state: usState,
    })
    .strict()
    .partial();

const gender = z.enum(['male', 'female', 'non-binary']);

const PrimaryDriverSchema = z
    .object({
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
            .refine((dob) => calcAge(dob) >= 18, 'must be 18 or older'),
        gender,
        maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
        driversLicense: DriversLicenseSchema,
    })
    .strict()
    .partial();

const VehicleSchema = z
    .object({
        make: z.string(),
        model: z.string(),
        year: z
            .number()
            .int()
            .refine(
                (y) => y >= 1985 && y <= currentYear() + 1,
                `must be between 1985 and ${currentYear() + 1}`
            ),
        vin: z
            .string()
            .regex(
                /^[A-HJ-NPR-Z0-9]{17}$/,
                'must be 17 characters, A-Z (excluding I, O, Q) and 0-9'
            ),
    })
    .strict()
    .partial();

const AddressSchema = z
    .object({
        street: z.string(),
        city: z.string(),
        state: usState,
        zip: z.string().regex(/^\d{5}$/, 'must be a 5-digit string'),
    })
    .strict()
    .partial();

const AddressWithUnitSchema = AddressSchema.extend({ unit: z.string() }).strict().partial();

const AdditionalDriverSchema = z
    .object({
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
            .refine((dob) => calcAge(dob) >= 16, 'must be 16 or older'),
        gender,
        relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
    })
    .strict()
    .partial();

export const ApplicationWriteSchema = z
    .object({
        primaryDriver: PrimaryDriverSchema,
        mailingAddress: AddressWithUnitSchema,
        garagingAddress: AddressSchema,
        vehicles: z.record(z.string(), VehicleSchema),
        additionalDrivers: z.record(z.string(), AdditionalDriverSchema),
    })
    .strict()
    .partial();

const StaticDeletePathSchema = z.enum([
    'primaryDriver.firstName',
    'primaryDriver.lastName',
    'primaryDriver.dateOfBirth',
    'primaryDriver.gender',
    'primaryDriver.maritalStatus',
    'primaryDriver.driversLicense',
    'primaryDriver.driversLicense.number',
    'primaryDriver.driversLicense.state',
    'mailingAddress.street',
    'mailingAddress.city',
    'mailingAddress.state',
    'mailingAddress.zip',
    'mailingAddress.unit',
    'garagingAddress.street',
    'garagingAddress.city',
    'garagingAddress.state',
    'garagingAddress.zip',
]);

const DynamicDeletePathSchema = z.string().regex(/^(vehicles|additionalDrivers)\.[^.]+$/);

export const DeleteBodySchema = z.object({
    path: z.union([StaticDeletePathSchema, DynamicDeletePathSchema]),
});
