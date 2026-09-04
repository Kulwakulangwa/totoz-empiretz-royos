import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PackagePlus, RotateCcw, Search, Truck } from "lucide-react";
import { Panel, PanelHead, EmptyState, Pill } from "./primitives";
import { btn, btnPrimary } from "./sections";
import { useToto } from "@/lib/toto-store";
import {
  createStockOrder,
  loadStockOrders,
  loadWarehouseAvailability,
  reverseStockOrder,
  type StockOrder,
  type WarehouseAvailability,
} from "@/lib/inventory";

type Props = { shopId: string; shopName: string };
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export function StockingSection({ shopId, shopName }: Props) {
  const { refreshData } = useToto();
  const [availability, setAvailability] = useState<WarehouseAvailability[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [status, setStatus] = useState<"all" | "completed" | "reversed">("all");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [stock, history] = await Promise.all([
        loadWarehouseAvailability(),
        loadStockOrders(shopId),
      ]);
      setAvailability(stock);
      setOrders(history);
    } catch (error: unknown) {
      toast("Could not load stocking data", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const products = useMemo(() => {
    const grouped = new Map<
      string,
      { product: WarehouseAvailability; rows: WarehouseAvailability[] }
    >();
    availability.forEach((row) => {
      const entry = grouped.get(row.product_id);
      if (entry) entry.rows.push(row);
      else grouped.set(row.product_id, { product: row, rows: [row] });
    });
    const needle = query.trim().toLowerCase();
    return [...grouped.values()].filter(
      ({ product }) =>
        !needle ||
        product.product_name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        (product.barcode ?? "").toLowerCase().includes(needle),
    );
  }, [availability, query]);

  const allocations = useMemo(
    () =>
      availability.flatMap((row) => {
        const raw = quantities[`${row.product_id}:${row.warehouse_id}`] ?? "";
        const quantity = Number(raw);
        return Number.isInteger(quantity) && quantity > 0
          ? [{ productId: row.product_id, warehouseId: row.warehouse_id, quantity }]
          : [];
      }),
    [availability, quantities],
  );

  const summary = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number }>();
    allocations.forEach((allocation) => {
      const row = availability.find((item) => item.product_id === allocation.productId)!;
      const current = totals.get(allocation.productId) ?? { name: row.product_name, quantity: 0 };
      current.quantity += allocation.quantity;
      totals.set(allocation.productId, current);
    });
    return [...totals.values()];
  }, [allocations, availability]);

  const filteredOrders = useMemo(() => {
    const needle = historyQuery.trim().toLowerCase();
    return orders.filter(
      (order) =>
        (status === "all" || order.status === status) &&
        (!needle ||
          order.order_number.toLowerCase().includes(needle) ||
          order.stock_order_items?.some(
            (item) =>
              item.catalog_products?.name.toLowerCase().includes(needle) ||
              item.catalog_products?.sku.toLowerCase().includes(needle),
          )),
    );
  }, [orders, historyQuery, status]);

  const submit = async () => {
    if (!allocations.length) {
      toast("Enter at least one quantity.");
      return;
    }
    const invalid = allocations.find((allocation) => {
      const row = availability.find(
        (item) =>
          item.product_id === allocation.productId && item.warehouse_id === allocation.warehouseId,
      );
      return !row || allocation.quantity > row.quantity;
    });
    if (invalid) {
      toast("One or more quantities exceed current warehouse stock.");
      return;
    }
    setSubmitting(true);
    try {
      await createStockOrder(shopId, allocations);
      toast("Stocking order completed", { description: `Stock is now available at ${shopName}.` });
      setQuantities({});
      setCreating(false);
      await Promise.all([refresh(), refreshData()]);
    } catch (error: unknown) {
      toast("Order could not be completed", { description: errorMessage(error) });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const reverse = async (order: StockOrder) => {
    const reason = window.prompt(`Reason for reversing ${order.order_number}?`);
    if (!reason?.trim()) return;
    try {
      await reverseStockOrder(order.id, reason);
      toast("Order reversed");
      await Promise.all([refresh(), refreshData()]);
    } catch (error: unknown) {
      toast("Order could not be reversed", { description: errorMessage(error) });
    }
  };

  if (loading)
    return (
      <Panel>
        <p className="py-10 text-center text-sm text-muted-foreground">Loading stocking data…</p>
      </Panel>
    );

  if (creating)
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel>
          <PanelHead
            title="Create stocking order"
            description={`Transfer available warehouse stock to ${shopName}.`}
          >
            <button className={btn} onClick={() => setCreating(false)}>
              Back to history
            </button>
          </PanelHead>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="min-h-10 w-full rounded-lg border bg-white pl-10 pr-3 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU or barcode"
            />
          </div>
          <div className="grid gap-3">
            {products.map(({ product, rows }) => (
              <div key={product.product_id} className="rounded-xl border bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.product_name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <Pill tone="neutral">
                    {rows.reduce((sum, row) => sum + row.quantity, 0)} total
                  </Pill>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((row) => {
                    const key = `${row.product_id}:${row.warehouse_id}`;
                    return (
                      <label key={key} className="rounded-lg bg-muted/60 p-3 text-xs">
                        <span className="mb-2 flex justify-between">
                          <strong>{row.warehouse_name}</strong>
                          <span>{row.quantity} available</span>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={row.quantity}
                          step="1"
                          inputMode="numeric"
                          className="min-h-9 w-full rounded-md border bg-white px-3 text-sm"
                          value={quantities[key] ?? ""}
                          placeholder="Quantity"
                          onChange={(event) =>
                            setQuantities((current) => ({ ...current, [key]: event.target.value }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {!products.length && (
              <EmptyState
                title="No warehouse stock found"
                copy="Receive stock into a warehouse before creating an order."
              />
            )}
          </div>
        </Panel>
        <Panel className="h-fit xl:sticky xl:top-0">
          <PanelHead
            title="Order summary"
            description={`${summary.length} product${summary.length === 1 ? "" : "s"}`}
          />
          <div className="grid gap-2">
            {summary.map((item) => (
              <div key={item.name} className="flex justify-between rounded-lg bg-muted p-3 text-sm">
                <span>{item.name}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))}
            {!summary.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Enter quantities to build this order.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-between border-t pt-3 text-sm">
            <span>Total units</span>
            <strong>{allocations.reduce((sum, row) => sum + row.quantity, 0)}</strong>
          </div>
          <button
            className={`${btnPrimary} mt-4 w-full`}
            disabled={submitting || !allocations.length}
            onClick={submit}
          >
            <Truck className="size-4" />
            {submitting ? "Transferring…" : "Complete order"}
          </button>
        </Panel>
      </div>
    );

  return (
    <Panel>
      <PanelHead title="Stocking" description={`Warehouse orders for ${shopName}.`}>
        <button className={btnPrimary} onClick={() => setCreating(true)}>
          <PackagePlus className="size-4" />
          New order
        </button>
      </PanelHead>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="min-h-9 flex-1 rounded-lg border px-3 text-sm"
          value={historyQuery}
          onChange={(event) => setHistoryQuery(event.target.value)}
          placeholder="Search order or product"
        />
        <select
          className="min-h-9 rounded-lg border bg-white px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      <div className="grid gap-3">
        {filteredOrders.map((order) => (
          <div key={order.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <strong>{order.order_number}</strong>
                  <Pill tone={order.status === "completed" ? "ok" : "neutral"}>{order.status}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()} ·{" "}
                  {order.stock_order_items?.length ?? 0} items
                </p>
              </div>
              {order.status === "completed" && (
                <button className={btn} onClick={() => reverse(order)}>
                  <RotateCcw className="size-4" />
                  Reverse
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {order.stock_order_items?.map((item) => (
                <div key={item.id} className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span>{item.catalog_products?.name ?? "Product"}</span>
                    <strong>{item.total_quantity}</strong>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.stock_allocations
                      ?.map(
                        (allocation) =>
                          `${allocation.branches?.name ?? "Warehouse"} ${allocation.quantity}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
            {order.reversal_reason && (
              <p className="mt-3 text-xs text-muted-foreground">
                Reversal: {order.reversal_reason}
              </p>
            )}
          </div>
        ))}
        {!filteredOrders.length && (
          <EmptyState
            title="No stocking orders found"
            copy="Create an order or change the history filters."
          />
        )}
      </div>
    </Panel>
  );
}
