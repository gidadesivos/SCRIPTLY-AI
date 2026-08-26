-- =========================================================================
-- Planejador de campanhas de tráfego pago
--
-- Um plano é uma árvore, não um mapa mental livre: o Meta Ads tem hierarquia
-- rígida de três níveis — Campanha → Conjunto → Anúncio. Deixar desenhar
-- qualquer ligação produziria estruturas que não sobem na plataforma, e aí a
-- ferramenta deixa de ser planejamento e vira desenho.
--
-- A hierarquia é imposta aqui, no banco, e não só na tela: a tela é uma das
-- formas de escrever nesta tabela, não a única.
-- =========================================================================

create type public.campaign_node_type as enum ('campanha', 'conjunto', 'anuncio');

-- =========================================================================
-- campaign_plans
--
-- Pertence a uma marca, como os roteiros: o seletor de marca ativa filtra os
-- planos, e o contexto do Brand Brain vale para os dois.
-- =========================================================================
create table public.campaign_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  objective text not null default '',
  status public.resource_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mesma proteção de brands→products: garante que plano e marca vivam no
  -- mesmo workspace, em vez de confiar no workspace_id enviado pelo cliente.
  foreign key (brand_id, workspace_id)
    references public.brands (id, workspace_id) on delete restrict,

  -- Alvo da FK composta de campaign_nodes.
  unique (id, workspace_id)
);

create index campaign_plans_workspace_brand_idx
  on public.campaign_plans (workspace_id, brand_id);
create index campaign_plans_workspace_created_idx
  on public.campaign_plans (workspace_id, created_at desc);

-- =========================================================================
-- campaign_nodes
--
-- Árvore auto-referenciada. data é jsonb porque cada tipo tem campos
-- diferentes (objetivo e CBO na campanha; público e posicionamento no
-- conjunto; criativo e copy no anúncio) e esse conjunto muda quando o Meta
-- muda. O que é estrutural — tipo, pai, ordem, vínculo com roteiro — fica em
-- coluna, onde dá para indexar e restringir.
-- =========================================================================
create table public.campaign_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid not null,

  -- Apagar uma campanha leva os conjuntos e os anúncios dela: é o que o
  -- usuário espera ao remover um ramo inteiro.
  parent_id uuid references public.campaign_nodes(id) on delete cascade,

  type public.campaign_node_type not null,
  label text not null default '',
  data jsonb not null default '{}'::jsonb,

  -- Posição no canvas. Dado de apresentação, mas do plano: cada um organiza o
  -- próprio mapa e espera reencontrá-lo como deixou.
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  order_index integer not null default 0,

  /**
   * Vínculo com o roteiro que vira o criativo do anúncio.
   *
   * FK simples, e não composta com workspace_id, de propósito: numa FK composta
   * o "set null" tenta anular TAMBÉM o workspace_id, que é NOT NULL, e o delete
   * do roteiro estouraria. Foi exatamente o que quebrou em scripts→products
   * antes de virar restrict. Aqui restrict seria pior — impediria excluir um
   * roteiro só porque ele está pendurado num plano. A integridade entre
   * workspaces fica no trigger abaixo.
   */
  script_id uuid references public.scripts(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (plan_id, workspace_id)
    references public.campaign_plans (id, workspace_id) on delete cascade,

  -- Campanha é raiz e não tem pai; conjunto e anúncio sempre têm.
  constraint campaign_nodes_root_is_campaign check (
    (type = 'campanha' and parent_id is null) or
    (type <> 'campanha' and parent_id is not null)
  ),

  -- Só anúncio carrega criativo.
  constraint campaign_nodes_script_only_on_ad check (
    script_id is null or type = 'anuncio'
  )
);

create index campaign_nodes_plan_idx on public.campaign_nodes (plan_id);
create index campaign_nodes_parent_idx on public.campaign_nodes (parent_id);
create index campaign_nodes_script_idx on public.campaign_nodes (script_id)
  where script_id is not null;

-- =========================================================================
-- Hierarquia do Meta, imposta no banco
--
-- Um CHECK não consegue olhar a linha do pai, então é trigger. Sem isto o
-- cliente penduraria um anúncio direto na campanha, ou um conjunto em outro
-- conjunto — estruturas que a tela desenha e o Meta recusa.
-- =========================================================================
create or replace function public.validate_campaign_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_type public.campaign_node_type;
  v_parent_plan uuid;
  v_script_workspace uuid;
begin
  if new.parent_id is not null then
    select type, plan_id into v_parent_type, v_parent_plan
    from public.campaign_nodes where id = new.parent_id;

    if v_parent_type is null then
      raise exception 'Nó pai não encontrado.' using errcode = '23503';
    end if;

    if v_parent_plan <> new.plan_id then
      raise exception 'O nó pai pertence a outro plano.' using errcode = '23514';
    end if;

    if new.type = 'conjunto' and v_parent_type <> 'campanha' then
      raise exception 'Um conjunto de anúncios só pode ficar dentro de uma campanha.'
        using errcode = '23514';
    end if;

    if new.type = 'anuncio' and v_parent_type <> 'conjunto' then
      raise exception 'Um anúncio só pode ficar dentro de um conjunto de anúncios.'
        using errcode = '23514';
    end if;
  end if;

  -- Integridade entre workspaces do roteiro vinculado. Ver o comentário da
  -- coluna script_id: aqui, e não numa FK composta, por causa do set null.
  if new.script_id is not null then
    select workspace_id into v_script_workspace
    from public.scripts where id = new.script_id;

    if v_script_workspace is distinct from new.workspace_id then
      raise exception 'O roteiro pertence a outro workspace.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_campaign_node() from public, anon, authenticated;

create trigger campaign_nodes_validate
  before insert or update on public.campaign_nodes
  for each row execute function public.validate_campaign_node();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.campaign_plans enable row level security;

create policy campaign_plans_select on public.campaign_plans for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy campaign_plans_insert on public.campaign_plans for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
create policy campaign_plans_update on public.campaign_plans for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
-- Apagar um plano leva a árvore inteira junto: mesmo critério dos roteiros.
create policy campaign_plans_delete on public.campaign_plans for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

alter table public.campaign_nodes enable row level security;

create policy campaign_nodes_select on public.campaign_nodes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy campaign_nodes_insert on public.campaign_nodes for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy campaign_nodes_update on public.campaign_nodes for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
-- Remover um nó é edição corriqueira, diferente de apagar o plano.
create policy campaign_nodes_delete on public.campaign_nodes for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

-- =========================================================================
-- updated_at
-- =========================================================================
create trigger campaign_plans_set_updated_at
  before update on public.campaign_plans
  for each row execute function public.set_updated_at();

create trigger campaign_nodes_set_updated_at
  before update on public.campaign_nodes
  for each row execute function public.set_updated_at();
