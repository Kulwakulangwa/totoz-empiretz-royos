import { useState, useEffect } from 'react';
import { supabase, Product } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { branchId, isOwner, isManager } = useAuth();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('products').select('*');

      // If not owner, only show products from their branch
      if (!isOwner) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      // Ensure branch_id is set
      const productData = {
        ...product,
        branch_id: product.branch_id || branchId,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data]);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding product:', err);
      return { data: null, error: err };
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === id ? data : p));
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating product:', err);
      return { data: null, error: err };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting product:', err);
      return { error: err };
    }
  };

  const findProductByBarcode = async (barcode: string) => {
    try {
      setError(null);

      const query = supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode);

      // If not owner, scope to branch
      if (!isOwner) {
        query.eq('branch_id', branchId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      if (err.code === 'PGRST116') {
        // No product found with this barcode
        return { data: null, error: null };
      }
      setError(err.message);
      return { data: null, error: err };
    }
  };

  useEffect(() => {
    if (branchId || isOwner) {
      fetchProducts();
    }
  }, [branchId, isOwner]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    findProductByBarcode,
  };
}
