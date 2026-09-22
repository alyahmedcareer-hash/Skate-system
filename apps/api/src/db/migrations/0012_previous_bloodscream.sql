CREATE TABLE `product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`category_id` int NOT NULL,
	`barcode` varchar(255),
	`price` decimal(10,2) NOT NULL,
	`stock_quantity` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`total_price` decimal(10,2) NOT NULL,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`payment_method_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`treasury_account_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_code` varchar(50) NOT NULL,
	`customer_id` int,
	`cashier_id` int NOT NULL,
	`shift_id` int,
	`total_amount` decimal(10,2) NOT NULL,
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`notes` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_sale_code_unique` UNIQUE(`sale_code`)
);
--> statement-breakpoint
ALTER TABLE `treasury_movements` MODIFY COLUMN `reference_type` enum('rental_payment','rental_refund','late_fee_payment','damage_charge_payment','expense','sale_payment','sale_refund','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD CONSTRAINT `sale_payments_treasury_account_id_treasury_accounts_id_fk` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;