CREATE TABLE `ad_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`placement` varchar(255),
	`format` varchar(64),
	`appName` varchar(64),
	`basePricePerDay` decimal(10,2) NOT NULL,
	`isActive` enum('yes','no') NOT NULL DEFAULT 'yes',
	`requiresPro` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_slots_id` PRIMARY KEY(`id`),
	CONSTRAINT `ad_slots_slotId_unique` UNIQUE(`slotId`)
);
--> statement-breakpoint
CREATE TABLE `ai_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`advertiserId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`advertiserId` int NOT NULL,
	`slotId` varchar(64) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`status` enum('pending_payment','pending_moderation','approved','active','completed','rejected','cancelled') NOT NULL DEFAULT 'pending_payment',
	`paymentProvider` varchar(32),
	`paymentSessionId` varchar(255),
	`paymentIntentId` varchar(255),
	`paidAt` timestamp,
	`creativeImageUrl` text,
	`creativeCopy` text,
	`creativeClickUrl` varchar(512),
	`moderationNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_clicks` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`advertiserId` int NOT NULL,
	`slotId` varchar(64) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_impressions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`advertiserId` int NOT NULL,
	`slotId` varchar(64) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_impressions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presence_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`appRoute` varchar(128) NOT NULL,
	`appName` varchar(64) NOT NULL,
	`userCount` int NOT NULL DEFAULT 1,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presence_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presence_hourly` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`appName` varchar(64) NOT NULL,
	`hourStart` timestamp NOT NULL,
	`peakCount` int NOT NULL DEFAULT 0,
	`avgCount` decimal(8,2) NOT NULL DEFAULT '0',
	`totalSessions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presence_hourly_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `memberTier` enum('basic','pro') DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `businessName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `businessCategory` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);