-- One public, immutable image URL per shared catalog product. Object listing
-- and every storage mutation remain owner-only.
-- Deploy this migration before the frontend that uses getPublicUrl().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.normalize_product_image_path(_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text := nullif(btrim(_value), '');
begin
  if normalized is null then return null; end if;
  normalized := split_part(normalized, '?', 1);
  normalized := split_part(normalized, '#', 1);
  normalized := regexp_replace(
    normalized,
    '^https?://[^/]+/storage/v1/object/(public|sign)/product-images/',
    '',
    'i'
  );
  normalized := regexp_replace(normalized, '^https?://[^/]+/', '', 'i');
  normalized := regexp_replace(normalized, '^/+', '');
  normalized := regexp_replace(normalized, '^product-images/', '', 'i');
  if normalized = '' or normalized like '%..%' or position(chr(92) in normalized) > 0 then
    return null;
  end if;
  return normalized;
end
$$;

update public.catalog_products
set image_path = public.normalize_product_image_path(image_path)
where image_path is distinct from public.normalize_product_image_path(image_path);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.catalog_products'::regclass
      and conname = 'catalog_products_image_path_is_object_key'
  ) then
    alter table public.catalog_products
      add constraint catalog_products_image_path_is_object_key check (
        image_path is null
        or (
          image_path !~* '^https?://'
          and image_path !~ '^/'
          and image_path !~ '\.\.'
          and position(chr(92) in image_path) = 0
        )
      );
  end if;
end
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    update public.products
    set image_path = public.normalize_product_image_path(image_path)
    where image_path is distinct from public.normalize_product_image_path(image_path);
  end if;
end
$$;

drop policy if exists "Authenticated users can read product images" on storage.objects;
drop policy if exists "Privileged users can upload product images" on storage.objects;
drop policy if exists "Privileged users can update product images" on storage.objects;
drop policy if exists "Privileged users can delete product images" on storage.objects;
drop policy if exists "Branch managers can upload product images" on storage.objects;
drop policy if exists "Branch managers can update product images" on storage.objects;
drop policy if exists "Branch managers can delete product images" on storage.objects;
drop policy if exists "Owners can upload product images" on storage.objects;
drop policy if exists "Owners can update product images" on storage.objects;
drop policy if exists "Owners can delete product images" on storage.objects;
drop policy if exists "Owners can list product images" on storage.objects;

create policy "Owners can list product images"
on storage.objects for select to authenticated
using (bucket_id = 'product-images' and public.is_owner());

create policy "Owners can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_owner());

create policy "Owners can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_owner())
with check (bucket_id = 'product-images' and public.is_owner());

create policy "Owners can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_owner());

create or replace function public.set_catalog_product_image(
  _product_id uuid,
  _image_path text
) returns text
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  normalized_path text := public.normalize_product_image_path(_image_path);
  previous_path text;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if not public.is_owner() then raise exception 'Only owners can manage catalog images'; end if;

  select image_path into previous_path
  from public.catalog_products
  where id = _product_id
  for update;
  if not found then raise exception 'Catalog product was not found'; end if;

  if normalized_path is not null and not exists (
    select 1 from storage.objects
    where bucket_id = 'product-images' and name = normalized_path
  ) then
    raise exception 'The uploaded product image was not found';
  end if;

  if normalized_path is not null and exists (
    select 1 from public.catalog_products
    where id <> _product_id and image_path = normalized_path
  ) then
    raise exception 'This image is already assigned to another catalog product';
  end if;

  update public.catalog_products
  set image_path = normalized_path, updated_at = now()
  where id = _product_id;
  return previous_path;
end
$$;

create or replace function public.audit_product_images()
returns table (
  product_id uuid,
  sku text,
  product_name text,
  image_path text,
  status text
)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if not public.is_owner() then raise exception 'Only owners can audit catalog images'; end if;

  return query
  with image_references as (
    select cp.id, cp.sku, cp.name, cp.image_path,
      count(*) over (partition by cp.image_path) reference_count
    from public.catalog_products cp
  ), product_rows as (
    select r.id product_id, r.sku, r.name product_name, r.image_path,
      case
        when r.image_path is null then 'no_image'
        when o.id is null then 'missing_object'
        when r.reference_count > 1 then 'duplicate_reference'
        else 'valid'
      end status
    from image_references r
    left join storage.objects o
      on o.bucket_id = 'product-images' and o.name = r.image_path
  ), orphan_rows as (
    select null::uuid product_id, null::text sku, null::text product_name,
      o.name image_path, 'orphaned_object'::text status
    from storage.objects o
    where o.bucket_id = 'product-images'
      and not exists (
        select 1 from public.catalog_products cp where cp.image_path = o.name
      )
      and not exists (
        select 1 from public.products p where p.image_path = o.name
      )
  )
  select audit_rows.*
  from (
    select * from product_rows
    union all
    select * from orphan_rows
  ) audit_rows
  order by audit_rows.status, audit_rows.product_name nulls last, audit_rows.image_path;
end
$$;

revoke execute on function public.normalize_product_image_path(text) from public, anon, authenticated;
revoke execute on function public.set_catalog_product_image(uuid, text) from public, anon;
revoke execute on function public.audit_product_images() from public, anon;
grant execute on function public.set_catalog_product_image(uuid, text) to authenticated;
grant execute on function public.audit_product_images() to authenticated;
