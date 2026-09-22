CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`skate_id` int NOT NULL,
	`skate_size` varchar(20),
	`reserved_from` datetime NOT NULL,
	`reserved_until` datetime NOT NULL,
	`status` enum('pending','confirmed','cancelled','fulfilled') NOT NULL DEFAULT 'pending',
	`created_by` int NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_skate_id_skates_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reservations_customer_id_idx` ON `reservations` (`customer_id`);--> statement-breakpoint
CREATE INDEX `reservations_skate_id_idx` ON `reservations` (`skate_id`);--> statement-breakpoint
CREATE INDEX `reservations_status_idx` ON `reservations` (`status`);--> statement-breakpoint
CREATE INDEX `reservations_reserved_from_idx` ON `reservations` (`reserved_from`);