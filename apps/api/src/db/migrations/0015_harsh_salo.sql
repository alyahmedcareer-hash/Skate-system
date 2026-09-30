ALTER TABLE `rentals` ADD `invoice_number` varchar(50);--> statement-breakpoint
ALTER TABLE `sales` ADD `invoice_number` varchar(50);--> statement-breakpoint
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_invoice_number_unique` UNIQUE(`invoice_number`);--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_invoice_number_unique` UNIQUE(`invoice_number`);