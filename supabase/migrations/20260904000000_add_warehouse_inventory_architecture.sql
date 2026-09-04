-- Dynamic shops, warehouses, shared products, and atomic stock transfers.

create extension if not exists pgcrypto;

do $$ begin
  create type public.location_type as enum ('shop', 'warehouse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_order_status as enum ('completed', 'reversed');
exception when duplicate_object then null; end $$;

alter table public.branches
  add column if not exists location_type public.location_type not null default 'shop',
  add column if not exists code text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.branches
set code = upper(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 4)
where code is null;

alter table public.branches alter column code set not null;
alter table public.branches alter column created_by set default auth.uid();
create unique index if not exists branches_code_unique on public.branches (lower(code));

-- Stop before catalog backfill when a SKU has incompatible shared metadata.
do $$
declare conflict_skus text;
begin
  if to_regclass('public.products') is null then return; end if;
  select string_agg(sku_key, ', ' order by sku_key)
  into conflict_skus
  from (
    select lower(trim(sku)) sku_key
    from public.products
    where nullif(trim(sku), '') is not null
    group by lower(trim(sku))
    having count(distinct jsonb_build_array(
      lower(trim(name)), lower(coalesce(trim(barcode), '')),
      lower(coalesce(trim(category), '')), lower(coalesce(trim(unit), 'pcs')),
      selling_price
    )) > 1
    limit 20
  ) conflicts;
  if conflict_skus is not null then
    raise exception 'Shared catalog migration blocked. Resolve conflicting SKUs: %', conflict_skus;
  end if;
end $$;

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  barcode text,
  name text not null,
  category text,
  unit text not null default 'pcs',
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  description text,
  image_path text,
  is_active boolean not null default true,
  created_in_warehouse_id uuid references public.branches(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists catalog_products_sku_unique on public.catalog_products (lower(sku));
alter table public.catalog_products alter column created_by set default auth.uid();
create unique index if not exists catalog_products_barcode_unique
  on public.catalog_products (lower(barcode)) where barcode is not null and barcode <> '';

create table if not exists public.inventory_balances (
  location_id uuid not null references public.branches(id),
  product_id uuid not null references public.catalog_products(id),
  quantity integer not null default 0 check (quantity >= 0),
  average_unit_cost numeric(14,4) not null default 0 check (average_unit_cost >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  updated_at timestamptz not null default now(),
  primary key (location_id, product_id)
);

create table if not exists public.warehouse_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  warehouse_id uuid not null references public.branches(id),
  created_by uuid not null references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.warehouse_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.warehouse_receipts(id),
  product_id uuid not null references public.catalog_products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0)
);

create table if not exists public.stock_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  destination_shop_id uuid not null references public.branches(id),
  idempotency_key uuid not null unique,
  status public.stock_order_status not null default 'completed',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  reversed_by uuid references auth.users(id),
  reversed_at timestamptz,
  reversal_reason text
);

create table if not exists public.stock_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.stock_orders(id),
  product_id uuid not null references public.catalog_products(id),
  total_quantity integer not null check (total_quantity > 0),
  unique (order_id, product_id)
);

create table if not exists public.stock_allocations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.stock_order_items(id),
  warehouse_id uuid not null references public.branches(id),
  quantity integer not null check (quantity > 0),
  unit_cost_snapshot numeric(14,4) not null check (unit_cost_snapshot >= 0),
  unique (order_item_id, warehouse_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.branches(id),
  product_id uuid not null references public.catalog_products(id),
  movement_type text not null check (movement_type in
    ('opening_balance','receipt','transfer_out','transfer_in','sale','return','adjustment','reversal_out','reversal_in')),
  quantity_delta integer not null check (quantity_delta <> 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_location_product_idx
  on public.inventory_movements(location_id, product_id, created_at desc);

alter table public.sale_items
  add column if not exists catalog_product_id uuid references public.catalog_products(id),
  add column if not exists unit_cost numeric(14,4) not null default 0;

-- Backfill the shared catalog and opening balances without deleting legacy rows.
insert into public.catalog_products
  (sku, barcode, name, category, unit, selling_price, description, image_path, is_active, created_at, updated_at)
select distinct on (lower(trim(p.sku)))
  trim(p.sku), nullif(trim(p.barcode), ''), p.name, p.category,
  coalesce(nullif(trim(p.unit), ''), 'pcs'), p.selling_price, p.description,
  p.image_path, p.is_active, p.created_at, p.updated_at
from public.products p
where nullif(trim(p.sku), '') is not null
order by lower(trim(p.sku)), p.created_at
on conflict do nothing;

insert into public.inventory_balances (location_id, product_id, quantity, average_unit_cost, min_stock)
select p.branch_id, cp.id, sum(greatest(p.quantity, 0))::integer,
  case when sum(greatest(p.quantity, 0)) = 0 then max(p.buying_price)
       else sum(greatest(p.quantity, 0) * p.buying_price) / sum(greatest(p.quantity, 0)) end,
  max(greatest(p.min_stock, 0))::integer
from public.products p
join public.catalog_products cp on lower(cp.sku) = lower(trim(p.sku))
group by p.branch_id, cp.id
on conflict (location_id, product_id) do nothing;

insert into public.inventory_movements
  (location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type)
select ib.location_id, ib.product_id, 'opening_balance', ib.quantity, ib.average_unit_cost, 'legacy_migration'
from public.inventory_balances ib
where ib.quantity > 0
  and not exists (
    select 1 from public.inventory_movements im
    where im.location_id = ib.location_id and im.product_id = ib.product_id
      and im.movement_type = 'opening_balance' and im.reference_type = 'legacy_migration'
  );

update public.sale_items si
set catalog_product_id = cp.id
from public.catalog_products cp
where si.catalog_product_id is null and lower(cp.sku) = lower(trim(si.sku));

create or replace function public.enforce_staff_shop_assignment()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.branches where id = new.branch_id and location_type = 'shop' and is_active) then
    raise exception 'Staff can only be assigned to an active shop';
  end if;
  return new;
end $$;
drop trigger if exists enforce_staff_shop_assignment on public.staff;
create trigger enforce_staff_shop_assignment before insert or update of branch_id on public.staff
for each row execute function public.enforce_staff_shop_assignment();

create or replace function public.protect_active_shop_staff()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.is_active and not new.is_active and old.location_type = 'shop'
     and exists (select 1 from public.staff where branch_id = old.id and is_active) then
    raise exception 'Reassign or deactivate active staff before archiving this shop';
  end if;
  return new;
end $$;
drop trigger if exists protect_active_shop_staff on public.branches;
create trigger protect_active_shop_staff before update of is_active on public.branches
for each row execute function public.protect_active_shop_staff();

create sequence if not exists public.stock_order_number_seq;
create sequence if not exists public.warehouse_receipt_number_seq;
create sequence if not exists public.shop_sale_number_seq;

do $$ declare max_receipt bigint;
begin
  select coalesce(max((regexp_match(receipt_number, '([0-9]+)$'))[1]::bigint), 0) into max_receipt from public.sales;
  perform setval('public.shop_sale_number_seq', greatest(max_receipt, 1), max_receipt > 0);
end $$;

create or replace function public.create_shop_sale(
  _shop_id uuid, _payment_method text, _lines jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare sale_id uuid; line record; balance public.inventory_balances%rowtype; sale_total numeric(14,2) := 0;
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
    where coalesce(l->>'productId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
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

  insert into public.sales(receipt_number, branch_id, cashier_id, subtotal, tax, discount, total, payment_method, payment_status)
  values ('REC-' || nextval('public.shop_sale_number_seq')::text,
    _shop_id, (select id from public.staff where user_id = auth.uid() limit 1), sale_total, 0, 0, sale_total,
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

create or replace function public.restock_shop_inventory(_shop_id uuid, _product_id uuid, _quantity integer, _reference_id uuid default null)
returns void language plpgsql security definer set search_path = public
as $$
declare balance public.inventory_balances%rowtype;
begin
  if not public.can_access_branch(_shop_id::text) or _quantity <= 0 then raise exception 'Invalid restock request'; end if;
  select * into balance from public.inventory_balances where location_id = _shop_id and product_id = _product_id for update;
  if balance.location_id is null then raise exception 'Product is not stocked at this shop'; end if;
  update public.inventory_balances set quantity = quantity + _quantity, updated_at = now()
    where location_id = _shop_id and product_id = _product_id;
  insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, created_by)
  values (_shop_id, _product_id, 'return', _quantity, balance.average_unit_cost, 'sale_return', _reference_id, auth.uid());
end $$;

create or replace function public.create_stock_order(
  _destination_shop_id uuid,
  _idempotency_key uuid,
  _allocations jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  order_id uuid;
  item_id uuid;
  allocation record;
  product_total record;
  source_balance public.inventory_balances%rowtype;
begin
  if public.current_staff_role() not in ('owner', 'manager')
     or not public.can_manage_branch(_destination_shop_id::text) then
    raise exception 'Not authorized to stock this shop';
  end if;
  if not exists (select 1 from public.branches where id = _destination_shop_id and location_type = 'shop' and is_active) then
    raise exception 'Destination must be an active shop';
  end if;
  if jsonb_typeof(_allocations) <> 'array' or jsonb_array_length(_allocations) = 0 then
    raise exception 'At least one allocation is required';
  end if;
  if exists (select 1 from jsonb_array_elements(_allocations) a
    where coalesce(a->>'quantity','') !~ '^[1-9][0-9]*$') then
    raise exception 'Quantities must be positive whole numbers';
  end if;

  select id into order_id from public.stock_orders where idempotency_key = _idempotency_key;
  if order_id is not null then return order_id; end if;

  -- Every flow locks balances in the same location/product order to avoid deadlocks.
  perform 1
  from public.inventory_balances ib
  join (
    select (a->>'warehouseId')::uuid location_id, (a->>'productId')::uuid product_id
    from jsonb_array_elements(_allocations) a
    union
    select _destination_shop_id, (a->>'productId')::uuid
    from jsonb_array_elements(_allocations) a
  ) targets on targets.location_id = ib.location_id and targets.product_id = ib.product_id
  order by ib.location_id, ib.product_id
  for update of ib;

  begin
    insert into public.stock_orders(order_number, destination_shop_id, idempotency_key, created_by)
    values ('STK-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.stock_order_number_seq')::text, 6, '0'),
            _destination_shop_id, _idempotency_key, auth.uid())
    returning id into order_id;
  exception when unique_violation then
    select id into order_id from public.stock_orders where idempotency_key = _idempotency_key;
    if order_id is not null then return order_id; end if;
    raise;
  end;

  for allocation in
    select (a->>'productId')::uuid product_id, (a->>'warehouseId')::uuid warehouse_id,
           sum((a->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(_allocations) a
    group by 1, 2 order by 2, 1
  loop
    if not exists (select 1 from public.branches where id = allocation.warehouse_id and location_type = 'warehouse' and is_active) then
      raise exception 'Every source must be an active warehouse';
    end if;
    if not exists (select 1 from public.catalog_products where id = allocation.product_id and is_active) then
      raise exception 'Every ordered product must be active';
    end if;
    select * into source_balance from public.inventory_balances
      where location_id = allocation.warehouse_id and product_id = allocation.product_id for update;
    if source_balance.location_id is null or source_balance.quantity < allocation.quantity then
      raise exception 'Insufficient warehouse stock for product %', allocation.product_id;
    end if;
  end loop;

  for product_total in
    select (a->>'productId')::uuid product_id, sum((a->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(_allocations) a group by 1 order by 1
  loop
    insert into public.stock_order_items(order_id, product_id, total_quantity)
    values (order_id, product_total.product_id, product_total.quantity)
    returning id into item_id;

    for allocation in
      select (a->>'warehouseId')::uuid warehouse_id,
             sum((a->>'quantity')::integer)::integer quantity
      from jsonb_array_elements(_allocations) a
      where (a->>'productId')::uuid = product_total.product_id
      group by 1 order by 1
    loop
      select * into source_balance from public.inventory_balances
        where location_id = allocation.warehouse_id and product_id = product_total.product_id for update;

      update public.inventory_balances set quantity = quantity - allocation.quantity, updated_at = now()
      where location_id = allocation.warehouse_id and product_id = product_total.product_id;

      insert into public.inventory_balances(location_id, product_id, quantity, average_unit_cost)
      values (_destination_shop_id, product_total.product_id, allocation.quantity, source_balance.average_unit_cost)
      on conflict (location_id, product_id) do update set
        average_unit_cost = case when inventory_balances.quantity + excluded.quantity = 0 then 0 else
          ((inventory_balances.quantity * inventory_balances.average_unit_cost) +
           (excluded.quantity * excluded.average_unit_cost)) /
          (inventory_balances.quantity + excluded.quantity) end,
        quantity = inventory_balances.quantity + excluded.quantity,
        updated_at = now();

      insert into public.stock_allocations(order_item_id, warehouse_id, quantity, unit_cost_snapshot)
      values (item_id, allocation.warehouse_id, allocation.quantity, source_balance.average_unit_cost);
      insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, created_by)
      values
        (allocation.warehouse_id, product_total.product_id, 'transfer_out', -allocation.quantity, source_balance.average_unit_cost, 'stock_order', order_id, auth.uid()),
        (_destination_shop_id, product_total.product_id, 'transfer_in', allocation.quantity, source_balance.average_unit_cost, 'stock_order', order_id, auth.uid());
    end loop;
  end loop;
  return order_id;
end $$;

create or replace function public.reverse_stock_order(_order_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare o public.stock_orders%rowtype; r record; shop_balance public.inventory_balances%rowtype;
begin
  select * into o from public.stock_orders where id = _order_id for update;
  if o.id is null or o.status <> 'completed' then raise exception 'Order is not reversible'; end if;
  if public.current_staff_role() not in ('owner','manager') or not public.can_manage_branch(o.destination_shop_id::text) then
    raise exception 'Not authorized to reverse this order';
  end if;
  if nullif(trim(_reason), '') is null then raise exception 'A reversal reason is required'; end if;

  perform 1
  from public.inventory_balances ib
  join (
    select o.destination_shop_id location_id, soi.product_id
    from public.stock_order_items soi where soi.order_id = o.id
    union
    select sa.warehouse_id, soi.product_id
    from public.stock_order_items soi join public.stock_allocations sa on sa.order_item_id = soi.id
    where soi.order_id = o.id
  ) targets on targets.location_id = ib.location_id and targets.product_id = ib.product_id
  order by ib.location_id, ib.product_id
  for update of ib;

  for r in select soi.product_id, soi.total_quantity from public.stock_order_items soi where soi.order_id = o.id order by soi.product_id
  loop
    select * into shop_balance from public.inventory_balances
      where location_id = o.destination_shop_id and product_id = r.product_id for update;
    if shop_balance.location_id is null or shop_balance.quantity < r.total_quantity then
      raise exception 'Shop no longer has enough stock to reverse product %', r.product_id;
    end if;
  end loop;

  for r in
    select soi.product_id, sa.warehouse_id, sa.quantity
    from public.stock_order_items soi join public.stock_allocations sa on sa.order_item_id = soi.id
    where soi.order_id = o.id order by sa.warehouse_id, soi.product_id
  loop
    select * into shop_balance from public.inventory_balances
      where location_id = o.destination_shop_id and product_id = r.product_id for update;
    update public.inventory_balances set quantity = quantity - r.quantity, updated_at = now()
      where location_id = o.destination_shop_id and product_id = r.product_id;
    insert into public.inventory_balances(location_id, product_id, quantity, average_unit_cost)
      values (r.warehouse_id, r.product_id, r.quantity, shop_balance.average_unit_cost)
      on conflict (location_id, product_id) do update set
        average_unit_cost = ((inventory_balances.quantity * inventory_balances.average_unit_cost) +
          (excluded.quantity * excluded.average_unit_cost)) / (inventory_balances.quantity + excluded.quantity),
        quantity = inventory_balances.quantity + excluded.quantity, updated_at = now();
    insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, created_by)
    values
      (o.destination_shop_id, r.product_id, 'reversal_out', -r.quantity, shop_balance.average_unit_cost, 'stock_order_reversal', o.id, auth.uid()),
      (r.warehouse_id, r.product_id, 'reversal_in', r.quantity, shop_balance.average_unit_cost, 'stock_order_reversal', o.id, auth.uid());
  end loop;
  update public.stock_orders set status = 'reversed', reversed_by = auth.uid(), reversed_at = now(), reversal_reason = trim(_reason)
  where id = o.id;
end $$;

create or replace function public.receive_warehouse_stock(
  _warehouse_id uuid, _product_id uuid, _quantity integer, _unit_cost numeric, _notes text default null
) returns uuid language plpgsql security definer set search_path = public
as $$
declare receipt_id uuid;
begin
  if not public.is_owner() then raise exception 'Only owners can receive warehouse stock'; end if;
  if _quantity <= 0 or _unit_cost < 0 then raise exception 'Invalid receipt quantity or cost'; end if;
  if not exists (select 1 from public.branches where id = _warehouse_id and location_type = 'warehouse' and is_active) then
    raise exception 'An active warehouse is required';
  end if;
  if not exists (select 1 from public.catalog_products where id = _product_id and is_active) then
    raise exception 'An active catalog product is required';
  end if;
  insert into public.warehouse_receipts(receipt_number, warehouse_id, created_by, notes)
  values ('RCV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.warehouse_receipt_number_seq')::text, 6, '0'),
          _warehouse_id, auth.uid(), nullif(trim(_notes), '')) returning id into receipt_id;
  insert into public.warehouse_receipt_items(receipt_id, product_id, quantity, unit_cost)
  values (receipt_id, _product_id, _quantity, _unit_cost);
  insert into public.inventory_balances(location_id, product_id, quantity, average_unit_cost)
  values (_warehouse_id, _product_id, _quantity, _unit_cost)
  on conflict (location_id, product_id) do update set
    average_unit_cost = ((inventory_balances.quantity * inventory_balances.average_unit_cost) +
      (excluded.quantity * excluded.average_unit_cost)) / (inventory_balances.quantity + excluded.quantity),
    quantity = inventory_balances.quantity + excluded.quantity, updated_at = now();
  insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, created_by)
  values (_warehouse_id, _product_id, 'receipt', _quantity, _unit_cost, 'warehouse_receipt', receipt_id, auth.uid());
  return receipt_id;
end $$;

create or replace function public.receive_new_warehouse_product(
  _warehouse_id uuid, _name text, _sku text, _barcode text, _category text, _unit text,
  _selling_price numeric, _quantity integer, _unit_cost numeric, _notes text default null
) returns uuid language plpgsql security definer set search_path = public
as $$
declare product_id uuid;
begin
  if not public.is_owner() then raise exception 'Only owners can create warehouse products'; end if;
  if nullif(trim(_name), '') is null or nullif(trim(_sku), '') is null then raise exception 'Product name and SKU are required'; end if;
  insert into public.catalog_products(name, sku, barcode, category, unit, selling_price, created_in_warehouse_id, created_by)
  values (trim(_name), trim(_sku), nullif(trim(_barcode), ''), nullif(trim(_category), ''), coalesce(nullif(trim(_unit), ''), 'pcs'),
    greatest(coalesce(_selling_price, 0), 0), _warehouse_id, auth.uid()) returning id into product_id;
  return public.receive_warehouse_stock(_warehouse_id, product_id, _quantity, _unit_cost, _notes);
end $$;

create or replace function public.adjust_warehouse_inventory(
  _warehouse_id uuid, _product_id uuid, _quantity_delta integer, _reason text
) returns void language plpgsql security definer set search_path = public
as $$
declare balance public.inventory_balances%rowtype;
begin
  if not public.is_owner() then raise exception 'Only owners can correct warehouse stock'; end if;
  if _quantity_delta = 0 or nullif(trim(_reason), '') is null then raise exception 'A non-zero quantity and reason are required'; end if;
  select * into balance from public.inventory_balances where location_id = _warehouse_id and product_id = _product_id for update;
  if balance.location_id is null or balance.quantity + _quantity_delta < 0 then raise exception 'Correction would make stock negative'; end if;
  update public.inventory_balances set quantity = quantity + _quantity_delta, updated_at = now()
    where location_id = _warehouse_id and product_id = _product_id;
  insert into public.inventory_movements(location_id, product_id, movement_type, quantity_delta, unit_cost, reference_type, notes, created_by)
  values (_warehouse_id, _product_id, 'adjustment', _quantity_delta, balance.average_unit_cost, 'warehouse_correction', trim(_reason), auth.uid());
end $$;

-- Manager-safe warehouse availability: deliberately excludes costs.
create or replace view public.warehouse_availability as
select ib.location_id warehouse_id, b.name warehouse_name, ib.product_id, cp.sku, cp.barcode,
       cp.name product_name, cp.category, cp.unit, cp.selling_price, cp.image_path, ib.quantity
from public.inventory_balances ib
join public.branches b on b.id = ib.location_id
join public.catalog_products cp on cp.id = ib.product_id
where b.location_type = 'warehouse' and b.is_active and cp.is_active and ib.quantity > 0
  and public.current_staff_role() in ('owner', 'manager');

alter table public.branches enable row level security;
alter table public.catalog_products enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.warehouse_receipts enable row level security;
alter table public.warehouse_receipt_items enable row level security;
alter table public.stock_orders enable row level security;
alter table public.stock_order_items enable row level security;
alter table public.stock_allocations enable row level security;

do $$ declare policy_name text;
begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'branches'
  loop execute format('drop policy if exists %I on public.branches', policy_name); end loop;
end $$;

create policy "Authenticated staff read active locations" on public.branches for select to authenticated
using (
  public.is_owner()
  or (is_active and location_type = 'shop')
  or (is_active and location_type = 'warehouse' and public.current_staff_role() = 'manager')
);
create policy "Owners create locations" on public.branches for insert to authenticated with check (public.is_owner());
create policy "Owners update locations" on public.branches for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Staff read catalog" on public.catalog_products for select to authenticated using (true);
create policy "Owners manage catalog" on public.catalog_products for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Owners read all balances" on public.inventory_balances for select to authenticated using (public.is_owner());
create policy "Shop staff read shop balances" on public.inventory_balances for select to authenticated
using (public.can_access_branch(location_id::text) and exists (select 1 from public.branches b where b.id = location_id and b.location_type = 'shop'));
create policy "Owners read movements" on public.inventory_movements for select to authenticated using (public.is_owner());
create policy "Managers read shop movements" on public.inventory_movements for select to authenticated using (public.can_manage_branch(location_id::text));
create policy "Owners read receipts" on public.warehouse_receipts for select to authenticated using (public.is_owner());
create policy "Owners read receipt items" on public.warehouse_receipt_items for select to authenticated using (public.is_owner());
create policy "Authorized staff read shop orders" on public.stock_orders for select to authenticated
using (public.is_owner() or public.can_manage_branch(destination_shop_id::text));
create policy "Authorized staff read order items" on public.stock_order_items for select to authenticated
using (exists (select 1 from public.stock_orders o where o.id = order_id and (public.is_owner() or public.can_manage_branch(o.destination_shop_id::text))));
create policy "Authorized staff read allocations" on public.stock_allocations for select to authenticated
using (exists (select 1 from public.stock_order_items i join public.stock_orders o on o.id = i.order_id
  where i.id = order_item_id and (public.is_owner() or public.can_manage_branch(o.destination_shop_id::text))));

grant select on public.warehouse_availability to authenticated;
revoke select on public.stock_allocations from authenticated;
grant select (id, order_item_id, warehouse_id, quantity) on public.stock_allocations to authenticated;
grant execute on function public.create_stock_order(uuid, uuid, jsonb) to authenticated;
grant execute on function public.reverse_stock_order(uuid, text) to authenticated;
grant execute on function public.receive_warehouse_stock(uuid, uuid, integer, numeric, text) to authenticated;
grant execute on function public.create_shop_sale(uuid, text, jsonb) to authenticated;
grant execute on function public.restock_shop_inventory(uuid, uuid, integer, uuid) to authenticated;
grant execute on function public.receive_new_warehouse_product(uuid, text, text, text, text, text, numeric, integer, numeric, text) to authenticated;
grant execute on function public.adjust_warehouse_inventory(uuid, uuid, integer, text) to authenticated;
revoke insert, update, delete on public.inventory_balances, public.inventory_movements,
  public.stock_orders, public.stock_order_items, public.stock_allocations,
  public.warehouse_receipts, public.warehouse_receipt_items from authenticated;
revoke insert on public.sales, public.sale_items from authenticated;
