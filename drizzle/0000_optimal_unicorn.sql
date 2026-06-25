CREATE TABLE `additional_drivers` (
	`application_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`date_of_birth` text,
	`gender` text,
	`relationship` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`driver_id`, `application_id`),
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gender_check" CHECK("additional_drivers"."gender" IN ('male', 'female', 'non-binary')),
	CONSTRAINT "relationship_check" CHECK("additional_drivers"."relationship" IN ('spouse', 'child', 'parent', 'sibling', 'other'))
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`mailing_address` text,
	`garaging_address` text,
	`final_quote` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "status_check" CHECK("applications"."status" IN ('started', 'submitted'))
);
--> statement-breakpoint
CREATE TABLE `primary_drivers` (
	`application_id` text PRIMARY KEY NOT NULL,
	`first_name` text,
	`last_name` text,
	`date_of_birth` text,
	`gender` text,
	`marital_status` text,
	`license_number` text,
	`license_state` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gender_check" CHECK("primary_drivers"."gender" IN ('male', 'female', 'non-binary')),
	CONSTRAINT "marital_status_check" CHECK("primary_drivers"."marital_status" IN ('single', 'married', 'divorced', 'widowed'))
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`application_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`make` text,
	`model` text,
	`year` integer,
	`vin` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`vehicle_id`, `application_id`),
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
