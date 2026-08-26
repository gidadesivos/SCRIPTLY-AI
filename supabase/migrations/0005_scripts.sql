-- 0005_scripts.sql
-- Roteiros, cenas e telemetria de IA.

create type public.platform as enum (
  'instagram_reels', 'tiktok', 'youtube_shorts',
  'meta_ads', 'instagram_ads', 'facebook_ads', 'youtube_ads',
  'generic'
);

create type public.script_status as enum (
  'ideia', 'roteiro', 'aprovado', 'gravacao', 'edicao', 'pronto', 'publicado', 'arquivado'
);

create type public.funnel_stage as enum ('topo', 'meio', 'fundo', 'remarketing');

create type public.ai_generation_status as enum ('success', 'invalid_output', 'error', 'rate_limited');

-- Alvo para a FK composta de scripts (mesmo padrão já usado em brands).
alter table public.products
  add constraint products_id_workspace_key unique (id, workspace_id);

-- =========================================================================
-- scripts
-- =========================================================================
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null,
  product_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,

  title text not null check (char_length(trim(title)) > 0),
  description text,

  platform public.platform not null default 'instagram_reels',
  objective text,
  funnel_stage public.funnel_stage,
  duration_seconds integer not null default 30 check (duration_seconds between 3 and 600),
  language text not null default 'pt-BR',
  tone text,

  target_audience text,
  pain text,
  desire text,
  promise text,

  angle_type text,
  angle_description text,

  hook_text text,
  hook_category text,
  -- Score heurístico da IA. Nunca confundir com performance medida (§7.3).
  hook_score integer check (hook_score between 0 and 100),

  framework text,
  cta text,
  strategy_summary text,

  status public.script_status not null default 'roteiro',
  scheduled_at timestamptz,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (brand_id, workspace_id)
    references public.brands (id, workspace_id) on delete restrict,
  -- restrict, e não set null: com FK composta, "set null" tentaria anular também
  -- workspace_id, que é NOT NULL, e o delete estouraria. Produtos são arquivados,
  -- não apagados, então restrict é o comportamento correto aqui.
  foreign key (product_id, workspace_id)
    references public.products (id, workspace_id) on delete restrict
);

create index scripts_workspace_status_idx on public.scripts (workspace_id, status);
create index scripts_workspace_created_at_idx on public.scripts (workspace_id, created_at desc);
create index scripts_workspace_brand_idx on public.scripts (workspace_id, brand_id);
create index scripts_workspace_product_idx on public.scripts (workspace_id, product_id);
create index scripts_workspace_scheduled_idx on public.scripts (workspace_id, scheduled_at);
create index scripts_title_trgm_idx on public.scripts using gin (title gin_trgm_ops);

create trigger set_updated_at before update on public.scripts
  for each row execute function public.set_updated_at();

alter table public.scripts enable row level security;

create policy scripts_select on public.scripts for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy scripts_insert on public.scripts for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
create policy scripts_update on public.scripts for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy scripts_delete on public.scripts for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- =========================================================================
-- script_scenes
-- =========================================================================
create table public.script_scenes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,

  order_index integer not null,
  start_second numeric(6, 2),
  end_second numeric(6, 2),

  purpose text,
  shot text,
  visual text,
  action text,
  voiceover text,
  on_screen_text text,
  broll text,
  editing_direction text,
  transition text,
  sound_suggestion text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (script_id, order_index) deferrable initially deferred
);

create index script_scenes_script_order_idx on public.script_scenes (script_id, order_index);

create trigger set_updated_at before update on public.script_scenes
  for each row execute function public.set_updated_at();

alter table public.script_scenes enable row level security;

create policy script_scenes_select on public.script_scenes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy script_scenes_insert on public.script_scenes for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy script_scenes_update on public.script_scenes for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy script_scenes_delete on public.script_scenes for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

-- =========================================================================
-- ai_generations — telemetria. Nunca guarda secret nem prompt com dado sensível.
-- =========================================================================
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  generation_type text not null,
  prompt_version text not null,
  related_entity_type text,
  related_entity_id uuid,

  model text not null,
  status public.ai_generation_status not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  error_message text,

  created_at timestamptz not null default now()
);

-- O rate limit conta por usuário numa janela curta: índice serve exatamente isso.
create index ai_generations_user_created_idx on public.ai_generations (user_id, created_at desc);
create index ai_generations_workspace_created_idx on public.ai_generations (workspace_id, created_at desc);

alter table public.ai_generations enable row level security;

-- Leitura para o workspace; escrita só pela Edge Function (service role ignora RLS).
create policy ai_generations_select on public.ai_generations for select to authenticated
  using (public.is_workspace_member(workspace_id));
