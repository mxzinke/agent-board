ALTER TABLE "attachments" ADD COLUMN "comment_id" uuid;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
