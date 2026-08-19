-- 0003_products.sql
-- Produtos: o que a marca vende. Alimenta oferta, benefícios e objeções na geração.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null,

  name text not null check (char_length(trim(name)) > 0),
  slug text not null,
  category text,
  description text,

  benefits text[] not null default '{}',
  differentiators text[] not null default '{}',
  problems_solved text[] not null default '{}',
  desires text[] not null default '{}',
  objections text[] not null default '{}',

  target_audience text,

  -- faq e links têm estrutura realmente variável -> jsonb se justifica aqui.
  faq jsonb not null default '[]',
  links jsonb not null default '[]',

  offer text,
  price_range text,
  guarantee text,
  default_cta text,
  notes text,

  status public.resource_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (workspace_id, slug),

  -- FK composta: o banco recusa produto apontando para marca de outro
  -- workspace, mesmo que o cliente forge o brand_id no request.
  -- restrict: não deixa apagar uma marca por baixo dos produtos dela.
  foreign key (brand_id, workspace_id)
    references public.brands (id, workspace_id) on delete restrict
);

create index products_workspace_status_idx on public.products (workspace_id, status);
create index products_workspace_created_at_idx on public.products (workspace_id, created_at desc);
create index products_workspace_brand_idx on public.products (workspace_id, brand_id);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy products_select on public.products for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy products_insert on public.products for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
create policy products_update on public.products for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy products_delete on public.products for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));
