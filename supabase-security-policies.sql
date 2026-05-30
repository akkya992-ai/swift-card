-- ====================================================================
-- SWIFTCART ROW LEVEL SECURITY POLICY PROFILES (SUPABASE POSTGRESQL)
-- Production Optimization: Strict identity matching, partitioned reads,
--                           and role-restricted merchant scopes.
-- ====================================================================

-- Enable RLS on all active schemas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. USERS SECURITY POLICIES
-- ==========================================

-- Allow users to view their own profile credentials
CREATE POLICY user_read_own_profile ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to patch their registration records (phone, name, address)
CREATE POLICY user_update_own_profile ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==========================================
-- 2. SELLERS SECURITY POLICIES
-- ==========================================

-- Retail profiles can be read by registered shopping users
CREATE POLICY public_read_sellers ON sellers
    FOR SELECT
    USING (status = 'approved');

-- Owners can edit their registered store credentials
CREATE POLICY seller_update_own_store ON sellers
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. RIDERS SECURITY POLICIES
-- ==========================================

-- Delivery crews can read current physical availability state lists
CREATE POLICY public_read_riders ON riders
    FOR SELECT
    USING (true);

-- Active riders edit their current location, status, and earnings ledger
CREATE POLICY rider_update_own_status ON riders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. CATEGORIES & CATALOG SECURITY POLICIES
-- ==========================================

-- All shopping customers can list categories freely
CREATE POLICY public_read_categories ON categories
    FOR SELECT
    USING (true);

-- Admins retain sole creator privileges for product listing classifications
CREATE POLICY admin_manage_categories ON categories
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- 5. PRODUCTS & INVENTORY SECURITY POLICIES
-- ==========================================

-- Anyone can read and evaluate product prices/items
CREATE POLICY public_read_products ON products
    FOR SELECT
    USING (true);

-- Merchant users only modify their registered shelf products
CREATE POLICY seller_manage_own_products ON products
    FOR ALL
    USING (EXISTS (SELECT 1 FROM sellers WHERE id = products.seller_id AND user_id = auth.uid()));

-- Stock counts should be visible to potential buyers to prevent order failures
CREATE POLICY public_read_inventory ON inventory
    FOR SELECT
    USING (true);

-- Sellers edit individual stock levels to keep dark stores synchronized
CREATE POLICY seller_manage_own_inventory ON inventory
    FOR ALL
    USING (EXISTS (SELECT 1 FROM sellers WHERE id = inventory.seller_id AND user_id = auth.uid()));

-- ==========================================
-- 6. DISCOUNTS & COUPONS POLICIES
-- ==========================================

-- Customers lookup valid coupons
CREATE POLICY customer_read_active_coupons ON coupons
    FOR SELECT
    USING (is_active = true AND starts_at <= NOW() AND expires_at >= NOW());

-- ==========================================
-- 7. ORDERS & TICKETS POLICIES
-- ==========================================

-- Buyers select/re-verify their own submitted orders
CREATE POLICY customer_view_own_orders ON orders
    FOR SELECT
    USING (auth.uid() = customer_id);

-- Buyers submit new checkout transactions
CREATE POLICY customer_insert_new_orders ON orders
    FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Sellers view and complete incoming grocery packing lists
CREATE POLICY seller_view_store_orders ON orders
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM sellers WHERE id = orders.seller_id AND user_id = auth.uid()));

-- Sellers confirm, pack, or update delivery statuses
CREATE POLICY seller_update_store_order_status ON orders
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM sellers WHERE id = orders.seller_id AND user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM sellers WHERE id = orders.seller_id AND user_id = auth.uid()));

-- Assigned delivery riders monitor routing parameters
CREATE POLICY rider_view_assigned_orders ON orders
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM riders WHERE id = orders.rider_id AND user_id = auth.uid()));

-- Assigned delivery riders update eta status triggers on delivery routes
CREATE POLICY rider_update_assigned_order_status ON orders
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM riders WHERE id = orders.rider_id AND user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM riders WHERE id = orders.rider_id AND user_id = auth.uid()));

-- ==========================================
-- 8. ORDER ITEMS (PARTITIONED SECURE BOUNDING)
-- ==========================================

-- Read order items only if parent order is authorized
CREATE POLICY view_order_items ON order_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM orders o 
        WHERE o.id = order_items.order_id 
          AND (o.customer_id = auth.uid() 
               OR EXISTS (SELECT 1 FROM sellers s WHERE s.id = o.seller_id AND s.user_id = auth.uid())
               OR EXISTS (SELECT 1 FROM riders r WHERE r.id = o.rider_id AND r.user_id = auth.uid()))
    ));

CREATE POLICY insert_order_items ON order_items
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE id = order_items.order_id AND customer_id = auth.uid()));

-- ==========================================
-- 9. PAYMENTS & TRANSACTIONS SECURITY POLICIES
-- ==========================================

CREATE POLICY customer_view_own_payments ON payments
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM orders WHERE id = payments.order_id AND customer_id = auth.uid()));

-- ==========================================
-- 10. ADDRESSES & NOTIFICATIONS SECURITY POLICIES
-- ==========================================

-- Read/Write personal addresses
CREATE POLICY customer_manage_own_addresses ON addresses
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Read/Write notifications
CREATE POLICY customer_manage_own_notifications ON notifications
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
