-- =========================================================================
-- Criação (Beta): origem do roteiro e bucket de referências.
--
-- A Criação (Beta) produz roteiro numa geração só, e o resultado precisa ser
-- INDISTINGUÍVEL de um roteiro do fluxo guiado: mesma tabela, mesmo editor,
-- mesma biblioteca. O que muda é só a procedência, e procedência é atributo
-- do roteiro — por isso coluna, e não tabela paralela.
-- =========================================================================

/*
 * default 'guided' faz os roteiros que já existem se classificarem sozinhos.
 * Sem isso seria preciso um UPDATE de backfill que, num banco grande, trava a
 * tabela inteira para escrever um valor que o default já dá de graça.
 *
 * text + check, e não enum: enum novo exige ALTER TYPE para cada valor futuro,
 * e "de onde veio este roteiro" é justamente a lista que deve crescer sem
 * cerimônia quando surgir um terceiro modo de criação.
 */
alter table public.scripts
  add column creation_mode text not null default 'guided'
    check (creation_mode in ('guided', 'quick_beta')),

  /*
   * Só o TIPO da referência, nunca a URL do arquivo. Vídeo de terceiro guardado
   * para sempre é passivo de privacidade sem contrapartida: o que interessa
   * depois é "este roteiro nasceu de um vídeo", não o vídeo.
   */
  add column reference_type text
    check (reference_type in ('video', 'transcript'));

-- Contar guided x quick_beta é a pergunta que motivou a coluna. Índice parcial
-- porque 'guided' será a maioria esmagadora e não precisa ser indexado.
create index scripts_quick_beta_idx on public.scripts (workspace_id, created_at desc)
  where creation_mode = 'quick_beta';

-- =========================================================================
-- Bucket das referências de vídeo.
--
-- Privado, como todos os outros (0004). O teto e os MIME types moram no
-- PRÓPRIO bucket: validar só no navegador protege o usuário distraído, não o
-- atacante, que fala direto com a API.
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference-uploads',
  'reference-uploads',
  false,
  52428800, -- 50 MB; ver MAX_REFERENCE_VIDEO_BYTES no cliente
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

/*
 * Mesma convenção da 0004: o primeiro segmento do path é o workspace, e é ele
 * que a policy lê. Path completo: {workspace_id}/references/{user_id}/{arquivo}
 *
 * O segundo nível é o usuário para a limpeza saber de quem é o arquivo sem
 * consultar outra tabela.
 */
create policy reference_uploads_select on storage.objects for select to authenticated
  using (
    bucket_id = 'reference-uploads'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy reference_uploads_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reference-uploads'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  );

create policy reference_uploads_update on storage.objects for update to authenticated
  using (
    bucket_id = 'reference-uploads'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  )
  with check (
    bucket_id = 'reference-uploads'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  );

/*
 * Delete é mais frouxo aqui do que nos outros buckets DE PROPÓSITO: quem subiu
 * uma referência precisa poder trocá-la, e um editor que não consegue remover
 * o próprio arquivo deixaria lixo acumulando no bucket para sempre.
 */
create policy reference_uploads_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'reference-uploads'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  );
