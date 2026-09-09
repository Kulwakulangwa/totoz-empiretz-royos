-- Repair warehouse receipt creation after the JSON product RPC was introduced.
-- The deployed JSON function omitted warehouse_receipts.created_by, while the
-- column is intentionally NOT NULL for auditability.

alter table public.warehouse_receipts
  alter column created_by set default auth.uid();

create or replace function public.receive_warehouse_stock(
  _warehouse_id uuid,
  _product_id uuid,
  _quantity integer,
  _unit_cost numeric,
  _notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  receipt_id uuid;
begin
  if actor_id is null then
    raise exception using
      errcode = '28000',
      message = 'You must be signed in to receive warehouse stock';
  end if;

  if not public.is_owner() then
    raise exception 'Only owners can receive warehouse stock';
  end if;

  if _quantity is null or _quantity <= 0 or _unit_cost is null or _unit_cost < 0 then
    raise exception 'Invalid receipt quantity or cost';
  end if;

  if not exists (
    select 1
    from public.branches
    where id = _warehouse_id
      and location_type = 'warehouse'
      and is_active
  ) then
    raise exception 'An active warehouse is required';
  end if;

  if not exists (
    select 1
    from public.catalog_products
    where id = _product_id
      and is_active
  ) then
    raise exception 'An active catalog product is required';
  end if;

  insert into public.warehouse_receipts (
    receipt_number,
    warehouse_id,
    created_by,
    notes
  ) values (
    'RCV-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(nextval('public.warehouse_receipt_number_seq')::text, 6, '0'),
    _warehouse_id,
    actor_id,
    nullif(trim(_notes), '')
  )
  returning id into receipt_id;

  insert into public.warehouse_receipt_items (
    receipt_id,
    product_id,
    quantity,
    unit_cost
  ) values (
    receipt_id,
    _product_id,
    _quantity,
    _unit_cost
  );

  insert into public.inventory_balances (
    location_id,
    product_id,
    quantity,
    average_unit_cost
  ) values (
    _warehouse_id,
    _product_id,
    _quantity,
    _unit_cost
  )
  on conflict (location_id, product_id) do update set
    average_unit_cost = (
      (inventory_balances.quantity * inventory_balances.average_unit_cost) +
      (excluded.quantity * excluded.average_unit_cost)
    ) / (inventory_balances.quantity + excluded.quantity),
    quantity = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  insert into public.inventory_movements (
    location_id,
    product_id,
    movement_type,
    quantity_delta,
    unit_cost,
    reference_type,
    reference_id,
    created_by
  ) values (
    _warehouse_id,
    _product_id,
    'receipt',
    _quantity,
    _unit_cost,
    'warehouse_receipt',
    receipt_id,
    actor_id
  );

  return receipt_id;
end
$$;

-- This is the RPC used by the current warehouse UI. Keep product creation and
-- its opening receipt in one database transaction so neither can be left half
-- completed.
-- PostgreSQL cannot change a function's return type with CREATE OR REPLACE.
-- Drop only this exact overload first; do not use CASCADE because database
-- dependencies should be reviewed rather than removed implicitly.
drop function if exists public.receive_new_warehouse_product(jsonb);

create or replace function public.receive_new_warehouse_product(
  _payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  warehouse_id uuid;
  product_id uuid;
  quantity integer;
  unit_cost numeric;
  selling_price numeric;
begin
  if actor_id is null then
    raise exception using
      errcode = '28000',
      message = 'You must be signed in to add a warehouse product';
  end if;

  if not public.is_owner() then
    raise exception 'Only owners can create warehouse products';
  end if;

  if jsonb_typeof(_payload) <> 'object' then
    raise exception 'Product details are required';
  end if;

  if coalesce(_payload->>'warehouse_id', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'A valid warehouse is required';
  end if;

  if nullif(trim(_payload->>'name'), '') is null
     or nullif(trim(_payload->>'sku'), '') is null then
    raise exception 'Product name and SKU are required';
  end if;

  if coalesce(_payload->>'quantity', '') !~ '^[1-9][0-9]*$' then
    raise exception 'Quantity must be a positive whole number';
  end if;

  if coalesce(_payload->>'unit_cost', '') !~ '^[0-9]+([.][0-9]+)?$'
     or coalesce(_payload->>'selling_price', '0') !~ '^[0-9]+([.][0-9]+)?$' then
    raise exception 'Costs and prices must be non-negative numbers';
  end if;

  warehouse_id := (_payload->>'warehouse_id')::uuid;
  quantity := (_payload->>'quantity')::integer;
  unit_cost := (_payload->>'unit_cost')::numeric;
  selling_price := coalesce((_payload->>'selling_price')::numeric, 0);

  if not exists (
    select 1
    from public.branches
    where id = warehouse_id
      and location_type = 'warehouse'
      and is_active
  ) then
    raise exception 'An active warehouse is required';
  end if;

  insert into public.catalog_products (
    name,
    sku,
    barcode,
    category,
    unit,
    selling_price,
    image_path,
    created_in_warehouse_id,
    created_by
  ) values (
    trim(_payload->>'name'),
    trim(_payload->>'sku'),
    nullif(trim(_payload->>'barcode'), ''),
    nullif(trim(_payload->>'category'), ''),
    coalesce(nullif(trim(_payload->>'unit'), ''), 'pcs'),
    selling_price,
    nullif(trim(_payload->>'image_path'), ''),
    warehouse_id,
    actor_id
  )
  returning id into product_id;

  return public.receive_warehouse_stock(
    warehouse_id,
    product_id,
    quantity,
    unit_cost,
    _payload->>'notes'
  );
end
$$;

-- Preserve callers built against the original positional function.
create or replace function public.receive_new_warehouse_product(
  _warehouse_id uuid,
  _name text,
  _sku text,
  _barcode text,
  _category text,
  _unit text,
  _selling_price numeric,
  _quantity integer,
  _unit_cost numeric,
  _notes text default null
) returns uuid
language sql
security definer
set search_path = public
as $$
  select public.receive_new_warehouse_product(
    jsonb_build_object(
      'warehouse_id', _warehouse_id,
      'name', _name,
      'sku', _sku,
      'barcode', _barcode,
      'category', _category,
      'unit', _unit,
      'selling_price', _selling_price,
      'quantity', _quantity,
      'unit_cost', _unit_cost,
      'notes', _notes
    )
  );
$$;

revoke execute on function public.receive_warehouse_stock(uuid, uuid, integer, numeric, text)
  from public, anon;
revoke execute on function public.receive_new_warehouse_product(jsonb)
  from public, anon;
revoke execute on function public.receive_new_warehouse_product(uuid, text, text, text, text, text, numeric, integer, numeric, text)
  from public, anon;

grant execute on function public.receive_warehouse_stock(uuid, uuid, integer, numeric, text)
  to authenticated;
grant execute on function public.receive_new_warehouse_product(jsonb)
  to authenticated;
grant execute on function public.receive_new_warehouse_product(uuid, text, text, text, text, text, numeric, integer, numeric, text)
  to authenticated;
