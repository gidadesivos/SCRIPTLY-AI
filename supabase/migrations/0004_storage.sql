-- 0004_storage.sql
-- Buckets privados. Acesso sempre por signed URL, nunca por URL pública.
--
-- Convenções de path (a policy depende delas):
--   avatars:      {user_id}/{arquivo}
--   brand-assets: {workspace_id}/brands/{brand_id}/{arquivo}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2097152,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('brand-assets', 'brand-assets', false, 5242880,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- =========================================================================
-- avatars: cada usuário só enxerga e escreve na própria pasta
-- =========================================================================
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================================
-- brand-assets: isolado por workspace, reusando a função da Fase 1
-- =========================================================================
create policy brand_assets_select on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy brand_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  );

create policy brand_assets_update on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  )
  with check (
    bucket_id = 'brand-assets'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'editor']
    )
  );

create policy brand_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin']
    )
  );
