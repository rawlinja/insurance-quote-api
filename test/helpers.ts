import dotenv from 'dotenv';
import { expect } from 'vitest';
import type { ApplicationDTO } from '../src/types.js';

dotenv.config();

const PORT = process.env.PORT || 8000;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const BASE_URL = `http://localhost:${PORT}`;

export const get = (path: string) => fetch(`${BASE_URL}${path}`);

export const post = (path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
    });

export const patch = (path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
    });

export function del(path: string, body?: unknown) {
    const options: RequestInit = {
        method: 'DELETE',
    };

    if (body !== undefined) {
        options.headers = JSON_HEADERS;
        options.body = JSON.stringify(body);
    }

    return fetch(`${BASE_URL}${path}`, options);
}

export type ApplicationApiResponse = Omit<ApplicationDTO, 'finalQuote'> & {
    quote?: number;
    errors?: Array<{ field: string; message: string }>;
};

export async function readApplication(res: Response): Promise<ApplicationApiResponse> {
    return (await res.json()) as ApplicationApiResponse;
}

export async function createApp(initial: unknown = {}): Promise<string> {
    const res = await post('/applications', initial);

    expect(res.status).toBe(201);

    const body = (await res.json()) as { id: string };

    return body.id;
}

// Fully valid application patch — primary driver age 46 (1.0×), single (1.0×),
// vehicle 2010 (1.0×), garaging TX (1.0×), no additional drivers → quote = $2.00
export const VALID_PATCH = {
    primaryDriver: {
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1980-06-01',
        gender: 'male',
        maritalStatus: 'single',
        driversLicense: { number: 'ABC123456', state: 'TX' },
    },
    mailingAddress: { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
    garagingAddress: { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
    vehicles: {
        V001: { make: 'Toyota', model: 'Camry', year: 2010, vin: 'SHSRD78833U127404' },
    },
};

export async function makeValidApp(): Promise<string> {
    const id = await createApp();
    const res = await patch(`/applications/${id}`, VALID_PATCH);

    expect(res.status).toBe(200);

    return id;
}

export async function makeSubmittedApp(): Promise<{ id: string; quote: number }> {
    const id = await makeValidApp();
    const res = await post(`/applications/${id}/submit`, {});

    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: string; quote: number };

    return { id, quote: body.quote };
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function dobJustUnderAge(age: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - age);
    date.setDate(date.getDate() + 1);
    return formatDate(date);
}

export function dobExactAge(age: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - age);
    return formatDate(date);
}

export async function assert201(res: Response): Promise<void> {
    expect(res.status).toBe(201);
}

export async function assert400(res: Response, field?: string): Promise<void> {
    expect(res.status).toBe(400);

    const body = (await res.json()) as { errors: Array<{ field?: string }> };

    expect(Array.isArray(body.errors)).toBe(true);

    if (field) {
        expect(body.errors.map((e) => e.field)).toContain(field);
    }
}
