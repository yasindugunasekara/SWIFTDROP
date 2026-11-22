-- =============================================================================
-- SWIFTDROP: Member 5 (Dispatch, Fleet Balancer & Pricing) Supabase Seed
-- Safe to run directly in the Supabase SQL Editor.
-- Completely idempotent: Can be executed multiple times without errors or duplicate rows.
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. SEED DELIVERY ZONES WITH LKR RATES
-- -----------------------------------------------------------------------------
INSERT INTO public.delivery_zones (id, zone_name, base_rate, per_kg_rate, per_km_rate)
VALUES 
    ('d5000000-0000-4000-8000-000000000001', 'Western Province (Colombo Urban)', 350.00, 50.00, 20.00),
    ('d5000000-0000-4000-8000-000000000002', 'Central Province (Kandy Metro)', 450.00, 70.00, 30.00),
    ('d5000000-0000-4000-8000-000000000003', 'Southern Coastal (Galle / Matara)', 400.00, 60.00, 25.00),
    ('d5000000-0000-4000-8000-000000000004', 'Island-wide Express Delivery', 600.00, 90.00, 45.00)
ON CONFLICT (id) DO UPDATE SET
    zone_name = EXCLUDED.zone_name,
    base_rate = EXCLUDED.base_rate,
    per_kg_rate = EXCLUDED.per_kg_rate,
    per_km_rate = EXCLUDED.per_km_rate;

-- -----------------------------------------------------------------------------
-- 2. SEED FLEET COURIERS & DISPATCHER USERS
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, email, password_hash, full_name, phone, role, is_active)
VALUES 
    -- Customer
    ('11111111-1111-1111-1111-111111111111', 'customer@swiftdrop.com', '$2a$10$CustomerHashedSample1234567890abcdef', 'Kasun Perera', '+94771234567', 'CUSTOMER', TRUE),
    -- Dispatcher
    ('44444444-4444-4444-4444-444444444444', 'dispatcher@swiftdrop.com', '$2a$10$DispatcherHashedSample1234567890abc', 'Operational Dispatch Admin', '+94117654321', 'DISPATCHER', TRUE),
    -- Courier 1: Sunil Silva (2 stops, AVAILABLE)
    ('10111111-1111-1111-1111-111111111111', 'sunil.silva@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Sunil Silva', '+94779876543', 'COURIER', TRUE),
    -- Courier 2: Sarah Lee (5 stops, OPTIMAL)
    ('20222222-2222-2222-2222-222222222222', 'sarah.lee@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Sarah Lee', '+94712345678', 'COURIER', TRUE),
    -- Courier 3: Kamal Perera (14 stops, NEAR_CAPACITY)
    ('30333333-3333-3333-3333-333333333333', 'kamal.perera@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Kamal Perera', '+94763456789', 'COURIER', TRUE),
    -- Courier 4: Nuwan Pradeep (15 stops, AT_CAPACITY)
    ('40444444-4444-4444-4444-444444444444', 'nuwan.p@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Nuwan Pradeep', '+94754567890', 'COURIER', TRUE),
    -- Courier 5: Chaminda Vaas (0 stops, OFFLINE)
    ('50555555-5555-5555-5555-555555555555', 'chaminda.v@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Chaminda Vaas', '+94725678901', 'COURIER', FALSE)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 3. SEED PENDING & APPROVED MERCHANTS (For Merchant Approvals Console)
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, email, password_hash, full_name, phone, role, is_active)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'merchant@swiftdrop.com', '$2a$10$MerchantHashedSample1234567890abcdef', 'Apex Store Owner', '+94112345678', 'MERCHANT', TRUE),
    ('33333333-3333-3333-3333-333333333334', 'acme.partner@swiftdrop.com', '$2a$10$MerchantHashedSample1234567890abcdef', 'Acme Wholesale Director', '+94118877123', 'MERCHANT', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.merchants (id, user_id, company_name, registration_number, approval_status, created_at)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Apex Electronics Pvt Ltd', 'PV-98765-SL', 'APPROVED', NOW() - INTERVAL '7 days'),
    ('d5200000-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333334', 'Acme Electronics LLC', 'LK-8877123', 'PENDING', NOW() - INTERVAL '2 days'),
    ('d5200000-0000-4000-8000-000000000002', '33333333-3333-3333-3333-333333333334', 'Island Crafts & Organic Herbs', 'LK-9988456', 'PENDING', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
    approval_status = EXCLUDED.approval_status;

-- -----------------------------------------------------------------------------
-- 4. SEED UNASSIGNED PARCELS AWAITING DISPATCH (Status = 'CONFIRMED')
-- -----------------------------------------------------------------------------
INSERT INTO public.parcels (
    id, tracking_number, customer_id, merchant_id,
    sender_name, sender_phone, pickup_address,
    recipient_name, recipient_phone, delivery_address,
    weight_kg, dimension_length_cm, dimension_width_cm, dimension_height_cm,
    total_fee, status, special_notes, created_at, updated_at
)
VALUES 
    ('d5100000-0000-4000-8000-000000000001', 'SWIFT-102938', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
     'Acme Wholesale Co', '+94112345678', '45 Main Street, Pettah, Colombo 11',
     'Dr. Perera', '+94771122334', 'Mt. Lavinia Clinic, Hotel Road, Mount Lavinia',
     3.50, 30.00, 20.00, 15.00, 525.00, 'CONFIRMED', 'Fragile medical diagnostic equipment. Handle with care.',
     NOW() - INTERVAL '14 minutes', NOW() - INTERVAL '14 minutes'),

    ('d5100000-0000-4000-8000-000000000002', 'SWIFT-102939', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
     'Lanka Textiles', '+94113456789', '88 Keyzer St, Colombo 11',
     'Shanika Silva', '+94712233445', '22 Peradeniya Road, Kandy',
     2.10, 25.00, 20.00, 10.00, 690.00, 'CONFIRMED', 'Call recipient prior to arrival.',
     NOW() - INTERVAL '32 minutes', NOW() - INTERVAL '32 minutes'),

    ('d5100000-0000-4000-8000-000000000003', 'SWIFT-102940', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
     'Colombo Tech Mart', '+94114567890', '150 Galle Road, Colombo 04',
     'Dilan Jayasinghe', '+94763344556', '78 Fort Bazaar, Galle Fort',
     1.50, 20.00, 15.00, 10.00, 650.00, 'CONFIRMED', 'Customer requested evening delivery.',
     NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),

    ('d5100000-0000-4000-8000-000000000004', 'SWIFT-102941', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
     'Organic Tea Exporters', '+94115678901', '12 Vauxhall Street, Colombo 02',
     'Hemas Logistics', '+94704455667', 'Airport Free Trade Zone, Katunayake',
     7.80, 45.00, 35.00, 25.00, 950.00, 'CONFIRMED', 'Gate pass required upon entry.',
     NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '60 minutes'),

    ('d5100000-0000-4000-8000-000000000005', 'SWIFT-102942', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555',
     'Apex Stationery Supplies', '+94116789012', '102 High Level Road, Nugegoda',
     'University of Moratuwa Stores', '+94112650301', 'Katubedda, Moratuwa',
     4.20, 35.00, 25.00, 15.00, 580.00, 'CONFIRMED', 'Deliver to Academic Department Room 204',
     NOW() - INTERVAL '75 minutes', NOW() - INTERVAL '75 minutes')
ON CONFLICT (tracking_number) DO UPDATE SET
    status = 'CONFIRMED',
    total_fee = EXCLUDED.total_fee;

-- -----------------------------------------------------------------------------
-- 5. SEED ACTIVE COURIER ASSIGNMENTS (For Workload Balancer Display)
-- -----------------------------------------------------------------------------

-- Sunil Silva: 2 active assigned stops
INSERT INTO public.parcels (id, tracking_number, customer_id, sender_name, sender_phone, pickup_address, recipient_name, recipient_phone, delivery_address, weight_kg, total_fee, status)
VALUES 
    ('d5300000-0000-4000-8000-000000000001', 'SWIFT-SUNIL-01', '11111111-1111-1111-1111-111111111111', 'Sunil Client 1', '+94112223344', 'Colombo 03', 'Rohan Perera', '+94771112222', 'Kollupitiya, Colombo 03', 1.20, 420.00, 'OUT_FOR_DELIVERY'),
    ('d5300000-0000-4000-8000-000000000002', 'SWIFT-SUNIL-02', '11111111-1111-1111-1111-111111111111', 'Sunil Client 2', '+94112223355', 'Colombo 05', 'Nadeesha Silva', '+94772223333', 'Havelock Town, Colombo 05', 0.80, 380.00, 'IN_TRANSIT')
ON CONFLICT (tracking_number) DO NOTHING;

INSERT INTO public.courier_assignments (id, parcel_id, courier_id, dispatcher_id, assigned_at, is_active)
VALUES 
    ('d5400000-0000-4000-8000-000000000001', 'd5300000-0000-4000-8000-000000000001', '10111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '3 hours', TRUE),
    ('d5400000-0000-4000-8000-000000000002', 'd5300000-0000-4000-8000-000000000002', '10111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '2 hours', TRUE)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. VERIFICATION QUERY (Shows counts immediately after executing script)
-- -----------------------------------------------------------------------------
SELECT 'Delivery Zones' AS entity, COUNT(*)::text AS count FROM public.delivery_zones
UNION ALL
SELECT 'Active Couriers', COUNT(*)::text FROM public.users WHERE role='COURIER'
UNION ALL
SELECT 'Unassigned Parcels (CONFIRMED)', COUNT(*)::text FROM public.parcels WHERE status='CONFIRMED'
UNION ALL
SELECT 'Active Courier Assignments', COUNT(*)::text FROM public.courier_assignments WHERE is_active=TRUE
UNION ALL
SELECT 'Pending Merchants', COUNT(*)::text FROM public.merchants WHERE approval_status='PENDING';
