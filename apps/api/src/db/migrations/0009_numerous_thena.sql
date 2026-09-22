CREATE TABLE `damage_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skate_id` int NOT NULL,
	`rental_id` int NOT NULL,
	`inspection_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`reported_by` int NOT NULL,
	`damage_type` enum('wheel','strap','brake','bearing','body','other') NOT NULL,
	`severity` enum('minor','moderate','severe') NOT NULL,
	`description` text NOT NULL,
	`customer_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
	`charge_collected` decimal(10,2) NOT NULL DEFAULT '0.00',
	`charge_waived` decimal(10,2) NOT NULL DEFAULT '0.00',
	`waived_by` int,
	`waiver_reason` text,
	`status` enum('pending','partially_paid','paid','waived') NOT NULL DEFAULT 'pending',
	`maintenance_required` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `damage_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_skate_id_skates_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_inspection_id_inspections_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_reported_by_users_id_fk` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damage_reports` ADD CONSTRAINT `damage_reports_waived_by_users_id_fk` FOREIGN KEY (`waived_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;