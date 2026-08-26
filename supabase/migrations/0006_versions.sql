-- 0006_versions.sql
-- Versões (snapshot para restaurar) e variações A/B/C.

-- =========================================================================
-- script_versions
-- Snapshot completo em jsonb: restaurar precisa reconstruir roteiro + cenas
-- mesmo que o schema evolua depois.
-- =========================================================================
create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,

  version_number integer not null,
  snapshot jsonb not null,
  change_description text,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  unique (script_id, version_number)
);

create index script_versions_script_idx
  on public.script_versions (script_id, version_number desc);

alter table public.script_versions enable row level security;

create policy script_versions_select on public.script_versions for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy script_versions_insert on public.script_versions for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
-- Sem update: versão é registro histórico, não se edita.
create policy script_versions_delete on public.script_versions for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

/**
 * Numeração por roteiro sem corrida entre dois usuários salvando junto.
 * SECURITY DEFINER + lock na linha do roteiro garante sequência única.
 */
create or replace function public.create_script_version(
  p_script_id uuid,
  p_snapshot jsonb,
  p_change_description text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_next integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Trava a linha do roteiro: serializa quem estiver criando versão ao mesmo tempo.
  select workspace_id into v_workspace_id
  from public.scripts
  where id = p_script_id
  for update;

  if v_workspace_id is null then
    raise exception 'script not found';
  end if;

  if not public.has_workspace_role(v_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'forbidden';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.script_versions
  where script_id = p_script_id;

  insert into public.script_versions
    (workspace_id, script_id, version_number, snapshot, change_description, created_by)
  values
    (v_workspace_id, p_script_id, v_next, p_snapshot, p_change_description, auth.uid());

  return v_next;
end;
$$;

-- =========================================================================
-- script_variations
-- A variação é um roteiro de verdade (editável, agendável); esta tabela só
-- registra a relação com o original. Evita duplicar o schema de scripts.
-- =========================================================================
create table public.script_variations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_script_id uuid not null references public.scripts(id) on delete cascade,
  variation_script_id uuid not null references public.scripts(id) on delete cascade,

  label text not null,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  unique (parent_script_id, variation_script_id),
  unique (parent_script_id, label)
);

create index script_variations_parent_idx on public.script_variations (parent_script_id);

alter table public.script_variations enable row level security;

create policy script_variations_select on public.script_variations for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy script_variations_insert on public.script_variations for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor'])
    and created_by = auth.uid()
  );
create policy script_variations_delete on public.script_variations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'editor']));

-- =========================================================================
-- Reordenação atômica de cenas
--
-- Necessário porque updates separados (um request por cena) rodam em
-- transações distintas: ao mover a cena do índice 2 para o 0, o índice 0 ainda
-- está ocupado e a unique estoura. Só dentro de UMA transação a constraint
-- DEFERRABLE realmente adia a checagem para o commit.
-- =========================================================================
create or replace function public.reorder_script_scenes(
  p_script_id uuid,
  p_scene_ids uuid[]
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select workspace_id into v_workspace_id
  from public.scripts
  where id = p_script_id;

  if v_workspace_id is null then
    raise exception 'script not found';
  end if;

  if not public.has_workspace_role(v_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'forbidden';
  end if;

  set constraints all deferred;

  update public.script_scenes s
  set order_index = new_order.idx - 1
  from (
    select unnest(p_scene_ids) as id, generate_subscripts(p_scene_ids, 1) as idx
  ) as new_order
  where s.id = new_order.id
    and s.script_id = p_script_id;
end;
$$;

-- =========================================================================
-- Restauração atômica de versão
--
-- Apagar as cenas e reinserir em requests separados deixaria o roteiro sem
-- cenas se o insert falhasse no meio. Aqui é tudo ou nada.
-- =========================================================================
create or replace function public.restore_script_version(
  p_script_id uuid,
  p_version_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_snapshot jsonb;
  v_scene jsonb;
  v_index integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select workspace_id into v_workspace_id
  from public.scripts
  where id = p_script_id;

  if v_workspace_id is null then
    raise exception 'script not found';
  end if;

  if not public.has_workspace_role(v_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'forbidden';
  end if;

  select snapshot into v_snapshot
  from public.script_versions
  where id = p_version_id and script_id = p_script_id;

  if v_snapshot is null then
    raise exception 'version not found';
  end if;

  update public.scripts s set
    title             = coalesce(v_snapshot -> 'script' ->> 'title', s.title),
    description       = v_snapshot -> 'script' ->> 'description',
    hook_text         = v_snapshot -> 'script' ->> 'hook_text',
    hook_category     = v_snapshot -> 'script' ->> 'hook_category',
    hook_score        = nullif(v_snapshot -> 'script' ->> 'hook_score', '')::integer,
    cta               = v_snapshot -> 'script' ->> 'cta',
    framework         = v_snapshot -> 'script' ->> 'framework',
    strategy_summary  = v_snapshot -> 'script' ->> 'strategy_summary',
    tone              = v_snapshot -> 'script' ->> 'tone',
    objective         = v_snapshot -> 'script' ->> 'objective',
    target_audience   = v_snapshot -> 'script' ->> 'target_audience',
    pain              = v_snapshot -> 'script' ->> 'pain',
    desire            = v_snapshot -> 'script' ->> 'desire',
    promise           = v_snapshot -> 'script' ->> 'promise',
    duration_seconds  = coalesce(
                          nullif(v_snapshot -> 'script' ->> 'duration_seconds', '')::integer,
                          s.duration_seconds
                        )
  where s.id = p_script_id;

  delete from public.script_scenes where script_id = p_script_id;

  for v_scene in select * from jsonb_array_elements(v_snapshot -> 'scenes')
  loop
    insert into public.script_scenes (
      workspace_id, script_id, order_index, purpose, shot, visual, action,
      voiceover, on_screen_text, broll, editing_direction, transition, sound_suggestion
    ) values (
      v_workspace_id, p_script_id, v_index,
      v_scene ->> 'purpose', v_scene ->> 'shot', v_scene ->> 'visual', v_scene ->> 'action',
      v_scene ->> 'voiceover', v_scene ->> 'on_screen_text', v_scene ->> 'broll',
      v_scene ->> 'editing_direction', v_scene ->> 'transition', v_scene ->> 'sound_suggestion'
    );
    v_index := v_index + 1;
  end loop;
end;
$$;
