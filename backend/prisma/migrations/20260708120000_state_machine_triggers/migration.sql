-- Athwart Loop · Handbook v5 · Increment I1
-- 1) Auto-generate postNumber via a sequence (atomic under concurrent inserts).
-- 2) Enforce the status state machine at the DB level (handbook C2).

-- ============================================================================
-- 1. postNumber auto-generation
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS loop_post_number_seq START 1;

-- Seed the sequence past the highest LOOP-YYYY-NNNN currently in use so we
-- never collide with rows created by the previous app-side generator.
SELECT setval(
  'loop_post_number_seq',
  GREATEST(
    1,
    COALESCE((
      SELECT MAX(CAST(SPLIT_PART("postNumber", '-', 3) AS INTEGER))
      FROM "Post"
      WHERE "postNumber" ~ '^LOOP-[0-9]{4}-[0-9]+$'
    ), 0)
  ),
  true
);

ALTER TABLE "Post" ALTER COLUMN "postNumber" SET DEFAULT '';

CREATE OR REPLACE FUNCTION generate_loop_post_number()
RETURNS TRIGGER AS $$
DECLARE
  yr INT;
BEGIN
  IF NEW."postNumber" IS NULL OR NEW."postNumber" = '' THEN
    yr := EXTRACT(YEAR FROM COALESCE(NEW."createdAt", NOW()))::INT;
    NEW."postNumber" := 'LOOP-' || yr || '-' || LPAD(nextval('loop_post_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_loop_post_number ON "Post";
CREATE TRIGGER trg_generate_loop_post_number
  BEFORE INSERT ON "Post"
  FOR EACH ROW
  EXECUTE FUNCTION generate_loop_post_number();

-- ============================================================================
-- 2. Status state-machine guard
-- ============================================================================
-- Exception messages are prefixed with `LOOP_TRANSITION:` so the Node error
-- middleware can surface them as friendly 400s. See prismaError.util.ts.

CREATE OR REPLACE FUNCTION loop_posts_transition_guard()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow replication / restore contexts to bypass the guard.
  IF current_setting('session_replication_role', TRUE) = 'replica' THEN
    RETURN NEW;
  END IF;

  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  -- OPEN -> DISCUSSING: owner acknowledges.
  IF OLD."status" = 'OPEN' AND NEW."status" = 'DISCUSSING' THEN
    IF NEW."acknowledgedAt" IS NULL THEN
      NEW."acknowledgedAt" := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- DISCUSSING -> RESOLVED: resolution required; parked/declined require a reason.
  IF OLD."status" = 'DISCUSSING' AND NEW."status" = 'RESOLVED' THEN
    IF NEW."resolution" IS NULL THEN
      RAISE EXCEPTION 'LOOP_TRANSITION: Resolution is required when resolving a post.'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW."resolution" IN ('PARKED', 'DECLINED')
       AND (NEW."resolutionReason" IS NULL OR btrim(NEW."resolutionReason") = '') THEN
      RAISE EXCEPTION 'LOOP_TRANSITION: A one-line reason is required when a post is parked or declined.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  -- OPEN -> RESOLVED: fast-answer path; same resolution rules + auto-acknowledge.
  IF OLD."status" = 'OPEN' AND NEW."status" = 'RESOLVED' THEN
    IF NEW."resolution" IS NULL THEN
      RAISE EXCEPTION 'LOOP_TRANSITION: Resolution is required when resolving a post.'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW."resolution" IN ('PARKED', 'DECLINED')
       AND (NEW."resolutionReason" IS NULL OR btrim(NEW."resolutionReason") = '') THEN
      RAISE EXCEPTION 'LOOP_TRANSITION: A one-line reason is required when a post is parked or declined.'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW."acknowledgedAt" IS NULL THEN
      NEW."acknowledgedAt" := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- RESOLVED -> OPEN: re-open clears resolution. Actor-permission check stays in Node.
  IF OLD."status" = 'RESOLVED' AND NEW."status" = 'OPEN' THEN
    NEW."resolution" := NULL;
    NEW."resolutionReason" := NULL;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'LOOP_TRANSITION: Illegal status transition: % -> %.', OLD."status", NEW."status"
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loop_posts_transition_guard ON "Post";
CREATE TRIGGER trg_loop_posts_transition_guard
  BEFORE UPDATE OF "status" ON "Post"
  FOR EACH ROW
  EXECUTE FUNCTION loop_posts_transition_guard();
