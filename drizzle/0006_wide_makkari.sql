ALTER TABLE "board_members" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "board_members" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;