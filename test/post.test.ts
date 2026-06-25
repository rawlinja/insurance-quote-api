import { describe, expect, test } from 'vitest';
import { post, readApplication } from './helpers.js';

describe('POST /applications', () => {
    test('creates application with empty body', async () => {
        const res = await post('/applications', {});
        const body = await readApplication(res);

        expect(res.status).toBe(201);
        expect(body.id).toBeDefined();
        expect(body.status).toBe('started');
    });

    test('creates application with partial data', async () => {
        const res = await post('/applications', {
            primaryDriver: { firstName: 'Test', lastName: 'User', dateOfBirth: '1980-06-01' },
        });
        const body = await readApplication(res);

        expect(res.status).toBe(201);
        expect(body.id).toBeDefined();
        expect(body.primaryDriver.firstName).toBe('Test');
    });
});
