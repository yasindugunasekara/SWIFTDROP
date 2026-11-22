-- =============================================================================
-- SWIFTDROP: Member 5 (Dispatch, Assignment & Service Configuration) Seed Data
-- =============================================================================

-- 1. Ensure Delivery Zones with Standard LKR Pricing Rates
INSERT INTO delivery_zones (id, zone_name, base_rate, per_kg_rate, per_km_rate)
VALUES 
    ('d5000000-0000-4000-8000-000000000001', 'Western Province (Colombo Urban)', 350.00, 50.00, 20.00),
    ('d5000000-0000-4000-8000-000000000002', 'Central Province (Kandy Metro)', 450.00, 70.00, 30.00),
    ('d5000000-0000-4000-8000-000000000003', 'Southern Coastal (Galle / Matara)', 400.00, 60.00, 25.00),
    ('d5000000-0000-4000-8000-000000000004', 'Island-wide Express Delivery', 600.00, 90.00, 45.00)
ON CONFLICT (id) DO UPDATE SET
    base_rate = EXCLUDED.base_rate,
    per_kg_rate = EXCLUDED.per_kg_rate,
    per_km_rate = EXCLUDED.per_km_rate;

-- 2. Ensure Sample Dispatcher and Couriers
INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
VALUES 
    ('10111111-1111-1111-1111-111111111111', 'sunil.silva@swiftdrop.com', '$2a$10$SampleHashedPassForDemoOnly1234567890', 'Sunil Silva', '+94779876543', 'COURIER', TRUE),
    ('20222222-2222-2222-2222-222222222222', 'sarah.lee@swiftdrop.com', '$2a$10$SampleHashedPassForDemoOnly1234567890', 'Sarah Lee', '+94712345678', 'COURIER', TRUE),
    ('30333333-3333-3333-3333-333333333333', 'kamal.perera@swiftdrop.com', '$2a$10$SampleHashedPassForDemoOnly1234567890', 'Kamal Perera', '+94763456789', 'COURIER', TRUE),
    ('40444444-4444-4444-4444-444444444444', 'nuwan.p@swiftdrop.com', '$2a$10$SampleHashedPassForDemoOnly1234567890', 'Nuwan Pradeep', '+94754567890', 'COURIER', TRUE),
    ('50555555-5555-5555-5555-555555555555', 'chaminda.v@swiftdrop.com', '$2a$10$SampleHashedPassForDemoOnly1234567890', 'Chaminda Vaas', '+94725678901', 'COURIER', FALSE)
ON CONFLICT (email) DO NOTHING;

-- 3. Seed Unassigned Parcels Awaiting Dispatch (Status = 'CONFIRMED')
INSERT INTO parcels (
    id, tracking_number, customer_id, merchant_id,
    sender_name, sender_phone, pickup_address,
    recipient_name, recipient_phone, delivery_address,
    weight_kg, dimension_length_cm, dimension_width_cm, dimension_height_cm,
    total_fee, status, special_notes, created_at, updated_at
)
VALUES 
    ('d5100000-0000-4000-8000-000000000001', 'SWIFT-DISP-001', (SELECT id FROM users WHERE email='customer@swiftdrop.com' LIMIT 1), NULL,
     'Acme Wholesale Co', '+94112345678', '45 Main Street, Pettah, Colombo 11',
     'Dr. Perera', '+94771122334', 'Mt. Lavinia Clinic, Hotel Road, Mount Lavinia',
     3.50, 30.00, 20.00, 15.00, 525.00, 'CONFIRMED', 'Fragile medical diagnostic equipment. Handle with care.',
     NOW() - INTERVAL '14 minutes', NOW() - INTERVAL '14 minutes'),

    ('d5100000-0000-4000-8000-000000000002', 'SWIFT-DISP-002', (SELECT id FROM users WHERE email='customer@swiftdrop.com' LIMIT 1), NULL,
     'Lanka Textiles', '+94113456789', '88 Keyzer St, Colombo 11',
     'Shanika Silva', '+94712233445', '22 Peradeniya Road, Kandy',
     2.10, 25.00, 20.00, 10.00, 690.00, 'CONFIRMED', 'Call recipient prior to arrival.',
     NOW() - INTERVAL '32 minutes', NOW() - INTERVAL '32 minutes'),

    ('d5100000-0000-4000-8000-000000000003', 'SWIFT-DISP-003', (SELECT id FROM users WHERE email='customer@swiftdrop.com' LIMIT 1), NULL,
     'Colombo Tech Mart', '+94114567890', '150 Galle Road, Colombo 04',
     'Dilan Jayasinghe', '+94763344556', '78 Fort Bazaar, Galle Fort',
     1.50, 20.00, 15.00, 10.00, 650.00, 'CONFIRMED', 'Customer requested evening delivery.',
     NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),

    ('d5100000-0000-4000-8000-000000000004', 'SWIFT-DISP-004', (SELECT id FROM users WHERE email='customer@swiftdrop.com' LIMIT 1), NULL,
     'Organic Tea Exporters', '+94115678901', '12 Vauxhall Street, Colombo 02',
     'Hemas Logistics', '+94704455667', 'Airport Free Trade Zone, Katunayake',
     7.80, 45.00, 35.00, 25.00, 950.00, 'CONFIRMED', 'Gate pass required upon entry.',
     NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '60 minutes'),

    ('d5100000-0000-4000-8000-000000000005', 'SWIFT-DISP-005', (SELECT id FROM users WHERE email='customer@swiftdrop.com' LIMIT 1), NULL,
     'Apex Stationery', '+94116789012', '102 High Level Road, Nugegoda',
     'University of Moratuwa Stores', '+94112650301', 'Katubedda, Moratuwa',
     4.20, 35.00, 25.00, 15.00, 580.00, 'CONFIRMED', 'Deliver to Academic Department Room 204',
     NOW() - INTERVAL '75 minutes', NOW() - INTERVAL '75 minutes')
ON CONFLICT (tracking_number) DO NOTHING;

-- 4. Seed Pending Merchant Partner Applications
INSERT INTO merchants (id, user_id, company_name, registration_number, approval_status, created_at)
VALUES 
    ('d5200000-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333333', 'Acme Electronics LLC', 'LK-8877123', 'PENDING', NOW() - INTERVAL '2 days'),
    ('d5200000-0000-4000-8000-000000000002', '33333333-3333-3333-3333-333333333333', 'Island Crafts & Co', 'LK-9988456', 'PENDING', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
    approval_status = EXCLUDED.approval_status;
