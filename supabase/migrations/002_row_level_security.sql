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
