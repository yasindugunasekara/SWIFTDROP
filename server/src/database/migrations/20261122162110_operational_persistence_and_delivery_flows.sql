-- Operational persistence. Applied by the generated feature migration.
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.delivery_zones(id);
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Parcels';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS fee_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.service_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  settings jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.service_settings(id,settings) VALUES (true,
 '{"baseBookingFee":350,"perKgRate":50,"perKmRate":20,"holidaySurgeMultiplier":1.25,"peakHourSurgeMultiplier":1.15,"maxCourierCapacity":15}')
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.delivery_zones(zone_name,base_rate,per_kg_rate,per_km_rate)
SELECT 'Island-wide',350,50,20 WHERE NOT EXISTS (SELECT 1 FROM public.delivery_zones);

CREATE TABLE IF NOT EXISTS public.parcel_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.parcels(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS parcel_event_outbox_pending ON public.parcel_event_outbox(created_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION public.capture_parcel_status_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_id uuid := gen_random_uuid(); event_name text;
BEGIN
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  event_name := CASE NEW.status::text WHEN 'CONFIRMED' THEN 'PARCEL_BOOKED'
    WHEN 'ASSIGNED' THEN 'COURIER_ASSIGNED' WHEN 'DELIVERED' THEN 'PARCEL_DELIVERED'
    WHEN 'FAILED' THEN 'PARCEL_FAILED' ELSE 'PARCEL_STATUS_UPDATED' END;
  INSERT INTO public.parcel_event_outbox(id,parcel_id,payload) VALUES(event_id,NEW.id,
    jsonb_build_object('eventId',event_id,'event',event_name,'parcelId',NEW.id,
      'merchantId',NEW.merchant_id,'trackingNumber',NEW.tracking_number,'status',NEW.status,
      'timestamp',now(),'parcel',jsonb_build_object('id',NEW.id,'trackingNumber',NEW.tracking_number,'status',NEW.status)));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_parcel_status_event ON public.parcels;
CREATE TRIGGER capture_parcel_status_event AFTER INSERT OR UPDATE OF status ON public.parcels
FOR EACH ROW EXECUTE FUNCTION public.capture_parcel_status_event();

-- The assignment permits a mock SMS service. This is a durable mock mailbox,
-- never a claim that an SMS was delivered to a phone/provider.
CREATE TABLE IF NOT EXISTS public.mock_sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  message text NOT NULL,
  transport text NOT NULL DEFAULT 'MOCK_SMS' CHECK (transport='MOCK_SMS'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.deliver_mock_notification_sms() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF 'SMS'=ANY(NEW.delivery_channels) THEN
    INSERT INTO public.mock_sms_messages(notification_id,user_id,message) VALUES(NEW.id,NEW.user_id,NEW.message)
      ON CONFLICT(notification_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deliver_mock_notification_sms ON public.notifications;
CREATE TRIGGER deliver_mock_notification_sms AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.deliver_mock_notification_sms();
ALTER TABLE public.webhook_delivery_attempts ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE public.webhook_delivery_attempts ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.webhook_delivery_attempts ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE public.webhook_delivery_attempts ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3;
ALTER TABLE public.webhook_delivery_attempts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS webhook_attempt_event_key ON public.webhook_delivery_attempts(endpoint_id,event_id) WHERE event_id IS NOT NULL;

-- The function is a single atomic operation even through the optional HTTPS bridge.
CREATE OR REPLACE FUNCTION public.assign_delivery_parcel(target_parcel uuid,target_courier uuid,actor uuid,assignment_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE courier public.users; parcel public.parcels; current_load integer; capacity integer; result jsonb;
BEGIN
  SELECT * INTO courier FROM public.users WHERE id=target_courier AND role='COURIER' AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Courier unavailable'; END IF;
  SELECT coalesce((settings->>'maxCourierCapacity')::integer,15) INTO capacity FROM public.service_settings WHERE id=true;
  SELECT count(*) INTO current_load FROM public.courier_assignments ca JOIN public.parcels p ON p.id=ca.parcel_id
    WHERE ca.courier_id=target_courier AND ca.is_active AND p.status IN ('ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY');
  IF current_load>=coalesce(capacity,15) THEN RAISE EXCEPTION 'Courier capacity exceeded'; END IF;
  SELECT * INTO parcel FROM public.parcels WHERE id=target_parcel FOR UPDATE;
  IF NOT FOUND OR parcel.status<>'CONFIRMED' THEN RAISE EXCEPTION 'Parcel cannot be assigned'; END IF;
  UPDATE public.parcels SET status='ASSIGNED',updated_at=now() WHERE id=target_parcel;
  UPDATE public.courier_assignments SET is_active=false,unassigned_at=now() WHERE parcel_id=target_parcel AND is_active;
  INSERT INTO public.courier_assignments(parcel_id,courier_id,dispatcher_id) VALUES(target_parcel,target_courier,actor);
  INSERT INTO public.parcel_status_history(parcel_id,courier_id,status,note) VALUES(target_parcel,target_courier,'ASSIGNED',assignment_note);
  RETURN jsonb_build_object('parcelId',target_parcel,'trackingNumber',parcel.tracking_number,'courierId',target_courier,
    'courierName',courier.full_name,'status','ASSIGNED','assignedAt',now(),'previousLoad',current_load,'newLoad',current_load+1);
END $$;

CREATE OR REPLACE FUNCTION public.manage_delivery_user(target uuid,actor uuid,changes jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
  LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=actor AND role='ADMIN' AND is_active) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF target=actor AND changes->>'isActive'='false' THEN RAISE EXCEPTION 'You cannot deactivate your own account'; END IF;
  IF changes->>'isActive'='false' AND EXISTS(SELECT 1 FROM public.users WHERE id=target AND role='ADMIN' AND is_active)
    AND (SELECT count(*) FROM public.users WHERE role='ADMIN' AND is_active)<=1 THEN RAISE EXCEPTION 'The last administrator must remain active'; END IF;
  UPDATE public.users SET full_name=coalesce(changes->>'fullName',full_name),
    phone=CASE WHEN changes ? 'phone' THEN nullif(changes->>'phone','') ELSE phone END,
    is_active=coalesce((changes->>'isActive')::boolean,is_active),updated_at=now() WHERE id=target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  SELECT jsonb_build_object('id',id,'fullName',full_name,'phone',phone,'role',role,'isActive',is_active) INTO result FROM public.users WHERE id=target;
  RETURN result;
END $$;

ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sms_messages ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON public.service_settings,public.parcel_event_outbox,public.mock_sms_messages FROM %I',r);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.assign_delivery_parcel(uuid,uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.manage_delivery_user(uuid,uuid,jsonb) FROM PUBLIC;

-- The HTTPS SQL bridge runs as service_role. Keep server access explicit even
-- when a project has removed Supabase's default privileges for new objects.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT ALL ON public.service_settings,public.parcel_event_outbox,public.mock_sms_messages TO service_role;
    GRANT EXECUTE ON FUNCTION public.assign_delivery_parcel(uuid,uuid,uuid,text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.manage_delivery_user(uuid,uuid,jsonb) TO service_role;
  END IF;
END $$;

-- Business records are served through the authenticated Express API. Do not
-- expose parcel addresses, proof paths, API hashes or webhook secrets through
-- the Supabase Data API's default public-schema grants.
DO $$ DECLARE table_name text; api_role text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['parcels','parcel_status_history','courier_assignments',
    'courier_delivery_proofs','delivery_zones','merchant_api_keys','merchant_webhook_endpoints',
    'webhook_delivery_attempts','parcel_exceptions','support_audit_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I',table_name,api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
-- Auth profile loading needs only the caller's own merchant approval record.
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.merchants FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') AND to_regprocedure('auth.uid()') IS NOT NULL THEN
    REVOKE ALL ON public.merchants FROM authenticated;
    GRANT SELECT(id,user_id,approval_status,company_name,registration_number,created_at) ON public.merchants TO authenticated;
    DROP POLICY IF EXISTS own_merchant_auth_profile ON public.merchants;
    EXECUTE 'CREATE POLICY own_merchant_auth_profile ON public.merchants FOR SELECT TO authenticated USING
      (user_id IN (SELECT id FROM public.users WHERE auth_user_id=(SELECT auth.uid())))';
  END IF;
END $$;
