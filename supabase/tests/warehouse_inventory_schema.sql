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

  if exists (select 1 from public.inventory_balances where quantity < 0) then
    raise exception 'Inventory contains a negative balance';
  end if;
  if exists (select 1 from public.branches where location_type = 'warehouse' and code is null) then
    raise exception 'Warehouse location is missing a code';
  end if;
end $$;

rollback;
