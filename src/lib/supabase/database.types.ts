export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'customer' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          sku: string | null;
          barcode: string | null;
          weight: number | null;
          weight_unit: string;
          category_id: string | null;
          images: string[];
          thumbnail: string | null;
          is_active: boolean;
          is_featured: boolean;
          grain_sizes: string[];
          tags: string[];
          meta_title: string | null;
          meta_description: string | null;
          dealer_price: number | null;
          distributor_price: number | null;
          moq: number;
          dealer_only: boolean;
          retail_only: boolean;
          pack_size: string | null;
          lead_time_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          short_description?: string | null;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          weight?: number | null;
          weight_unit?: string;
          category_id?: string | null;
          images?: string[];
          thumbnail?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          grain_sizes?: string[];
          tags?: string[];
          meta_title?: string | null;
          meta_description?: string | null;
          dealer_price?: number | null;
          distributor_price?: number | null;
          moq?: number;
          dealer_only?: boolean;
          retail_only?: boolean;
          pack_size?: string | null;
          lead_time_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          short_description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          sku?: string | null;
          barcode?: string | null;
          weight?: number | null;
          weight_unit?: string;
          category_id?: string | null;
          images?: string[];
          thumbnail?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          grain_sizes?: string[];
          tags?: string[];
          meta_title?: string | null;
          meta_description?: string | null;
          dealer_price?: number | null;
          distributor_price?: number | null;
          moq?: number;
          dealer_only?: boolean;
          retail_only?: boolean;
          pack_size?: string | null;
          lead_time_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          alt_text: string | null;
          sort_order: number;
          is_thumbnail: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_thumbnail?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_thumbnail?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      category_hub_overrides: {
        Row: {
          category_key: string;
          hero: Json;
          seo: Json;
          trust_points: Json;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          category_key: string;
          hero?: Json;
          seo?: Json;
          trust_points?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_key?: string;
          hero?: Json;
          seo?: Json;
          trust_points?: Json;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          reserved_quantity: number;
          low_stock_threshold: number;
          track_inventory: boolean;
          allow_backorder: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          reserved_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          allow_backorder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          reserved_quantity?: number;
          low_stock_threshold?: number;
          track_inventory?: boolean;
          allow_backorder?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          full_name: string;
          phone: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default_shipping: boolean;
          is_default_billing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          full_name: string;
          phone?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default_shipping?: boolean;
          is_default_billing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
          full_name?: string;
          phone?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          is_default_shipping?: boolean;
          is_default_billing?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          grain_size: string | null;
          unit_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity?: number;
          grain_size?: string | null;
          unit_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          grain_size?: string | null;
          unit_price?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          email: string;
          phone: string | null;
          status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_method: string | null;
          subtotal: number;
          shipping_cost: number;
          tax_amount: number;
          discount_amount: number;
          total: number;
          currency: string;
          shipping_address: Json;
          billing_address: Json;
          notes: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          shippo_rate_id: string | null;
          shippo_transaction_id: string | null;
          shipping_carrier: string | null;
          shipping_service: string | null;
          label_url: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          source_purchase_request_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          email: string;
          phone?: string | null;
          status?: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_method?: string | null;
          subtotal: number;
          shipping_cost?: number;
          tax_amount?: number;
          discount_amount?: number;
          total: number;
          currency?: string;
          shipping_address: Json;
          billing_address: Json;
          notes?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          shippo_rate_id?: string | null;
          shippo_transaction_id?: string | null;
          shipping_carrier?: string | null;
          shipping_service?: string | null;
          label_url?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          source_purchase_request_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          email?: string;
          phone?: string | null;
          status?: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_method?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          tax_amount?: number;
          discount_amount?: number;
          total?: number;
          currency?: string;
          shipping_address?: Json;
          billing_address?: Json;
          notes?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          shippo_rate_id?: string | null;
          shippo_transaction_id?: string | null;
          shipping_carrier?: string | null;
          shipping_service?: string | null;
          label_url?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          source_purchase_request_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image: string | null;
          quantity: number;
          grain_size: string | null;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_image?: string | null;
          quantity: number;
          grain_size?: string | null;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string | null;
          quantity?: number;
          grain_size?: string | null;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string | null;
          featured_image: string | null;
          author_id: string | null;
          category: string | null;
          tags: string[];
          is_published: boolean;
          published_at: string | null;
          meta_title: string | null;
          meta_description: string | null;
          read_time: number;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string | null;
          featured_image?: string | null;
          author_id?: string | null;
          category?: string | null;
          tags?: string[];
          is_published?: boolean;
          published_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          read_time?: number;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: string | null;
          featured_image?: string | null;
          author_id?: string | null;
          category?: string | null;
          tags?: string[];
          is_published?: boolean;
          published_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          read_time?: number;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'order' | 'promotion' | 'system' | 'reminder';
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'order' | 'promotion' | 'system' | 'reminder';
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'order' | 'promotion' | 'system' | 'reminder';
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          comment: string | null;
          is_verified_purchase: boolean;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          is_verified_purchase?: boolean;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      dealer_applications: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          owner_name: string;
          business_email: string;
          phone: string;
          website: string | null;
          business_type: string;
          years_in_business: number | null;
          country: string;
          state: string;
          city: string;
          zip: string;
          address: string;
          monthly_purchase: string | null;
          products_interested: string[];
          sales_channels: string[];
          notes: string | null;
          status: 'pending' | 'under_review' | 'need_more_info' | 'approved' | 'rejected' | 'suspended';
          status_reason: string | null;
          dealer_level: 'bronze' | 'silver' | 'gold' | 'platinum';
          credit_terms: number;
          tax_exempt: boolean;
          credit_limit: number | null;
          sales_rep_id: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          owner_name: string;
          business_email: string;
          phone: string;
          website?: string | null;
          business_type: string;
          years_in_business?: number | null;
          country: string;
          state: string;
          city: string;
          zip: string;
          address: string;
          monthly_purchase?: string | null;
          products_interested?: string[];
          sales_channels?: string[];
          notes?: string | null;
          status?: 'pending' | 'under_review' | 'need_more_info' | 'approved' | 'rejected' | 'suspended';
          status_reason?: string | null;
          dealer_level?: 'bronze' | 'silver' | 'gold' | 'platinum';
          credit_terms?: number;
          tax_exempt?: boolean;
          credit_limit?: number | null;
          sales_rep_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          owner_name?: string;
          business_email?: string;
          phone?: string;
          website?: string | null;
          business_type?: string;
          years_in_business?: number | null;
          country?: string;
          state?: string;
          city?: string;
          zip?: string;
          address?: string;
          monthly_purchase?: string | null;
          products_interested?: string[];
          sales_channels?: string[];
          notes?: string | null;
          status?: 'pending' | 'under_review' | 'need_more_info' | 'approved' | 'rejected' | 'suspended';
          status_reason?: string | null;
          dealer_level?: 'bronze' | 'silver' | 'gold' | 'platinum';
          credit_terms?: number;
          tax_exempt?: boolean;
          credit_limit?: number | null;
          sales_rep_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dealer_documents: {
        Row: {
          id: string;
          application_id: string;
          document_type: 'reseller_permit' | 'business_license' | 'tax_certificate' | 'additional';
          file_path: string;
          file_name: string;
          mime_type: string | null;
          file_size: number | null;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          document_type: 'reseller_permit' | 'business_license' | 'tax_certificate' | 'additional';
          file_path: string;
          file_name: string;
          mime_type?: string | null;
          file_size?: number | null;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          document_type?: 'reseller_permit' | 'business_license' | 'tax_certificate' | 'additional';
          file_path?: string;
          file_name?: string;
          mime_type?: string | null;
          file_size?: number | null;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
      };
      dealer_notes: {
        Row: {
          id: string;
          application_id: string;
          admin_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          admin_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          admin_id?: string;
          note?: string;
          created_at?: string;
        };
      };
      dealer_audit_log: {
        Row: {
          id: string;
          application_id: string;
          actor_id: string | null;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          actor_id?: string | null;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          actor_id?: string | null;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
      };
      dealer_emails: {
        Row: {
          id: string;
          application_id: string;
          email_type: string;
          sent_to: string;
          subject: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          email_type: string;
          sent_to: string;
          subject: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          email_type?: string;
          sent_to?: string;
          subject?: string;
          sent_at?: string;
        };
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string;
          message?: string;
          created_at?: string;
        };
      };
      wholesale_purchase_requests: {
        Row: {
          id: string;
          request_number: string;
          dealer_id: string;
          dealer_application_id: string;
          status:
            | 'submitted'
            | 'ready_for_review'
            | 'waiting_stock'
            | 'stock_verified'
            | 'approved'
            | 'rejected'
            | 'changes_requested'
            | 'payment_pending'
            | 'paid'
            | 'converted'
            | 'cancelled';
          dealer_po_reference: string | null;
          subtotal: number;
          shipping_cost: number;
          tax_amount: number;
          total: number;
          currency: string;
          shipping_address: Json;
          billing_address: Json | null;
          dealer_notes: string | null;
          rejection_reason: string | null;
          change_request_note: string | null;
          expected_dispatch_date: string | null;
          payment_method: 'bank_transfer' | 'cash' | null;
          payment_confirmed_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          converted_order_id: string | null;
          converted_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_number?: string;
          dealer_id: string;
          dealer_application_id: string;
          status?:
            | 'submitted'
            | 'ready_for_review'
            | 'waiting_stock'
            | 'stock_verified'
            | 'approved'
            | 'rejected'
            | 'changes_requested'
            | 'payment_pending'
            | 'paid'
            | 'converted'
            | 'cancelled';
          dealer_po_reference?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          tax_amount?: number;
          total?: number;
          currency?: string;
          shipping_address: Json;
          billing_address?: Json | null;
          dealer_notes?: string | null;
          rejection_reason?: string | null;
          change_request_note?: string | null;
          expected_dispatch_date?: string | null;
          payment_method?: 'bank_transfer' | 'cash' | null;
          payment_confirmed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          converted_order_id?: string | null;
          converted_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_number?: string;
          dealer_id?: string;
          dealer_application_id?: string;
          status?:
            | 'submitted'
            | 'ready_for_review'
            | 'waiting_stock'
            | 'stock_verified'
            | 'approved'
            | 'rejected'
            | 'changes_requested'
            | 'payment_pending'
            | 'paid'
            | 'converted'
            | 'cancelled';
          dealer_po_reference?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          tax_amount?: number;
          total?: number;
          currency?: string;
          shipping_address?: Json;
          billing_address?: Json | null;
          dealer_notes?: string | null;
          rejection_reason?: string | null;
          change_request_note?: string | null;
          expected_dispatch_date?: string | null;
          payment_method?: 'bank_transfer' | 'cash' | null;
          payment_confirmed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          converted_order_id?: string | null;
          converted_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      wholesale_purchase_request_items: {
        Row: {
          id: string;
          purchase_request_id: string;
          product_id: string;
          product_name: string;
          product_image: string | null;
          moq_snapshot: number;
          unit_price: number;
          quantity: number;
          admin_adjusted_unit_price: number | null;
          admin_adjusted_quantity: number | null;
          stock_verified: boolean;
          auto_stock_check: 'available' | 'insufficient' | null;
          auto_stock_available_qty: number | null;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          product_id: string;
          product_name: string;
          product_image?: string | null;
          moq_snapshot?: number;
          unit_price: number;
          quantity: number;
          admin_adjusted_unit_price?: number | null;
          admin_adjusted_quantity?: number | null;
          stock_verified?: boolean;
          auto_stock_check?: 'available' | 'insufficient' | null;
          auto_stock_available_qty?: number | null;
          line_total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string | null;
          moq_snapshot?: number;
          unit_price?: number;
          quantity?: number;
          admin_adjusted_unit_price?: number | null;
          admin_adjusted_quantity?: number | null;
          stock_verified?: boolean;
          auto_stock_check?: 'available' | 'insufficient' | null;
          auto_stock_available_qty?: number | null;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      wholesale_purchase_request_notes: {
        Row: {
          id: string;
          purchase_request_id: string;
          admin_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          admin_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          admin_id?: string;
          note?: string;
          created_at?: string;
        };
      };
      wholesale_purchase_request_audit: {
        Row: {
          id: string;
          purchase_request_id: string;
          actor_id: string | null;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          actor_id?: string | null;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          actor_id?: string | null;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
      };
      wholesale_purchase_request_emails: {
        Row: {
          id: string;
          purchase_request_id: string;
          email_type: string;
          sent_to: string;
          subject: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          email_type: string;
          sent_to: string;
          subject: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          email_type?: string;
          sent_to?: string;
          subject?: string;
          sent_at?: string;
        };
      };
      wholesale_purchase_request_messages: {
        Row: {
          id: string;
          purchase_request_id: string;
          sender_id: string;
          sender_role: 'dealer' | 'admin';
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          sender_id: string;
          sender_role: 'dealer' | 'admin';
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          sender_id?: string;
          sender_role?: 'dealer' | 'admin';
          message?: string;
          created_at?: string;
        };
      };
      wholesale_purchase_request_invoices: {
        Row: {
          id: string;
          purchase_request_id: string;
          invoice_type: 'proforma' | 'commercial';
          version: number;
          invoice_number: string;
          snapshot: Json;
          pdf_path: string;
          issued_by: string | null;
          issued_at: string;
          supersede_reason: string | null;
        };
        Insert: {
          id?: string;
          purchase_request_id: string;
          invoice_type: 'proforma' | 'commercial';
          version: number;
          invoice_number?: string;
          snapshot: Json;
          pdf_path: string;
          issued_by?: string | null;
          issued_at?: string;
          supersede_reason?: string | null;
        };
        Update: {
          id?: string;
          purchase_request_id?: string;
          invoice_type?: 'proforma' | 'commercial';
          version?: number;
          invoice_number?: string;
          snapshot?: Json;
          pdf_path?: string;
          issued_by?: string | null;
          issued_at?: string;
          supersede_reason?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      convert_wholesale_purchase_request: {
        Args: { p_request_id: string; p_admin_id: string };
        // Not self-referencing Database['public']['Tables']['orders']['Row']
        // here — that circular reference confuses the .rpc() generic
        // resolution. The caller (serverConvertPurchaseRequest.ts) casts
        // the result to Order explicitly.
        Returns: Record<string, unknown>;
      };
    };
    Enums: {
      order_status:
        | 'pending'
        | 'confirmed'
        | 'processing'
        | 'packed'
        | 'shipped'
        | 'delivered'
        | 'cancelled'
        | 'refunded';
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
      user_role: 'customer' | 'admin';
      notification_type: 'order' | 'promotion' | 'system' | 'reminder';
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Specific types for easier use
export type Profile = Tables<'profiles'>;
export type Category = Tables<'categories'>;
export type Product = Tables<'products'>;
export type ProductImage = Tables<'product_images'>;
export type Inventory = Tables<'inventory'>;
export type Address = Tables<'addresses'>;
export type Cart = Tables<'carts'>;
export type CartItem = Tables<'cart_items'>;
export type Wishlist = Tables<'wishlists'>;
export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type BlogPost = Tables<'blog_posts'>;
export type Notification = Tables<'notifications'>;
export type Review = Tables<'reviews'>;
export type DealerApplication = Tables<'dealer_applications'>;
export type DealerDocument = Tables<'dealer_documents'>;
export type DealerNote = Tables<'dealer_notes'>;
export type DealerAuditLogEntry = Tables<'dealer_audit_log'>;
export type DealerEmailLogEntry = Tables<'dealer_emails'>;
export type DealerApplicationWithDocuments = DealerApplication & { dealer_documents: DealerDocument[] };
export type WholesalePurchaseRequest = Tables<'wholesale_purchase_requests'>;
export type WholesalePurchaseRequestItem = Tables<'wholesale_purchase_request_items'>;
export type WholesalePurchaseRequestNote = Tables<'wholesale_purchase_request_notes'>;
export type WholesalePurchaseRequestAuditEntry = Tables<'wholesale_purchase_request_audit'>;
export type WholesalePurchaseRequestEmailLogEntry = Tables<'wholesale_purchase_request_emails'>;
export type WholesalePurchaseRequestMessage = Tables<'wholesale_purchase_request_messages'>;
export type WholesalePurchaseRequestInvoice = Tables<'wholesale_purchase_request_invoices'>;
export type WholesalePurchaseRequestWithItems = WholesalePurchaseRequest & {
  wholesale_purchase_request_items: WholesalePurchaseRequestItem[];
};

// Product with relations
export type ProductWithCategory = Product & {
  category: Category | null;
  inventory: Inventory | null;
  product_images?: ProductImage[];
  reviews?: Review[];
};

// Cart with items
export type CartWithItems = Cart & {
  cart_items: (CartItem & { product: Product })[];
};

// Order with items
export type OrderWithItems = Order & {
  order_items: OrderItem[];
};
