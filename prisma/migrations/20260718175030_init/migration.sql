-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventFormat" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ticketingType" TEXT NOT NULL,
    "expectedAttendees" TEXT,
    "themes" TEXT NOT NULL,
    "wantsSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'OTHER',
    "devnovateEventId" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT NOT NULL,
    "requiredCoHostEmail" TEXT NOT NULL DEFAULT 'aviral.lancer@gmail.com',
    "requiredLumaHostId" TEXT NOT NULL DEFAULT 'usr-kpQUGVbfViXAj2x',
    "verificationToken" TEXT NOT NULL,
    "coHostVerifiedAt" TIMESTAMP(3),
    "listedOnDevnovateAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'OPEN',
    "postedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_verificationToken_key" ON "Event"("verificationToken");

-- CreateIndex
CREATE INDEX "Event_submittedById_idx" ON "Event"("submittedById");

-- CreateIndex
CREATE INDEX "Event_devnovateEventId_idx" ON "Event"("devnovateEventId");

-- CreateIndex
CREATE INDEX "VerificationLog_eventId_idx" ON "VerificationLog"("eventId");

-- CreateIndex
CREATE INDEX "Sponsorship_postedById_idx" ON "Sponsorship"("postedById");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
