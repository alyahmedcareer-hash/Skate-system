CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rental_id` int,
	`skate_id` int NOT NULL,
	`inspected_by` int NOT NULL,
	`wheels_condition` enum('good','minor_damage','damaged','broken') NOT NULL DEFAULT 'good',
	`brake_condition` enum('good','minor_damage','damaged','broken') NOT NULL DEFAULT 'good',
	`strap_condition` enum('good','minor_damage','damaged','broken') NOT NULL DEFAULT 'good',
	`bearings_condition` enum('good','minor_damage','damaged','broken') NOT NULL DEFAULT 'good',
	`body_condition` enum('good','minor_damage','damaged','broken') NOT NULL DEFAULT 'good',
	`other_notes` text,
	`maintenance_required` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `late_fee_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rental_id` int NOT NULL,
	`late_minutes` int NOT NULL,
	`calculated_fee` decimal(10,2) NOT NULL,
	`collected_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`waived_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
	`waived_by` int,
	`waiver_reason` text,
	`waived_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `late_fee_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_skate_id_skates_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_inspected_by_users_id_fk` FOREIGN KEY (`inspected_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `late_fee_records` ADD CONSTRAINT `late_fee_records_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `late_fee_records` ADD CONSTRAINT `late_fee_records_waived_by_users_id_fk` FOREIGN KEY (`waived_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;