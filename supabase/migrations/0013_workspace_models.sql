-- =========================================================================
-- Modelos escolhidos por workspace
--
-- A lista do OpenRouter era uma variável de ambiente: mudar exigia deploy, e
-- valia igual para todo mundo. Num app multi-workspace isso não fecha — uma
-- agência pode querer modelo caro para roteiro e barato para extrair briefing,
-- e um cliente pode não querer certos fornecedores.
--
-- Quando o workspace não escolhe nada, a Edge Function continua usando a lista
-- padrão da variável. A escolha é opcional, não obrigatória.
-- =========================================================================

create table public.workspace_ai_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Hoje só 'openrouter'. A coluna existe porque a cadeia é de provedores, e
  -- um dia a escolha pode incluir outro.
  provider text not null default 'openrouter',

  /**
   * O id do modelo no provedor, ex: 'anthropic/claude-haiku-4.5'.
   *
   * Texto livre de propósito: o catálogo do OpenRouter muda toda semana, e um
   * enum aqui viraria migration a cada modelo novo. A validação de que o
   * modelo existe é do próprio provedor, na hora da chamada.
   */
  model_id text not null check (char_length(trim(model_id)) > 0),

  /** Nome legível, guardado no momento da escolha para a tela não depender do catálogo. */
  label text not null default '',

  /** Ordem na cadeia. Menor tenta primeiro. */
  position integer not null default 0,
  enabled boolean not null default true,

  created_at timestamptz not null default now(),

  unique (workspace_id, provider, model_id)
);

create index workspace_ai_models_workspace_idx
  on public.workspace_ai_models (workspace_id, position);

-- =========================================================================
-- RLS
--
-- Ler: qualquer membro, porque a tela de configurações mostra a cadeia.
-- Escrever: só owner e admin. Trocar o modelo muda custo e qualidade de tudo
-- que o workspace gera — é decisão de quem responde pela conta, não de quem
-- escreve roteiro.
-- =========================================================================
alter table public.workspace_ai_models enable row level security;

create policy workspace_ai_models_select on public.workspace_ai_models
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy workspace_ai_models_insert on public.workspace_ai_models
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy workspace_ai_models_update on public.workspace_ai_models
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy workspace_ai_models_delete on public.workspace_ai_models
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- =========================================================================
-- Consumo por dia, para o gráfico
--
-- A tabela de totais responde "quanto gastei"; ela não responde "estou
-- acelerando?". Um mês inteiro num número só esconde o dia em que o uso
-- triplicou — que é justamente o que antecede estourar a cota.
-- =========================================================================
create or replace function public.daily_ai_usage(p_workspace_id uuid, p_days integer default 30)
returns table (dia date, provider text, total bigint, falhas bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (g.created_at at time zone 'UTC')::date as dia,
    g.provider,
    count(*)::bigint,
    count(*) filter (where g.status <> 'success')::bigint
  from public.ai_generations g
  where g.workspace_id = p_workspace_id
    and public.is_workspace_member(p_workspace_id)
    and g.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by 1, 2
  order by 1;
$$;

revoke all on function public.daily_ai_usage(uuid, integer) from public, anon;
grant execute on function public.daily_ai_usage(uuid, integer) to authenticated;
