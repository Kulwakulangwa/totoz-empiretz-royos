-- Fix legacy shared UUID mapping so each shop keeps its own real branch_id.
-- The critical fix is to create the real branch rows first because all branch_id
-- columns in the app are protected by a foreign key to public.branches.

INSERT INTO public.branches (id, name)
VALUES
  ('6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a', 'Totoz Empire'),
  ('a8d51c6d-7660-492d-8430-2243d48a59ef', 'Sunnozy-1'),
  ('d7280d3d-a2fd-41db-bd9d-c03d371d3d4d', 'Sunnozy-2'),
  ('7f624cb1-f0d1-47d3-bcd5-a9ad3ecdfb92', 'Mimis'),
  ('21967b1d-14d2-4d06-9d93-07bc7a2b153b', 'Marc Urembo')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- products
  IF to_regclass('public.products') IS NOT NULL THEN
    UPDATE public.products
    SET branch_id = '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- sales
  IF to_regclass('public.sales') IS NOT NULL THEN
    UPDATE public.sales
    SET branch_id = '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- expenses
  IF to_regclass('public.expenses') IS NOT NULL THEN
    UPDATE public.expenses
    SET branch_id = '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- staff
  IF to_regclass('public.staff') IS NOT NULL THEN
    UPDATE public.staff
    SET branch_id = '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- inventory_adjustments (if present)
  IF to_regclass('public.inventory_adjustments') IS NOT NULL THEN
    UPDATE public.inventory_adjustments
    SET branch_id = '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;
END $$;

-- After this runs, each real shop can be assigned its own UUID in the app and the
-- database must stay consistent with the mapping below.
--
-- Totoz Empire -> 6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a
-- Sunnozy-1    -> a8d51c6d-7660-492d-8430-2243d48a59ef
-- Sunnozy-2    -> d7280d3d-a2fd-41db-bd9d-c03d371d3d4d
-- Mimis        -> 7f624cb1-f0d1-47d3-bcd5-a9ad3ecdfb92
-- Marc Urembo  -> 21967b1d-14d2-4d06-9d93-07bc7a2b153b
