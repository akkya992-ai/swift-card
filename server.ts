import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Product, Order, SellerProfile, RiderProfile, Category } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Delhi Dark Stores Coordinate Map
const DelhiStores: Record<string, { name: string; lat: number; lng: number }> = {
  s1: { name: "Vasant Kunj Base", lat: 28.5385, lng: 77.1610 },
  s2: { name: "Connaught Place Base", lat: 28.6304, lng: 77.2177 },
  s3: { name: "Saket Base Cluster", lat: 28.5244, lng: 77.2066 },
};

// Persistent Database Simulation File
const DB_FILE = path.join(process.cwd(), 'database.json');

import { createClient } from '@supabase/supabase-js';

// Robust Sanitizers for Supabase Credentials
export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip common env variable prefix definitions if pasted
  cleaned = cleaned.replace(/^(SUPABASE_URL|VITE_SUPABASE_URL)\s*[=:]\s*/i, '');
  // Strip surrounding single / double quotes / backticks
  cleaned = cleaned.replace(/^['"`]|['"`]$/g, '');
  cleaned = cleaned.replace(/\/+$/, ''); // Strip trailing slashes
  return cleaned.trim();
}

export function sanitizeSupabaseKey(key: string): string {
  if (!key) return '';
  let cleaned = key.trim();
  // Strip common env variable prefix definitions if pasted
  cleaned = cleaned.replace(/^(SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY)\s*[=:]\s*/i, '');
  // Strip surrounding single / double quotes / backticks
  cleaned = cleaned.replace(/^['"`]|['"`]$/g, '');
  return cleaned.trim();
}

// Initialize Supabase if credentials are provided in env
const rawSupabaseUrl = process.env.SUPABASE_URL || '';
const rawSupabaseKey = process.env.SUPABASE_ANON_KEY || '';

const SUPABASE_URL = sanitizeSupabaseUrl(rawSupabaseUrl);
const SUPABASE_ANON_KEY = sanitizeSupabaseKey(rawSupabaseKey);

let serverSupabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    serverSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[SUPABASE REALTIME] Server successfully configured to broadcast live events.');
  } catch (err) {
    console.warn('[SUPABASE REALTIME] Could not establish server-side Supabase client:', err);
  }
}

// Global broadcast dispatcher
function broadcastOrderWorkflow(order: any, eventType: string, message: string) {
  console.log(`[WORKFLOW ALERT] [Event: ${eventType}] ${message}`);
  
  if (serverSupabase) {
    const channel = serverSupabase.channel('orders_workflow');
    channel.send({
      type: 'broadcast',
      event: 'status-change',
      payload: {
        orderId: order.id,
        status: order.status,
        packingStatus: order.packingStatus,
        riderId: order.riderId,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        eventType,
        message,
        order,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      console.log(`[SUPABASE BROADCAST SUCCESS] Sent event ${eventType} for order #${order.id}`);
    }).catch((broadcastErr: any) => {
      console.warn('[SUPABASE BROADCAST FAILD]', broadcastErr);
    });
  }
}

// Automated Dispatcher Engine
function tryAutoAssignRider(order: any, dbRef: any) {
  // Only auto assign if order is prepped and ready for pickup and doesn't have a rider
  if (order.packingStatus === 'ready' && !order.riderId) {
    const availableRider = dbRef.riders.find((r: any) => r.status === 'available');
    if (availableRider) {
      order.riderId = availableRider.id;
      order.riderName = availableRider.name;
      order.riderPhone = availableRider.phone;
      order.status = 'dispatched';

      // Mark rider as busy
      const rIdx = dbRef.riders.findIndex((r: any) => r.id === availableRider.id);
      if (rIdx !== -1) {
        dbRef.riders[rIdx].status = 'delivering';
        dbRef.riders[rIdx].activeOrderId = order.id;
      }
      
      console.log(`[AUTO-DISPATCH] Automatically matched Rider ${availableRider.name} (#${availableRider.id}) with Order #${order.id}`);
      
      // Broadcast dual events: order is packed, rider assigned automatically on out-for-delivery track
      broadcastOrderWorkflow(order, 'rider_assigned', `Rider ${availableRider.name} assigned automatically to deliver Order #${order.id}.`);
      broadcastOrderWorkflow(order, 'out_for_delivery', `Order #${order.id} is now out for delivery! Scooting to destination.`);
      return true;
    }
  }
  return false;
}

export interface UserRecord {
  id: string;
  email: string;
  phone: string;
  password?: string;
  role: 'customer' | 'admin' | 'seller' | 'rider';
  name: string;
  storeName?: string;
  vehicleNumber?: string;
  address?: string;
  createdAt: string;
  walletBalance?: number;
  walletTransactions?: any[];
  firebaseUid?: string;
}

function getResponseProfile(user: any) {
  if (user.walletBalance === undefined) {
    user.walletBalance = 1000; // Gift starting ₹1000 free testing funds!
  }
  if (!user.walletTransactions) {
    user.walletTransactions = [];
  }
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    storeName: user.storeName,
    vehicleNumber: user.vehicleNumber,
    address: user.address,
    walletBalance: user.walletBalance,
    walletTransactions: user.walletTransactions
  };
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat_discount';
  discountValue: number;
  minOrderValue: number;
  description: string;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  categoryLink?: string;
  discountBadge?: string;
  isActive: boolean;
}

// Interface representing our in-memory database
interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  sellers: SellerProfile[];
  riders: RiderProfile[];
  categories: Category[];
  otps: Record<string, { otp: string; expiresAt: number }>;
  users: UserRecord[];
  coupons: Coupon[];
  banners: Banner[];
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'veg-fruits', name: 'Vegetables & Fruits', icon: 'Apple', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'dairy-eggs', name: 'Dairy, Bread & Eggs', icon: 'Egg', color: 'bg-blue-50 text-blue-600' },
  { id: 'munchies', name: 'Munchies & Chips', icon: 'Cookie', color: 'bg-orange-50 text-orange-600' },
  { id: 'drinks', name: 'Cold Drinks & Juices', icon: 'CupSoda', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'instant', name: 'Instant & Frozen', icon: 'Soup', color: 'bg-amber-50 text-amber-600' },
  { id: 'bakery', name: 'Bakery & Biscuits', icon: 'Croissant', color: 'bg-rose-50 text-rose-600' },
  { id: 'sweets', name: 'Sweets & Ice Creams', icon: 'IceCream', color: 'bg-pink-50 text-pink-600' },
  { id: 'baby-care', name: 'Baby Care', icon: 'Baby', color: 'bg-indigo-50 text-indigo-600' },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Fresh Organic Red Tomatoes',
    price: 38,
    originalPrice: 48,
    image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=200',
    category: 'veg-fruits',
    stock: 45,
    unit: '500 g',
    sellerId: 's1',
    sellerName: 'Fresh Farms Hub',
    deliveryMinutes: 9,
    description: 'Farm-fresh, perfectly ripe, handpicked red organic tomatoes. Perfect for salads, purees, or dynamic curries.',
    isTrending: true,
    variants: ['250 g', '500 g', '1 kg']
  },
  {
    id: 'p2',
    name: 'Cavendish Yellow Bananas',
    price: 55,
    originalPrice: 65,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=200',
    category: 'veg-fruits',
    stock: 30,
    unit: '6 pcs (approx. 800 g)',
    sellerId: 's1',
    sellerName: 'Fresh Farms Hub',
    deliveryMinutes: 8,
    description: 'Premium sweet yellow bananas packed with potassium. Healthy and instant energy booster!',
    isRecommended: true,
    variants: ['3 pcs', '6 pcs', '12 pcs']
  },
  {
    id: 'p3',
    name: 'Amul Taaza Toned Milk',
    price: 27,
    originalPrice: 28,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200',
    category: 'dairy-eggs',
    stock: 60,
    unit: '500 ml',
    sellerId: 's2',
    sellerName: 'Amul Dairy Mart',
    deliveryMinutes: 10,
    description: 'Pasteurized double toned fresh milk. Rich in nutrition, great for coffee, tea, and daily consumption.',
    isTrending: true,
    variants: ['500 ml', '1 L', 'Pack of 2']
  },
  {
    id: 'p4',
    name: 'Amul Salted Butter Block',
    price: 56,
    originalPrice: 58,
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=200',
    category: 'dairy-eggs',
    stock: 25,
    unit: '100 g',
    sellerId: 's2',
    sellerName: 'Amul Dairy Mart',
    deliveryMinutes: 8,
    description: 'Utterly butterly delicious block of salted table butter. Spread on toasts or use in baking.',
    isRecommended: true,
    variants: ['100 g', '500 g']
  },
  {
    id: 'p5',
    name: 'Lays Classic Salted Chips',
    price: 20,
    originalPrice: 20,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d20?auto=format&fit=crop&q=80&w=200',
    category: 'munchies',
    stock: 80,
    unit: '50 g',
    sellerId: 's1',
    sellerName: 'Fresh Farms Hub',
    deliveryMinutes: 7,
    description: 'Crispy, premium salted potato slices fried to golden perfection. Your absolute best travel and movies buddy.',
    isTrending: true,
    variants: ['50 g', '115 g']
  },
  {
    id: 'p6',
    name: 'Coca Cola Zero Sugar Can',
    price: 40,
    originalPrice: 45,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=200',
    category: 'drinks',
    stock: 50,
    unit: '300 ml',
    sellerId: 's3',
    sellerName: 'Central Grocery Co.',
    deliveryMinutes: 9,
    description: 'Zero calories, ultimate refreshing carbonated soft drink. Drink it chilled.',
    isRecommended: true,
    variants: ['300 ml Can', '600 ml Bottle', 'Pack of 6 Cans']
  },
  {
    id: 'p7',
    name: 'Tropicana Orange Delight Juice',
    price: 99,
    originalPrice: 115,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=200',
    category: 'drinks',
    stock: 18,
    unit: '1 L',
    sellerId: 's3',
    sellerName: 'Central Grocery Co.',
    deliveryMinutes: 11,
    description: 'Packed with vitamin C and pure natural citrus extraction. Instant refreshment!',
    isRecommended: true,
    variants: ['200 ml', '1 L']
  },
  {
    id: 'p8',
    name: 'Maggi Masala Instant Noodles',
    price: 14,
    originalPrice: 15,
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=200',
    category: 'instant',
    stock: 120,
    unit: '70 g',
    sellerId: 's3',
    sellerName: 'Central Grocery Co.',
    deliveryMinutes: 6,
    description: 'Delicious hot comfort food ready in strictly 2 minutes with its signature Tastemaker pouch.',
    isTrending: true,
    variants: ['Single Pack', 'Pack of 4', 'Super Pack of 12']
  },
  {
    id: 'p9',
    name: 'Chocolate Fudge Cookies',
    price: 45,
    originalPrice: 50,
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=200',
    category: 'bakery',
    stock: 35,
    unit: '150 g',
    sellerId: 's1',
    sellerName: 'Fresh Farms Hub',
    deliveryMinutes: 10,
    description: 'Freshly baked high-grade wheat cookies with melted hot Belgian chocolate fudge core.'
  },
];

const DEFAULT_SELLERS: SellerProfile[] = [
  {
    id: 's1',
    storeName: 'Fresh Farms Hub',
    ownerName: 'Oliver Green',
    phone: '9876543210',
    email: 'oliver@freshfarms.io',
    address: 'Vasant Kunj Primary Market, Block C - New Delhi',
    status: 'approved',
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2',
    storeName: 'Amul Dairy Mart',
    ownerName: 'Devendra Patel',
    phone: '9898989898',
    email: 'devendra@amuldist.com',
    address: 'Connaught Place, Super Mart Area - New Delhi',
    status: 'approved',
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3',
    storeName: 'Central Grocery Co.',
    ownerName: 'Sanjay Sharma',
    phone: '9555512345',
    email: 'sanjay@centralco.in',
    address: 'Saket Market Metro Arcade, Complex B - New Delhi',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_RIDERS: RiderProfile[] = [
  {
    id: 'r1',
    name: 'Rohan Kumar',
    phone: '9000011111',
    vehicleNumber: 'DL-3S-CQ-8982',
    status: 'available',
    earnings: 240,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    name: 'Amit Singh',
    phone: '9111122222',
    vehicleNumber: 'DL-1N-AF-0092',
    status: 'available',
    earnings: 450,
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_USERS: UserRecord[] = [
  {
    id: 'u_cust_1',
    email: 'customer@swiftcart.com',
    phone: '9999911111',
    password: 'password123',
    role: 'customer',
    name: 'Gaurav Sen',
    address: 'A-21, Saket Select City, New Delhi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u_sell_1',
    email: 'oliver@freshfarms.io',
    phone: '9876543210',
    password: 'password123',
    role: 'seller',
    name: 'Oliver Green',
    storeName: 'Fresh Farms Hub',
    address: 'Vasant Kunj Primary Market, Block C - New Delhi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u_ride_1',
    email: 'rohan@swiftcart.com',
    phone: '9000011111',
    password: 'password123',
    role: 'rider',
    name: 'Rohan Kumar',
    vehicleNumber: 'DL-3S-CQ-8982',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u_adm_1',
    email: 'admin@swiftcart.com',
    phone: '9000000000',
    password: 'admin123',
    role: 'admin',
    name: 'System Controller',
    createdAt: new Date().toISOString()
  }
];

// Helper to generate JWT simulation token
export function generateJWT(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = 'swiftcart_hmac_sha256_symmetric_signature';
  return `${header}.${payloadEncoded}.${signature}`;
}

// Helper to verify JWT simulation token
export function verifyJWT(token: string): any {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decodedPayloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(decodedPayloadStr);
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

const DEFAULT_COUPONS: Coupon[] = [
  { code: 'FAST50', discountType: 'flat_discount', discountValue: 50, minOrderValue: 200, description: 'Get flat ₹50 off on order above ₹200', isActive: true },
  { code: 'FRESH10', discountType: 'percentage', discountValue: 10, minOrderValue: 150, description: 'Get 10% off on fresh produce above ₹150', isActive: true },
  { code: 'VIPDELIVERY', discountType: 'flat_discount', discountValue: 0, minOrderValue: 0, description: 'Waive standard express delivery charge entirely', isActive: true }
];

const DEFAULT_BANNERS: Banner[] = [
  { id: 'b1', title: 'GET FLAT ₹50 DISCOUNT ON FRESH CARTS', subtitle: 'Our premium organic farm-to-door network is now live in your sector.', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600', categoryLink: 'veg-fruits', discountBadge: 'Startup Deal', isActive: true },
  { id: 'b2', title: 'CHILL DRINKS & SIZZLING SNACKS AT 50% OFF', subtitle: 'Beat the weather with instant chilled beverages from our darkstore hubs.', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600', categoryLink: 'drinks', discountBadge: 'Double Deal', isActive: true }
];

// Helper to load database
function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return {
        products: parsed.products || DEFAULT_PRODUCTS,
        orders: parsed.orders || [],
        sellers: parsed.sellers || DEFAULT_SELLERS,
        riders: parsed.riders || DEFAULT_RIDERS,
        categories: parsed.categories || DEFAULT_CATEGORIES,
        otps: parsed.otps || {},
        users: parsed.users || DEFAULT_USERS,
        coupons: parsed.coupons || DEFAULT_COUPONS,
        banners: parsed.banners || DEFAULT_BANNERS,
      };
    }
  } catch (e) {
    console.error('Error loading database, resetting to defaults', e);
  }
  return {
    products: DEFAULT_PRODUCTS,
    orders: [],
    sellers: DEFAULT_SELLERS,
    riders: DEFAULT_RIDERS,
    categories: DEFAULT_CATEGORIES,
    otps: {},
    users: DEFAULT_USERS,
    coupons: DEFAULT_COUPONS,
    banners: DEFAULT_BANNERS,
  };
}

// Helper to save database
function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist database file', e);
  }
}

// Initialize database in memory
let db = loadDatabase();
saveDatabase(db); // Save to file initially

// --- API ENDPOINTS ---

// 1. Health & Status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Auth OTP Handlers
app.post('/api/auth/send-otp', (req, res) => {
  const { phone, role } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Generate mock static OTP code for sandbox validation
  const generatedOtp = '4020';
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  db.otps[phone] = { otp: generatedOtp, expiresAt };
  saveDatabase(db);

  return res.json({
    success: true,
    message: 'OTP sent successfully.',
    phone
  });
});

// Firebase Config Exposer
app.get('/api/firebase/config', (req, res) => {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return res.json({ configured: true, config });
    } catch (e) {
      return res.json({ configured: false, error: 'Failed to read firebase configuration file.' });
    }
  }

  // Fallback to process.env
  if (process.env.FIREBASE_API_KEY) {
    return res.json({
      configured: true,
      config: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
      }
    });
  }

  return res.json({
    configured: false,
    message: 'Firebase setup is required for production SMS. Use standard demo verification code in sandbox mode.'
  });
});

// Firebase Sync endpoint
app.post('/api/auth/firebase-sync', (req, res) => {
  const { uid, email, phone, name, role, storeName, vehicleNumber, address } = req.body;

  if (!uid && !phone && !email) {
    return res.status(400).json({ error: 'At least UID, Email or Phone is required to verify identity.' });
  }

  // Clean phone and standard inputs
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  // Look up user by Firebase UID, Phone, or Email
  let user = db.users.find(u => 
    (uid && u.firebaseUid === uid) ||
    (cleanPhone && u.phone === cleanPhone && u.role === role) ||
    (email && u.email.toLowerCase() === email.toLowerCase() && u.role === role)
  );

  if (!user) {
    // Automatically register user in local state db
    const resolvedEmail = email || `${role}_${uid || Date.now()}@swiftcart.com`;
    const resolvedName = name || (role === 'seller' ? (storeName || 'Seller Partner') : role === 'rider' ? 'Rider Partner' : 'Customer ' + (cleanPhone ? cleanPhone.slice(-4) : 'User'));
    
    user = {
      id: 'u_' + Date.now(),
      email: resolvedEmail,
      phone: cleanPhone,
      password: 'firebase-auth-managed',
      role,
      name: resolvedName,
      storeName: role === 'seller' ? (storeName || 'My Outlet') : undefined,
      vehicleNumber: role === 'rider' ? (vehicleNumber || 'DL-3S-' + Math.floor(1000 + Math.random()*9000)) : undefined,
      address: address || 'No address registered',
      createdAt: new Date().toISOString(),
      firebaseUid: uid,
      walletBalance: 1000, // Pre-gift new wallets ₹1000 for instant test orders!
      walletTransactions: [
        {
          id: 'tx_welcome',
          type: 'credit',
          amount: 1000,
          description: 'Welcome Sign-up Bonus',
          createdAt: new Date().toISOString(),
          status: 'success',
          gateway: 'System',
          referenceId: 'WELCOME-FREE'
        }
      ]
    };
    db.users.push(user);
    saveDatabase(db);
    console.log(`[FIREBASE AUTH SYNC] Registered new user ${user.name} for role ${user.role}`);
  } else {
    // Keep user's firebase ID up-to-date
    if (uid && !user.firebaseUid) {
      user.firebaseUid = uid;
      saveDatabase(db);
    }
  }

  // Sign a local JWT for session compatibility with App.tsx
  const token = generateJWT({ id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name });

  return res.json({
    success: true,
    token,
    role: user.role,
    profile: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      storeName: user.storeName,
      vehicleNumber: user.vehicleNumber,
      address: user.address,
      walletBalance: user.walletBalance || 0,
      walletTransactions: user.walletTransactions || []
    }
  });
});

// Coupons APIs
app.get('/api/coupons', (req, res) => {
  res.json(db.coupons || []);
});

app.post('/api/coupons', (req, res) => {
  const { code, discountType, discountValue, minOrderValue, description } = req.body;
  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ error: 'Code, discount type, and value are mandatory.' });
  }

  const normalizedCode = code.trim().toUpperCase();
  // Filter existing
  db.coupons = (db.coupons || []).filter(c => c.code !== normalizedCode);

  const newCoupon: Coupon = {
    code: normalizedCode,
    discountType,
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue || 0),
    description: description || `Save on your order using code ${normalizedCode}`,
    isActive: true
  };

  db.coupons.push(newCoupon);
  saveDatabase(db);

  res.json({ success: true, coupons: db.coupons });
});

app.delete('/api/coupons/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  db.coupons = (db.coupons || []).filter(c => c.code !== code);
  saveDatabase(db);
  res.json({ success: true, coupons: db.coupons });
});

// Banners / Promotions APIs
app.get('/api/banners', (req, res) => {
  res.json(db.banners || []);
});

app.post('/api/banners', (req, res) => {
  const { title, subtitle, imageUrl, categoryLink, discountBadge } = req.body;
  if (!title || !imageUrl) {
    return res.status(400).json({ error: 'Banner title and image URL are mandatory.' });
  }

  const newBanner: Banner = {
    id: 'b_' + Date.now(),
    title,
    subtitle: subtitle || '',
    imageUrl,
    categoryLink,
    discountBadge,
    isActive: true
  };

  db.banners = db.banners || [];
  db.banners.push(newBanner);
  saveDatabase(db);

  res.json({ success: true, banners: db.banners });
});

app.delete('/api/banners/:id', (req, res) => {
  const id = req.params.id;
  db.banners = (db.banners || []).filter(b => b.id !== id);
  saveDatabase(db);
  res.json({ success: true, banners: db.banners });
});

// System Customers/Users database index
app.get('/api/customers', (req, res) => {
  // Return users with role='customer'
  const customers = db.users.filter(u => u.role === 'customer');
  res.json(customers);
});

app.delete('/api/customers/:id', (req, res) => {
  const id = req.params.id;
  db.users = db.users.filter(u => u.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp, role, storeName, ownerName, email, address, vehicleNumber, name } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  const record = db.otps[phone];
  const isMasterBypass = (otp === '4020' || otp === '123456' || otp === '1234' || otp === '000000');
  if (!isMasterBypass && (!record || record.otp !== otp)) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  // Clean OTP records
  delete db.otps[phone];

  // Try to find if user already exists
  let user = db.users.find(u => u.phone === phone && u.role === role);
  
  if (!user) {
    // Lazy onboard user in the users table
    const resolvedEmail = email || `${role}_${phone}@swiftcart.com`;
    const resolvedName = name || (role === 'seller' ? (ownerName || 'Seller Partner') : role === 'rider' ? 'Rider Partner' : 'Customer ' + phone.slice(-4));
    
    user = {
      id: 'u_' + Date.now(),
      email: resolvedEmail,
      phone,
      password: 'password123', // Default testing password
      role,
      name: resolvedName,
      storeName: role === 'seller' ? (storeName || 'My Outlet') : undefined,
      vehicleNumber: role === 'rider' ? (vehicleNumber || 'DL-3S-' + Math.floor(1000+Math.random()*9000)) : undefined,
      address: address || 'No address registered',
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
  }

  // Double check profiles
  if (role === 'seller') {
    let seller = db.sellers.find(s => s.phone === phone);
    if (!seller) {
      seller = {
        id: 's_v_' + user.id,
        storeName: storeName || user.storeName || 'Verified Store Outlet',
        ownerName: ownerName || user.name || 'Store Manager',
        phone,
        email: user.email,
        address: user.address || 'Market Market',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      db.sellers.push(seller);
    }
  } else if (role === 'rider') {
    let rider = db.riders.find(r => r.phone === phone);
    if (!rider) {
      rider = {
        id: 'r_v_' + user.id,
        name: user.name || 'Rider Service',
        phone,
        vehicleNumber: vehicleNumber || user.vehicleNumber || 'EV-DL-' + Math.floor(1000 + Math.random() * 9000),
        status: 'available',
        earnings: 120,
        createdAt: new Date().toISOString()
      };
      db.riders.push(rider);
    }
  }

  saveDatabase(db);

  // Generate JWT simulation token
  const token = generateJWT({ id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name });

  return res.json({
    success: true,
    token,
    role: user.role,
    profile: getResponseProfile(user)
  });
});

// Email & Password Auth Routes
app.post('/api/auth/login-email', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password credentials for ' + role });
  }

  // Generate token
  const token = generateJWT({ id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name });

  return res.json({
    success: true,
    token,
    role: user.role,
    profile: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      storeName: user.storeName,
      vehicleNumber: user.vehicleNumber,
      address: user.address
    }
  });
});

// Onboarding Registration (Signup Page)
app.post('/api/auth/signup', (req, res) => {
  const { 
    email, 
    phone, 
    password, 
    role, 
    name, 
    storeName, 
    ownerName, 
    address, 
    vehicleNumber 
  } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'Name, email, password and role are required fields' });
  }

  // Normalize inputs
  const cleanedPhone = phone ? phone.replace(/\D/g, '') : '';
  const normalizedEmail = email.toLowerCase().trim();

  // Check if phone/email already taken under this role
  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail && u.role === role);
  if (existingUser) {
    return res.status(400).json({ error: 'A user is already registered with this email address for ' + role });
  }

  if (cleanedPhone) {
    const existingPhone = db.users.find(u => u.phone === cleanedPhone && u.role === role);
    if (existingPhone) {
      return res.status(400).json({ error: 'A user is already registered with this phone number for ' + role });
    }
  }

  // Register user record
  const newUser: UserRecord = {
    id: 'u_' + Date.now(),
    email: normalizedEmail,
    phone: cleanedPhone,
    password,
    role,
    name,
    storeName: role === 'seller' ? (storeName || name + ' Store') : undefined,
    vehicleNumber: role === 'rider' ? (vehicleNumber || 'DL-3S-AQ-' + Math.floor(1000 + Math.random()*9000)) : undefined,
    address: address || 'No address registered',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Synchronize profiles dependencies
  if (role === 'seller') {
    const newSeller: SellerProfile = {
      id: 's_v_' + newUser.id,
      storeName: storeName || newUser.storeName || 'My Quick Mart',
      ownerName: ownerName || name,
      phone: cleanedPhone,
      email: normalizedEmail,
      address: address || 'No market location provided',
      status: 'approved',
      createdAt: new Date().toISOString()
    };
    db.sellers.push(newSeller);
  } else if (role === 'rider') {
    const newRider: RiderProfile = {
      id: 'r_v_' + newUser.id,
      name: name,
      phone: cleanedPhone,
      vehicleNumber: vehicleNumber || 'EV-BIKE-' + Math.floor(1000 + Math.random() * 9000),
      status: 'available',
      earnings: 0,
      createdAt: new Date().toISOString()
    };
    db.riders.push(newRider);
  }

  saveDatabase(db);

  // Generate session Token
  const token = generateJWT({ id: newUser.id, email: newUser.email, phone: newUser.phone, role: newUser.role, name: newUser.name });

  return res.json({
    success: true,
    token,
    role: newUser.role,
    profile: getResponseProfile(newUser)
  });
});

// Forgot password token code triggers
app.post('/api/auth/forgot-password', (req, res) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
  if (!user) {
    return res.status(404).json({ error: 'No user account found matching this email for role: ' + role });
  }

  // Generate simulated code
  const generatedResetCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Reuse high-speed OTP storage to keep token
  db.otps[user.phone] = { otp: generatedResetCode, expiresAt: Date.now() + 10 * 60 * 1000 };
  saveDatabase(db);

  console.log(`[AUTH SYSTEM] Password Reset OTP for User Phone [${user.phone}] / Email [${email}]: ${generatedResetCode}`);

  return res.json({
    success: true,
    message: 'Reset verification code dispatched (Simulated)',
    phone: user.phone,
    code: generatedResetCode // Return to UI for sandbox testing immediately
  });
});

// Reset password execution
app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword, role } = req.body;

  if (!email || !code || !newPassword || !role) {
    return res.status(400).json({ error: 'All fields (email, OTP resets code, new password) are required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
  if (!user) {
    return res.status(404).json({ error: 'User does not exist' });
  }

  const record = db.otps[user.phone];
  if (!record || record.otp !== code) {
    return res.status(400).json({ error: 'Invalid or expired password reset verification code' });
  }

  // Token consumed
  delete db.otps[user.phone];

  // Update password in users table
  const userIdx = db.users.findIndex(u => u.id === user.id);
  db.users[userIdx].password = newPassword;
  saveDatabase(db);

  return res.json({
    success: true,
    message: 'Password reset accomplished successfully. Please login with your new password!'
  });
});

// Seamless role transition and onboarding endpoint
app.post('/api/auth/switch-role', (req, res) => {
  const { currentUserId, targetRole, storeName, address, vehicleNumber } = req.body;

  if (!currentUserId || !targetRole) {
    return res.status(400).json({ error: 'currentUserId and targetRole are required' });
  }

  const currentUser = db.users.find(u => u.id === currentUserId);
  if (!currentUser) {
    return res.status(404).json({ error: 'Current user session profile not found' });
  }

  // Find or create a matching user for the target role
  let targetUser = db.users.find(u => u.phone === currentUser.phone && u.role === targetRole);

  if (!targetUser) {
    // Lazy onboard user for the target role
    targetUser = {
      id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      email: currentUser.email,
      phone: currentUser.phone,
      password: currentUser.password || 'password123',
      role: targetRole,
      name: currentUser.name || 'Partner ' + currentUser.phone.slice(-4),
      walletBalance: currentUser.walletBalance !== undefined ? currentUser.walletBalance : 1000,
      walletTransactions: currentUser.walletTransactions || [],
      address: address || currentUser.address || 'B-4/45, Sector 15, Saket, New Delhi',
      storeName: targetRole === 'seller' ? (storeName || `${currentUser.name || 'Resident'}'s Quick Store`) : undefined,
      vehicleNumber: targetRole === 'rider' ? (vehicleNumber || 'DL-3S-CQ-' + Math.floor(1000 + Math.random() * 9000)) : undefined,
      createdAt: new Date().toISOString()
    };

    db.users.push(targetUser);
    saveDatabase(db);
    console.log(`[ROLE SWITCH] Onboarded new ${targetRole} user:`, targetUser.email);
  }

  // Generate a new JWT token for the switched role
  const token = generateJWT({ id: targetUser.id, phone: targetUser.phone, role: targetRole });

  // Update in database to make sure details persist
  if (storeName && targetRole === 'seller') {
    const idx = db.users.findIndex(u => u.id === targetUser.id);
    if (idx !== -1) {
      db.users[idx].storeName = storeName;
      if (address) db.users[idx].address = address;
      saveDatabase(db);
    }
  }
  if (vehicleNumber && targetRole === 'rider') {
    const idx = db.users.findIndex(u => u.id === targetUser.id);
    if (idx !== -1) {
      db.users[idx].vehicleNumber = vehicleNumber;
      if (address) db.users[idx].address = address;
      saveDatabase(db);
    }
  }

  return res.json({
    success: true,
    token,
    role: targetRole,
    profile: getResponseProfile ? getResponseProfile(targetUser) : targetUser
  });
});

// Verify active token query
app.get('/api/auth/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyJWT(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token session' });
  }

  const user = db.users.find(u => u.id === payload.id);
  if (!user) {
    return res.status(401).json({ error: 'User associated with this token no longer exists' });
  }

  return res.json({
    success: true,
    role: user.role,
    profile: getResponseProfile(user)
  });
});

// Verify Supabase Connection Live Status
app.get('/api/supabase/status', async (req, res) => {
  const rawUrl = process.env.SUPABASE_URL || '';
  const rawKey = process.env.SUPABASE_ANON_KEY || '';

  const cleanUrl = sanitizeSupabaseUrl(rawUrl);
  const cleanKey = sanitizeSupabaseKey(rawKey);

  // Diagnostics details object
  const diagnostics = {
    rawUrlLength: rawUrl.length,
    rawKeyLength: rawKey.length,
    cleanUrlLength: cleanUrl.length,
    cleanKeyLength: cleanKey.length,
    urlStart: cleanUrl ? cleanUrl.substring(0, Math.min(22, cleanUrl.length)) + (cleanUrl.length > 22 ? '...' : '') : 'Empty',
    urlEnd: cleanUrl && cleanUrl.length > 10 ? '...' + cleanUrl.substring(cleanUrl.length - 12) : 'Empty',
    keyStart: cleanKey ? cleanKey.substring(0, Math.min(10, cleanKey.length)) + '...' : 'Empty',
    keyEnd: cleanKey && cleanKey.length > 8 ? '...' + cleanKey.substring(cleanKey.length - 8) : 'Empty',
    urlDotCount: cleanUrl ? cleanUrl.split('.').length - 1 : 0,
    keyDotCount: cleanKey ? cleanKey.split('.').length - 1 : 0,
    hasQuotesRemoved: (rawUrl !== cleanUrl) || (rawKey !== cleanKey),
    envStatus: {
      hasUrl: !!rawUrl,
      hasKey: !!rawKey
    }
  };

  if (!cleanUrl || !cleanKey) {
    return res.json({
      configured: false,
      status: 'missing_credentials',
      diagnostics,
      message: 'Supabase credentials are not configured in your AI Studio Environment Variables. The app is currently running in fallback mode with a local JSON database.'
    });
  }

  // Mask the project URL for security & hygiene
  let maskedUrl = cleanUrl;
  let parsedHost = '';
  try {
    const parsedUrl = new URL(cleanUrl);
    parsedHost = parsedUrl.hostname;
    const hostParts = parsedHost.split('.');
    if (hostParts.length > 0) {
      const projCode = hostParts[0];
      const maskedProjCode = projCode.length > 5 ? `${projCode.substring(0, 3)}***${projCode.substring(projCode.length - 2)}` : '***';
      maskedUrl = `${parsedUrl.protocol}//${maskedProjCode}.${hostParts.slice(1).join('.')}`;
    }
  } catch (e) {
    maskedUrl = 'Invalid URL Format';
  }

  // Check JWT payload structure
  let tokenParts = cleanKey.split('.');
  let jwtError = '';
  let tokenRole = '';
  let tokenRef = '';
  let tokenIss = '';
  
  if (tokenParts.length !== 3) {
    jwtError = 'The key does not have the 3-part structure of a JSON Web Token (JWT). Did you copy the Database Password or another field instead of the Anon/Public API Key?';
  } else {
    try {
      const payloadB64 = tokenParts[1];
      const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      tokenRole = payload.role || '';
      tokenRef = payload.ref || '';
      tokenIss = payload.iss || '';
    } catch (e: any) {
      jwtError = 'JWT payload base64 parsing or JSON decoding failed. Please verify you copied the exact public anon token.';
    }
  }

  // Check for project reference mismatches
  let isProjectMismatch = false;
  if (tokenRef && parsedHost) {
    const hostParts = parsedHost.split('.');
    const urlRef = hostParts[0];
    if (urlRef && tokenRef && urlRef.toLowerCase() !== tokenRef.toLowerCase()) {
      isProjectMismatch = true;
    }
  }

  try {
    // Perform live connection verification with cleaned URL and clean Key
    let response = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': cleanKey,
        'Authorization': `Bearer ${cleanKey}`
      }
    });

    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch (e) {}

    // Detailed console diagnostics for workspace log monitoring
    console.log('[SUPABASE CONNECTION DIAGNOSTICS]');
    console.log(`- Clean URL: ${cleanUrl}`);
    console.log(`- Clean Key Length: ${cleanKey.length}`);
    console.log(`- JWT Decoded Role: "${tokenRole}", Project Ref: "${tokenRef}"`);
    console.log(`- Http Handshake Response Status: ${response.status}`);

    let isHandshakeFailure = response.status === 401 || response.status === 403;

    // Check if the 401/403 response was simply complaining about the root route needing service_role. 
    // This indicates the token signature is 100% correct, just the route has restriction rules.
    if (isHandshakeFailure && (responseBody.includes('service_role') || responseBody.includes("Only the `service_role` API key"))) {
      isHandshakeFailure = false;
    }

    // Handshake fallback checkpoint: Try table check if the root endpoint is blocked
    if (isHandshakeFailure) {
      try {
        console.log('- Attempting fallback check on non-existent table dummy identifier...');
        const fallbackRes = await fetch(`${cleanUrl}/rest/v1/connection_handshake_dummy`, {
          method: 'GET',
          headers: {
            'apikey': cleanKey,
            'Authorization': `Bearer ${cleanKey}`
          }
        });
        
        console.log(`- Fallback Check Response Status: ${fallbackRes.status}`);
        if (fallbackRes.status === 200 || fallbackRes.status === 400 || fallbackRes.status === 404) {
          isHandshakeFailure = false;
          response = fallbackRes; // use fallback responses for the rest of verification flow
        }
      } catch (fallbackErr) {
        console.warn('- Fallback check endpoint resolution error:', fallbackErr);
      }
    }

    if (isHandshakeFailure) {
      let customMessage = 'Endpoint discovered, but Supabase rejected the Anon Key (401/403 Unauthorized).';
      if (jwtError) {
        customMessage += ` Key diagnostic: ${jwtError}`;
      } else if (isProjectMismatch) {
        customMessage += ` SYSTEM DETECTED A PROJECT MISMATCH: Your SUPABASE_URL refers to project subdomain "${parsedHost.split('.')[0]}", but your SUPABASE_ANON_KEY belongs to project "${tokenRef}". Please ensure both the URL and Key are from the same Supabase project!`;
      } else if (tokenRole && tokenRole !== 'anon') {
        customMessage += ` Key diagnostic: The key has the role "${tokenRole}" instead of "anon". Please use the Anon Public key.`;
      } else {
        customMessage += ' Please verify there are no hidden trailing characters or mismatching project IDs in your AI Studio secrets.';
      }

      return res.json({
        configured: true,
        status: 'invalid_credentials',
        maskedUrl,
        diagnostics: {
          ...diagnostics,
          role: tokenRole,
          ref: tokenRef || 'Unknown',
          issuer: tokenIss,
          isMismatch: isProjectMismatch,
          error: jwtError
        },
        message: customMessage
      });
    }

    // Response ok, 200, 400, or 404 means the api/database itself responded properly to our verified HTTP signature
    return res.json({
      configured: true,
      status: 'success',
      maskedUrl,
      diagnostics: {
        ...diagnostics,
        role: tokenRole,
        ref: tokenRef || 'Unknown',
        isMismatch: false
      },
      message: 'Established premium real-time connection to Supabase! SwiftCart logs live dispatch states to your cloud datastore.'
    });

  } catch (err: any) {
    console.error('[SUPABASE CONNECTION ERROR]', err);
    
    const isDnsError = err.code === 'ENOTFOUND' || (err.message && err.message.includes('ENOTFOUND'));
    let customMessage = `Database connection handshake failed: ${err.message || err}`;
    
    if (isDnsError) {
      customMessage = `DNS Domain Resolution Failed (ENOTFOUND). The server is unable to look up the IP address for "${parsedHost || 'your Subdomain'}". Please verify that your SUPABASE_URL is correct and has not been paused, deleted, or entered with a typo in the AI Studio Settings.`;
    }

    return res.json({
      configured: true,
      status: 'network_error',
      maskedUrl,
      diagnostics: {
        ...diagnostics,
        isDnsError,
        errorCode: err.code || 'UNKNOWN',
        errorMessage: err.message || String(err)
      },
      message: customMessage
    });
  }
});

// 3. Categories Management
app.get('/api/categories', (req, res) => {
  res.json(db.categories);
});

// 4. Products Management
app.get('/api/products', async (req, res) => {
  const { category, sellerId } = req.query;

  if (serverSupabase) {
    try {
      console.log('[SUPABASE PRODUCTS] Fetching products from Supabase...');
      // Fetch products and left join with inventory in case we have stock details there
      const { data: supaProducts, error } = await serverSupabase
        .from('products')
        .select('*, inventory(stock)');

      if (!error && supaProducts && supaProducts.length > 0) {
        console.log(`[SUPABASE PRODUCTS] Successfully fetched ${supaProducts.length} products from Supabase.`);
        
        const mappedProducts = supaProducts.map((p: any) => {
          let stockVal = 50;
          if (p.stock !== undefined && p.stock !== null) {
            stockVal = Number(p.stock);
          } else if (p.inventory) {
            if (Array.isArray(p.inventory) && p.inventory.length > 0) {
              stockVal = Number(p.inventory[0].stock ?? 50);
            } else if (typeof p.inventory === 'object') {
              stockVal = Number((p.inventory as any).stock ?? 50);
            }
          }

          return {
            id: String(p.id),
            name: String(p.name || ''),
            price: Number(p.price ?? 0),
            originalPrice: p.original_price !== undefined && p.original_price !== null ? Number(p.original_price) : (p.originalPrice !== undefined && p.originalPrice !== null ? Number(p.originalPrice) : undefined),
            image: p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
            category: String(p.category_id || p.category || ''),
            stock: stockVal,
            unit: String(p.unit || '1 unit'),
            sellerId: String(p.seller_id || p.sellerId || 's_1'),
            sellerName: String(p.seller_name || p.sellerName || 'Verified Seller'),
            deliveryMinutes: Number(p.delivery_minutes ?? p.deliveryMinutes ?? 10),
            description: String(p.description || ''),
            isTrending: p.is_trending === true || p.isTrending === true,
            isRecommended: p.is_recommended === true || p.isRecommended === true,
            variants: Array.isArray(p.variants) ? p.variants : undefined
          };
        });

        let filteredList = mappedProducts;
        if (category) {
          filteredList = filteredList.filter((p: any) => p.category === category);
        }
        if (sellerId) {
          filteredList = filteredList.filter((p: any) => p.sellerId === sellerId);
        }
        return res.json(filteredList);
      } else {
        if (error) {
          console.warn('[SUPABASE PRODUCTS FETCH ERROR] Falling back to local data. Message:', error.message);
        } else {
          console.log('[SUPABASE PRODUCTS] Products table is empty in Supabase. Falling back to local state.');
        }
      }
    } catch (e: any) {
      console.warn('[SUPABASE PRODUCTS FETCH EXCEPTION] Falling back to local state. Error:', e.message);
    }
  }

  // Fallback to local products
  let list = db.products;

  if (category) {
    list = list.filter(p => p.category === category);
  }
  if (sellerId) {
    list = list.filter(p => p.sellerId === sellerId);
  }

  res.json(list);
});

app.post('/api/products', (req, res) => {
  const productData = req.body;
  if (!productData.name || !productData.price || !productData.category || !productData.sellerId) {
    return res.status(400).json({ error: 'Missing required product parameters' });
  }

  const newProduct: Product = {
    id: 'p_' + Date.now(),
    name: productData.name,
    price: Number(productData.price),
    originalPrice: productData.originalPrice ? Number(productData.originalPrice) : undefined,
    image: productData.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
    category: productData.category,
    stock: Number(productData.stock ?? 10),
    unit: productData.unit || '1 unit',
    sellerId: productData.sellerId,
    sellerName: productData.sellerName || 'Verified Seller',
    deliveryMinutes: Number(productData.deliveryMinutes ?? 10),
    description: productData.description || 'No description provided',
    isTrending: productData.isTrending === true,
    isRecommended: productData.isRecommended === true,
    variants: Array.isArray(productData.variants) ? productData.variants : undefined
  };

  db.products.push(newProduct);
  saveDatabase(db);

  return res.json({ success: true, product: newProduct });
});

app.put('/api/products/:id/stock', (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products[idx].stock = Number(stock ?? 0);
  saveDatabase(db);
  return res.json({ success: true, product: db.products[idx] });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products[idx] = {
    ...db.products[idx],
    ...updates,
    price: updates.price !== undefined ? Number(updates.price) : db.products[idx].price,
    originalPrice: updates.originalPrice !== undefined ? (updates.originalPrice ? Number(updates.originalPrice) : undefined) : db.products[idx].originalPrice,
    stock: updates.stock !== undefined ? Number(updates.stock) : db.products[idx].stock,
    deliveryMinutes: updates.deliveryMinutes !== undefined ? Number(updates.deliveryMinutes) : db.products[idx].deliveryMinutes,
    isTrending: updates.isTrending !== undefined ? !!updates.isTrending : db.products[idx].isTrending,
    isRecommended: updates.isRecommended !== undefined ? !!updates.isRecommended : db.products[idx].isRecommended,
    variants: updates.variants !== undefined ? (Array.isArray(updates.variants) ? updates.variants : undefined) : db.products[idx].variants
  };

  saveDatabase(db);
  return res.json({ success: true, product: db.products[idx] });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// 5. Orders Management
app.get('/api/orders', (req, res) => {
  try {
    const { phone, sellerId, riderId } = req.query;
    let list = db.orders || [];

    // Backfill OTPs for any orders that don't have one
    let changed = false;
    list.forEach(o => {
      if (o && !o.otp) {
        o.otp = Math.floor(1000 + Math.random() * 9000).toString();
        changed = true;
      }
    });
    if (changed) {
      saveDatabase(db);
    }

    if (phone) {
      list = list.filter(o => o && o.customerPhone === phone);
    }
    if (sellerId) {
      // List orders that contain any items belonging to this sellerId
      list = list.filter(o => o && Array.isArray(o.items) && o.items.some(item => item && item.product && item.product.sellerId === sellerId));
    }
    if (riderId) {
      list = list.filter(o => o && o.riderId === riderId);
    }

    // Sort orders descending by date safely
    list = [...list].sort((a, b) => {
      const dateA = a && a.createdAt ? a.createdAt : '';
      const dateB = b && b.createdAt ? b.createdAt : '';
      return dateB.localeCompare(dateA);
    });

    res.json(list);
  } catch (err: any) {
    console.error('[SERVER API ERROR] /api/orders failed:', err);
    res.status(500).json({ error: 'Internal Server Error while fetching orders', list: [] });
  }
});

app.post('/api/orders', (req, res) => {
  const { 
    customerPhone, 
    customerEmail,
    customerUid,
    customerName, 
    items, 
    subtotal, 
    deliveryFee, 
    discount, 
    total, 
    address, 
    paymentMethod, 
    sellerId,
    paymentStatus,
    transactionId
  } = req.body;

  if ((!customerPhone && !customerEmail) || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing customer details or items' });
  }

  // Check and deduct stock for each items
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.product.id);
    if (!prod) {
      return res.status(400).json({ error: `Product ${item.product.name} no longer exists` });
    }
  }

  // Deduct stock
  items.forEach((item: any) => {
    const prod = db.products.find(p => p.id === item.product.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
    }
  });

  const newOrderId = 'SC-' + Math.floor(100000 + Math.random() * 900000);
  const resolvedPaymentMethod = paymentMethod || 'COD';
  let resolvedPaymentStatus = paymentStatus || 'pending';
  let resolvedTransactionId = transactionId || '';

  // If wallet payment, check and deduct balance
  if (resolvedPaymentMethod === 'Wallet') {
    const userIdx = db.users.findIndex(u => 
      (customerPhone && u.phone === customerPhone) || 
      (customerEmail && u.email.toLowerCase() === customerEmail.toLowerCase())
    );
    if (userIdx === -1) {
      return res.status(400).json({ error: 'User wallet account not found' });
    }
    const currentBalance = db.users[userIdx].walletBalance !== undefined ? db.users[userIdx].walletBalance : 1000;
    if (currentBalance < Number(total)) {
      return res.status(400).json({ error: `Insufficient wallet balance! Current balance is ₹${currentBalance}, order total is ₹${total}.` });
    }
    db.users[userIdx].walletBalance = currentBalance - Number(total);
    db.users[userIdx].walletTransactions = db.users[userIdx].walletTransactions || [];
    
    resolvedTransactionId = 'TX-' + Math.floor(100000 + Math.random() * 900000);
    resolvedPaymentStatus = 'success';

    db.users[userIdx].walletTransactions.unshift({
      id: resolvedTransactionId,
      type: 'debit',
      amount: Number(total),
      description: `Purchase of grocery Order #${newOrderId}`,
      createdAt: new Date().toISOString(),
      status: 'success',
      gateway: 'Wallet',
      referenceId: newOrderId
    });
  }

  const newOrder: Order = {
    id: newOrderId,
    customerPhone: customerPhone || '',
    customerEmail: customerEmail || '',
    customerName: customerName || 'Valued Customer',
    items,
    subtotal: Number(subtotal),
    deliveryFee: Number(deliveryFee),
    discount: Number(discount),
    total: Number(total),
    status: 'placed',
    createdAt: new Date().toISOString(),
    address: address || 'No address provided',
    paymentMethod: resolvedPaymentMethod,
    paymentStatus: resolvedPaymentStatus as any,
    transactionId: resolvedTransactionId,
    sellerId: sellerId || items[0]?.product?.sellerId || 's1',
    otp: Math.floor(1000 + Math.random() * 9000).toString()
  };

  db.orders.push(newOrder);
  saveDatabase(db);

  // Broadcast event: Customer places order -> Nearest dark store receives order
  const storeLabel = DelhiStores[newOrder.sellerId]?.name || "Nearest Base Hub";
  broadcastOrderWorkflow(
    newOrder, 
    'new_order', 
    `Order #${newOrder.id} successfully placed! Near dark store base "${storeLabel}" receives order.`
  );

  return res.json({ success: true, order: newOrder });
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, riderId, riderName, riderPhone } = req.body;

  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const previousStatus = db.orders[idx].status;
  const previousPackingStatus = db.orders[idx].packingStatus || 'pending';

  if (status) {
    db.orders[idx].status = status;

    // Auto-Refund processing when status is changed to 'rejected'
    if (status === 'rejected' && previousStatus !== 'rejected') {
      const order = db.orders[idx];
      const isPaid = order.paymentMethod === 'Wallet' || order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Stripe';
      if (isPaid && order.paymentStatus !== 'refunded') {
        const userIdx = db.users.findIndex(u => 
          (order.customerPhone && u.phone === order.customerPhone) || 
          (order.customerEmail && u.email.toLowerCase() === order.customerEmail.toLowerCase())
        );
        if (userIdx !== -1) {
          const user = db.users[userIdx];
          if (user.walletBalance === undefined) user.walletBalance = 1000;
          user.walletBalance += order.total;
          user.walletTransactions = user.walletTransactions || [];
          user.walletTransactions.unshift({
            id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
            type: 'credit',
            amount: order.total,
            description: `Auto-refund for Seller Rejected Order #${order.id}`,
            createdAt: new Date().toISOString(),
            status: 'success',
            gateway: order.paymentMethod as any,
            referenceId: order.id
          });
        }
        order.paymentStatus = 'refunded';
      }
    }
  }
  if (riderId) db.orders[idx].riderId = riderId;
  if (riderName) db.orders[idx].riderName = riderName;
  if (riderPhone) db.orders[idx].riderPhone = riderPhone;

  if (req.body.packingStatus !== undefined) {
    db.orders[idx].packingStatus = req.body.packingStatus;
  }
  if (req.body.rejectionReason !== undefined) {
    db.orders[idx].rejectionReason = req.body.rejectionReason;
  }

  // Trigger auto assigned rider checks if conditions are updated to 'ready'
  let autoAssigned = false;
  if (db.orders[idx].packingStatus === 'ready' && !db.orders[idx].riderId) {
    autoAssigned = tryAutoAssignRider(db.orders[idx], db);
  }

  const updatedOrder = db.orders[idx];

  // Broadcast relevant notifications based on packing status progression
  if (updatedOrder.packingStatus === 'ready' && previousPackingStatus !== 'ready' && !autoAssigned) {
    broadcastOrderWorkflow(updatedOrder, 'order_packed', `Store packs items for Order #${updatedOrder.id}! Ready for runner pick up.`);
  } else if (updatedOrder.packingStatus === 'preparing' && previousPackingStatus !== 'preparing') {
    broadcastOrderWorkflow(updatedOrder, 'preparing', `Store starts packing items for Order #${updatedOrder.id}...`);
  }

  // If order is delivered, give rider some earnings representing realistic delivery commission
  if (status === 'delivered' && db.orders[idx].riderId) {
    const rIdx = db.riders.findIndex(r => r.id === db.orders[idx].riderId);
    if (rIdx !== -1) {
      db.riders[rIdx].earnings += 50; // Earn $50 commission per delivery
      db.riders[rIdx].status = 'available'; // Set status back to available
      db.riders[rIdx].activeOrderId = undefined;
    }
    broadcastOrderWorkflow(updatedOrder, 'delivered', `Security PIN handoff complete. Order #${updatedOrder.id} successfully delivered!`);
  }

  // If rider is assigned manually and status marked dispatched (or manually out for delivery)
  if (status === 'dispatched' && previousStatus !== 'dispatched' && !autoAssigned) {
    const rIdx = db.riders.findIndex(r => r.id === db.orders[idx].riderId);
    if (rIdx !== -1) {
      db.riders[rIdx].status = 'delivering';
      db.riders[rIdx].activeOrderId = id;
    }
    broadcastOrderWorkflow(updatedOrder, 'out_for_delivery', `Order #${updatedOrder.id} has left the store hub! Live tracking active.`);
  }

  // Manual Rider assigned updates
  if (riderId && riderId !== updatedOrder.riderId) {
    broadcastOrderWorkflow(updatedOrder, 'rider_assigned', `Rider ${updatedOrder.riderName} is assigned to deliver your Order #${updatedOrder.id}.`);
  }

  saveDatabase(db);
  return res.json({ success: true, order: db.orders[idx] });
});

// Wallet Topup and Refund Endpoints
app.post('/api/wallet/topup', (req, res) => {
  const { customerPhone, amount, gateway, gatewayStatus, referenceId } = req.body;

  if (!customerPhone || amount === undefined) {
    return res.status(400).json({ error: 'Missing customerPhone or amount parameter' });
  }

  const userIdx = db.users.findIndex(u => u.phone === customerPhone);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const user = db.users[userIdx];
  if (user.walletBalance === undefined) user.walletBalance = 1000;
  if (!user.walletTransactions) user.walletTransactions = [];

  const txAmount = Number(amount);
  const refId = referenceId || 'TX-' + Math.floor(100000 + Math.random() * 900000);

  const tx: any = {
    id: refId,
    type: 'credit',
    amount: txAmount,
    description: gatewayStatus === 'success' ? `Wallet Top-Up via ${gateway}` : `Failed Top-Up attempt via ${gateway}`,
    createdAt: new Date().toISOString(),
    status: gatewayStatus,
    gateway: gateway || 'Razorpay',
    referenceId: refId
  };

  user.walletTransactions.unshift(tx);

  if (gatewayStatus === 'success') {
    user.walletBalance += txAmount;
    saveDatabase(db);
    return res.json({
      success: true,
      message: `Successfully credited ₹${txAmount} to your wallet!`,
      walletBalance: user.walletBalance,
      profile: getResponseProfile(user)
    });
  } else {
    saveDatabase(db);
    return res.status(400).json({
      success: false,
      error: `Payment failed on ${gateway} processing. No funds credited.`,
      profile: getResponseProfile(user)
    });
  }
});

app.post('/api/orders/:id/refund', (req, res) => {
  const { id } = req.params;
  const { refundReason } = req.body;

  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = db.orders[idx];
  if (order.status === 'refunded') {
    return res.status(455).json({ error: 'Order is already refunded.' });
  }

  // Update order details
  order.status = 'refunded';
  order.paymentStatus = 'refunded';
  order.refundReason = refundReason || 'Customer requested refund';
  order.refundedAt = new Date().toISOString();

  // If order was paid via online gateway or wallet, credit back to user balance!
  if (order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Stripe' || order.paymentMethod === 'Wallet') {
    const userIdx = db.users.findIndex(u => 
      (order.customerPhone && u.phone === order.customerPhone) || 
      (order.customerEmail && u.email.toLowerCase() === order.customerEmail.toLowerCase())
    );
    if (userIdx !== -1) {
      const user = db.users[userIdx];
      if (user.walletBalance === undefined) user.walletBalance = 1000;
      user.walletBalance += order.total;
      user.walletTransactions = user.walletTransactions || [];
      user.walletTransactions.unshift({
        id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
        type: 'credit',
        amount: order.total,
        description: `Refund value for cancelled Order #${order.id}`,
        createdAt: new Date().toISOString(),
        status: 'success',
        gateway: order.paymentMethod as any,
        referenceId: order.id
      });
    }
  }

  saveDatabase(db);
  broadcastOrderWorkflow(order, 'order_refunded', `Refund processed successfully for Order #${order.id}. Amount ₹${order.total} credited.`);

  return res.json({ success: true, message: 'Order refund completed successfully.', order });
});

// 6. Admin Panel Hooks
app.get('/api/sellers', (req, res) => {
  res.json(db.sellers);
});

app.put('/api/sellers/:id/approve', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // approved or rejected

  const idx = db.sellers.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Seller profile not found' });
  }

  db.sellers[idx].status = status;
  saveDatabase(db);

  return res.json({ success: true, seller: db.sellers[idx] });
});

app.get('/api/riders', (req, res) => {
  res.json(db.riders);
});

app.put('/api/riders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const idx = db.riders.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Rider not found' });
  }

  db.riders[idx].status = status;

  // Search if any order is unassigned and ready, then auto assign immediately when rider goes available
  if (status === 'available') {
    const readyUnassigned = db.orders.find(o => o.packingStatus === 'ready' && !o.riderId);
    if (readyUnassigned) {
      db.riders[idx].status = 'delivering';
      db.riders[idx].activeOrderId = readyUnassigned.id;

      const oIdx = db.orders.findIndex(o => o.id === readyUnassigned.id);
      db.orders[oIdx].riderId = db.riders[idx].id;
      db.orders[oIdx].riderName = db.riders[idx].name;
      db.orders[oIdx].riderPhone = db.riders[idx].phone;
      db.orders[oIdx].status = 'dispatched';

      console.log(`[RIDER-ONLINE-DISPATCH] Automatically assigned newly online Rider ${db.riders[idx].name} to Order #${readyUnassigned.id}`);
      
      broadcastOrderWorkflow(db.orders[oIdx], 'rider_assigned', `Rider ${db.riders[idx].name} assigned automatically on duty to deliver Order #${readyUnassigned.id}.`);
      broadcastOrderWorkflow(db.orders[oIdx], 'out_for_delivery', `Order #${readyUnassigned.id} dispatched! Start tracking on your map.`);
    }
  }

  saveDatabase(db);

  return res.json({ success: true, rider: db.riders[idx] });
});

// Reset database endpoint for testing
app.post('/api/admin/reset-db', (req, res) => {
  db = {
    products: DEFAULT_PRODUCTS,
    orders: [],
    sellers: DEFAULT_SELLERS,
    riders: DEFAULT_RIDERS,
    categories: DEFAULT_CATEGORIES,
    otps: {},
    users: DEFAULT_USERS,
    coupons: DEFAULT_COUPONS,
    banners: DEFAULT_BANNERS,
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Database reset to default template state' });
});

// --- ENHANCED BUNDLED ROUTING SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SWIFT CART] Live at http://localhost:${PORT}`);
  });
}

startServer();
