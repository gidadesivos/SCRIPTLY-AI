-- =========================================================================
-- Pastas para organizar os roteiros, como um explorador de arquivos.
--
-- A biblioteca cresce e vira uma lista só; pasta é o que deixa cada um
-- organizar do seu jeito. Escopo de WORKSPACE, e não de marca: quem quer
-- separar por marca já tem o filtro de marca, e amarrar a pasta a uma marca
-- impediria a pasta "Black Friday" com roteiros de duas marcas dentro.
-- =========================================================================

create table public.script_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  /*
   * Apagar a pasta apaga as subpastas, mas NUNCA os roteiros — quem está
   * dentro volta para a raiz pelo "on delete set null" do scripts.folder_id.
   * Deletar uma pasta é organização; perder roteiro seria destruição.
   */
  parent_id uuid references public.script_folders(id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A árvore é sempre lida por workspace + pai: é este o índice que serve.
create index script_folders_workspace_parent_idx
  on public.script_folders (workspace_id, parent_id, position);

/*
 * Duas travas que o banco precisa impor, porque a tela sozinha não basta:
 * uma pasta não pode ser ancestral de si mesma (a árvore viraria um laço, e
 * quem for percorrer para desenhar entra em recursão infinita), e a subpasta
 * tem de ser do mesmo workspace do pai.
 */
create or replace function public.validate_script_folder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_workspace uuid;
  v_cursor uuid;
  v_saltos integer := 0;
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Uma pasta não pode estar dentro dela mesma.' using errcode = '23514';
    end if;

    select workspace_id into v_parent_workspace
    from public.script_folders where id = new.parent_id;

    if v_parent_workspace is null then
      raise exception 'Pasta pai não encontrada.' using errcode = '23503';
    end if;

    if v_parent_workspace <> new.workspace_id then
      raise exception 'A pasta pai é de outro workspace.' using errcode = '23514';
    end if;

    -- Sobe a cadeia de pais: se reencontrar esta pasta, o movimento fecharia
    -- um ciclo. O limite de saltos é rede de segurança para o caso de já
    -- existir um laço no banco — sem ele, o próprio validador travaria.
    v_cursor := new.parent_id;
    while v_cursor is not null and v_saltos < 64 loop
      if v_cursor = new.id then
        raise exception 'Isso deixaria a pasta dentro de uma subpasta dela mesma.'
          using errcode = '23514';
      end if;
      select parent_id into v_cursor from public.script_folders where id = v_cursor;
      v_saltos := v_saltos + 1;
    end loop;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_script_folder() from public, anon, authenticated;

create trigger script_folders_validate
  before insert or update on public.script_folders
  for each row execute function public.validate_script_folder();

-- =========================================================================
-- Vínculo do roteiro com a pasta.
-- =========================================================================

/*
 * FK simples, e não composta com workspace_id, DE PROPÓSITO: numa FK composta
 * o "set null" tenta anular TAMBÉM o workspace_id, que é NOT NULL, e apagar a
 * pasta estouraria. É a mesma armadilha documentada na migration 0010. A
 * integridade entre workspaces fica no trigger abaixo.
 */
alter table public.scripts
  add column folder_id uuid references public.script_folders(id) on delete set null;

-- Listar "o que tem nesta pasta" é a consulta central da tela.
create index scripts_workspace_folder_idx on public.scripts (workspace_id, folder_id);

create or replace function public.validate_script_folder_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folder_workspace uuid;
begin
  if new.folder_id is not null then
    select workspace_id into v_folder_workspace
    from public.script_folders where id = new.folder_id;

    if v_folder_workspace is null then
      raise exception 'Pasta não encontrada.' using errcode = '23503';
    end if;

    if v_folder_workspace <> new.workspace_id then
      raise exception 'A pasta pertence a outro workspace.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_script_folder_link() from public, anon, authenticated;

create trigger scripts_validate_folder
  before insert or update of folder_id, workspace_id on public.scripts
  for each row execute function public.validate_script_folder_link();

-- =========================================================================
-- RLS: mesmo critério dos roteiros. Organizar é edição corriqueira; apagar
-- pasta é irreversível e fica com owner/admin, como o excluir do roteiro.
-- =========================================================================
alter table public.script_folders enable row level security;

create policy script_folders_select on public.script_folders for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy script_folders_insert on public.script_folders for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

create policy script_folders_update on public.script_folders for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

create policy script_folders_delete on public.script_folders for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));
