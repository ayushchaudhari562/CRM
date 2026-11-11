-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SALESMAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "MeetingOutcome" AS ENUM ('INTERESTED', 'CLOSED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PHOTO', 'FILE');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('VISIT', 'CALL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authUserId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "employeeId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SALESMAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checkInAt" TIMESTAMPTZ(3) NOT NULL,
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkInAccuracy" DOUBLE PRECISION,
    "selfieUrl" TEXT,
    "checkOutAt" TIMESTAMPTZ(3),
    "outcome" "MeetingOutcome" NOT NULL,
    "dealValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "voiceNoteUrl" TEXT,
    "voiceNoteSeconds" INTEGER,
    "aiSummary" TEXT,
    "nextVisitAt" TIMESTAMPTZ(3),
    "whatsappReminder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "meetingId" TEXT,
    "type" "FollowUpType" NOT NULL DEFAULT 'VISIT',
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "whatsappSentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "punchInAt" TIMESTAMPTZ(3) NOT NULL,
    "punchInLat" DOUBLE PRECISION,
    "punchInLng" DOUBLE PRECISION,
    "punchOutAt" TIMESTAMPTZ(3),
    "punchOutLat" DOUBLE PRECISION,
    "punchOutLng" DOUBLE PRECISION,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitsTarget" INTEGER NOT NULL,
    "dealValueTarget" DECIMAL(12,2),

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MeetingToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MeetingToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "Client_salesmanId_name_idx" ON "Client"("salesmanId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_clientRequestId_key" ON "Meeting"("clientRequestId");

-- CreateIndex
CREATE INDEX "Meeting_salesmanId_checkInAt_idx" ON "Meeting"("salesmanId", "checkInAt");

-- CreateIndex
CREATE INDEX "Meeting_clientId_checkInAt_idx" ON "Meeting"("clientId", "checkInAt");

-- CreateIndex
CREATE INDEX "Meeting_checkInAt_idx" ON "Meeting"("checkInAt");

-- CreateIndex
CREATE INDEX "Attachment_meetingId_idx" ON "Attachment"("meetingId");

-- CreateIndex
CREATE INDEX "FollowUp_salesmanId_status_dueAt_idx" ON "FollowUp"("salesmanId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_status_dueAt_idx" ON "FollowUp"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Attendance_salesmanId_punchInAt_idx" ON "Attendance"("salesmanId", "punchInAt");

-- CreateIndex
CREATE INDEX "LocationPing_salesmanId_recordedAt_idx" ON "LocationPing"("salesmanId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Target_salesmanId_date_key" ON "Target"("salesmanId", "date");

-- CreateIndex
CREATE INDEX "_MeetingToProduct_B_index" ON "_MeetingToProduct"("B");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToProduct" ADD CONSTRAINT "_MeetingToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MeetingToProduct" ADD CONSTRAINT "_MeetingToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

