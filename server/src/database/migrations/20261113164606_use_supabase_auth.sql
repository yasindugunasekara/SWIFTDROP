-- Supabase Auth owns credentials; public.users remains the app's stable profile/role table.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key ON public.users(auth_user_id);
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_swiftdrop_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE profile_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.users SET email=lower(btrim(NEW.email)), updated_at=now()
      WHERE auth_user_id=NEW.id;
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL THEN RAISE EXCEPTION 'An email address is required'; END IF;
  -- Never claim a legacy account or its privileged role merely because an email matches.
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(btrim(email))=lower(btrim(NEW.email))) THEN
    RAISE EXCEPTION 'Existing profile requires administrator-assisted account migration';
  END IF;
  profile_name := left(btrim(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'SwiftDrop Customer')), 150);
  IF length(profile_name)<2 OR profile_name ~ '[[:cntrl:]]' THEN profile_name := 'SwiftDrop Customer'; END IF;
  INSERT INTO public.users(id,auth_user_id,email,full_name,role,password_hash,is_active)
    VALUES (NEW.id,NEW.id,lower(btrim(NEW.email)),profile_name,'CUSTOMER',NULL,true);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.sync_swiftdrop_auth_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER swiftdrop_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_swiftdrop_auth_user();
CREATE OR REPLACE TRIGGER swiftdrop_auth_email_updated AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION private.sync_swiftdrop_auth_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;
REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated;
GRANT SELECT (id,auth_user_id,email,full_name,phone,role,is_active) ON public.users TO authenticated;
GRANT UPDATE (full_name,phone,updated_at) ON public.users TO authenticated;
DROP POLICY IF EXISTS swiftdrop_own_profile_read ON public.users;
CREATE POLICY swiftdrop_own_profile_read ON public.users FOR SELECT TO authenticated
  USING (auth_user_id=(SELECT auth.uid()) AND is_active=true);
DROP POLICY IF EXISTS swiftdrop_own_profile_update ON public.users;
CREATE POLICY swiftdrop_own_profile_update ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id=(SELECT auth.uid()) AND is_active=true)
  WITH CHECK (auth_user_id=(SELECT auth.uid()) AND is_active=true);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
GRANT SELECT (id,user_id,approval_status) ON public.merchants TO authenticated;
DROP POLICY IF EXISTS swiftdrop_own_merchant_read ON public.merchants;
CREATE POLICY swiftdrop_own_merchant_read ON public.merchants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id=merchants.user_id
    AND u.auth_user_id=(SELECT auth.uid()) AND u.role='MERCHANT' AND u.is_active=true));
