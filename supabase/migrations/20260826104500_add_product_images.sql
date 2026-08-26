alter table public.products
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  null,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read product images" on storage.objects;
create policy "Authenticated users can read product images"
on storage.objects
for select
to authenticated
using (bucket_id = 'product-images');

drop policy if exists "Owners can upload product images" on storage.objects;
create policy "Owners can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.has_role(auth.uid(), 'owner'::public.app_role)
);

drop policy if exists "Owners can update product images" on storage.objects;
create policy "Owners can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.has_role(auth.uid(), 'owner'::public.app_role)
)
with check (
  bucket_id = 'product-images'
  and public.has_role(auth.uid(), 'owner'::public.app_role)
);

drop policy if exists "Owners can delete product images" on storage.objects;
create policy "Owners can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.has_role(auth.uid(), 'owner'::public.app_role)
);
