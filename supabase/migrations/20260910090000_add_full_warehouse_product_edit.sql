create or replace function public.update_warehouse_product(
  _warehouse_id uuid,
  _product_id uuid,
  _payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  balance public.inventory_balances%rowtype;
  next_quantity integer;
  next_average_cost numeric;
  next_min_stock integer;
  quantity_delta integer;
begin
  if not public.is_owner() then
    raise exception 'Only owners can edit warehouse products';
  end if;

  if not exists (
    select 1 from public.branches
    where id = _warehouse_id and location_type = 'warehouse' and is_active
  ) then
    raise exception 'An active warehouse is required';
  end if;

  select * into balance
  from public.inventory_balances
  where location_id = _warehouse_id and product_id = _product_id
  for update;

  if balance.location_id is null then
    raise exception 'Warehouse product was not found';
  end if;

  if nullif(trim(_payload->>'name'), '') is null
     or nullif(trim(_payload->>'sku'), '') is null then
    raise exception 'Product name and SKU are required';
  end if;

  next_quantity := (_payload->>'quantity')::integer;
  next_average_cost := (_payload->>'average_unit_cost')::numeric;
  next_min_stock := (_payload->>'min_stock')::integer;

  if next_quantity < 0 or next_average_cost < 0 or next_min_stock < 0 then
    raise exception 'Quantity, cost and minimum stock cannot be negative';
  end if;

  update public.catalog_products
  set name = trim(_payload->>'name'),
      sku = trim(_payload->>'sku'),
      barcode = nullif(trim(_payload->>'barcode'), ''),
      category = nullif(trim(_payload->>'category'), ''),
      unit = coalesce(nullif(trim(_payload->>'unit'), ''), 'pcs'),
      selling_price = greatest(coalesce((_payload->>'selling_price')::numeric, 0), 0),
      description = nullif(trim(_payload->>'description'), ''),
      image_path = nullif(_payload->>'image_path', ''),
      updated_at = now()
  where id = _product_id and is_active;

  if not found then
    raise exception 'Active product was not found';
  end if;

  quantity_delta := next_quantity - balance.quantity;
  update public.inventory_balances
  set quantity = next_quantity,
      average_unit_cost = next_average_cost,
      min_stock = next_min_stock,
      updated_at = now()
  where location_id = _warehouse_id and product_id = _product_id;

  if quantity_delta <> 0 then
    insert into public.inventory_movements(
      location_id, product_id, movement_type, quantity_delta, unit_cost,
      reference_type, notes, created_by
    ) values (
      _warehouse_id, _product_id, 'adjustment', quantity_delta, next_average_cost,
      'warehouse_product_edit', 'Quantity changed in full product editor', auth.uid()
    );
  end if;
end $$;

revoke all on function public.update_warehouse_product(uuid, uuid, jsonb) from public;
grant execute on function public.update_warehouse_product(uuid, uuid, jsonb) to authenticated;
