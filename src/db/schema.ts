import { relations, sql } from 'drizzle-orm';
import { check, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Address, AddressWithUnit } from '../types.js';

export const applications = sqliteTable(
    'applications',
    {
        id: text('id').primaryKey(),
        status: text('status', { enum: ['started', 'submitted'] })
            .notNull()
            .default('started'),
        mailingAddress: text('mailing_address', {
            mode: 'json',
        }).$type<Partial<AddressWithUnit> | null>(),
        garagingAddress: text('garaging_address', {
            mode: 'json',
        }).$type<Partial<Address> | null>(),
        finalQuote: real('final_quote'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull(),
    },
    (t) => [check('status_check', sql`${t.status} IN ('started', 'submitted')`)]
);

export const primaryDrivers = sqliteTable(
    'primary_drivers',
    {
        applicationId: text('application_id')
            .primaryKey()
            .references(() => applications.id, { onDelete: 'cascade' }),
        firstName: text('first_name'),
        lastName: text('last_name'),
        dateOfBirth: text('date_of_birth'),
        gender: text('gender'),
        maritalStatus: text('marital_status'),
        licenseNumber: text('license_number'),
        licenseState: text('license_state'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull(),
    },
    (t) => [
        check('gender_check', sql`${t.gender} IN ('male', 'female', 'non-binary')`),
        check(
            'marital_status_check',
            sql`${t.maritalStatus} IN ('single', 'married', 'divorced', 'widowed')`
        ),
    ]
);

export const additionalDrivers = sqliteTable(
    'additional_drivers',
    {
        applicationId: text('application_id')
            .notNull()
            .references(() => applications.id, { onDelete: 'cascade' }),
        driverId: text('driver_id').notNull(),
        firstName: text('first_name'),
        lastName: text('last_name'),
        dateOfBirth: text('date_of_birth'),
        gender: text('gender'),
        relationship: text('relationship'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.driverId, t.applicationId] }),
        check('gender_check', sql`${t.gender} IN ('male', 'female', 'non-binary')`),
        check(
            'relationship_check',
            sql`${t.relationship} IN ('spouse', 'child', 'parent', 'sibling', 'other')`
        ),
    ]
);

export const vehicles = sqliteTable(
    'vehicles',
    {
        applicationId: text('application_id')
            .notNull()
            .references(() => applications.id, { onDelete: 'cascade' }),
        vehicleId: text('vehicle_id').notNull(),
        make: text('make'),
        model: text('model'),
        year: integer('year'),
        vin: text('vin'),
        createdAt: text('created_at').notNull(),
        updatedAt: text('updated_at').notNull(),
    },
    (t) => [primaryKey({ columns: [t.vehicleId, t.applicationId] })]
);

export const applicationsRelations = relations(applications, ({ one, many }) => ({
    primaryDriver: one(primaryDrivers, {
        fields: [applications.id],
        references: [primaryDrivers.applicationId],
    }),
    additionalDrivers: many(additionalDrivers),
    vehicles: many(vehicles),
}));

export const primaryDriversRelations = relations(primaryDrivers, ({ one }) => ({
    application: one(applications, {
        fields: [primaryDrivers.applicationId],
        references: [applications.id],
    }),
}));

export const additionalDriversRelations = relations(additionalDrivers, ({ one }) => ({
    application: one(applications, {
        fields: [additionalDrivers.applicationId],
        references: [applications.id],
    }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
    application: one(applications, {
        fields: [vehicles.applicationId],
        references: [applications.id],
    }),
}));
