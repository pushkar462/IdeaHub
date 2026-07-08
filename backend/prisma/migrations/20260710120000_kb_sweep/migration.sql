-- Athwart Loop · Handbook v5 · Increment I8
-- Monthly KB sweep — the lead walks resolved Use Cases and marks each one
-- as swept into the section knowledge base (handbook B6).

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "sweptToKb" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sweptAt"   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "Post_useCase_sweep_idx"
  ON "Post" ("isUseCase", "sweptToKb", "status");

-- New audit action so KB sweeps show up in the timeline as their own event.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"AuditActionType"'::regtype
      AND enumlabel = 'KB_SWEPT'
  ) THEN
    ALTER TYPE "AuditActionType" ADD VALUE 'KB_SWEPT';
  END IF;
END$$;
