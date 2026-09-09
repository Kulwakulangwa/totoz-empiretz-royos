-- Run after migrations with: supabase test db
begin;

do $$
declare required_table text;
begin
  foreach required_table in array array[
    'catalog_products', 'inventory_balances', 'inventory_movements',
    'warehouse_receipts', 'warehouse_receipt_items', 'stock_orders',
    'stock_order_items', 'stock_allocations'
  ] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'Missing required table: %', required_table;
    end if;
  end loop;

  if to_regprocedure('public.create_stock_order(uuid,uuid,jsonb)') is null then
    raise exception 'Missing create_stock_order transaction';
  end if;
  if to_regprocedure('public.reverse_stock_order(uuid,text)') is null then
    raise exception 'Missing reverse_stock_order transaction';
  end if;
  if to_regprocedure('public.create_shop_sale(uuid,text,jsonb)') is null then
    raise exception 'Missing atomic shop sale transaction';
  end if;
  if to_regprocedure('public.receive_warehouse_stock(uuid,uuid,integer,numeric,text)') is null then
    raise exception 'Missing warehouse receipt transaction';
  end if;
  if to_regprocedure('public.receive_new_warehouse_product(jsonb)') is null then
    raise exception 'Missing JSON warehouse product transaction';
  end if;
  if to_regprocedure('public.set_catalog_product_image(uuid,text)') is null then
    raise exception 'Missing catalog image assignment transaction';
  end if;
  if to_regprocedure('public.audit_product_images()') is null then
    raise exception 'Missing product image audit';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'warehouse_availability'
      and column_name = 'image_path'
  ) then
    raise exception 'Warehouse availability must expose the catalog image path';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and public
      and file_size_limit = 2097152
      and allowed_mime_types = array['image/webp']
  ) then
    raise exception 'Product image bucket is not configured for public WebP delivery';
  end if;

  if public.normalize_product_image_path(
    'https://example.supabase.co/storage/v1/object/sign/product-images/warehouse/sku/photo.webp?token=test'
  ) <> 'warehouse/sku/photo.webp' then
    raise exception 'Product image path normalization is invalid';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') like '%product-images%'
        or coalesce(with_check, '') like '%product-images%'
      )
      and ('public' = any(roles) or 'anon' = any(roles))
  ) then
    raise exception 'Anonymous users must not be able to list or modify product images';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Owners can list product images',
        'Owners can upload product images',
        'Owners can update product images',
        'Owners can delete product images'
      )
      and roles = array['authenticated']::name[]
  ) <> 4 then
    raise exception 'Owner-only product image storage policies are incomplete';
  end if;

  if (
    select column_default is null
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'warehouse_receipts'
      and column_name = 'created_by'
  ) then
    raise exception 'Warehouse receipts must default created_by from the authenticated user';
  end if;

  if exists (select 1 from public.inventory_balances where quantity < 0) then
    raise exception 'Inventory contains a negative balance';
  end if;
  if exists (select 1 from public.branches where location_type = 'warehouse' and code is null) then
    raise exception 'Warehouse location is missing a code';
  end if;
end $$;

rollback;
