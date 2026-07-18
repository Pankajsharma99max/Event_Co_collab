-- AlterTable: add new event-form fields with backfill defaults for existing rows,
-- then drop the old `category` column (superseded by `eventType` + `themes`).
ALTER TABLE "Event" ADD COLUMN "eventFormat" TEXT NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "Event" ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'GENERAL_MEETUP';
ALTER TABLE "Event" ADD COLUMN "ticketingType" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Event" ADD COLUMN "expectedAttendees" TEXT;
ALTER TABLE "Event" ADD COLUMN "themes" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Event" ADD COLUMN "wantsSponsorship" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "additionalInfo" TEXT;

UPDATE "Event" SET "eventType" = "category" WHERE "category" IS NOT NULL;

ALTER TABLE "Event" DROP COLUMN "category";
