-- Migration: Create inventory, orders, shipments, and RPCs

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Location types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN
        CREATE TYPE location_type AS ENUM ('warehouse','shop');
    END IF;
END$$;

-- Tables
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type location_type NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE,
  name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, location_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  created_by uuid,
  status text NOT NULL DEFAULT 'placed', -- draft, placed, shipped, received, cancelled
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  source_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  qty_requested integer NOT NULL CHECK (qty_requested > 0),
  qty_reserved integer NOT NULL DEFAULT 0,
  qty_shipped integer NOT NULL DEFAULT 0,
  qty_received integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipped_by uuid,
  shipped_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0)
);

CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  qty integer NOT NULL CHECK (qty > 0),
  processed_by uuid,
  status text NOT NULL DEFAULT 'pending', -- pending, processed
  created_at timestamptz DEFAULT now()
);

-- Helper view: product availability per location
CREATE MATERIALIZED VIEW IF NOT EXISTS product_availability AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  l.id AS location_id,
  l.name AS location_name,
  l.type AS location_type,
  i.quantity,
  i.reserved,
  (i.quantity - i.reserved) AS available
FROM products p
JOIN inventory i ON i.product_id = p.id
JOIN locations l ON l.id = i.location_id;

-- Function: reserve_order(items JSONB)
-- items: [{product_id: "uuid", source_location_id: "uuid", qty: 5}, ...]
CREATE OR REPLACE FUNCTION rpc_reserve_order(shop_id uuid, created_by uuid, items jsonb)
RETURNS TABLE(order_id uuid, order_item_id uuid, product_id uuid, source_location_id uuid, qty_reserved integer) AS $$
DECLARE
  o_id uuid := gen_random_uuid();
  it jsonb;
  prod uuid;
  src uuid;
  qty integer;
  avail integer;
  inv_id uuid;
BEGIN
  -- create order
  INSERT INTO orders(id, shop_id, created_by, status) VALUES (o_id, shop_id, created_by, 'placed');

  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    prod := (it->>'product_id')::uuid;
    src := (it->>'source_location_id')::uuid;
    qty := (it->>'qty')::int;

    -- check inventory row exists
    SELECT id, (quantity - reserved) INTO inv_id, avail FROM inventory
      WHERE product_id = prod AND location_id = src FOR UPDATE;

    IF inv_id IS NULL THEN
      RAISE EXCEPTION 'No inventory row for product % at location %', prod, src;
    END IF;

    IF avail < qty THEN
      RAISE EXCEPTION 'Insufficient available stock for product % at location %: available %, requested %', prod, src, avail, qty;
    END IF;

    -- reserve
    UPDATE inventory SET reserved = reserved + qty, updated_at = now() WHERE id = inv_id;

    -- create order_item with qty_reserved
    INSERT INTO order_items(order_id, product_id, source_location_id, qty_requested, qty_reserved)
      VALUES (o_id, prod, src, qty, qty)
      RETURNING id INTO STRICT order_item_id;

    -- return row
    order_id := o_id;
    product_id := prod;
    source_location_id := src;
    qty_reserved := qty;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function: ship_order(order_id, shipped_by, items JSONB)
-- items: [{order_item_id: "uuid", qty: 3}, ...]
CREATE OR REPLACE FUNCTION rpc_ship_order(order_id uuid, shipped_by uuid, items jsonb)
RETURNS TABLE(shipment_id uuid, shipment_item_id uuid, order_item_id uuid, qty_shipped integer) AS $$
DECLARE
  s_id uuid := gen_random_uuid();
  it jsonb;
  oi uuid;
  qty integer;
  src uuid;
  inv_id uuid;
BEGIN
  INSERT INTO shipments(id, order_id, shipped_by) VALUES (s_id, order_id, shipped_by);

  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    oi := (it->>'order_item_id')::uuid;
    qty := (it->>'qty')::int;

    SELECT source_location_id INTO src FROM order_items WHERE id = oi FOR UPDATE;
    IF src IS NULL THEN
      RAISE EXCEPTION 'Order item % not found', oi;
    END IF;

    SELECT id, reserved, quantity INTO inv_id, inv_id, inv_id FROM inventory WHERE product_id = (SELECT product_id FROM order_items WHERE id = oi) AND location_id = src FOR UPDATE;

    IF inv_id IS NULL THEN
      RAISE EXCEPTION 'Inventory missing for order item %', oi;
    END IF;

    -- check reserved
    IF (SELECT qty_reserved FROM order_items WHERE id = oi) < qty THEN
      RAISE EXCEPTION 'Not enough reserved quantity on order item % to ship: requested %, reserved %', oi, qty, (SELECT qty_reserved FROM order_items WHERE id = oi);
    END IF;

    -- decrement inventory quantity and reserved, increment order_item.qty_shipped
    UPDATE inventory SET quantity = quantity - qty, reserved = reserved - qty, updated_at = now() WHERE id = inv_id;
    UPDATE order_items SET qty_shipped = qty_shipped + qty, qty_reserved = qty_reserved - qty WHERE id = oi;

    INSERT INTO shipment_items(shipment_id, order_item_id, qty) VALUES (s_id, oi, qty) RETURNING id INTO shipment_item_id;

    shipment_id := s_id;
    order_item_id := oi;
    qty_shipped := qty;
    RETURN NEXT;
  END LOOP;

  -- update order status if all items shipped
  UPDATE orders SET status = CASE WHEN NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = order_id AND qty_shipped < qty_requested) THEN 'shipped' ELSE status END WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Function: receive_order(order_id, received_by, items JSONB)
-- items: [{order_item_id: "uuid", qty: 3, destination_location_id: "uuid"}, ...]
CREATE OR REPLACE FUNCTION rpc_receive_order(order_id uuid, received_by uuid, items jsonb)
RETURNS TABLE(order_item_id uuid, qty_received integer, destination_location_id uuid) AS $$
DECLARE
  it jsonb;
  oi uuid;
  qty integer;
  dest uuid;
  prod uuid;
  inv_id uuid;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    oi := (it->>'order_item_id')::uuid;
    qty := (it->>'qty')::int;
    dest := (it->>'destination_location_id')::uuid;

    SELECT product_id INTO prod FROM order_items WHERE id = oi FOR UPDATE;
    IF prod IS NULL THEN
      RAISE EXCEPTION 'Order item % not found', oi;
    END IF;

    -- upsert inventory row at destination (shop)
    INSERT INTO inventory(product_id, location_id, quantity, reserved) VALUES (prod, dest, qty, 0)
    ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = now()
    RETURNING id INTO inv_id;

    -- mark qty_received on order_item
    UPDATE order_items SET qty_received = qty_received + qty WHERE id = oi;

    order_item_id := oi;
    qty_received := qty;
    destination_location_id := dest;
    RETURN NEXT;
  END LOOP;

  -- update order status if all items received
  UPDATE orders SET status = CASE WHEN NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = order_id AND qty_received < qty_requested) THEN 'received' ELSE status END WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Function: process_return(from_location_id, to_location_id, product_id, qty)
CREATE OR REPLACE FUNCTION rpc_process_return(from_location_id uuid, to_location_id uuid, product_id uuid, qty integer)
RETURNS void AS $$
DECLARE
  from_inv_id uuid;
BEGIN
  IF qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be > 0';
  END IF;

  SELECT id INTO from_inv_id FROM inventory WHERE product_id = product_id AND location_id = from_location_id FOR UPDATE;
  IF from_inv_id IS NULL THEN
    RAISE EXCEPTION 'No inventory at source';
  END IF;

  -- decrement source quantity
  UPDATE inventory SET quantity = quantity - qty WHERE id = from_inv_id;

  -- increment destination inventory
  INSERT INTO inventory(product_id, location_id, quantity, reserved) VALUES (product_id, to_location_id, qty, 0)
  ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- End of migration
