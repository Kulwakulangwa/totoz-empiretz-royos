export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      branches: {
        Row: { id: string; name: string; code: string; location_type: Database["public"]["Enums"]["location_type"]; address: string | null; phone: string | null; is_active: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; code: string; location_type?: Database["public"]["Enums"]["location_type"]; address?: string | null; phone?: string | null; is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; code?: string; location_type?: Database["public"]["Enums"]["location_type"]; address?: string | null; phone?: string | null; is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      catalog_products: {
        Row: { id: string; sku: string; barcode: string | null; name: string; category: string | null; unit: string; selling_price: number; description: string | null; image_path: string | null; is_active: boolean; created_in_warehouse_id: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; sku: string; barcode?: string | null; name: string; category?: string | null; unit?: string; selling_price?: number; description?: string | null; image_path?: string | null; is_active?: boolean; created_in_warehouse_id?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; sku?: string; barcode?: string | null; name?: string; category?: string | null; unit?: string; selling_price?: number; description?: string | null; image_path?: string | null; is_active?: boolean; created_in_warehouse_id?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      inventory_balances: {
        Row: { location_id: string; product_id: string; quantity: number; average_unit_cost: number; min_stock: number; updated_at: string }
        Insert: { location_id: string; product_id: string; quantity?: number; average_unit_cost?: number; min_stock?: number; updated_at?: string }
        Update: { location_id?: string; product_id?: string; quantity?: number; average_unit_cost?: number; min_stock?: number; updated_at?: string }
        Relationships: []
      }
      inventory_movements: {
        Row: { id: string; location_id: string; product_id: string; movement_type: string; quantity_delta: number; unit_cost: number; reference_type: string | null; reference_id: string | null; notes: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; location_id: string; product_id: string; movement_type: string; quantity_delta: number; unit_cost?: number; reference_type?: string | null; reference_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string }
        Update: { id?: string; location_id?: string; product_id?: string; movement_type?: string; quantity_delta?: number; unit_cost?: number; reference_type?: string | null; reference_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string }
        Relationships: []
      }
      stock_orders: {
        Row: { id: string; order_number: string; destination_shop_id: string; idempotency_key: string; status: Database["public"]["Enums"]["stock_order_status"]; created_by: string; created_at: string; completed_at: string; reversed_by: string | null; reversed_at: string | null; reversal_reason: string | null }
        Insert: { id?: string; order_number: string; destination_shop_id: string; idempotency_key: string; status?: Database["public"]["Enums"]["stock_order_status"]; created_by: string; created_at?: string; completed_at?: string; reversed_by?: string | null; reversed_at?: string | null; reversal_reason?: string | null }
        Update: { id?: string; order_number?: string; destination_shop_id?: string; idempotency_key?: string; status?: Database["public"]["Enums"]["stock_order_status"]; created_by?: string; created_at?: string; completed_at?: string; reversed_by?: string | null; reversed_at?: string | null; reversal_reason?: string | null }
        Relationships: []
      }
      stock_order_items: {
        Row: { id: string; order_id: string; product_id: string; total_quantity: number }
        Insert: { id?: string; order_id: string; product_id: string; total_quantity: number }
        Update: { id?: string; order_id?: string; product_id?: string; total_quantity?: number }
        Relationships: []
      }
      stock_allocations: {
        Row: { id: string; order_item_id: string; warehouse_id: string; quantity: number; unit_cost_snapshot: number }
        Insert: { id?: string; order_item_id: string; warehouse_id: string; quantity: number; unit_cost_snapshot: number }
        Update: { id?: string; order_item_id?: string; warehouse_id?: string; quantity?: number; unit_cost_snapshot?: number }
        Relationships: []
      }
      warehouse_receipts: {
        Row: { id: string; receipt_number: string; warehouse_id: string; created_by: string; notes: string | null; created_at: string }
        Insert: { id?: string; receipt_number: string; warehouse_id: string; created_by: string; notes?: string | null; created_at?: string }
        Update: { id?: string; receipt_number?: string; warehouse_id?: string; created_by?: string; notes?: string | null; created_at?: string }
        Relationships: []
      }
      warehouse_receipt_items: {
        Row: { id: string; receipt_id: string; product_id: string; quantity: number; unit_cost: number }
        Insert: { id?: string; receipt_id: string; product_id: string; quantity: number; unit_cost: number }
        Update: { id?: string; receipt_id?: string; product_id?: string; quantity?: number; unit_cost?: number }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          branch_id: string
          user_id: string | null
          action: string
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          user_id?: string | null
          action: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          user_id?: string | null
          action?: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          branch_id: string
          category: string
          description: string | null
          amount: number
          expense_date: string
          receipt_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          category: string
          description?: string | null
          amount: number
          expense_date: string
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          category?: string
          description?: string | null
          amount?: number
          expense_date?: string
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          branch?: string
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          branch?: string
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          branch_id: string
          name: string
          sku: string
          barcode: string | null
          category: string | null
          buying_price: number
          selling_price: number
          quantity: number
          min_stock: number
          unit: string
          description: string | null
          image_path: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          name: string
          sku: string
          barcode?: string | null
          category?: string | null
          buying_price: number
          selling_price: number
          quantity?: number
          min_stock?: number
          unit?: string
          description?: string | null
          image_path?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          name?: string
          sku?: string
          barcode?: string | null
          category?: string | null
          buying_price?: number
          selling_price?: number
          quantity?: number
          min_stock?: number
          unit?: string
          description?: string | null
          image_path?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          catalog_product_id: string | null
          product_name: string
          sku: string | null
          barcode: string | null
          quantity: number
          unit_price: number
          unit_cost: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          catalog_product_id?: string | null
          product_name: string
          sku?: string | null
          barcode?: string | null
          quantity: number
          unit_price: number
          unit_cost?: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string | null
          catalog_product_id?: string | null
          product_name?: string
          sku?: string | null
          barcode?: string | null
          quantity?: number
          unit_price?: number
          unit_cost?: number
          total_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          id: string
          receipt_number: string
          branch_id: string
          cashier_id: string | null
          customer_name: string | null
          customer_phone: string | null
          subtotal: number
          tax: number
          discount: number
          total: number
          payment_method: string
          payment_status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receipt_number: string
          branch_id: string
          cashier_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          subtotal: number
          tax?: number
          discount?: number
          total: number
          payment_method: string
          payment_status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receipt_number?: string
          branch_id?: string
          cashier_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          subtotal?: number
          tax?: number
          discount?: number
          total?: number
          payment_method?: string
          payment_status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          id: string
          user_id: string
          branch_id: string
          full_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          branch_id: string
          full_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          branch_id?: string
          full_name?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      warehouse_availability: {
        Row: { warehouse_id: string | null; warehouse_name: string | null; product_id: string | null; sku: string | null; barcode: string | null; product_name: string | null; category: string | null; unit: string | null; selling_price: number | null; image_path: string | null; quantity: number | null }
        Relationships: []
      }
    }
    Functions: {
      decrement_product_quantity: {
        Args: {
          product_id: string
          quantity_to_decrement: number
        }
        Returns: undefined
      }
      decrement_product_quantity_by_sku: {
        Args: {
          product_branch_id: string
          product_sku: string
          quantity_to_decrement: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      create_stock_order: { Args: { _destination_shop_id: string; _idempotency_key: string; _allocations: Json }; Returns: string }
      reverse_stock_order: { Args: { _order_id: string; _reason: string }; Returns: undefined }
      receive_warehouse_stock: { Args: { _warehouse_id: string; _product_id: string; _quantity: number; _unit_cost: number; _notes?: string | null }; Returns: string }
      receive_new_warehouse_product: { Args: { _warehouse_id: string; _name: string; _sku: string; _barcode: string | null; _category: string | null; _unit: string; _selling_price: number; _quantity: number; _unit_cost: number; _notes?: string | null }; Returns: string }
      create_shop_sale: { Args: { _shop_id: string; _payment_method: string; _lines: Json }; Returns: string }
      restock_shop_inventory: { Args: { _shop_id: string; _product_id: string; _quantity: number; _reference_id?: string | null }; Returns: undefined }
      adjust_warehouse_inventory: { Args: { _warehouse_id: string; _product_id: string; _quantity_delta: number; _reason: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "manager" | "cashier"
      location_type: "shop" | "warehouse"
      stock_order_status: "completed" | "reversed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "cashier"],
      location_type: ["shop", "warehouse"],
      stock_order_status: ["completed", "reversed"],
    },
  },
} as const
