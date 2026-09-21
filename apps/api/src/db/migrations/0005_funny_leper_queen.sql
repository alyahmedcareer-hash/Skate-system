CREATE TABLE `payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`treasury_account_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rental_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rental_id` int NOT NULL,
	`payment_method_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`cashier_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rental_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`balance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treasury_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`treasury_account_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`type` enum('in','out') NOT NULL,
	`reference_type` enum('rental_payment','rental_refund','expense','other') NOT NULL,
	`reference_id` int,
	`cashier_id` int NOT NULL,
	`notes` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_treasury_account_id_treasury_accounts_id_fk` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_payments` ADD CONSTRAINT `rental_payments_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_payments` ADD CONSTRAINT `rental_payments_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_payments` ADD CONSTRAINT `rental_payments_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD CONSTRAINT `treasury_movements_treasury_account_id_treasury_accounts_id_fk` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD CONSTRAINT `treasury_movements_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;