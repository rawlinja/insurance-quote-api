import { describe, expect, test } from 'vitest';
import { createApp, get, patch, readApplication } from './helpers.js';

describe('PATCH /applications/:id', () => {
    test('deep merges without overwriting untouched fields', async () => {
        const id = await createApp({
            primaryDriver: { firstName: 'Test', lastName: 'User', dateOfBirth: '1980-06-01' },
        });

        const patchRes = await patch(`/applications/${id}`, {
            primaryDriver: { gender: 'male' },
        });

        expect(patchRes.status).toBe(200);

        const res = await get(`/applications/${id}`);
        const body = await readApplication(res);

        expect(body.primaryDriver.firstName).toBe('Test');
        expect(body.primaryDriver.gender).toBe('male');
    });

    test('rejects unknown field', async () => {
        const id = await createApp();
        const res = await patch(`/applications/${id}`, { bogusField: 'value' });

        expect(res.status).toBe(400);
    });

    test('rejects a 4th vehicle', async () => {
        const id = await createApp();

        const initialPatchRes = await patch(`/applications/${id}`, {
            vehicles: {
                V1: { make: 'Toyota', model: 'Camry', year: 2010, vin: 'SHSRD78833U127404' },
                V2: { make: 'Honda', model: 'Civic', year: 2012, vin: '1HGFA16548L000000' },
                V3: { make: 'Ford', model: 'Focus', year: 2015, vin: 'JTDKN3DU8A0000001' },
            },
        });

        expect(initialPatchRes.status).toBe(200);

        const res = await patch(`/applications/${id}`, {
            vehicles: {
                V4: { make: 'Chevy', model: 'Malibu', year: 2018, vin: 'WBAWV135X8P128416' },
            },
        });

        expect(res.status).toBe(400);
    });
});
