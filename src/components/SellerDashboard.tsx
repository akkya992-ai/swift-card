import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  IndianRupee, 
  Plus, 
  Trash2, 
  Clock, 
  Package, 
  PlusCircle, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  FolderOpen,
  Edit,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Check,
  Ban,
  Bell,
  PieChart,
  ArrowRight,
  RefreshCw,
  LogOut,
  Sliders,
  DollarSign,
  X,
  FileText,
  ThumbsUp,
  CheckCircle2,
  ClipboardList,
  Truck,
  MessageSquare,
  Smartphone,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Product, Order, Category } from '../types';
import { playNewOrderAlarm } from '../audioUtils';

interface SellerDashboardProps {
  userProfile: any;
  onLogout: () => void;
}

export default function SellerDashboard({ userProfile, onLogout }: SellerDashboardProps) {
  // Navigation state inside dashboard
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'analytics' | 'notifications'>('orders');

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [sellerNotifications, setSellerNotifications] = useState<any[]>([]);
  const [matchedOrders, setMatchedOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Track seen order IDs to raise instant alert popups for indeed "NEW" orders
  const [seenOrderIds, setSeenOrderIds] = useState<string[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [isAlertMuted, setIsAlertMuted] = useState(false);
  const [alertCountdown, setAlertCountdown] = useState(60);
  const [missedOrderReminder, setMissedOrderReminder] = useState<Order | null>(null);

  // Reject order modal details
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Item out of stock');

  // Create Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [stock, setStock] = useState('25');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [variantsStr, setVariantsStr] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVariants, setEditVariants] = useState('');
  const [editIsTrending, setEditIsTrending] = useState(false);
  const [editIsRecommended, setEditIsRecommended] = useState(false);

  // UI status states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto detect store details from user profile
  const resolvedStoreName = userProfile.storeName || 'Green Farm Outlets';
  const resolvedSellerId = userProfile.id || 's_oliver';

  // Background offline alarm simulation states
  const [swSimulating, setSwSimulating] = useState(false);
  const [swCountdown, setSwCountdown] = useState(0);

  // FCM Cloud Messaging Preferences & Inbox
  const [fcmToken, setFcmToken] = useState(() => {
    return userProfile.fcmToken || localStorage.getItem('swiftcart_fcm_token_seller') || 'fcm_tok_seller_' + Math.random().toString(36).substring(2, 11).toUpperCase() + '_android';
  });
  const [fcmSaving, setFcmSaving] = useState(false);
  const [fcmMessage, setFcmMessage] = useState('');
  const [fcmNotifications, setFcmNotifications] = useState<any[]>([]);
  const [notifPromos, setNotifPromos] = useState(userProfile.notificationSettings?.promos !== false);
  const [notifStatuses, setNotifStatuses] = useState(userProfile.notificationSettings?.orderStatuses !== false);
  const [notifAlerts, setNotifAlerts] = useState(userProfile.notificationSettings?.systemAlerts !== false);
  const [notifSound, setNotifSound] = useState(userProfile.notificationSettings?.soundEnabled !== false);

  const fetchFcmHistory = async () => {
    try {
      const res = await fetch(`/api/notifications/history/${userProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        setFcmNotifications(data);
      }
    } catch (e) {
      console.warn('Failed to load FCM history', e);
    }
  };

  const syncFcmAndPreferences = async (forceSave = false) => {
    if (!userProfile?.id) return;
    setFcmSaving(true);
    setFcmMessage('');
    try {
      // Register Token
      await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, fcmToken })
      });
      localStorage.setItem('swiftcart_fcm_token_seller', fcmToken);

      // Register Settings
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

      if (settingsRes.ok) {
        if (forceSave) {
          setFcmMessage('FCM-backed settings and high reliability filters synced successfully! Automatic retry fallback rules active. 🎉');
          setTimeout(() => setFcmMessage(''), 5500);
        }
        fetchFcmHistory();
      }
    } catch (err) {
      console.error('Failed to register FCM preferences', err);
    } finally {
      setFcmSaving(false);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, userId: userProfile.id })
      });
      setFcmNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    syncFcmAndPreferences(false);
    fetchFcmHistory();
    const t = setInterval(fetchFcmHistory, 10000);
    return () => clearInterval(t);
  }, [userProfile.id]);

  const triggerBackgroundSimulation = () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      alert('Local Service Worker is initializing. Ensure notifications are permitted and try again in a second!');
      return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          alert('System OS Notification permission is highly suggested for background alarms to buzz when the app is minimized!');
        }
      });
    }

    setSwSimulating(true);
    setSwCountdown(5);

    let count = 5;
    const interval = setInterval(() => {
      count--;
      setSwCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setSwSimulating(false);
        
        // Dispatch simulation message to Service Worker with a dynamic orderId
        const linkedOrderId = (matchedOrders.find(o => o.status === 'placed') || matchedOrders[0])?.id || ('SIM-' + Math.floor(1000 + Math.random() * 9000));
        navigator.serviceWorker.controller?.postMessage({
          type: 'SIMULATE_BACKGROUND_ALARM',
          delay: 100,
          role: 'seller',
          orderId: linkedOrderId
        });
      }
    }, 1000);
  };

  // Keep a reference to check if is first load
  const isFirstLoadRef = useRef(true);

  // Telemetry event logging: Alert opened
  useEffect(() => {
    if (newOrderAlert) {
      setAlertCountdown(60);
      setIsAlertMuted(false);
      
      fetch('/api/notifications/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newOrderAlert.id,
          role: 'seller',
          eventType: 'opened'
        })
      }).catch(err => console.warn('Alert opened log failed:', err));
    }
  }, [newOrderAlert]);

  // SLA safety countdown timer (Max 60 seconds)
  useEffect(() => {
    if (!newOrderAlert) return;

    const timer = setInterval(() => {
      setAlertCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Log missed event in database
          fetch('/api/notifications/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: newOrderAlert.id,
              role: 'seller',
              eventType: 'missed'
            })
          }).catch(err => console.warn('Failed to log missed alert:', err));

          // Retain ref as missed reminder banner and stop the intrusive alarm modal
          setMissedOrderReminder(newOrderAlert);
          setNewOrderAlert(null);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [newOrderAlert]);

  // Sound and Vibration Player loop
  useEffect(() => {
    if (!newOrderAlert || isAlertMuted) {
      // Clear physical vibration if muted
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch (_) {}
      }
      return;
    }

    const playSiren = () => {
      // 1. Audio Siren Tone (Guaranteed offline-ready synthetic sound)
      try {
        playNewOrderAlarm();
      } catch (err) {
        console.warn('Web Audio Playback blocked/skipped:', err);
      }

      // 2. Vibration Pattern (Android compatible, graceful touch fallback)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([400, 200, 400]);
        } catch (err) {
          console.warn('Physical device vibration restricted:', err);
        }
      }
    };

    playSiren();
    const alertSirenInterval = setInterval(playSiren, 1500);

    return () => {
      clearInterval(alertSirenInterval);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch (_) {}
      }
    };
  }, [newOrderAlert, isAlertMuted]);

  useEffect(() => {
    fetchSellerScope();
    fetchCategories();
    
    // Low latency poller for super-fast dark store live ticks (3 seconds)
    const interval = setInterval(() => {
      fetchSellerScope();
    }, 3000);

    return () => clearInterval(interval);
  }, [seenOrderIds]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) setCategory(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSellerScope = async (forceSpinner = false) => {
    if (forceSpinner) setIsRefreshing(true);
    try {
      // 1. Fetch live products
      const pRes = await fetch('/api/products');
      if (pRes.ok) {
        const pData: Product[] = await pRes.json();
        const filtered = pData.filter(p => {
          return p.sellerId === resolvedSellerId || p.sellerName.toLowerCase() === resolvedStoreName.toLowerCase();
        });
        setMyProducts(filtered);
      }

      // 2. Fetch live orders containing items from this seller store
      const oRes = await fetch('/api/orders');
      if (oRes.ok) {
        const oData: Order[] = await oRes.json();
        
        // Filter orders that contain items belonging to this store
        const related = oData.filter(o => {
          return o.items.some(item => 
            item.product.sellerId === resolvedSellerId || 
            item.product.sellerName.toLowerCase() === resolvedStoreName.toLowerCase()
          );
        });

        setMatchedOrders(related);

        // POPUP INBOX ALERTER ALGORITHM
        // Extract all orders listed under 'placed' stage currently
        const currentPlacedOrders = related.filter(o => o.status === 'placed');
        
        if (currentPlacedOrders.length > 0) {
          // If first layout load, seed seen list and avoid opening alerts for pre-existing tickets
          if (isFirstLoadRef.current) {
            const initialIds = related.map(o => o.id);
            setSeenOrderIds(initialIds);
            isFirstLoadRef.current = false;
          } else {
            // Find a placed order whose ID we haven't seen yet in seenOrderIds state
            const targetNewTicket = currentPlacedOrders.find(o => !seenOrderIds.includes(o.id));
            if (targetNewTicket) {
              setNewOrderAlert(targetNewTicket);
              setSeenOrderIds(prev => [...prev, targetNewTicket.id]);

              // Trigger 100% offline-ready synthetic sound and standard audio file fallback
              playNewOrderAlarm();
              try {
                const ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
                ringtone.volume = 0.6;
                ringtone.play().catch(() => {});
              } catch (soundErr) {
                console.log("Audio notification block bypassed", soundErr);
              }
            }
          }
        }
      }

      // 3. Fetch outbound notifications belonging to this seller
      const notRes = await fetch('/api/outbound-notifications');
      if (notRes.ok) {
        const notAll: any[] = await notRes.json();
        const fNot = notAll.filter(n => 
          n.recipientRole === 'seller' && (
            n.recipientPhone === userProfile.phone || 
            n.recipientName.toLowerCase() === resolvedStoreName.toLowerCase() ||
            !userProfile.phone
          )
        );
        setSellerNotifications(fNot);
      }
    } catch (e) {
      console.error("Error updates feed for dark store:", e);
    } finally {
      if (forceSpinner) setIsRefreshing(false);
    }
  };

  // Accept a live incoming ticket from dark store queue
  const handleAcceptOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          packingStatus: 'accepted' // sets current packing step
        })
      });

      if (res.ok) {
        setSuccess(`Order #${orderId} accepted successfully! Transferred to preparation rack.`);
        setNewOrderAlert(null); // close popup
        
        // Log action result to backend telemetry
        await fetch('/api/notifications/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            role: 'seller',
            eventType: 'accepted'
          })
        }).catch(err => console.warn('Telemetry accept skip:', err));

        fetchSellerScope();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reject order and save cancellation reason
  const handleRejectOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${rejectingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          packingStatus: 'rejected',
          rejectionReason: rejectionReason
        })
      });

      if (res.ok) {
        setSuccess(`Order #${rejectingOrder.id} successfully rejected & flagged.`);
        const rejectedOrderId = rejectingOrder.id;
        setNewOrderAlert(null); // safely shut any popup too
        setRejectingOrder(null);
        
        // Log action result to backend telemetry
        await fetch('/api/notifications/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: rejectedOrderId,
            role: 'seller',
            eventType: 'rejected'
          })
        }).catch(err => console.warn('Telemetry reject skip:', err));

        fetchSellerScope();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Step-by-Step advancement of packing stages
  const handleTransitionPackingStatus = async (orderId: string, nextStage: 'preparing' | 'packing' | 'delayed') => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packingStatus: nextStage })
      });

      if (res.ok) {
        fetchSellerScope();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ready for pickup button: sets order status to 'confirmed' and packingStatus to 'ready' 
  // so that nearby Hero Electric e-riders instantly see it in their map queue feeds!
  const handleMarkReadyForPickup = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'confirmed', // available for riders
          packingStatus: 'ready' 
        })
      });

      if (res.ok) {
        setSuccess(`Order #${orderId} marked prepped and ready for pickup! Notification dispatched to e-riders.`);
        fetchSellerScope();
        setTimeout(() => setSuccess(''), 4500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Product in Dark Store
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !price || !category || !unit) {
      setError('Please fill in Product Title, Price, Category and weight unit.');
      return;
    }

    setLoading(true);
    try {
      const parsedPrice = parseFloat(price);
      const parsedOrig = originalPrice ? parseFloat(originalPrice) : undefined;
      const parsedStock = parseInt(stock) || 15;

      if (isNaN(parsedPrice)) {
        setError('Price must be a valid number.');
        return;
      }

      let finalImg = imageUrl;
      if (!finalImg) {
        if (category.includes('veg')) finalImg = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=60';
        else if (category.includes('fruit')) finalImg = 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=300&auto=format&fit=crop&q=60';
        else if (category.includes('dairy')) finalImg = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=60';
        else if (category.includes('munch')) finalImg = 'https://images.unsplash.com/photo-1566478989037-eec170784d20?w=300&auto=format&fit=crop&q=60';
        else if (category.includes('drink')) finalImg = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60';
        else finalImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60';
      }

      const parsedVariants = variantsStr
        ? variantsStr.split(',').map(v => v.trim()).filter(v => v.length > 0)
        : undefined;

      const productPayload = {
        name,
        price: parsedPrice,
        originalPrice: parsedOrig,
        category,
        image: finalImg,
        unit,
        stock: parsedStock,
        description: description || `${name} supplied fresh from ${resolvedStoreName}`,
        sellerId: resolvedSellerId,
        sellerName: resolvedStoreName,
        deliveryMinutes: 10,
        isTrending,
        isRecommended,
        variants: parsedVariants
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });

      if (!res.ok) {
        throw new Error('Could not list product in system.');
      }

      // Reset
      setName('');
      setPrice('');
      setOriginalPrice('');
      setUnit('');
      setDescription('');
      setImageUrl('');
      setVariantsStr('');
      setIsTrending(false);
      setIsRecommended(false);
      
      setSuccess('Dark store product listed live successfully!');
      fetchSellerScope();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditPrice(p.price.toString());
    setEditOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setEditCategory(p.category);
    setEditUnit(p.unit);
    setEditStock(p.stock.toString());
    setEditDescription(p.description || '');
    setEditImageUrl(p.image);
    setEditVariants(p.variants ? p.variants.join(', ') : '');
    setEditIsTrending(p.isTrending || false);
    setEditIsRecommended(p.isRecommended || false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setError('');
    setSuccess('');

    try {
      const parsedPrice = parseFloat(editPrice);
      const parsedOrig = editOriginalPrice ? parseFloat(editOriginalPrice) : undefined;
      const parsedStock = parseInt(editStock) || 0;

      if (isNaN(parsedPrice)) {
        setError('Price must be a valid number.');
        return;
      }

      const variantsArr = editVariants
        ? editVariants.split(',').map(v => v.trim()).filter(v => v.length > 0)
        : undefined;

      const payload = {
        name: editName,
        price: parsedPrice,
        originalPrice: parsedOrig,
        category: editCategory,
        unit: editUnit,
        stock: parsedStock,
        description: editDescription,
        image: editImageUrl,
        variants: variantsArr,
        isTrending: editIsTrending,
        isRecommended: editIsRecommended
      };

      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to update product settings.');
      }

      setSuccess('Product specs modified successfully.');
      setEditingProduct(null);
      fetchSellerScope();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // High speed bulk increment adjusters for direct inventory stock edits
  const handleQuickAdjustStock = async (productId: string, currentStock: number, delta: number) => {
    const finalStock = Math.max(0, currentStock + delta);
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: finalStock })
      });

      if (res.ok) {
        setMyProducts(prev => 
          prev.map(p => p.id === productId ? { ...p, stock: finalStock } : p)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct raw stock typing handler
  const handleUpdateStockRaw = async (productId: string, value: string) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < 0) return;
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: parsed })
      });

      if (res.ok) {
        setMyProducts(prev => 
          prev.map(p => p.id === productId ? { ...p, stock: parsed } : p)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you certain you want to de-list this inventory product from the dark store shelf?')) return;

    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Product listed down from public rack.');
        fetchSellerScope();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sales Analytics Calculators
  const totalStoreTurnover = matchedOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total, 0);

  const completedOrdersCount = matchedOrders.filter(o => o.status === 'delivered').length;

  const todayDateStr = new Date().toDateString();
  const isDateToday = (dateStr: string) => {
    try {
      if (!dateStr) return false;
      return new Date(dateStr).toDateString() === todayDateStr;
    } catch {
      return false;
    }
  };

  const todaysOrdersCount = matchedOrders.filter(o => isDateToday(o.createdAt || '')).length;
  const todaysCompletedOrdersCount = matchedOrders.filter(o => o.status === 'delivered' && isDateToday(o.deliveredAt || o.createdAt || '')).length;
  const totalOrdersCount = matchedOrders.length;
  const todaysRevenueVal = matchedOrders
    .filter(o => o.status === 'delivered' && isDateToday(o.deliveredAt || o.createdAt || ''))
    .reduce((sum, o) => sum + o.total, 0);
  const totalRevenueVal = totalStoreTurnover;

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const dailyRevenue = matchedOrders
    .filter(o => {
      if (o.status !== 'delivered') return false;
      const orderDate = new Date(o.createdAt);
      return (now.getTime() - orderDate.getTime()) <= oneDayMs;
    })
    .reduce((sum, o) => sum + o.total, 0);

  const weeklyRevenue = matchedOrders
    .filter(o => {
      if (o.status !== 'delivered') return false;
      const orderDate = new Date(o.createdAt);
      return (now.getTime() - orderDate.getTime()) <= (7 * oneDayMs);
    })
    .reduce((sum, o) => sum + o.total, 0);

  const monthlyRevenue = matchedOrders
    .filter(o => {
      if (o.status !== 'delivered') return false;
      const orderDate = new Date(o.createdAt);
      return (now.getTime() - orderDate.getTime()) <= (30 * oneDayMs);
    })
    .reduce((sum, o) => sum + o.total, 0);
  
  // Active prep load of tickets that are accepted/preparing but not ready/delivered yet
  const activePreparingOrders = matchedOrders.filter(o => 
    o.status !== 'delivered' && o.status !== 'rejected' &&
    (o.packingStatus === 'accepted' || o.packingStatus === 'preparing' || o.packingStatus === 'packing' || !o.packingStatus)
  );

  const rejectedOrders = matchedOrders.filter(o => o.status === 'rejected');
  const totalTickets = matchedOrders.length;
  const rejectionRate = totalTickets > 0 ? Math.round((rejectedOrders.length / totalTickets) * 100) : 0;

  // Compute category sales statistics
  const categorySalesMap: Record<string, number> = {};
  let totalItemsSold = 0;
  matchedOrders.filter(o => o.status === 'delivered').forEach(o => {
    o.items.forEach(item => {
      if (item.product.sellerId === resolvedSellerId || item.product.sellerName.toLowerCase() === resolvedStoreName.toLowerCase()) {
        const cat = item.product.category;
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + item.quantity;
        totalItemsSold += item.quantity;
      }
    });
  });

  // Track low stock goods for warnings panel (stock < 10)
  const lowStockItems = myProducts.filter(p => p.stock < 10);

  return (
    <div id="seller-dashboard-container" className="space-y-6 text-left text-slate-800">
      
      {/* 1. DARK STORE BRAND BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 skew-x-12 translate-x-12 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 text-left relative z-10">
          <div className="p-4 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg">
            <Store className="w-8 h-8 font-black shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                10-Min Dark Store Node
              </span>
              <span className="flex items-center gap-1 text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Terminal Active
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1.5 tracking-tight text-white">{resolvedStoreName}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Store Operator: <span className="font-mono text-slate-300 font-bold">{userProfile.email}</span> • Phone Line: <span className="text-slate-300">{userProfile.phone}</span>
            </p>
          </div>
        </div>

        {/* QUICK STATS DECORATOR */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
          <div className="bg-slate-800/80 px-4.5 py-3 rounded-2xl border border-slate-700/50 flex-1 lg:flex-none">
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Store total</div>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">₹{totalStoreTurnover}</div>
          </div>
          <div className="bg-slate-800/80 px-4.5 py-3 rounded-2xl border border-slate-700/50 flex-1 lg:flex-none">
            <div className="text-[9px] text-slate-450 uppercase font-black tracking-widest">Daily (24h)</div>
            <div className="text-lg font-black text-teal-400 font-mono mt-0.5">₹{dailyRevenue}</div>
          </div>
          <div className="bg-slate-800/80 px-4.5 py-3 rounded-2xl border border-slate-700/50 flex-1 lg:flex-none">
            <div className="text-[9px] text-slate-450 uppercase font-black tracking-widest">Weekly (7d)</div>
            <div className="text-lg font-black text-sky-400 font-mono mt-0.5">₹{weeklyRevenue}</div>
          </div>
          <div className="bg-slate-800/80 px-4.5 py-3 rounded-2xl border border-slate-700/50 flex-1 lg:flex-none">
            <div className="text-[9px] text-slate-450 uppercase font-black tracking-widest">Monthly (30d)</div>
            <div className="text-lg font-black text-pink-400 font-mono mt-0.5">₹{monthlyRevenue}</div>
          </div>
          <div className="bg-slate-800/80 px-4.5 py-3 rounded-2xl border border-slate-700/50 flex-1 lg:flex-none">
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Active Prep</div>
            <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{activePreparingOrders.length} tickets</div>
          </div>
          <button 
            onClick={() => {
              playNewOrderAlarm();
              alert("🔊 Audio Alert Synthesized! This plays a sharp alarm beep completely offline, perfect for mobile APKs. Tap anywhere on the screen first if you didn't hear anything.");
            }}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-xl border border-emerald-500/30 transition shrink-0 cursor-pointer flex items-center gap-2 font-black text-xs shadow-md"
            title="Test Terminal Sound"
          >
            <Volume2 className="w-4 h-4 shrink-0 text-slate-950" />
            <span>TEST ALARM SOUND</span>
          </button>

          <button 
            onClick={() => fetchSellerScope(true)}
            disabled={isRefreshing}
            className="p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl border border-slate-700/50 transition shrink-0 cursor-pointer flex items-center justify-center"
            title="Refresh Store Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. DURATION NOTIFICATIONS */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-800 text-xs font-bold shadow-xs animate-pulse flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-xl text-rose-800 text-xs font-bold shadow-xs flex items-center gap-2 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. WORKSPACE TAB CONTROLLER */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('orders'); setError(''); setSuccess(''); }}
            className={`px-5 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders' 
                ? 'border-emerald-600 text-emerald-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Live Orders prepared ({matchedOrders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length})
          </button>
          <button
            onClick={() => { setActiveTab('inventory'); setError(''); setSuccess(''); }}
            className={`px-5 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'inventory' 
                ? 'border-emerald-600 text-emerald-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventory & Stock ({myProducts.length})
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); setError(''); setSuccess(''); }}
            className={`px-5 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'analytics' 
                ? 'border-emerald-600 text-emerald-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Dark Store Analytics
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); setError(''); setSuccess(''); }}
            className={`px-5 py-3 text-xs font-black tracking-widest uppercase border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'notifications' 
                ? 'border-emerald-600 text-emerald-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS &amp; WA Outbox ({sellerNotifications.length})
          </button>
        </div>
      </div>

      {/* 4. MAIN INNER VIEWS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {missedOrderReminder && (
            <div className="bg-gradient-to-r from-red-950 to-red-900 text-white p-5 rounded-[24px] border-2 border-red-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 text-left">
                <div className="bg-red-900 border border-red-700 text-amber-400 p-2.5 rounded-2xl animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-400 uppercase tracking-widest leading-none">⚠️ High-Priority Dispatch Missed (SLA Warning)</h4>
                  <p className="text-xs font-bold text-slate-100">
                    Order <span className="font-mono text-white text-sm">#{missedOrderReminder.id}</span> (₹{missedOrderReminder.total}) from <span className="text-white font-black">{missedOrderReminder.customerName || 'Premium Customer'}</span> timed out without response.
                  </p>
                  <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                    Automatic notification retries logged. Check telemetry diagnostics. Click restore to open controls.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                <button
                  onClick={() => {
                    setNewOrderAlert(missedOrderReminder);
                    setMissedOrderReminder(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-[10px] uppercase rounded-xl shadow-md transition cursor-pointer"
                >
                  Force Recover Control
                </button>
                <button
                  onClick={() => setMissedOrderReminder(null)}
                  className="p-2 bg-red-900/50 hover:bg-red-850 text-slate-350 hover:text-white rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Active Mode Background Alarm Simulator and Heed */}
          <div className="bg-gradient-to-br from-red-500/10 via-amber-500/5 to-slate-50 border border-red-500/20 rounded-[32px] p-6 shadow-xs space-y-4 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider">
                  🚨 Active-Mode PWA Alarm System
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  Background Delivery Notification & Sirens Active (24/7 Perpetual Support)
                </h3>
                <p className="text-[11px] text-slate-500 max-w-2xl leading-normal">
                  Our system keeps you integrated 24/7. Even if you do not open the app for over 24 hours, the **PWA Service Worker** remains active to catch incoming orders. When an order is placed, a physical alarm will sound immediately. Lock your screen or close this tab; we will still ring the system buzzer!
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Service Worker Live (24/7)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">24-Hour Offline Closed-App Proof</span>
                <span className="text-xs font-bold text-slate-700 block">Simulate closed app scenario</span>
              </div>
              
              <button
                type="button"
                onClick={triggerBackgroundSimulation}
                disabled={swSimulating}
                className="w-full sm:w-auto px-5 py-3 bg-red-650 hover:bg-red-700 disabled:bg-slate-200 text-white font-black rounded-xl text-xs uppercase tracking-wide transition shadow-sm cursor-pointer hover:shadow"
              >
                {swSimulating ? `Starting in ${swCountdown}s (Now Lock/Minimize App!)` : '⚡ Simulate Offline Alarm'}
              </button>
            </div>
          </div>

          {/* ORDERS FUNNEL FLOW BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* STAGE A: NEW PLACED TICKETS (NEEDS HEED) */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black uppercase">
                  1. Placed Tickets
                </span>
                <span className="text-xs font-black text-amber-900 font-mono">
                  {matchedOrders.filter(o => o.status === 'placed').length}
                </span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium font-sans">
                Newly requested baskets. Must accept/reject instantly to meet 10-minute metrics.
              </p>
            </div>

            {/* STAGE B: ACTIVE PREPARATION (STAFF PACKING) */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase">
                  2. Preparing / Packing
                </span>
                <span className="text-xs font-black text-indigo-900 font-mono">
                  {matchedOrders.filter(o => o.status !== 'rejected' && o.status !== 'delivered' && (o.packingStatus === 'accepted' || o.packingStatus === 'preparing' || o.packingStatus === 'packing')).length}
                </span>
              </div>
              <p className="text-[10px] text-indigo-700 font-medium font-sans">
                Bagging goods and printing dark store dispatch stickers.
              </p>
            </div>

            {/* STAGE C: SECURELY prepped for PICKUP */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black uppercase">
                  3. Prepped & Ready
                </span>
                <span className="text-xs font-black text-emerald-900 font-mono">
                  {matchedOrders.filter(o => o.status === 'confirmed' && o.packingStatus === 'ready').length}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium font-sans">
                Ready on pick bags. Riders are claiming and routing to dark store.
              </p>
            </div>

            {/* STAGE D: COMPLETED COURIERS TODAY */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-slate-900 text-slate-100 px-2 py-0.5 rounded-full font-black uppercase">
                  4. Dispatched Out
                </span>
                <span className="text-xs font-black text-slate-900 font-mono">
                  {matchedOrders.filter(o => o.status === 'dispatched' || o.status === 'delivered').length}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                Fulfilling deliveries or safely handed to customers' addresses.
              </p>
            </div>

          </div>

          {/* ACTIVE LIVE ORDERS FEED LIST */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="text-left">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>Merchant Processing Lane</span>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                </h3>
                <p className="text-xs text-slate-450 mt-1">Accept, manage live preparation steps, and click Ready For Pickup to trigger e-riders.</p>
              </div>

              <div className="flex items-center gap-1.5 self-end">
                <span className="text-[11px] font-bold text-slate-500">Fast Filters:</span>
                <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-black font-sans">
                  Total Orders Live: {matchedOrders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length}
                </span>
              </div>
            </div>

            {matchedOrders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length === 0 ? (
              <div className="py-14 text-center max-w-md mx-auto space-y-3.5">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-100">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 uppercase">Prepare rack Empty</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">No incoming customer tickets require preparation right now. Keep your terminal open; new carts appear instantly!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {matchedOrders
                  .filter(o => o.status !== 'delivered' && o.status !== 'rejected')
                  .map((o) => {
                    const storeItems = o.items.filter(i => 
                      i.product.sellerId === resolvedSellerId || 
                      i.product.sellerName.toLowerCase() === resolvedStoreName.toLowerCase()
                    );
                    
                    if (storeItems.length === 0) return null;

                    // Compute clean step styles for packing stages
                    const stage = o.packingStatus || 'pending';
                    
                    return (
                      <div 
                        key={o.id} 
                        className={`p-5 rounded-2xl border transition duration-200 text-left ${
                          o.status === 'placed' 
                            ? 'bg-amber-50/20 border-amber-200 ring-2 ring-amber-400/5 hover:border-amber-300' 
                            : 'bg-white border-slate-150 hover:border-slate-250 shadow-sm'
                        }`}
                      >
                        {/* Ticket Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[13px] tracking-tight bg-slate-900 text-white px-2.5 py-1 rounded-lg font-mono">
                                Ticket #{o.id}
                              </span>
                              
                              {o.status === 'placed' && (
                                <span className="text-[9px] bg-rose-100 text-rose-800 border-l-2 border-rose-500 font-extrabold px-2.5 py-1 uppercase tracking-tight">
                                  Awaiting Acceptance
                                </span>
                              )}

                              {o.status === 'confirmed' && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 border-l-2 border-emerald-500 font-extrabold px-2.5 py-1 uppercase tracking-tight flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Ready for Pickup
                                </span>
                              )}

                              {o.status === 'dispatched' && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-800 border-l-2 border-indigo-500 font-extrabold px-2.5 py-1 uppercase tracking-tight flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-indigo-700" /> Out for Delivery
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-tight font-sans">
                              Placed: {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Mode: <span className="text-slate-700 font-extrabold">{o.paymentMethod}</span>
                            </p>
                          </div>

                          {/* Order packing status progress line (visual stages indicator) */}
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-450 uppercase font-bold tracking-widest">Prepare state:</span>
                            <div className="flex items-center gap-1.5">
                              {/* ACCEPTED STEP */}
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                stage !== 'pending' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>Accepted</span>
                              
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />

                              {/* PREPARING STEP */}
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                stage === 'preparing' || stage === 'packing' || stage === 'ready' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
                              }`}>Prepping</span>

                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />

                              {/* PACKED AND SEALED */}
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                stage === 'ready' ? 'bg-emerald-600 text-white' : stage === 'packing' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
                              }`}>Packed</span>
                              
                              {/* IF DELAYED ALERT RAISED */}
                              {stage === 'delayed' && (
                                <span className="text-[10px] bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded animate-bounce">
                                  ⚠️ Delayed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ticket Items Breakdown & Specifications */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4.5">
                          
                          {/* Col 1 & 2: Items list table */}
                          <div className="lg:col-span-2 space-y-2">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Basket Products</span>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                              {storeItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold flex items-center justify-center text-[10px]">
                                      {item.quantity}
                                    </span>
                                    <span className="font-semibold text-slate-800">{item.product.name}</span>
                                    {item.selectedVariant && (
                                      <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                        {item.selectedVariant}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-slate-500">{item.product.unit}</span>
                                </div>
                              ))}
                            </div>

                            <div className="text-[11px] text-slate-450 leading-relaxed max-w-xl">
                              📍 Delivery hub address: <span className="text-slate-800 font-semibold">{o.address}</span> • Customer name: <span className="text-slate-800 font-semibold">{o.customerName || 'Resident User'}</span>
                            </div>
                          </div>

                          {/* Col 3: Realtime interactive prepare workflow actions */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Workflow prepare deck</span>
                              <div className="text-xs font-semibold text-slate-500 mt-1 leading-snug">
                                Status: <span className="text-slate-800 font-black capitalize">{o.packingStatus || 'Awaiting Acceptance'}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {/* ACTION SET A: ACCEPT / REJECT ORDER INITIAL FLOW */}
                              {o.status === 'placed' && !o.packingStatus && (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleAcceptOrder(o.id)}
                                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => { setRejectingOrder(o); setRejectionReason('Item out of stock'); }}
                                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}

                              {/* ACTION SET B: STAGE UPDATER PACKING TRANSITIONS */}
                              {o.status === 'placed' && o.packingStatus && o.packingStatus !== 'ready' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-1">
                                    <button
                                      onClick={() => handleTransitionPackingStatus(o.id, 'preparing')}
                                      className={`py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                        stage === 'preparing' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      Prepping
                                    </button>
                                    <button
                                      onClick={() => handleTransitionPackingStatus(o.id, 'packing')}
                                      className={`py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                        stage === 'packing' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      Packing
                                    </button>
                                    <button
                                      onClick={() => handleTransitionPackingStatus(o.id, 'delayed')}
                                      className={`py-1.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                                        stage === 'delayed' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50'
                                      }`}
                                    >
                                      Delay Action
                                    </button>
                                  </div>

                                  {/* THE CRITICAL "READY FOR PICKUP BUTTON" */}
                                  <button
                                    onClick={() => handleMarkReadyForPickup(o.id)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1 animate-shimmer"
                                  >
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    Ready for Pickup 🛵
                                  </button>
                                </div>
                              )}

                              {/* ALREADY prepped or dispatched */}
                              {stage === 'ready' && o.status === 'confirmed' && (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-xl text-center">
                                  <div className="text-[11px] font-black text-emerald-800 uppercase flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Prepped & Sealed
                                  </div>
                                  <p className="text-[9px] text-emerald-600 mt-0.5">Awaiting rider assignment to route coordinates...</p>
                                </div>
                              )}

                              {o.status === 'dispatched' && (
                                <div className="p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl">
                                  <div className="text-[10px] font-black text-indigo-800 uppercase flex items-center justify-center gap-1">
                                    <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> In Rider Transit
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-1 leading-dense">
                                    Rider: <span className="font-extrabold text-slate-700">{o.riderName || 'Rohan'}</span> ({o.riderPhone || 'Phone Line'})
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* BRUSH HISTORY DISPATCH ARCHIVE */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 text-left">
            <h3 className="font-black text-sm text-slate-900 uppercase">Store Fulfillment Logs ({matchedOrders.filter(o => o.status === 'delivered' || o.status === 'rejected').length} tickets completed)</h3>
            <p className="text-xs text-slate-400 mt-1">Archived delivered orders and dark store rejection sheets for reference.</p>
            
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-extrabold uppercase text-[9px] border-b border-slate-100">
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Timestamp / Date</th>
                    <th className="py-2.5 px-3">Item Count</th>
                    <th className="py-2.5 px-3">Basket Total</th>
                    <th className="py-2.5 px-3">Prepare Stage</th>
                    <th className="py-2.5 px-3 text-right">Rider Dispatch specs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedOrders
                    .filter(o => o.status === 'delivered' || o.status === 'rejected')
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{o.id}</td>
                        <td className="py-3 px-3 text-slate-500">{new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="py-3 px-3 text-slate-700 font-bold">{o.items.reduce((s,i)=>s+i.quantity,0)} goods</td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900">₹{o.total}</td>
                        <td className="py-3 px-3">
                          {o.status === 'delivered' ? (
                            <span className="text-[9px] bg-emerald-50 text-emerald-850 px-2 py-0.5 rounded font-black uppercase">Delivered</span>
                          ) : (
                            <span className="text-[9px] bg-rose-50 text-rose-850 px-2 py-0.5 rounded font-black uppercase inline-block max-w-[120px] truncate" title={o.rejectionReason}>
                              Rejected ({o.rejectionReason || 'No details'})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 leading-none">
                          {o.status === 'delivered' ? (
                            <div>
                              <p className="text-[10px] text-slate-700 font-bold">{o.riderName || 'Rohan K'}</p>
                              <span className="text-[9px] text-slate-400">{o.riderPhone || 'Rider line'}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] italic text-slate-400">Cancelled ticket</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {matchedOrders.filter(o => o.status === 'delivered' || o.status === 'rejected').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No fulfilled delivery records currently.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CATALOG AND RAPID STOCK CONTROLLER LIST (SPANS 2 COLS) */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div className="text-left">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Product Stock Controller ({myProducts.length})
                  </h3>
                  <p className="text-[11px] text-slate-450 mt-1">Adjust item counts with instant adjustments or manage listings specs.</p>
                </div>
                
                {/* Searching bar snippet */}
                <div className="text-xs bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg">
                  Catalog size: {myProducts.length} entries
                </div>
              </div>

              {myProducts.length === 0 ? (
                <div className="py-14 text-center max-w-sm mx-auto space-y-3.5">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase">Dark Store Rack Empty</h4>
                    <p className="text-xs text-slate-400 mt-1">Use the "Fast List Product" form on the right-hand panel to fill your organic produce shelves instantly!</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[80vh] overflow-y-auto pr-1">
                  {myProducts.map((p) => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock < 10;
                    
                    return (
                      <div 
                        key={p.id} 
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        {/* Title and image block */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                          <div className="w-13 h-13 rounded-xl overflow-hidden bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-full h-full object-contain mix-blend-multiply" 
                            />
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <h4 className="font-black text-xs text-slate-800 line-clamp-1 leading-snug">{p.name}</h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-900 font-extrabold font-mono">₹{p.price}</span>
                              <span className="text-[10px] text-slate-400">Unit: {p.unit}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded font-sans uppercase">
                                {categories.find(c=>c.id===p.category)?.name || p.category}
                              </span>
                            </div>
                            
                            <div className="flex gap-1.5 pt-0.5">
                              {p.isTrending && (
                                <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">🔥 Trending</span>
                              )}
                              {p.isRecommended && (
                                <span className="text-[8px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">✨ Recommended</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive stock adjuster widgets */}
                        <div className="flex items-center gap-4.5 self-end md:self-auto justify-between md:justify-end">
                          
                          {/* Stock Status Pill */}
                          <div className="text-left md:text-right space-y-1">
                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Storage status</div>
                            {isOutOfStock ? (
                              <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded uppercase">OUT OF STOCK</span>
                            ) : isLowStock ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded uppercase font-sans animate-pulse">LOW ({p.stock})</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded uppercase">IN STOCK ({p.stock})</span>
                            )}
                          </div>

                          {/* Increments / Decrements Button Array */}
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150">
                            {/* Raw Stock Numeric Input */}
                            <input 
                              type="number"
                              value={p.stock}
                              onChange={(e) => handleUpdateStockRaw(p.id, e.target.value)}
                              className="w-13 h-7 text-center rounded bg-white border border-slate-200 text-xs font-black text-slate-900 focus:outline-none"
                              min={0}
                              title="Type raw inventory count"
                            />

                            <button
                              onClick={() => handleQuickAdjustStock(p.id, p.stock, 5)}
                              className="px-2 h-7 bg-white hover:bg-slate-150 rounded border border-slate-200 text-[10px] font-extrabold text-slate-700 cursor-pointer active:scale-90"
                              title="Increment stock by 5"
                            >
                              +5
                            </button>
                            
                            <button
                              onClick={() => handleQuickAdjustStock(p.id, p.stock, 25)}
                              className="px-2 h-7 bg-white hover:bg-slate-150 rounded border border-slate-200 text-[10px] font-extrabold text-slate-700 cursor-pointer active:scale-90"
                              title="Refill shelf (Add 25)"
                            >
                              +25
                            </button>

                            <button
                              onClick={() => handleQuickAdjustStock(p.id, p.stock, -p.stock)}
                              className="px-2 h-7 bg-rose-50 hover:bg-rose-100 rounded border border-rose-100 text-[10px] font-extrabold text-rose-700 cursor-pointer active:scale-90"
                              title="Mark out of stock instantly"
                            >
                              Out
                            </button>
                          </div>

                          {/* Edit Details Trigger */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 rounded-lg transition text-xs font-black cursor-pointer flex items-center gap-0.5"
                              title="Edit product details"
                            >
                              <Edit className="w-4 h-4 shrink-0" />
                              <span className="hidden sm:inline">Modify</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="De-list product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* QUICK LIST NEW PRODUCT FORM SIDEBAR (SPAN 1 COL) */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-4 text-left h-max">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2.5 border-b border-slate-100">
              <PlusCircle className="w-4.5 h-4.5 text-emerald-600" />
              Fast List New produce
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Product Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Mangoes Alphonso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Retail Price (₹)</label>
                  <input
                    type="number"
                    placeholder="₹ 140"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Strike Price (₹)</label>
                  <input
                    type="number"
                    placeholder="₹ 199"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Weight / Metric</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 g or 1 L"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Stock Refill</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Store Shelf Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Size Weight Variants (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 250 g, 500 g, 1 kg"
                  value={variantsStr}
                  onChange={(e) => setVariantsStr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-[8px] text-slate-400 mt-0.5 block leading-tight">Separate options with comma.</span>
              </div>

              <div className="flex items-center gap-4 py-2 bg-slate-50 px-3 rounded-lg border border-slate-100">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isTrending}
                    onChange={(e) => setIsTrending(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  🔥 Trending
                </label>

                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecommended}
                    onChange={(e) => setIsRecommended(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  ✨ Rec
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1 font-sans">Image URL</label>
                <input
                  type="url"
                  placeholder="Leave empty for auto production placeholder"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1 font-sans">Description details</label>
                <textarea
                  placeholder="Supplied fresh and healthy..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs h-15 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition shadow-md cursor-pointer uppercase tracking-wider"
              >
                {loading ? 'Interacting with server...' : 'Inject Product live'}
              </button>
            </form>
          </div>

        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 text-left">
          
          {/* ANALYTICS HIGHLIGHT METRICS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            
            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Today's Orders</span>
              <div className="text-xl font-black text-slate-900 font-mono">{todaysOrdersCount}</div>
              <p className="text-[9px] text-slate-400">Placed today</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Today's Completed</span>
              <div className="text-xl font-black text-emerald-600 font-mono">{todaysCompletedOrdersCount}</div>
              <p className="text-[9px] text-emerald-600 font-semibold">Delivered today</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Total Orders</span>
              <div className="text-xl font-black text-slate-900 font-mono">{totalOrdersCount}</div>
              <p className="text-[9px] text-slate-400">All-time count</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Total Completed</span>
              <div className="text-xl font-black text-indigo-650 font-mono">{completedOrdersCount}</div>
              <p className="text-[9px] text-indigo-600 font-semibold">All-time delivered</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Today's Revenue</span>
              <div className="text-xl font-black text-teal-650 font-mono">₹{todaysRevenueVal}</div>
              <p className="text-[9px] text-teal-600 font-semibold font-mono">Earned today</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-150 p-4.5 space-y-1 shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Total Revenue</span>
              <div className="text-xl font-black text-emerald-700 font-mono">₹{totalRevenueVal}</div>
              <p className="text-[9px] text-emerald-700 font-semibold">All-time sales</p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* INVENTORY CRITICAL WARNINGS OVERVIEW */}
            <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Dark Store Storage Replenish Warnings ({lowStockItems.length})
                </h3>
                <p className="text-xs text-slate-400 mt-1">These catalog items have less than 10 units in stock and require dark store refilling.</p>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="p-5.5 bg-emerald-50 rounded-2xl text-center border border-emerald-100 flex flex-col items-center justify-center space-y-1">
                  <CheckCircle className="w-7 h-7 text-emerald-600 animate-bounce" />
                  <p className="font-bold text-emerald-800 text-xs uppercase">Racks fully stocked</p>
                  <p className="text-[10px] text-emerald-600 leading-relaxed">All active items have robust inventory counts over warning boundaries!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="p-3 bg-rose-50/40 rounded-xl border border-rose-100/50 flex items-center justify-between">
                      <div className="text-left flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
                        <div>
                          <p className="font-bold text-xs text-slate-800">{item.name}</p>
                          <span className="text-[9px] text-slate-450 font-mono">Weight: {item.unit} • Price: ₹{item.price}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-700 bg-rose-100/50 px-2 py-0.5 rounded">
                          Stock: {item.stock} left
                        </span>
                        
                        <button
                          onClick={() => handleQuickAdjustStock(item.id, item.stock, 50)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[10px] rounded cursor-pointer transition"
                        >
                          Refill (+50)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POPULATED CATEGORIES SALES CHART INSIGHT */}
            <div className="bg-white rounded-3xl border border-slate-150 p-6 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Dark Store Category Performance Leaderboard
                </h3>
                <p className="text-xs text-slate-400 mt-1">Item checkout frequency mapped over verified delivery receipts.</p>
              </div>

              {Object.keys(categorySalesMap).length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs py-12">
                  No billing history to parse category popularity charts yet. Fulfill some orders to view stats here!
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {Object.entries(categorySalesMap)
                    .sort((a,b)=> b[1] - a[1])
                    .map(([catId, count]) => {
                      const sharePct = Math.round((count / totalItemsSold) * 100);
                      const catName = categories.find(c=>c.id===catId)?.name || catId;
                      
                      return (
                        <div key={catId} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-755 uppercase text-[11px]">{catName}</span>
                            <span className="font-mono font-bold text-slate-900">{count} sold ({sharePct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${sharePct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6 text-left animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" /> Outbox SMS &amp; WhatsApp Notifications Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verification feed of automated customer order notifications generated from live purchases.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchSellerScope(true)}
                className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-50 text-[11px] transition shrink-0 cursor-pointer flex items-center gap-1 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-sync
              </button>
            </div>

            {sellerNotifications.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center space-y-2">
                <p className="text-3xl text-slate-300">📱</p>
                <h4 className="text-sm font-black text-slate-850">No notifications triggered yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When customers finalize order checkouts containing your products from Telangana dark stores, automated SMS alert logs will stream live here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Automated Notification Thread</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in font-sans">
                  {[...sellerNotifications].reverse().map((not) => (
                    <div 
                      key={not.id} 
                      className={`border rounded-3xl p-4 flex flex-col justify-between bg-white hover:shadow-xs transition bg-linear-to-b ${
                        not.channel === 'whatsapp' ? 'border-emerald-100/70 from-emerald-50/10' : 'border-sky-100/70 from-sky-50/10'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {not.channel === 'whatsapp' ? (
                              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-bold">
                                WhatsApp Channel
                              </span>
                            ) : (
                              <span className="bg-sky-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-bold">
                                SMS Alert
                              </span>
                            )}
                            <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              Partner Store
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                            Delivered 🟢
                          </span>
                        </div>

                        {/* Metadata */}
                        <div className="text-xs">
                          <p className="font-extrabold text-slate-900">{not.recipientName}</p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold">To: {not.recipientPhone}</p>
                        </div>

                        {/* Content text */}
                        <div className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed font-sans ${
                          not.channel === 'whatsapp' ? 'bg-emerald-50/60 text-emerald-950 border border-emerald-100/30 font-sans' : 'bg-slate-50 text-slate-850 border border-slate-100'
                        }`}>
                          {not.message.split('\n').map((line: string, i: number) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 text-[9px] text-slate-400 font-bold flex justify-between items-center">
                        <span>Order ID: #{not.orderId}</span>
                        <span>{new Date(not.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FCM Push notifications Inbox / Settings block */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-850 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600 animate-pulse" /> High-Reliability FCM-Backed Push notifications &amp; Preferences
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Best-effort delivery push channels with automatic retry mechanisms and PWA fallback notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => syncFcmAndPreferences(true)}
                disabled={fcmSaving}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl text-[11px] transition shrink-0 uppercase tracking-widest cursor-pointer flex items-center gap-1 self-start"
              >
                {fcmSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Sync Device Token
              </button>
            </div>

            {/* FCM preference setup controls card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 border border-slate-100 p-5 rounded-3xl text-xs font-semibold text-slate-600">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Registered Device token</span>
                <span className="font-mono bg-white border border-slate-100 px-3 py-1.5 rounded-lg block truncate max-w-full text-slate-500 font-bold select-all">
                  {fcmToken}
                </span>
                <p className="text-[10px] text-slate-400">
                  Best-effort token synced for live order pings. Delivery is subject to browser permissions, OS sleep modes, battery optimizations, and network latency.
                </p>
              </div>
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Active notification channels</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-indigo-500"
                      checked={notifAlerts} 
                      onChange={(e) => { setNotifAlerts(e.target.checked); }}
                    />
                    <span>Seller Order Alerts (FCM / PWA Fallback)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-indigo-500"
                      checked={notifStatuses} 
                      onChange={(e) => { setNotifStatuses(e.target.checked); }}
                    />
                    <span>Automatic Retry Queue Escapes</span>
                  </label>
                </div>
              </div>
            </div>

            {fcmMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200/50 text-emerald-800 text-xs font-bold rounded-2xl text-center animate-fade-in">
                {fcmMessage}
              </div>
            )}

            {/* FCM History item logs */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seller Notification Thread Log</span>
              {fcmNotifications.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center space-y-2 bg-white">
                  <p className="text-3xl">📭</p>
                  <h4 className="text-sm font-black text-slate-800">Your merchant push notification inbox is empty</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Background alarms and instant order alerts will flash here as soon as orders are booked in.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                  {fcmNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-3xl border flex flex-col justify-between transition-all duration-150 ${
                        n.isRead ? 'bg-white border-slate-100 text-slate-400' : 'bg-emerald-50/20 border-emerald-100/30 font-bold text-slate-800 shadow-3xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${n.isRead ? 'bg-slate-350' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="text-[9px] font-mono font-bold text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{n.title}</h4>
                        <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{n.body}</p>
                      </div>

                      {!n.isRead && (
                        <div className="mt-4 pt-2 border-t border-slate-100/60 flex justify-end">
                          <button
                            type="button"
                            onClick={() => markNotificationAsRead(n.id)}
                            className="px-3 py-1 bg-white hover:bg-slate-50 border rounded-lg text-[10px] font-extrabold text-emerald-600 shadow-xs cursor-pointer"
                          >
                            Mark Read
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SELLER SYSTEM CONTROL FOOTER */}
      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
        <p className="text-[10px] text-slate-400 font-mono font-bold">
          Daily Mart Platform Partner Node ID: {resolvedSellerId} • Terminal Ver: 3.5.1
        </p>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-slate-500 hover:text-red-650 hover:bg-slate-100 font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Partner Terminal</span>
        </button>
      </div>

      {newOrderAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950/95 via-slate-900/98 to-rose-950/90 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-slate-900 border-2 border-red-500 text-white rounded-[32px] shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6 sm:p-8 max-w-lg w-full text-left space-y-6 animate-scale-up relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 animate-pulse"></div>
            
            {/* Header / Alarm / Mute Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <div>
                  <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-300 tracking-tight uppercase">
                    HIGH-PRIORITY INBOUND ORDER
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block">DARK STORE SLA DISPATCH LINE</span>
                </div>
              </div>
              
              {/* Mute Button Control */}
              <button
                type="button"
                onClick={() => setIsAlertMuted(!isAlertMuted)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
                  isAlertMuted 
                    ? 'bg-red-950 text-red-400 border border-red-800 hover:bg-red-900' 
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-750'
                }`}
              >
                {isAlertMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-red-500 animate-pulse" />
                    ALARM MUTED
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                    MUTE SIREN
                  </>
                )}
              </button>
            </div>

            {/* SLA Timer Indicator */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-rose-950/50 flex items-center justify-between">
              <div className="space-y-0.5 mt-0 text-left">
                <span className="text-[9px] font-black text-rose-400 tracking-widest uppercase block">SLA TIMEOUT REMAINING</span>
                <span className="text-xs font-bold text-slate-350 block">Accept before system marks as missed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 font-mono text-xl font-black rounded-xl ${
                  alertCountdown <= 15 ? 'bg-red-900/60 text-red-200 animate-pulse' : 'bg-slate-805 text-amber-405'
                }`}>
                  {alertCountdown}s
                </div>
              </div>
            </div>

            {/* Customer & Order Metadata */}
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-850 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-450 uppercase font-bold block">CUSTOMER NAME</span>
                  <span className="text-xs font-extrabold text-slate-100">{newOrderAlert.customerName || 'Premium Customer'}</span>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-450 uppercase font-bold block">ORDER NUMBER</span>
                  <span className="text-xs font-extrabold text-slate-100 font-mono">#{newOrderAlert.id}</span>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-indigo-405">BAG CONTENTS</span>
                  <span className="text-base font-extrabold text-emerald-400">₹{newOrderAlert.total}</span>
                </div>

                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {newOrderAlert.items
                    .filter(item => item.product.sellerId === resolvedSellerId || item.product.sellerName.toLowerCase() === resolvedStoreName.toLowerCase())
                    .map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <span className="text-slate-200 font-semibold">
                          {item.product.name} <span className="text-amber-400 font-black ml-1">x {item.quantity}</span>
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">{item.product.unit}</span>
                      </div>
                    ))}
                </div>

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex items-start gap-1">
                  <span className="shrink-0 text-slate-500 font-black">📍 COORDS:</span>
                  <span className="text-slate-300 font-bold truncate">{newOrderAlert.address}</span>
                </div>
              </div>
            </div>

            {/* Direct Actions */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleAcceptOrder(newOrderAlert.id)}
                className="py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-emerald-950/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <CheckCircle2 className="w-4 h-4" />
                ACCEPT ORDER
              </button>
              
              <button
                type="button"
                onClick={() => { 
                  setRejectingOrder(newOrderAlert); 
                  setNewOrderAlert(null); 
                  setRejectionReason('Item out of stock'); 
                }}
                className="py-3.5 bg-slate-800 hover:bg-slate-750 text-rose-400 border border-slate-800 hover:border-red-905/30 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 uppercase"
              >
                <XCircle className="w-4 h-4 text-red-500" />
                REJECT TICKET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DIALOG: SPECIFY ORDER REJECTION DETAILS --- */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 max-w-sm w-full text-left space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Reject Order #{rejectingOrder.id}</h3>
              <p className="text-[11px] text-slate-450 mt-1 uppercase font-bold">Please specify a cancellation code reason for reporting logs</p>
            </div>

            <form onSubmit={handleRejectOrderSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Rejection Code</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                  required
                >
                  <option value="Item out of stock">Shelf Out of stock / Replenishment lag</option>
                  <option value="Prepare queue overloaded">Preparation team queue flooded</option>
                  <option value="Store closing soon">Store closing for deep sanitize cycle</option>
                  <option value="Rider unreachable for delivery">Rider routing unreachable / rain delay</option>
                  <option value="Power outage in Dark Store cold room">Technical failure in cold storage room</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FLOATING EDIT CATALOG MODAL --- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-5 text-left animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Edit Product Specifications</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Configure variants, discount models, and promotional tags</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base p-1.5 hover:bg-slate-50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Retail Price (₹)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-extrabold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Strike price (₹)</label>
                  <input
                    type="number"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-extrabold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weight / Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Amount</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Variants (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. 250 g, 500 g, 1 kg"
                    value={editVariants}
                    onChange={(e) => setEditVariants(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-2.5 bg-slate-100 px-4 rounded-xl">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsTrending}
                    onChange={(e) => setEditIsTrending(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  🔥 Trending
                </label>

                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsRecommended}
                    onChange={(e) => setEditIsRecommended(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  ✨ Recommended
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Image URL</label>
                <input
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs h-16 resize-none focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
