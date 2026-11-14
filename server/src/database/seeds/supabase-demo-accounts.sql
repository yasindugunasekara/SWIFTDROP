-- TEST PROJECT ONLY. Run manually as the database administrator after the
-- Supabase Auth migration; never include this seed in production migrations.
-- Imports the four explicitly approved demo identities using bcrypt cost 12.
-- Only password hashes are stored here. No public signup or RLS rule is relaxed.
-- Existing application profile IDs, roles and business references stay intact.
-- Already linked identities are checked and skipped; passwords are not reset.
DO $seed$
DECLARE
  demo RECORD;
  profile RECORD;
  identity_id UUID;
  import_email TEXT;
BEGIN
  FOR demo IN SELECT * FROM (VALUES
    ('customer@swiftdrop.com', 'CUSTOMER', '$2b$12$ipZ6H3ooGqXkWjiG2HGRruNj0HdwlQrsCKrDT9esSB2Bni3t/VtPG'),
    ('courier@swiftdrop.com', 'COURIER', '$2b$12$0WyHwyzRV0J49typqiriy.YfjSK.5JHv.XG6D2yHY09gOoIT7aWO6'),
    ('merchant@swiftdrop.com', 'MERCHANT', '$2b$12$qQcregAVs3ibeqDxjgIHgOdwpYQKmjOTNOexDooBk7UTwDyI5A6rC'),
    ('dispatcher@swiftdrop.com', 'DISPATCHER', '$2b$12$6hkyxtXEhVgTRr6iNjoj3OgCI1r3PMsyoioj1goNZ0nY5vXnKDFqq')
  ) AS approved(email, expected_role, password_hash)
  LOOP
    SELECT * INTO profile FROM public.users WHERE email=demo.email FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing demo profile: %', demo.email; END IF;
    IF profile.role::TEXT<>demo.expected_role OR NOT profile.is_active THEN
      RAISE EXCEPTION 'Unexpected demo profile role/status: %', demo.email;
    END IF;
    IF profile.auth_user_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=profile.auth_user_id AND email=demo.email) THEN
        RAISE EXCEPTION 'Inconsistent demo identity: %', demo.email;
      END IF;
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email)=demo.email) THEN
      RAISE EXCEPTION 'Unlinked Auth identity needs manual review: %', demo.email;
    END IF;

    identity_id := gen_random_uuid();
    import_email := 'seed-' || identity_id::TEXT || '@example.invalid';
    -- Keep the normal signup trigger enabled. Its temporary CUSTOMER profile is
    -- replaced within this atomic block by the explicitly approved legacy row.
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,
      email_confirmed_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,
      created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES ('00000000-0000-0000-0000-000000000000',identity_id,'authenticated','authenticated',
      import_email,demo.password_hash,now(),'{"provider":"email","providers":["email"]}'::JSONB,
      jsonb_build_object('full_name',profile.full_name),false,now(),now(),'','','','');

    DELETE FROM public.users WHERE id=identity_id AND auth_user_id=identity_id;
    UPDATE public.users SET auth_user_id=identity_id,password_hash=NULL,updated_at=now()
      WHERE id=profile.id;
    UPDATE auth.users SET email=demo.email,updated_at=now() WHERE id=identity_id;
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
      VALUES (identity_id::TEXT,identity_id,
        jsonb_build_object('sub',identity_id::TEXT,'email',demo.email,'email_verified',true,'phone_verified',false),
        'email',now(),now());
  END LOOP;
END;
$seed$;
