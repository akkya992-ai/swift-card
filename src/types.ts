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
  otp?: string;
}

export interface SellerProfile {
  id: string;
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
}
