-- Managers are branch-scoped. Owners remain company-wide administrators.

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

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'owner', false)
$$;

create or replace function public.is_manager_for_branch(_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_staff_role() = 'manager'
    and public.current_staff_branch_id() = _branch_id,
    false
  )
$$;

create or replace function public.can_access_branch(_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_owner()
    or public.current_staff_branch_id() = _branch_id,
    false
  )
$$;

create or replace function public.can_manage_branch(_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_owner()
    or public.is_manager_for_branch(_branch_id),
    false
  )
$$;

-- Keep the old helper name for compatibility, but make it owner-only.
create or replace function public.is_branch_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner()
$$;

grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.current_staff_branch_id() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_manager_for_branch(text) to authenticated;
grant execute on function public.can_access_branch(text) to authenticated;
grant execute on function public.can_manage_branch(text) to authenticated;
grant execute on function public.is_branch_privileged() to authenticated;

do $$
begin
  if to_regclass('public.products') is not null then
    alter table public.products enable row level security;

    drop policy if exists "Branch users can read products" on public.products;
    drop policy if exists "Branch users can insert products" on public.products;
    drop policy if exists "Branch users can update products" on public.products;
    drop policy if exists "Privileged users can delete products" on public.products;

    create policy "Branch users can read products"
      on public.products for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch managers can insert products"
      on public.products for insert to authenticated
      with check (public.can_manage_branch(branch_id::text));

    create policy "Branch managers can update products"
      on public.products for update to authenticated
      using (public.can_manage_branch(branch_id::text))
      with check (public.can_manage_branch(branch_id::text));

    create policy "Branch managers can delete products"
      on public.products for delete to authenticated
      using (public.can_manage_branch(branch_id::text));
  end if;

  if to_regclass('public.sales') is not null then
    alter table public.sales enable row level security;

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

    create policy "Branch managers can update sales"
      on public.sales for update to authenticated
      using (public.can_manage_branch(branch_id::text))
      with check (public.can_manage_branch(branch_id::text));

    create policy "Branch managers can delete sales"
      on public.sales for delete to authenticated
      using (public.can_manage_branch(branch_id::text));
  end if;

  if to_regclass('public.sale_items') is not null then
    alter table public.sale_items enable row level security;

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

    create policy "Branch managers can update sale items"
      on public.sale_items for update to authenticated
      using (
        exists (
          select 1 from public.sales s
          where s.id = sale_items.sale_id
            and public.can_manage_branch(s.branch_id::text)
        )
      )
      with check (
        exists (
          select 1 from public.sales s
          where s.id = sale_items.sale_id
            and public.can_manage_branch(s.branch_id::text)
        )
      );

    create policy "Branch managers can delete sale items"
      on public.sale_items for delete to authenticated
      using (
        exists (
          select 1 from public.sales s
          where s.id = sale_items.sale_id
            and public.can_manage_branch(s.branch_id::text)
        )
      );
  end if;

  if to_regclass('public.expenses') is not null then
    alter table public.expenses enable row level security;

    drop policy if exists "Privileged users can manage expenses" on public.expenses;

    create policy "Branch managers can manage expenses"
      on public.expenses for all to authenticated
      using (public.can_manage_branch(branch_id::text))
      with check (public.can_manage_branch(branch_id::text));
  end if;

  if to_regclass('public.inventory_adjustments') is not null then
    alter table public.inventory_adjustments enable row level security;

    drop policy if exists "Branch users can read inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Branch users can insert inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Privileged users can update inventory adjustments" on public.inventory_adjustments;
    drop policy if exists "Privileged users can delete inventory adjustments" on public.inventory_adjustments;

    create policy "Branch users can read inventory adjustments"
      on public.inventory_adjustments for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch managers can insert inventory adjustments"
      on public.inventory_adjustments for insert to authenticated
      with check (public.can_manage_branch(branch_id::text));

    create policy "Branch managers can update inventory adjustments"
      on public.inventory_adjustments for update to authenticated
      using (public.can_manage_branch(branch_id::text))
      with check (public.can_manage_branch(branch_id::text));

    create policy "Branch managers can delete inventory adjustments"
      on public.inventory_adjustments for delete to authenticated
      using (public.can_manage_branch(branch_id::text));
  end if;

  if to_regclass('public.staff') is not null then
    alter table public.staff enable row level security;

    drop policy if exists "Privileged users can read staff" on public.staff;
    drop policy if exists "Owners can read staff" on public.staff;
    drop policy if exists "Branch managers can read branch staff" on public.staff;

    create policy "Owners can read staff"
      on public.staff for select to authenticated
      using (public.is_owner());

    create policy "Branch managers can read branch staff"
      on public.staff for select to authenticated
      using (public.is_manager_for_branch(branch_id::text));
  end if;

  if to_regclass('public.activity_logs') is not null then
    alter table public.activity_logs enable row level security;

    drop policy if exists "Branch users can read activity logs" on public.activity_logs;
    drop policy if exists "Branch users can insert activity logs" on public.activity_logs;

    create policy "Branch users can read activity logs"
      on public.activity_logs for select to authenticated
      using (public.can_access_branch(branch_id::text));

    create policy "Branch users can insert activity logs"
      on public.activity_logs for insert to authenticated
      with check (public.can_access_branch(branch_id::text));
  end if;
end $$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
    set
      public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/webp']
    where id = 'product-images';
  end if;

  if to_regclass('storage.objects') is not null then
    drop policy if exists "Authenticated users can read product images" on storage.objects;
    drop policy if exists "Privileged users can upload product images" on storage.objects;
    drop policy if exists "Privileged users can update product images" on storage.objects;
    drop policy if exists "Privileged users can delete product images" on storage.objects;

    create policy "Authenticated users can read product images"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'product-images'
        and (
          public.is_owner()
          or public.current_staff_branch_id() = split_part(name, '/', 1)
          or exists (
            select 1
            from public.products p
            where p.image_path = storage.objects.name
              and public.can_access_branch(p.branch_id::text)
          )
        )
      );

    create policy "Branch managers can upload product images"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'product-images'
        and (
          public.is_owner()
          or public.is_manager_for_branch(split_part(name, '/', 1))
        )
      );

    create policy "Branch managers can update product images"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'product-images'
        and (
          public.is_owner()
          or public.is_manager_for_branch(split_part(name, '/', 1))
          or exists (
            select 1
            from public.products p
            where p.image_path = storage.objects.name
              and public.can_manage_branch(p.branch_id::text)
          )
        )
      )
      with check (
        bucket_id = 'product-images'
        and (
          public.is_owner()
          or public.is_manager_for_branch(split_part(name, '/', 1))
          or exists (
            select 1
            from public.products p
            where p.image_path = storage.objects.name
              and public.can_manage_branch(p.branch_id::text)
          )
        )
      );

    create policy "Branch managers can delete product images"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'product-images'
        and (
          public.is_owner()
          or public.is_manager_for_branch(split_part(name, '/', 1))
          or exists (
            select 1
            from public.products p
            where p.image_path = storage.objects.name
              and public.can_manage_branch(p.branch_id::text)
          )
        )
      );
  end if;
end $$;

create or replace function public.decrement_product_quantity(product_id uuid, quantity_to_decrement integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if quantity_to_decrement <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  update public.products p
  set quantity = greatest(0, coalesce(p.quantity, 0) - quantity_to_decrement)
  where p.id = product_id
    and public.can_access_branch(p.branch_id::text);

  if not found then
    raise exception 'Product not found or not accessible';
  end if;
end;
$$;

grant execute on function public.decrement_product_quantity(uuid, integer) to authenticated;

create or replace function public.decrement_product_quantity_by_sku(
  product_sku text,
  product_branch_id text,
  quantity_to_decrement integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if quantity_to_decrement <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  update public.products p
  set quantity = greatest(0, coalesce(p.quantity, 0) - quantity_to_decrement)
  where lower(p.sku) = lower(product_sku)
    and p.branch_id::text = product_branch_id
    and public.can_access_branch(p.branch_id::text);

  if not found then
    raise exception 'Product not found or not accessible';
  end if;
end;
$$;

grant execute on function public.decrement_product_quantity_by_sku(text, text, integer) to authenticated;
