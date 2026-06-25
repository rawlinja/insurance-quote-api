import type { ApplicationDTO } from './types.js';
import { calcAge } from './utils.js';

const HIGH_COST_STATES = new Set(['CA', 'NY', 'FL', 'MI', 'NJ']);
const LOW_COST_STATES = new Set(['ME', 'VT', 'NH', 'ID', 'IA']);

export function runRatingPipeline(application: ApplicationDTO): number {
    const vehicleCount = Object.keys(application.vehicles).length;
    const primaryDriverAge = calcAge(application.primaryDriver!.dateOfBirth!);

    const vehicleBase = calculateVehicleBase(application.vehicles);
    const territoryFactor = calculateTerritoryFactor(application.garagingAddress?.state);
    const primaryDriverFactor = calculatePrimaryDriverFactor(
        primaryDriverAge,
        application.primaryDriver!.maritalStatus
    );
    const multiVehicleFactor = calculateMultiVehicleFactor(vehicleCount);
    const youngDriverFactor = calculateYoungDriverFactor(
        primaryDriverAge,
        application.additionalDrivers
    );

    const premium = roundMoney(
        vehicleBase * territoryFactor * primaryDriverFactor * multiVehicleFactor * youngDriverFactor
    );

    return premium;
}

function calculateVehicleBase(vehicles: ApplicationDTO['vehicles']): number {
    return Object.values(vehicles).reduce((sum, vehicle) => {
        const year = vehicle.year!;
        const ageFactor = calculateVehicleAgeFactor(year);

        return sum + 2 * ageFactor;
    }, 0);
}

function calculateVehicleAgeFactor(year: number): number {
    if (year < 2000) return 0.85; // lower market value
    if (year < 2016) return 1.0;
    return 1.15;
}

function calculateTerritoryFactor(state = ''): number {
    if (HIGH_COST_STATES.has(state)) return 1.34;
    if (LOW_COST_STATES.has(state)) return 0.82;
    return 1.0;
}

function calculatePrimaryDriverFactor(age: number, maritalStatus?: string): number {
    const ageFactor = age < 25 ? 1.5 : age > 65 ? 1.2 : 1.0;
    const maritalFactor = maritalStatus === 'married' ? 0.9 : 1.0;

    return ageFactor * maritalFactor;
}

function calculateMultiVehicleFactor(vehicleCount: number): number {
    if (vehicleCount === 2) return 0.95;
    if (vehicleCount >= 3) return 0.92;
    return 1.0;
}

function calculateYoungDriverFactor(
    primaryDriverAge: number,
    additionalDrivers: ApplicationDTO['additionalDrivers']
): number {
    const hasYoungAdditionalDriver = Object.values(additionalDrivers).some(
        (driver) => driver.dateOfBirth && calcAge(driver.dateOfBirth) < 25
    );

    if (!hasYoungAdditionalDriver) return 1.0;
    if (primaryDriverAge < 25) return 1.35;

    return 1.2;
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}
