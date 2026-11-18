-- =============================================================================
-- SWIFTDROP: Member 3 (Tracking, History & Receipt) indexes
-- -----------------------------------------------------------------------------
-- Timeline lookups (public tracking, history detail, receipts) read
-- parcel_status_history by parcel ordered by time; the customer history list
-- reads parcels by owner, newest first. Idempotent.
-- Demo data for this feature lives in seeds/tracking-demo-history.sql.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_parcel_status_history_parcel_created
    ON parcel_status_history (parcel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_parcels_customer_created
    ON parcels (customer_id, created_at DESC);
