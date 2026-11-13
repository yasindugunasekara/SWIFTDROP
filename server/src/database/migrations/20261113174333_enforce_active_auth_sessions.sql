-- Supabase verifies JWT signatures/expiry; this additional ownership check makes
-- revoked sessions unusable by the application immediately after logout.
CREATE OR REPLACE FUNCTION private.is_current_session_active()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.id = nullif((SELECT auth.jwt())->>'session_id', '')::UUID
      AND (s.not_after IS NULL OR s.not_after > now())
  );
$function$;
REVOKE ALL ON FUNCTION private.is_current_session_active() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_current_session_active() TO authenticated;

-- Only a caller-scoped boolean is exposed through PostgREST. No session records
-- or user-supplied identity parameters are exposed.
CREATE OR REPLACE FUNCTION public.is_current_session_active()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = '' AS $function$
  SELECT private.is_current_session_active();
$function$;
REVOKE ALL ON FUNCTION public.is_current_session_active() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_session_active() TO authenticated;
