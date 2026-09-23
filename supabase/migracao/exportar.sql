-- =========================================================================
-- EXPORTADOR — rode no SQL Editor do projeto ANTIGO.
--
-- Devolve UMA célula de texto: o script de importação inteiro, pronto para
-- colar no SQL Editor do projeto NOVO. Nenhum terminal, nenhum pg_dump.
--
-- Por que jsonb e não INSERT com colunas escritas à mão: to_jsonb pega a
-- linha inteira do jeito que ela é, e jsonb_populate_record devolve com os
-- tipos certos do outro lado. Nada de escapar aspas na mão, nada de quebrar
-- quando uma coluna nova aparecer numa migration futura, nada de errar a
-- ordem dos campos — que é exatamente onde exportador escrito à mão falha.
--
-- O QUE ATRAVESSA: workspaces, membros, marcas, produtos, pastas, roteiros,
-- cenas, versões, variações, planos de campanha, nós, ligações e a escolha
-- de modelos de IA.
--
-- O QUE NÃO ATRAVESSA, de propósito:
--   profiles      — criado por trigger quando você loga no projeto novo
--   plan_limits   — semeado pelas próprias migrations
--   ai_generations— telemetria de uso; é o que mais pesa e não serve de nada
--                   no destino. Se quiser o histórico, exporte à parte.
--
-- IDs PRESERVADOS: todo id de workspace, marca, roteiro e pasta continua o
-- mesmo. Só o SEU id de usuário muda, porque o login novo gera outro — e é
-- por isso que o script começa pedindo ele.
-- =========================================================================

with

-- Cada linha vira um comando. 'ordem' garante que o pai entre antes do filho.
comandos as (

  select 0 as ordem, 0 as n, $cab$-- ====================================================================
-- IMPORTAÇÃO — cole tudo isto no SQL Editor do projeto NOVO.
--
-- ANTES DE RODAR, faça as duas coisas abaixo:
--   1. Entre no app do projeto novo e faça login com o Google UMA vez.
--      Isso cria seu usuário. NÃO crie workspace nenhum — ele vem daqui.
--   2. No painel: Authentication -> Users -> copie o UUID da sua linha
--      e cole no lugar de COLE_AQUI_SEU_ID_DE_USUARIO, logo abaixo.
-- ====================================================================

select set_config('mig.usuario', 'COLE_AQUI_SEU_ID_DE_USUARIO', false);

begin;$cab$ as linha

  -- ---------------------------------------------------------- workspaces
  union all select 1, row_number() over (order by created_at),
    format('insert into public.workspaces select * from jsonb_populate_record(null::public.workspaces, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.workspaces t

  -- Membros: só o dono. Convidados do projeto antigo não existem no novo —
  -- importar o vínculo deles criaria membro apontando para usuário fantasma.
  union all select 2, row_number() over (order by created_at),
    format('insert into public.workspace_members select * from jsonb_populate_record(null::public.workspace_members, %L::jsonb || jsonb_build_object(''user_id'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.workspace_members t where t.role = 'owner'

  union all select 3, row_number() over (order by created_at),
    format('insert into public.brands select * from jsonb_populate_record(null::public.brands, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.brands t

  union all select 4, row_number() over (order by created_at),
    format('insert into public.products select * from jsonb_populate_record(null::public.products, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.products t

  -- Pastas: entram SEM pai. O vínculo é refeito no fim, em UPDATE.
  -- Assim não importa em que ordem as pastas foram criadas nem quão fundo
  -- está a árvore — ordenar por profundidade quebraria no primeiro caso
  -- em que a subpasta é mais antiga que a pasta mãe.
  union all select 5, row_number() over (order by created_at),
    format('insert into public.script_folders select * from jsonb_populate_record(null::public.script_folders, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario''), ''parent_id'', null));',
           to_jsonb(t)::text)
  from public.script_folders t

  union all select 6, row_number() over (order by created_at),
    format('insert into public.scripts select * from jsonb_populate_record(null::public.scripts, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.scripts t

  union all select 7, row_number() over (order by script_id, order_index),
    format('insert into public.script_scenes select * from jsonb_populate_record(null::public.script_scenes, %L::jsonb);',
           to_jsonb(t)::text)
  from public.script_scenes t

  union all select 8, row_number() over (order by created_at),
    format('insert into public.script_versions select * from jsonb_populate_record(null::public.script_versions, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.script_versions t

  union all select 9, row_number() over (order by created_at),
    format('insert into public.script_variations select * from jsonb_populate_record(null::public.script_variations, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.script_variations t

  union all select 10, row_number() over (order by created_at),
    format('insert into public.campaign_plans select * from jsonb_populate_record(null::public.campaign_plans, %L::jsonb || jsonb_build_object(''created_by'', current_setting(''mig.usuario'')));',
           to_jsonb(t)::text)
  from public.campaign_plans t

  -- Nós de campanha: mesma história das pastas, mesmo motivo.
  union all select 11, row_number() over (order by created_at),
    format('insert into public.campaign_nodes select * from jsonb_populate_record(null::public.campaign_nodes, %L::jsonb || jsonb_build_object(''parent_id'', null));',
           to_jsonb(t)::text)
  from public.campaign_nodes t

  union all select 12, row_number() over (order by created_at),
    format('insert into public.campaign_links select * from jsonb_populate_record(null::public.campaign_links, %L::jsonb);',
           to_jsonb(t)::text)
  from public.campaign_links t

  union all select 13, row_number() over (order by created_at),
    format('insert into public.workspace_ai_models select * from jsonb_populate_record(null::public.workspace_ai_models, %L::jsonb);',
           to_jsonb(t)::text)
  from public.workspace_ai_models t

  -- ------------------------------------------- segunda passada: os pais
  union all select 20, 0, '-- religando a hierarquia de pastas e de nós'
  union all select 21, row_number() over (),
    format('update public.script_folders set parent_id = %L where id = %L;', t.parent_id, t.id)
  from public.script_folders t where t.parent_id is not null

  union all select 22, row_number() over (),
    format('update public.campaign_nodes set parent_id = %L where id = %L;', t.parent_id, t.id)
  from public.campaign_nodes t where t.parent_id is not null

  union all select 90, 0, $fim$
commit;

-- Confira: os números abaixo têm de bater com os do projeto antigo.
select 'marcas' as tabela, count(*) from public.brands
union all select 'produtos', count(*) from public.products
union all select 'pastas', count(*) from public.script_folders
union all select 'roteiros', count(*) from public.scripts
union all select 'cenas', count(*) from public.script_scenes
union all select 'planos', count(*) from public.campaign_plans
union all select 'nos', count(*) from public.campaign_nodes
order by 1;$fim$

)

select string_agg(linha, E'\n' order by ordem, n) as script_de_importacao
from comandos;
