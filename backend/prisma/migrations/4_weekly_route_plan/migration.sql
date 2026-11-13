-- CreateEnum
CREATE TYPE "PlannedStopStatus" AS ENUM ('PENDING', 'VISITED', 'MISSED');

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedStop" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNumber" TEXT,
    "status" "PlannedStopStatus" NOT NULL DEFAULT 'PENDING',
    "visitedMeetingId" TEXT,
    "visitedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlannedStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyPlan_salesmanId_date_idx" ON "WeeklyPlan"("salesmanId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_salesmanId_date_key" ON "WeeklyPlan"("salesmanId", "date");

-- CreateIndex
CREATE INDEX "PlannedStop_planId_status_idx" ON "PlannedStop"("planId", "status");

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedStop" ADD CONSTRAINT "PlannedStop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "WeeklyPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlannedStop" ENABLE ROW LEVEL SECURITY;
