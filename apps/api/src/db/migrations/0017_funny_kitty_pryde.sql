ALTER TABLE `treasury_movements` MODIFY COLUMN `reference_type` enum('rental_payment','rental_refund','late_fee_payment','damage_charge_payment','expense','sale_payment','sale_refund','maintenance_payment','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `payment_status` enum('unpaid','paid','paid_external','legacy','no_cost') DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `payment_method_id` int;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `paid_at` datetime;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD `paid_by` int;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_paid_by_users_id_fk` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE `maintenance_records` SET `payment_status` = 'legacy' WHERE `total_cost` > 0;--> statement-breakpoint
UPDATE `maintenance_records` SET `payment_status` = 'no_cost' WHERE `total_cost` = 0;
