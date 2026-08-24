-- =========================================================================
-- Planos e limites de uso
--
-- Antes disto os limites eram duas constantes no código da Edge Function,
-- iguais para todo mundo e invisíveis para quem esbarrava neles. Agora cada
-- workspace tem um plano nomeado, e os números do plano vivem no banco.
--
-- O plano fica no workspace, não no usuário: é a entidade que paga (§3, só o
-- owner mexe em billing) e a cota é compartilhada por quem trabalha nele.
-- =========================================================================

create type public.workspace_plan as enum (
  'free',
  'starter',
  'pro',
  'agency',
  'unlimited'
);

-- =========================================================================
-- plan_limits
--
-- Tabela, e não constante no código, por dois motivos: a tela de assinatura
-- precisa mostrar os números sem duplicá-los no frontend, e mudar um limite
-- não pode exigir deploy da Edge Function.
--
-- Só entram aqui limites que são de fato aplicados. Guardar "máximo de marcas"
-- sem nada que o verifique seria número decorativo numa tela de plano — o tipo
-- de UI falsa que o N4 proíbe.
-- =========================================================================
create table public.plan_limits (
  plan public.workspace_plan primary key,
  label text not null,
  description text not null,

  -- null = sem limite. Zero seria "não pode gerar nada", que é diferente.
  generations_per_minute integer
    check (generations_per_minute is null or generations_per_minute > 0),
  generations_per_month integer
    check (generations_per_month is null or generations_per_month > 0),

  sort_order integer not null unique
);

comment on column public.plan_limits.generations_per_minute is
  'Gerações de IA por minuto, no workspace inteiro. null = ilimitado.';
comment on column public.plan_limits.generations_per_month is
  'Gerações de IA no mês corrente, no workspace inteiro. null = ilimitado.';

insert into public.plan_limits
  (plan, label, description, generations_per_minute, generations_per_month, sort_order)
values
  ('free', 'Free', 'Para testar o produto.', 5, 30, 1),
  ('starter', 'Starter', 'Para quem produz sozinho.', 10, 300, 2),
  ('pro', 'Pro', 'Para quem produz todo dia.', 20, 1500, 3),
  ('agency', 'Agency', 'Para times atendendo várias marcas.', 40, 6000, 4),
  ('unlimited', 'Ilimitado', 'Sem limite de gerações.', null, null, 5);

alter table public.plan_limits enable row level security;

-- Os planos são informação pública do produto: qualquer usuário logado lê.
-- Sem policy de escrita: só a service_role altera.
create policy plan_limits_select on public.plan_limits for select to authenticated
  using (true);

-- =========================================================================
-- workspaces.plan
-- =========================================================================
alter table public.workspaces
  add column plan public.workspace_plan not null default 'free';

-- =========================================================================
-- Trava do plano
--
-- workspaces_update (migration 0001) deixa owner e admin atualizarem a própria
-- linha. Sem esta trava, qualquer owner faria um update trocando o próprio
-- plano para 'unlimited' — a policy aprovaria, porque ela só checa o papel.
--
-- NÃO é security definer de propósito: precisamos de current_user como o papel
-- de quem está executando. Com security definer, current_user viraria o dono da
-- função e a trava nunca dispararia.
-- =========================================================================
create or replace function public.guard_workspace_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'O plano do workspace não pode ser alterado pelo cliente.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workspaces_guard_plan
  before update on public.workspaces
  for each row execute function public.guard_workspace_plan();

-- =========================================================================
-- Uso do mês
--
-- A Edge Function precisa contar gerações do mês corrente. Em função, e não
-- inline, para que a tela de assinatura e o rate limit contem exatamente a
-- mesma coisa — dois SQLs parecidos divergem com o tempo.
--
-- 'rate_limited' fica de fora: recusar uma geração não consome cota.
-- =========================================================================
create or replace function public.workspace_generations_this_month(p_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  -- SECURITY DEFINER ignora RLS: sem esta checagem, qualquer usuário logado
  -- passaria o workspace_id de outra conta e leria o consumo dela pela RPC
  -- /rest/v1/rpc/workspace_generations_this_month. O advisor de segurança
  -- apontou isto; a primeira versão da função tinha o furo.
  select case
    when not public.is_workspace_member(p_workspace_id) then null
    else (
      select count(*)::integer
      from public.ai_generations
      where workspace_id = p_workspace_id
        and status <> 'rate_limited'
        and created_at >= date_trunc('month', now())
    )
  end;
$$;

revoke all on function public.workspace_generations_this_month(uuid) from public, anon;
grant execute on function public.workspace_generations_this_month(uuid) to authenticated;

-- Index para o corte por mês: o de (workspace_id, created_at desc) da 0005 já
-- serve, mas o filtro por status entra em quase toda contagem.
create index ai_generations_workspace_month_idx
  on public.ai_generations (workspace_id, created_at desc)
  where status <> 'rate_limited';

-- FK do plano para plan_limits: garante que todo workspace aponte para um
-- plano com limites definidos, e habilita o embed do PostgREST (workspaces →
-- plan_limits) que a Edge Function usa para ler plano e limites num query só.
alter table public.workspaces
  add constraint workspaces_plan_fkey
  foreign key (plan) references public.plan_limits (plan) on delete restrict;

-- guard_workspace_plan é função de trigger: ninguém deve poder chamá-la como
-- RPC. Mesma faxina da 0007.
revoke all on function public.guard_workspace_plan() from public, anon, authenticated;
