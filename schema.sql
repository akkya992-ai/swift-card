-- ====================================================================
-- SWIFTCART QUICK COMMERCE DATABASE SCHEMA
-- Target Engine: PostgreSQL v12+
-- Optimization Profile: Ultra-fast order checkout, real-time stock locks,
--                       and instant rider allocation routing.
-- ====================================================================

-- Enable UUID extension for secure, non-sequential, and unpredictable IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CUSTOM DOMAINS, ENUMS & TYPES
-- ==========================================

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'rider', 'admin');
CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE rider_status AS ENUM ('offline', 'available', 'delivering');
CREATE TYPE order_status AS ENUM ('placed', 'confirmed', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE payment_gateway AS ENUM ('cod', 'upi', 'card', 'wallet', 'netbanking');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE address_label AS ENUM ('home', 'work', 'other');
CREATE TYPE coupon_discount_type AS ENUM ('percentage', 'flat');

-- ==========================================
-- 2. CORE TABLES CREATION
-- ==========================================

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Secure password hashing storage
    role user_role NOT NULL DEFAULT 'customer',
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT idx_users_email_chk CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT idx_users_phone_chk CHECK (length(phone) >= 10)
);

-- Table: sellers
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    store_name VARCHAR(150) UNIQUE NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    status seller_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: riders
CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    status rider_status NOT NULL DEFAULT 'offline',
    earnings NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (earnings >= 0),
    active_order_id UUID, -- Managed dynamically via transaction locks
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: categories
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY, -- Slug style categories (e.g. 'veg-fruits', 'dairy-eggs')
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100) NOT NULL, -- Lucide-react or image tag references
    color VARCHAR(100) NOT NULL, -- Tailwind class configurations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price >= price),
    image VARCHAR(512),
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    unit VARCHAR(50) NOT NULL, -- e.g. '500 g', '1 pc', '1 L'
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    seller_name VARCHAR(150), -- Denormalized for rapid read-heavy lists rendering
    delivery_minutes INT DEFAULT 10 NOT NULL CHECK (delivery_minutes > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: inventory (Highly isolated stock control representation)
CREATE TABLE inventory (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    stock INT NOT NULL DEFAULT 0,
    reserved_stock INT DEFAULT 0 NOT NULL, -- For pending/unconfirmed order states
    shelf_location VARCHAR(50), -- Optimizes dark store picker navigation
    last_restocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT stock_positive_chk CHECK (stock >= 0),
    CONSTRAINT reserved_stock_positive_chk CHECK (reserved_stock >= 0),
    CONSTRAINT reserved_less_than_stock CHECK (reserved_stock <= stock)
);

-- Table: coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type coupon_discount_type NOT NULL,
    discount_val NUMERIC(10, 2) NOT NULL CHECK (discount_val > 0),
    max_discount NUMERIC(10, 2), -- Only relevant for percentage discounts
    min_order_value NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (min_order_value >= 0),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_limit INT, -- Maximum uses allowed global
    total_used INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT expiry_date_chk CHECK (expires_at > starts_at)
);

-- Table: orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
    rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
    rider_name VARCHAR(100), -- Snapshot for accounting traceability
    rider_phone VARCHAR(20),  -- Snapshot for quick notification proxying
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (delivery_fee >= 0),
    discount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (discount >= 0),
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'placed',
    address TEXT NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'UPI', -- UPI, COD, CARD, WALLET
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT order_total_calc_chk CHECK (total = (subtotal + delivery_fee - discount))
);

-- Table: order_items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL, -- Captures product snapshot at checkout
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    
    CONSTRAINT item_item_total_chk CHECK (total = (price * quantity)),
    CONSTRAINT unique_order_product UNIQUE (order_id, product_id)
);

-- Table: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(100) UNIQUE, -- Remote Gateway transaction token
    gateway payment_gateway NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    refund_details JSONB, -- Staggered data capture for reversals 
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: addresses
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label address_label NOT NULL DEFAULT 'home',
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    street_address TEXT NOT NULL,
    landmark VARCHAR(150),
    latitude NUMERIC(9, 6) NOT NULL, -- Extracted dynamically for spatial rider routing
    longitude NUMERIC(9, 6) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url VARCHAR(255), -- Action target e.g. /orders/tracking-id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 3. SPEED & PERFORMANCE INDEXES
-- ==========================================

-- Q-Commerce Core Indexing Principle: 
-- Read performance must bypass joins during high load bursts. Search, 
-- route-tracking, and queue polling must return in sub-millisecond ranges.

-- Aistudio / Postgres doesn't auto-index Foreign Keys; let's index them manually:
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_inventory_seller ON inventory(seller_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- PARTIAL INDEX: Only track active duty riders who are currently "available" for instant assignation.
-- Fast dispatch engine queries of this index instead of full table scans of all riders.
CREATE INDEX idx_riders_matching ON riders(id, status, vehicle_number) 
WHERE status = 'available';

-- PARTIAL INDEX: Active/Pending Order Queue.
-- This ensures the dispatcher system can continuously scan for ready orders
-- and assign them to matching riders efficiently.
CREATE INDEX idx_orders_dispatch_queue ON orders(id, seller_id, status) 
WHERE status IN ('placed', 'confirmed', 'dispatched');

-- COMPOSITE INDEX: Search Engine & Price Filter Optimization
-- Optimizes product lookup by category, keeping sorted lists aligned by Price.
CREATE INDEX idx_products_catalog_search ON products(category_id, price);

-- COMPOSITE INDEX: Customer Order History
-- Speeds up account dashboard displays for user orders sorted newest to oldest.
CREATE INDEX idx_orders_customer_history ON orders(customer_id, created_at DESC);

-- ==========================================
-- 4. UTILITIES & TIMESTAMP TRIGGERS
-- ==========================================

-- Auto-update updated_at helper function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_sellers BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_riders BEFORE UPDATE ON riders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_categories BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inventory BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_addresses BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_coupons BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ==========================================
-- 5. TRANSACTION STOCK LOCKS & TRIGGER (Fast Order Processing Protection)
-- ==========================================

-- This PL/pgSQL implementation guarantees database-level atomic inventory management.
-- On checkout, stock is checked and reserved. If stock is depleted, the transaction 
-- automatically rolls back, completely safe-guarding against dual-order race conditions!

CREATE OR REPLACE FUNCTION process_order_stock_reservation()
RETURNS TRIGGER AS $$
DECLARE
    current_available_stock INT;
    parent_order_status VARCHAR(50);
BEGIN
    -- Select the stock with an exclusive row lock to block competing concurrent checkouts on the same product
    SELECT stock - reserved_stock INTO current_available_stock
    FROM inventory
    WHERE product_id = NEW.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product catalog reference % does not exist in store inventory.', NEW.product_id;
    END IF;

    -- Validate inventory quantity sufficiency
    IF current_available_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock alert: Product % requested qty % but only % remains.', 
            NEW.product_name, NEW.quantity, current_available_stock;
    END IF;

    -- Check if parent order is confirmed or placed
    SELECT status::text INTO parent_order_status FROM orders WHERE id = NEW.order_id;

    -- If parent order is placed, increment reserved_stock, otherwise deduct from stock immediately
    IF parent_order_status = 'placed' THEN
        UPDATE inventory
        SET reserved_stock = reserved_stock + NEW.quantity,
            updated_at = NOW()
        WHERE product_id = NEW.product_id;
    ELSE
        UPDATE inventory
        SET stock = stock - NEW.quantity,
            updated_at = NOW()
        WHERE product_id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transaction_stock_reservation ON order_items;
CREATE TRIGGER transaction_stock_reservation
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE PROCEDURE process_order_stock_reservation();

-- ==========================================
-- 6. ORDER CONFIRMATION DEDUCTION & CANCELLATION RESTOCK TRIGGER
-- ==========================================

-- Automatically deducts stock from inventory when order status transitions to 'confirmed'
-- or handles cancellation/unreservation cleanly.
CREATE OR REPLACE FUNCTION process_order_status_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Transiting from placed -> confirmed: finalize the deduction by actualizing stock and removing from reserved_stock
    IF (NEW.status = 'confirmed' OR NEW.status = 'dispatched' OR NEW.status = 'delivered') AND (OLD.status = 'placed') THEN
        UPDATE inventory i
        SET stock = i.stock - oi.quantity,
            reserved_stock = i.reserved_stock - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND i.product_id = oi.product_id;
    END IF;

    -- 2. Transiting from placed -> cancelled: simply unreserve the stock
    IF NEW.status = 'cancelled' AND OLD.status = 'placed' THEN
        UPDATE inventory i
        SET reserved_stock = i.reserved_stock - oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND i.product_id = oi.product_id;
    END IF;

    -- 3. Transiting from confirmed/dispatched -> cancelled: refund the actual stock back to shelf
    IF NEW.status = 'cancelled' AND (OLD.status = 'confirmed' OR OLD.status = 'dispatched') THEN
        UPDATE inventory i
        SET stock = i.stock + oi.quantity,
            updated_at = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND i.product_id = oi.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_status_inventory_sync ON orders;
DROP TRIGGER IF EXISTS order_cancellation_restock ON orders;
CREATE TRIGGER order_status_inventory_sync
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE process_order_status_inventory_sync();

-- ==========================================
-- 7. ALARM AUDIT & ALERT DIAGNOSTICS LOGS
-- ==========================================

CREATE TABLE alert_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    alert_sent_at TIMESTAMP WITH TIME ZONE,
    alert_opened_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    missed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_order_role UNIQUE (order_id, role)
);

CREATE INDEX idx_alert_logs_order ON alert_logs(order_id);

