-- TEST PROJECT ONLY. Run manually; never include this seed in production migrations.
--   supabase db query --remote=<project-ref> -f server/src/database/seeds/tracking-demo-history.sql
-- =============================================================================
-- SWIFTDROP: Member 3 (Tracking, History & Receipt) demo data
-- -----------------------------------------------------------------------------
-- Three parcels owned by customer@swiftdrop.com, each with a time-staggered
-- status timeline:
--   SWIFT-M3DLV001  DELIVERED   full 5-step timeline, used for the receipt demo
--   SWIFT-M3TRN002  IN_TRANSIT  used for the live-update demo
--   SWIFT-M3CNF003  CONFIRMED   just booked, single event
--
-- Owner and courier are looked up by email, so this works whatever IDs those
-- accounts have; if an account is missing, its rows are skipped instead of
-- failing. Every row has a fixed UUID, so re-running never duplicates anything.
-- =============================================================================

INSERT INTO parcels (
    id, tracking_number, customer_id, merchant_id,
    sender_name, sender_phone, pickup_address,
    recipient_name, recipient_phone, delivery_address,
    weight_kg, dimension_length_cm, dimension_width_cm, dimension_height_cm,
    total_fee, status, special_notes, created_at, updated_at
)
SELECT v.id::uuid, v.tracking_number, u.id, NULL,
       v.sender_name, v.sender_phone, v.pickup_address,
       v.recipient_name, v.recipient_phone, v.delivery_address,
       v.weight_kg, v.len, v.wid, v.hei,
       v.total_fee, v.status::parcel_status, v.special_notes,
       now() - v.created_ago::interval, now() - v.updated_ago::interval
FROM (VALUES
    ('c3000000-0000-4000-8000-000000000001', 'SWIFT-M3DLV001',
     'Kasun Perera', '+94771234567', '12 Lotus Grove, Dehiwala',
     'Nimali Fernando', '+94775550101', '21 Temple Road, Nugegoda',
     1.50, 25.00, 20.00, 10.00, 520.00, 'DELIVERED', 'Hand to recipient only.',
     '3 days', '2 days 2 hours'),
    ('c3000000-0000-4000-8000-000000000002', 'SWIFT-M3TRN002',
     'Kasun Perera', '+94771234567', '12 Lotus Grove, Dehiwala',
     'Dilan Jayasuriya', '+94715550202', '5 Lake Drive, Kandy',
     3.20, 40.00, 30.00, 20.00, 780.00, 'IN_TRANSIT', 'Fragile: ceramic items.',
     '1 day', '3 hours'),
    ('c3000000-0000-4000-8000-000000000003', 'SWIFT-M3CNF003',
     'Kasun Perera', '+94771234567', '12 Lotus Grove, Dehiwala',
     'Sachini Wickramasinghe', '+94765550303', '77 Beach Road, Galle',
     0.60, 15.00, 10.00, 5.00, 310.00, 'CONFIRMED', NULL,
     '30 minutes', '30 minutes')
) AS v(id, tracking_number, sender_name, sender_phone, pickup_address,
       recipient_name, recipient_phone, delivery_address,
       weight_kg, len, wid, hei, total_fee, status, special_notes,
       created_ago, updated_ago)
JOIN users u ON u.email = 'customer@swiftdrop.com'
ON CONFLICT DO NOTHING;

INSERT INTO parcel_status_history (id, parcel_id, courier_id, status, location_name, note, created_at)
SELECT v.id::uuid, p.id,
       CASE WHEN v.by_courier THEN (SELECT id FROM users WHERE email = 'courier@swiftdrop.com') END,
       v.status::parcel_status, v.location_name, v.note, now() - v.ago::interval
FROM (VALUES
    -- SWIFT-M3DLV001: delivered
    ('c3100000-0000-4000-8000-000000000101', 'SWIFT-M3DLV001', false, 'CONFIRMED',        'Dehiwala',                    'Booking confirmed',         '3 days'),
    ('c3100000-0000-4000-8000-000000000102', 'SWIFT-M3DLV001', true,  'PICKED_UP',        'Dehiwala',                    'Collected from sender',     '2 days 20 hours'),
    ('c3100000-0000-4000-8000-000000000103', 'SWIFT-M3DLV001', true,  'IN_TRANSIT',       'Colombo Central Sorting Hub', 'Sorted for Nugegoda route', '2 days 12 hours'),
    ('c3100000-0000-4000-8000-000000000104', 'SWIFT-M3DLV001', true,  'OUT_FOR_DELIVERY', 'Nugegoda',                    'Out with courier',          '2 days 5 hours'),
    ('c3100000-0000-4000-8000-000000000105', 'SWIFT-M3DLV001', true,  'DELIVERED',        'Nugegoda',                    'Handed to recipient',       '2 days 2 hours'),
    -- SWIFT-M3TRN002: in transit
    ('c3100000-0000-4000-8000-000000000201', 'SWIFT-M3TRN002', false, 'CONFIRMED',        'Dehiwala',                    'Booking confirmed',         '1 day'),
    ('c3100000-0000-4000-8000-000000000202', 'SWIFT-M3TRN002', true,  'PICKED_UP',        'Dehiwala',                    'Collected from sender',     '20 hours'),
    ('c3100000-0000-4000-8000-000000000203', 'SWIFT-M3TRN002', true,  'IN_TRANSIT',       'Colombo Central Sorting Hub', 'Departed hub for Kandy',    '3 hours'),
    -- SWIFT-M3CNF003: just booked
    ('c3100000-0000-4000-8000-000000000301', 'SWIFT-M3CNF003', false, 'CONFIRMED',        'Dehiwala',                    'Booking confirmed',         '30 minutes')
) AS v(id, tracking_number, by_courier, status, location_name, note, ago)
-- Only attach history to the demo parcel this seed created (fixed id), never to
-- an unrelated parcel that happens to hold the same tracking number.
JOIN parcels p ON p.tracking_number = v.tracking_number AND p.id::text LIKE 'c3000000-%'
ON CONFLICT DO NOTHING;
