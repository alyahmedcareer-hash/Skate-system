CREATE TABLE `maintenance_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenance_id` int NOT NULL,
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_cost` decimal(10,2) NOT NULL,
	`total_cost` decimal(10,2) NOT NULL,
	CONSTRAINT `maintenance_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skate_id` int NOT NULL,
	`inspection_id` int,
	`damage_report_id` int,
	`created_by` int NOT NULL,
	`completed_by` int,
	`problem_description` text,
	`repair_description` text,
	`labor_cost` decimal(10,2) DEFAULT '0',
	`parts_cost` decimal(10,2) DEFAULT '0',
	`total_cost` decimal(10,2) DEFAULT '0',
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`started_at` datetime,
	`completed_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `maintenance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_id_maintenance_records_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_skate_id_skates_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_inspection_id_inspections_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_damage_report_id_damage_reports_id_fk` FOREIGN KEY (`damage_report_id`) REFERENCES `damage_reports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_completed_by_users_id_fk` FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;