import { describe, expect, test } from 'vitest';
import { createApp, get, makeValidApp, readApplication } from './helpers.js';

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /applications/:id', () => {
    test('returns errors when application is incomplete', async () => {
        const id = await createApp({ primaryDriver: { firstName: 'Test' } });

        const res = await get(`/applications/${id}`);

        const body = await readApplication(res);

        expect(res.status).toBe(200);
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.quote).toBeUndefined();
    });

    test('returns full application when complete', async () => {
        const id = await makeValidApp();

        const res = await get(`/applications/${id}`);

        const body = await readApplication(res);

        expect(res.status).toBe(200);
        expect(body.id).toBe(id);
        expect(body.status).toBe('started');
        expect(body.primaryDriver).toBeDefined();
        expect(body.vehicles).toBeDefined();
        expect(typeof body.quote).toBe('number');
        expect(body.errors).toBeUndefined();
    });

    test('returns 404 for unknown id', async () => {
        const res = await get(`/applications/${UNKNOWN_ID}`);

        expect(res.status).toBe(404);
    });
});
