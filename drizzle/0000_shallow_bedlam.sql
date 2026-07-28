CREATE TABLE `poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`starts_at` text NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`organizer` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`timezone` text NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`voter_token` text NOT NULL,
	`name` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `responses_poll_voter_idx` ON `responses` (`poll_id`,`voter_token`);--> statement-breakpoint
CREATE TABLE `votes` (
	`response_id` text NOT NULL,
	`option_id` text NOT NULL,
	PRIMARY KEY(`response_id`, `option_id`),
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON UPDATE no action ON DELETE cascade
);
