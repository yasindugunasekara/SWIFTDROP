-- Snapshot application details once at account creation. Editable Auth metadata
-- is never an authorization source; only a staff review can grant a role.
CREATE TABLE IF NOT EXISTS public.account_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('COURIER','MERCHANT')),
  details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  review_note TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_applications_status_created_idx ON public.account_applications(status,created_at);
ALTER TABLE public.account_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_applications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.account_applications TO authenticated;
DROP POLICY IF EXISTS account_applications_read ON public.account_applications;
CREATE POLICY account_applications_read ON public.account_applications FOR SELECT TO authenticated
  USING ((SELECT private.is_current_session_active()) AND (
    auth_user_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.users u
      WHERE u.auth_user_id=(SELECT auth.uid()) AND u.is_active AND u.role IN ('DISPATCHER','ADMIN'))
  ));

CREATE OR REPLACE FUNCTION private.capture_account_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE application JSONB := NEW.raw_user_meta_data->'registration_application';
BEGIN
  IF application->>'requestedRole' IN ('COURIER','MERCHANT') THEN
    -- Only whitelisted data fields are captured. Do not accept status/reviewer.
    IF length(btrim(coalesce(application->>'phone',''))) < 7
      OR length(btrim(coalesce(application->>'address',''))) < 3
      OR length(coalesce(application->>'phone','')) > 30
      OR length(coalesce(application->>'address','')) > 300 THEN
      RAISE EXCEPTION 'Invalid application contact details' USING ERRCODE='23514';
    END IF;
    IF application->>'requestedRole'='MERCHANT' AND (
      length(btrim(coalesce(application->>'companyName',''))) NOT BETWEEN 2 AND 255
      OR length(btrim(coalesce(application->>'registrationNumber',''))) NOT BETWEEN 2 AND 100) THEN
      RAISE EXCEPTION 'Invalid business details' USING ERRCODE='23514';
    END IF;
    IF application->>'requestedRole'='COURIER' AND (
      coalesce(application->>'vehicleType','') NOT IN ('Motorcycle','Car','Van','Bicycle')
      OR (application->>'vehicleType'<>'Bicycle' AND length(btrim(coalesce(application->>'vehicleNumber',''))) NOT BETWEEN 1 AND 30)) THEN
      RAISE EXCEPTION 'Invalid vehicle details' USING ERRCODE='23514';
    END IF;
    INSERT INTO public.account_applications(auth_user_id,full_name,email,requested_role,details)
      VALUES (NEW.id,left(coalesce(NEW.raw_user_meta_data->>'full_name','Applicant'),150),NEW.email,
        application->>'requestedRole',jsonb_strip_nulls(jsonb_build_object(
          'phone',application->>'phone','address',application->>'address',
          'companyName',application->>'companyName','registrationNumber',application->>'registrationNumber',
          'vehicleType',application->>'vehicleType','vehicleNumber',application->>'vehicleNumber')))
      ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.capture_account_application() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE TRIGGER zz_capture_account_application AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.capture_account_application();

-- Recover applications submitted before this migration without trusting their
-- claimed status or granting privileges. Every recovered application is pending.
INSERT INTO public.account_applications(auth_user_id,full_name,email,requested_role,details)
SELECT a.id,u.full_name,u.email,a.raw_user_meta_data->'registration_application'->>'requestedRole',
  jsonb_strip_nulls(jsonb_build_object(
    'phone',a.raw_user_meta_data->'registration_application'->>'phone',
    'address',a.raw_user_meta_data->'registration_application'->>'address',
    'companyName',a.raw_user_meta_data->'registration_application'->>'companyName',
    'registrationNumber',a.raw_user_meta_data->'registration_application'->>'registrationNumber',
    'vehicleType',a.raw_user_meta_data->'registration_application'->>'vehicleType',
    'vehicleNumber',a.raw_user_meta_data->'registration_application'->>'vehicleNumber'))
FROM auth.users a JOIN public.users u ON u.auth_user_id=a.id
WHERE u.role='CUSTOMER' AND a.raw_user_meta_data->'registration_application'->>'requestedRole' IN ('COURIER','MERCHANT')
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.review_account_application(application_id UUID,decision TEXT,review_note TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor UUID; application public.account_applications; profile public.users;
BEGIN
  SELECT id INTO actor FROM public.users WHERE auth_user_id=(SELECT auth.uid())
    AND is_active AND role IN ('DISPATCHER','ADMIN');
  IF actor IS NULL OR NOT private.is_current_session_active() THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
  END IF;
  IF decision NOT IN ('APPROVED','REJECTED') OR decision IS NULL
    OR length(btrim(coalesce(review_note,''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Invalid review' USING ERRCODE='23514';
  END IF;
  SELECT * INTO application FROM public.account_applications WHERE id=application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
  IF application.status<>'PENDING' THEN RAISE EXCEPTION 'Already reviewed' USING ERRCODE='23514'; END IF;
  SELECT * INTO profile FROM public.users WHERE auth_user_id=application.auth_user_id FOR UPDATE;
  IF NOT FOUND OR NOT profile.is_active OR profile.role<>'CUSTOMER' OR profile.id=actor THEN
    RAISE EXCEPTION 'Account is not eligible' USING ERRCODE='23514';
  END IF;
  IF decision='APPROVED' THEN
    IF application.requested_role='MERCHANT' THEN
      IF length(btrim(coalesce(application.details->>'companyName',''))) NOT BETWEEN 2 AND 255
        OR length(btrim(coalesce(application.details->>'registrationNumber',''))) NOT BETWEEN 2 AND 100
        OR EXISTS (SELECT 1 FROM public.merchants WHERE user_id=profile.id) THEN
        RAISE EXCEPTION 'Business details require review' USING ERRCODE='23514';
      END IF;
      INSERT INTO public.merchants(id,user_id,company_name,registration_number,approval_status)
        VALUES (gen_random_uuid(),profile.id,application.details->>'companyName',application.details->>'registrationNumber','APPROVED');
    END IF;
    UPDATE public.users SET role=application.requested_role::public.user_role,
      phone=application.details->>'phone',updated_at=now() WHERE id=profile.id;
  END IF;
  UPDATE public.account_applications SET status=decision,review_note=btrim(review_account_application.review_note),
    reviewed_by=actor,reviewed_at=now() WHERE id=application.id;
  RETURN jsonb_build_object('id',application.id,'status',decision);
END;
$$;
REVOKE ALL ON FUNCTION private.review_account_application(UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.review_account_application(UUID,TEXT,TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_account_application(application_id UUID,decision TEXT,review_note TEXT)
RETURNS JSONB LANGUAGE SQL SECURITY INVOKER SET search_path='' AS $$
  SELECT private.review_account_application(application_id,decision,review_note);
$$;
REVOKE ALL ON FUNCTION public.review_account_application(UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_account_application(UUID,TEXT,TEXT) TO authenticated;
