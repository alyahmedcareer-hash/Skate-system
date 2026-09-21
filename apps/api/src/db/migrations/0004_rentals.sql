CREATE TABLE `rentals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rental_code` varchar(50) NOT NULL,
	`skate_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`cashier_id` int NOT NULL,
	`shift_id` int,
	`duration_minutes` int NOT NULL,
	`price_per_hour` decimal(10,2) NOT NULL,
	`rental_amount` decimal(10,2) NOT NULL,
	`started_at` datetime NOT NULL,
	`expected_end_at` datetime NOT NULL,
	`returned_at` datetime,
	`status` enum('active','returned','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rentals_id` PRIMARY KEY(`id`),
	CONSTRAINT `rentals_rental_code_unique` UNIQUE(`rental_code`),
	FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rentals_rental_code_unique` ON `rentals` (`rental_code`);
--> statement-breakpoint
CREATE INDEX `rentals_skate_id_idx` ON `rentals` (`skate_id`);
--> statement-breakpoint
CREATE INDEX `rentals_customer_id_idx` ON `rentals` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `rentals_cashier_id_idx` ON `rentals` (`cashier_id`);
--> statement-breakpoint
CREATE INDEX `rentals_status_idx` ON `rentals` (`status`);
--> statement-breakpoint
CREATE INDEX `rentals_expected_end_at_idx` ON `rentals` (`expected_end_at`);
--> statement-breakpoint
CREATE INDEX `rentals_started_at_idx` ON `rentals` (`started_at`);
