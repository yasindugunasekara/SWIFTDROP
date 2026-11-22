-- ==============================================================================
-- SwiftDrop: service-role SQL bridge
-- ------------------------------------------------------------------------------
-- Lets the backend run its existing parameterised SQL through Supabase's HTTPS
-- API with the server-only secret key, for developers who do not have a direct
-- PostgreSQL password (DATABASE_DRIVER=supabase in server/.env).
--
-- Security:
--   * SECURITY INVOKER: statements run with the caller's own privileges
--     (service_role), so this grants nothing the secret key could not already do.
--   * EXECUTE is revoked from PUBLIC / anon / authenticated and granted only to
--     service_role. Browser clients using the publishable key cannot call it.
--   * Parameters are inlined with quote_nullable(), i.e. as escaped literals.
-- ==============================================================================

create or replace function public.swiftdrop_sql_bridge(query text, params jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  stmt text := query;
  n int := coalesce(jsonb_array_length(params), 0);
  i int;
  result_rows jsonb := '[]'::jsonb;
  rec record;
  affected bigint := 0;
begin
  -- Highest index first so that $1 never clobbers the prefix of $10, $11, ...
  for i in reverse n..1 loop
    stmt := replace(stmt, '$' || i, quote_nullable(params ->> (i - 1)));
  end loop;

  if stmt ~* '^\s*(select|with|values|table)\M' or stmt ~* '\mreturning\M' then
    for rec in execute stmt loop
      result_rows := result_rows || jsonb_build_array(to_jsonb(rec));
      affected := affected + 1;
    end loop;
  else
    execute stmt;
    get diagnostics affected = row_count;
  end if;

  return jsonb_build_object('rows', result_rows, 'rowCount', affected);
end;
$$;

revoke all on function public.swiftdrop_sql_bridge(text, jsonb) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.swiftdrop_sql_bridge(text, jsonb) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.swiftdrop_sql_bridge(text, jsonb) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.swiftdrop_sql_bridge(text, jsonb) to service_role;
  end if;
end;
$$;

-- Make PostgREST pick up the new function immediately.
notify pgrst, 'reload schema';
