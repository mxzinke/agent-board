CREATE TABLE "challenges" (
	"key" varchar(256) PRIMARY KEY NOT NULL,
	"challenge" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
