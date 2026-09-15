create or replace function public.create_shop_sale(
  _shop_id uuid,
  _payment_method text,
  _lines jsonb,
  _discount numeric
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  sale_id uuid;
  line record;
  balance public.inventory_balances%rowtype;
  sale_total numeric(14,2) := 0;
  sale_discount numeric(14,2) := round(greatest(coalesce(_discount, 0), 0), 2);
begin
  if not public.can_access_branch(_shop_id::text) then raise exception 'Not authorized for this shop'; end if;
  if lower(_payment_method) not in ('cash', 'lipa_namba') then raise exception 'Unsupported payment method'; end if;
  if not exists (select 1 from public.branches where id = _shop_id and location_type = 'shop' and is_active) then
    raise exception 'Sales can only be recorded at an active shop';
  end if;
  if jsonb_typeof(_lines) <> 'array' or jsonb_array_length(_lines) = 0 then raise exception 'Sale lines are required'; end if;
  if exists (select 1 from jsonb_array_elements(_lines) l where coalesce(l->>'quantity','') !~ '^[1-9][0-9]*$') then
    raise exception 'Sale quantities must be positive whole numbers';
  end if;
  if exists (select 1 from jsonb_array_elements(_lines) l
    where coalesce(l->>'productId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$'
       or coalesce(l->>'unitPrice','') !~ '^[0-9]+([.][0-9]{1,2})?$') then
    raise exception 'Every sale line requires a valid product and non-negative price';
  end if;

  for line in
    select cp.id product_id, cp.sku, cp.barcode, cp.name,
      sum((l->>'quantity')::integer)::integer quantity,
      max((l->>'unitPrice')::numeric) unit_price
    from jsonb_array_elements(_lines) l
    join public.catalog_products cp on cp.id = (l->>'productId')::uuid
    group by cp.id, cp.sku, cp.barcode, cp.name order by cp.id
  loop
    select * into balance from public.inventory_balances
      where location_id = _shop_id and product_id = line.product_id for update;
    if balance.location_id is null or balance.quantity < line.quantity then
      raise exception 'Insufficient shop stock for %', line.name;
    end if;
    sale_total := sale_total + line.quantity * line.unit_price;
  end loop;

  if sale_discount > sale_total then
    raise exception 'Discount cannot be greater than sale subtotal';
  end if;

  insert into public.sales(receipt_number, branch_id, cashier_id, subtotal, tax, discount, total, payment_method, payment_status)
  values ('REC-' || nextval('public.shop_sale_number_seq')::text,
    _shop_id, (select id from public.staff where user_id = auth.uid() limit 1), sale_total, 0, sale_discount, sale_total - sale_discount,
    lower(_payment_method), 'completed') returning id into sale_id;

  for line in
    select cp.id product_id, cp.sku, cp.barcode, cp.name,
      sum((l->>'quantity')::integer)::integer quantity,
      max((l->>'unitPrice')::numeric) unit_price
    from jsonb_array_elements(_lines) l
    join public.catalog_products cp on cp.id = (l->>'productId')::uuid
    group by cp.id, cp.sku, cp.barcode, cp.name order by cp.id
  loop
    select * into balance from public.inventory_balances
      where location_id = _shop_id and product_id = line.product_id for update;
    insert into public.sale_items(sale_id, catalog_product_id, product_name, sku, barcode, quantity, unit_price, unit_cost, total_price)
    values (sale_id, line.product_id, line.name, line.sku, line.barcode, line.quantity,
      line.unit_price, balance.average_unit_cost, line.quantity * line.unit_price);
    update public.inventory_balances set quantity = quantity - line.quantity, updated_at = now()
      where location_id = _shop_id and product_id = line.product_id;
    insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, created_by)
    values (_shop_id, line.product_id, 'sale', -line.quantity, balance.average_unit_cost, 'sale', sale_id, auth.uid());
  end loop;
  return sale_id;
end $$;

create or replace function public.create_shop_sale(
  _shop_id uuid,
  _payment_method text,
  _lines jsonb
) returns uuid
language sql security definer set search_path = public
as $$
  select public.create_shop_sale(_shop_id, _payment_method, _lines, 0);
$$;

grant execute on function public.create_shop_sale(uuid, text, jsonb) to authenticated;
grant execute on function public.create_shop_sale(uuid, text, jsonb, numeric) to authenticated;
