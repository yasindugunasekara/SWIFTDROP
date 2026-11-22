-- =============================================================================
-- SWIFTDROP MIGRATION 004: Member 07 — Notification Inbox Hardening
-- =============================================================================
-- Purpose
--   1. Add notification classification, read audit and channel-intent columns.
--   2. Replace the legacy GLOBAL unique constraint on event_id with
--      PER-RECIPIENT uniqueness: UNIQUE (user_id, event_id).
--   3. Add inbox, unread-count and idempotency indexes.
--   4. Ensure the expected foreign keys exist.
--   5. Enable defence-in-depth RLS for the two notification tables.
--
-- Safety
--   * server/src/database/migrate.ts has no migration ledger and re-runs every
--     .sql file, so every statement here is idempotent.
--   * The file is sent to PostgreSQL as one multi-statement query. PostgreSQL
--     executes that as a single implicit transaction, so any failure (including
--     the duplicate-data guard below) rolls the whole file back.
--   * No row is ever deleted or rewritten. Existing notifications and
--     preferences are preserved exactly.
--   * Constraint and index names are discovered from the catalog, never assumed.
--
-- Apply with:
--   cd server && npm run migrate
-- or paste into the Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Refuse to continue if existing data would violate per-recipient uniqueness
-- -----------------------------------------------------------------------------
-- The legacy global UNIQUE (event_id) normally makes this impossible. The guard
-- protects databases whose constraint was dropped or never applied: we stop and
-- ask a human to resolve the data instead of silently deleting duplicates.
DO $$
DECLARE
  duplicate_pairs BIGINT;
  duplicate_examples TEXT;
BEGIN
  SELECT count(*) INTO duplicate_pairs
  FROM (
    SELECT user_id, event_id
    FROM public.notifications
    WHERE event_id IS NOT NULL
    GROUP BY user_id, event_id
    HAVING count(*) > 1
  ) AS duplicates;

  IF duplicate_pairs > 0 THEN
    SELECT string_agg(
             format('user_id=%s event_id=%s count=%s', user_id, event_id, occurrences),
             '; '
           )
      INTO duplicate_examples
    FROM (
      SELECT user_id, event_id, count(*) AS occurrences
      FROM public.notifications
      WHERE event_id IS NOT NULL
      GROUP BY user_id, event_id
      HAVING count(*) > 1
      ORDER BY count(*) DESC
      LIMIT 5
    ) AS examples;

    RAISE EXCEPTION
      'Notifications migration aborted: % duplicate (user_id, event_id) pair(s) already exist. No records were deleted. Resolve them manually before re-running. Examples: %',
      duplicate_pairs, duplicate_examples;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Notification classification, read audit and channel intent
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivery_channels TEXT[] NOT NULL DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- 3. Remove any single-column unique rule on event_id, whatever its name
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  target RECORD;
  event_id_attnum SMALLINT;
BEGIN
  SELECT att.attnum
    INTO event_id_attnum
    FROM pg_attribute att
   WHERE att.attrelid = 'public.notifications'::regclass
     AND att.attname = 'event_id'
     AND NOT att.attisdropped;

  IF event_id_attnum IS NULL THEN
    RAISE EXCEPTION 'public.notifications.event_id column is missing';
  END IF;

  -- 3a. Unique constraints on exactly (event_id)
  FOR target IN
    SELECT con.conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.notifications'::regclass
       AND con.contype = 'u'
       AND con.conkey = ARRAY[event_id_attnum]::SMALLINT[]
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', target.conname);
  END LOOP;

  -- 3b. Standalone unique indexes on exactly (event_id) that do not back a
  --     constraint. Dropping a constraint above also drops its backing index.
  FOR target IN
    SELECT idx.relname AS index_name
      FROM pg_index x
      JOIN pg_class rel ON rel.oid = x.indrelid
      JOIN pg_class idx ON idx.oid = x.indexrelid
      JOIN pg_attribute att
        ON att.attrelid = rel.oid AND att.attnum = x.indkey[0]
     WHERE rel.oid = 'public.notifications'::regclass
       AND x.indisunique
       AND NOT x.indisprimary
       AND x.indnkeyatts = 1
       AND att.attname = 'event_id'
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', target.index_name);
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 4. Create the per-recipient unique index when no equivalent already exists
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  equivalent_index BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_index x
      JOIN pg_class rel ON rel.oid = x.indrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'notifications'
       AND x.indisunique
       AND NOT x.indisprimary
       AND x.indnkeyatts = 2
       AND (
         SELECT array_agg(att.attname::TEXT ORDER BY att.attname)
           FROM unnest(x.indkey::SMALLINT[]) WITH ORDINALITY AS keys(attnum, position)
           JOIN pg_attribute att
             ON att.attrelid = rel.oid AND att.attnum = keys.attnum
          WHERE keys.position <= x.indnkeyatts
       ) = ARRAY['event_id', 'user_id']
  ) INTO equivalent_index;

  IF NOT equivalent_index THEN
    CREATE UNIQUE INDEX notifications_user_event_unique
      ON public.notifications (user_id, event_id);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. Inbox and unread-count indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE is_read = FALSE;

-- -----------------------------------------------------------------------------
-- 6. Ensure the expected foreign keys exist (adds only; never deletes)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  user_attnum SMALLINT;
  parcel_attnum SMALLINT;
  preference_user_attnum SMALLINT;
BEGIN
  SELECT attnum INTO user_attnum
    FROM pg_attribute
   WHERE attrelid = 'public.notifications'::regclass
     AND attname = 'user_id' AND NOT attisdropped;

  SELECT attnum INTO parcel_attnum
    FROM pg_attribute
   WHERE attrelid = 'public.notifications'::regclass
     AND attname = 'parcel_id' AND NOT attisdropped;

  SELECT attnum INTO preference_user_attnum
    FROM pg_attribute
   WHERE attrelid = 'public.user_notification_preferences'::regclass
     AND attname = 'user_id' AND NOT attisdropped;

  IF user_attnum IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.notifications'::regclass
       AND contype = 'f'
       AND conkey = ARRAY[user_attnum]::SMALLINT[]
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF parcel_attnum IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.notifications'::regclass
       AND contype = 'f'
       AND conkey = ARRAY[parcel_attnum]::SMALLINT[]
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_parcel_id_fkey
      FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);
  END IF;

  IF preference_user_attnum IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.user_notification_preferences'::regclass
       AND contype = 'f'
       AND conkey = ARRAY[preference_user_attnum]::SMALLINT[]
  ) THEN
    ALTER TABLE public.user_notification_preferences
      ADD CONSTRAINT user_notification_preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 7. Defence in depth for the Supabase Data API
-- -----------------------------------------------------------------------------
-- The Express API connects directly with the database owner role, which is not
-- affected by RLS. These statements stop direct PostgREST access through the
-- anon/authenticated roles. The DO block tolerates plain PostgreSQL installs
-- where those Supabase roles do not exist.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.notifications FROM anon;
    REVOKE ALL ON TABLE public.user_notification_preferences FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.notifications FROM authenticated;
    REVOKE ALL ON TABLE public.user_notification_preferences FROM authenticated;
  END IF;
END
$$;
