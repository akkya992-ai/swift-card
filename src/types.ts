export type UserRole = 'customer' | 'admin' | 'seller' | 'rider';

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
  status: 'success' | 'failed';
  gateway: 'Razorpay' | 'Stripe' | 'Wallet' | 'COD' | 'System';
  referenceId: string;
}

export interface UserProfile {
  phone: string;
  role: UserRole;
  storeName?: string;
  name?: string;
  vehicleNumber?: string;
  address?: string;
  walletBalance?: number;
  walletTransactions?: WalletTransaction[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  stock: number;
  unit: string;
  sellerId: string;
  sellerName: string;
  deliveryMinutes: number;
  description: string;
  isTrending?: boolean;
  isRecommended?: boolean;
  variants?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface Order {
  id: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  customerId?: string;
  customerUid?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'rejected' | 'refunded';
  createdAt: string;
  address: string;
  paymentMethod: string;
  paymentStatus?: 'pending' | 'success' | 'failed' | 'refunded';
  transactionId?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  sellerId: string;
  packingStatus?: 'pending' | 'accepted' | 'preparing' | 'packing' | 'ready' | 'delayed' | 'rejected';
  rejectionReason?: string;
  refundReason?: string;
  refundedAt?: string;
  deliveredAt?: string;
  otp?: string;
  deliveryInstructions?: string;
  deliveryTip?: number;
  deliveryStage?: 'pickup_nav' | 'delivery_nav' | 'otp_verify';
}

export interface SellerProfile {
  id: string;
  userId?: string;
  storeName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  status: 'available' | 'delivering' | 'offline';
  activeOrderId?: string;
  earnings: number;
  createdAt: string;
  lat?: number;
  lng?: number;
}

export interface OutboundNotification {
  id: string;
  orderId: string;
  recipientRole: 'admin' | 'seller' | 'rider' | 'customer';
  recipientName: string;
  recipientPhone: string;
  channel: 'sms' | 'whatsapp' | 'fcm' | 'pwa';
  title?: string;
  category?: 'promos' | 'orderStatuses' | 'systemAlerts';
  message: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  isRead?: boolean;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedReason?: string;
  retryCount?: number;
  retryLogs?: string[];
}

export interface RestaurantCategory {
  id: string;
  name: string;
  image?: string;
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  categoryId: string; // references RestaurantCategory id
  image?: string;
  rating?: number;
  deliveryMinutes?: number;
  priceForTwo?: number;
  address?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string; // references Restaurant id
  name: string;
  createdAt?: string;
}

export interface RestaurantProduct {
  id: string;
  restaurantId: string;
  menuCategoryId: string; // references MenuCategory id
  name: string;
  price: number;
  description?: string;
  image?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface Hostel {
  id: string;
  name: string;
  image?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface TiffinCategory {
  id: string;
  hostelId: string; // references Hostel id
  name: string; // Breakfast, Lunch, Dinner, Snacks, etc.
  createdAt?: string;
}

export interface TiffinItem {
  id: string;
  hostelId: string;
  tiffinCategoryId: string; // references TiffinCategory id
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface AppSettings {
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  apkUrl: string;
  releaseNotes: string;
}



