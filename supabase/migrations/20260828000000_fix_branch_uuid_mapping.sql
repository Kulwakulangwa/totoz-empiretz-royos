-- Fix legacy shared UUID mapping so each shop keeps its own real branch_id.
-- This migration is safe to run more than once: it only rewrites rows that still use
-- the old shared "Totoz Empire" UUID.

DO $$
BEGIN
  -- products
  IF to_regclass('public.products') IS NOT NULL THEN
    UPDATE public.products
    SET branch_id = CASE
      WHEN branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61' THEN '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
      ELSE branch_id
    END
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- sales
  IF to_regclass('public.sales') IS NOT NULL THEN
    UPDATE public.sales
    SET branch_id = CASE
      WHEN branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61' THEN '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
      ELSE branch_id
    END
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- expenses
  IF to_regclass('public.expenses') IS NOT NULL THEN
    UPDATE public.expenses
    SET branch_id = CASE
      WHEN branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61' THEN '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
      ELSE branch_id
    END
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- staff
  IF to_regclass('public.staff') IS NOT NULL THEN
    UPDATE public.staff
    SET branch_id = CASE
      WHEN branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61' THEN '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
      ELSE branch_id
    END
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;

  -- inventory_adjustments (if present)
  IF to_regclass('public.inventory_adjustments') IS NOT NULL THEN
    UPDATE public.inventory_adjustments
    SET branch_id = CASE
      WHEN branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61' THEN '6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a'
      ELSE branch_id
    END
    WHERE branch_id = 'b25dbe78-c9a9-432e-9117-2fb152267c61';
  END IF;
END $$;

-- Optional: if you want to force the real shop UUIDs for each known branch explicitly,
-- use the following mappings after the legacy cleanup has been applied.
--
-- toto        -> 6d3c2fe8-1af6-4d5d-96eb-9f383c8b9d0a
-- sunnozy-1   -> a8d51c6d-7660-492d-8430-2243d48a59ef
-- sunnozy-2   -> d7280d3d-a2fd-41db-bd9d-c03d371d3d4d
-- mimis       -> 7f624cb1-f0d1-47d3-bcd5-a9ad3ecdfb92
-- marc-urembo -> 21967b1d-14d2-4d06-9d93-07bc7a2b153b
