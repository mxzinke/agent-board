-- Rename subtasks table to acceptance_criteria
ALTER TABLE "subtasks" RENAME TO "acceptance_criteria";

-- Rename columns: title → text, done → met
ALTER TABLE "acceptance_criteria" RENAME COLUMN "title" TO "text";
ALTER TABLE "acceptance_criteria" RENAME COLUMN "done" TO "met";

-- Drop the acceptance_criteria TEXT column from goals (added in migration 0007)
ALTER TABLE "goals" DROP COLUMN IF EXISTS "acceptance_criteria";
