import React, { useState, useEffect, useRef } from 'react';
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
  Carrot,
  Egg,
  Cookie,
  CupSoda,
  Soup,
  Croissant,
  IceCream,
  Baby,
  PawPrint,
  Beef,
  Briefcase,
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
  RefreshCw,
  QrCode,
  Smartphone,
  MessageSquare,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Product, CartItem, Order, UserRole } from '../types';
import { PushNotifications } from '@capacitor/push-notifications';

// Import our modular sub-components
import LiveTracking from './LiveTracking';
import AddressesManager from './AddressesManager';
import CheckoutPage from './CheckoutPage';
import WishlistPage from './WishlistPage';
import RestaurantInfographic from './RestaurantInfographic';
import RestaurantCustomerFlow from './RestaurantCustomerFlow';
import TiffinCustomerFlow from './TiffinCustomerFlow';
import { playOrderPlacedSound, playNotificationPopSound } from '../audioUtils';
import { supabase, isSupabaseConfigured } from '../supabase';
// @ts-ignore
import dailyMartLogo from '../assets/images/daily_mart_green_logo_1781598237470.jpg';

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
  const [riderOnboardingName, setRiderOnboardingName] = useState('');
  const [riderOnboardingPhone, setRiderOnboardingPhone] = useState('');
  const [adminOnboardingPass, setAdminOnboardingPass] = useState('');
  const [switchingRoleLoading, setSwitchingRoleLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  React.useEffect(() => {
    if (userProfile) {
      setRiderOnboardingName(userProfile.name || '');
      setRiderOnboardingPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  // Local wallet top-up states inside Profile Section
  const [profileTopUpAmount, setProfileTopUpAmount] = useState('500');
  const [profileTopUpGateway, setProfileTopUpGateway] = useState<'Razorpay' | 'Stripe'>('Razorpay');
  const [profileTopUpSimulateSuccess, setProfileTopUpSimulateSuccess] = useState(true);
  const [isToppingUpProfile, setIsToppingUpProfile] = useState(false);
  const [isTopUpPanelOpen, setIsTopUpPanelOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);
    if (nextCount >= 5) {
      setLogoClicks(0);
      if (onSwitchRole) {
        onSwitchRole('admin');
      } else {
        window.history.pushState({}, '', '/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else {
      setActiveTab('home');
      setSelectedCategory(null);
      setActiveTrackOrder(null);
    }
  };

  // Supabase live status monitoring state
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    status: string;
    maskedUrl?: string;
    message: string;
    statusCode?: number;
    diagnostics?: any;
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

  // User-specific role approval applications state
  const [myRoleRequests, setMyRoleRequests] = useState<any[]>([]);
  const [roleRequestsLoading, setRoleRequestsLoading] = useState(false);

  // AI Recipe planner state variables
  const [recipePrompt, setRecipePrompt] = useState('');
  const [recipePeopleCount, setRecipePeopleCount] = useState('2-3 people');
  const [recipePlannerLoading, setRecipePlannerLoading] = useState(false);
  const [recipePlannerError, setRecipePlannerError] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);

  const runRecipePlanner = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || recipePrompt).trim();
    if (!targetPrompt) {
      setRecipePlannerError('Please enter what you want to cook first.');
      return;
    }
    setRecipePlannerLoading(true);
    setRecipePlannerError('');
    try {
      const res = await fetch('/api/ai/recipe-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetPrompt,
          peopleCount: recipePeopleCount
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'The model could not parse or compile this dish.');
      }
      setGeneratedRecipe(data.recipe);
    } catch (err: any) {
      console.error('[RECIPE_GENERATION_ERROR]', err);
      setRecipePlannerError(err.message || 'Cooking AI engine reported a structural error.');
    } finally {
      setRecipePlannerLoading(false);
    }
  };

  const fetchMyRoleRequests = async () => {
    setRoleRequestsLoading(true);
    try {
      const token = localStorage.getItem('swiftcart_jwt_token');
      if (!token) return;
      
      const res = await fetch('/api/role-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMyRoleRequests(data);
      }
    } catch (err) {
      console.error('[ROLE_REQUESTS_FETCH] Error:', err);
    } finally {
      setRoleRequestsLoading(false);
    }
  };
  
  const isAddressValid = (addr: string | null | undefined): boolean => {
    if (!addr) return false;
    const clean = addr.trim();
    if (clean === '' || clean === 'No address registered' || clean === 'No address provided') return false;
    if (clean.toLowerCase().includes('mahabubabad') && clean.toLowerCase().includes('5-2/12')) return false;
    return true;
  };

  // Cart management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    const hasProfileAddress = isAddressValid(userProfile?.address);
    return hasProfileAddress ? (userProfile?.address || '') : 'Add Address';
  });
  const [activeAddressId, setActiveAddressId] = useState<string | null>(() => {
    const key = userProfile?.id ? `saved_addresses_customer_${userProfile.id}` : 'saved_addresses_customer';
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed[0].id;
    }
    const hasProfileAddress = isAddressValid(userProfile?.address);
    if (hasProfileAddress) return 'addr-1';
    return null;
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  
  // Orders & Active Track
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTrackOrder, setActiveTrackOrder] = useState<Order | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const prevStatusesRef = useRef<Record<string, string>>({});

  // Tab management (Expanded for granular premium page routings)
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'category' | 'orders' | 'profile' | 'wishlist' | 'checkout' | 'live-tracking' | 'addresses' | 'product-details' | 'cart' | 'ai-planner'>('home');
  const [orderFilterType, setOrderFilterType] = useState<'all' | 'pending' | 'packed' | 'out_for_delivery' | 'delivered' | 'tiffin'>('all');

  // Shimmer effect loading states
  const [isShimmering, setIsShimmering] = useState(false);
  const [showMobileQrModal, setShowMobileQrModal] = useState(false);

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

  // FCM Messaging & Notification preferences State
  const [fcmToken, setFcmToken] = useState(() => {
    return userProfile.fcmToken || localStorage.getItem('swiftcart_fcm_token') || '';
  });
  const [notifPromos, setNotifPromos] = useState(userProfile.notificationSettings?.promos !== false);
  const [notifStatuses, setNotifStatuses] = useState(userProfile.notificationSettings?.orderStatuses !== false);
  const [notifAlerts, setNotifAlerts] = useState(userProfile.notificationSettings?.systemAlerts !== false);
  const [notifSound, setNotifSound] = useState(userProfile.notificationSettings?.soundEnabled !== false);
  const [fcmSaving, setFcmSaving] = useState(false);
  const [fcmMessage, setFcmMessage] = useState('');
  const [showFcmCenter, setShowFcmCenter] = useState(false);
  const [realtimeNotificationHistory, setRealtimeNotificationHistory] = useState<any[]>([]);

  // Customer-facing Notification Center state variables for Blinkit-style notification engine
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [customerNotifications, setCustomerNotifications] = useState<any[]>([]);
  const [activeNotificationTab, setActiveNotificationTab] = useState<'all' | 'order_status' | 'promo' | 'system'>('all');

  // Native Android/iOS background push notification registration with Capacitor Push plugin
  useEffect(() => {
    if (!userProfile?.id) return;
    
    const initNativeAndWebPush = async () => {
      try {
        if (typeof window !== 'undefined' && 'Capacitor' in window && (window as any).Capacitor?.isNativePlatform()) {
          console.log('📱 [MOBILE DEVICE EXECUTING] Native platform detected. Setting up Android FCM push token flow...');
          
          let checkPerm = await PushNotifications.checkPermissions();
          if (checkPerm.receive === 'prompt') {
            checkPerm = await PushNotifications.requestPermissions();
          }

          if (checkPerm.receive === 'granted') {
            await PushNotifications.register();

            PushNotifications.addListener('registration', (token) => {
              console.log('🟢 [REAL FCM DEVICE REGISTRATION SUCCESS] Real FCM Token obtained:', token.value);
              setFcmToken(token.value);
              localStorage.setItem('swiftcart_fcm_token', token.value);
              
              // Automatically register real token with Express server
              fetch('/api/notifications/register-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userProfile.id, fcmToken: token.value })
              }).catch(err => console.error('Failed to sync device push token to backend:', err));
            });

            PushNotifications.addListener('registrationError', (error) => {
              console.error('❌ [FCM REGISTRATION ERROR] Native token fetching failed:', error.error);
            });

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('🔔 [PUSH DECIPIENT ARRIVED]:', notification);
              // Trigger in-app toast for consistency when app is active
              triggerPushNotification(
                notification.title || "Daily Mart Status Alert 🛒", 
                notification.body || "A pick-up dispatch update occurred.", 
                'success'
              );
              fetchCustomerNotifications();
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
              console.log('👉 [PUSH ACTION PERFORMED]:', action);
              const data = action.notification.data;
              if (data && data.orderId) {
                handleDeepLinkTransition(data.category || 'orderStatuses', data.orderId);
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('⚠️ [Capacitor SDK Bypass] Native push notification flow bypassed on desktop browser iframe frame.', err.message);
      }
    };

    initNativeAndWebPush();
  }, [userProfile?.id]);

  const fetchCustomerNotifications = async () => {
    if (!userProfile?.id) return;
    try {
      const res = await fetch(`/api/notifications/customer/${userProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching customer notifications:', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    if (!userProfile?.id) return;
    try {
      await fetch(`/api/notifications/customer/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, userId: userProfile.id })
      });
      setCustomerNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userProfile?.id) return;
    try {
      await fetch(`/api/notifications/customer/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id })
      });
      setCustomerNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  // Deep Link Navigation routing helper mapped to order details and real-time live tracking
  const handleDeepLinkTransition = (type: string, orderId: string | null) => {
    if (!orderId || orderId === 'promo' || orderId === 'none') {
      // General promo/system navigation: show orders board
      setActiveTab('orders');
      return;
    }
    const match = orders.find(o => String(o.id) === String(orderId));
    if (!match) {
      console.warn('Deep link target order not found in current list, attempting fresh synchronization...');
      fetchOrders().then(() => {
        const retryMatch = orders.find(o => String(o.id) === String(orderId));
        if (retryMatch) {
          setActiveTrackOrder(retryMatch);
          setActiveTab('live-tracking');
        } else {
          setActiveTab('orders');
        }
      });
      return;
    }

    setActiveTrackOrder(match);
    setActiveTab('live-tracking');
  };

  const fetchRealtimeNotificationHistory = async () => {
    try {
      const res = await fetch(`/api/notifications/history/${userProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Trigger push toasts for newly arrived backend-issued notifications
        if (Array.isArray(data)) {
          setRealtimeNotificationHistory(prev => {
            if (prev.length > 0) {
              const existingIds = new Set(prev.map((n: any) => n.id));
              const newNotifications = data.filter((n: any) => !existingIds.has(n.id));
              
              newNotifications.forEach((notif: any) => {
                // Determine tidy visual slide-in type
                let type: 'info' | 'success' | 'warning' | 'promo' = 'info';
                if (notif.category === 'promos') type = 'promo';
                else if (notif.category === 'orderStatuses') type = 'success';
                else if (notif.category === 'systemAlerts') type = 'warning';
                
                // Notify the user in the app
                triggerPushNotification(
                  notif.title, 
                  notif.body || notif.message.replace(`${notif.title}: `, ''), 
                  type
                );

                // Play sound notification if enabled
                if (notifSound) {
                  try {
                    // Guaranteed offline-ready synthesizer fallback
                    playNotificationPopSound();
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
                    audio.volume = 0.25;
                    audio.play().catch(() => {});
                  } catch (e) {}
                }

                // Native OS Push notification API triggers
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification(notif.title, {
                      body: notif.body || notif.message.replace(`${notif.title}: `, ''),
                      tag: 'dailymart-' + notif.id
                    });
                  } catch (err) {}
                }
              });
            }
            return data;
          });
        }
      }
      // Sync DB-backed CRM / Customer Notification Center history
      await fetchCustomerNotifications();
    } catch (err) {
      console.error("Failed loading backend notification history", err);
    }
  };

  const handleSaveFCMPreferences = async () => {
    setFcmSaving(true);
    setFcmMessage('');
    try {
      // 1. Save FCM Token
      const tokenRes = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, fcmToken })
      });
      
      // 2. Save Settings
      const settingsRes = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          settings: {
            promos: notifPromos,
            orderStatuses: notifStatuses,
            systemAlerts: notifAlerts,
            soundEnabled: notifSound
          }
        })
      });

      if (tokenRes.ok && settingsRes.ok) {
        setFcmMessage('FCM preferences synced successfully with best-effort high reliability retry policies. 🎉');
        localStorage.setItem('swiftcart_fcm_token', fcmToken);
        if (reloadUserProfile) reloadUserProfile();
        fetchRealtimeNotificationHistory();
        setTimeout(() => setFcmMessage(''), 4000);
      } else {
        setFcmMessage('Error saving FCM configuration details');
      }
    } catch (err) {
      setFcmMessage('Network exception saving notification rules');
      console.error(err);
    } finally {
      setFcmSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchSupabaseStatus();
      fetchMyRoleRequests();
      fetchRealtimeNotificationHistory();
    }
  }, [activeTab]);

  // Push notifications queue stack state
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
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

  // Saved Addresses list state initialized with defaults namespaced by user id
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>(() => {
    const key = userProfile?.id ? `saved_addresses_customer_${userProfile.id}` : 'saved_addresses_customer';
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    const hasProfileAddress = isAddressValid(userProfile?.address);
    if (hasProfileAddress) {
      return [
        { id: 'addr-1', label: 'Home 🏠', address: userProfile.address || '' }
      ];
    }
    return [];
  });

  // Synchronize state when userProfile changes or loaded
  useEffect(() => {
    if (!userProfile) return;
    const key = `saved_addresses_customer_${userProfile.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedAddresses(parsed);
      
      // Update the active address
      const activeSaved = localStorage.getItem(`active_address_id_${userProfile.id}`);
      if (activeSaved) {
        const addrObj = parsed.find((a: AddressItem) => a.id === activeSaved);
        if (addrObj) {
          setActiveAddressId(activeSaved);
          setDeliveryAddress(addrObj.address);
        } else if (parsed.length > 0) {
          setActiveAddressId(parsed[0].id);
          setDeliveryAddress(parsed[0].address);
        } else {
          setActiveAddressId(null);
          setDeliveryAddress('Add Address');
        }
      } else if (parsed.length > 0) {
        setActiveAddressId(parsed[0].id);
        setDeliveryAddress(parsed[0].address);
      } else {
        setActiveAddressId(null);
        setDeliveryAddress('Add Address');
      }
    } else {
      const hasProfileAddress = isAddressValid(userProfile.address);
      if (hasProfileAddress) {
        const initialAddresses = [
          { id: 'addr-1', label: 'Home 🏠', address: userProfile.address || '' }
        ];
        setSavedAddresses(initialAddresses);
        setActiveAddressId('addr-1');
        setDeliveryAddress(userProfile.address || '');
      } else {
        setSavedAddresses([]);
        setActiveAddressId(null);
        setDeliveryAddress('Add Address');
      }
    }
  }, [userProfile?.id, userProfile?.address]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchBanners();
    fetchOrders();

    // Create persistent intervals to simulate order updates and background store alerts
    const interval = setInterval(() => {
      fetchOrders();
    }, 6000);

    // Fetch and poll backend push notifications
    fetchRealtimeNotificationHistory();
    const pushInterval = setInterval(() => {
      fetchRealtimeNotificationHistory();
    }, 8000);

    // Initial warm welcome push notification
    setTimeout(() => {
      triggerPushNotification(
        "Welcome Back! 👋", 
        `Logged in securely to 10-MIN Daily Mart cargo! Grab discount using coupon "FAST50"`, 
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
      clearInterval(pushInterval);
      clearInterval(alertSystem);
    };
  }, []);

  // Save changes to localStorage on effect hooks namespaced by user id
  useEffect(() => {
    if (userProfile?.id) {
      localStorage.setItem(`wishlist_${userProfile.id}`, JSON.stringify(wishlist));
    }
  }, [wishlist, userProfile?.id]);

  useEffect(() => {
    localStorage.setItem('product_reviews_sim', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    if (userProfile?.id) {
      localStorage.setItem(`saved_addresses_customer_${userProfile.id}`, JSON.stringify(savedAddresses));
    }
  }, [savedAddresses, userProfile?.id]);

  useEffect(() => {
    if (userProfile?.id && activeAddressId) {
      localStorage.setItem(`active_address_id_${userProfile.id}`, activeAddressId);
    }
  }, [activeAddressId, userProfile?.id]);

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
      console.warn('Error fetching categories', e);
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
      console.warn('Error fetching products', e);
    }
  };

  const playNativeBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine'; // Pleasant notification chime
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      // Beautiful rising double chime notification alert
      playTone(587.33, now, 0.15); // D5
      playTone(880, now + 0.16, 0.25); // A5
    } catch (err) {
      console.warn('Web Audio Context block: ', err);
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
          if (Array.isArray(data)) {
            const isFirstFetch = Object.keys(prevStatusesRef.current).length === 0;
            const newStatuses: Record<string, string> = {};

            data.forEach((o: Order) => {
              newStatuses[o.id] = o.status;
              
              if (!isFirstFetch) {
                const oldStatus = prevStatusesRef.current[o.id];
                if (oldStatus && oldStatus !== o.status) {
                  if (o.status === 'dispatched') {
                    // Trigger sound beep alert
                    playNativeBeep();

                    const msgTitle = "Out for Delivery! 🛵";
                    const msgBody = `Your order #${o.id} is packed and out for delivery!`;

                    if ('Notification' in window && Notification.permission === 'granted') {
                      try {
                        new Notification(msgTitle, {
                          body: msgBody,
                          icon: '/favicon.ico'
                        });
                      } catch (err) {
                        console.warn('HTML5 Notification error:', err);
                      }
                    }

                    triggerPushNotification(msgTitle, msgBody, 'success');
                  } else if (o.status === 'delivered') {
                    // Trigger sound beep alert
                    playNativeBeep();

                    const msgTitle = "Order Delivered! 🎉";
                    const msgBody = `Your order #${o.id} has been successfully delivered. Thank you!`;

                    if ('Notification' in window && Notification.permission === 'granted') {
                      try {
                        new Notification(msgTitle, {
                          body: msgBody,
                          icon: '/favicon.ico'
                        });
                      } catch (err) {
                        console.warn('HTML5 Notification error:', err);
                      }
                    }

                    triggerPushNotification(msgTitle, msgBody, 'success');
                  }
                }
              }
            });

            prevStatusesRef.current = newStatuses;
            setOrders(data);
          } else {
            setOrders([]);
          }
          
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
      console.warn('Error fetching orders', e);
    }
  };

  // Helper to trigger stylish push notification banner toasts
  const triggerPushNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'promo' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newAlert: NotificationItem = { id, title, message, timestamp: timeStr, type };

    setToasts(prev => [newAlert, ...prev]);

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
      if (activeAddressId === id) {
        if (filtered.length > 0) {
          setDeliveryAddress(filtered[0].address);
          setActiveAddressId(filtered[0].id);
        } else {
          setDeliveryAddress('Add Address');
          setActiveAddressId(null);
        }
      }
      return filtered;
    });
    triggerPushNotification("Address Removed 🗑️", "Saved shipping destination deleted completely.", "info");
  };

  // Category Icon helper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Store': return <Store className="w-5 h-5 text-current" />;
      case 'Carrot': return <Carrot className="w-5 h-5 text-emerald-600" />;
      case 'Apple': return <Apple className="w-5 h-5 text-red-500" />;
      case 'Egg': return <Egg className="w-5 h-5 text-amber-600" />;
      case 'Cookie': return <Cookie className="w-5 h-5 text-orange-600" />;
      case 'CupSoda': return <CupSoda className="w-5 h-5 text-blue-600" />;
      case 'Soup': return <Soup className="w-5 h-5 text-rose-600" />;
      case 'Croissant': return <Croissant className="w-5 h-5 text-yellow-600" />;
      case 'IceCream': return <IceCream className="w-5 h-5 text-pink-600" />;
      case 'Baby': return <Baby className="w-5 h-5 text-indigo-600" />;
      case 'PawPrint': return <PawPrint className="w-5 h-5 text-purple-600" />;
      case 'Beef': return <Beef className="w-5 h-5 text-rose-600" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5 text-teal-600" />;
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
      <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-none sm:grid sm:grid-cols-4 md:grid-cols-8 sm:pb-0 w-full select-none">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 h-[84px] shrink-0 w-[88px] sm:w-auto">
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
    transactionId?: string,
    deliveryInstructions?: string,
    deliveryTip: number = 0
  ) => {
    if (cart.length === 0) return;

    if (
      deliveryAddress === 'Add Address' || 
      !isAddressValid(deliveryAddress) || 
      finalAddress === 'Add Address' || 
      !isAddressValid(finalAddress)
    ) {
      triggerPushNotification("Address Required ⚠️", "Please select or add a valid delivery address before placing your order.", "warning");
      alert("A valid delivery address is required to place an order. Redirecting you to address management.");
      setActiveTab('addresses');
      return;
    }

    try {
      const orderPayload = {
        customerPhone: userProfile?.phone || '+91 9999911111',
        customerEmail: userProfile?.email || 'customer@dailymart.com',
        customerUid: userProfile?.firebaseUid || userProfile?.id || '',
        customerName: userProfile?.name || 'Valued Resident Customer',
        items: cart,
        subtotal,
        deliveryFee,
        discount: finalCalculatedDiscount,
        deliveryTip: deliveryTip,
        total: Math.max(0, subtotal + deliveryFee + deliveryTip - finalCalculatedDiscount),
        address: finalAddress,
        paymentMethod: paymentModeChosen,
        sellerId: cart[0].product.sellerId,
        paymentStatus,
        transactionId,
        deliveryInstructions
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

      // Play 100% offline-ready success chime sound
      playOrderPlacedSound();

      setCart([]);
      setIsCartOpen(false);
      
      if (reloadUserProfile) {
        await reloadUserProfile();
      }

      setActiveTrackOrder(data.order);
      setOrders([data.order, ...orders]);

      // Request browser notification permissions
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              triggerPushNotification(
                "Notifications Enabled! 🔔",
                "You'll get alerted on status changes from Packed to Out for Delivery.",
                "success"
              );
            }
          });
        }
      }

      setActiveTab('live-tracking'); // Seamlessly forward to Live Tracking Map Node!
      return data.order;
      
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

  const renderBlinkitProductCard = (p: Product, isCarousel: boolean = false) => {
    const currentVariant = selectedVariants[p.id] || (p.variants && p.variants[0]) || p.unit;
    const quantity = getProductQuantity(p.id, currentVariant);
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    const isLiked = wishlist.includes(p.id);

    return (
      <div
        key={p.id}
        className={`bg-white rounded-[28px] border border-slate-100 hover:border-emerald-500/10 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_36px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col justify-between relative group text-left ${
          isCarousel ? 'shrink-0 w-40 xs:w-44 sm:w-48 md:w-52' : 'w-full'
        }`}
      >
        {/* Delivery Time sticker */}
        <div className="absolute top-3 left-3 bg-emerald-50 text-emerald-850 text-[9px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 z-10 shadow-xs border border-emerald-100/50 leading-none">
          <Clock className="w-3 h-3 text-emerald-600 animate-pulse-subtle" />
          <span>{p.deliveryMinutes} MINS</span>
        </div>

        {/* Favorite heart toggle */}
        <button
          type="button"
          onClick={(e) => handleToggleWishlist(p.id, e)}
          className="absolute top-3 right-3 p-2 bg-white/95 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 z-10 shadow-xs border border-slate-100 cursor-pointer transition duration-200"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
        </button>

        {/* Product illustration image block */}
        <div
          className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50/55 flex items-center justify-center p-3 mt-6 relative cursor-pointer"
          onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
        >
          <img
            src={p.image}
            alt={p.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-104 transition-transform duration-300"
          />
          {hasDiscount && (
            <div className="absolute bottom-2.5 left-2.5 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-xs leading-none">
              SAVE {Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)}%
            </div>
          )}
        </div>

        {/* Text descriptions */}
        <div className="mt-4 flex-1 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">{p.sellerName}</span>
            <h4
              className="font-sans font-extrabold text-xs text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-600 cursor-pointer text-left mt-1 min-h-[36px]"
              onClick={() => { setSelectedProductDetails(p); setActiveTab('product-details'); }}
            >
              {p.name}
            </h4>
            
            {p.variants && p.variants.length > 0 ? (
              <div className="mt-2 text-left">
                <select
                  value={currentVariant}
                  onChange={(e) => setSelectedVariants({ ...selectedVariants, [p.id]: e.target.value })}
                  className="w-full text-[10px] font-black border border-slate-200 bg-slate-50 text-slate-705 text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                >
                  {p.variants.map((v, vidx) => (
                    <option key={vidx} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-505 text-slate-500 font-bold px-2.5 py-1 rounded-lg mt-2 inline-block truncate max-w-full font-mono">
                {p.unit}
              </span>
            )}
          </div>

          {/* Action prices and Add counter */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5 text-left font-sans">
                <span className="font-black text-sm text-slate-900 font-mono">₹{p.price}</span>
                {hasDiscount && (
                  <span className="text-[10px] text-slate-400 font-bold line-through font-mono">₹{p.originalPrice}</span>
                )}
              </div>
              <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                {p.stock > 0 ? `${p.stock} Left` : 'Out of Stock'}
              </span>
            </div>

            {p.stock === 0 ? (
              <div className="w-full h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-extrabold flex items-center justify-center uppercase tracking-wider select-none">
                Sold Out
              </div>
            ) : quantity > 0 ? (
              <div className="flex items-center justify-between border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-xl w-full h-12 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(p.id, currentVariant); }}
                  className="w-12 h-full flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition-all text-emerald-700 font-black text-base cursor-pointer"
                  title="Decrease item quantity"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <span className="font-black text-sm font-sans select-none">{quantity}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(p, currentVariant); }}
                  className="w-12 h-full flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition-all text-emerald-700 font-black text-base cursor-pointer"
                  disabled={quantity >= p.stock}
                  title="Increase item quantity"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleAddToCart(p, currentVariant); }}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-md hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 uppercase tracking-wider border border-emerald-500/35"
              >
                <span>Add to Cart</span>
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      <div className="bg-emerald-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 md:py-7">
          
          <div className="flex items-center justify-between gap-4 md:gap-6">
            
            {/* Logo name branding (keeping simple & direct context) */}
            <div 
              onClick={handleLogoClick}
              className="hidden md:flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-500 bg-white shadow-sm">
                <img 
                  src={dailyMartLogo} 
                  alt="Daily Mart logo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-black text-base tracking-tighter uppercase font-sans">Daily Mart 10-MIN</span>
            </div>

            {/* Delivery pinpoint selector indicator */}
            <div className="flex items-center gap-3 max-w-[65%] text-left py-1">
              <div className="flex items-center justify-center shrink-0 p-1.5 bg-emerald-700/40 rounded-xl">
                <MapPin className={`w-5.5 h-5.5 text-yellow-300 shrink-0 animate-bounce ${deliveryAddress === 'Add Address' ? 'location-not-set' : ''}`} />
              </div>
              <div 
                className="cursor-pointer space-y-0.5"
                onClick={() => setActiveTab('addresses')}
                title="Manage locations"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white bg-emerald-700/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Delivering to {savedAddresses.find(a=>a.id===activeAddressId)?.label.toUpperCase() || 'HOME'}
                  </span>
                  <span className="bg-yellow-400 text-emerald-950 rounded-sm text-[8px] px-1.5 py-0.5 font-black uppercase tracking-wider shadow-xs">Instant 10m</span>
                </div>
                <p 
                  id="customer-address-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('addresses');
                  }}
                  className={`text-sm font-black truncate max-w-xs md:max-w-md border-b-2 border-dashed leading-normal cursor-pointer hover:text-yellow-100 transition-colors ${
                    deliveryAddress === 'Add Address' 
                      ? 'text-yellow-300 border-yellow-300/60 hover:border-yellow-300' 
                      : 'text-white border-white/40 hover:border-white'
                  }`}
                >
                  {deliveryAddress}
                </p>
              </div>
              {deliveryAddress !== 'Add Address' && (
                <button
                  type="button"
                  id="reset-address-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeliveryAddress('Add Address');
                    setActiveAddressId(null);
                  }}
                  className="p-1.5 bg-emerald-700/30 hover:bg-rose-600/30 hover:text-red-300 rounded-full transition-all shrink-0 text-white/70 flex items-center justify-center cursor-pointer ml-1"
                  title="Clear delivery location"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Header controls drawer / search / cart buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
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

              {/* AI Recipe Planner Desktop Link */}
              <button
                type="button"
                onClick={() => setActiveTab('ai-planner')}
                className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer text-xs font-black uppercase ${
                  activeTab === 'ai-planner' ? 'bg-yellow-400 text-slate-900 shadow-sm border-transparent' : 'text-white hover:bg-emerald-555 hover:text-yellow-100 border border-emerald-400/20'
                }`}
                title="AI Recipe Intelligent Shopper"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse fill-current" />
                <span>AI Chef Planner</span>
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
                className={`p-2.5 rounded-xl transition cursor-pointer relative ${
                  activeTab === 'wishlist' ? 'bg-emerald-700 text-white shadow-inner' : 'hover:bg-emerald-500'
                }`}
                title="My Saved Wishlist"
              >
                <Heart className="w-5 h-5 text-white fill-current" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-black text-[9.5px]">
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Customer Notification Center Bell Button with unread indicator badge */}
              <button
                type="button"
                onClick={() => {
                  setShowNotificationCenter(true);
                  fetchCustomerNotifications();
                }}
                className={`p-2.5 rounded-xl transition cursor-pointer relative ${
                  showNotificationCenter ? 'bg-emerald-700 text-white shadow-inner' : 'hover:bg-emerald-500 hover:text-yellow-105'
                }`}
                title="Open Notification Inbox"
              >
                <Bell className="w-5 h-5 text-white" />
                {customerNotifications.some(n => !n.isRead) && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 border border-emerald-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-black text-[9.5px] animate-bounce">
                    {customerNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Scan on Mobile QR option */}
              <button
                onClick={() => setShowMobileQrModal(true)}
                className="p-2.5 rounded-xl bg-emerald-700/50 hover:bg-emerald-700/80 hover:text-yellow-300 transition relative cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase text-white border border-emerald-500/25"
                title="Open link on other phone / QR Code"
              >
                <QrCode className="w-5 h-5 text-yellow-300 animate-pulse-subtle" />
                <span className="hidden lg:inline text-[9.5px] tracking-wider">Open on Phone</span>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setActiveTab('cart')}
                className="bg-white text-emerald-950 rounded-2xl px-4.5 py-2.5 font-black text-xs flex items-center gap-2 hover:bg-emerald-50 active:scale-95 transition relative cursor-pointer shadow-md"
              >
                <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
                <span className="hidden sm:inline font-sans">
                  {cart.length > 0 ? `${cart.length} Items - ₹${automaticTotal}` : 'Empty Basket'}
                </span>
                <span className="sm:hidden font-mono font-black">₹{automaticTotal}</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] animate-pulse">
                    {cart.reduce((s,i)=> s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Input bar (comfortably 52-56px tall, rounded and shadow) */}
          <div className="mt-6 relative w-full px-0.5">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder='Search for organic bananas, fresh butter, shimla apples, instant cookies...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 bg-white text-slate-800 placeholder-slate-400 font-semibold text-sm rounded-2xl pl-12 pr-16 shadow-lg border border-slate-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600 uppercase hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition"
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
            
            {/* Premium 10-Minute Instant Delivery Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 rounded-[28px] p-4 border border-emerald-500/10 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md shrink-0 flex items-center justify-center animate-pulse">
                  <Bike className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Guaranteed 10-Min Super Express</span>
                  </div>
                  <h3 className="font-sans font-black text-sm text-white mt-0.5 uppercase tracking-tight">Express Delivery Active In Your Sector!</h3>
                  <p className="text-[11px] text-slate-300 font-semibold leading-none mt-1">
                    Delivering hot snacks, dairy, fresh pet care or cold beverages in <span className="text-yellow-300 font-bold">8 to 11 minutes max</span>.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 relative z-10 sm:self-center border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Dark Store Status</span>
                  <span className="text-xs text-emerald-400 font-black uppercase font-mono font-bold">● LIVE & PACKING</span>
                </div>
                <div className="w-[1px] h-8 bg-slate-800 hidden sm:block mx-2"></div>
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase leading-none tracking-tight font-mono">
                  ⚡️ 100% On-Time
                </div>
              </div>
            </div>

            {/* Unbeatable Offers & Discount Coupons Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎁</span>
                  <div>
                    <h2 className="font-display text-xs font-black tracking-tight text-slate-800 uppercase leading-none text-left">Exclusive Offers & Promotions</h2>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5 text-left font-mono">Apply these coupons at your secure checkout</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {[
                  { code: 'FAST50', label: 'Flat ₹50 OFF', desc: 'On orders above ₹199 of fruits & dairy staples.', color: 'from-amber-500/5 to-orange-500/5 border-amber-500/20 text-amber-800', badgeColor: 'bg-amber-500 text-white' },
                  { code: 'FREESHIP', label: 'Free Delivery Waiver', desc: 'Add items worth ₹150 or more to get free express shipping.', color: 'from-emerald-500/5 to-teal-500/5 border-emerald-500/20 text-emerald-800', badgeColor: 'bg-emerald-500 text-white' },
                  { code: 'PETLOVE', label: 'Pet Care Super discount', desc: 'Flat 15% OFF on all premium Pet Care treats & essentials.', color: 'from-rose-500/5 to-pink-500/5 border-rose-500/20 text-rose-800', badgeColor: 'bg-rose-500 text-white' }
                ].map((promo) => (
                  <div
                    key={promo.code}
                    className={`bg-gradient-to-r ${promo.color} border border-slate-100 rounded-[22px] p-4 flex items-center justify-between gap-3 shadow-xs hover:scale-[1.01] transition-transform duration-200 text-left`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${promo.badgeColor} font-mono`}>
                          {promo.code}
                        </span>
                        <h4 className="font-sans font-black text-xs text-slate-800">{promo.label}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                        {promo.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(promo.code);
                        triggerPushNotification("Coupon Copied 📋", `Code "${promo.code}" applied to clipboard! Paste at checkout.`, "promo");
                      }}
                      className="bg-white/95 hover:bg-white text-slate-800 text-[9px] font-black px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer border border-slate-100 uppercase tracking-tight shrink-0 transition"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
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
                    <span>{Math.round(Math.min(100, (subtotal / 150) * 105))}% Checked</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* NEW: QUICK COOK RECIPE COMBOS / POPULAR FREQUENTLY BOUGHT BUNDLES */}
            <div className="bg-slate-50/50 rounded-[32px] p-5.5 border border-slate-150 shadow-3xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-left flex items-start gap-2">
                  <span className="text-lg">🧑‍🍳</span>
                  <div>
                    <h3 className="font-display text-xs font-black tracking-widest text-slate-800 uppercase flex items-center gap-1.5">
                      1-Click Recipe Combos
                      <span className="bg-rose-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded animate-pulse tracking-wide">Instant Pack</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Frequently bought together culinary packs. Add complete raw ingredients straight into your basket in one press!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-sans">
                {[
                  {
                    id: 'bundle-chai',
                    name: 'Perfect Evening Chai Pack',
                    tag: '☕ Steady Brew',
                    desc: 'Fresh milk paired with rich salted table butter and crunchy morning biscuits.',
                    searchTerms: ['milk', 'butter', 'cookies', 'biscuits'],
                    priceRange: '₹140',
                    color: 'from-amber-50 to-orange-50/30 border-amber-100/80 hover:border-amber-250',
                    iconBg: 'bg-amber-100 text-amber-800',
                  },
                  {
                    id: 'bundle-pasta',
                    name: 'Fast Tomato Noodles Combo',
                    tag: '🍝 Spicy Tang',
                    desc: 'Hot instant noodles paired with farm fresh organic red tomatoes.',
                    searchTerms: ['noodles', 'tomatoes', 'tomato'],
                    priceRange: '₹95',
                    color: 'from-red-50 to-rose-50/30 border-red-100/80 hover:border-red-250',
                    iconBg: 'bg-red-100 text-red-800',
                  },
                  {
                    id: 'bundle-breakfast',
                    name: 'Healthy Morning Setup',
                    tag: '🍌 Smart Start',
                    desc: 'Farm fresh toned milk paired with sweet local yellow bananas.',
                    searchTerms: ['milk', 'bananas', 'banana'],
                    priceRange: '₹120',
                    color: 'from-emerald-50 to-teal-50/30 border-emerald-100/80 hover:border-emerald-250',
                    iconBg: 'bg-emerald-100 text-emerald-800',
                  }
                ].map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`bg-linear-to-b ${recipe.color} border rounded-3xl p-4.5 flex flex-col justify-between shadow-3xs transition hover:shadow-xs group duration-300 relative overflow-hidden`}
                  >
                    <div className="space-y-2 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${recipe.iconBg}`}>
                          {recipe.tag}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 font-mono">
                          {recipe.priceRange}
                        </span>
                      </div>
                      
                      <h4 className="font-display font-black text-xs text-slate-800 group-hover:text-emerald-700 transition">
                        {recipe.name}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 leading-snug font-medium font-sans">
                        {recipe.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Find matching available products in current products list
                        const matched = products.filter(p => 
                          recipe.searchTerms.some(term => p.name.toLowerCase().includes(term))
                        ).slice(0, 3);

                        if (matched.length === 0) {
                          triggerPushNotification(
                            "Recipe Unavailable", 
                            "Could not find matching ingredients in the dark store presently.", 
                            "warning"
                          );
                          return;
                        }

                        // Add matching to cart
                        matched.forEach(p => handleAddToCart(p));
                        triggerPushNotification(
                          "Combo Added! 🛒",
                          `Added ingredients for "${recipe.name}" straight to your cart.`,
                          "success"
                        );
                      }}
                      className="mt-4 w-full py-2 bg-white/95 group-hover:bg-emerald-600 group-hover:text-white border border-slate-200/80 group-hover:border-emerald-600 rounded-xl font-bold text-[10px] group-hover:shadow hover:scale-[1.02] active:scale-95 text-slate-700 transition cursor-pointer text-center uppercase tracking-wider"
                    >
                      Instant Add Combo
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Shop by Category Bento */}
            <div className="py-6 sm:py-8 border-t border-b border-slate-100/85 my-6 sm:my-8 bg-white/30 backdrop-blur-xs rounded-[32px] px-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="flex justify-between items-center mb-4.5 px-1">
                <div>
                  <h2 className="font-display text-xs font-black tracking-widest text-slate-400 uppercase">Shop by category</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Handpicked premium grocery segments</p>
                </div>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-emerald-600 font-extrabold hover:underline cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg"
                  >
                    Reset Grid
                  </button>
                )}
              </div>
              
              {isShimmering ? (
                renderShimmerCategorySkeleton()
              ) : (
                <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-none sm:grid sm:grid-cols-4 md:grid-cols-8 sm:pb-0 w-full select-none pl-1">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(isSelected ? null : cat.id);
                          setActiveTab('categories'); // Shift viewport directly
                        }}
                        className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-sm cursor-pointer border group shrink-0 w-24 sm:w-auto ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/10 scale-95 shadow-inner'
                            : 'border-slate-100 bg-white shadow-xs hover:border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.01)]'
                        }`}
                      >
                        <div className={`p-3 rounded-2xl ${cat.color} mb-2.5 flex items-center justify-center transition group-hover:rotate-6 shadow-sm`}>
                          {getCategoryIcon(cat.icon)}
                        </div>
                        <span className="text-[10px] sm:text-xs font-black text-slate-800 leading-tight truncate w-full uppercase tracking-tight">
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
                  {products.filter(p => p.isTrending).map((p) => renderBlinkitProductCard(p, true))}
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
                    {filteredProducts.map((p) => renderBlinkitProductCard(p, false))}
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
                        {products.filter(p => p.isRecommended).map((p) => renderBlinkitProductCard(p, true))}
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
                <span>{selectedCategory === 'restaurants' ? 'Infographic Blueprint Loaded' : `${filteredProducts.length} items refilled`}</span>
              </div>

              {selectedCategory === 'restaurants' ? (
                <div className="mt-2">
                  <RestaurantCustomerFlow 
                    cart={cart}
                    handleAddToCart={handleAddToCart}
                    handleRemoveFromCart={handleRemoveFromCart}
                    getProductQuantity={getProductQuantity}
                  />
                </div>
              ) : selectedCategory === 'tiffin' ? (
                <div className="mt-2">
                  <TiffinCustomerFlow 
                    cart={cart}
                    handleAddToCart={handleAddToCart}
                    handleRemoveFromCart={handleRemoveFromCart}
                    getProductQuantity={getProductQuantity}
                  />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <XCircle className="w-10 h-10 mx-auto" />
                  <p className="font-bold">No grocery packs listed in this shelf.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {filteredProducts.map((p) => renderBlinkitProductCard(p, false))}
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
                        <div className="flex items-center justify-between border border-emerald-500 bg-emerald-50 text-emerald-700 rounded-xl w-24 h-9 font-black">
                          <button
                            onClick={() => handleRemoveFromCart(selectedProductDetails.id, activeModalVariant)}
                            className="w-8 h-full flex items-center justify-center hover:bg-emerald-100 transition cursor-pointer text-sm"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="font-black text-xs font-sans text-emerald-850 select-none">{modalQty}</span>
                          <button
                            onClick={() => handleAddToCart(selectedProductDetails, activeModalVariant)}
                            className="w-8 h-full flex items-center justify-center hover:bg-emerald-100 transition cursor-pointer text-sm"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(selectedProductDetails, activeModalVariant)}
                          className="border border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 text-xs font-black px-8 py-2 rounded-xl transition duration-150 active:scale-95 cursor-pointer shadow-xs uppercase font-sans h-9"
                        >
                          ADD
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
            deliveryInstructions={deliveryInstructions}
            setDeliveryInstructions={setDeliveryInstructions}
          />
        )}

        {/* VIEW 6.5: THE FULL BLINKIT-STYLE MOBILE-FIRST CART PAGE */}
        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto space-y-4 text-left animate-fade-in pb-24">
            {/* Header controls back */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100 shadow-sm animate-fade-in">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-700 font-extrabold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Keep Shopping
              </button>
              <h1 className="text-xs font-black text-slate-800 uppercase tracking-wiest">My Daily Mart Cart</h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-black font-mono">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-3xs">
                <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto animate-bounce-subtle" />
                <p className="font-extrabold text-slate-600 text-sm">Your basket is empty</p>
                <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                  Add fresh organic greens, dairy treats, bakery delights, or daily essentials to experience 10-minutes delivery!
                </p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-95"
                >
                  Start Adding items
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                  <div className="p-4 bg-slate-50/55 flex justify-between items-center border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Basket Itemization</p>
                    <button
                      onClick={() => {
                        setCart([]);
                        triggerPushNotification("Cart Cleared", "All items have been removed.", "info");
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-black uppercase tracking-wider cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  {cart.map((item) => {
                    const matchedVariant = item.selectedVariant || (item.product.variants && item.product.variants[0]) || item.product.unit;
                    const itemQty = item.quantity;
                    const itemSubtotal = item.product.price * itemQty;
                    return (
                      <div
                        key={`${item.product.id}-${matchedVariant}`}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/10 transition duration-155"
                      >
                        {/* Left Info: Product info, image, seller */}
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-100 p-1.5 shrink-0 flex items-center justify-center">
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Seller: {item.product.sellerName || "DarkStore Base #4"}
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm line-clamp-1 mt-1">{item.product.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              Option: <span className="text-slate-600 font-bold font-mono">{matchedVariant}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Quantity button + Subtotal & Trash */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold font-mono">₹{item.product.price} each</span>
                            
                            <div className="flex items-center justify-between border border-emerald-500 bg-emerald-50 text-emerald-700 rounded-xl w-18 h-7.5 font-black">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.product.id, matchedVariant)}
                                className="w-6 h-full flex items-center justify-center hover:bg-emerald-100 transition cursor-pointer text-xs"
                              >
                                <Minus className="w-2.5 h-2.5 stroke-[3]" />
                              </button>
                              <span className="font-black text-xs font-sans text-emerald-800 select-none">{itemQty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(item.product, matchedVariant)}
                                className="w-6 h-full flex items-center justify-center hover:bg-emerald-100 transition cursor-pointer text-xs"
                                disabled={itemQty >= item.product.stock}
                              >
                                <Plus className="w-2.5 h-2.5 stroke-[3]" />
                              </button>
                            </div>
                          </div>

                          <div className="text-right min-w-[70px]">
                            <p className="text-[9px] text-slate-400 uppercase leading-none font-bold">Subtotal</p>
                            <p className="font-black text-slate-800 font-mono mt-1 text-xs">₹{itemSubtotal}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCart(cart.filter(c => !(c.product.id === item.product.id && c.selectedVariant === item.selectedVariant)));
                                triggerPushNotification("Removed Item", `${item.product.name} deleted.`, "info");
                              }}
                              className="text-[10px] text-rose-500 hover:text-rose-600 font-black uppercase mt-1 inline-block hover:underline cursor-pointer"
                            >
                              Trash Item
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Pinpoint info block */}
                <div className="p-4 bg-yellow-50/75 border border-yellow-200 rounded-3xl flex items-start gap-3">
                  <span className="text-lg">🛵</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black text-yellow-800 uppercase tracking-wide">Express Dropping Address</p>
                    <p className="text-slate-600 text-[11px] font-semibold leading-relaxed">
                      📍 {deliveryAddress || "Mahabubabad, Telangana Hub"}
                    </p>
                    <button
                      onClick={() => setActiveTab('addresses')}
                      className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block hover:underline cursor-pointer"
                    >
                      Change Drop Destination
                    </button>
                  </div>
                </div>

                {/* Specific Delivery Instructions Input */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivery Instructions for Rider (e.g. Leave at Gate) 🛵:</span>
                  <input
                    type="text"
                    id="cart-page-delivery-instructions"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="e.g. Leave at gate, ring doorbell, call upon arrival"
                    className="w-full bg-slate-50 text-slate-800 p-3 rounded-2xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none leading-normal font-medium"
                  />
                </div>

                {/* Billing Summary Details */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <h4 className="font-black text-slate-700 text-xs pb-2 border-b border-slate-100 uppercase tracking-wider">Estimated Invoice Bill</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Product Basket Subtotal:</span>
                    <span className="font-mono text-slate-700 font-bold">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">Express Delivery Charge:</span>
                    <span className="font-mono text-slate-700 font-bold">
                      {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE 🛵'}
                    </span>
                  </div>
                  {automaticDiscount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-605 text-emerald-600 font-bold">
                      <span>Automatic Applied Coupon Discount:</span>
                      <span className="font-mono">-₹{automaticDiscount}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1"></div>
                  <div className="flex justify-between font-black text-sm text-slate-800">
                    <span>Grand Total Checklist:</span>
                    <span className="font-mono text-emerald-700 font-extrabold">₹{automaticTotal}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm">
                  <button
                    onClick={() => {
                      setActiveTab('checkout');
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex justify-between items-center px-4 shadow-md transition active:scale-95 duration-100 text-xs cursor-pointer"
                  >
                    <span className="uppercase tracking-wider">Select Payment & Order Instant</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span>₹{automaticTotal}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <div className="space-y-4 animate-fade-in text-left pb-20">
            {/* Page Header */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex justify-between items-center">
              <div>
                <h1 className="text-sm font-black text-slate-800 uppercase tracking-wide">My Grocery Orders</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Express 10-minutes delivery logs</p>
              </div>
              <span className="text-[10px] bg-slate-100 px-2.5 py-1 font-mono text-slate-500 font-extrabold rounded-lg">Verified: {orders.length}</span>
            </div>

            {/* Quick Filter tabs for Blinkit Statuses */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-150/15 border border-slate-150/40 rounded-2xl">
              {([
                { id: 'all', label: 'All', icon: '📋' },
                { id: 'pending', label: 'Pending', icon: '⏳' },
                { id: 'packed', label: 'Packed', icon: '📦' },
                { id: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
                { id: 'delivered', label: 'Delivered', icon: '✅' },
                { id: 'tiffin', label: 'Tiffin', icon: '🍱' }
              ] as const).map((tab) => {
                const getFilteredLength = () => {
                  if (tab.id === 'all') return orders.length;
                  if (tab.id === 'pending') return orders.filter(o => o.status === 'placed').length;
                  if (tab.id === 'packed') return orders.filter(o => o.status === 'confirmed').length;
                  if (tab.id === 'out_for_delivery') return orders.filter(o => o.status === 'dispatched').length;
                  if (tab.id === 'delivered') return orders.filter(o => o.status === 'delivered').length;
                  if (tab.id === 'tiffin') return orders.filter(o => o.items.some(item => item.product?.category === 'tiffin')).length;
                  return 0;
                };

                const isSelected = orderFilterType === tab.id;
                const count = getFilteredLength();

                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderFilterType(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10.5px] font-black transition cursor-pointer select-none leading-none ${
                      isSelected 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className={`text-[9px] px-1 font-mono rounded ${isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200/60 text-slate-600'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Rendered List */}
            {(() => {
              const currentFilteredOrders = orders.filter((o) => {
                if (orderFilterType === 'all') return true;
                if (orderFilterType === 'pending') return o.status === 'placed';
                if (orderFilterType === 'packed') return o.status === 'confirmed';
                if (orderFilterType === 'out_for_delivery') return o.status === 'dispatched';
                if (orderFilterType === 'delivered') return o.status === 'delivered';
                if (orderFilterType === 'tiffin') return o.items.some(item => item.product?.category === 'tiffin');
                return true;
              });

              if (currentFilteredOrders.length === 0) {
                return (
                  <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-100 shadow-3xs space-y-3">
                    <Package className="w-10 h-10 text-slate-300 mx-auto animate-bounce-subtle" />
                    <p className="text-slate-500 font-extrabold text-xs uppercase tracking-wide">No orders listed under {orderFilterType.toUpperCase()}</p>
                    <p className="text-slate-400 text-[10.5px] max-w-xs mx-auto leading-relaxed">
                      If you have placed an order, try changing status filters above to locate it, or checkout from your current shopping list.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 animate-fade-in">
                  {currentFilteredOrders.map((o) => {
                    return (
                      <div
                        key={o.id}
                        onClick={() => { setActiveTrackOrder(o); setActiveTab('live-tracking'); }}
                        className="p-4 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-250/20 rounded-3xl shadow-3xs hover:shadow-2xs transition duration-150 cursor-pointer text-left flex justify-between items-center gap-4 group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800 font-mono">ORDER #{o.id}</span>
                            <span className={`text-[9px] font-black uppercase rounded-lg px-2 py-0.5 border ${
                              o.status === 'delivered' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                              o.status === 'dispatched' ? 'bg-indigo-50 text-indigo-700 border-indigo-150/40 animate-pulse' :
                              o.status === 'confirmed' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                              'bg-yellow-50 text-yellow-800 border-yellow-200 animate-pulse'
                            }`}>
                              {o.status === 'placed' ? '⏳ Pending' :
                               o.status === 'confirmed' ? '📦 Packed' :
                               o.status === 'dispatched' ? '🛵 Out' :
                               '✅ Delivered'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-705 text-slate-700 font-extrabold truncate max-w-md">
                            {o.items.map(item => `${item.product?.name || 'Bulk Item'} (x${item.quantity})`).join(', ')}
                          </p>
                          
                          <p className="text-[10px] text-slate-400 font-medium">
                            Placed {new Date(o.createdAt).toLocaleString()} • Drop address: <span className="font-bold text-slate-650 text-slate-605 truncate">{o.address}</span>
                          </p>

                          {/* REAL-TIME STATUS TIMELINE BAR */}
                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex-1 min-w-0">
                            <div className="relative flex items-center justify-between px-2">
                              {/* Background Connector Bar Line */}
                              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-105 rounded-full z-0"></div>
                              
                              {/* Active Progress Line */}
                              <motion.div 
                                className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0"
                                initial={{ width: "0%" }}
                                animate={{ 
                                  width: `calc(${
                                    o.status === 'delivered' ? '100%' :
                                    o.status === 'dispatched' ? '66.6%' :
                                    o.status === 'confirmed' ? '33.3%' : '0%'
                                  } - 12px)` 
                                }}
                                transition={{ type: "spring", stiffness: 85, damping: 16 }}
                              />

                              {/* Timeline Nodes */}
                              {[
                                { key: 'placed', label: 'Pending', icon: Clock },
                                { key: 'confirmed', label: 'Packed', icon: Package },
                                { key: 'dispatched', label: 'Out', icon: Bike },
                                { key: 'delivered', label: 'Delivered', icon: CheckCircle2 }
                              ].map((step, idx) => {
                                const orderStepIndex = o.status === 'delivered' ? 3 : o.status === 'dispatched' ? 2 : o.status === 'confirmed' ? 1 : 0;
                                const isCompleted = orderStepIndex >= idx;
                                const isActive = orderStepIndex === idx;
                                const IconComponent = step.icon;

                                return (
                                  <div key={step.key} className="flex flex-col items-center relative z-10">
                                    <motion.div 
                                      initial={{ scale: 0.85 }}
                                      animate={{ 
                                        scale: isActive ? 1.12 : 1,
                                        y: isActive ? -1.5 : 0
                                      }}
                                      transition={{ 
                                        type: "spring", 
                                        stiffness: 300, 
                                        damping: 20 
                                      }}
                                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-350 relative ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100/60' 
                                          : 'bg-white border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {/* Glowing pulsator indicator behind active step */}
                                      {isActive && (
                                        <motion.span 
                                          className="absolute inset-0 rounded-full bg-emerald-500/25 z-0"
                                          animate={{ scale: [1, 1.5, 1] }}
                                          transition={{ 
                                            repeat: Infinity, 
                                            duration: 1.8, 
                                            ease: "easeInOut" 
                                          }}
                                        />
                                      )}
                                      
                                      <motion.div
                                        className="relative z-10"
                                        animate={isActive ? { rotate: [0, -8, 8, -8, 8, 0] } : {}}
                                        transition={{ 
                                          repeat: Infinity, 
                                          repeatDelay: 3,
                                          duration: 0.65,
                                          ease: "easeInOut"
                                        }}
                                      >
                                        <IconComponent className={`w-3.5 h-3.5 ${isCompleted ? 'text-white' : 'text-slate-400'}`} />
                                      </motion.div>
                                    </motion.div>
                                    
                                    <motion.span 
                                      animate={{
                                        color: isActive ? '#059669' : isCompleted ? '#334155' : '#94a3b8'
                                      }}
                                      className="text-[8px] mt-1 text-center font-bold tracking-tight uppercase font-mono"
                                    >
                                      {step.label}
                                    </motion.span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-xs text-slate-800 font-mono">₹{o.total}</div>
                          <span className="text-[9px] text-emerald-600 group-hover:underline font-black uppercase tracking-wider block mt-1.5 whitespace-nowrap">
                            {o.status === 'delivered' ? 'See Details' : 'Track live Map ➔'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        )}

        {/* VIEW 10: AI RECIPE PLANNER & INSTANT SHOPPING CART */}
        {activeTab === 'ai-planner' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-left pb-16">
            
            {/* HERO BRAND UNIT */}
            <div className="bg-gradient-to-tr from-[#111c18] to-[#04331e] rounded-3xl p-6 border border-emerald-500/25 relative overflow-hidden text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="space-y-2 relative z-10">
                <div className="bg-yellow-400 text-slate-900 border border-yellow-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full w-max flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 fill-current animate-spin" />
                  <span>Powered by Gemini 3.5</span>
                </div>
                <h2 className="font-display font-black text-2xl tracking-tight">
                  Daily<span className="text-emerald-400">Mart</span> AI Chef & Recipe Copilot
                </h2>
                <p className="text-xs text-emerald-100 font-semibold max-w-lg">
                  Craving something gourmet in 10 minutes? Type any meal. The AI details the precise recipe and dynamically matches ingredients against real darkstore inventory for instant 1-click delivery.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 text-center relative z-10 w-full md:w-auto font-mono">
                <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Kitchen Status</div>
                <div className="text-base font-black text-white mt-1">● READY TO COOK</div>
                <span className="text-[9.5px] text-slate-400 block mt-1">Telangana Hub Cluster MBD</span>
              </div>
            </div>

            {/* AI CONTROLLER BOARD */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
              
              {/* Recipe prompt input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block font-sans">
                  What would you like to cook?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipePrompt}
                    onChange={(e) => setRecipePrompt(e.target.value)}
                    placeholder="Enter dish, e.g., Paneer Butter Masala, Organic Fruit Salad, Oatmeal with Bananas..."
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 font-semibold text-xs rounded-xl pl-4 pr-12 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {recipePrompt && (
                      <button 
                        onClick={() => setRecipePrompt('')}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Scale selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block font-sans">
                    Servings Scale
                  </label>
                  <div className="flex gap-2">
                    {['1 person', '2-3 people', '4-5 people'].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setRecipePeopleCount(scale)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition capitalize cursor-pointer ${
                          recipePeopleCount === scale
                            ? 'bg-emerald-50 text-emerald-850 border-emerald-300'
                            : 'bg-slate-50 text-slate-600 border-slate-205 hover:bg-slate-100'
                        }`}
                      >
                        {scale}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Trigger Action */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => runRecipePlanner()}
                    disabled={recipePlannerLoading || !recipePrompt.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase"
                  >
                    {recipePlannerLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Prepping Recipe...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300 fill-current animate-pulse" />
                        <span>✨ Command AI Kitchen</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Suggestion Quick Tags */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Quick Culinary Inspiration Ideas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Creamy Paneer Butter Masala 🍛', query: 'Paneer Butter Masala' },
                    { label: 'Organic Banana Milkshake 🍌', query: 'Organic healthy banana milkshake' },
                    { label: 'Cozy Vegetable Soup 🍲', query: 'Warm healthy farmhouse vegetable soup' },
                    { label: 'Sweet Keto Fruit Custard 🍓', query: 'Keto friendly fruit salad sweet custard' },
                    { label: 'Instant Chocolate Microwave Muffin 🍪', query: '10-minute chocolate muffin' }
                  ].map((tag) => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => {
                        setRecipePrompt(tag.query);
                        runRecipePlanner(tag.query);
                      }}
                      className="px-3.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95 flex items-center gap-1"
                    >
                      <span>💡</span>
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* LOADING AND ERROR ANCHORS */}
            {recipePlannerError && (
              <div className="bg-rose-50 border border-rose-105 p-4 rounded-2xl flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="font-extrabold text-xs text-rose-800">Chef Module Halt</h4>
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">{recipePlannerError}</p>
                </div>
              </div>
            )}

            {recipePlannerLoading && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xs text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto animate-bounce border border-emerald-110">
                  <Soup className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-800 animate-pulse">Consulting the Culinary Oracle...</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Gemini is designing a structured blueprint for <span className="text-emerald-600 font-bold">"{recipePrompt}"</span> and cross-referencing available darkstore groceries. This process takes 3-4 seconds.
                  </p>
                </div>
                
                {/* Simulated micro logging */}
                <div className="bg-slate-950 text-emerald-400 font-mono text-[9px] p-3 rounded-xl max-w-xs mx-auto text-left space-y-1 shadow-inner border border-slate-900">
                  <div className="animate-pulse">⚡ INITIALIZE_RECIPE_ENGINE</div>
                  <div>📡 CONTACTING_GEMINI_3.5_FLASH</div>
                  <div className="text-amber-400 animate-pulse">🔍 GRID_LOCATING: "{(recipePrompt || 'grocery').toLowerCase()}"</div>
                  <div className="text-slate-500">⏳ PARSING_DATABASE_INVENTORY_TAGGED_OK</div>
                </div>
              </div>
            )}

            {/* RECIPE DASHBOARD */}
            {!recipePlannerLoading && generatedRecipe && (
              <div className="space-y-6">
                
                {/* 1. GOURMET METADATA HEADER */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{generatedRecipe.prepTime || '20 Mins'}</span>
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full capitalize">
                      ⭐ {generatedRecipe.difficulty || 'Easy'}
                    </span>
                    {generatedRecipe.nutritionSummary && (
                      <span className="bg-slate-150 text-slate-700 text-[10px] font-extrabold tracking-tight px-2.5 py-0.5 rounded-full">
                        🍃 {generatedRecipe.nutritionSummary}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                      {generatedRecipe.recipeName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {generatedRecipe.description}
                    </p>
                  </div>
                </div>

                {/* 2. DYNAMIC DARKSTORE GROCERY RACK */}
                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-5 text-left">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-105 pb-4">
                    <div>
                      <h3 className="font-sans font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1">
                        🛒 Ingredients & Smart Grocery Rack
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        These fresh items matched successfully against live Darkstore inventory.
                      </p>
                    </div>

                    {/* Dynamic checkout shortcut */}
                    {generatedRecipe.ingredients?.some((ing: any) => ing.matchedProducts?.length > 0) && (() => {
                      // Calculate all matching items that can be auto-added
                      const matchedList = generatedRecipe.ingredients
                        .map((ing: any) => ing.matchedProducts?.[0])
                        .filter(Boolean);
                      
                      const matchedCount = matchedList.length;
                      const matchedPrice = matchedList.reduce((sum: number, p: any) => sum + p.price, 0);

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            matchedList.forEach((prod: any) => {
                              const existingIdx = cart.findIndex((item) => item.product.id === prod.id);
                              if (existingIdx !== -1) {
                                const updatedCart = [...cart];
                                updatedCart[existingIdx].quantity += 1;
                                setCart(updatedCart);
                              } else {
                                setCart(prev => [...prev, { product: prod, quantity: 1 }]);
                              }
                            });
                            
                            triggerPushNotification('Bundle Added Successfully!', `Packed ${matchedCount} ingredients into your delivery basket.`, 'success');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-yellow-250 fill-current animate-bounce" />
                          <span>BUY ALL MATCHED GROCERIES (₹{matchedPrice})</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Grid showing Ingredients list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedRecipe.ingredients && generatedRecipe.ingredients.map((ing: any, idx: number) => {
                      const hasMatch = ing.matchedProducts && ing.matchedProducts.length > 0;
                      const matchProd = hasMatch ? ing.matchedProducts[0] : null;

                      return (
                        <div 
                          key={idx}
                          className={`rounded-2xl p-4 border transition-all ${
                            hasMatch 
                              ? 'bg-emerald-50/20 border-emerald-100 flex flex-col justify-between' 
                              : 'bg-slate-50 border-slate-100 flex flex-col justify-between'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                                STEP {idx + 1} NEED
                              </span>
                              <h4 className="font-extrabold text-xs text-slate-800 mt-0.5">{ing.name}</h4>
                              <p className="text-[11px] text-slate-500 font-bold font-mono">Qty: {ing.amount}</p>
                            </div>

                            {/* Stock badge status */}
                            {hasMatch ? (
                              <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                ✓ IN STOCK
                              </span>
                            ) : (
                              <span className="bg-slate-200 text-slate-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Substitute
                              </span>
                            )}
                          </div>

                          {/* Matching darkstore card attachment */}
                          {hasMatch && matchProd && (
                            <div className="bg-white border border-slate-100 rounded-xl p-2.5 mt-3 flex items-center gap-3 shadow-3xs hover:border-emerald-200 transition">
                              <img 
                                src={matchProd.image} 
                                alt={matchProd.name}
                                className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-50"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 text-left min-w-0">
                                <h5 className="font-extrabold text-[11px] text-slate-800 truncate">{matchProd.name}</h5>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[11px] font-black text-slate-950 font-mono">₹{matchProd.price}</span>
                                  <span className="text-[9px] text-slate-400">/ {matchProd.unit}</span>
                                </div>
                              </div>
                              
                              {/* Inline mini Buy button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const existingIdx = cart.findIndex((item) => item.product.id === matchProd.id);
                                  if (existingIdx !== -1) {
                                    const updatedCart = [...cart];
                                    updatedCart[existingIdx].quantity += 1;
                                    setCart(updatedCart);
                                  } else {
                                    setCart(prev => [...prev, { product: matchProd, quantity: 1 }]);
                                  }
                                  triggerPushNotification('Product Added!', `${matchProd.name} successfully packed into your basket.`, 'success');
                                }}
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition active:scale-95 cursor-pointer border border-emerald-100"
                                title="ADD"
                              >
                                <Plus className="w-3.5 h-3.5 font-bold" />
                              </button>
                            </div>
                          )}

                          {!hasMatch && (
                            <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed italic">
                              No identical match listed. You can substitute this ingredient with common pantry stock items.
                            </p>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* 3. STEP BY STEP COOKING INSTRUCTIONS */}
                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm text-left space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-sans font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1">
                      🍳 Step-by-Step Cooking Directives
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Follow these professional chef directives to organize and prepare your dish.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {generatedRecipe.steps && generatedRecipe.steps.map((step: string, sIdx: number) => (
                      <div 
                        key={sIdx}
                        className="flex gap-3.5 items-start bg-slate-50/50 p-3 rounded-2xl border border-slate-50"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-[#00A86B] text-xs font-black flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed pt-0.5">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Elegant wrap banner */}
                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 text-center text-xs text-amber-900 mt-4">
                    <span className="font-extrabold flex items-center justify-center gap-1.5 font-mono">
                      👩‍🍳 CHEF PRO TIP:
                    </span>
                    <p className="text-[11px] text-amber-800 font-medium mt-1 leading-relaxed max-w-xl mx-auto font-sans">
                      "Always prep your ingredients (mise en place) before turning on the heat. With Daily Mart 10-minute instant delivery options, everything arrives ice-fresh just before you prep!"
                    </p>
                  </div>

                </div>

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

                {/* SUPABASE STATUS CARD (Disabled) */}
                {false && (
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
                )}

                {/* 2. DIGITAL WALLET CARD (Configured Offline) */}
                {false && (
                  <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-500 animate-pulse" /> Daily Mart Digital Vault
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
                )}

                {/* Ledger History Drawer or list */}
                {false && userProfile.walletTransactions && userProfile.walletTransactions.length > 0 && (
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
                      { label: 'To Pay', count: orders.filter(o => (o.status as string) === 'pending').length, status: 'pending', icon: '💳' },
                      { label: 'Delivering', count: orders.filter(o => ['processing', 'dispatched', 'delivered'].includes(o.status) && o.status !== 'delivered').length, status: 'delivering', icon: '🛵' },
                      { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, status: 'delivered', icon: '✅' },
                      { label: 'Cancelled', count: orders.filter(o => (o.status as string) === 'cancelled' || o.status === 'refunded').length, status: 'cancelled', icon: '✕' }
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

                  {/* APP AUDIO SETTINGS & ALARMS */}
                  <div className="pt-3 border-t border-slate-100 mt-2 space-y-2.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="flex items-center gap-2 font-bold text-slate-700 text-[11px]">
                        <span>🔔</span> Notification Sounds
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !notifSound;
                          setNotifSound(nextVal);
                          try {
                            localStorage.setItem('customer_sound_enabled', String(nextVal));
                          } catch (e) {}
                        }}
                        className={`px-3 py-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer ${
                          notifSound 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {notifSound ? 'ENABLED 🔊' : 'MUTED 🔇'}
                      </button>
                    </div>

                    <div className="flex gap-2 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          playOrderPlacedSound();
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-[9.5px] font-black flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                      >
                        TEST SUCCESS CHIME 🎵
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playNotificationPopSound();
                        }}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-[9.5px] font-black flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition cursor-pointer"
                      >
                        TEST POP CHIME 🔔
                      </button>
                    </div>
                  </div>





                </div>

                {/* 4.5 LEGAL & COMPLIANCE SECTION */}
                <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-3xs space-y-2 text-xs">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mr-2 border-b border-slate-50 pb-1.5 mb-2.5">Legal & Compliance</h4>
                  
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/privacy');
                      window.dispatchEvent(new Event('popstate'));
                    }}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>🔒</span> Privacy Policy</span>
                    <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold uppercase">Google Play Okay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/terms');
                      window.dispatchEvent(new Event('popstate'));
                    }}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>📜</span> Terms & Conditions</span>
                    <span className="text-[9px] font-mono text-slate-450 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">User Agreement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/refunds');
                      window.dispatchEvent(new Event('popstate'));
                    }}
                    className="w-full text-left py-2.5 px-3 hover:bg-slate-50 rounded-2xl transition flex justify-between items-center font-bold text-slate-700 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><span>🔄</span> Refund & Cancellation</span>
                    <span className="text-[9px] font-mono text-slate-450 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">Policy Rules</span>
                  </button>
                </div>

                 {/* ======================================================== */}
                {/* FCM PUSH NOTIFICATIONS & SUBSCRIPTIONS PANEL */}
                {/* ======================================================== */}


                {/* 5. BUSINESS & PARTNER ACCESS SECTION - SELLER, RIDER, ADMIN */}
                {userProfile?.role && userProfile.role !== 'customer' ? (
                  <div className="bg-gradient-to-tr from-emerald-50/75 to-teal-50/60 rounded-[32px] p-5 border border-emerald-100/70 shadow-3xs space-y-4">
                    <div className="text-left space-y-1">
                      <h4 className="text-[11px] font-black uppercase text-[#00875A] tracking-wider flex items-center gap-1">
                        <span>🛡️</span> Partner Workspaces
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed font-sans">
                        Authorized partner terminal discovered. Access your administrative workspace.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Option A: Admin Dashboard (Only if admin) */}
                      {userProfile.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('admin')}
                          className="w-full bg-white hover:bg-slate-50 border border-slate-100 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs animate-fade-in"
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
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Launch</span>
                        </button>
                      )}

                      {/* Option B: Seller Dashboard (Only if seller) */}
                      {userProfile.role === 'seller' && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('seller')}
                          className="w-full bg-white hover:bg-[#F5FFF8] border border-slate-100 hover:border-[#00875A]/20 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs animate-fade-in"
                        >
                          <div className="flex gap-3 items-center text-left">
                            <div className="bg-[#00A86B]/10 text-[#00A86B] w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                              🏪
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-slate-800">Enter Seller Partner Workspace</p>
                              <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight font-sans">Publish catalog, manage pricing, review payouts</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#00A86B] shrink-0 animate-bounce-right" />
                        </button>
                      )}

                      {/* Option C: Rider Dashboard (Only if rider) */}
                      {userProfile.role === 'rider' && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('rider')}
                          className="w-full bg-white hover:bg-[#F5FFF8] border border-slate-100 hover:border-[#00875A]/20 p-3.5 rounded-2xl transition-all hover:translate-x-0.5 flex justify-between items-center cursor-pointer shadow-3xs animate-fade-in"
                        >
                          <div className="flex gap-3 items-center text-left">
                            <div className="bg-sky-50 text-sky-600 w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                              🛵
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-slate-800">Enter Delivery Terminal</p>
                              <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight font-sans">Accept rider orders, get live routes, earn tips</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#00A86B] shrink-0 animate-bounce-right" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-tr from-emerald-50/75 to-teal-50/60 rounded-[32px] p-5 border border-emerald-100/70 shadow-3xs space-y-4">
                    <div className="text-left space-y-1">
                      <h4 className="text-[11px] font-black uppercase text-[#00875A] tracking-wider flex items-center gap-1">
                        <span>🏪</span> Become a Business Partner
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed font-sans">
                        Apply to sell fresh produce or join as an express courier.
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
                    </div>
                  </div>
                )}

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
                {onboardingView === 'seller' && (() => {
                  const pendingReq = myRoleRequests.find(r => r.targetRole === 'seller' && r.status === 'pending');
                  const approvedReq = myRoleRequests.find(r => r.targetRole === 'seller' && r.status === 'approved');
                  const rejectedReqs = myRoleRequests.filter(r => r.targetRole === 'seller' && r.status === 'rejected');
                  const latestRejected = rejectedReqs[rejectedReqs.length - 1];

                  if (pendingReq) {
                    return (
                      <div className="space-y-5 animate-fade-in text-center">
                        <span className="text-4xl block">⏳</span>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Store Application Pending Review</h3>
                        <p className="text-xs text-slate-500 font-sans leading-normal">
                          We have received your application for <b>{pendingReq.storeName}</b>. Our administrators are currently reviewing your store details.
                        </p>
                        <div className="bg-amber-100/50 border border-amber-200/50 p-4 rounded-2xl text-left space-y-1 text-xs">
                          <p className="font-extrabold text-amber-900 uppercase text-[9px] tracking-wider">Submitted Details:</p>
                          <p className="text-slate-800 font-bold">Store: <span className="font-semibold text-slate-600">{pendingReq.storeName}</span></p>
                          <p className="text-slate-805 font-bold">Location: <span className="font-semibold text-slate-600">{pendingReq.address}</span></p>
                        </div>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setOnboardingView('none')}
                            className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold transition text-xs text-center rounded-2xl cursor-pointer uppercase tracking-wider"
                          >
                            Back To Hub
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (approvedReq) {
                    return (
                      <div className="space-y-5 animate-fade-in text-center">
                        <span className="text-4xl block">🚀</span>
                        <h3 className="text-lg font-black text-emerald-950 leading-tight">Seller Account Approved!</h3>
                        <p className="text-xs text-slate-500 font-sans leading-normal">
                          Congratulations! Your store registry application for <b>{approvedReq.storeName}</b> has been approved by our administrators.
                        </p>
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
                                  targetRole: 'seller',
                                  storeName: approvedReq.storeName,
                                  address: approvedReq.address
                                })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Activation failed.');
                              
                              if (onSwitchRole) {
                                onSwitchRole('seller', data.token, data.profile);
                              }
                            } catch (err: any) {
                              setOnboardingError(err.message);
                            } finally {
                              setSwitchingRoleLoading(false);
                            }
                          }}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                        >
                          {switchingRoleLoading ? 'Activating Console...' : 'Launch Seller Control Panel Now'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      <div className="text-center space-y-2">
                        <span className="text-4xl block">🏪</span>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Become a Store Seller Partner</h3>
                        <p className="text-xs text-slate-500 leading-normal font-sans">
                          Register your local darkstore or organic grocery hub and cater to thousands of local orders.
                        </p>
                      </div>

                      {latestRejected && (
                        <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl space-y-0.5 text-xs text-left">
                          <p className="font-extrabold text-rose-800 uppercase tracking-wide text-[9px]">⚠️ Previous Application Rejected</p>
                          <p className="text-slate-655 font-bold">Reason: <span className="font-extrabold text-rose-600">{latestRejected.rejectionReason}</span></p>
                          <p className="text-[10px] text-slate-400 font-semibold pt-1">You may edit and resubmit your application credentials below.</p>
                        </div>
                      )}

                      <div className="bg-[#F5FFF8] border border-[#00A86B]/15 rounded-2xl p-4 space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase text-[#00875A] tracking-wider">Seller Program Benefits</h4>
                        <ul className="text-[10.5px] text-slate-600 font-medium space-y-1.5 list-inside text-left">
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
                            className="w-full bg-slate-55 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Store Geographical Address</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. H.No 5-2/12, Main Road, Mahabubabad, Telangana"
                            value={storeOnboardingAddress}
                            onChange={(e) => setStoreOnboardingAddress(e.target.value)}
                            className="w-full bg-slate-55 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOnboardingView('none')}
                          className="px-4 py-3 border border-slate-250 text-slate-700 bg-white hover:bg-slate-50 font-extrabold text-xs uppercase rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={switchingRoleLoading}
                          onClick={async () => {
                            const targetName = storeOnboardingName.trim();
                            const targetAddress = storeOnboardingAddress.trim();
                            if (!targetName) {
                              setOnboardingError('Store Outlet Name is required.');
                              return;
                            }
                            setSwitchingRoleLoading(true);
                            setOnboardingError('');
                            try {
                              const token = localStorage.getItem('swiftcart_jwt_token');
                              const res = await fetch('/api/role-requests', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  targetRole: 'seller',
                                  storeName: targetName,
                                  address: targetAddress || userProfile.address || 'Market Center'
                                })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Submission failed.');
                              
                              await fetchMyRoleRequests();
                            } catch (err: any) {
                              setOnboardingError(err.message);
                            } finally {
                              setSwitchingRoleLoading(false);
                            }
                          }}
                          className="flex-1 py-3.5 bg-[#00A86B] hover:bg-[#00875A] text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                        >
                          {switchingRoleLoading ? 'Submitting request...' : 'Submit Application'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Subpage B: Become a Rider */}
                {onboardingView === 'rider' && (() => {
                  const pendingReq = myRoleRequests.find(r => r.targetRole === 'rider' && r.status === 'pending');
                  const approvedReq = myRoleRequests.find(r => r.targetRole === 'rider' && r.status === 'approved');
                  const rejectedReqs = myRoleRequests.filter(r => r.targetRole === 'rider' && r.status === 'rejected');
                  const latestRejected = rejectedReqs[rejectedReqs.length - 1];

                  if (pendingReq) {
                    return (
                      <div className="space-y-5 animate-fade-in text-center">
                        <span className="text-4xl block">⏳</span>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Rider Application Pending Review</h3>
                        <p className="text-xs text-slate-500 font-sans leading-normal">
                          We have received your delivery partner application. Our administrators are currently validating your vehicle number.
                        </p>
                        <div className="bg-amber-100/50 border border-amber-200/50 p-4 rounded-2xl text-left space-y-1 text-xs font-mono">
                          <p className="font-extrabold text-amber-900 uppercase text-[9px] tracking-wider font-sans">Submitted Details:</p>
                          <p className="text-slate-800 font-bold">Applicant Name: <span className="font-semibold text-slate-650">{pendingReq.fullName || pendingReq.userName}</span></p>
                          <p className="text-slate-800 font-bold">Phone Number: <span className="font-semibold text-slate-650">{pendingReq.phoneNumber || pendingReq.userPhone}</span></p>
                          <p className="text-slate-800 font-bold">Vehicle: <span className="font-semibold text-slate-650">{pendingReq.vehicleNumber || 'Not provided'}</span></p>
                        </div>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setOnboardingView('none')}
                            className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold transition text-xs text-center rounded-2xl cursor-pointer uppercase tracking-wider"
                          >
                            Back To Hub
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (approvedReq) {
                    return (
                      <div className="space-y-5 animate-fade-in text-center">
                        <span className="text-4xl block">🛵</span>
                        <h3 className="text-lg font-black text-emerald-950 leading-tight">Rider Account Approved!</h3>
                        <p className="text-xs text-slate-500 font-sans leading-normal">
                          Congratulations! Your delivery partner application for vehicle <b>{approvedReq.vehicleNumber}</b> has been approved.
                        </p>
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
                                  targetRole: 'rider',
                                  vehicleNumber: approvedReq.vehicleNumber
                                })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Activation failed.');
                              
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
                          {switchingRoleLoading ? 'Activating Console...' : 'Launch Delivery Console Now'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5 animate-fade-in">
                      <div className="text-center space-y-2">
                        <span className="text-4xl block">🛵</span>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Become a Delivery Partner</h3>
                        <p className="text-xs text-slate-500 leading-normal font-sans">
                          Deliver groceries locally & earn pay per trip plus 100% of customer tips!
                        </p>
                      </div>

                      {latestRejected && (
                        <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl space-y-0.5 text-xs text-left">
                          <p className="font-extrabold text-rose-800 uppercase tracking-wide text-[9px]">⚠️ Previous Application Rejected</p>
                          <p className="text-slate-655 font-bold">Reason: <span className="font-extrabold text-rose-600">{latestRejected.rejectionReason}</span></p>
                          <p className="text-[10px] text-slate-400 font-semibold pt-1">You may edit and resubmit your vehicle credentials below.</p>
                        </div>
                      )}

                      <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase text-sky-750 tracking-wider font-sans">Earnings & Privileges</h4>
                        <ul className="text-[10.5px] text-slate-600 font-medium space-y-1.5 list-inside text-left">
                          <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Earn ₹50 per trip + hourly peak bonuses</li>
                          <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Weekly payouts directly with digital wallet options</li>
                          <li className="flex items-start gap-1.5"><span className="text-sky-600">✓</span> Zero deposits required to start with local riders</li>
                        </ul>
                      </div>

                      {/* Rider Application inputs */}
                      <div className="space-y-3 pt-2 text-left">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Full Name <span className="text-rose-500 font-extrabold">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="Name of Rider Applicant"
                            value={riderOnboardingName}
                            onChange={(e) => setRiderOnboardingName(e.target.value)}
                            className="w-full bg-slate-55 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Phone Number <span className="text-rose-500 font-extrabold">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="10-digit mobile number"
                            value={riderOnboardingPhone}
                            onChange={(e) => setRiderOnboardingPhone(e.target.value)}
                            className="w-full bg-slate-55 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block pl-0.5">Two-Wheeler Vehicle Plate Number (Optional but recommended)</label>
                          <input
                            type="text"
                            placeholder="e.g. DL-3S-CQ-4521"
                            value={vehicleOnboardingNumber}
                            onChange={(e) => setVehicleOnboardingNumber(e.target.value.toUpperCase())}
                            className="w-full bg-slate-55 border border-slate-200 focus:ring-1 focus:ring-[#00A86B] py-3 px-4 rounded-xl text-xs font-bold font-sans text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOnboardingView('none')}
                          className="px-4 py-3 border border-slate-250 text-slate-700 bg-white hover:bg-slate-50 font-extrabold text-xs uppercase rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={switchingRoleLoading}
                          onClick={async () => {
                            const name = riderOnboardingName.trim();
                            const phone = riderOnboardingPhone.trim();
                            const targetVeh = vehicleOnboardingNumber.trim();
                            if (!name) {
                              setOnboardingError('Full Name is required.');
                              return;
                            }
                            if (!phone) {
                              setOnboardingError('Phone Number is required.');
                              return;
                            }
                            const phoneClean = phone.replace(/[^0-9]/g, '');
                            if (phoneClean.length !== 10 || phone.length !== 10) {
                              setOnboardingError('Phone Number must contain a valid 10-digit mobile number.');
                              return;
                            }
                            setSwitchingRoleLoading(true);
                            setOnboardingError('');
                            try {
                              const token = localStorage.getItem('swiftcart_jwt_token');
                              const res = await fetch('/api/role-requests', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  targetRole: 'rider',
                                  fullName: name,
                                  phoneNumber: phone,
                                  vehicleNumber: targetVeh || undefined
                                })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Rider application failed.');
                              
                              await fetchMyRoleRequests();
                            } catch (err: any) {
                              setOnboardingError(err.message);
                            } finally {
                              setSwitchingRoleLoading(false);
                            }
                          }}
                          className="flex-1 py-3.5 bg-[#00A86B] hover:bg-[#00875A] text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95"
                        >
                          {switchingRoleLoading ? 'Submitting request...' : 'Submit Application'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

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

                  {/* Specific Delivery Instructions Input */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 text-xs text-slate-700 text-left">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Delivery Instructions for Rider 🛵</label>
                    <input
                      type="text"
                      id="cart-drawer-delivery-instructions"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="e.g. Leave at gate, call upon arrival, etc."
                      className="w-full bg-white text-slate-800 p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none leading-normal font-medium"
                    />
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

      {/* FLOATING CART SUMMARY BAR (BLINKIT-STYLE) */}
      {cart.length > 0 && activeTab !== 'cart' && activeTab !== 'checkout' && activeTab !== 'live-tracking' && (
        <div 
          onClick={() => setActiveTab('cart')}
          className="fixed bottom-16 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-2xl p-3.5 z-45 flex items-center justify-between animate-fade-in cursor-pointer border border-emerald-500/20 active:scale-98 transition-all duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700/60 p-2 rounded-xl relative shadow-inner animate-pulse-subtle">
              <ShoppingBag className="w-5 h-5 text-emerald-100" />
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-900 font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center leading-none">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="text-left font-sans">
              <p className="text-[10px] text-emerald-200 font-extrabold uppercase tracking-wide leading-none">Checkout Basket</p>
              <p className="font-extrabold text-xs sm:text-sm mt-0.5 leading-none">
                {cart.length} {cart.length === 1 ? 'item' : 'items'} • <span className="font-mono">₹{automaticTotal}</span>
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('cart');
            }}
            className="bg-white text-emerald-700 hover:bg-emerald-550 hover:bg-slate-50 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer leading-none uppercase"
          >
            <span>View Cart</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
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
            setActiveTab('ai-planner');
          }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'ai-planner' ? 'text-amber-600 font-black' : 'text-slate-400'}`}
        >
          <Sparkles className="w-5 h-5 text-amber-500 fill-current animate-pulse-subtle" />
          <span className="text-[9px]">AI Chef</span>
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

      {/* 10-MIN DAILY MART CUSTOMER NOTIFICATION CENTER SLIDE-OVER */}
      <AnimatePresence>
        {showNotificationCenter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex justify-end font-sans text-slate-800"
            onClick={() => setShowNotificationCenter(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-100 placeholder-slate-400"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-sans font-black text-slate-900 text-base tracking-tight flex items-center gap-2 uppercase">
                    Notification Center 🔔
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider">
                    Blinkit-style Instant Dispatch Alerts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotificationCenter(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Utility action options */}
              <div className="px-5 py-3 border-b border-slate-50 bg-white flex items-center justify-between text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1">
                  <span>📬</span>
                  <span>{customerNotifications.length} alerts arrived</span>
                  {customerNotifications.some(n => !n.isRead) && (
                    <span className="bg-yellow-105 text-amber-950 bg-yellow-100 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                      {customerNotifications.filter(n => !n.isRead).length} new
                    </span>
                  )}
                </div>
                {customerNotifications.some(n => !n.isRead) && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline transition cursor-pointer shrink-0 font-extrabold uppercase text-[10px]"
                  >
                    <span>✓✓</span> Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="p-3 border-b border-slate-100 flex items-center gap-1 bg-slate-50/20 overflow-x-auto shrink-0 select-none">
                <button
                  onClick={() => setActiveNotificationTab('all')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase transition shrink-0 cursor-pointer ${
                    activeNotificationTab === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveNotificationTab('order_status')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase transition shrink-0 cursor-pointer ${
                    activeNotificationTab === 'order_status' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActiveNotificationTab('promo')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase transition shrink-0 cursor-pointer ${
                    activeNotificationTab === 'promo' ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Offers
                </button>
                <button
                  onClick={() => setActiveNotificationTab('system')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase transition shrink-0 cursor-pointer ${
                    activeNotificationTab === 'system' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Alerts
                </button>
              </div>

              {/* Notifications List container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {customerNotifications.filter(n => {
                  if (activeNotificationTab === 'all') return true;
                  return n.type === activeNotificationTab;
                }).length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-3xl mb-3">📭</span>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-tight">No notifications found</p>
                    <p className="text-[10px] text-slate-400 mt-1">When we update your order or dispatch hand-picked offers, they will appear right here!</p>
                  </div>
                ) : (
                  customerNotifications.filter(n => {
                    if (activeNotificationTab === 'all') return true;
                    return n.type === activeNotificationTab;
                  }).map((item: any) => {
                    const isUnread = !item.isRead;
                    // Icon and label color pairings based on message type
                    let typeIcon = "📦";
                    let typeBadgeClass = "bg-slate-100 text-slate-700";
                    let typeLabel = "System";

                    if (item.type === 'order_status') {
                      typeIcon = "🛒";
                      typeBadgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                      typeLabel = "Order Updates";
                    } else if (item.type === 'promo') {
                      typeIcon = "🏷️";
                      typeBadgeClass = "bg-amber-50 text-amber-700 border border-amber-100";
                      typeLabel = "Hot Offer";
                    } else if (item.type === 'system') {
                      typeIcon = "🚨";
                      typeBadgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
                      typeLabel = "System Alert";
                    }

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative flex gap-3 ${
                          isUnread 
                            ? 'bg-amber-50/40 border-amber-200 shadow-3xs hover:bg-amber-50/60' 
                            : 'bg-white border-slate-150 hover:bg-slate-50'
                        }`}
                        onClick={async () => {
                          if (isUnread) {
                            await markNotificationRead(item.id);
                          }
                          // Deep Link Navigation steer
                          handleDeepLinkTransition(item.type, item.orderId);
                          setShowNotificationCenter(false);
                        }}
                      >
                        {/* Unread dot indicator */}
                        {isUnread && (
                          <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-md animate-pulse"></span>
                        )}

                        {/* Visual Icon */}
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl font-sans text-lg">
                          <span>{typeIcon}</span>
                        </div>

                        {/* Notification content */}
                        <div className="flex-1 space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${typeBadgeClass}`}>
                              {typeLabel}
                            </span>
                            {item.orderId && item.orderId !== 'none' && item.orderId !== 'promo' && (
                              <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider">
                                Order #{item.orderId.substring(0, 8)}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-black tracking-tight leading-tight ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {item.title}
                          </h4>
                          
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed break-words">
                            {item.message}
                          </p>

                          <div className="text-[9px] font-mono text-slate-400 pt-1 flex items-center justify-between">
                            <span>{new Date(item.createdAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            {item.orderId && item.orderId !== 'none' && item.orderId !== 'promo' && (
                              <span className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5">
                                Tap for details ➔
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE SCAN GENERATOR MODAL */}
      <AnimatePresence>
        {showMobileQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-slate-800"
            onClick={() => setShowMobileQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full border border-emerald-500/10 shadow-2xl relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowMobileQrModal(false)}
                className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center">
                {/* Visual smartphone + qr background header */}
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3 shadow-inner">
                  <Smartphone className="w-6 h-6 animate-bounce" />
                </div>

                <h3 className="font-sans font-black text-slate-900 text-sm tracking-tight uppercase">
                  Open App on Other Phone 📱
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono mt-0.5">
                  Instant Express Delivery Scanner
                </p>

                {/* Simulated/Verified Live URL QR code block */}
                <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-150 inline-block relative group shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      typeof window !== 'undefined'
                        ? window.location.origin 
                        : ""
                    )}`}
                    alt="Daily Mart Mobile App Link QR"
                    className="w-36 h-36 mx-auto rounded-lg object-contain bg-white p-1 transition-transform group-hover:scale-102"
                  />
                  <div className="absolute inset-x-0 bottom-2 text-center text-[7px] text-slate-400 font-black tracking-widest uppercase leading-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/90 py-0.5">
                    ● Scan To Launch
                  </div>
                </div>

                <div className="space-y-2 text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5">💡</span>
                    <p className="text-[10.5px] text-slate-600 font-semibold leading-relaxed">
                      If you're previewing in AI Studio (inside an iframe), copying the iframe URL directly won't open on other phones because it requires playground authentication.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs shrink-0 font-bold text-emerald-600">✓</span>
                    <p className="text-[10.5px] text-slate-700 font-bold leading-relaxed">
                      Simply scan this QR code with your secondary phone's camera to run the real app instantly on its screen!
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs shrink-0 font-bold text-emerald-600">✓</span>
                    <p className="text-[10.5px] text-slate-700 font-semibold leading-relaxed">
                      Test real-time Rider Location updates, secure delivery PIN verification, and instant Wallet refills directly on your phone.
                    </p>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2">
                  <div className="text-[9.5px] text-slate-400 break-all font-mono bg-white p-2 rounded-xl border border-slate-100 shadow-2xs select-all text-center leading-normal">
                    {typeof window !== 'undefined'
                      ? window.location.origin 
                      : ""
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const urlToCopy = typeof window !== 'undefined'
                        ? window.location.origin 
                        : "";
                      navigator.clipboard.writeText(urlToCopy);
                      triggerPushNotification("Link Copied! 🔗", "Web entrypoint address successfully loaded onto clipboard.", "success");
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition text-white font-extrabold text-[11px] rounded-xl cursor-pointer uppercase tracking-wider"
                  >
                    Copy Address Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING WHATSAPP BUTTON */}
      <a
        href="https://wa.me/917032865951?text=Hello%20Daily%20Mart%20Support!%20I%20have%20an%20inquiry%20regarding%20my%20order."
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 flex items-center justify-center w-12 h-12 bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group border border-emerald-400/20 cursor-pointer"
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
        </span>
        <svg 
          className="w-6.5 h-6.5 text-white" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.815.485 3.515 1.333 5.002L2 22l5.12-1.311a9.948 9.948 0 004.884 1.315C17.52 22 22 17.52 22 12.004 22 6.48 17.52 2 12.004 2zm5.727 14.124c-.244.688-1.22 1.258-1.683 1.311-.476.054-.952.081-2.906-.713-2.5-1.018-4.11-3.565-4.238-3.731-.115-.164-.985-1.309-.985-2.493 0-1.184.62-1.763.84-2.002.213-.242.476-.3.633-.3.16 0 .324.004.464.01.146.007.34-.055.534.407.2.476.685 1.666.745 1.785.06.121.1.261.02.422-.08.163-.12.261-.24.402-.12.141-.253.315-.361.423-.12.12-.244.25-.104.492.14.242.62 1.022 1.332 1.656.918.818 1.693 1.07 1.933 1.19.24.12.38.1.52-.06.14-.16.6-.7 1.02-1.242.08-.105.128-.152.26-.06.132.09.837.394.981.464.144.07.24.105.274.164.035.06.035.344-.21.1z"/>
        </svg>
      </a>

    </div>
  );
}
