-- Absolute lifetime: refresh tokens never extend a SwiftDrop login past one hour.
CREATE OR REPLACE FUNCTION private.current_session_expires_at()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT least(s.created_at + interval '1 hour', s.not_after)
  FROM auth.sessions s WHERE s.user_id=(SELECT auth.uid())
    AND s.id=nullif((SELECT auth.jwt())->>'session_id','')::uuid;
$$;
REVOKE ALL ON FUNCTION private.current_session_expires_at() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.current_session_expires_at() TO authenticated;
CREATE OR REPLACE FUNCTION public.current_session_expires_at()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT private.current_session_expires_at();
$$;
REVOKE ALL ON FUNCTION public.current_session_expires_at() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.current_session_expires_at() TO authenticated;
CREATE OR REPLACE FUNCTION private.is_current_session_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(private.current_session_expires_at() > now(),false);
$$;
REVOKE ALL ON FUNCTION private.is_current_session_active() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.is_current_session_active() TO authenticated;
