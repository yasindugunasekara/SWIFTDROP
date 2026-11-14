-- =============================================================================
-- SWIFTDROP MIGRATION 003: Merchant module (Member 6) data fixes
-- =============================================================================
-- 1. Migration 002 seeded the demo merchant with a placeholder string instead of
--    a real bcrypt hash, so it could never sign in. This sets a real hash for:
--        merchant@swiftdrop.com / Merchant@123
--    Only the merchant demo account is touched; it only replaces the placeholder.
-- 2. Indexes for merchant-scoped lookups (API key auth, merchant order queries).
--
-- Safe to re-run (migrate.ts re-applies every file on each run).
-- =============================================================================

UPDATE users
   SET password_hash = '$2b$10$kUZfV9z4Zobaz/R3EvhiD.7xW.DhszobAOO/V1DBRV5F7dHShNZ0W'
 WHERE email = 'merchant@swiftdrop.com'
   AND role = 'MERCHANT'
   AND password_hash LIKE '%HashedSample%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_user_id      ON merchants (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_api_keys_hash ON merchant_api_keys (api_key_hash);
CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_merchant    ON merchant_api_keys (merchant_id);
CREATE INDEX IF NOT EXISTS idx_parcels_merchant_created      ON parcels (merchant_id, created_at DESC);
