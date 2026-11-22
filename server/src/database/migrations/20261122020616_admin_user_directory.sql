-- Deliberately bounded admin directory. Never returns credential fields.
CREATE OR REPLACE FUNCTION private.admin_user_directory(page_number integer DEFAULT 1, role_filter text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT private.is_current_session_active() OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id=(SELECT auth.uid()) AND is_active AND role='ADMIN'
  ) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF page_number IS NULL OR page_number NOT BETWEEN 1 AND 10000 OR
    (role_filter IS NOT NULL AND role_filter NOT IN ('CUSTOMER','COURIER','MERCHANT','DISPATCHER','ADMIN'))
    THEN RAISE EXCEPTION 'Invalid directory filter' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_object(
    'users', coalesce((SELECT jsonb_agg(row_to_json(u)) FROM (
      SELECT id,full_name,email,phone,role,is_active,created_at FROM public.users
      WHERE role_filter IS NULL OR role::text=role_filter
      ORDER BY created_at DESC,id LIMIT 50 OFFSET (page_number-1)*50
    ) u),'[]'::jsonb),
    'total',(SELECT count(*) FROM public.users WHERE role_filter IS NULL OR role::text=role_filter),
    'page',page_number,
    'summary',jsonb_build_object(
      'accounts',(SELECT count(*) FROM public.users),
      'couriers',(SELECT count(*) FROM public.users WHERE role='COURIER'),
      'businesses',(SELECT count(*) FROM public.users WHERE role='MERCHANT'),
      'pending',(SELECT count(*) FROM public.account_applications WHERE status='PENDING')
    )
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION private.admin_user_directory(integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.admin_user_directory(integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_user_directory(page_number integer DEFAULT 1, role_filter text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT private.admin_user_directory(page_number,role_filter);
$$;
REVOKE ALL ON FUNCTION public.admin_user_directory(integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_directory(integer,text) TO authenticated;
