import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for your tables
export type Branch = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Staff = {
  id: string;
  user_id: string;
  branch_id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'manager' | 'cashier';
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  branch_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  buying_price: number;
  selling_price: number;
  quantity: number;
  min_stock: number;
  unit: string;
  description: string | null;
  image_path: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  receipt_number: string;
  branch_id: string;
  cashier_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'lipa_namba' | 'card' | 'm-pesa';
  payment_status: 'pending' | 'completed' | 'refunded';
  notes: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export type Expense = {
  id: string;
  branch_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  branch_id: string;
  user_id: string | null;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
};
