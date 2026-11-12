-- Street address of the check-in, looked up on the salesman's phone (null for older visits / no address).
ALTER TABLE "Meeting" ADD COLUMN "checkInAddress" TEXT;
