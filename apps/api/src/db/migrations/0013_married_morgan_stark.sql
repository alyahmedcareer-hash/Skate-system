CREATE TABLE `cashier_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cashier_id` int NOT NULL,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`opening_balance` decimal(10,2) NOT NULL,
	`expected_balance` decimal(10,2),
	`actual_balance` decimal(10,2),
	`difference` decimal(10,2),
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`notes` varchar(1000),
	CONSTRAINT `cashier_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int,
	`amount` decimal(10,2) NOT NULL,
	`description` varchar(500) NOT NULL,
	`cashier_id` int NOT NULL,
	`shift_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_shift_id_cashier_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD COLUMN `shift_id` int;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD CONSTRAINT `treasury_movements_shift_id_cashier_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE no action ON UPDATE no action;