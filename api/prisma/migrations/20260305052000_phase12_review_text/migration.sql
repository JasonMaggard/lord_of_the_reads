ALTER TABLE "Review"
ADD COLUMN "text" TEXT;

UPDATE "Review"
SET "text" = 'Seed review text'
WHERE "text" IS NULL OR char_length(btrim("text")) = 0;

ALTER TABLE "Review"
ALTER COLUMN "text" SET NOT NULL;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_text_not_blank" CHECK (char_length(btrim("text")) > 0);
