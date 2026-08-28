do $$
begin
  if to_regclass('public.inventory_adjustments') is not null then
    drop policy if exists "Authenticated users can read inventory adjustments" on public.inventory_adjustments;
    create policy "Authenticated users can read inventory adjustments"
    on public.inventory_adjustments
    for select
    to authenticated
    using (true);

    drop policy if exists "Authenticated users can insert inventory adjustments" on public.inventory_adjustments;
    create policy "Authenticated users can insert inventory adjustments"
    on public.inventory_adjustments
    for insert
    to authenticated
    with check (true);

    drop policy if exists "Owners can update inventory adjustments" on public.inventory_adjustments;
    create policy "Owners can update inventory adjustments"
    on public.inventory_adjustments
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.staff
        where user_id = auth.uid()
          and role = 'owner'
      )
    )
    with check (
      exists (
        select 1
        from public.staff
        where user_id = auth.uid()
          and role = 'owner'
      )
    );

    drop policy if exists "Owners can delete inventory adjustments" on public.inventory_adjustments;
    create policy "Owners can delete inventory adjustments"
    on public.inventory_adjustments
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.staff
        where user_id = auth.uid()
          and role = 'owner'
      )
    );
  end if;
end $$;
