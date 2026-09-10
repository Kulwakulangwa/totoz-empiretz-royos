import { useCallback, useEffect, useState, useRef } from "react";
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
  created_in_warehouse_id?: string | null;
  is_active: boolean;
};

export type ProductImageAuditStatus =
  | "valid"
  | "no_image"
  | "missing_object"
  | "duplicate_reference"
  | "orphaned_object";

export type ProductImageAudit = {
  product_id: string | null;
  sku: string | null;
  product_name: string | null;
  image_path: string | null;
  status: ProductImageAuditStatus;
};

export type InventoryBalance = {
  location_id: string;
  product_id: string;
  quantity: number;
  average_unit_cost: number;
  min_stock: number;
  catalog_products?: CatalogProduct;
};

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
  unit_cost_snapshot?: number;
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

async function loadCatalogProductsById(productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, CatalogProduct>();

  const { data, error } = await db
    .from("catalog_products")
    .select("*")
    .in("id", uniqueIds);
  if (error) throw error;
  return new Map((data ?? []).map((product) => [product.id, product as CatalogProduct]));
}

export function useLocations(includeArchived = false) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevLocationsRef = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    console.warn("[inventory] useLocations.refresh called", { includeArchived });
    setLoading(true);
    try {
      let query = db
        .from("branches")
        .select("id,name,code,location_type,address,phone,is_active")
        .order("name");
      if (!includeArchived) query = query.eq("is_active", true);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const nextLocations = (data ?? []) as Location[];
      const nextSignature = JSON.stringify({ includeArchived, data: nextLocations });
      const shouldUpdate = prevLocationsRef.current !== nextSignature;

      if (shouldUpdate) {
        prevLocationsRef.current = nextSignature;
        if (mounted.current) {
          setLocations(nextLocations);
        }
      } else {
        console.warn("[inventory] useLocations.refresh – data unchanged, skipping setState");
      }

      registerBranchLabels(nextLocations);
      setError(null);
    } catch (err: any) {
      console.warn("[inventory] useLocations.refresh error", err);
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
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
    const { data, error } = await db
      .from("branches")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,name,code,location_type,address,phone,is_active")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error("Location could not be updated. Please check your access and try again.");
    }

    if (patch.is_active === false && !includeArchived) {
      const nextLocations = locations.filter((location) => location.id !== id);
      prevLocationsRef.current = JSON.stringify({ includeArchived, data: nextLocations });
      setLocations(nextLocations);
      registerBranchLabels(nextLocations);
      return;
    }

    await refresh();
  };

  return { locations, loading, error, refresh, createLocation, updateLocation };
}

export async function loadWarehouseAvailability(): Promise<WarehouseAvailability[]> {
  const { data, error } = await db.from("warehouse_availability").select("*").order("product_name");
  if (error) throw error;
  const rows = (data ?? []) as WarehouseAvailability[];
  const catalogById = await loadCatalogProductsById(rows.map((row) => row.product_id));

  return rows.map((row) => {
    const product = catalogById.get(row.product_id);
    return product ? { ...row, image_path: product.image_path } : row;
  });
}

export async function loadStockOrders(shopId: string): Promise<StockOrder[]> {
  const { data, error } = await db
    .from("stock_orders")
    .select(
      `
    *, stock_order_items(*, catalog_products(*), stock_allocations(id,order_item_id,warehouse_id,quantity,branches(name)))
  `,
    )
    .eq("destination_shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const orders = (data ?? []) as unknown as StockOrder[];
  const productIds = orders.flatMap(
    (order) => order.stock_order_items?.map((item) => item.product_id) ?? [],
  );
  const catalogById = await loadCatalogProductsById(productIds);

  return orders.map((order) => {
    if (!order.stock_order_items) return order;
    return {
      ...order,
      stock_order_items: order.stock_order_items.map((item) => {
        const product = catalogById.get(item.product_id);
        return product ? { ...item, catalog_products: product } : item;
      }),
    };
  });
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
    .select("*")
    .eq("location_id", warehouseId)
    .order("quantity", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as InventoryBalance[];
  const catalogById = await loadCatalogProductsById(rows.map((row) => row.product_id));

  return rows.map((row) => {
    const product = catalogById.get(row.product_id);
    return product ? { ...row, catalog_products: product } : row;
  });
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

export async function createCatalogProduct(
  input: Omit<CatalogProduct, "id" | "image_path" | "is_active">,
  warehouseId: string,
) {
  const { data, error } = await db
    .from("catalog_products")
    .insert({ ...input, created_in_warehouse_id: warehouseId })
    .select()
    .single();
  if (error) throw error;
  return data as CatalogProduct;
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

// UPDATED FUNCTION: Uses JSONB payload to perfectly match the database function
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
    _payload: {
      warehouse_id: warehouseId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      selling_price: product.selling_price,
      image_path: product.image_path,
      quantity: quantity,
      unit_cost: unitCost,
      notes: notes || null,
    },
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

export async function setCatalogProductImage(productId: string, imagePath: string | null) {
  const { data, error } = await db.rpc("set_catalog_product_image", {
    _product_id: productId,
    _image_path: imagePath,
  });
  if (error) throw error;
  return data as string | null;
}

export async function loadProductImageAudit(): Promise<ProductImageAudit[]> {
  const { data, error } = await db.rpc("audit_product_images", {});
  if (error) throw error;
  return (data ?? []) as ProductImageAudit[];
}

export async function isProductImageReferenced(imagePath: string) {
  const [catalogResult, legacyResult] = await Promise.all([
    db
      .from("catalog_products")
      .select("id", { count: "exact", head: true })
      .eq("image_path", imagePath),
    db.from("products").select("id", { count: "exact", head: true }).eq("image_path", imagePath),
  ]);
  if (catalogResult.error) throw catalogResult.error;
  if (legacyResult.error) throw legacyResult.error;
  return (catalogResult.count ?? 0) + (legacyResult.count ?? 0) > 0;
}
