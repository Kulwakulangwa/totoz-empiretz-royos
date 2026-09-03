import React, { useEffect, useState } from 'react';
import { supabaseClient } from '@/integrations/supabase/client.browser';
import { useServerFn } from '@tanstack/react-start';
import { createOrder } from '@/lib/orders.functions';

type Product = { product_id: string; sku?: string; product_name: string };
type Location = { location_id: string; location_name: string; location_type: string };

export default function CreateOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Location[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [lines, setLines] = useState<Array<{ productId: string; allocations: Array<{ source: string; qty: number }> }>>([]);
  const [status, setStatus] = useState<string | null>(null);

  const createOrderFn = useServerFn(createOrder);

  useEffect(() => {
    (async () => {
      const { data: prods } = await supabaseClient.from('products').select('id, sku, name');
      setProducts((prods ?? []).map((p: any) => ({ product_id: p.id, sku: p.sku, product_name: p.name })));

      const { data: locs } = await supabaseClient.from('locations').select('id, name, type');
      const shops = (locs ?? []).filter((l: any) => l.type === 'shop').map((l: any) => ({ location_id: l.id, location_name: l.name, location_type: l.type }));
      const whs = (locs ?? []).filter((l: any) => l.type === 'warehouse').map((l: any) => ({ location_id: l.id, location_name: l.name, location_type: l.type }));
      setShops(shops);
      setWarehouses(whs);
      if (shops[0]) setSelectedShop(shops[0].location_id);
    })();
  }, []);

  async function lookupAvailability(productId: string) {
    const { data } = await supabaseClient.from('product_availability').select('*').eq('product_id', productId);
    return data ?? [];
  }

  async function addLine(productId: string) {
    const availability = await lookupAvailability(productId);
    const allocations = (availability as any[])
      .filter((a) => a.location_type === 'warehouse' && a.available > 0)
      .map((a) => ({ source: a.location_id, qty: 0 }));
    setLines((s) => [...s, { productId, allocations }]);
  }

  function updateAllocation(lineIdx: number, srcIdx: number, qty: number) {
    setLines((prev) => {
      const copy = [...prev];
      copy[lineIdx] = { ...copy[lineIdx] };
      copy[lineIdx].allocations = [...copy[lineIdx].allocations];
      copy[lineIdx].allocations[srcIdx] = { ...copy[lineIdx].allocations[srcIdx], qty };
      return copy;
    });
  }

  async function submitOrder() {
    if (!selectedShop) return setStatus('Select a shop');
    const items = [] as any[];
    for (const line of lines) {
      for (const alloc of line.allocations) {
        if (alloc.qty > 0) {
          items.push({ product_id: line.productId, source_location_id: alloc.source, qty: alloc.qty });
        }
      }
    }
    if (items.length === 0) return setStatus('Add line allocations before submitting');

    setStatus('Placing order...');
    try {
      await createOrderFn({ data: { shop_id: selectedShop, items } });
      setStatus('Order placed successfully (reserved)');
      setLines([]);
    } catch (err: any) {
      console.error(err);
      setStatus('Error placing order: ' + (err.message ?? String(err)));
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Order</h2>
      <div>
        <label>Shop: </label>
        <select value={selectedShop ?? ''} onChange={(e) => setSelectedShop(e.target.value)}>
          {shops.map((s) => (
            <option key={s.location_id} value={s.location_id}>
              {s.location_name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Add product: </label>
        <select id="product-select">
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.product_name} {p.sku ? `(${p.sku})` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const el = document.getElementById('product-select') as HTMLSelectElement | null;
            if (el) addLine(el.value);
          }}
        >
          Add line
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {lines.map((line, li) => {
          const prod = products.find((p) => p.product_id === line.productId);
          return (
            <div key={li} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
              <strong>{prod?.product_name}</strong>
              <div>
                {line.allocations.map((a, ai) => {
                  const wh = warehouses.find((w) => w.location_id === a.source);
                  return (
                    <div key={ai} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                      <div style={{ width: 240 }}>{wh?.location_name}</div>
                      <input
                        type="number"
                        min={0}
                        value={a.qty}
                        onChange={(e) => updateAllocation(li, ai, Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={submitOrder}>Submit Order</button>
      </div>

      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
