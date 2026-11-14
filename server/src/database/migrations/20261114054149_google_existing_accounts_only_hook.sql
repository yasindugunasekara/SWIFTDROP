create or replace function public.swiftdrop_google_existing_accounts_only(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if event->'user'->'app_metadata'->>'provider' = 'google' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'SWIFTDROP_REGISTRATION_REQUIRED: Create an account before signing in with Google.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.swiftdrop_google_existing_accounts_only(jsonb) from public, anon, authenticated;
grant execute on function public.swiftdrop_google_existing_accounts_only(jsonb) to supabase_auth_admin;
