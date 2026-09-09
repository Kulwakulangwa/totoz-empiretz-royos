import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  LogOut,
  PackagePlus,
  Warehouse,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
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
  isProductImageReferenced,
  loadProductImageAudit,
  setCatalogProductImage,
  type CatalogProduct,
  type InventoryBalance,
  type Location,
  type ProductImageAudit,
  type WarehouseReceipt,
} from "@/lib/inventory";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/use-persistent-state";
import {
  productImagePreview,
  removeProductImage,
  uploadProductImage,
} from "@/lib/product-images";
import { ProductImage } from "./ProductImage";
import { useToto } from "@/lib/toto-store";

type View = "overview" | "inventory" | "receive" | "orders" | "settings";
type ServedAllocation = {
  id: string;
  quantity: number;
  stock_order_items?: {
    stock_orders?: { order_number: string; status: "completed" | "reversed" };
    catalog_products?: { name: string; image_path: string | null };
  };
};
const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Please try again.";
};
type Props = {
  warehouse: Location;
  onBack: () => void;
  onLogout: () => void;
  onArchive: () => Promise<void>;
};

export function WarehouseDashboard({ warehouse, onBack, onLogout, onArchive }: Props) {
  const { refreshData } = useToto();
  const [view, setView] = usePersistentState<View>(
    `totoz.warehouse.${warehouse.id}.view`,
    "overview",
  );
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [served, setServed] = useState<ServedAllocation[]>([]);
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = usePersistentState(
    `totoz.warehouse.${warehouse.id}.productId`,
    "",
  );
  const [quantity, setQuantity] = usePersistentState(
    `totoz.warehouse.${warehouse.id}.quantity`,
    "",
  );
  const [cost, setCost] = usePersistentState(`totoz.warehouse.${warehouse.id}.cost`, "");
  const [notes, setNotes] = usePersistentState(`totoz.warehouse.${warehouse.id}.notes`, "");
  const [newProduct, setNewProduct] = usePersistentState(
    `totoz.warehouse.${warehouse.id}.newProduct`,
    false,
  );
  const [productForm, setProductForm] = usePersistentState(
    `totoz.warehouse.${warehouse.id}.productForm`,
    {
      name: "",
      sku: "",
      barcode: "",
      category: "",
      unit: "pcs",
      selling_price: "",
    },
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAudit, setImageAudit] = useState<ProductImageAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [imageSaving, setImageSaving] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const manageImageInputRef = useRef<HTMLInputElement | null>(null);
  const imageProductRef = useRef<ProductImageAudit | null>(null);

  const handleImageSelect = (file?: File) => {
    if (!file) return;
    try {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setImageFile(file);
      setImagePreview(productImagePreview(file));
    } catch (error) {
      toast("Image could not be processed", { description: errorMessage(error) });
    }
  };

  const clearImage = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  useEffect(
    () => () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const refreshImageAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      setImageAudit(await loadProductImageAudit());
    } catch (error) {
      setAuditError(errorMessage(error));
      toast("Could not audit product images", { description: errorMessage(error) });
    } finally {
      setAuditLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (view === "settings") void refreshImageAudit();
  }, [refreshImageAudit, view]);

  const metrics = useMemo(
    () => ({
      units: inventory.reduce((sum, row) => sum + row.quantity, 0),
      skus: inventory.filter((row) => row.quantity > 0).length,
      low: inventory.filter((row) => row.quantity <= row.min_stock).length,
      served: served.filter((row) => row.stock_order_items?.stock_orders?.status === "completed")
        .length,
    }),
    [inventory, served],
  );

  const submitReceipt = async () => {
    const qty = Number(quantity);
    const unitCost = Number(cost);
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      toast("Enter a positive whole quantity and a valid cost.");
      return;
    }

    let uploadedImagePath: string | null = null;
    try {
      let selectedId = productId;
      if (newProduct) {
        if (!productForm.name.trim() || !productForm.sku.trim()) {
          toast("Product name and SKU are required.");
          return;
        }

        if (imageFile) {
          uploadedImagePath = await uploadProductImage(
            imageFile,
            warehouse.id,
            productForm.sku,
          );
        }

        await receiveNewWarehouseProduct(
          warehouse.id,
          {
            name: productForm.name.trim(),
            sku: productForm.sku.trim(),
            barcode: productForm.barcode.trim() || null,
            category: productForm.category.trim() || null,
            unit: productForm.unit.trim() || "pcs",
            selling_price: Number(productForm.selling_price) || 0,
            image_path: uploadedImagePath,
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
      setProductForm({
        name: "",
        sku: "",
        barcode: "",
        category: "",
        unit: "pcs",
        selling_price: "",
      });
      clearImage();

      try {
        await Promise.all([refresh(), refreshData()]);
      } catch (refreshError) {
        console.warn("[WarehouseDashboard] submitReceipt refresh error", refreshError);
        toast("Warehouse stock received, but the stock list could not refresh.", {
          description: errorMessage(refreshError),
        });
      }

      setView("inventory");
    } catch (error: unknown) {
      if (uploadedImagePath) {
        try {
          const referenced = await isProductImageReferenced(uploadedImagePath);
          if (!referenced) await removeProductImage(uploadedImagePath);
        } catch (cleanupError) {
          console.warn("[WarehouseDashboard] image cleanup error", cleanupError);
        }
      }
      console.warn("[WarehouseDashboard] submitReceipt error", error);
      toast("Stock receipt failed", { description: errorMessage(error) });
    }
  };

  const chooseManagedImage = (row: ProductImageAudit) => {
    if (!row.product_id || !row.sku) return;
    imageProductRef.current = row;
    if (manageImageInputRef.current) {
      manageImageInputRef.current.value = "";
      manageImageInputRef.current.click();
    }
  };

  const replaceManagedImage = async (file?: File) => {
    const target = imageProductRef.current;
    if (!file || !target?.product_id || !target.sku) return;
    setImageSaving(true);
    let nextPath: string | null = null;
    let imageAssigned = false;
    try {
      nextPath = await uploadProductImage(file, warehouse.id, target.sku);
      const previousPath = await setCatalogProductImage(target.product_id, nextPath);
      imageAssigned = true;
      if (previousPath && previousPath !== nextPath) {
        try {
          const stillReferenced = await isProductImageReferenced(previousPath);
          if (!stillReferenced) await removeProductImage(previousPath);
        } catch (cleanupError) {
          console.warn("[WarehouseDashboard] old image cleanup error", cleanupError);
        }
      }
      toast("Product image updated", { description: target.product_name ?? target.sku });
      await Promise.all([refresh(), refreshImageAudit(), refreshData()]);
    } catch (error) {
      if (nextPath && !imageAssigned) {
        try {
          await removeProductImage(nextPath);
        } catch (cleanupError) {
          console.warn("[WarehouseDashboard] replacement cleanup error", cleanupError);
        }
      }
      toast("Product image could not be updated", { description: errorMessage(error) });
    } finally {
      imageProductRef.current = null;
      setImageSaving(false);
    }
  };

  const clearManagedImage = async (row: ProductImageAudit) => {
    if (!row.product_id) return;
    if (!window.confirm(`Remove the image for ${row.product_name ?? row.sku ?? "this product"}?`)) {
      return;
    }
    setImageSaving(true);
    try {
      const previousPath = await setCatalogProductImage(row.product_id, null);
      if (previousPath) {
        try {
          const stillReferenced = await isProductImageReferenced(previousPath);
          if (!stillReferenced) await removeProductImage(previousPath);
        } catch (cleanupError) {
          console.warn("[WarehouseDashboard] removed image cleanup error", cleanupError);
        }
      }
      toast("Product image removed");
      await Promise.all([refresh(), refreshImageAudit(), refreshData()]);
    } catch (error) {
      toast("Product image could not be removed", { description: errorMessage(error) });
    } finally {
      setImageSaving(false);
    }
  };

  const deleteOrphanedImage = async (row: ProductImageAudit) => {
    if (!row.image_path || !window.confirm(`Delete unused image ${row.image_path}?`)) return;
    setImageSaving(true);
    try {
      if (await isProductImageReferenced(row.image_path)) {
        toast("Unused image was not deleted", {
          description: "It became referenced after the last audit. Refreshing the audit instead.",
        });
        await refreshImageAudit();
        return;
      }
      await removeProductImage(row.image_path);
      toast("Unused image deleted");
      await refreshImageAudit();
    } catch (error) {
      toast("Unused image could not be deleted", { description: errorMessage(error) });
    } finally {
      setImageSaving(false);
    }
  };

  const auditRowForInventory = (row: InventoryBalance): ProductImageAudit | null => {
    const product = row.catalog_products;
    if (!product) return null;
    return (
      imageAudit.find((item) => item.product_id === product.id) ?? {
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        image_path: product.image_path,
        status: product.image_path ? "valid" : "no_image",
      }
    );
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
  const imageIssues = imageAudit.filter((row) => row.status !== "valid");
  const validImageCount = imageAudit.filter((row) => row.status === "valid").length;

  return (
    <div className="min-h-screen bg-slate-950 p-3 text-slate-900 md:p-6">
      <input
        ref={manageImageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void replaceManagedImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
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
                            <div className="grid gap-2 text-right">
                              {receipt.warehouse_receipt_items?.map((item) => (
                                <div key={item.id} className="flex items-center justify-end gap-2">
                                  <ProductImage
                                    imagePath={item.catalog_products?.image_path}
                                    alt={item.catalog_products?.name ?? "Product"}
                                    className="size-8"
                                  />
                                  <span>{item.catalog_products?.name} · {item.quantity}</span>
                                </div>
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
                    <InventoryList
                      rows={inventory}
                      onAdjust={correctStock}
                      onImageManage={(row) => {
                        const auditRow = auditRowForInventory(row);
                        if (auditRow) chooseManagedImage(auditRow);
                      }}
                      onImageRemove={(row) => {
                        const auditRow = auditRowForInventory(row);
                        if (auditRow) void clearManagedImage(auditRow);
                      }}
                      imageSaving={imageSaving}
                    />
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
                          {/* Image Upload Section - Supports Camera & Gallery for Android/iPhone */}
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
                              <div className="flex flex-1 flex-wrap gap-2">
                                {/* Camera Button (Forces Back Camera on Android, Full Option on iPhone) */}
                                <button className={btn} onClick={() => cameraInputRef.current?.click()}>
                                  <ImagePlus className="size-4" />
                                  {imagePreview ? "Retake" : "Camera"}
                                </button>
                                {/* Gallery Button (Native Action Sheet on all Mobile Devices) */}
                                <button className={btn} onClick={() => galleryInputRef.current?.click()}>
                                  <ImagePlus className="size-4" />
                                  {imagePreview ? "Replace" : "Gallery"}
                                </button>
                                {imagePreview && (
                                  <button className={btn} onClick={clearImage}>
                                    <X className="size-4" />
                                    Remove
                                  </button>
                                )}
                                
                                {/* Hidden Native File Inputs */}
                                <input
                                  ref={cameraInputRef}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="sr-only"
                                  onChange={(e) => { handleImageSelect(e.target.files?.[0]); e.target.value = ""; }}
                                />
                                <input
                                  ref={galleryInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => { handleImageSelect(e.target.files?.[0]); e.target.value = ""; }}
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
                          {productId && (() => {
                            const selected = catalog.find((product) => product.id === productId);
                            return selected ? (
                              <span className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                                <ProductImage
                                  imagePath={selected.image_path}
                                  alt={selected.name}
                                  className="size-10"
                                />
                                <span className="text-xs text-slate-500">
                                  This catalog image follows the product to every shop.
                                </span>
                              </span>
                            ) : null;
                          })()}
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
                          <div className="flex items-center gap-3">
                            <ProductImage
                              imagePath={row.stock_order_items?.catalog_products?.image_path}
                              alt={row.stock_order_items?.catalog_products?.name ?? "Product"}
                              className="size-10"
                            />
                            <div>
                              <strong>{row.stock_order_items?.stock_orders?.order_number}</strong>
                              <p className="text-xs text-slate-500">
                                {row.stock_order_items?.catalog_products?.name}
                              </p>
                            </div>
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
                  <div className="grid max-w-4xl gap-4">
                    <Panel>
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
                    <Panel>
                      <PanelHead
                        title="Product image audit"
                        description="One public catalog image is shared by warehouses, shop inventory and sales."
                      >
                        <button
                          className={btn}
                          onClick={() => void refreshImageAudit()}
                          disabled={auditLoading}
                        >
                          {auditLoading ? "Checking…" : "Refresh audit"}
                        </button>
                      </PanelHead>
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <AuditMetric label="Valid" value={validImageCount} />
                        <AuditMetric
                          label="No image"
                          value={imageAudit.filter((row) => row.status === "no_image").length}
                        />
                        <AuditMetric
                          label="Missing"
                          value={imageAudit.filter((row) => row.status === "missing_object").length}
                        />
                        <AuditMetric
                          label="Unused"
                          value={imageAudit.filter((row) => row.status === "orphaned_object").length}
                        />
                        <AuditMetric
                          label="Duplicate"
                          value={imageAudit.filter((row) => row.status === "duplicate_reference").length}
                        />
                      </div>
                      {auditError ? (
                        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                          {auditError}
                        </p>
                      ) : auditLoading && !imageAudit.length ? (
                        <p className="py-8 text-center text-sm text-slate-500">
                          Checking product images…
                        </p>
                      ) : imageIssues.length ? (
                        <div className="grid gap-2">
                          {imageIssues.map((row, index) => (
                            <div
                              key={`${row.status}:${row.product_id ?? row.image_path}:${index}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <ProductImage
                                  imagePath={row.image_path}
                                  alt={row.product_name ?? "Unused product image"}
                                  className="size-10"
                                />
                                <div className="min-w-0">
                                  <strong className="block truncate text-sm">
                                    {row.product_name ?? "Unused stored image"}
                                  </strong>
                                  <p className="truncate text-xs text-slate-500">
                                    {imageAuditLabel(row.status)}
                                    {row.sku ? ` · ${row.sku}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {row.product_id ? (
                                  <>
                                    <button
                                      className={btn}
                                      disabled={imageSaving}
                                      onClick={() => chooseManagedImage(row)}
                                    >
                                      <ImagePlus className="size-4" />
                                      {row.image_path ? "Replace" : "Upload"}
                                    </button>
                                    {row.image_path && (
                                      <button
                                        className={btn}
                                        disabled={imageSaving}
                                        onClick={() => void clearManagedImage(row)}
                                      >
                                        <Trash2 className="size-4" />
                                        Remove
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    className={btn}
                                    disabled={imageSaving}
                                    onClick={() => void deleteOrphanedImage(row)}
                                  >
                                    <Trash2 className="size-4" />
                                    Delete unused
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                          All assigned product images are healthy and no unused objects were found.
                        </p>
                      )}
                    </Panel>
                  </div>
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
  onImageManage,
  onImageRemove,
  imageSaving = false,
}: {
  rows: InventoryBalance[];
  onAdjust?: (row: InventoryBalance) => void;
  onImageManage?: (row: InventoryBalance) => void;
  onImageRemove?: (row: InventoryBalance) => void;
  imageSaving?: boolean;
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
              <td className="py-3 font-medium">
                <div className="flex items-center gap-2">
                  <ProductImage
                    imagePath={row.catalog_products?.image_path}
                    alt={row.catalog_products?.name ?? "Product"}
                    className="size-10"
                  />
                  <span>{row.catalog_products?.name}</span>
                </div>
              </td>
              <td className="font-mono text-xs">{row.catalog_products?.sku}</td>
              <td>{row.quantity}</td>
              <td>{money(Number(row.average_unit_cost))}</td>
              <td>{money(row.quantity * Number(row.average_unit_cost))}</td>
              {onAdjust && (
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className={btn} onClick={() => onAdjust(row)}>
                      Correct
                    </button>
                    {onImageManage && (
                      <button
                        className={btn}
                        disabled={imageSaving}
                        onClick={() => onImageManage(row)}
                      >
                        {row.catalog_products?.image_path ? "Replace image" : "Add image"}
                      </button>
                    )}
                    {onImageRemove && row.catalog_products?.image_path && (
                      <button
                        className={btn}
                        disabled={imageSaving}
                        onClick={() => onImageRemove(row)}
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <strong className="text-xl">{value}</strong>
    </div>
  );
}

function imageAuditLabel(status: ProductImageAudit["status"]) {
  switch (status) {
    case "no_image":
      return "No image assigned";
    case "missing_object":
      return "Stored image is missing";
    case "duplicate_reference":
      return "Image is shared by multiple products";
    case "orphaned_object":
      return "Stored object is not used";
    default:
      return "Image is valid";
  }
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
