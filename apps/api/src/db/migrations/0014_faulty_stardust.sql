CREATE TABLE `sequences` (
	`name` varchar(50) NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sequences_name` PRIMARY KEY(`name`)
);
