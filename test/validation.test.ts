import { describe, test } from 'vitest';
import { assert201, assert400, dobExactAge, dobJustUnderAge, post } from './helpers.js';

describe('validation — primary driver', () => {
    test('rejects dateOfBirth as ISO timestamp', async () => {
        const res = await post('/applications', {
            primaryDriver: { dateOfBirth: '1980-06-01T00:00:00Z' },
        });

        await assert400(res, 'primaryDriver.dateOfBirth');
    });

    test('rejects primary driver one day under 18', async () => {
        const res = await post('/applications', {
            primaryDriver: { dateOfBirth: dobJustUnderAge(18) },
        });

        await assert400(res, 'primaryDriver.dateOfBirth');
    });

    test('accepts primary driver who is exactly 18', async () => {
        const res = await post('/applications', {
            primaryDriver: { dateOfBirth: dobExactAge(18) },
        });
        await assert201(res);
    });

    test('rejects invalid driversLicense number', async () => {
        const res = await post('/applications', {
            primaryDriver: { driversLicense: { number: 'ABC1234' } },
        });

        await assert400(res, 'primaryDriver.driversLicense.number');
    });

    test('rejects invalid driversLicense state', async () => {
        const res = await post('/applications', {
            primaryDriver: { driversLicense: { state: 'XX' } },
        });

        await assert400(res, 'primaryDriver.driversLicense.state');
    });

    test('rejects invalid gender', async () => {
        const res = await post('/applications', {
            primaryDriver: { gender: 'unknown' },
        });

        await assert400(res, 'primaryDriver.gender');
    });
});

describe('validation — vehicle', () => {
    test('rejects VIN with excluded chars (I, O, Q)', async () => {
        const res = await post('/applications', {
            vehicles: {
                V1: {
                    make: 'Ford',
                    model: 'F150',
                    year: 2010,
                    vin: 'ABCDEFGHI23456789',
                },
            },
        });

        await assert400(res, 'vehicles.V1.vin');
    });

    test('rejects vehicle year out of range', async () => {
        const res = await post('/applications', {
            vehicles: {
                V1: {
                    make: 'Ford',
                    model: 'F150',
                    year: 1984,
                    vin: 'SHSRD78833U127404',
                },
            },
        });

        await assert400(res, 'vehicles.V1.year');
    });

    test('rejects vehicle year above maximum', async () => {
        const res = await post('/applications', {
            vehicles: {
                V1: {
                    make: 'Ford',
                    model: 'F150',
                    year: new Date().getFullYear() + 2,
                    vin: 'SHSRD78833U127404',
                },
            },
        });

        await assert400(res, 'vehicles.V1.year');
    });

    test('rejects VIN with wrong length', async () => {
        const res = await post('/applications', {
            vehicles: {
                V1: { make: 'Ford', model: 'F150', year: 2010, vin: 'SHSRD78833U1274' },
            },
        });

        await assert400(res, 'vehicles.V1.vin');
    });
});

describe('validation — address', () => {
    test('rejects invalid state abbreviation', async () => {
        const res = await post('/applications', {
            mailingAddress: {
                street: '1 Main',
                city: 'City',
                state: 'XX',
                zip: '12345',
            },
        });

        await assert400(res, 'mailingAddress.state');
    });

    test('rejects invalid mailing zip', async () => {
        const res = await post('/applications', {
            mailingAddress: { street: '1 Main', city: 'City', state: 'TX', zip: '1234' },
        });

        await assert400(res, 'mailingAddress.zip');
    });
});

describe('validation — additional drivers', () => {
    test('rejects additional driver one day under 16', async () => {
        const res = await post('/applications', {
            additionalDrivers: {
                D1: {
                    firstName: 'Kid',
                    lastName: 'Driver',
                    dateOfBirth: dobJustUnderAge(16),
                    gender: 'male',
                    relationship: 'child',
                },
            },
        });

        await assert400(res, 'additionalDrivers.D1.dateOfBirth');
    });

    test('accepts additional driver who is exactly 16', async () => {
        const res = await post('/applications', {
            additionalDrivers: {
                D1: {
                    firstName: 'Kid',
                    lastName: 'Driver',
                    dateOfBirth: dobExactAge(16),
                    gender: 'male',
                    relationship: 'child',
                },
            },
        });

        await assert201(res);
    });

    test('rejects invalid additional driver relationship', async () => {
        const res = await post('/applications', {
            additionalDrivers: {
                D1: { relationship: 'enemy' },
            },
        });

        await assert400(res, 'additionalDrivers.D1.relationship');
    });

    test('rejects a 4th additional driver', async () => {
        const res = await post('/applications', {
            additionalDrivers: {
                D1: { firstName: 'A' },
                D2: { firstName: 'B' },
                D3: { firstName: 'C' },
                D4: { firstName: 'D' },
            },
        });

        await assert400(res, 'additionalDrivers');
    });
});

describe('validation — structural', () => {
    test('rejects unknown top-level field', async () => {
        const res = await post('/applications', { unknownField: 'value' });

        await assert400(res, 'unknownField');
    });
});
