import { expect, test } from 'vitest';
import { del, get, patch, post, readApplication } from './helpers.js';

test('create → patch incrementally → delete field → submit', async () => {
    let res = await post('/applications', {
        primaryDriver: { firstName: 'Test', lastName: 'User', dateOfBirth: '1980-06-01' },
    });

    expect(res.status).toBe(201);

    const { id } = await readApplication(res);
    expect(id).toBeDefined();

    res = await patch(`/applications/${id}`, {
        primaryDriver: {
            gender: 'male',
            maritalStatus: 'single',
            driversLicense: { number: 'ABC123456', state: 'CA' },
        },
    });

    expect(res.status).toBe(200);

    res = await patch(`/applications/${id}`, {
        mailingAddress: { street: '123 Test St', city: 'Testville', state: 'CA', zip: '12345' },
        garagingAddress: { street: '123 Test St', city: 'Testville', state: 'CA', zip: '12345' },
        vehicles: {
            ABC123: { make: 'Toyota', model: 'Corolla', year: 2010, vin: 'SHSRD78833U127404' },
            DEF456: { make: 'Honda', model: 'Civic', year: 2012, vin: '1HGFA16548L000000' },
        },
    });

    expect(res.status).toBe(200);

    res = await del(`/applications/${id}/data`, { path: 'vehicles.ABC123' });

    expect(res.status).toBe(200);

    const afterDeleteRes = await get(`/applications/${id}`);
    const afterDelete = await readApplication(afterDeleteRes);

    expect(afterDelete.vehicles).not.toHaveProperty('ABC123');
    expect(afterDelete.vehicles).toHaveProperty('DEF456');

    res = await post(`/applications/${id}/submit`, {});

    expect(res.status).toBe(200);
});
