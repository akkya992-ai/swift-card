import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User, 
  MapPin, 
  Sparkles, 
  Plus, 
  Minus, 
  Clock, 
  Eye, 
  ArrowLeft,
  ArrowRight,
  X,
  CreditCard,
  Truck,
  Apple,
  Egg,
  Cookie,
  CupSoda,
  Soup,
  Croissant,
  IceCream,
  Baby,
  Smile,
  ShieldCheck,
  Package,
  Bike,
  Heart,
  Bell,
  Trash2,
  CheckCircle2,
  Star,
  ThumbsUp,
  Check,
  Compass,
  Gift,
  XCircle,
  Wallet,
  Receipt,
  Info,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Product, CartItem, Order, UserRole } from '../types';

// Import our modular sub-components
import LiveTracking from './LiveTracking';
import AddressesManager from './AddressesManager';
import CheckoutPage from './CheckoutPage';
import WishlistPage from './WishlistPage';

interface CustomerAppProps {
  userProfile: any;
  onLogout: () => void;
  reloadUserProfile?: () => Promise<void>;
  onSwitchRole?: (role: UserRole, customToken?: string, customProfile?: any) => void;
}

interface AddressItem {
  id: string;
  label: string;
  address: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'promo';
}

interface UserReview {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export default function CustomerApp({ userProfile, onLogout, reloadUserProfile, onSwitchRole }: CustomerAppProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Onboarding screens state
  const [onboardingView, setOnboardingView] = useState<'none' | 'seller' | 'rider' | 'admin'>('none');
  const [storeOnboardingName, setStoreOnboardingName] = useState('');
  const [storeOnboardingAddress, setStoreOnboardingAddress] = useState('');
  const [vehicleOnboardingNumber, setVehicleOnboardingNumber] = useState('');
  const [adminOnboardingPass, setAdminOnboardingPass] = useState('');
  const [switchingRoleLoading, setSwitchingRoleLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // Local wallet top-up states inside Profile Section
  const [profileTopUpAmount, setProfileTopUpAmount] = useState('500');
  const [profileTopUpGateway, setProfileTopUpGateway] = useState<'Razorpay' | 'Stripe'>('Razorpay');
  const [profileTopUpSimulateSuccess, setProfileTopUpSimulateSuccess] = useState(true);
  const [isToppingUpProfile, setIsToppingUpProfile] = useState(false);
  const [isTopUpPanelOpen, setIsTopUpPanelOpen] = useState(false);

  // Supabase live status monitoring state
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    status: string;
    maskedUrl?: string;
    message: string;
    statusCode?: number;
  } | null>(null);
  const [supabaseStatusLoading, setSupabaseStatusLoading] = useState(false);

  const fetchSupabaseStatus = async () => {
    setSupabaseStatusLoading(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (err: any) {
      console.error('[SUPABASE_CHECK] Error:', err);
      setSupabaseStatus({
        configured: false,
        status: 'network_error',
        message: 'Could not connect to the sandboxed API backend check tool.'
      });
    } finally {
      setSupabaseStatusLoading(false);
    }
  };
  
  // Cart management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(userProfile.address || 'B-4/45, Sector 15, Saket, New Delhi');
  const [activeAddressId, setActiveAddressId] = useState<string | null>('addr-1');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  // Orders & Active Track
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTrackOrder, setActiveTrackOrder] = useState<Order | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // Tab management (Expanded for granular premium page routings)
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'orders' | 'profile' | 'wishlist' | 'checkout' | 'live-tracking' | 'addresses' | 'product-details'>('home');

  // Shimmer effect loading states
  const [isShimmering, setIsShimmering] = useState(false);

  useEffect(() => {
    setIsShimmering(true);
    const timer = setTimeout(() => {
      setIsShimmering(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeTab, selectedCategory]);

  useEffect(() => {
    if (searchQuery) {
      setIsShimmering(true);
      const timer = setTimeout(() => {
        setIsShimmering(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchSupabaseStatus();
    }
  }, [activeTab]);

  // Push notifications queue stack state
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [notificationsHistory, setNotificationsHistory] = useState<NotificationItem[]>([]);
  const [isAlertTrayOpen, setIsAlertTrayOpen] = useState(false);
  const [liveBanners, setLiveBanners] = useState<any[]>([]);

  // Wishlist state saved in localstorage
  const [wishlist, setWishlist] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
  });

  // Local reviews state saved in localStorage to simulate writing live feedback on items
  const [reviews, setReviews] = useState<Record<string, UserReview[]>>(() => {
    const saved = localStorage.getItem('product_reviews_sim');
    if (saved) return JSON.parse(saved);

    // Seed data reviews
    return {
      'p-1': [
        { user: 'Sonia Gupta', rating: 5, comment: 'Incredibly ripe and sweet shimla apples. Handpicked quality!', date: 'Today at 3:15 PM' },
        { user: 'Aman Verma', rating: 4, comment: 'Great crunch, 10 min arrival time was absolutely true.', date: 'Yesterday' }
      ],
      'p-2': [
        { user: 'Rohan Mehra', rating: 5, comment: 'Super thick and chilled. Great breakfast staple!', date: '2 days ago' }
      ]
    };
  });

  // New review form
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState(userProfile.name || 'Valued Resident');

  // Saved Addresses list state initialized with defaults
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>(() => {
    const saved = localStorage.getItem('saved_addresses_customer');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'addr-1', label: 'Home 🏠', address: userProfile.address || 'B-4/45, Sector 15, Saket, New Delhi' },
      { id: 'addr-2', label: 'Office 💼', address: 'Tech-Hub, Unit 504, Cyber City, Gurgaon, Delhi NCR' }
    ];
  });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchBanners();
    fetchOrders();

    // Create persistent intervals to simulate order updates and background store alerts
    const interval = setInterval(() => {
      fetchOrders();
    }, 6000);

    // Initial warm welcome push notification
    setTimeout(() => {
      triggerPushNotification(
        "Welcome Back! 👋", 
        `Logged in securely to 10-MIN blinkit cargo! Grab discount using coupon "FAST50"`, 
        'info'
      );
    }, 2000);

    // Automated periodic deals toast simulator
    const alertSystem = setInterval(() => {
      const liveDeals = [
        { title: "Diwali Deal Live! 🌟", msg: "Get flat ₹50 discount on fresh cart purchases using coupon FAST50 now!", type: "promo" },
        { title: "Chilled Dairy Alert 🥛", msg: "Organic Farm Milk refilled nearby! Delivered icy cold in 8 mins.", type: "info" },
        { title: "Zero Delivery Fee 🛵", msg: "Basket subtotal over ₹150 automatically waives off delivery charge!", type: "success" }
      ];
      const randomDeal = liveDeals[Math.floor(Math.random() * liveDeals.length)];
      triggerPushNotification(randomDeal.title, randomDeal.msg, randomDeal.type as any);
    }, 35000);

    return () => {
      clearInterval(interval);
      clearInterval(alertSystem);
    };
  }, []);

  // Save changes to localStorage on effect hooks
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('product_reviews_sim', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('saved_addresses_customer', JSON.stringify(savedAddresses));
  }, [savedAddresses]);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const data = await res.json();
        setLiveBanners(data);
      }
    } catch (e) {
      console.warn('Failed loading advertising banners:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error('Error fetching categories', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Error fetching products', e);
    }
  };

  const fetchOrders = async () => {
    if (!userProfile) return;
    try {
      const queryParam = userProfile.phone ? `phone=${encodeURIComponent(userProfile.phone)}` : `email=${encodeURIComponent(userProfile.email)}`;
      const res = await fetch(`/api/orders?${queryParam}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
          
          // Auto update active tracking order if there is one active
          if (activeTrackOrder && Array.isArray(data)) {
            const fresh = data.find((o: Order) => o.id === activeTrackOrder.id);
            if (fresh) {
              setActiveTrackOrder(fresh);
            }
          }
        } else {
          console.warn('[fetchOrders] Expected JSON but received non-JSON raw response');
        }
      }
    } catch (e) {
      console.error('Error fetching orders', e);
    }
  };

  // Helper to trigger stylish push notification banner toasts
  const triggerPushNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'promo' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newAlert: NotificationItem = { id, title, message, timestamp: timeStr, type };

    setToasts(prev => [newAlert, ...prev]);
    setNotificationsHistory(prev => [newAlert, ...prev]);

    // Slide out alert after 4.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleToggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isLiked = wishlist.includes(productId);
    const prodName = products.find(p => p.id === productId)?.name || 'Product';

    if (isLiked) {
      setWishlist(prev => prev.filter(id => id !== productId));
      triggerPushNotification("Removed from Wishlist 💔", `${prodName} stripped from saved items.`, 'warning');
    } else {
      setWishlist(prev => [...prev, productId]);
      triggerPushNotification("Added to Wishlist ❤️", `${prodName} successfully bookmarked for quick buy!`, 'success');
    }
  };

  // Address manager dispatchers
  const handleSelectAddress = (address: string, id: string) => {
    setDeliveryAddress(address);
    setActiveAddressId(id);
    triggerPushNotification("Location Switched 📍", `Now delivering your order packages to your ${savedAddresses.find(a=>a.id===id)?.label || 'address'}`, 'info');
  };

  const handleAddAddress = (label: string, addressText: string) => {
    const nid = 'addr-' + Date.now();
    const newAddrItem = { id: nid, label, address: addressText };
    setSavedAddresses(prev => [...prev, newAddrItem]);
    setDeliveryAddress(addressText);
    setActiveAddressId(nid);
    triggerPushNotification("Address Added ✅", `Successfully created new address label: ${label}!`, 'success');
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses(prev => {
      const filtered = prev.filter(a => a.id !== id);
      if (activeAddressId === id && filtered.length > 0) {
        setDeliveryAddress(filtered[0].address);
        setActiveAddressId(filtered[0].id);
      }
      return filtered;
    });
    triggerPushNotification("Address Removed 🗑️", "Saved shipping destination deleted completely.", "info");
  };

  // Category Icon helper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Apple': return <Apple className="w-5 h-5 text-emerald-600" />;
      case 'Egg': return <Egg className="w-5 h-5 text-amber-600" />;
      case 'Cookie': return <Cookie className="w-5 h-5 text-orange-600" />;
      case 'CupSoda': return <CupSoda className="w-5 h-5 text-blue-600" />;
      case 'Soup': return <Soup className="w-5 h-5 text-rose-600" />;
      case 'Croissant': return <Croissant className="w-5 h-5 text-yellow-600" />;
      case 'IceCream': return <IceCream className="w-5 h-5 text-pink-600" />;
      case 'Baby': return <Baby className="w-5 h-5 text-indigo-600" />;
      default: return <Sparkles className="w-5 h-5 text-emerald-600" />;
    }
  };

  // Shimmer skeletons render helper
  const renderShimmerSkeleton = (count = 6) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 w-full">
        {Array.from({ length: count }).map((_, idx) => (
          <div 
            key={idx} 
            className="bg-white rounded-[24px] p-3 border border-slate-100 flex flex-col justify-between text-left h-72 shadow-xs relative overflow-hidden space-y-3"
          >
            {/* Top time badge */}
            <div className="absolute top-3 left-3 w-14 h-4.5 bg-slate-100 rounded-lg">
              <div className="shimmer-bg w-full h-full rounded-lg"></div>
            </div>
            {/* Thumbnail */}
            <div className="w-full aspect-square bg-slate-50 rounded-2xl relative overflow-hidden flex items-center justify-center p-2 mt-4">
              <div className="shimmer-bg w-full h-full rounded-2xl"></div>
            </div>
            {/* Title / Description */}
            <div className="space-y-1.5 pt-1.5 flex-1 animate-pulse">
              <div className="w-1/3 h-2 bg-slate-100 rounded-sm">
                <div className="shimmer-bg w-full h-full"></div>
              </div>
              <div className="w-3/4 h-3 bg-slate-100 rounded-sm">
                <div className="shimmer-bg w-full h-full"></div>
              </div>
              <div className="w-1/2 h-2.5 bg-slate-100 rounded-sm">
                <div className="shimmer-bg w-full h-full"></div>
              </div>
            </div>
            {/* Price and Add item buttons */}
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
              <div className="w-12 h-4.5 bg-slate-150 rounded-md">
                <div className="shimmer-bg w-full h-full"></div>
              </div>
              <div className="w-12 h-6 bg-slate-150 rounded-lg">
                <div className="shimmer-bg w-full h-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderShimmerCategorySkeleton = () => {
    return (
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5 w-full">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 h-[84px]">
            <div className="w-9 h-9 bg-slate-50 rounded-xl overflow-hidden relative">
              <div className="shimmer-bg w-full h-full"></div>
            </div>
            <div className="w-12 h-2 bg-slate-100 rounded-sm overflow-hidden">
              <div className="shimmer-bg w-full h-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const handleAddToCart = (product: Product, chosenVariant?: string) => {
    const variantToUse = chosenVariant || selectedVariants[product.id] || (product.variants && product.variants[0]) || product.unit;
    
    // Find item with same product ID AND same selected variant
    const existingIdx = cart.findIndex(item => item.product.id === product.id && item.selectedVariant === variantToUse);
    
    if (existingIdx !== -1) {
      const existing = cart[existingIdx];
      if (existing.quantity >= product.stock) {
        alert(`Sorry, only ${product.stock} units are currently available.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIdx] = { ...existing, quantity: existing.quantity + 1 };
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: 1, selectedVariant: variantToUse }]);
    }
  };

  const handleRemoveFromCart = (productId: string, chosenVariant?: string) => {
    const idx = cart.findIndex(item => {
      if (chosenVariant) {
        return item.product.id === productId && item.selectedVariant === chosenVariant;
      }
      return item.product.id === productId; // Fallback to first matching
    });

    if (idx === -1) return;

    const existing = cart[idx];
    if (existing.quantity > 1) {
      const updatedCart = [...cart];
      updatedCart[idx] = { ...existing, quantity: existing.quantity - 1 };
      setCart(updatedCart);
    } else {
      setCart(cart.filter((_, itemIdx) => itemIdx !== idx));
    }
  };

  const getProductQuantity = (productId: string, chosenVariant?: string) => {
    if (chosenVariant) {
      const item = cart.find(item => item.product.id === productId && item.selectedVariant === chosenVariant);
      return item ? item.quantity : 0;
    }
    return cart
      .filter(item => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Cart financial calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = subtotal > 150 ? 0 : 25; // Rich instant shipping criteria
  const automaticDiscount = subtotal > 300 ? 30 : 0; // Smart bulk pricing bonus
  const automaticTotal = subtotal + deliveryFee - automaticDiscount;

  const handleTopUpWallet = async (amount: number, gateway: string, gatewayStatus: string) => {
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: userProfile.phone || '',
          customerEmail: userProfile.email || '',
          amount,
          gateway,
          gatewayStatus
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to top up wallet.');
      }
      if (reloadUserProfile) {
        await reloadUserProfile();
      }
      return data;
    } catch (e: any) {
      alert(e.message || 'Error occurred during top-up.');
      throw e;
    }
  };

  const handleProfileTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(profileTopUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please specify a valid numeric sum to credit.");
      return;
    }
    setIsToppingUpProfile(true);
    try {
      const topupStatus = profileTopUpSimulateSuccess ? 'success' : 'failed';
      await handleTopUpWallet(amount, profileTopUpGateway, topupStatus);
      if (profileTopUpSimulateSuccess) {
        triggerPushNotification("Money Loaded 💳", `Credited ₹${amount} successfully using ${profileTopUpGateway}!`, "success");
        setIsTopUpPanelOpen(false);
      } else {
        triggerPushNotification("Decline Simulation ❌", `Simulated top-up of ₹${amount} was declined.`, "warning");
        alert(`Transaction Declined: Bank gateway returned simulated rejection error Code 405.`);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsToppingUpProfile(false);
    }
  };

  // Real API Order Creation
  const handlePlaceOrderSubmit = async (
    finalAddress: string, 
    paymentModeChosen: string, 
    couponApplied: string | null, 
    finalCalculatedDiscount: number,
    paymentStatus?: string,
    transactionId?: string
  ) => {
    if (cart.length === 0) return;

    try {
      const orderPayload = {
        customerPhone: userProfile.phone || '',
        customerEmail: userProfile.email || '',
        customerUid: userProfile.firebaseUid || userProfile.id || '',
        customerName: userProfile.name || 'Valued Resident Customer',
        items: cart,
        subtotal,
        deliveryFee,
        discount: finalCalculatedDiscount,
        total: Math.max(0, subtotal + deliveryFee - finalCalculatedDiscount),
        address: finalAddress,
        paymentMethod: paymentModeChosen,
        sellerId: cart[0].product.sellerId,
        paymentStatus,
        transactionId
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected checkout process.');
      }

      setCart([]);
      setIsCartOpen(false);
      
      if (reloadUserProfile) {
        await reloadUserProfile();
      }

      setActiveTrackOrder(data.order);
      setOrders([data.order, ...orders]);
      setActiveTab('live-tracking'); // Seamlessly forward to Live Tracking Map Node!
      
    } catch (e: any) {
      alert(e.message || 'Error occurred during final shipping validation.');
      throw e;
    }
  };

  // Submit product rating review in local state
  const handleAddReview = (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRevItem: UserReview = {
      user: reviewAuthor.trim(),
      rating: newReviewRating,
      comment: newReviewText.trim(),
      date: 'Today, Just Now'
    };

    const currentRevList = reviews[productId] || [];
    setReviews({
      ...reviews,
      [productId]: [newRevItem, ...currentRevList]
    });

    setNewReviewText('');
    triggerPushNotification("Review Published ⭐️", "Thank you, your handpicked product rating is now visible!", "success");
  };

  // Aggregate product rating calculation
  const getProductRatingStats = (productId: string) => {
    const lists = reviews[productId] || [];
    if (lists.length === 0) return { avg: 4.8, total: 34 };
    const sum = lists.reduce((s, r) => s + r.rating, 0);
    return {
      avg: parseFloat((sum / lists.length).toFixed(1)),
      total: lists.length + 32 // Add placeholder seeds for realistic visual density
    };
  };

  // Filter products by category tab & search keyword matching
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div id="customer-app-root" className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-6 relative text-slate-800">
      
      {/* 4 SECONDS FLY-IN FLOATING PUSH TOAST SYSTEM */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="p-3 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl flex items-start gap-2.5 pointer-events-auto"
            >
              <div className="mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {toast.type === 'warning' && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                {toast.type === 'promo' && <Gift className="w-5 h-5 text-amber-400 shrink-0" />}
                {toast.type === 'info' && <Bell className="w-5 h-5 text-emerald-400 shrink-0" />}
              </div>
              <div className="text-left text-[11px] leading-snug">
                <p className="font-extrabold text-xs flex items-center justify-between text-slate-100">
                  {toast.title}
                  <span className="text-[8px] opacity-40 font-mono">{toast.timestamp}</span>
                </p>
                <p className="text-slate-400 mt-0.5 font-medium">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* DESKTOP HEADER & GLOBAL MOBILE NAV CONTROLLER */}
      <div className="bg-emerald-600 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo name branding (keeping simple & direct context) */}
            <div 
              onClick={() => { setActiveTab('home'); setSelectedCategory(null); setActiveTrackOrder(null); }}
              className="hidden md:flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-6 h-6 text-white" />
              <span className="font-black text-sm tracking-tighter uppercase font-sans">BlinkStore 10-MIN</span>
            </div>

            {/* Delivery pinpoint selector indicator */}
            <div className="flex items-center gap-2 max-w-[65%] text-left">
              <MapPin className="w-5 h-5 text-white shrink-0 animate-bounce" />
              <div 
                className="cursor-pointer"
                onClick={() => setActiveTab('addresses')}
                title="Manage locations"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-100 uppercase tracking-widest">
                  <span>Delivering to {savedAddresses.find(a=>a.id===activeAddressId)?.label.split(' ')[0] || 'Home'}</span>
                  <span className="bg-emerald-500 text-white rounded text-[8px] px-1 font-extrabold">Instant</span>
                </div>
                <p className="text-xs text-white font-semibold truncate max-w-xs md:max-w-md border-b border-dashed border-white/40 hover:border-white leading-none mt-0.5">
                  {deliveryAddress}
                </p>
              </div>
            </div>

            {/* Header controls drawer / search / cart buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* My Orders Desktop Menu */}
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer text-xs font-black uppercase ${
                  activeTab === 'orders' ? 'bg-white text-emerald-800' : 'text-white hover:bg-emerald-500'
                }`}
                title="View My Orders"
              >
                <Clock className="w-4 h-4" />
                <span>My Orders</span>
                {orders.some(o => o.status !== 'delivered') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>

              {/* My Profile Desktop Menu */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer text-xs font-black uppercase ${
                  activeTab === 'profile' ? 'bg-white text-emerald-800 relative z-10' : 'text-white hover:bg-emerald-500'
                }`}
                title="Manage My Profile & Supabase Sync"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>

              {/* Wishlist Link Indicator */}
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`p-2 rounded-xl transition cursor-pointer relative ${
                  activeTab === 'wishlist' ? 'bg-emerald-700 text-white' : 'hover:bg-emerald-500'
                }`}
                title="My Saved Wishlist"
              >
                <Heart className="w-4.5 h-4.5 text-white fill-current" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-black text-[9px]">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Push notifications Inbox toggle icon */}
              <button
                onClick={() => setIsAlertTrayOpen(!isAlertTrayOpen)}
                className="p-2 rounded-xl hover:bg-emerald-500 transition relative cursor-pointer"
                title="Notifications History"
              >
                <Bell className="w-4.5 h-4.5 text-white" />
                {notificationsHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black text-[9px] animate-pulse">
                    {notificationsHistory.length}
                  </span>
                )}
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-white text-emerald-950 rounded-2xl px-4 py-2 font-black text-xs flex items-center gap-2 hover:bg-emerald-50 active:scale-95 transition relative cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">
                  {cart.length > 0 ? `${cart.length} Items - ₹${automaticTotal}` : 'Empty Basket'}
                </span>
                <span className="sm:hidden font-mono">₹{automaticTotal}</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] animate-pulse">
                    {cart.reduce((s,i)=> s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Input bar */}
          <div className="mt-3 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder='Search for organic bananas, fresh butter, shimla apples, instant cookies...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-800 placeholder-slate-400 font-medium text-xs rounded-xl pl-10 pr-4 py-2.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
              >
                Clear
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-4 w-full flex-1 mb-10">
        
        {/* VIEW 1: HOME PAGE GRID HUB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Dynamic visual promotional carousel / hero banner block */}
            {liveBanners && liveBanners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveBanners.map((banner, index) => (
                  <div 
                    key={banner.id || index}
                    onClick={() => {
                      if (banner.categoryLink) {
                        setSelectedCategory(banner.categoryLink);
                        setActiveTab('category');
                      }
                    }}
                    className="relative rounded-3xl overflow-hidden h-40 group cursor-pointer shadow-xs bg-slate-900 border border-slate-100/50 flex flex-col justify-end p-5 text-white text-left"
                  >
                    <img 
                      src={banner.imageUrl} 
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-103 transition-transform duration-500" 
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"></div>
                    <div className="relative z-10 space-y-1">
                      {banner.discountBadge && (
                        <span className="inline-block bg-yellow-400 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                          {banner.discountBadge}
                        </span>
                      )}
                      <h4 className="font-display font-black text-xs md:text-sm tracking-tight leading-snug">
                        {banner.title}
                      </h4>
                      {banner.subtitle && (
                        <p className="text-[10px] text-slate-200 mt-0.5 font-medium line-clamp-1">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-[0_10px_25px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Abstract decorative graphic circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none blur-xl"></div>
                <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-emerald-700/30 rounded-full pointer-events-none blur-lg"></div>

                <div className="space-y-2 text-center md:text-left relative z-10 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-slate-900 font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs animate-pulse">
                    <Sparkles className="w-3 h-3 text-emerald-800" /> Startup Super Deal
                  </div>
                  <h3 className="font-display font-black text-xl md:text-2xl tracking-tight leading-dense">
                    GET FLAT ₹50 DISCOUNT ON FRESH CARTS
                  </h3>
                  <p className="text-[11px] font-semibold text-emerald-100 leading-normal">
                    Redeem code <span className="bg-slate-950/20 px-2 py-0.5 rounded font-mono font-black text-yellow-300 border border-emerald-400/25">FAST50</span>. Refill rich table butter, fresh orchard apples, cold sodas, or morning dairy. Free shipping above ₹150!
                  </p>
                </div>

                <div className="bg-slate-950/20 backdrop-blur-xs p-4 rounded-2xl border border-white/10 shrink-0 z-10 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-300 font-bold block">Instant Delivery</span>
                  <span className="text-xl font-black mt-1 font-display">8-10 MINS 🛵</span>
                  <span className="text-[9px] text-white/60 font-semibold mt-1">ELECTRIC COURIER</span>
                </div>
              </div>
            )}

            {/* Smart "Free Waived Shipping" conversion metrics when items are placed in car */}
            {cart.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-[24px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs animate-pulse-subtle">
                    <Truck className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-xs text-emerald-950 uppercase tracking-tight">
                      {subtotal >= 150 ? "FREE DELIVERY WAIVER UNLOCKED! 🎉" : `ADD ₹${150 - subtotal} MORE FOR FREE DELIVERY`}
                    </h4>
                    <p className="text-slate-500 text-[10.5px] font-semibold">
                      {subtotal >= 150 ? "Your premium express delivery is now entirely free of charges!" : "Basket wavers unlock delivery charges automatically at ₹150."}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-56 shrink-0">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / 150) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-serif mt-1.5 font-bold">
                    <span>₹{subtotal} / ₹150</span>
                    <span>{Math.round(Math.min(100, (subtotal / 150) * 100))}% Checked</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Shop by Category Bento */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-display text-xs font-black tracking-widest text-slate-400 uppercase">Shop by category</h2>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-emerald-600 font-extrabold hover:underline cursor-pointer"
                  >
                    Reset Grid
                  </button>
                )}
              </div>
              
              {isShimmering ? (
                renderShimmerCategorySkeleton()
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(isSelected ? null : cat.id);
                          setActiveTab('categories'); // Shift viewport directly
                        }}
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-xs cursor-pointer border group ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/10 scale-95 shadow-inner'
                            : 'border-slate-100 bg-white shadow-xs hover:border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.01)]'
                        }`}
                      >
                        <div className={`p-2.5 rounded-2xl ${cat.color} mb-2 flex items-center justify-center transition group-hover:rotate-6 shadow-sm`}>
                          {getCategoryIcon(cat.icon)}
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700 leading-tight truncate w-full uppercase">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trending Products Carousel (Blinkit style horizontal scroll) */}
            {products.filter(p => p.isTrending).length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🔥</span>
                    <div>
                      <h2 className="font-display text-xs font-black tracking-tight text-slate-800 uppercase leading-none text-left">Trending Grocery Products</h2>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5 text-left">Popular selections flying off our shelves</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none select-none pl-1">
                  {products.filter(p => p.isTrending).map((p) => {
                    const currentVariant = selectedVariants[p.id] || (p.variants && p.variants[0]) || p.unit;
                    const quantity = getProductQuantity(p.id, currentVariant);
                    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                    const isLiked = wishlist.includes(p.id);

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-[24px] border border-slate-100/90 hover:border-slate-205 border-slate-100 hover:border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-300 p-3 flex flex-col justify-between relative group shrink-0 w-36 xs:w-40 sm:w-44 md:w-48 text-left"
                      >
                        <div className="absolute top-2 left-2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10 shadow-sm leading-none">
                          <Clock className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                          {p.deliveryMinutes} MINS
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(p.id, e)}
                          className="absolute top-2 right-2 p-1.5 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-100 cursor-pointer transition duration-300"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                        </button>

                        <div
                          className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center p-2.5 mt-4 relative cursor-pointer"
                          onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                          />
                          {hasDiscount && (
                            <div className="absolute bottom-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                              SAVE {Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)}%
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">{p.sellerName}</span>
                            <h4
                              className="font-display font-extrabold text-xs text-slate-800 line-clamp-1 leading-snug group-hover:text-emerald-600 cursor-pointer text-left mt-0.5"
                              onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                            >
                              {p.name}
                            </h4>
                            <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block truncate max-w-full font-mono">
                              {currentVariant}
                            </span>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                            <div className="text-left font-sans">
                              <span className="font-black text-xs text-slate-905 text-slate-900 font-mono">₹{p.price}</span>
                              {hasDiscount && (
                                <span className="text-[9px] text-slate-400 font-bold line-through ml-1 font-mono">₹{p.originalPrice}</span>
                              )}
                            </div>

                            {p.stock === 0 ? (
                              <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Out</span>
                            ) : quantity > 0 ? (
                              <div className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg p-1 px-1.5 shadow-sm">
                                <button
                                  onClick={() => handleRemoveFromCart(p.id, currentVariant)}
                                  className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-bold text-[10px] leading-none w-2 text-center font-mono">{quantity}</span>
                                <button
                                  onClick={() => handleAddToCart(p, currentVariant)}
                                  className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                  disabled={quantity >= p.stock}
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(p, currentVariant)}
                                className="border border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-600 text-[10px] font-black px-3.5 py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer shadow-xs leading-none"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Section Heading */}
            {searchQuery ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <div>
                      <h2 className="font-display text-xs font-black tracking-wider text-slate-800 uppercase leading-none text-left">Instant Search Results</h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 text-left">Matching "{searchQuery}" in our active stores</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear Results ✕
                  </button>
                </div>

                {isShimmering ? (
                  renderShimmerSkeleton(8)
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[32px] border border-slate-100 p-8 space-y-1.5 max-w-sm mx-auto shadow-xs">
                    <XCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-slate-700 font-black text-xs uppercase tracking-tight">Shelf is Empty</h3>
                    <p className="text-slate-400 text-[10px] leading-relaxed">No grocery packs matching your keyword. Try searching for milk, biscuits, fruit apples, or soda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {filteredProducts.map((p) => {
                      const currentVariant = selectedVariants[p.id] || (p.variants && p.variants[0]) || p.unit;
                      const quantity = getProductQuantity(p.id, currentVariant);
                      const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                      const isLiked = wishlist.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-[24px] border border-slate-100 hover:border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-305 duration-300 p-3 flex flex-col justify-between relative group text-left"
                        >
                          <div className="absolute top-2 left-2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10 shadow-sm leading-none">
                            <Clock className="w-2.5 h-2.5 text-emerald-400" />
                            {p.deliveryMinutes} MINS
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(p.id, e)}
                            className="absolute top-2 right-2 p-1.5 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-100 cursor-pointer transition duration-300"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                          </button>

                          <div
                            className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 mt-4 relative cursor-pointer"
                            onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                            />
                            {hasDiscount && (
                              <div className="absolute bottom-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                SAVE {Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)}%
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex-1 flex flex-col justify-between">
                            <div>
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">{p.sellerName}</span>
                              <h4
                                className="font-display font-extrabold text-xs text-slate-800 line-clamp-1 leading-snug group-hover:text-emerald-600 cursor-pointer text-left mt-0.5"
                                onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                              >
                                {p.name}
                              </h4>
                              <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block truncate max-w-full font-mono">
                                {currentVariant}
                              </span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                              <div className="text-left font-sans">
                                <span className="font-black text-xs text-slate-900 font-mono">₹{p.price}</span>
                                {hasDiscount && (
                                  <span className="text-[9px] text-slate-400 font-bold line-through ml-1 font-mono">₹{p.originalPrice}</span>
                                )}
                              </div>

                              {p.stock === 0 ? (
                                <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Out</span>
                              ) : quantity > 0 ? (
                                <div className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg p-1 px-1.5 shadow-sm">
                                  <button
                                    onClick={() => handleRemoveFromCart(p.id, currentVariant)}
                                    className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-bold text-[10px] leading-none w-2 text-center font-mono">{quantity}</span>
                                  <button
                                    onClick={() => handleAddToCart(p, currentVariant)}
                                    className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                    disabled={quantity >= p.stock}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(p, currentVariant)}
                                  className="border border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-600 text-[10px] font-black px-3.5 py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer shadow-xs leading-none"
                                >
                                  ADD
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {products.filter(p => p.isRecommended).length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">✨</span>
                        <div>
                          <h2 className="font-display text-xs font-black tracking-tight text-slate-800 uppercase leading-none text-left">Recommended for You</h2>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5 text-left">Dynamic selections based on preference scores</span>
                        </div>
                      </div>
                    </div>

                    {isShimmering ? (
                      renderShimmerSkeleton(6)
                    ) : (
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none select-none pl-1">
                        {products.filter(p => p.isRecommended).map((p) => {
                          const currentVariant = selectedVariants[p.id] || (p.variants && p.variants[0]) || p.unit;
                          const quantity = getProductQuantity(p.id, currentVariant);
                          const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                          const isLiked = wishlist.includes(p.id);

                          return (
                            <div
                              key={p.id}
                              className="bg-white rounded-[24px] border border-slate-100/90 hover:border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-300 p-3 flex flex-col justify-between relative group shrink-0 w-36 xs:w-40 sm:w-44 md:w-48 text-left"
                            >
                              <div className="absolute top-2 left-2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10 shadow-sm leading-none">
                                <Clock className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                                {p.deliveryMinutes} MINS
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleToggleWishlist(p.id, e)}
                                className="absolute top-2 right-2 p-1.5 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-100 cursor-pointer transition duration-300"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                              </button>

                              <div
                                className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center p-2.5 mt-4 relative cursor-pointer"
                                onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                              >
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-305 duration-300"
                                />
                                {hasDiscount && (
                                  <div className="absolute bottom-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                    SAVE {Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)}%
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 flex-1 flex flex-col justify-between">
                                <div>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">{p.sellerName}</span>
                                  <h4
                                    className="font-display font-extrabold text-xs text-slate-800 line-clamp-1 leading-snug group-hover:text-emerald-600 cursor-pointer text-left mt-0.5"
                                    onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                                  >
                                    {p.name}
                                  </h4>
                                  <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block truncate max-w-full font-mono">
                                    {currentVariant}
                                  </span>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                                  <div className="text-left font-sans">
                                    <span className="font-black text-xs text-slate-905 text-slate-900 font-mono">₹{p.price}</span>
                                    {hasDiscount && (
                                      <span className="text-[9px] text-slate-400 font-bold line-through ml-1 font-mono">₹{p.originalPrice}</span>
                                    )}
                                  </div>

                                  {p.stock === 0 ? (
                                    <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Out</span>
                                  ) : quantity > 0 ? (
                                    <div className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg p-1 px-1.5 shadow-sm">
                                      <button
                                        onClick={() => handleRemoveFromCart(p.id, currentVariant)}
                                        className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                      >
                                        <Minus className="w-2.5 h-2.5" />
                                      </button>
                                      <span className="font-bold text-[10px] leading-none w-2 text-center font-mono">{quantity}</span>
                                      <button
                                        onClick={() => handleAddToCart(p, currentVariant)}
                                        className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer transition active:scale-95"
                                        disabled={quantity >= p.stock}
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleAddToCart(p, currentVariant)}
                                      className="border border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-600 text-[10px] font-black px-3.5 py-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer shadow-xs leading-none"
                                    >
                                      ADD
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* General Retail Storefront Intro */}
                <div className="p-5 bg-emerald-50/70 border border-emerald-100 rounded-3xl flex items-center justify-between text-left shadow-xs">
                  <div>
                    <h4 className="font-display font-black text-xs text-emerald-900 uppercase tracking-tight">Express 10-Min Delivery Network Active</h4>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 leading-relaxed">
                      All products of registered sellers are packed under strict sanitation protocols, packed in oxygen-flushed bags, and delivered instantly on Hero electric environment-friendly fleets.
                    </p>
                  </div>
                  <Compass className="w-8 h-8 text-emerald-600/60 opacity-80 shrink-0 select-none ml-3" />
                </div>

                {/* Quick action card redirects */}
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setActiveTab('categories')}
                    className="p-5 bg-white rounded-3xl border border-slate-100/90 hover:border-emerald-500/20 hover:shadow-md transition-all duration-300 cursor-pointer text-left flex justify-between items-center group shadow-xs animate-pulse-subtle"
                  >
                    <div>
                      <h3 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">Explore Categories</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Stall, organic staples, beverages...</p>
                    </div>
                    <Compass className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                  </div>

                  <div 
                    onClick={() => setActiveTab('wishlist')}
                    className="p-5 bg-white rounded-3xl border border-slate-100/90 hover:border-emerald-500/20 hover:shadow-md transition-all duration-300 cursor-pointer text-left flex justify-between items-center group shadow-xs"
                  >
                    <div>
                      <h3 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">My Saved Wishlist</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Items bookmarked for quick buy...</p>
                    </div>
                    <Heart className="w-6 h-6 text-slate-300 group-hover:text-rose-500 transition-colors shrink-0 fill-rose-500/10 group-hover:fill-rose-500" />
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* VIEW 2: CATEGORIES CATALOG */}
        {activeTab === 'categories' && (
          <div className="space-y-6 text-left animate-fade-in">
            <div className="flex items-center gap-1.5">
              <Compass className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase leading-none">Shop Categories</h2>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Browse bento shelf grids to trigger fast filters</span>
              </div>
            </div>

            {/* Bento Sidebar Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Groceries
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="scale-90">{getCategoryIcon(c.icon)}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Catalog Grid View */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-4 text-xs font-bold text-slate-500">
                <span>Displaying: <span className="text-emerald-600 font-extrabold uppercase">{selectedCategory ? categories.find(c=>c.id===selectedCategory)?.name : 'All Stock'}</span></span>
                <span>{filteredProducts.length} items refilled</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <XCircle className="w-10 h-10 mx-auto" />
                  <p className="font-bold">No grocery packs listed in this shelf.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredProducts.map((p) => {
                    const currentVariant = selectedVariants[p.id] || (p.variants && p.variants[0]) || p.unit;
                    const quantity = getProductQuantity(p.id, currentVariant);
                    const isLiked = wishlist.includes(p.id);

                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-slate-250 transition flex flex-col justify-between relative group text-left"
                      >
                        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 z-10">
                          <Clock className="w-2.5 h-2.5" />
                          {p.deliveryMinutes} M
                        </div>

                        {/* Liked Heart trigger */}
                        <button
                          onClick={(e) => handleToggleWishlist(p.id, e)}
                          className="absolute top-2 right-2 p-1 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-100 cursor-pointer transition duration-150"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                        </button>

                        <div 
                          className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 mb-2 cursor-pointer mt-4"
                          onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                        >
                          <img src={p.image} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition" />
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">{p.sellerName}</span>
                            <h4 
                              onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
                              className="font-bold text-xs text-slate-800 line-clamp-1 hover:text-emerald-700 cursor-pointer text-left mt-0.5"
                            >
                              {p.name}
                            </h4>

                            {p.variants && p.variants.length > 0 ? (
                              <div className="mt-1.5 text-left">
                                <select
                                  value={currentVariant}
                                  onChange={(e) => setSelectedVariants({ ...selectedVariants, [p.id]: e.target.value })}
                                  className="w-full text-[9px] font-bold border border-slate-200 bg-slate-50 text-slate-700 px-1 py-0.5 rounded focus:outline-none cursor-pointer"
                                >
                                  {p.variants.map((v, vidx) => (
                                    <option key={vidx} value={v}>{v}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">{p.unit}</p>
                            )}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900">₹{p.price}</span>

                            {quantity > 0 ? (
                              <div className="flex items-center gap-1 bg-emerald-600 text-white rounded p-1 shadow-xs">
                                <button
                                  onClick={() => handleRemoveFromCart(p.id, currentVariant)}
                                  className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="font-bold text-[10px] w-2.5 text-center">{quantity}</span>
                                <button
                                  onClick={() => handleAddToCart(p, currentVariant)}
                                  className="w-3.5 h-3.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                                  disabled={quantity >= p.stock}
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(p, currentVariant)}
                                className="border border-emerald-600 hover:bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition active:scale-95"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: SECURE PRODUCT DETAILS CORNER DEEP DIVE */}
        {activeTab === 'product-details' && selectedProductDetails && (
          <div className="max-w-4xl mx-auto space-y-4 text-left animate-fade-in pb-10">
            {/* Header controls back */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-xs">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-bold text-xs"
              >
                <ArrowLeft className="w-4.5 h-4.5" /> Return to shopping
              </button>
              <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                DISPLAYING: {selectedProductDetails.category} / #{selectedProductDetails.id}
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
              
              {/* Product Visual Photo */}
              <div className="md:col-span-5 bg-slate-50 hover:bg-slate-100/60 transition duration-300 rounded-2xl p-6 flex items-center justify-center relative select-none">
                <img 
                  src={selectedProductDetails.image} 
                  alt={selectedProductDetails.name} 
                  className="w-full h-64 object-contain mix-blend-multiply transform hover:scale-105 duration-200"
                />
                
                {/* Save loved toggle */}
                <button
                  onClick={() => handleToggleWishlist(selectedProductDetails.id)}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-slate-150 rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-150 cursor-pointer"
                >
                  <Heart className={`w-4.5 h-4.5 ${wishlist.includes(selectedProductDetails.id) ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                </button>
              </div>

              {/* Specifications detail text */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-lg uppercase">
                    Seller: {selectedProductDetails.sellerName}
                  </span>
                  
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedProductDetails.name}</h2>
                  
                  {/* Rating stats panel bubble */}
                  {(() => {
                    const stats = getProductRatingStats(selectedProductDetails.id);
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 border border-amber-200/50 rounded-lg px-2 py-0.5 text-xs font-extrabold shadow-2xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{stats.avg}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase">{stats.total} rating and verified reviews</span>
                      </div>
                    );
                  })()}

                  <p className="text-[11px] text-slate-400 font-bold uppercase">Base weight cargo: <span className="text-slate-700 font-extrabold">{selectedProductDetails.unit}</span></p>

                  <div className="h-px bg-slate-100 my-2"></div>
                  
                  {/* Variants pack spec select */}
                  {selectedProductDetails.variants && selectedProductDetails.variants.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                      <label className="text-[9px] font-black tracking-widest text-[#10b981] uppercase block mb-1.5">Choose Pack Variant:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProductDetails.variants.map((v, vidx) => {
                          const isChosen = (selectedVariants[selectedProductDetails.id] || selectedProductDetails.variants![0]) === v;
                          return (
                            <button
                              key={vidx}
                              onClick={() => setSelectedVariants({ ...selectedVariants, [selectedProductDetails.id]: v })}
                              className={`px-3 py-1 rounded-lg text-xs font-black border transition cursor-pointer ${
                                isChosen
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-150'
                              }`}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 mt-1">
                    <p className="text-xs font-bold text-slate-500">Product Highlights:</p>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {selectedProductDetails.description} Organic farm certifications verified. Handpicked under cold cargo specifications for extreme local freshness in India region.
                    </p>
                  </div>
                </div>

                {/* Adding triggers */}
                {(() => {
                  const activeModalVariant = selectedVariants[selectedProductDetails.id] || (selectedProductDetails.variants && selectedProductDetails.variants[0]) || selectedProductDetails.unit;
                  const modalQty = getProductQuantity(selectedProductDetails.id, activeModalVariant);

                  return (
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold leading-none">Net Invoice Price:</span>
                        <div className="flex items-end gap-1.5 mt-1">
                          <span className="font-extrabold text-base text-slate-900 font-mono">₹{selectedProductDetails.price}</span>
                          {selectedProductDetails.originalPrice && selectedProductDetails.originalPrice > selectedProductDetails.price && (
                            <span className="text-xs text-slate-400 line-through font-semibold font-mono pb-0.5">₹{selectedProductDetails.originalPrice}</span>
                          )}
                        </div>
                      </div>

                      {modalQty > 0 ? (
                        <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl p-2 font-bold select-none shadow-md">
                          <button
                            onClick={() => handleRemoveFromCart(selectedProductDetails.id, activeModalVariant)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-extrabold text-xs">{modalQty}</span>
                          <button
                            onClick={() => handleAddToCart(selectedProductDetails, activeModalVariant)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(selectedProductDetails, activeModalVariant)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer active:scale-95 duration-100"
                        >
                          ADD PRODUCT TO BASKET
                        </button>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Simulated Reviews Corner Panel */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
              <h3 className="font-black text-xs text-slate-700 uppercase tracking-wider">Verified Customer Reviews Feedback</h3>
              
              {/* Form to submit review instantly */}
              <form onSubmit={(e) => handleAddReview(e, selectedProductDetails.id)} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase">Write a Verified Review rating:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-450 uppercase block">My Profile Nickname</span>
                    <input 
                      type="text" 
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                      placeholder="e.g. Sonia G"
                      className="bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-lg w-full"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-450 uppercase block">Select Stars (1-5)</span>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-lg w-full"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Super Fresh (5/5)</option>
                      <option value="4">⭐⭐⭐⭐ Great Quality (4/5)</option>
                      <option value="3">⭐⭐⭐ Standard Packing (3/5)</option>
                      <option value="2">⭐⭐ Fair Retail (2/5)</option>
                      <option value="1">⭐ Bad Stall (1/5)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <textarea
                    placeholder="Type comments about delivery, freshness, scent, and packing..."
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    className="w-full bg-white px-3 py-2 border border-slate-250 text-xs rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 h-16 leading-relaxed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 border text-white rounded-lg text-[11px] font-black uppercase transition cursor-pointer"
                >
                  Publish Live Feedback
                </button>
              </form>

              {/* Display list reviews */}
              <div className="space-y-3">
                {(reviews[selectedProductDetails.id] || []).map((rev, revidx) => (
                  <div key={revidx} className="p-3 border-b border-slate-50 text-[11px] space-y-1">
                    <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-xl border border-slate-100">
                      <span className="font-black text-slate-700">{rev.user}</span>
                      <div className="flex items-center text-amber-500 gap-1 text-[8px] font-bold font-mono">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                        <span>({rev.rating}/5)</span>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-normal pl-1 pr-1 italic">"{rev.comment}"</p>
                    <span className="text-[9px] text-slate-400 block text-right pr-1 font-mono">{rev.date}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 4: ACTIVE LIVE LIVE TRACKING MAPS PAGE */}
        {activeTab === 'live-tracking' && activeTrackOrder && (
          <LiveTracking 
            order={activeTrackOrder}
            onBack={() => setActiveTab('orders')}
            onStatusUpdate={(newStatus) => {
              // Update orders status locally to sync state matching
              setOrders(prev => prev.map(o => o.id === activeTrackOrder.id ? { ...o, status: newStatus } : o));
            }}
            reloadUserProfile={reloadUserProfile}
            triggerNotification={triggerPushNotification}
          />
        )}

        {/* VIEW 5: SECURITY ADDRESSES MANAGER VIEWS */}
        {activeTab === 'addresses' && (
          <AddressesManager 
            savedAddresses={savedAddresses}
            activeAddressId={activeAddressId}
            onSelect={handleSelectAddress}
            onAdd={handleAddAddress}
            onDelete={handleDeleteAddress}
            onBack={() => setActiveTab('profile')}
          />
        )}

        {/* VIEW 6: TRUSTED CHEKOUT GATEWAY DESK */}
        {activeTab === 'checkout' && (
          <CheckoutPage 
            cart={cart}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            originalDiscount={automaticDiscount}
            savedAddresses={savedAddresses}
            activeAddressId={activeAddressId}
            onPlaceOrder={handlePlaceOrderSubmit}
            onBack={() => setActiveTab('home')}
            triggerNotification={triggerPushNotification}
            walletBalance={userProfile?.walletBalance !== undefined ? userProfile.walletBalance : 1000}
            onTopUpWallet={handleTopUpWallet}
          />
        )}

        {/* VIEW 7: WISHLIST BOOKMARKS CORNER */}
        {activeTab === 'wishlist' && (
          <WishlistPage 
            wishlist={wishlist}
            products={products}
            onRemoveFromWishlist={(id) => handleToggleWishlist(id)}
            onAddToCart={(prod) => { handleAddToCart(prod); triggerPushNotification("Cart updated! 🍎", `${prod.name} added to cart from wishlist.`, "success"); }}
            getProductQuantity={getProductQuantity}
            onSelectProduct={(prod) => { setSelectedProductDetails(prod); setActiveTab('product-details'); }}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* VIEW 8: PURCHASES HISTORY LOG LISTS */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Purchase Deliveries History</h2>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 font-mono text-slate-500 rounded">Total verified: {orders.length}</span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
                <Package className="w-10 h-10 text-slate-350 mx-auto" />
                <p className="text-slate-400 font-semibold text-xs">Your express purchase history list is currently clear.</p>
                <button 
                  onClick={() => setActiveTab('home')}
                  className="mt-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Buy Fresh Groceries Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const itemsCount = o.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <div
                      key={o.id}
                      onClick={() => { setActiveTrackOrder(o); setActiveTab('live-tracking'); }}
                      className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition text-left cursor-pointer flex justify-between items-center group shadow-xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-800">ORDER #{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[9px] font-black uppercase rounded-sm px-1.5 py-0.5 ${
                            o.status === 'delivered' ? 'bg-slate-100 text-slate-600' :
                            o.status === 'dispatched' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                          }`}>{o.status}</span>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 font-semibold truncate max-w-md">
                          {o.items.map(item => `${item.product.name} x${item.quantity}`).join(', ')}
                        </p>
                        
                        <p className="text-[10px] text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString()} • Delivered drop: <span className="font-bold text-slate-600 font-mono">{o.address.slice(0, 30)}...</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-xs text-slate-800 font-mono">₹{o.total}</div>
                        <span className="text-[9px] text-emerald-600 group-hover:underline font-black uppercase tracking-wider block mt-1">
                          {o.status === 'delivered' ? 'View Details' : 'Track Status 🔵'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* VIEW 9: CUSTOMER PROFILE & SECURITY ENVIRONMENT */}
        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto space-y-4 animate-fade-in text-left">
            {onboardingView === 'none' ? (
              <>
                {/* 1. TOP PREMIUM PROFILE CARD */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs text-center relative overflow-hidden space-y-4">
                  {/* Subtle ambient blur */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#00A86B]/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="relative">
                    <div className="w-20 h-20 bg-emerald-100 border-4 border-emerald-50 text-[#00A86B] rounded-full flex items-center justify-center text-3xl font-black mx-auto shadow-md">
                      {userProfile.name ? userProfile.name[0].toUpperCase() : 'C'}
                    </div>
                    <span className="absolute bottom-0 right-[40%] bg-[#00A86B] text-white p-1 rounded-full border-2 border-white text-[9px] font-bold" title="Verified Customer">
                      ✓
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center justify-center gap-1">
                      {userProfile.name || 'Resident Customer'}
                      <span className="text-emerald-600 text-xs" title="Gold Verified Badge">🛡️</span>
                    </h3>
                    <p className="text-slate-400 text-xs font-mono font-medium mt-0.5">{userProfile.phone || '+91 9999911111'}</p>
                  </div>

                  <div className="bg-amber-100/70 border border-amber-200/50 text-amber-800 rounded-2xl px-3 py-1 font-black text-[9px] uppercase tracking-wider w-max mx-auto flex items-center gap-1.5 shadow-2xs">
                    <span>👑 GOLD PRIVILEGE MEMBER</span>
                  </div>
                </div>

                {/* SUPABASE STATUS CARD */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-3xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
                      ⚡ Cloud Datastore Sync
                    </span>
                    <button
                      type="button"
                      onClick={fetchSupabaseStatus}
                      disabled={supabaseStatusLoading}
                      className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${supabaseStatusLoading ? 'animate-spin' : ''}`} />
                      <span>{supabaseStatusLoading ? 'Checking...' : 'Check connection'}</span>
                    </button>
                  </div>

                  {supabaseStatusLoading ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-4 h-4 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-semibold text-slate-500">Conducting live handshake logic check...</p>
                    </div>
                  ) : supabaseStatus ? (
                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          supabaseStatus.status === 'success' ? 'bg-[#00A86B] animate-pulse' :
                          supabaseStatus.status === 'invalid_credentials' ? 'bg-amber-500 animate-pulse' :
                          'bg-rose-500 animate-pulse'
                        }`}></span>
                        <span className="text-xs font-black text-slate-800">
                          {supabaseStatus.status === 'success' ? 'Connected to Supabase' :
                           supabaseStatus.status === 'invalid_credentials' ? 'Invalid Anon Key ⚠️' :
                           supabaseStatus.status === 'network_error' ? 'Connection Error ❌' :
                           'Not Connected (Fallback Mode)'}
                        </span>
                      </div>

                      {supabaseStatus.maskedUrl && (
                        <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-mono font-medium text-slate-500 flex justify-between">
                          <span>Endpoint:</span>
                          <span className="text-slate-800 break-all">{supabaseStatus.maskedUrl}</span>
                        </div>
                      )}

                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium font-sans">
                        {supabaseStatus.message}
                      </p>

                      {supabaseStatus.status === 'missing_credentials' && (
                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/35 text-[10px] text-slate-600 font-medium">
                          <span className="font-extrabold text-[#00875A] mr-1">💡 Tip:</span> Save your <strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong> inside your AI Studio Settings/Secrets, restart the server, and click refresh to establish live synchronization.
                        </div>
                      )}

                      {supabaseStatus.status !== 'success' && supabaseStatus.status !== 'missing_credentials' && (
                        <div className="space-y-2">
                          {supabaseStatus.diagnostics && (
                            <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200/60 space-y-1 text-[10px] font-mono text-slate-600">
                              <div className="font-bold text-slate-700 uppercase tracking-wide text-[8px] mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                                <span>🔍 Secret Inspection Values</span>
                                <span className="text-[7.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-sans">Active Server Values</span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">SUPABASE_URL Length:</span>
                                <span className="font-semibold text-slate-800">{supabaseStatus.diagnostics.cleanUrlLength} chars{supabaseStatus.diagnostics.rawUrlLength !== supabaseStatus.diagnostics.cleanUrlLength && ` (trimmed from ${supabaseStatus.diagnostics.rawUrlLength})`}</span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">SUPABASE_URL Preview:</span>
                                <span className="font-semibold text-slate-800 break-all">{supabaseStatus.diagnostics.urlStart}</span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">SUPABASE_ANON_KEY Length:</span>
                                <span className="font-semibold text-slate-800">{supabaseStatus.diagnostics.cleanKeyLength} chars{supabaseStatus.diagnostics.rawKeyLength !== supabaseStatus.diagnostics.cleanKeyLength && ` (trimmed from ${supabaseStatus.diagnostics.rawKeyLength})`}</span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">Key Signature Dots:</span>
                                <span className={`font-semibold ${supabaseStatus.diagnostics.keyDotCount === 2 ? 'text-[#00A86B]' : 'text-rose-600'}`}>
                                  {supabaseStatus.diagnostics.keyDotCount} {supabaseStatus.diagnostics.keyDotCount === 2 ? '(Valid JWT Header/Body/Sign)' : '(Invalid JWT Format!)'}
                                </span>
                              </div>
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">Key Prefix/Suffix:</span>
                                <span className="font-semibold text-slate-800">{supabaseStatus.diagnostics.keyStart}...{supabaseStatus.diagnostics.keyEnd}</span>
                              </div>
                              {supabaseStatus.diagnostics.role && (
                                <div className="flex justify-between py-0.5">
                                  <span className="text-slate-400">JWT Encoded Role:</span>
                                  <span className={`font-semibold ${supabaseStatus.diagnostics.role === 'anon' ? 'text-[#00A86B]' : 'text-rose-600 font-extrabold'}`}>
                                    "{supabaseStatus.diagnostics.role}" {supabaseStatus.diagnostics.role !== 'anon' && '(Warning: Must be "anon"!)'}
                                  </span>
                                </div>
                              )}
                              {supabaseStatus.diagnostics.ref && (
                                <div className="flex justify-between py-0.5">
                                  <span className="text-slate-400">JWT Project Ref Code:</span>
                                  <span className="font-semibold text-indigo-700">"{supabaseStatus.diagnostics.ref}"</span>
                                </div>
                              )}
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-400">Extraneous Quotes Stripped:</span>
                                <span className={`font-semibold ${supabaseStatus.diagnostics.hasQuotesRemoved ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                                  {supabaseStatus.diagnostics.hasQuotesRemoved ? 'Yes (Removed surrounding quotes/spaces)' : 'None detected'}
                                </span>
                              </div>
                            </div>
                          )}

                          {supabaseStatus.status === 'network_error' && (
                            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-[10px] text-slate-700 font-medium space-y-1.5 animate-pulse">
                              <div className="font-extrabold text-rose-800 flex items-center gap-1">
                                <span>🌐 DNS & Connection Troubleshooting Guidance:</span>
                              </div>
                              <p className="font-sans text-[10px] leading-relaxed text-slate-600 font-normal">
                                The system failed to look up the domain hostname for your Supabase URL. This is a common setup error and usually caused by one of the following:
                              </p>
                              <ul className="list-disc pl-4.5 space-y-1 text-slate-700 font-sans text-[10px] font-normal">
                                <li><strong>Incorrect Domain URL:</strong> Go to AI Studio Settings & Secrets and check your <code className="bg-white px-1 py-0.5 rounded border text-rose-700 font-mono text-[9px]">SUPABASE_URL</code>. It should look like <code className="bg-white px-1 py-0.5 rounded border text-slate-700 font-mono text-[9px]">https://your-project-id.supabase.co</code>.</li>
                                <li><strong>Typo in Subdomain:</strong> Ensure you didn't accidentally include double subdomains like <code className="text-rose-700">jhfa...supabase.co.co</code> or miss a character. Your decoded JWT indicates your reference code is <strong>"{supabaseStatus.diagnostics?.ref || 'jhfaelvlltcqnexsgnm'}"</strong>.</li>
                                <li><strong>Status or Paused State:</strong> If your Supabase project was recently created, paused, or deleted, the DNS record may not be active. Check your Supabase project dashboard to verify it is online.</li>
                                <li><strong>Server Restart Required:</strong> Remember to click <strong>"Restart dev server"</strong> (or let the system reboot) in AI Studio after updating your environment secrets, so the server picks up the new URL!</li>
                              </ul>
                            </div>
                          )}

                          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/50 text-[10px] text-slate-600 font-medium space-y-1">
                            <div className="font-extrabold text-amber-700">🛡️ General Key Check:</div>
                            <ol className="list-decimal pl-4.5 space-y-1 mt-1 text-slate-700 font-sans text-[10px] font-normal">
                              <li>Open your <strong>Supabase Dashboard</strong>, select your project, then navigate to <strong>Project Settings &rarr; API</strong>.</li>
                              <li>Ensure you copy the <strong>anon public</strong> token key (usually starting with <code className="bg-amber-100/70 text-amber-800 px-1.5 py-0.5 rounded font-mono text-[9px]">eyJhbGciOi...</code>).</li>
                              <li>Do not use the secret <code className="text-rose-700 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded font-mono text-[9px]">service_role</code> high-privilege key.</li>
                              <li>Check for any accidental front or back white spacing in the <strong>SUPABASE_ANON_KEY</strong> value set in your AI Studio secrets menu.</li>
                              <li>Click the <strong>Check connection</strong> button again after updating.</li>
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="text-xs font-semibold text-slate-400">Unable to query cloud status. Click button to check connection.</p>
                    </div>
                  )}
                </div>

                {/* 2. DIGITAL WALLET CARD (Interactive Balance & Funding) */}
                <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-500 animate-pulse" /> SwiftCart Digital Vault
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">Secure Sync</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block font-sans">Available Balance</span>
                    <h3 className="text-3xl font-black tracking-tight text-white font-mono flex items-baseline gap-0.5">
                      <span className="text-xl font-normal text-slate-300">₹</span>
                      <span>{userProfile.walletBalance !== undefined ? userProfile.walletBalance : 1000}</span>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTopUpPanelOpen(!isTopUpPanelOpen)}
                    className="w-full py-2.5 bg-[#00A86B] hover:bg-[#00875A] text-white rounded-xl text-xs font-black uppercase transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#00A86B]/20"
                  >
                    {isTopUpPanelOpen ? '✕ Close Vault Deposit' : '⚡️ Deposit / Add Money'}
                  </button>

                  {/* Top Up interactive panel */}
                  {isTopUpPanelOpen && (
                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3 text-slate-200">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase block tracking-wider text-left">Top-Up Sum (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₹</span>
                          <input
                            type="text"
                            value={profileTopUpAmount}
                            onChange={(e) => setProfileTopUpAmount(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-900 border border-slate-850 text-white font-mono font-black text-center py-1.5 rounded-xl text-xs focus:ring-1 focus:ring-[#00A86B] outline-none pl-8"
                            placeholder="e.g. 500"
                            required
                          />
                        </div>
                        {/* Instant keys */}
                        <div className="flex gap-1 pt-1 justify-center">
                          {['300', '500', '1000', '2000'].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setProfileTopUpAmount(amt)}
                              className="px-2 py-0.5 bg-slate-850 hover:bg-slate-800 text-slate-300 text-[9px] font-black rounded font-mono border border-slate-800 cursor-pointer transition"
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider text-left">Gateway channel</span>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-extrabold font-sans">
                          <button
                            type="button"
                            onClick={() => setProfileTopUpGateway('Razorpay')}
                            className={`py-1.5 rounded-lg border transition cursor-pointer ${profileTopUpGateway === 'Razorpay' ? 'border-[#00a86b] bg-[#00a86b]/10 text-[#00a86b]' : 'border-slate-800 text-slate-400'}`}
                          >
                            Razorpay UPI
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileTopUpGateway('Stripe')}
                            className={`py-1.5 rounded-lg border transition cursor-pointer ${profileTopUpGateway === 'Stripe' ? 'border-[#00a86b] bg-[#00a86b]/10 text-[#00A86B]' : 'border-slate-800 text-slate-400'}`}
                          >
                            Stripe Elements
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleProfileTopUpSubmit}
                        disabled={isToppingUpProfile}
                        className="w-full py-2 bg-white text-slate-950 font-black text-[10px] rounded-xl uppercase transition hover:bg-slate-100 cursor-pointer"
                      >
                        {isToppingUpProfile ? 'Depositing Securely...' : `Add ₹${profileTopUpAmount} instantly`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Ledger History Drawer or list */}
                {userProfile.walletTransactions && userProfile.walletTransactions.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3 text-xs shadow-3xs">
                    <div className="flex justify-between items-center border-b border-rose-50/10 pb-2">
                      <span className="font-extrabold text-slate-700 uppercase tracking-widest text-[9.5px] flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-slate-500" /> Recent Vault Statements
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {[...userProfile.walletTransactions].reverse().slice(0, 3).map((tx, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-[10px] text-slate-800 line-clamp-1">{tx.description}</p>
                            <p className="text-[8px] text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-black text-[11px] font-mono ${tx.type === 'debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {tx.type === 'debit' ? '-' : '+'}₹{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MY ORDERS SUMMARY SECTION (Horizontal category bars with counters) */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-3xs space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-black text-slate-850 uppercase tracking-wider text-[10px]">My Purchases</span>
                    <button onClick={() => setActiveTab('orders')} className="text-[#00A86B] hover:text-[#00875A] font-bold text-[10px] uppercase flex items-center gap-0.5 cursor-pointer">
                      <span>View All</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Grid summary labels */}
                  <div className="grid grid-cols-5 gap-1 text-center font-sans">
                    {[
                      { label: 'All', count: orders.length, status: 'all', icon: '📦' },
                      { label: 'To Pay', count: orders.filter(o => o.status === 'pending').length, status: 'pending', icon: '💳' },
                      { label: 'Delivering', count: orders.filter(o => ['processing', 'dispatched', 'delivered'].includes(o.status) && o.status !== 'delivered').length, status: 'delivering', icon: '🛵' },
                      { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, status: 'delivered', icon: '✅' },
                      { label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length, status: 'cancelled', icon: '✕' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTab('orders')}
                        className="bg-slate-50 hover:bg-slate-150 p-2 rounded-2xl border border-slate-100 transition active:scale-95 text-[9.5px] font-black py-2 cursor-pointer relative"
                      >
                        <span className="text-lg block mb-0.5">{item.icon}</span>
                        <span className="text-slate-500 font-semibold block scale-90">{item.label}</span>
                        {item.count > 0 && (
                          <span className="absolute top-1 right-1 bg-[#00A86B] text-white font-mono rounded-full px-1 text-[8px] font-bold min-w-4 h-4 flex items-center justify-center">
                            {item.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. PROFILE OPTIONS */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-3xs space-y-2 text-xs">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mr-2 border-b border-slate-50 pb-1.5 mb-2.5">Configure Settings</h4>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('addresses')}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>📍</span> Manage Delivery Addresses</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{savedAddresses.length} saved</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      alert('Standard Razorpay Secure / Demo payment token interfaces configured for live production.');
                    }}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>💳</span> Managed Payment Gateways</span>
                    <span className="text-[10px] font-mono text-[#00A86B] bg-emerald-50 px-1.5 py-0.5 rounded-md">UPI & Card</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('wishlist')}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>❤️</span> Favorite Bookmarks</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{wishlist.length} products</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAlertTrayOpen(true)}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>🔔</span> Notifications Stream</span>
                    <span className="text-[10px] font-mono text-[#00A86B] bg-emerald-50 px-1.5 py-0.5 rounded-md animate-pulse">Live feed</span>
                  </button>
                </div>

                {/* 5. BUSINESS & PARTNER ACCESS SECTION - SELLER, RIDER, ADMIN */}
                <div className="bg-gradient-to-tr from-emerald-50/75 to-teal-50/60 rounded-[32px] p-5 border border-emerald-100/70 shadow-3xs space-y-4">
                  <div className="text-left space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-[#00875A] tracking-wider flex items-center gap-1">
                      <span>🏪</span> Business & Partner Hub
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed font-sans">
                      Earn active revenue, operate a virtual franchise, or perform secure administrative operations.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Option A: Become a Seller */}
                    <button
                      type="button"
                      onClick={() => setOnboardingView('seller')}
                      className="w-full bg-white hover:bg-[#F5FFF8] border border-slate-100 hover:border-[#00875A]/20 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs"
                    >
                      <div className="flex gap-3 items-center text-left">
                        <div className="bg-[#00A86B]/10 text-[#00A86B] w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                          🏪
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">Become a Store Seller</p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight">Publish catalog, manage pricing, review payouts</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#00A86B] shrink-0" />
                    </button>

                    {/* Option B: Become a Rider */}
                    <button
                      type="button"
                      onClick={() => setOnboardingView('rider')}
                      className="w-full bg-white hover:bg-[#F5FFF8] border border-slate-100 hover:border-[#00875A]/20 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs"
                    >
                      <div className="flex gap-3 items-center text-left">
                        <div className="bg-sky-50 text-sky-600 w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                          🛵
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">Become a Delivery Partner</p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight font-sans">Accept rider orders, get live routes, earn tips</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#00A86B] shrink-0" />
                    </button>

                    {/* Option C: Admin Business suite */}
                    <button
                      type="button"
                      onClick={() => setOnboardingView('admin')}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-100 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs"
                    >
                      <div className="flex gap-3 items-center text-left">
                        <div className="bg-slate-100 text-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                          ⚙️
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">Business Control Suite & Admin</p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight">Global inventory control, live telemetry statistics</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Secure Access</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-extrabold transition text-xs text-center rounded-2xl cursor-pointer uppercase tracking-wider"
                >
                  Secure Log Out Account
                </button>
              </>
            ) : (
              /* DYNAMIC BUSINESS ONBOARDING SUB-PAGES ACCORDING TO USER FLOW */
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6 animate-fade-in relative text-left">
                
                {onboardingError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{onboardingError}</span>
                  </div>
                )}

                {/* Subpage A: Become a Seller */}
                {onboardingView === 'seller' && (
                  <div className="space-y-5">
                    <div className="text-center space-y-2">
                      <span className="text-4xl block">🏪</span>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">Become a Store Seller Partner</h3>
                      <p className="text-xs text-slate-500 leading-normal font-sans">
                        Register your local darkstore or organic grocery hub and cater to thousands of local orders.
                      </p>
                    </div>

                    <div className="bg-[#F5FFF8] border border-[#00A86B]/15 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase text-[#00875A] tracking-wider">Seller Program Benefits</h4>
                      <ul className="text-[10.5px] text-slate-600 font-medium space-y-1.5 list-inside">
                        <li className="flex items-start gap-1.5"><span className="text-emerald-600">✓</span> Reach 5,000+ local customers in 10 mins</li>
                        <li className="flex items-start gap-1.5"><span className="text-emerald-600">✓</span> Dynamic pricing dashboard & discount control</li>
                        <li className="flex items-start gap-1.5"><span className="text-emerald-600">✓</span> Direct bi-weekly payouts to database balance</li>
                      </ul>
                    </div>

                    {/* Store onboarding input form */}
                    <div className="space-y-3 pt-2 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Store Outlet Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Organic Farm Greenlands"
                          value={storeOnboardingName}
                          onChange={(e) => setStoreOnboardingName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Store Geographical Address</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. B-4/45, Sector 15, Saket, New Delhi"
                          value={storeOnboardingAddress}
                          onChange={(e) => setStoreOnboardingAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={switchingRoleLoading}
                      onClick={async () => {
                        const targetName = storeOnboardingName.trim() || `${userProfile.name || 'Resident'}'s Quick Store`;
                        const targetAddress = storeOnboardingAddress.trim() || 'B-4/45, Sector 15, Saket, New Delhi';
                        setSwitchingRoleLoading(true);
                        setOnboardingError('');
                        try {
                          const res = await fetch('/api/auth/switch-role', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              currentUserId: userProfile.id,
                              targetRole: 'seller',
                              storeName: targetName,
                              address: targetAddress
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Onboarding failed.');
                          
                          if (onSwitchRole) {
                            onSwitchRole('seller', data.token, data.profile);
                          }
                        } catch (err: any) {
                          setOnboardingError(err.message);
                        } finally {
                          setSwitchingRoleLoading(false);
                        }
                      }}
                      className="w-full py-3.5 bg-[#00A86B] hover:bg-[#00875A] text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                    >
                      {switchingRoleLoading ? 'Onboarding Franchise...' : 'Continue - Get Started & Launch'}
                    </button>
                  </div>
                )}

                {/* Subpage B: Become a Rider */}
                {onboardingView === 'rider' && (
                  <div className="space-y-5">
                    <div className="text-center space-y-2">
                      <span className="text-4xl block">🛵</span>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">Become a Delivery Partner</h3>
                      <p className="text-xs text-slate-500 leading-normal font-sans">
                        Deliver groceries locally & earn pay per trip plus 100% of customer tips!
                      </p>
                    </div>

                    <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase text-sky-750 tracking-wider font-sans">Earnings & Privileges</h4>
                      <ul className="text-[10.5px] text-slate-600 font-medium space-y-1.5 list-inside">
                        <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Earn ₹50 per trip + hourly peak bonuses</li>
                        <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Weekly payouts directly with digital wallet options</li>
                        <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Zero deposits required to start with local riders</li>
                      </ul>
                    </div>

                    {/* Vehicle input details */}
                    <div className="space-y-3 pt-2 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Two-Wheeler Vehicle Number</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. DL-3S-CQ-4521"
                          value={vehicleOnboardingNumber}
                          onChange={(e) => setVehicleOnboardingNumber(e.target.value.toUpperCase())}
                          className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={switchingRoleLoading}
                      onClick={async () => {
                        const targetVeh = vehicleOnboardingNumber.trim() || 'DL-3C-' + Math.floor(1000 + Math.random() * 9000);
                        setSwitchingRoleLoading(true);
                        setOnboardingError('');
                        try {
                          const res = await fetch('/api/auth/switch-role', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              currentUserId: userProfile.id,
                              targetRole: 'rider',
                              vehicleNumber: targetVeh
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Rider Onboarding failed.');
                          
                          if (onSwitchRole) {
                            onSwitchRole('rider', data.token, data.profile);
                          }
                        } catch (err: any) {
                          setOnboardingError(err.message);
                        } finally {
                          setSwitchingRoleLoading(false);
                        }
                      }}
                      className="w-full py-3.5 bg-[#00A86B] hover:bg-[#00875A] text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                    >
                      {switchingRoleLoading ? 'Onboarding vehicle...' : 'Join Now & Access Delivery Console'}
                    </button>
                  </div>
                )}

                {/* Subpage C: Admin Secure Entry */}
                {onboardingView === 'admin' && (
                  <div className="space-y-5">
                    <div className="text-center space-y-2">
                      <span className="text-4xl block">⚙️</span>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">Admin Institutional Access</h3>
                      <p className="text-xs text-slate-500 leading-normal font-sans">
                        Restricted administrative portal. Inspect general telemetry, manage dynamic categorizations.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                      <p className="font-bold text-slate-700 flex items-center gap-1"><span>🛡️</span> Authentication Node Active</p>
                      <p className="text-slate-500 text-[10.5px] leading-relaxed">
                        For local development or institutional verification, click Continue to gain full administrative privileges.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={switchingRoleLoading}
                      onClick={async () => {
                        setSwitchingRoleLoading(true);
                        setOnboardingError('');
                        try {
                          const res = await fetch('/api/auth/switch-role', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              currentUserId: userProfile.id,
                              targetRole: 'admin'
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Admin verification node failed.');
                          
                          if (onSwitchRole) {
                            onSwitchRole('admin', data.token, data.profile);
                          }
                        } catch (err: any) {
                          setOnboardingError(err.message);
                        } finally {
                          setSwitchingRoleLoading(false);
                        }
                      }}
                      className="w-full py-3.5 bg-[#00A86B] hover:bg-[#00875A] text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                    >
                      {switchingRoleLoading ? 'Verifying admin shell...' : 'Continue - Unlock Secure Workspace'}
                    </button>
                  </div>
                )}

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingView('none');
                    setOnboardingError('');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-205 text-slate-600 font-extrabold text-[10.5px] rounded-xl uppercase transition cursor-pointer text-center"
                >
                  ✕ Close & Return to profile
                </button>

              </div>
            )}
          </div>
        )}

      </div>

      {/* DYNAMIC BELL NOTIFICATION DETAILED TRAY SLIDEOUT */}
      {isAlertTrayOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col justify-between text-left">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-black text-sm text-slate-800 uppercase flex items-center gap-1">
                <Bell className="w-4.5 h-4.5 text-emerald-600" /> Notifications Stream
              </span>
              <button 
                onClick={() => setIsAlertTrayOpen(false)}
                className="p-1 px-2.5 bg-slate-100 rounded-full text-xs font-bold font-mono"
              >
                CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notificationsHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-2">
                  <Bell className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">No notifications yet, stay tuned!</p>
                </div>
              ) : (
                notificationsHistory.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <p className="font-black text-slate-850 flex items-center justify-between">
                      {item.title}
                      <span className="text-[8px] opacity-40 font-mono text-slate-400">{item.timestamp}</span>
                    </p>
                    <p className="text-slate-500 font-medium leading-normal">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC CART SLIDE DRAWER OVERLAY */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between text-left">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-1.5 font-black text-slate-850 text-sm uppercase">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                Shopping Basket
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 px-3 bg-slate-150 hover:bg-slate-200 rounded-xl transition cursor-pointer font-bold text-xs"
              >
                Keep Browsing
              </button>
            </div>

            {/* Items inside */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-500 text-sm">Your shopping basket is currently empty.</p>
                  <p className="text-slate-400 text-[11px] max-w-xs mx-auto pr-2 pl-2">Fill your cart with fresh orchard apples, dairy cubes, dynamic snacks and morning beverage packs for fast delivery!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={`${item.product.id}-${item.selectedVariant || 'default'}`}
                      className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-100 p-1 flex items-center">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>

                      <div className="flex-1 text-left">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{item.product.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-px">
                          Pack: <span className="text-slate-700 font-bold">{item.selectedVariant || item.product.unit}</span> • ₹{item.product.price}
                        </p>
                      </div>

                      {/* Quantity switcher */}
                      <div className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg p-1 font-semibold scale-95 shrink-0 select-none">
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id, item.selectedVariant)}
                          className="w-4.5 h-4.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs w-4 text-center select-none">{item.quantity}</span>
                        <button
                          onClick={() => handleAddToCart(item.product, item.selectedVariant)}
                          className="w-4.5 h-4.5 flex items-center justify-center hover:bg-emerald-700 rounded cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-black text-xs font-mono text-right shrink-0 w-12 text-slate-800">
                        ₹{item.product.price * item.quantity}
                      </div>

                    </div>
                  ))}

                  {/* Delivery instructions details */}
                  <div className="p-3 bg-yellow-50/50 border border-yellow-105 rounded-2xl space-y-1.5 text-xs text-slate-700 text-left">
                    <p className="font-extrabold text-yellow-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-yellow-600 animate-pulse" />
                      Standard Cargo Delivery Pinpoint Point
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium italic select-all leading-normal">
                      📍 {deliveryAddress}
                    </p>
                    <button 
                      onClick={() => { setIsCartOpen(false); setActiveTab('addresses'); }}
                      className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block hover:underline"
                    >
                      Change or Add Address location
                    </button>
                  </div>

                  {/* Billing summaries details list */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs text-left">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Estimated Cargo Subtotals</h4>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Basket Subtotal:</span>
                      <span className="font-mono text-slate-700 font-bold">₹{subtotal}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated Delivery:</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE (orders over ₹150)'}
                      </span>
                    </div>

                    {automaticDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Automatic Bulk Discount (-):</span>
                        <span className="font-mono">-₹{automaticDiscount}</span>
                      </div>
                    )}
                    
                    <div className="h-px bg-slate-200 my-1.5"></div>
                    
                    <div className="flex justify-between font-black text-xs text-slate-900">
                      <span>Total Estimated Invoice:</span>
                      <span className="font-mono text-sm text-emerald-700">₹{automaticTotal}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Sticky placing checkout redirect buttons */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setActiveTab('checkout');
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg transition flex justify-between items-center px-4 cursor-pointer"
                >
                  <span className="uppercase">PROCEED WITH SECURE CHECKOUT</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span>₹{automaticTotal}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2.5 px-3 z-40 flex items-center justify-around md:hidden shadow-xl">
        <button
          onClick={() => {
            setActiveTab('home');
            setActiveTrackOrder(null);
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[9px]">Shop Home</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('categories');
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'categories' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px]">Categories</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('orders');
          }}
          className={`flex flex-col items-center gap-1 relative ${activeTab === 'orders' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[9px]">My Orders</span>
          {orders.some(o => o.status !== 'delivered') && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px]">My Profile</span>
        </button>
      </div>

    </div>
  );
}
