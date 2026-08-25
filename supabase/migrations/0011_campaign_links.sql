-- =========================================================================
-- Ligações livres entre nós do plano
--
-- A árvore (parent_id) continua sendo a estrutura que vira campanha no Meta:
-- rígida, de três níveis, validada por trigger. Ela não pode virar grafo livre
-- sem produzir planos impublicáveis.
--
-- Esta tabela é outra coisa: anotação. Serve para registrar relações que
-- existem na cabeça de quem planeja e não têm lugar na hierarquia — "este
-- conjunto testa contra aquele", "este anúncio reaproveita o criativo daquele",
-- "esta campanha entra depois que aquela validar". Qualquer direção, qualquer
-- par, inclusive entre níveis diferentes.
-- =========================================================================

create table public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid not null,
  source_id uuid not null references public.campaign_nodes(id) on delete cascade,
  target_id uuid not null references public.campaign_nodes(id) on delete cascade,
  label text not null default '',
  created_at timestamptz not null default now(),

  foreign key (plan_id, workspace_id)
    references public.campaign_plans (id, workspace_id) on delete cascade,

  -- Um nó ligado a si mesmo é sempre engano de arrasto.
  constraint campaign_links_no_self check (source_id <> target_id),

  -- A mesma ligação duas vezes desenha duas setas sobrepostas. A ordem importa:
  -- A→B e B→A são anotações diferentes e as duas são permitidas.
  unique (source_id, target_id)
);

create index campaign_links_plan_idx on public.campaign_links (plan_id);
create index campaign_links_source_idx on public.campaign_links (source_id);
create index campaign_links_target_idx on public.campaign_links (target_id);

-- =========================================================================
-- Os dois nós têm que ser do mesmo plano
--
-- Sem isto, um id de outro plano ligaria quadros diferentes: a aresta apontaria
-- para um nó que a tela nem carregou, e ficaria invisível para sempre.
-- =========================================================================
create or replace function public.validate_campaign_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_plan uuid;
  v_target_plan uuid;
begin
  select plan_id into v_source_plan from public.campaign_nodes where id = new.source_id;
  select plan_id into v_target_plan from public.campaign_nodes where id = new.target_id;

  if v_source_plan is null or v_target_plan is null then
    raise exception 'Nó não encontrado.' using errcode = '23503';
  end if;

  if v_source_plan <> new.plan_id or v_target_plan <> new.plan_id then
    raise exception 'Os dois nós precisam ser do mesmo plano.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_campaign_link() from public, anon, authenticated;

create trigger campaign_links_validate
  before insert or update on public.campaign_links
  for each row execute function public.validate_campaign_link();

-- =========================================================================
-- RLS: mesmo critério dos nós — anotar é edição corriqueira.
-- =========================================================================
alter table public.campaign_links enable row level security;

create policy campaign_links_select on public.campaign_links for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy campaign_links_insert on public.campaign_links for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy campaign_links_update on public.campaign_links for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));
create policy campaign_links_delete on public.campaign_links for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

-- =========================================================================
-- Mídia do anúncio
--
-- Coluna, e não campo no jsonb de data: a previsualização precisa saber se o
-- link é vídeo ou imagem antes de renderizar, e um dia isso vai querer índice.
-- =========================================================================
alter table public.campaign_nodes
  add column media_url text not null default '',
  add column media_kind text not null default '';

comment on column public.campaign_nodes.media_url is
  'Link do criativo pronto (Google Drive ou URL direta). Vazio = ainda não tem.';
comment on column public.campaign_nodes.media_kind is
  'video | image | "" quando não dá para deduzir pelo link.';
