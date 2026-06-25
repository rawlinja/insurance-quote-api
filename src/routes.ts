import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from './errors.js';
import {
    type Address,
    type AddressWithUnit,
    type DriversLicense,
    type ApplicationDTO,
} from './types.js';
import {
    ApplicationWriteSchema,
    DeleteBodySchema,
    checkCompleteness,
    mapZodErrors,
} from './validate.js';
import { runRatingPipeline } from './rating.js';
import { repository } from './db/repository.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
    app.post('/applications', async (req, reply) => {
        const body = parseApplicationWriteBody(req.body);

        validateApplicationLimits(body);

        const dto = repository.createApplication(body as Record<string, unknown>);

        req.log.info({ event: 'application.created', applicationId: dto.id });

        return reply.status(201).send(buildBaseResponse(dto));
    });

    app.get('/applications/:id', async (req, reply) => {
        const { id } = req.params as { id: string };

        const dto = repository.findByApplicationId(id);

        return reply.send(buildFullResponse(dto));
    });

    app.patch('/applications/:id', async (req, reply) => {
        const body = parseApplicationWriteBody(req.body);
        const { id } = req.params as { id: string };

        const existing = repository.findByApplicationId(id);

        assertApplicationCanBeModified(existing);
        validatePatchLimits(existing, body);

        const patched = patchApplication(existing, body);

        repository.updateApplication(id, patched);

        req.log.info({ event: 'application.updated', applicationId: id });

        const updated = repository.findByApplicationId(id);

        return reply.send(buildBaseResponse(updated));
    });

    app.delete('/applications/:id/data', async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = parseDeleteBody(req.body);

        const dto = repository.findByApplicationId(id);

        assertApplicationCanBeModified(dto);

        repository.deleteField(id, body.path, dto);

        req.log.info({ event: 'application.field_deleted', applicationId: id, path: body.path });

        const updated = repository.findByApplicationId(id);

        return reply.send(buildFullResponse(updated));
    });

    app.delete('/applications/:id', async (req, reply) => {
        const { id } = req.params as { id: string };

        const dto = repository.findByApplicationId(id);

        assertApplicationCanBeModified(dto);

        repository.deleteApplication(id);

        req.log.info({ event: 'application.deleted', applicationId: id });

        return reply.status(204).send();
    });

    app.post('/applications/:id/submit', async (req, reply) => {
        const { id } = req.params as { id: string };
        const dto = repository.findByApplicationId(id);

        assertApplicationCanBeModified(dto);
        assertApplicationIsComplete(dto);

        const quote = runRatingPipeline(dto);

        repository.submitApplication(id, quote);

        req.log.info({ event: 'application.submitted', applicationId: id, quote });

        const submitted = repository.findByApplicationId(id);
        return reply.send(buildFullResponse(submitted));
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function parseApplicationWriteBody(body: unknown): z.infer<typeof ApplicationWriteSchema> {
    const result = ApplicationWriteSchema.safeParse(body);
    if (!result.success) throw new AppError(400, { errors: mapZodErrors(result.error) });
    return result.data;
}

function validateApplicationLimits(body: z.infer<typeof ApplicationWriteSchema>): void {
    const vehicleCount = countRecordValues(body.vehicles);
    const driverCount = countRecordValues(body.additionalDrivers);

    if (vehicleCount > 3)
        throw new AppError(400, {
            errors: [{ field: 'vehicles', message: 'maximum 3 vehicles allowed' }],
        });

    if (driverCount > 3)
        throw new AppError(400, {
            errors: [
                { field: 'additionalDrivers', message: 'maximum 3 additional drivers allowed' },
            ],
        });
}

function countRecordValues(record: Record<string, unknown> | undefined): number {
    return record ? Object.keys(record).length : 0;
}

function buildBaseResponse(dto: ApplicationDTO) {
    return {
        id: dto.id,
        status: dto.status,
        primaryDriver: dto.primaryDriver ?? {},
        mailingAddress: dto.mailingAddress,
        garagingAddress: dto.garagingAddress,
        vehicles: dto.vehicles,
        additionalDrivers: dto.additionalDrivers,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
    };
}

function buildFullResponse(dto: ApplicationDTO) {
    const base = buildBaseResponse(dto);

    if (dto.status === 'submitted') {
        return { ...base, quote: dto.finalQuote };
    }

    const errors = checkCompleteness(dto);

    if (errors.length > 0) {
        return { ...base, errors };
    }

    return { ...base, quote: runRatingPipeline(dto) };
}

function assertApplicationCanBeModified(dto: ApplicationDTO): void {
    if (dto.status === 'submitted')
        throw new AppError(409, { error: 'application already submitted' });
}

function validatePatchLimits(
    existing: ApplicationDTO,
    patch: z.infer<typeof ApplicationWriteSchema>
): void {
    assertRecordLimit({
        field: 'vehicles',
        existing: existing.vehicles,
        incoming: patch.vehicles,
        max: 3,
        message: 'maximum 3 vehicles allowed',
    });
    assertRecordLimit({
        field: 'additionalDrivers',
        existing: existing.additionalDrivers,
        incoming: patch.additionalDrivers,
        max: 3,
        message: 'maximum 3 additional drivers allowed',
    });
}

function assertRecordLimit(options: {
    field: string;
    existing: Record<string, unknown>;
    incoming?: Record<string, unknown>;
    max: number;
    message: string;
}): void {
    const incomingKeys = Object.keys(options.incoming ?? {});
    const newKeys = incomingKeys.filter((key) => !(key in options.existing));
    if (Object.keys(options.existing).length + newKeys.length > options.max)
        throw new AppError(400, { errors: [{ field: options.field, message: options.message }] });
}

function patchApplication(
    existing: ApplicationDTO,
    patch: z.infer<typeof ApplicationWriteSchema>
): ApplicationDTO {
    return {
        ...existing,
        primaryDriver:
            'primaryDriver' in patch
                ? patchPrimaryDriver(existing.primaryDriver, patch.primaryDriver)
                : existing.primaryDriver,
        mailingAddress:
            'mailingAddress' in patch
                ? mergeObject(
                      existing.mailingAddress,
                      patch.mailingAddress as Partial<AddressWithUnit>
                  )
                : existing.mailingAddress,
        garagingAddress:
            'garagingAddress' in patch
                ? mergeObject(existing.garagingAddress, patch.garagingAddress as Partial<Address>)
                : existing.garagingAddress,
        vehicles:
            'vehicles' in patch
                ? mergeMap(existing.vehicles, patch.vehicles ?? {})
                : existing.vehicles,
        additionalDrivers:
            'additionalDrivers' in patch
                ? mergeMap(existing.additionalDrivers, patch.additionalDrivers ?? {})
                : existing.additionalDrivers,
    };
}

function patchPrimaryDriver(
    existing: ApplicationDTO['primaryDriver'],
    patch: z.infer<typeof ApplicationWriteSchema>['primaryDriver']
): ApplicationDTO['primaryDriver'] {
    if (!patch) return existing;
    return {
        ...existing,
        ...patch,
        driversLicense:
            'driversLicense' in patch
                ? mergeObject(
                      existing?.driversLicense,
                      patch.driversLicense as Partial<DriversLicense>
                  )
                : existing?.driversLicense,
    } as ApplicationDTO['primaryDriver'];
}

function mergeObject<T extends object>(
    existing: T | null | undefined,
    patch: Partial<T> | null | undefined
): T {
    return { ...existing, ...patch } as T;
}

function mergeMap<T>(
    existing: Record<string, T>,
    patch: Record<string, Partial<T>>
): Record<string, T> {
    const result = { ...existing };

    for (const [k, v] of Object.entries(patch)) result[k] = { ...existing[k], ...v } as T;

    return result;
}

function parseDeleteBody(body: unknown): z.infer<typeof DeleteBodySchema> {
    const result = DeleteBodySchema.safeParse(body);
    if (!result.success) throw new AppError(400, { errors: mapZodErrors(result.error) });
    return result.data;
}

function assertApplicationIsComplete(dto: ApplicationDTO): void {
    const errors = checkCompleteness(dto);
    if (errors.length > 0) throw new AppError(400, { errors });
}
