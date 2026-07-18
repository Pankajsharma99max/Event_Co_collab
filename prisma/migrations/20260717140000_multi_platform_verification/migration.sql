-- RedefineTable: add `platform` + `requiredLumaHostId`, and make `devnovateEventId`
-- nullable (only applicable when platform = "DEVNOVATE"). SQLite has no ALTER COLUMN,
-- so this rebuilds the table and backfills `platform` from each row's websiteUrl.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventFormat" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ticketingType" TEXT NOT NULL,
    "expectedAttendees" TEXT,
    "themes" TEXT NOT NULL,
    "wantsSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'OTHER',
    "devnovateEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT NOT NULL,
    "requiredCoHostEmail" TEXT NOT NULL DEFAULT 'aviral.lancer@gmail.com',
    "requiredLumaHostId" TEXT NOT NULL DEFAULT 'usr-kpQUGVbfViXAj2x',
    "coHostVerifiedAt" DATETIME,
    "listedOnDevnovateAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Event" (
    "id", "title", "description", "eventFormat", "eventType", "ticketingType",
    "expectedAttendees", "themes", "wantsSponsorship", "additionalInfo",
    "startsAt", "endsAt", "location", "websiteUrl", "platform", "devnovateEventId",
    "status", "submittedById", "requiredCoHostEmail", "requiredLumaHostId",
    "coHostVerifiedAt", "listedOnDevnovateAt", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "description", "eventFormat", "eventType", "ticketingType",
    "expectedAttendees", "themes", "wantsSponsorship", "additionalInfo",
    "startsAt", "endsAt", "location", "websiteUrl",
    CASE
        WHEN "websiteUrl" LIKE '%devnovate.co%' THEN 'DEVNOVATE'
        WHEN "websiteUrl" LIKE '%luma.com%' OR "websiteUrl" LIKE '%lu.ma%' THEN 'LUMA'
        ELSE 'OTHER'
    END,
    "devnovateEventId",
    "status", "submittedById", "requiredCoHostEmail", 'usr-kpQUGVbfViXAj2x',
    "coHostVerifiedAt", "listedOnDevnovateAt", "createdAt", "updatedAt"
FROM "Event";

DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";

CREATE INDEX "Event_submittedById_idx" ON "Event"("submittedById");
CREATE INDEX "Event_devnovateEventId_idx" ON "Event"("devnovateEventId");

PRAGMA foreign_keys=ON;
