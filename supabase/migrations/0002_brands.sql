-- 0002_brands.sql
-- Brand Brain: a base de conhecimento que alimenta toda a geração de conteúdo.

create extension if not exists pg_trgm;

create type public.resource_status as enum ('active', 'archived');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Identidade
  name text not null check (char_length(trim(name)) > 0),
  slug text not null,
  logo_url text,
  description text,
  industry text,
  website text,
  instagram text,
  country text,
  language text not null default 'pt-BR',

  -- Voz
  tone text,
  personality text,

  -- Posicionamento
  value_proposition text,
  positioning text,

  -- Público (listas simples -> text[], não jsonb)
  target_audiences text[] not null default '{}',
  pains text[] not null default '{}',
  desires text[] not null default '{}',
  objections text[] not null default '{}',

  -- Mensagem
  differentiators text[] not null default '{}',
  benefits text[] not null default '{}',
  proofs text[] not null default '{}',

  -- Vocabulário
  preferred_words text[] not null default '{}',
  forbidden_words text[] not null default '{}',
  preferred_ctas text[] not null default '{}',

  competitors text[] not null default '{}',
  ai_instructions text,

  status public.resource_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (workspace_id, slug),
  -- Alvo da FK composta de products: garante que produto e marca vivam no
  -- mesmo workspace, em vez de confiar só no workspace_id enviado pelo cliente.
  unique (id, workspace_id)
);

create index brands_workspace_status_idx on public.brands (workspace_id, status);
create index brands_workspace_created_at_idx on public.brands (workspace_id, created_at desc);
-- Busca por nome na tela de marcas (ilike) — trgm evita full scan conforme a base cresce.
create index brands_name_trgm_idx on public.brands using gin (name gin_trgm_ops);

create trigger set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

alter table public.brands enable row level security;

create policy brands_select on public.brands for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy brands_insert on public.brands for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
create policy brands_update on public.brands for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy brands_delete on public.brands for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));
