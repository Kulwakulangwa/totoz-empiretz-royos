-- Keep the stocking projection tied to the canonical shared catalog image.
-- Recreating the view also repairs deployments whose older view did not expose
-- image_path, while the PostgREST notification refreshes its column cache.

create or replace view public.warehouse_availability as
select
  ib.location_id as warehouse_id,
  b.name as warehouse_name,
  ib.product_id,
  cp.sku,
  cp.barcode,
  cp.name as product_name,
  cp.category,
  cp.unit,
  cp.selling_price,
  cp.image_path,
  ib.quantity
from public.inventory_balances ib
join public.branches b on b.id = ib.location_id
join public.catalog_products cp on cp.id = ib.product_id
where b.location_type = 'warehouse'
  and b.is_active
  and cp.is_active
  and ib.quantity > 0
  and public.current_staff_role() in ('owner', 'manager');

grant select on public.warehouse_availability to authenticated;

notify pgrst, 'reload schema';
