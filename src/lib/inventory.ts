import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerBranchLabels } from "@/lib/toto-data";

const db = supabase;

export type LocationType = "shop" | "warehouse";
export type Location = {
  id: string;
  name: string;
  code: string;
  location_type: LocationType;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

export type CatalogProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  selling_price: number;
  image_path: string | null;
  is_active: boolean;
};

export type InventoryBalance = {
  location_id: string;
  product_id: string;
  quantity: number;
  average_unit_cost: number;
  min_stock: number;
  catalog_products?: CatalogProduct;
};

// SECURE TYPE: No buying price or cost included here!
export type WarehouseAvailability = {
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  product_name: string;
  category: string | null;
  unit: string;
  selling_price: number;
  image_path: string | null;
  quantity: number;
};

export type StockAllocation = {
  id: string;
  warehouse_id: string;
  quantity: number;
  // unit_cost_snapshot removed so it's not exposed
  branches?: { name: string };
};

export type StockOrderItem = {
  id: string;
  product_id: string;
  total_quantity: number;
  catalog_products?: CatalogProduct;
  stock_allocations?: StockAllocation[];
};

export type StockOrder = {
  id: string;
  order_number: string;
  destination_shop_id: string;
  status: "completed" | "reversed";
  created_at: string;
  completed_at: string;
  reversed_at: string | null;
  reversal_reason: string | null;
  stock_order_items?: StockOrderItem[];
};

export type WarehouseReceipt = {
  id: string;
  receipt_number: string;
  warehouse_id: string;
  notes: string | null;
  created_at: string;
  warehouse_receipt_items?: Array<{
    id: string;
    quantity: number;
    unit_cost: number;
    catalog_products?: CatalogProduct;
  }>;
};

export function useLocations(includeArchived = false) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    let query = db
      .from("branches")
      .select("id,name,code,location_type,address,phone,is_active")
      .order("name");
    if (!includeArchived) query = query.eq("is_active", true);
    const { data, error: queryError } = await query;
    setError(queryError?.message ?? null);
    setLocations((data ?? []) as Location[]);
    registerBranchLabels(data ?? []);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLocation = async (
    input: Pick<Location, "name" | "location_type"> & {
      address?: string | undefined;
      phone?: string | undefined;
    },
  ) => {
    const code = `${input.location_type === "shop" ? "SHP" : "WH"}-${input.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const { error } = await db.from("branches").insert({
      name: input.name.trim(),
      code,
      location_type: input.location_type,
      address: input.address ?? null,
      phone: input.phone ?? null,
    });
    if (error) throw error;
    await refresh();
  };

  const updateLocation = async (
    id: string,
    patch: Partial<Pick<Location, "name" | "address" | "phone" | "is_active">>,
  ) => {
    const { error } = await db
      .from("branches")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { locations, loading, error, refresh, createLocation, updateLocation };
}

// Uses the secure view so Cashiers don't see costs
export async function loadWarehouseAvailability(): Promise<WarehouseAvailability[]> {
  const { data, error } = await db.from("cashier_stock_availability").select("*").order("product_name");
  if (error) throw error;
  return (data ?? []) as WarehouseAvailability[];
}

export async function loadStockOrders(shopId: string): Promise<StockOrder[]> {
  const { data, error } = await db
    .from("stock_orders")
    .select(
      `
    *, stock_order_items(*, catalog_products(*), stock_allocations(id, order_item_id, warehouse_id, quantity, branches(name)))
  `,
    )
    .eq("destination_shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as StockOrder[];
}

export async function createStockOrder(
  shopId: string,
  allocations: Array<{ productId: string; warehouseId: string; quantity: number }>,
) {
  const { data, error } = await db.rpc("create_stock_order", {
    _destination_shop_id: shopId,
    _idempotency_key: crypto.randomUUID(),
    _allocations: allocations,
  });
  if (error) throw error;
  return data as string;
}

export async function reverseStockOrder(orderId: string, reason: string) {
  const { error } = await db.rpc("reverse_stock_order", { _order_id: orderId, _reason: reason });
  if (error) throw error;
}

export async function loadWarehouseInventory(warehouseId: string): Promise<InventoryBalance[]> {
  const { data, error } = await db
    .from("inventory_balances")
    .select("*, catalog_products(*)")
    .eq("location_id", warehouseId)
    .order("quantity", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as InventoryBalance[];
}

export async function loadCatalog(): Promise<CatalogProduct[]> {
  const { data, error } = await db
    .from("catalog_products")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogProduct[];
}

export async function loadWarehouseReceipts(warehouseId: string): Promise<WarehouseReceipt[]> {
  const { data, error } = await db
    .from("warehouse_receipts")
    .select("*, warehouse_receipt_items(*, catalog_products(*))")
    .eq("warehouse_id", warehouseId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as WarehouseReceipt[];
}

export async function receiveWarehouseStock(
  warehouseId: string,
  productId: string,
  quantity: number,
  unitCost: number,
  notes?: string,
) {
  const { data, error } = await db.rpc("receive_warehouse_stock", {
    _warehouse_id: warehouseId,
    _product_id: productId,
    _quantity: quantity,
    _unit_cost: unitCost,
    _notes: notes || null,
  });
  if (error) throw error;
  return data as string;
}

// NOW INCLUDES _image_path for image uploads!
export async function receiveNewWarehouseProduct(
  warehouseId: string,
  product: {
    name: string;
    sku: string;
    barcode: string | null;
    category: string | null;
    unit: string;
    selling_price: number;
    image_path: string | null;
  },
  quantity: number,
  unitCost: number,
  notes?: string,
) {
  const { data, error } = await db.rpc("receive_new_warehouse_product", {
    _warehouse_id: warehouseId,
    _name: product.name,
    _sku: product.sku,
    _barcode: product.barcode,
    _category: product.category,
    _unit: product.unit,
    _selling_price: product.selling_price,
    _quantity: quantity,
    _unit_cost: unitCost,
    _notes: notes || null,
    _image_path: product.image_path,
  });
  if (error) throw error;
  return data as string;
}

export async function adjustWarehouseInventory(
  warehouseId: string,
  productId: string,
  quantityDelta: number,
  reason: string,
) {
  const { error } = await db.rpc("adjust_warehouse_inventory", {
    _warehouse_id: warehouseId,
    _product_id: productId,
    _quantity_delta: quantityDelta,
    _reason: reason,
  });
  if (error) throw error;
}
