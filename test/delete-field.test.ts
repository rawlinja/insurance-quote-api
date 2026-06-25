import { describe, expect, test } from 'vitest';
import { createApp, del, makeSubmittedApp, patch, readApplication } from './helpers.js';

describe('DELETE /applications/:id/data', () => {
    test('rejects deletion of top-level key', async () => {
        const id = await createApp();

        const res = await del(`/applications/${id}/data`, {
            path: 'primaryDriver',
        });

        expect(res.status).toBe(400);
    });

    test('deletes a vehicle by id', async () => {
        const id = await createApp();

        const patchRes = await patch(`/applications/${id}`, {
            vehicles: {
                V1: {
                    make: 'Toyota',
                    model: 'Camry',
                    year: 2010,
                    vin: 'SHSRD78833U127404',
                },
            },
        });

        expect(patchRes.status).toBe(200);

        const res = await del(`/applications/${id}/data`, {
            path: 'vehicles.V1',
        });

        const body = await readApplication(res);

        expect(res.status).toBe(200);
        expect(body.vehicles).not.toHaveProperty('V1');
    });

    test('deletes a primary driver field by dot-path', async () => {
        const id = await createApp({
            primaryDriver: { dateOfBirth: '1980-06-01' },
        });

        const res = await del(`/applications/${id}/data`, {
            path: 'primaryDriver.dateOfBirth',
        });

        const body = await readApplication(res);

        expect(res.status).toBe(200);
        expect(body.primaryDriver).not.toHaveProperty('dateOfBirth');
    });

    test('is blocked after submission', async () => {
        const { id } = await makeSubmittedApp();

        const res = await del(`/applications/${id}/data`, {
            path: 'primaryDriver.firstName',
        });

        expect(res.status).toBe(409);
    });
});
