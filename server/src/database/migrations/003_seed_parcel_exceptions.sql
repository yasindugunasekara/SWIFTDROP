-- =============================================================================
-- SWIFTDROP MIGRATION 003: Seed Sample Failed Parcels, Exceptions & Audit Logs
-- =============================================================================

-- 1. Insert Sample Parcels (including Failed Deliveries for Member 10 Triage)
INSERT INTO parcels (
    id, tracking_number, customer_id, merchant_id,
    sender_name, sender_phone, pickup_address,
    recipient_name, recipient_phone, delivery_address,
    weight_kg, dimension_length_cm, dimension_width_cm, dimension_height_cm,
    total_fee, status, special_notes
) VALUES 
(
    '66666666-6666-6666-6666-666666666666',
    'SWIFT-991122',
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'Apex Electronics Store',
    '+94112345678',
    '45 Galle Road, Colombo 03',
    'Robert Smith',
    '+94779876543',
    '742 Evergreen Terrace, Sector 4, Colombo 03',
    1.20, 20.00, 15.00, 10.00,
    450.00,
    'FAILED',
    'Ring bell twice; fragile electronics inside.'
),
(
    '77777777-7777-7777-7777-777777777777',
    'SWIFT-443322',
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'Kasun Perera',
    '+94771234567',
    '12 Lotus Grove, Dehiwala',
    'Anura Bandara',
    '+94712345678',
    '88 Peradeniya Road, Kandy',
    2.50, 30.00, 25.00, 15.00,
    650.00,
    'FAILED',
    'Damaged barcode scan label at sorting hub.'
),
(
    '88888888-8888-8888-8888-888888888888',
    'SWIFT-882233',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Kasun Perera',
    '+94771234567',
    '12 Lotus Grove, Dehiwala',
    'Emily Davis',
    '+94718765432',
    '10 Downing St, Cinnamon Gardens, Colombo 07',
    0.80, 15.00, 10.00, 5.00,
    350.00,
    'OUT_FOR_DELIVERY',
    'Leave with security guard if not available.'
)
ON CONFLICT (tracking_number) DO NOTHING;

-- 2. Seed Courier Delivery Proofs for Failed Attempts
INSERT INTO courier_delivery_proofs (
    id, parcel_id, courier_id, photo_url, failure_reason
) VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
    'RECIPIENT_UNAVAILABLE'
),
(
    'a2222222-2222-2222-2222-222222222222',
    '77777777-7777-7777-7777-777777777777',
    '22222222-2222-2222-2222-222222222222',
    'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=500',
    'DAMAGED_LABEL'
)
ON CONFLICT DO NOTHING;

-- 3. Seed Status History
INSERT INTO parcel_status_history (
    parcel_id, courier_id, status, location_name, note
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'OUT_FOR_DELIVERY',
    'Colombo 03 Sector',
    'Dispatched on morning run with Courier Sunil Silva'
),
(
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'FAILED',
    'Doorstep Attempt',
    'Delivery attempt failed: Recipient unavailable after 3 attempts'
),
(
    '77777777-7777-7777-7777-777777777777',
    '22222222-2222-2222-2222-222222222222',
    'FAILED',
    'Western Sorting Hub',
    'Sorting diverter exception: Barcode unreadable / damaged label'
)
ON CONFLICT DO NOTHING;

-- 4. Seed Member 10: Parcel Exceptions
INSERT INTO parcel_exceptions (
    id, parcel_id, raised_by_id, reason, resolution_status, resolution_notes
) VALUES
(
    '99999999-9999-9999-9999-999999999991',
    '66666666-6666-6666-6666-666666666666',
    '22222222-2222-2222-2222-222222222222',
    'Customer not home after 3 delivery attempts. Recipient phone rings with no answer.',
    'OPEN',
    'Awaiting customer callback or dispatcher reschedule instructions.'
),
(
    '99999999-9999-9999-9999-999999999992',
    '77777777-7777-7777-7777-777777777777',
    '44444444-4444-4444-4444-444444444444',
    'Damaged barcode scan label at sorting hub. Diverter automatically routed to support exception bay.',
    'INVESTIGATING',
    'Hub manager contacted sender Kasun Perera to confirm recipient telephone and destination address.'
)
ON CONFLICT DO NOTHING;

-- 5. Seed Support Audit Logs (Tamper-Proof Audit Trail)
INSERT INTO support_audit_logs (
    id, exception_id, changed_by_id, action, previous_state, new_state
) VALUES
(
    'b1111111-1111-1111-1111-111111111111',
    '99999999-9999-9999-9999-999999999991',
    '22222222-2222-2222-2222-222222222222',
    'EXCEPTION_CREATED',
    NULL,
    '{"status": "OPEN", "reason": "Customer not home after 3 attempts", "raised_by": "Sunil Silva"}'::jsonb
),
(
    'b2222222-2222-2222-2222-222222222222',
    '99999999-9999-9999-9999-999999999992',
    '44444444-4444-4444-4444-444444444444',
    'EXCEPTION_CREATED',
    NULL,
    '{"status": "OPEN", "reason": "Damaged barcode scan label at sorting"}'::jsonb
),
(
    'b3333333-3333-3333-3333-333333333333',
    '99999999-9999-9999-9999-999999999992',
    '44444444-4444-4444-4444-444444444444',
    'STATUS_UPDATED',
    '{"status": "OPEN"}'::jsonb,
    '{"status": "INVESTIGATING", "notes": "Hub manager contacted sender to verify address"}'::jsonb
)
ON CONFLICT DO NOTHING;

