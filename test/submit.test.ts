import { describe, expect, test } from 'vitest';
import {
    VALID_PATCH,
    assert400,
    createApp,
    makeValidApp,
    patch,
    post,
    readApplication,
} from './helpers.js';

describe('submission', () => {
    test('rejects incomplete application', async () => {
        const id = await makeValidApp();

        const patchRes = await patch(`/applications/${id}`, {
            primaryDriver: { firstName: '' },
        });

        expect(patchRes.status).toBe(200);

        const res = await post(`/applications/${id}/submit`, {});

        await assert400(res);
    });

    test('rejects submit with zero vehicles', async () => {
        const id = await createApp();

        const { vehicles: _vehicles, ...patchWithoutVehicles } = VALID_PATCH;

        await patch(`/applications/${id}`, patchWithoutVehicles);

        const res = await post(`/applications/${id}/submit`, {});

        await assert400(res, 'vehicles');
    });

    test('accepts valid application and locks record', async () => {
        const id = await makeValidApp();

        let res = await post(`/applications/${id}/submit`, {});
        const body = await readApplication(res);

        expect(res.status).toBe(200);
        expect(body.status).toBe('submitted');
        expect(typeof body.quote).toBe('number');

        res = await patch(`/applications/${id}`, {
            primaryDriver: { firstName: 'X' },
        });

        expect(res.status).toBe(409);
    });
});
