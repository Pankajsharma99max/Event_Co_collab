-- AlterTable: add verificationToken, backfilling each existing row with its
-- own random unique value (a single static DEFAULT can't satisfy UNIQUE
-- across multiple existing rows, so this generates one per row instead).
ALTER TABLE "Event" ADD COLUMN "verificationToken" TEXT NOT NULL DEFAULT '';

UPDATE "Event" SET "verificationToken" = 'devnovate-verify-' || lower(hex(randomblob(8)));

CREATE UNIQUE INDEX "Event_verificationToken_key" ON "Event"("verificationToken");
