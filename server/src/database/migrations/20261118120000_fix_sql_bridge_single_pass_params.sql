-- ==============================================================================
-- SwiftDrop: fix parameter substitution in swiftdrop_sql_bridge
-- ------------------------------------------------------------------------------
-- The original bridge replaced $n, $n-1, ... $1 one after another. A value bound
-- to $2 that contained the text "$1" was rewritten again by the $1 pass, inside
-- its already-quoted literal, which let a quote in $1 break out of the string
-- (SQL injection). This version scans the statement once, left to right, and
-- substitutes each $n placeholder exactly once, so inserted values are never
-- re-scanned. A placeholder with no matching parameter now raises an error.
--
-- Also fixed: whether a statement returns rows used to be decided by matching
-- "returning" against the statement AFTER substitution, so a user value such as
-- a courier note "Returning to sender" sent a plain INSERT down the row-cursor
-- path and it failed (42P11). The check now runs on the developer-written query.
--
-- Limitation (same as before): placeholders are substituted wherever they appear,
-- including inside string literals and comments in the query text. Callers must
-- never write $N inside a SQL literal or comment; bind the whole value instead.
-- ==============================================================================

create or replace function public.swiftdrop_sql_bridge(query text, params jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  n int := coalesce(jsonb_array_length(params), 0);
  rest text := query;
  stmt text := '';
  pos int;
  digits text;
  idx int;
  result_rows jsonb := '[]'::jsonb;
  rec record;
  affected bigint := 0;
  -- Decided on the original query text, never on user-supplied values.
  returns_rows boolean := query ~* '^\s*(select|with|values|table)\M' or query ~* '\mreturning\M';
begin
  loop
    pos := position('$' in rest);
    exit when pos = 0;
    digits := substring(substr(rest, pos + 1) from '^[0-9]+');
    if digits is null then
      -- A "$" not followed by digits (e.g. dollar quoting): copy it through.
      stmt := stmt || substr(rest, 1, pos);
      rest := substr(rest, pos + 1);
    else
      idx := digits::int;
      if idx < 1 or idx > n then
        raise exception 'swiftdrop_sql_bridge: no value supplied for parameter $%', idx using errcode = '22023';
      end if;
      stmt := stmt || substr(rest, 1, pos - 1) || quote_nullable(params ->> (idx - 1));
      rest := substr(rest, pos + 1 + length(digits));
    end if;
  end loop;
  stmt := stmt || rest;

  if returns_rows then
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
$fn$;

-- create or replace keeps existing grants; re-assert them anyway.
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

notify pgrst, 'reload schema';
