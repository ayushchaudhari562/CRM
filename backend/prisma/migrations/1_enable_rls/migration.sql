-- Supabase exposes every table in "public" through its Data API (PostgREST).
-- The publishable key ships inside the app, so without RLS anyone could read/write these tables.
-- RLS ON with no policies = the API can't touch them. Prisma connects as the "postgres" role, which bypasses RLS.
-- Add policies later only if the app must talk to Supabase directly.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationPing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Target" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_MeetingToProduct" ENABLE ROW LEVEL SECURITY;
