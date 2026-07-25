-- Migration aditiva para criar usuário TikTok e restringir dados (Story 1.4)
create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'usertiktok@gmail.com';
  v_password text := 'TikTok2026!@#';
begin
  if not exists (select 1 from auth.users where email = v_email) then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id::text, v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb, 'email', now(), now(), now()
    );
  end if;
end $$;

-- 1. Alterar todas as RPCs do dashboard para SECURITY INVOKER
-- Isso fará com que as queries respeitem as políticas de RLS da tabela funnel_events
do $$
declare
  rec record;
begin
  for rec in
    select p.oid::regprocedure as func_sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'rpc_%'
  loop
    execute 'alter function ' || rec.func_sig || ' security invoker';
  end loop;
end $$;

-- 2. Habilitar RLS na tabela principal
alter table public.funnel_events enable row level security;

-- 3. Criar a política restritiva para o userTikTok
drop policy if exists "tiktok_only_access" on public.funnel_events;
create policy "tiktok_only_access"
  on public.funnel_events
  for select
  to authenticated
  using (
    (select email from auth.users where id = auth.uid()) = 'usertiktok@gmail.com'
    and funnel_variant = 'tik-tok'
  );

-- 4. Criar a política que permite acesso livre aos demais usuários autenticados
drop policy if exists "all_access_except_tiktok" on public.funnel_events;
create policy "all_access_except_tiktok"
  on public.funnel_events
  for select
  to authenticated
  using (
    (select email from auth.users where id = auth.uid()) is distinct from 'usertiktok@gmail.com'
  );

-- 5. Permissão básica para inserts/updates via service_role ou scripts autorizados
drop policy if exists "service_role_access" on public.funnel_events;
create policy "service_role_access"
  on public.funnel_events
  for all
  using (true)
  with check (true);
