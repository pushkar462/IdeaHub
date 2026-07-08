-- Athwart Loop · Handbook v5 · Phase 2 · P2 · Campaigns
-- Time-boxed themed prompts the founder posts to concentrate ideas (handbook B8).
-- Contributors tag Ideas against a campaign; the founder picks a winner at close.

CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id"          SERIAL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "prompt"      TEXT NOT NULL,
  "themeTag"    TEXT,
  "startsAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endsAt"      TIMESTAMPTZ NOT NULL,
  "status"      "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" INTEGER NOT NULL,
  "winnerId"    INTEGER,
  "closedAt"    TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Campaign_winner_fkey"    FOREIGN KEY ("winnerId")    REFERENCES "Post"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Campaign_status_endsAt_idx" ON "Campaign" ("status", "endsAt");

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "campaignId" INTEGER;
ALTER TABLE "Post"
  ADD CONSTRAINT "Post_campaign_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Post_campaignId_idx" ON "Post" ("campaignId");
