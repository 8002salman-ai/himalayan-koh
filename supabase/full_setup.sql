-- =============================================
-- HIMALAYAN KOH DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('order', 'promotion', 'system', 'reminder');

-- =============================================
-- PROFILES TABLE
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- CATEGORIES TABLE
-- =============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =============================================
-- PRODUCTS TABLE
-- =============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10, 2) CHECK (compare_at_price >= 0),
  cost_price DECIMAL(10, 2) CHECK (cost_price >= 0),
  sku TEXT UNIQUE,
  barcode TEXT,
  weight DECIMAL(10, 2),
  weight_unit TEXT DEFAULT 'lbs',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}',
  thumbnail TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  grain_sizes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- =============================================
-- INVENTORY TABLE
-- =============================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  track_inventory BOOLEAN DEFAULT true,
  allow_backorder BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity) WHERE quantity <= low_stock_threshold;

-- =============================================
-- ADDRESSES TABLE
-- =============================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  is_default_shipping BOOLEAN DEFAULT false,
  is_default_billing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Ensure only one default shipping/billing address per user
CREATE UNIQUE INDEX idx_addresses_default_shipping 
  ON addresses(user_id) WHERE is_default_shipping = true;
CREATE UNIQUE INDEX idx_addresses_default_billing 
  ON addresses(user_id) WHERE is_default_billing = true;

-- =============================================
-- CARTS TABLE
-- =============================================

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);

-- =============================================
-- CART ITEMS TABLE
-- =============================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  grain_size TEXT,
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id, grain_size)
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- =============================================
-- WISHLISTS TABLE
-- =============================================

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_wishlists_product ON wishlists(product_id);

-- =============================================
-- ORDERS TABLE
-- =============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  payment_method TEXT,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  currency TEXT DEFAULT 'USD',
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  notes TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'HK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  grain_size TEXT,
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- =============================================
-- BLOG POSTS TABLE
-- =============================================

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  read_time INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);

-- =============================================
-- REVIEWS TABLE
-- =============================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'customer');

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- =============================================
-- CATEGORIES POLICIES
-- =============================================

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- =============================================
-- PRODUCTS POLICIES
-- =============================================

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Admins can manage products
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin());

-- =============================================
-- INVENTORY POLICIES
-- =============================================

-- Anyone can view inventory (for stock status)
CREATE POLICY "Anyone can view inventory"
  ON inventory FOR SELECT
  USING (true);

-- Only admins can modify inventory
CREATE POLICY "Admins can manage inventory"
  ON inventory FOR ALL
  USING (is_admin());

-- =============================================
-- ADDRESSES POLICIES
-- =============================================

-- Users can view own addresses
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own addresses
CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all addresses
CREATE POLICY "Admins can manage addresses"
  ON addresses FOR ALL
  USING (is_admin());

-- =============================================
-- CARTS POLICIES
-- =============================================

-- Users can view own cart
CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Users can create cart
CREATE POLICY "Users can create cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

-- Users can update own cart
CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Users can delete own cart
CREATE POLICY "Users can delete own cart"
  ON carts FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- CART ITEMS POLICIES
-- =============================================

-- Users can view own cart items
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.session_id IS NOT NULL)
    )
  );

-- Users can manage own cart items
CREATE POLICY "Users can manage cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.session_id IS NOT NULL)
    )
  );

-- =============================================
-- WISHLISTS POLICIES
-- =============================================

-- Users can view own wishlist
CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage own wishlist
CREATE POLICY "Users can manage wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- ORDERS POLICIES
-- =============================================

-- Users can view own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can update orders
CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL
  USING (is_admin());

-- =============================================
-- ORDER ITEMS POLICIES
-- =============================================

-- Users can view own order items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Order items are created with orders
CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
  );

-- Admins can manage order items
CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  USING (is_admin());

-- =============================================
-- BLOG POSTS POLICIES
-- =============================================

-- Anyone can view published posts
CREATE POLICY "Anyone can view published posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- Admins can manage posts
CREATE POLICY "Admins can manage posts"
  ON blog_posts FOR ALL
  USING (is_admin());

-- =============================================
-- REVIEWS POLICIES
-- =============================================

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

-- Users can view own reviews
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create reviews
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage reviews
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  USING (is_admin());

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage notifications
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  USING (is_admin());
-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('blog', 'blog', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('categories', 'categories', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Products bucket policies
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Avatars bucket policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Blog bucket policies
CREATE POLICY "Anyone can view blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog');

CREATE POLICY "Admins can manage blog images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'blog'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Categories bucket policies
CREATE POLICY "Anyone can view category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories');

CREATE POLICY "Admins can manage category images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'categories'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
-- Sync profile role from auth metadata on signup (admin/customer demo accounts)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
BEGIN
  BEGIN
    requested_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'customer'::user_role
    );
  EXCEPTION
    WHEN others THEN
      requested_role := 'customer'::user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Harden profile creation trigger for Supabase Auth admin user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
BEGIN
  BEGIN
    requested_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'customer'::public.user_role
    );
  EXCEPTION
    WHEN others THEN
      requested_role := 'customer'::public.user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
-- =============================================
-- SEED DATA FOR HIMALAYAN KOH
-- =============================================

-- Insert Categories (idempotent)
INSERT INTO categories (id, name, slug, description, image_url, sort_order) VALUES
  ('c1a00001-0000-4000-8000-000000000001', 'Salt Lick for Horses', 'salt-lick-horses', 'Natural Himalayan salt licks specially designed for horses. Rich in 84 trace minerals.', 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg', 1),
  ('c1a00001-0000-4000-8000-000000000002', 'Salt Lumps for Cattle', 'salt-lumps-cattle', 'Essential minerals in natural salt lumps for cattle health.', 'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg', 2),
  ('c1a00001-0000-4000-8000-000000000003', 'Salt Blocks for Deer', 'salt-blocks-deer', 'Premium salt blocks attract and nourish deer naturally.', 'https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg', 3),
  ('c1a00001-0000-4000-8000-000000000004', 'Edible Cooking Salt', 'edible-cooking-salt', 'Premium pink salt for gourmet cooking and everyday use.', 'https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Insert Products (idempotent)
INSERT INTO products (id, name, slug, description, short_description, price, compare_at_price, category_id, images, thumbnail, is_featured, grain_sizes, tags) VALUES
  (
    'a1d00001-0000-4000-8000-000000000001',
    'Himalayan Koh Authentic Pure Natural Halal Unprocessed Himalayan Edible Pink Cooking Salt, Fine Grain (0.5mm to 1mm)',
    'himalayan-edible-pink-salt-fine',
    '100% Natural & Unrefined â€“ No additives, anti-caking agents, or chemicals. Rich in Trace Minerals â€“ Over 80 essential minerals. Kosher & Vegan Friendly. Great for cooking, bath soaks, salt lamps, and more.',
    '100% Natural & Unrefined pink salt with 80+ essential minerals.',
    9.95,
    12.95,
    'c1a00001-0000-4000-8000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp'],
    'https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp',
    true,
    ARRAY['Fine (0.5mm-1mm)', 'Medium (1mm-2mm)', 'Coarse (2mm-5mm)'],
    ARRAY['edible', 'cooking', 'fine grain', 'natural', 'kosher']
  ),
  (
    'a1d00001-0000-4000-8000-000000000002',
    'Himalayan Edible Pink Salt â€“ 16 oz Jar',
    'himalayan-pink-salt-16oz-jar',
    'Premium 16 oz jar of pure Himalayan pink salt. Perfect for everyday cooking and table use. Contains 84+ trace minerals.',
    'Premium 16 oz jar for everyday cooking.',
    9.95,
    NULL,
    'c1a00001-0000-4000-8000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg',
    false,
    ARRAY['Fine', 'Coarse'],
    ARRAY['edible', 'jar', 'table salt']
  ),
  (
    'a1d00001-0000-4000-8000-000000000003',
    'Himalayan Rock Salt Pouches in Fine and Coarse Grain Sizes â€“ 6 lbs',
    'himalayan-rock-salt-6lbs-pouch',
    '6 lbs pouch of premium Himalayan rock salt available in fine and coarse grain sizes. Perfect for families and bulk cooking.',
    '6 lbs pouch available in fine and coarse grain.',
    17.95,
    NULL,
    'c1a00001-0000-4000-8000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg'],
    'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg',
    false,
    ARRAY['Fine', 'Coarse'],
    ARRAY['bulk', 'pouch', 'family size']
  ),
  (
    'a1d00001-0000-4000-8000-000000000004',
    'Bag of Himalayan Pink Salt for Livestock (45 lbs.)',
    'himalayan-livestock-salt-45lbs',
    '45 lb bag of premium Himalayan pink salt for livestock. Essential minerals for cattle and horses. Long lasting and economical.',
    '45 lb bag for livestock with essential minerals.',
    99.95,
    119.95,
    'c1a00001-0000-4000-8000-000000000002',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    true,
    ARRAY[]::text[],
    ARRAY['bulk', 'livestock', 'cattle', 'horses', '45lbs']
  ),
  (
    'a1d00001-0000-4000-8000-000000000005',
    'Himalayan Pink Salt Licks for Horses',
    'himalayan-salt-licks-horses',
    'Natural Himalayan pink salt licks specially designed for horses. Rich in 84 trace minerals. Helps maintain electrolyte balance.',
    'Natural salt licks for horses with 84 minerals.',
    9.95,
    14.95,
    'c1a00001-0000-4000-8000-000000000001',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg'],
    'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    true,
    ARRAY[]::text[],
    ARRAY['horses', 'salt lick', 'equine', 'minerals']
  ),
  (
    'a1d00001-0000-4000-8000-000000000006',
    'Himalayan Salt Rock for Cattle 18 Lbs Bag',
    'himalayan-salt-cattle-18lbs',
    '18 lb bag of Himalayan salt rocks for cattle. Natural and unprocessed. Perfect size for medium farms.',
    '18 lb bag of natural salt rocks for cattle.',
    49.95,
    NULL,
    'c1a00001-0000-4000-8000-000000000002',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    false,
    ARRAY[]::text[],
    ARRAY['cattle', 'salt rock', '18lbs', 'farm']
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  category_id = EXCLUDED.category_id,
  images = EXCLUDED.images,
  thumbnail = EXCLUDED.thumbnail,
  is_featured = EXCLUDED.is_featured,
  grain_sizes = EXCLUDED.grain_sizes,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Insert Inventory for each product (idempotent)
INSERT INTO inventory (product_id, quantity, low_stock_threshold) VALUES
  ('a1d00001-0000-4000-8000-000000000001', 500, 50),
  ('a1d00001-0000-4000-8000-000000000002', 300, 30),
  ('a1d00001-0000-4000-8000-000000000003', 250, 25),
  ('a1d00001-0000-4000-8000-000000000004', 100, 10),
  ('a1d00001-0000-4000-8000-000000000005', 400, 40),
  ('a1d00001-0000-4000-8000-000000000006', 150, 15)
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = NOW();

-- Insert Blog Posts (idempotent)
INSERT INTO blog_posts (id, title, slug, excerpt, content, featured_image, category, tags, is_published, published_at, read_time) VALUES
  (
    'b1e00001-0000-4000-8000-000000000001',
    'Why do dairy cows need trace minerals?',
    'why-dairy-cows-need-trace-minerals',
    'Discover the essential role trace minerals play in dairy cow health, milk production, and overall farm productivity.',
    '<p>Trace minerals are essential nutrients that dairy cows need in small amounts but play crucial roles in their health and productivity...</p><h2>The Importance of Trace Minerals</h2><p>Dairy cows require a balanced diet that includes essential trace minerals like zinc, copper, selenium, and manganese...</p>',
    'https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg',
    'Livestock Health',
    ARRAY['dairy', 'cattle', 'minerals', 'health'],
    true,
    NOW() - INTERVAL '5 days',
    5
  ),
  (
    'b1e00001-0000-4000-8000-000000000002',
    'Himalayan Pink Vs. White Salt â€“ Why Farmers Are Switching',
    'himalayan-pink-vs-white-salt-farmers',
    'Learn why more ranchers and farmers are choosing Himalayan pink salt over traditional white salt for their livestock.',
    '<p>For decades, farmers and ranchers have relied on traditional white salt blocks for their livestock. However, a growing number are making the switch to Himalayan pink salt...</p><h2>The Mineral Difference</h2><p>While white salt contains primarily sodium chloride, Himalayan pink salt contains up to 84 trace minerals...</p>',
    'https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg',
    'Industry Insights',
    ARRAY['comparison', 'farmers', 'pink salt', 'white salt'],
    true,
    NOW() - INTERVAL '12 days',
    7
  ),
  (
    'b1e00001-0000-4000-8000-000000000003',
    'How to Choose the Right Salt Lick for Your Horses',
    'choosing-right-salt-lick-horses',
    'A comprehensive guide to selecting the perfect salt lick for your equine companions.',
    '<p>Horses need salt supplementation to maintain proper health, especially during hot weather or heavy exercise...</p>',
    'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    'Horse Care',
    ARRAY['horses', 'salt lick', 'guide', 'equine'],
    true,
    NOW() - INTERVAL '20 days',
    6
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  featured_image = EXCLUDED.featured_image,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  is_published = EXCLUDED.is_published,
  published_at = EXCLUDED.published_at,
  read_time = EXCLUDED.read_time,
  updated_at = NOW();

-- =============================================
-- PRODUCT IMAGES TABLE
-- =============================================

-- Normalized product image metadata while preserving products.images for storefront compatibility.
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_thumbnail BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_images_thumbnail ON product_images(product_id, is_thumbnail);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active product images" ON product_images;
CREATE POLICY "Anyone can view active product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM products
      WHERE products.id = product_images.product_id
        AND products.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

INSERT INTO product_images (product_id, image_url, sort_order, is_thumbnail)
SELECT
  products.id,
  image_item.image_url,
  image_item.ordinality - 1,
  image_item.image_url = COALESCE(products.thumbnail, image_item.image_url)
FROM products
CROSS JOIN LATERAL unnest(products.images) WITH ORDINALITY AS image_item(image_url, ordinality)
WHERE image_item.image_url IS NOT NULL
ON CONFLICT (product_id, image_url) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_thumbnail = EXCLUDED.is_thumbnail,
  updated_at = NOW();
