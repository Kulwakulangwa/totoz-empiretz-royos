-- Enforce true branch isolation while preserving legacy shared rows as Totoz Empire.

do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'app_role') then
    alter type public.app_role add value if not exists 'manager';
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
declare
  table_name text;
  constraint_name text;
begin
  foreach table_name in array array['staff', 'user_roles']
  loop
    if to_regclass('public.' || table_name) is not null then
      for constraint_name in
        execute format(
          $sql$
            select c.conname
            from pg_constraint c
            join pg_class t on t.oid = c.conrelid
            join pg_namespace n on n.oid = t.relnamespace
            where n.nspname = 'public'
              and t.relname = %L
              and c.contype = 'c'
              and pg_get_constraintdef(c.oid) ilike '%%role%%'
          $sql$,
          table_name
        )
      loop
        execute format('alter table public.%I drop constraint %I', table_name, constraint_name);
      end loop;
    end if;
  end loop;

  if to_regclass('public.staff') is not null then
    alter table public.staff
      add constraint staff_role_check
      check (role::text in ('owner', 'manager', 'cashier'))
      not valid;
    alter table public.staff validate constraint staff_role_check;
  end if;

  if to_regclass('public.user_roles') is not null then
    alter table public.user_roles
      add constraint user_roles_role_check
      check (role::text in ('owner', 'manager', 'cashier'))
      not valid;
    alter table public.user_roles validate constraint user_roles_role_check;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
declare
  totoz_uuid constant text := '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a';
  legacy_uuid constant text := 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  target_table text;
  branch_id_type text;
begin
  foreach target_table in array array['products', 'sales', 'expenses', 'staff', 'inventory_adjustments', 'activity_logs']
  loop
    if to_regclass('public.' || target_table) is not null then
      select c.udt_name
      into branch_id_type
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = target_table
        and c.column_name = 'branch_id';

      if branch_id_type is null then
        continue;
      end if;

      execute format(
        'update public.%I set branch_id = %s where branch_id is null or branch_id::text = $2',
        target_table,
        case when branch_id_type = 'uuid' then '$1::uuid' else '$1' end
      )
      using totoz_uuid, legacy_uuid;
    end if;
  end loop;
end $$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.role::text
  from public.staff s
  where s.user_id = auth.uid()
    and coalesce(s.is_active, true)
  limit 1
$$;

create or replace function public.current_staff_branch_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.branch_id::text
  from public.staff s
  where s.user_id = auth.uid()
    and coalesce(s.is_active, true)
  limit 1
$$;

create or replace function public.is_branch_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('owner', 'manager'), false)
$$;

create or replace function public.can_access_branch(_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_branch_privileged()
    or public.current_staff_branch_id() = _branch_id,
    false
  )
$$;

grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.current_staff_branch_id() to authenticated;
grant execute on function public.is_branch_privileged() to authenticated;
grant execute on function public.can_access_branch(text) to authenticated;

do $$
begin
  if to_regclass('public.products') is not null then
    alter table public.products enable row level security;

    drop policy if exists "Authenticated users can read products" on public.products;
    drop policy if exists "Authenticated users can insert products" on public.products;
    drop policy if exists "Authenticated users can update products" on public.products;
    drop policy if exists "Authenticated users can delete products" on public.products;
    drop policy if exists "Branch users can read products" on public.products;
    drop policy if exists "Branch users can insert products" on public.products;
    drop policy if exists "Branch users can update products" on public.products;
    drop policy if exists "Privileged users can delete products" on public.products;

    create policy "Branch users can read products"
      on public.products for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch users can insert products"
      on public.products for insert to authenticated
      with check (public.can_access_branch(branch_id::text));

    create policy "Branch users can update products"
      on public.products for update to authenticated
      using (public.can_access_branch(branch_id::text))
      with check (public.can_access_branch(branch_id::text));

    create policy "Privileged users can delete products"
      on public.products for delete to authenticated
      using (public.is_branch_privileged());
  end if;

  if to_regclass('public.sales') is not null then
    alter table public.sales enable row level security;

    drop policy if exists "Authenticated users can read sales" on public.sales;
    drop policy if exists "Authenticated users can insert sales" on public.sales;
    drop policy if exists "Authenticated users can update sales" on public.sales;
    drop policy if exists "Authenticated users can delete sales" on public.sales;
    drop policy if exists "Branch users can read sales" on public.sales;
    drop policy if exists "Branch users can insert sales" on public.sales;
    drop policy if exists "Privileged users can update sales" on public.sales;
    drop policy if exists "Privileged users can delete sales" on public.sales;

    create policy "Branch users can read sales"
      on public.sales for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch users can insert sales"
      on public.sales for insert to authenticated
      with check (public.can_access_branch(branch_id::text));

    create policy "Privileged users can update sales"
      on public.sales for update to authenticated
      using (public.is_branch_privileged())
      with check (public.is_branch_privileged());

    create policy "Privileged users can delete sales"
      on public.sales for delete to authenticated
      using (public.is_branch_privileged());
  end if;

  if to_regclass('public.sale_items') is not null then
    alter table public.sale_items enable row level security;

    drop policy if exists "Authenticated users can read sale items" on public.sale_items;
    drop policy if exists "Authenticated users can insert sale items" on public.sale_items;
    drop policy if exists "Authenticated users can update sale items" on public.sale_items;
    drop policy if exists "Authenticated users can delete sale items" on public.sale_items;
    drop policy if exists "Branch users can read sale items" on public.sale_items;
    drop policy if exists "Branch users can insert sale items" on public.sale_items;
    drop policy if exists "Privileged users can update sale items" on public.sale_items;
    drop policy if exists "Privileged users can delete sale items" on public.sale_items;

    create policy "Branch users can read sale items"
      on public.sale_items for select to authenticated
      using (
        exists (
          select 1 from public.sales s
          where s.id = sale_items.sale_id
            and public.can_access_branch(s.branch_id::text)
        )
      );

    create policy "Branch users can insert sale items"
      on public.sale_items for insert to authenticated
      with check (
        exists (
          select 1 from public.sales s
          where s.id = sale_items.sale_id
            and public.can_access_branch(s.branch_id::text)
        )
      );

    create policy "Privileged users can update sale items"
      on public.sale_items for update to authenticated
      using (public.is_branch_privileged())
      with check (public.is_branch_privileged());

    create policy "Privileged users can delete sale items"
      on public.sale_items for delete to authenticated
      using (public.is_branch_privileged());
  end if;

  if to_regclass('public.expenses') is not null then
    alter table public.expenses enable row level security;

    drop policy if exists "Authenticated users can read expenses" on public.expenses;
    drop policy if exists "Authenticated users can insert expenses" on public.expenses;
    drop policy if exists "Authenticated users can update expenses" on public.expenses;
    drop policy if exists "Authenticated users can delete expenses" on public.expenses;
    drop policy if exists "Privileged users can manage expenses" on public.expenses;

    create policy "Privileged users can manage expenses"
      on public.expenses for all to authenticated
      using (public.is_branch_privileged())
      with check (public.is_branch_privileged());
  end if;

  if to_regclass('public.inventory_adjustments') is not null then
    alter table public.inventory_adjustments enable row level security;

    drop policy if exists "Authenticated users can read inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Authenticated users can insert inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Owners can update inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Owners can delete inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Branch users can read inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Branch users can insert inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Privileged users can update inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Privileged users can delete inventory adjustments" on public.inventory_adjustments;

    create policy "Branch users can read inventory adjustments"
      on public.inventory_adjustments for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch users can insert inventory adjustments"
      on public.inventory_adjustments for insert to authenticated
      with check (public.can_access_branch(branch_id::text));

    create policy "Privileged users can update inventory adjustments"
      on public.inventory_adjustments for update to authenticated
      using (public.is_branch_privileged())
      with check (public.is_branch_privileged());

    create policy "Privileged users can delete inventory adjustments"
      on public.inventory_adjustments for delete to authenticated
      using (public.is_branch_privileged());
  end if;

  if to_regclass('public.staff') is not null then
    alter table public.staff enable row level security;

    drop policy if exists "Authenticated users can read staff" on public.staff;
    drop policy if exists "Owners can manage staff" on public.staff;
    drop policy if exists "Staff can read own profile" on public.staff;
    drop policy if exists "Privileged users can read staff" on public.staff;

    create policy "Staff can read own profile"
      on public.staff for select to authenticated
      using (user_id = auth.uid());

    create policy "Privileged users can read staff"
      on public.staff for select to authenticated
      using (public.is_branch_privileged());
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Owners can upload product images" on storage.objects;
    drop policy if exists "Owners can update product images" on storage.objects;
    drop policy if exists "Owners can delete product images" on storage.objects;
    drop policy if exists "Privileged users can upload product images" on storage.objects;
    drop policy if exists "Privileged users can update product images" on storage.objects;
    drop policy if exists "Privileged users can delete product images" on storage.objects;

    create policy "Privileged users can upload product images"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'product-images' and public.is_branch_privileged());

    create policy "Privileged users can update product images"
      on storage.objects for update to authenticated
      using (bucket_id = 'product-images' and public.is_branch_privileged())
      with check (bucket_id = 'product-images' and public.is_branch_privileged());

    create policy "Privileged users can delete product images"
      on storage.objects for delete to authenticated
      using (bucket_id = 'product-images' and public.is_branch_privileged());
  end if;
end $$;

do $$
declare
  constraint_name text;
  index_name text;
begin
  if to_regclass('public.products') is null then
    return;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'products'
      and c.contype = 'u'
      and not exists (
        select 1
        from unnest(c.conkey) key(attnum)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
        where a.attname = 'branch_id'
      )
      and exists (
        select 1
        from unnest(c.conkey) key(attnum)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
        where a.attname in ('sku', 'barcode')
      )
  loop
    execute format('alter table public.products drop constraint %I', constraint_name);
  end loop;

  for index_name in
    select i.relname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'products'
      and x.indisunique
      and i.relname not in ('products_branch_sku_unique', 'products_branch_barcode_unique')
      and not exists (
        select 1
        from unnest(x.indkey) key(attnum)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
        where a.attname = 'branch_id'
      )
      and exists (
        select 1
        from unnest(x.indkey) key(attnum)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
        where a.attname in ('sku', 'barcode')
      )
  loop
    execute format('drop index if exists public.%I', index_name);
  end loop;

  create unique index if not exists products_branch_sku_unique
    on public.products (branch_id, lower(sku))
    where sku is not null and sku <> '';

  create unique index if not exists products_branch_barcode_unique
    on public.products (branch_id, lower(barcode))
    where barcode is not null and barcode <> '';
end $$;
