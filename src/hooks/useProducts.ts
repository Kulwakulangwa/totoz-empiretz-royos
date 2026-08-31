import { useState, useEffect } from 'react';
import { supabase, Product } from '@/lib/supabase';
import { useAuth } from './use-auth';
import { getBranchUuid } from '@/lib/toto-data';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { staffProfile, isOwner } = useAuth();
  const branchId = staffProfile?.branch_id ? getBranchUuid(staffProfile.branch_id) : null;
  const canReadAllBranches = isOwner;

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('products').select('*');

      if (!canReadAllBranches && branchId) {
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
      if (!product.branch_id && !branchId) {
        throw new Error("No branch is assigned to this product.");
      }
      
      // Ensure branch_id is set
      const productData = {
        ...product,
        branch_id: product.branch_id || branchId!,
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

      let query = supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode);

      if (!canReadAllBranches && branchId) {
        query = query.eq('branch_id', branchId);
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
    if (branchId || canReadAllBranches) {
      fetchProducts();
    }
  }, [branchId, canReadAllBranches]);

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
