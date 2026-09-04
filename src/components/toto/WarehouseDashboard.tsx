import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, ClipboardCheck, LogOut, PackagePlus, Warehouse, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppLogo } from "./AppLogo";
import { EmptyState, Panel, PanelHead, Pill } from "./primitives";
import { btn, btnPrimary } from "./sections";
import { money } from "@/lib/toto-data";
import {
  loadCatalog,
  loadWarehouseInventory,
  loadWarehouseReceipts,
  receiveWarehouseStock,
  receiveNewWarehouseProduct,
  adjustWarehouseInventory,
  type CatalogProduct,
  type InventoryBalance,
  type Location,
  type WarehouseReceipt,
} from "@/lib/inventory";
import { supabase } from "@/integrations/supabase/client";
import { compressProductImage } from "@/lib/product-images"; // Assuming this exists

type View = "overview" | "inventory" | "receive" | "orders" | "settings";
type ServedAllocation = {
  id: string;
  quantity: number;
  stock_order_items?: {
    stock_orders?: { order_number: string; status: "completed" | "reversed" };
    catalog_products?: { name: string };
  };
};
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
type Props = {
  warehouse: Location;
  onBack: () => void;
  onLogout: () => void;
  onArchive: () => Promise<void>;
};

export function WarehouseDashboard({ warehouse, onBack, onLogout, onArchive }: Props) {
  const [view, setView] = useState<View>("overview");
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [served, setServed] = useState<ServedAllocation[]>([]);
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [newProduct, setNewProduct] = useState(false);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    unit: "pcs",
    selling_price: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [balances, products, receiptRows, allocations] = await Promise.all([
        loadWarehouseInventory(warehouse.id),
        loadCatalog(),
        loadWarehouseReceipts(warehouse.id),
        supabase
          .from("stock_allocations")
          .select(
            `id,order_item_id,warehouse_id,quantity,stock_order_items(*, catalog_products(*), stock_orders(*))`,
          )
          .eq("warehouse_id", warehouse.id)
          .order("id", { ascending: false }),
      ]);
      setInventory(balances);
      setCatalog(products);
      setReceipts(receiptRows);
      if (allocations.error) throw allocations.error;
      setServed((allocations.data ?? []) as unknown as ServedAllocation[]);
    } catch (error: unknown) {
      toast("Could not load warehouse", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [warehouse.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Image Upload Logic
  const handleImageSelect = async (file?: File) => {
    if (!file) return;
    try {
      const compressed = await compressProductImage(file); 
      setImageFile(compressed.blob as File); // Assuming compressProductImage returns an object with blob
      setImagePreview(compressed.previewUrl || URL.createObjectURL(file));
    } catch (error) {
      toast("Image could not be processed", { description: errorMessage(error) });
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const submitReceipt = async () => {
    const qty = Number(quantity);
    const unitCost = Number(cost);
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      toast("Enter a positive whole quantity and a valid cost.");
      return;
    }
    try {
      let selectedId = productId;
      if (newProduct) {
        if (!productForm.name.trim() || !productForm.sku.trim()) {
          toast("Product name and SKU are required.");
          return;
        }
        
        // 1. Upload image if selected
        let imagePath: string | null = null;
        if (imageFile) {
          const safeSku = productForm.sku.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
          const path = `${warehouse.id}/${safeSku}/${Date.now()}.webp`;
          
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(path, imageFile, { upsert: true, contentType: "image/webp" });
            
          if (uploadError) throw uploadError;
          imagePath = path;
        }

        // 2. Call the RPC with the image path
        await receiveNewWarehouseProduct(
          warehouse.id,
          {
            name: productForm.name.trim(),
            sku: productForm.sku.trim(),
            barcode: productForm.barcode.trim() || null,
            category: productForm.category.trim() || null,
            unit: productForm.unit.trim() || "pcs",
            selling_price: Number(productForm.selling_price) || 0,
            image_path: imagePath, // Pass the path here
          },
          qty,
          unitCost,
          notes,
        );
        selectedId = "";
      }
      if (!newProduct) {
        if (!selectedId) {
          toast("Select a product.");
          return;
        }
        await receiveWarehouseStock(warehouse.id, selectedId, qty, unitCost, notes);
      }
      toast("Warehouse stock received");
      setProductId("");
      setQuantity("");
      setCost("");
      setNotes("");
      setNewProduct(false);
      setImageFile(null);
      setImagePreview(null);
      setProductForm({
        name: "",
        sku: "",
        barcode: "",
        category: "",
        unit: "pcs",
        selling_price: "",
      });
      await refresh();
      setView("inventory");
    } catch (error: unknown) {
      toast("Stock receipt failed", { description: errorMessage(error) });
    }
  };

  const correctStock = async (row: InventoryBalance) => {
    const raw = window.prompt(
      `Quantity correction for ${row.catalog_products?.name}. Use a negative number to reduce stock.`,
    );
    if (raw === null) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) {
      toast("Enter a non-zero whole number.");
      return;
    }
    const reason = window.prompt("Reason for this correction?");
    if (!reason?.trim()) return;
    try {
      await adjustWarehouseInventory(warehouse.id, row.product_id, delta, reason);
      toast("Stock corrected");
      await refresh();
    } catch (error: unknown) {
      toast("Correction failed", { description: errorMessage(error) });
    }
  };

  const nav: Array<{ id: View; label: string; icon: typeof Boxes }> = [
    { id: "overview", label: "Dashboard", icon: Warehouse },
    { id: "inventory", label: "Stock available", icon: Boxes },
    { id: "receive", label: "Add stock", icon: PackagePlus },
    { id: "orders", label: "Served orders", icon: ClipboardCheck },
    { id: "settings", label: "Settings", icon: Warehouse },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-3 text-slate-900 md:p-6">
      <div className="mx-auto flex min-h-[92vh] max-w-[1440px] flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-4 text-white">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-300">
            <ArrowLeft className="size-4" />
            All locations
          </button>
          <div className="flex items-center gap-3">
            <AppLogo className="size-10" />
            <div>
              <strong>{warehouse.name}</strong>
              <p className="text-xs text-emerald-300">Warehouse operations</p>
            </div>
          </div>
          <button onClick={onLogout} className="rounded-full p-2 text-slate-300 hover:bg-slate-800">
            <LogOut className="size-5" />
          </button>
        </header>
        <div className="flex flex-1 flex-col md:flex-row">
          <aside className="flex gap-1 overflow-x-auto bg-slate-900 p-3 md:w-56 md:flex-col">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex min-w-max items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${view === item.id ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-500">Loading warehouse…</p>
            ) : (
              <>
                {view === "overview" && (
                  <div className="grid gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">Warehouse dashboard</h1>
                      <p className="text-sm text-slate-500">
                        Stock and fulfillment overview for {warehouse.name}.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {[
                        ["Units available", metrics.units],
                        ["Active SKUs", metrics.skus],
                        ["Low / out", metrics.low],
                        ["Orders served", metrics.served],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-2 text-2xl font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                    <Panel>
                      <PanelHead
                        title="Recent inventory"
                        description="Lowest quantities are shown first."
                      />
                      <InventoryList rows={inventory.slice(0, 8)} />
                    </Panel>
                    <Panel>
                      <PanelHead
                        title="Recent stock receipts"
                        description="Latest stock added to this warehouse."
                      />
                      <div className="grid gap-2">
                        {receipts.map((receipt) => (
                          <div
                            key={receipt.id}
                            className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"
                          >
                            <div>
                              <strong>{receipt.receipt_number}</strong>
                              <p className="text-xs text-slate-500">
                                {new Date(receipt.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              {receipt.warehouse_receipt_items?.map((item) => (
                                <p key={item.id}>
                                  {item.catalog_products?.name} · {item.quantity}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                        {!receipts.length && (
                          <p className="py-5 text-center text-sm text-slate-500">
                            No receipts yet.
                          </p>
                        )}
                      </div>
                    </Panel>
                  </div>
                )}
                {view === "inventory" && (
                  <Panel>
                    <PanelHead
                      title="Stock available"
                      description={`${inventory.length} catalog products in this warehouse.`}
                    >
                      <button className={btnPrimary} onClick={() => setView("receive")}>
                        Add stock
                      </button>
                    </PanelHead>
                    <InventoryList rows={inventory} onAdjust={correctStock} />
                  </Panel>
                )}
                {view === "receive" && (
                  <Panel className="max-w-2xl">
                    <PanelHead
                      title="Receive stock"
                      description="Add an existing catalog item or create a globally shared product."
                    />
                    <div className="mb-4 flex gap-2">
                      <button
                        className={newProduct ? btn : btnPrimary}
                        onClick={() => setNewProduct(false)}
                      >
                        Existing product
                      </button>
                      <button
                        className={newProduct ? btnPrimary : btn}
                        onClick={() => setNewProduct(true)}
                      >
                        New product
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {newProduct ? (
                        <>
                          {/* Image Uploader */}
                          <div className="sm:col-span-2">
                            <span className="text-xs font-medium text-slate-600">Product Image</span>
                            <div className="mt-1 flex items-center gap-3 rounded-lg border bg-white p-3">
                              <div className="grid size-16 place-items-center overflow-hidden rounded-lg bg-slate-100">
                                {imagePreview ? (
                                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                  <ImagePlus className="size-6 text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-1 gap-2">
                                <button
                                  className={btn}
                                  onClick={() => galleryInputRef.current?.click()}
                                >
                                  <ImagePlus className="size-4" />
                                  {imagePreview ? "Replace" : "Upload Image"}
                                </button>
                                {imagePreview && (
                                  <button className={btn} onClick={clearImage}>
                                    <X className="size-4" />
                                    Remove
                                  </button>
                                )}
                                <input
                                  ref={galleryInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageSelect(e.target.files?.[0])}
                                />
                              </div>
                            </div>
                          </div>

                          <Input
                            label="Product name"
                            value={productForm.name}
                            onChange={(value) => setProductForm({ ...productForm, name: value })}
                          />
                          <Input
                            label="SKU"
                            value={productForm.sku}
                            onChange={(value) => setProductForm({ ...productForm, sku: value })}
                          />
                          <Input
                            label="Barcode (optional)"
                            value={productForm.barcode}
                            onChange={(value) => setProductForm({ ...productForm, barcode: value })}
                          />
                          <Input
                            label="Category"
                            value={productForm.category}
                            onChange={(value) =>
                              setProductForm({ ...productForm, category: value })
                            }
                          />
                          <Input
                            label="Unit"
                            value={productForm.unit}
                            onChange={(value) => setProductForm({ ...productForm, unit: value })}
                          />
                          <Input
                            label="Selling price"
                            type="number"
                            value={productForm.selling_price}
                            onChange={(value) =>
                              setProductForm({ ...productForm, selling_price: value })
                            }
                          />
                        </>
                      ) : (
                        <label className="grid gap-1.5 sm:col-span-2">
                          <span className="text-xs font-medium text-slate-600">Product</span>
                          <select
                            className="min-h-10 rounded-lg border bg-white px-3 text-sm"
                            value={productId}
                            onChange={(event) => setProductId(event.target.value)}
                          >
                            <option value="">Select product</option>
                            {catalog.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} · {product.sku}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <Input
                        label="Quantity"
                        type="number"
                        value={quantity}
                        onChange={setQuantity}
                      />
                      <Input
                        label="Unit buying cost"
                        type="number"
                        value={cost}
                        onChange={setCost}
                      />
                      <label className="grid gap-1.5 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">Notes</span>
                        <textarea
                          className="min-h-20 rounded-lg border bg-white p-3 text-sm"
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                      </label>
                    </div>
                    <button className={`${btnPrimary} mt-4`} onClick={submitReceipt}>
                      Receive stock
                    </button>
                  </Panel>
                )}
                {view === "orders" && (
                  <Panel>
                    <PanelHead
                      title="Served orders"
                      description="Allocations fulfilled from this warehouse."
                    />
                    <div className="grid gap-3">
                      {served.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap justify-between gap-3 rounded-xl border bg-white p-4"
                        >
                          <div>
                            <strong>{row.stock_order_items?.stock_orders?.order_number}</strong>
                            <p className="text-xs text-slate-500">
                              {row.stock_order_items?.catalog_products?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <Pill
                              tone={
                                row.stock_order_items?.stock_orders?.status === "completed"
                                  ? "ok"
                                  : "neutral"
                              }
                            >
                              {row.stock_order_items?.stock_orders?.status}
                            </Pill>
                            <p className="mt-1 text-sm font-semibold">{row.quantity} units</p>
                          </div>
                        </div>
                      ))}
                      {!served.length && (
                        <EmptyState
                          title="No served orders"
                          copy="Completed shop allocations will appear here."
                        />
                      )}
                    </div>
                  </Panel>
                )}
                {view === "settings" && (
                  <Panel className="max-w-xl">
                    <PanelHead
                      title="Warehouse settings"
                      description="Historical warehouses can be archived but not deleted."
                    />
                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="text-slate-500">Code</dt>
                        <dd className="font-mono">{warehouse.code}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Address</dt>
                        <dd>{warehouse.address || "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Phone</dt>
                        <dd>{warehouse.phone || "Not set"}</dd>
                      </div>
                    </dl>
                    <button
                      className="mt-6 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (window.confirm(`Archive ${warehouse.name}?`)) {
                          await onArchive();
                          onBack();
                        }
                      }}
                    >
                      Archive warehouse
                    </button>
                  </Panel>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function InventoryList({
  rows,
  onAdjust,
}: {
  rows: InventoryBalance[];
  onAdjust?: (row: InventoryBalance) => void;
}) {
  if (!rows.length)
    return (
      <EmptyState
        title="No stock received"
        copy="Use Add stock to create the first warehouse receipt."
      />
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-slate-500">
            <th className="py-3">Product</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Average cost</th>
            <th>Value</th>
            {onAdjust && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product_id} className="border-b last:border-0">
              <td className="py-3 font-medium">{row.catalog_products?.name}</td>
              <td className="font-mono text-xs">{row.catalog_products?.sku}</td>
              <td>{row.quantity}</td>
              <td>{money(Number(row.average_unit_cost))}</td>
              <td>{money(row.quantity * Number(row.average_unit_cost))}</td>
              {onAdjust && (
                <td>
                  <button className={btn} onClick={() => onAdjust(row)}>
                    Correct
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        className="min-h-10 rounded-lg border bg-white px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
