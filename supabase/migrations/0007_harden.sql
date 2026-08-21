-- 0007_harden.sql
-- Endurecimento apontado pelo linter de segurança do Supabase, depois da
-- primeira execução real das migrations 0001-0006.

-- =========================================================================
-- 1. set_updated_at sem search_path fixo
--
-- Uma função de trigger com search_path mutável pode ser induzida a resolver
-- um nome para um objeto plantado em outro schema. Fixar fecha isso.
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 2. Funções de gatilho não são API
--
-- handle_new_user e set_updated_at existem para rodar em triggers. Estarem
-- executáveis por anon/authenticated as expunha como endpoint RPC sem motivo.
-- =========================================================================
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- =========================================================================
-- 3. Helpers de RLS: anon não precisa deles
--
-- authenticated PRECISA manter EXECUTE: as policies chamam estas funções e são
-- avaliadas com os privilégios de quem consulta. Revogar de authenticated
-- quebraria toda a RLS. Só anon sai.
-- =========================================================================
revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

-- =========================================================================
-- 4. RPCs de escrita: só para quem está logado
--
-- Todas já barram auth.uid() null, então anon falharia de qualquer forma.
-- Revogar é defesa em profundidade: tira o endpoint da superfície pública em
-- vez de depender só da checagem interna.
--
-- As quatro continuam visíveis para `authenticated` de propósito: é assim que
-- o app as chama, e cada uma confere o papel do usuário internamente.
-- =========================================================================
revoke all on function public.create_workspace_with_owner(text, text) from public, anon;
grant execute on function public.create_workspace_with_owner(text, text) to authenticated;

revoke all on function public.create_script_version(uuid, jsonb, text) from public, anon;
grant execute on function public.create_script_version(uuid, jsonb, text) to authenticated;

revoke all on function public.reorder_script_scenes(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_script_scenes(uuid, uuid[]) to authenticated;

revoke all on function public.restore_script_version(uuid, uuid) from public, anon;
grant execute on function public.restore_script_version(uuid, uuid) to authenticated;
