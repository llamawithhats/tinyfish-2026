-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubmissionMode" AS ENUM ('APPROVAL_FIRST', 'AUTO_SUBMIT');

-- CreateEnum
CREATE TYPE "CredentialScope" AS ENUM ('ATS', 'JOB_BOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "JobSourceProvider" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE', 'GENERIC_ATS');

-- CreateEnum
CREATE TYPE "JobListingStatus" AS ENUM ('DISCOVERED', 'MATCHED', 'SKIPPED', 'PACKET_QUEUED', 'READY_FOR_REVIEW', 'APPLYING', 'APPLIED', 'MANUAL_ACTION_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'MANUAL_ACTION_REQUIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationRunType" AS ENUM ('DISCOVERY', 'PACKET', 'APPLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "submissionMode" "SubmissionMode" NOT NULL DEFAULT 'APPROVAL_FIRST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "currentLocation" TEXT NOT NULL,
    "workAuthorization" TEXT NOT NULL,
    "visaStatus" TEXT,
    "graduationDate" TEXT,
    "targetRoles" TEXT[],
    "preferredLocations" TEXT[],
    "salaryExpectation" TEXT,
    "availability" TEXT,
    "summary" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "screeningFacts" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "experiences" JSONB NOT NULL,
    "projects" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" "CredentialScope" NOT NULL DEFAULT 'ATS',
    "username" TEXT,
    "encryptedSecret" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companies" TEXT[],
    "keywords" TEXT[],
    "locations" TEXT[],
    "internshipOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyApplications" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchPresetId" TEXT,
    "name" TEXT NOT NULL,
    "provider" "JobSourceProvider" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "keywords" TEXT[],
    "locations" TEXT[],
    "countryCode" TEXT,
    "internshipOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyApplications" INTEGER NOT NULL DEFAULT 10,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastScannedAt" TIMESTAMP(3),
    "nextScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobSourceId" TEXT NOT NULL,
    "provider" "JobSourceProvider" NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "location" TEXT,
    "descriptionMarkdown" TEXT NOT NULL,
    "canonicalApplicationUrl" TEXT NOT NULL,
    "matchingKeywords" TEXT[],
    "internshipScore" DOUBLE PRECISION NOT NULL,
    "compensationHint" TEXT,
    "status" "JobListingStatus" NOT NULL DEFAULT 'DISCOVERED',
    "rawJson" JSONB NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationPacket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "resumeSpec" JSONB NOT NULL,
    "coverLetterText" TEXT NOT NULL,
    "screeningAnswers" JSONB NOT NULL,
    "essayResponses" JSONB NOT NULL,
    "resumeObjectKey" TEXT NOT NULL,
    "coverLetterObjectKey" TEXT,
    "answersObjectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationPacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "applicationPacketId" TEXT,
    "runType" "ApplicationRunType" NOT NULL,
    "tinyfishRunId" TEXT,
    "status" "ApplicationRunStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "screenshotKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ApplicationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "ProviderCredential_userId_provider_idx" ON "ProviderCredential"("userId", "provider");

-- CreateIndex
CREATE INDEX "JobListing_userId_status_idx" ON "JobListing"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_userId_canonicalApplicationUrl_key" ON "JobListing"("userId", "canonicalApplicationUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationPacket_jobListingId_key" ON "ApplicationPacket"("jobListingId");

-- CreateIndex
CREATE INDEX "ApplicationRun_userId_runType_status_idx" ON "ApplicationRun"("userId", "runType", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_entityType_entityId_idx" ON "AuditEvent"("userId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchPreset" ADD CONSTRAINT "SearchPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_searchPresetId_fkey" FOREIGN KEY ("searchPresetId") REFERENCES "SearchPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationPacket" ADD CONSTRAINT "ApplicationPacket_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRun" ADD CONSTRAINT "ApplicationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRun" ADD CONSTRAINT "ApplicationRun_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRun" ADD CONSTRAINT "ApplicationRun_applicationPacketId_fkey" FOREIGN KEY ("applicationPacketId") REFERENCES "ApplicationPacket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
