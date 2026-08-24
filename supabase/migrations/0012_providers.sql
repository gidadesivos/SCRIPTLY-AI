-- =========================================================================
-- Telemetria por provedor de IA
--
-- Até aqui ai_generations gravava só o modelo. Com mais de um provedor na
-- cadeia, "gemini-3.6-flash" e "google/gemini-2.0-flash-exp" (o mesmo modelo
-- via OpenRouter) apareceriam como coisas diferentes e ninguém saberia qual
-- porta foi usada — nem quanto custou por porta.
-- =========================================================================

alter table public.ai_generations
  add column provider text not null default 'gemini';

comment on column public.ai_generations.provider is
  'Quem de fato atendeu: gemini | openrouter. Não é o modelo — é a porta.';

-- =========================================================================
-- Cota do provedor esgotada é diferente de erro
--
-- Sem um status próprio, o "You exceeded your current quota" do Gemini caía em
-- 'error', misturado com modelo descontinuado e JSON inválido. Foi por isso que
-- o erro de modelo depreciado passou um dia escondido.
--
-- 'rate_limited' NÃO serve: aquele é o limite do PLANO do workspace, decidido
-- por nós. Este é o limite do fornecedor, e é o que dispara o fallback.
-- =========================================================================
alter type public.ai_generation_status add value if not exists 'quota_exceeded';

create index ai_generations_provider_created_idx
  on public.ai_generations (workspace_id, provider, created_at desc);

-- =========================================================================
-- Consumo por provedor, para o painel
--
-- Em função porque a tela e qualquer alerta futuro precisam contar a mesma
-- coisa. Janela em dias para não carregar a tabela inteira.
-- =========================================================================
create or replace function public.provider_usage(p_workspace_id uuid, p_days integer default 30)
returns table (
  provider text,
  total bigint,
  sucessos bigint,
  quota bigint,
  erros bigint,
  input_tokens bigint,
  output_tokens bigint,
  media_ms integer
)
language sql
stable
security definer
set search_path = public
as $$
  -- SECURITY DEFINER ignora RLS: sem esta checagem qualquer usuário logado
  -- leria o consumo de outra conta pela RPC.
  select
    g.provider,
    count(*)::bigint,
    count(*) filter (where g.status = 'success')::bigint,
    -- ::text de propósito: um valor de enum recém-adicionado não pode ser
    -- comparado como enum na MESMA transação em que foi criado, e é assim que
    -- as migrations são aplicadas. Comparar como texto contorna sem truque.
    count(*) filter (where g.status::text = 'quota_exceeded')::bigint,
    count(*) filter (where g.status in ('error', 'invalid_output'))::bigint,
    coalesce(sum(g.input_tokens), 0)::bigint,
    coalesce(sum(g.output_tokens), 0)::bigint,
    coalesce(round(avg(g.latency_ms)), 0)::integer
  from public.ai_generations g
  where g.workspace_id = p_workspace_id
    and public.is_workspace_member(p_workspace_id)
    and g.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by g.provider
  order by count(*) desc;
$$;

revoke all on function public.provider_usage(uuid, integer) from public, anon;
grant execute on function public.provider_usage(uuid, integer) to authenticated;
