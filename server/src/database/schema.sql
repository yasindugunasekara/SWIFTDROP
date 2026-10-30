-- =============================================================================
-- SWIFTDROP COMPREHENSIVE DATABASE SCHEMA
-- PostgreSQL Architecture Supporting 10 Team Members
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- MEMBER 1: Identity & Account Security
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'COURIER', 'DISPATCHER', 'ADMIN', 'MERCHANT');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 6: Merchant Account, Orders & Partner API
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    approval_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merchant_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    api_key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 2 & 5: Customer Booking, Pricing & Zones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name VARCHAR(100) NOT NULL,
    base_rate DECIMAL(10, 2) NOT NULL,
    per_kg_rate DECIMAL(10, 2) NOT NULL,
    per_km_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE parcel_status AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'RETURNED',
    'CANCELLED'
);

CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id),
    merchant_id UUID REFERENCES merchants(id),
    sender_name VARCHAR(150) NOT NULL,
    sender_phone VARCHAR(30) NOT NULL,
    pickup_address TEXT NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NOT NULL,
    weight_kg DECIMAL(6, 2) NOT NULL,
    dimension_length_cm DECIMAL(6, 2),
    dimension_width_cm DECIMAL(6, 2),
    dimension_height_cm DECIMAL(6, 2),
    total_fee DECIMAL(10, 2) NOT NULL,
    status parcel_status NOT NULL DEFAULT 'CONFIRMED',
    special_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 3 & 4: Tracking, Timeline & Courier Proof Execution
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcel_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES users(id),
    status parcel_status NOT NULL,
    location_name VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courier_delivery_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    courier_id UUID NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    recipient_signature_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 5: Dispatch & Assignment
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courier_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    courier_id UUID NOT NULL REFERENCES users(id),
    dispatcher_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- MEMBER 7: Notification Preferences & Delivery Inbox
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id),
    event_id VARCHAR(100) UNIQUE, -- Idempotency key
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 8: Merchant Webhook Center
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchant_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    signing_secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    events TEXT[] DEFAULT ARRAY['PARCEL_STATUS_UPDATED', 'PARCEL_DELIVERED', 'PARCEL_FAILED'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID NOT NULL REFERENCES merchant_webhook_endpoints(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES parcels(id),
    payload JSONB NOT NULL,
    response_code INT,
    response_body TEXT,
    attempt_count INT DEFAULT 1,
    is_dead_letter BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- MEMBER 10: Parcel Support & Exception Management
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcel_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    raised_by_id UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    resolution_status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, CANCELLED
    resolution_notes TEXT,
    resolved_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS support_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exception_id UUID NOT NULL REFERENCES parcel_exceptions(id) ON DELETE CASCADE,
    changed_by_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
