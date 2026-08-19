-- 0001_init.sql
-- Fundação: profiles, workspaces, workspace_members, funções de RLS, triggers.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.theme_preference as enum ('light', 'dark', 'system');

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  theme public.theme_preference not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Sem policy de insert/delete: profiles é criado apenas pelo trigger handle_new_user.

-- =========================================================================
-- workspaces
-- =========================================================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- workspace_members
-- =========================================================================
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);

-- =========================================================================
-- Funções SECURITY DEFINER (evitam recursão infinita de policy em workspace_members)
-- =========================================================================
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(p_roles::public.member_role[])
  );
$$;

-- =========================================================================
-- RLS: workspaces
-- =========================================================================
alter table public.workspaces enable row level security;

create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (created_by = auth.uid());
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, array['owner']));

-- =========================================================================
-- RLS: workspace_members
-- =========================================================================
alter table public.workspace_members enable row level security;

create policy workspace_members_select on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy workspace_members_insert on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));
create policy workspace_members_update on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));
create policy workspace_members_delete on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- =========================================================================
-- Triggers: updated_at
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Trigger: cria profile ao criar usuário no auth.users
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- RPC transacional: cria workspace + membership de owner em uma única chamada
-- =========================================================================
create or replace function public.create_workspace_with_owner(p_name text, p_slug text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(p_name), p_slug, auth.uid())
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, auth.uid(), 'owner');

  return v_workspace_id;
end;
$$;
