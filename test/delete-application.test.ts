import { describe, expect, test } from 'vitest';
import { createApp, del, get, makeSubmittedApp } from './helpers.js';

describe('DELETE /applications/:id', () => {
    test('returns 204 when deleting a started application', async () => {
        const id = await createApp();

        const res = await del(`/applications/${id}`);

        expect(res.status).toBe(204);
    });

    test('returns 404 when getting a deleted application', async () => {
        const id = await createApp();

        await del(`/applications/${id}`);

        const res = await get(`/applications/${id}`);

        expect(res.status).toBe(404);
    });

    test('returns 409 when deleting a submitted application', async () => {
        const { id } = await makeSubmittedApp();

        const res = await del(`/applications/${id}`);

        expect(res.status).toBe(409);
    });
});
