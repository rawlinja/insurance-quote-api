export const US_STATES = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
] as const;

export type USState = (typeof US_STATES)[number];

export type Application = {
    primaryDriver: PrimaryDriver;
    mailingAddress: AddressWithUnit;
    garagingAddress: Address;
    vehicles: Record<string, Vehicle>;
    additionalDrivers: Record<string, AdditionalDriver>;
};

export type DriversLicense = {
    number: string; // 9 uppercase alphanumeric characters [A-Z0-9]
    state: USState;
};

export type PrimaryDriver = {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD, no timestamps, must be 18+
    gender: 'male' | 'female' | 'non-binary';
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    driversLicense: DriversLicense;
};

export type Address = {
    street: string;
    city: string;
    state: USState;
    zip: string; // 5-digit string
};

export type AddressWithUnit = Address & { unit?: string };

export type Vehicle = {
    make: string;
    model: string;
    year: number; // between 1985 and current year + 1 (inclusive)
    vin: string; // 17 chars, A-Z (excluding I, O, Q) and 0-9
};

export type AdditionalDriver = {
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD, no timestamps, must be 16+
    gender: 'male' | 'female' | 'non-binary';
    relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
};

// All fields are optional. `driversLicense` is handled separately so
// its nested fields can also be partial.
export type PrimaryDriverDTO = Partial<Omit<PrimaryDriver, 'driversLicense'>> & {
    driversLicense?: Partial<DriversLicense>;
};

export type ApplicationDTO = {
    id: string;
    status: 'started' | 'submitted';
    primaryDriver: PrimaryDriverDTO;
    mailingAddress: Partial<Application['mailingAddress']> | null;
    garagingAddress: Partial<Application['garagingAddress']> | null;
    vehicles: Record<string, Partial<Application['vehicles'][string]>>;
    additionalDrivers: Record<string, Partial<Application['additionalDrivers'][string]>>;
    finalQuote: number | null;
    createdAt: string;
    updatedAt: string;
};
