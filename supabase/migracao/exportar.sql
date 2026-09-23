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
-- DIFERENÇA CONHECIDA: o updated_at das pastas fica com a data da importação.
-- O trigger que valida a árvore reescreve esse campo em toda escrita, então
-- preservá-lo é impossível sem desligar o trigger. Não aparece na interface.
--
-- IDs PRESERVADOS: todo id de workspace, marca, roteiro e pasta continua o
-- mesmo. Só o SEU id de usuário muda, porque o login novo gera outro — e é
-- por isso que o script começa pedindo ele.
-- =========================================================================

with

-- Cada linha vira um comando. 'ordem' garante que o pai entre antes do filho.
comandos as (

  -- O cabeçalho sai como VÁRIAS linhas curtas, e não um bloco só.
  --
  -- Citação por cifrão seria mais legível aqui, mas o SQL Editor do
  -- Supabase não o reconhece: ele corta o script em statements no primeiro
  -- ';' que encontra, e havia ';' dentro do bloco. O resultado era o script
  -- partido no meio e um erro de sintaxe dezenas de linhas adiante, longe da
  -- causa. Aspas simples com aspas dobradas por dentro ele entende.
  select 0 as ordem, 0 as n, '-- ===================================================================' as linha
  union all select 0, 1, '-- IMPORTAÇÃO — cole tudo isto no SQL Editor do projeto NOVO.'
  union all select 0, 2, '--'
  union all select 0, 3, '-- ANTES DE RODAR:'
  union all select 0, 4, '--   1. Entre no app do projeto novo e faça login com o Google UMA vez.'
  union all select 0, 5, '--      Isso cria seu usuário. NÃO crie workspace nenhum.'
  union all select 0, 6, '--   2. Painel: Authentication -> Users -> copie o UUID da sua linha e'
  union all select 0, 7, '--      cole no lugar de COLE_AQUI_SEU_ID_DE_USUARIO, logo abaixo.'
  union all select 0, 8, '-- ==================================================================='
  union all select 0, 9, ''
  union all select 0, 10, 'select set_config(''mig.usuario'', ''COLE_AQUI_SEU_ID_DE_USUARIO'', false);'
  union all select 0, 11, ''
  union all select 0, 12, 'begin;'

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

  union all select 90, 0, ''
  union all select 90, 1, 'commit;'
  union all select 91, 0, ''
  union all select 91, 1, '-- Confira: os números abaixo têm de bater com os do projeto antigo.'
  union all select 91, 2, 'select ''marcas'' as tabela, count(*) from public.brands'
  union all select 91, 3, ' union all select ''produtos'', count(*) from public.products'
  union all select 91, 4, ' union all select ''pastas'', count(*) from public.script_folders'
  union all select 91, 5, ' union all select ''roteiros'', count(*) from public.scripts'
  union all select 91, 6, ' union all select ''cenas'', count(*) from public.script_scenes'
  union all select 91, 7, ' union all select ''planos'', count(*) from public.campaign_plans'
  union all select 91, 8, ' union all select ''nos'', count(*) from public.campaign_nodes'
  union all select 91, 9, ' order by 1;'

)

select string_agg(linha, E'\n' order by ordem, n) as script_de_importacao
from comandos;
