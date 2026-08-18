import { useState, useEffect } from 'react';
import { supabase, Sale, SaleItem } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useSales() {
  const [sales, setSales] = useState<(Sale & { items?: SaleItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { branchId, staff, isOwner } = useAuth();

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sales')
        .select(`
          *,
          cashier:staff(full_name)
        `);

      if (!isOwner) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSale = async (saleData: {
    items: Omit<SaleItem, 'id' | 'sale_id' | 'created_at'>[];
    customer_name?: string;
    customer_phone?: string;
    payment_method: Sale['payment_method'];
    discount?: number;
    notes?: string;
  }) => {
    try {
      setError(null);

      // Calculate totals
      const subtotal = saleData.items.reduce((sum, item) => sum + item.total_price, 0);
      const discount = saleData.discount || 0;
      const tax = 0; // You can implement tax logic here
      const total = subtotal - discount + tax;

      // Generate receipt number
      const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Start transaction
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          receipt_number: receiptNumber,
          branch_id: branchId,
          cashier_id: staff?.id,
          customer_name: saleData.customer_name || null,
          customer_phone: saleData.customer_phone || null,
          subtotal,
          tax,
          discount,
          total,
          payment_method: saleData.payment_method,
          payment_status: 'completed',
          notes: saleData.notes || null,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      const saleItems = saleData.items.map(item => ({
        ...item,
        sale_id: sale.id,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update inventory quantities
      for (const item of saleData.items) {
        if (item.product_id) {
          const { error: updateError } = await supabase.rpc('decrement_product_quantity', {
            product_id: item.product_id,
            quantity_to_decrement: item.quantity,
          });

          if (updateError) {
            console.error('Error updating inventory:', updateError);
            // You might want to handle this more gracefully
          }
        }
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert([{
          branch_id: branchId,
          user_id: staff?.id,
          action: 'sale_created',
          details: {
            receipt_number: receiptNumber,
            total: total,
            items_count: saleData.items.length,
          },
        }]);

      // Refresh sales list
      await fetchSales();

      return { data: { sale, items: saleItems }, error: null };
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating sale:', err);
      return { data: null, error: err };
    }
  };

  const getSaleByReceipt = async (receiptNumber: string) => {
    try {
      setError(null);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          cashier:staff(full_name),
          items:sale_items(*)
        `)
        .eq('receipt_number', receiptNumber)
        .single();

      if (saleError) throw saleError;
      return { data: sale, error: null };
    } catch (err: any) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  useEffect(() => {
    if (branchId || isOwner) {
      fetchSales();
    }
  }, [branchId, isOwner]);

  return {
    sales,
    loading,
    error,
    fetchSales,
    createSale,
    getSaleByReceipt,
  };
}
