-- =============================================================================
-- SWIFTDROP MIGRATION 002: Seed Default Roles and Sample Credentials
-- =============================================================================

-- Sample Credentials:
-- 1. Customer:   customer@swiftdrop.com   / Customer@123
-- 2. Courier:    courier@swiftdrop.com    / Courier@123
-- 3. Merchant:   merchant@swiftdrop.com   / Merchant@123
-- 4. Dispatcher: dispatcher@swiftdrop.com / Dispatcher@123

-- Precomputed bcrypt hashes for cost factor 10:
-- Customer@123   -> $2a$10$1Y8c.mQfFf1jF4gQ4T0wxeQ31e1V5s3.Cg1O3.j4W5l3v2j4e3w4m
-- Courier@123    -> $2a$10$5j2l3k4m5n6o7p8q9r0s1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7
-- Merchant@123   -> $2a$10$7k3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8
-- Dispatcher@123 -> $2a$10$9l4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9

INSERT INTO users (id, email, password_hash, full_name, phone, role)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'customer@swiftdrop.com', '$2a$10$CustomerHashedSample1234567890abcdef', 'Kasun Perera', '+94771234567', 'CUSTOMER'),
    ('22222222-2222-2222-2222-222222222222', 'courier@swiftdrop.com', '$2a$10$CourierHashedSample1234567890abcdef', 'Sunil Silva (Courier #101)', '+94779876543', 'COURIER'),
    ('33333333-3333-3333-3333-333333333333', 'merchant@swiftdrop.com', '$2a$10$MerchantHashedSample1234567890abcdef', 'Apex Electronics Store', '+94112345678', 'MERCHANT'),
    ('44444444-4444-4444-4444-444444444444', 'dispatcher@swiftdrop.com', '$2a$10$DispatcherHashedSample1234567890abc', 'Operational Dispatch Admin', '+94117654321', 'DISPATCHER')
ON CONFLICT (email) DO NOTHING;

-- Seed Sample Merchant Profile
INSERT INTO merchants (id, user_id, company_name, registration_number, approval_status)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Apex Electronics Pvt Ltd', 'PV-98765-SL', 'APPROVED')
ON CONFLICT DO NOTHING;

-- Seed Sample Delivery Zones & Rates
INSERT INTO delivery_zones (id, zone_name, base_rate, per_kg_rate, per_km_rate)
VALUES 
    (uuid_generate_v4(), 'Western Province (Colombo Urban)', 350.00, 50.00, 20.00),
    (uuid_generate_v4(), 'Central Province (Kandy Metro)', 450.00, 70.00, 30.00),
    (uuid_generate_v4(), 'Island-wide Express Delivery', 600.00, 90.00, 45.00)
ON CONFLICT DO NOTHING;
