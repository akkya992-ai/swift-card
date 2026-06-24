import React, { useState, useEffect, useMemo, useRef } from 'react';
import RestaurantInfographic from './RestaurantInfographic';
import RestaurantAdminPortal from './RestaurantAdminPortal';
import TiffinAdminPortal from './TiffinAdminPortal';
import { 
  ShieldAlert, 
  IndianRupee, 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Truck, 
  Check, 
  X, 
  Clipboard, 
  RefreshCw,
  Store,
  Bookmark,
  PowerOff,
  Calendar,
  Award,
  Zap,
  BarChart3,
  Percent,
  Plus,
  Trash2,
  Edit3,
  Search,
  PlusCircle,
  Tag,
  Image,
  Layers,
  UserCheck,
  MessageSquare,
  Smartphone,
  Bell,
  Activity,
  Radio,
  Utensils,
  Coffee,
  Database,
  HardDrive
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Order, SellerProfile, RiderProfile, Product } from '../types';
import { playNewOrderAlarm } from '../audioUtils';

interface AdminDashboardProps {
  userProfile: any;
  onLogout: () => void;
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

export default function AdminDashboard({ userProfile, onLogout }: AdminDashboardProps) {
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  
  // Tab control states: 'analytics' | 'products' | 'orders' | 'customers' | 'coupons' | 'banners' | 'requests' | 'notifications' | 'infographic' | 'backups' | 'tiffins' | 'updates'
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'customers' | 'coupons' | 'banners' | 'requests' | 'notifications' | 'infographic' | 'backups' | 'tiffins' | 'updates'>('analytics');

  // Outbound Notification Simulation logs state
  const [outboundNotifications, setOutboundNotifications] = useState<any[]>([]);
  const [fcmDiagnostics, setFcmDiagnostics] = useState<{
    firebaseConnected: boolean;
    activeFcmTokens: number;
    lastNotificationSent: string | null;
    lastNotificationDelivered: string | null;
    failedDeliveriesCount: number;
    totalNotificationsCount: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    alertLogs?: any[];
  } | null>(null);

  // FCM Cloud Messaging Preferences & Inbox
  const [fcmToken, setFcmToken] = useState(() => {
    return userProfile.fcmToken || localStorage.getItem('swiftcart_fcm_token_admin') || 'fcm_tok_admin_' + Math.random().toString(36).substring(2, 11).toUpperCase() + '_android';
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
      localStorage.setItem('swiftcart_fcm_token_admin', fcmToken);

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
          setFcmMessage('FCM settings synced successfully with best-effort retry fallback mechanisms. 🎉');
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

  // Role Requests approval flow states
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Backups and Disaster Recovery states
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [restoreRunning, setRestoreRunning] = useState(false);
  const [rawBackupInput, setRawBackupInput] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);

  // APK Update Management States
  const [apkLatestVersion, setApkLatestVersion] = useState('1.2.0');
  const [apkMinSupported, setApkMinSupported] = useState('1.0.0');
  const [apkForceUpdate, setApkForceUpdate] = useState(false);
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app/apk/dailymart.apk');
  const [apkReleaseNotes, setApkReleaseNotes] = useState('Daily Mart version 1.2.0 is now available! Includes extremely low startup overheads, GPS distance calculated live tracking, and robust offline queue delivery engines.');
  const [apkLoading, setApkLoading] = useState(false);
  const [apkSuccess, setApkSuccess] = useState(false);
  const [apkError, setApkError] = useState('');
  const [simInstalledVersion, setSimInstalledVersion] = useState('1.0.0');

  const fetchBackupsList = async () => {
    setBackupsLoading(true);
    try {
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch('/api/backup/list', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data);
      }
    } catch (e) {
      console.error('Failed to load backup list', e);
    } finally {
      setBackupsLoading(false);
    }
  };

  const triggerManualBackup = async () => {
    setBackupRunning(true);
    try {
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch('/api/backup/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        setStatusMsg('Live database backed up successfully! 💾');
        setTimeout(() => setStatusMsg(''), 4000);
        await fetchBackupsList();
      } else {
        const errData = await res.json();
        alert(`Backup failed: ${errData.error || 'Server error'}`);
      }
    } catch (e: any) {
      alert(`Network error running backup: ${e.message}`);
    } finally {
      setBackupRunning(false);
    }
  };

  const triggerRestore = async (filename: string | null, rawJson?: string) => {
    setRestoreRunning(true);
    try {
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const body: any = {};
      if (rawJson) {
        try {
          body.rawBackupData = JSON.parse(rawJson);
        } catch (jsonErr: any) {
          alert(`Invalid backup JSON: ${jsonErr.message}`);
          setRestoreRunning(false);
          return;
        }
      } else if (filename) {
        body.filename = filename;
      } else {
        return;
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${savedToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setStatusMsg('Database restored & synced successfully! 🎉');
        setTimeout(() => setStatusMsg(''), 4000);
        setShowRestoreConfirm(null);
        setRawBackupInput('');
        await fetchMetrics();
        await fetchBackupsList();
      } else {
        const errData = await res.json();
        alert(`Restore failed: ${errData.error || 'Server error'}`);
      }
    } catch (e: any) {
      alert(`Network error restoring backup: ${e.message}`);
    } finally {
      setRestoreRunning(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backups') {
      fetchBackupsList();
    }
  }, [activeTab]);

  const fetchApkSettingsOnLoad = async () => {
    setApkLoading(true);
    setApkError('');
    setApkSuccess(false);
    try {
      const res = await fetch('/api/app-version');
      if (res.ok) {
        const data = await res.json();
        setApkLatestVersion(data.latestVersion || '1.2.0');
        setApkMinSupported(data.minimumSupportedVersion || '1.0.0');
        setApkForceUpdate(!!data.forceUpdate);
        setApkDownloadUrl(data.apkUrl || '');
        setApkReleaseNotes(data.releaseNotes || '');
      } else {
        setApkError('Failed to fetch app settings from the server');
      }
    } catch (e: any) {
      setApkError(`Network error loading application settings: ${e.message}`);
    } finally {
      setApkLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'updates') {
      fetchApkSettingsOnLoad();
    }
  }, [activeTab]);

  // UI status messages
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedOrderRow, setSelectedOrderRow] = useState<string | null>(null);

  // Live alerts for newly placed global platform orders
  const [seenOrderIds, setSeenOrderIds] = useState<string[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<any | null>(null);
  const isFirstLoadRef = useRef(true);

  // Search/Filter states
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Coupon Creation states
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'flat_discount'>('flat_discount');
  const [newCouponValue, setNewCouponValue] = useState(0);
  const [newCouponMin, setNewCouponMin] = useState(0);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Banner Creation states
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerCategory, setNewBannerCategory] = useState('vegetables');
  const [newBannerBadge, setNewBannerBadge] = useState('Limited Offer');

  // Product Creator/Editor Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formOriginalPrice, setFormOriginalPrice] = useState(0);
  const [formImage, setFormImage] = useState('');
  const [formCategory, setFormCategory] = useState('vegetables');
  const [formStock, setFormStock] = useState(10);
  const [formUnit, setFormUnit] = useState('1 unit');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formBestSeller, setFormBestSeller] = useState(false);

  // Background offline alarm simulation states for Super Admin
  const [swSimulating, setSwSimulating] = useState(false);
  const [swCountdown, setSwCountdown] = useState(0);

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
        const linkedOrderId = orders[0]?.id || ('SIM-' + Math.floor(1000 + Math.random() * 9000));
        navigator.serviceWorker.controller?.postMessage({
          type: 'SIMULATE_BACKGROUND_ALARM',
          delay: 100,
          role: 'admin',
          orderId: linkedOrderId
        });
      }
    }, 1000);
  };

  // Active synthesizer siren alarm effect
  useEffect(() => {
    if (!newOrderAlert) return;

    const playSiren = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sawtooth'; // harsher siren/alarm waveform
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Dual-tone high-low siren pattern
        playTone(987.77, now, 0.3); // High pitch Beep
        playTone(783.99, now + 0.35, 0.3); // Low pitch Beep
      } catch (err) {
        console.warn('Web Audio Context block: ', err);
      }
    };

    // Play immediately and repeat every 1.5 seconds
    playSiren();
    const sirenInterval = setInterval(() => {
      playSiren();
    }, 1500);

    return () => clearInterval(sirenInterval);
  }, [newOrderAlert]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // Load orders
      const oRes = await fetch('/api/orders');
      if (!oRes.ok) {
        if (oRes.status === 401 || oRes.status === 403) {
          throw new Error('Your admin session has expired (Unauthorized 401/403). Please sign out and log back in.');
        }
        throw new Error(`Failed to load platform orders (HTTP ${oRes.status})`);
      }
      const oData: any[] = await oRes.json();
      setOrders(oData);

      // Alert algorithm for Admin for any newly placed order
      const placedOrders = oData.filter(o => o.status === 'placed');
      if (placedOrders.length > 0) {
        if (isFirstLoadRef.current) {
          setSeenOrderIds(oData.map(o => o.id));
          isFirstLoadRef.current = false;
        } else {
          const freshTicket = placedOrders.find(o => !seenOrderIds.includes(o.id));
          if (freshTicket) {
            setNewOrderAlert(freshTicket);
            setSeenOrderIds(prev => [...prev, freshTicket.id]);
            
            // Audio click/pop tone trigger (Guaranteed offline-ready synthetic sound fallback)
            playNewOrderAlarm();
            try {
              const ring = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
              ring.volume = 0.5;
              ring.play().catch(() => {});
            } catch (se) {
              console.log("Admin sound bypassed", se);
            }
          }
        }
      }

      // Load sellers
      const sRes = await fetch('/api/sellers');
      if (!sRes.ok) {
        throw new Error(`Failed to load seller directories (HTTP ${sRes.status})`);
      }
      const sData = await sRes.json();
      setSellers(sData);

      // Load riders
      const rRes = await fetch('/api/riders');
      if (!rRes.ok) {
        throw new Error(`Failed to load rider directories (HTTP ${rRes.status})`);
      }
      const rData = await rRes.json();
      setRiders(rData);

      // Load products
      const pRes = await fetch('/api/products');
      if (!pRes.ok) {
        throw new Error(`Failed to load product catalog (HTTP ${pRes.status})`);
      }
      const pData = await pRes.json();
      setProducts(pData);

      // Load customers
      const cRes = await fetch('/api/customers');
      if (!cRes.ok) {
        throw new Error(`Failed to load customer profiles (HTTP ${cRes.status})`);
      }
      const cData = await cRes.json();
      setCustomers(cData);

      // Load coupons
      try {
        const cpRes = await fetch('/api/coupons');
        if (cpRes.ok) {
          const cpData = await cpRes.json();
          setCoupons(cpData);
        }
      } catch (cpE) {
        console.warn('Optional coupons load failed', cpE);
      }

      // Load banners
      try {
        const bRes = await fetch('/api/banners');
        if (bRes.ok) {
          const bData = await bRes.json();
          setBanners(bData);
        }
      } catch (bE) {
        console.warn('Optional banners load failed', bE);
      }

      // Load outbound notifications
      try {
        const notRes = await fetch('/api/outbound-notifications');
        if (notRes.ok) {
          const notData = await notRes.json();
          setOutboundNotifications(notData || []);
        }
      } catch (notE) {
        console.warn('Optional outbound notifications load failed', notE);
      }

      // Load FCM diagnostics
      try {
        const diagRes = await fetch('/api/notifications/diagnostics');
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setFcmDiagnostics(diagData);
        }
      } catch (de) {
        console.warn('Diagnostics fetch failed', de);
      }

      // Load role requests
      await fetchRoleRequests();

      setInitError(null);
      setInitLoading(false);

    } catch (e: any) {
      console.error('Error fetching admin metrics', e);
      if (initLoading || orders.length === 0) {
        setInitError(e.message || 'Unknown initialization error occurred. Please verify secure datastore status.');
      }
    }
  };

  const fetchRoleRequests = async () => {
    try {
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch('/api/role-requests', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoleRequests(data);
      }
    } catch (err) {
      console.warn('Error fetching role requests:', err);
    }
  };

  const handleReviewRequest = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    setRequestsLoading(true);
    setRequestsError('');
    try {
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch(`/api/role-requests/${id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        body: JSON.stringify({ status, rejectionReason: reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review role request.');
      
      setRejectionRequestId(null);
      setRejectionReason('');
      await fetchRoleRequests();
      await fetchMetrics(); // refresh other lists too since role approval could create new seller/rider profiles
    } catch (err: any) {
      setRequestsError(err.message || 'Error occurred while reviewing request.');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveSeller = async (sellerId: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${sellerId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setStatusMsg(`Store status updated to ${status} successfully.`);
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      } else {
        alert('Failed to update seller store status.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setStatusMsg(`Order status overridden to: ${status}`);
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dispatched',
          riderId: rider.id,
          riderName: rider.name,
          riderPhone: rider.phone
        })
      });

      if (res.ok) {
        setStatusMsg(`Rider ${rider.name} assigned. Order dispatched.`);
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Coupons Manager handlers
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: newCouponValue,
          minOrderValue: newCouponMin,
          description: newCouponDesc
        })
      });
      if (res.ok) {
        setNewCouponCode('');
        setNewCouponDesc('');
        setNewCouponValue(0);
        setNewCouponMin(0);
        setStatusMsg('Active promotional coupon created successfully.');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Are you certain you want to purge coupon [${code}]?`)) return;
    try {
      const res = await fetch(`/api/coupons/${code}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg(`Coupon ${code} purged from directory.`);
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ads/Banner managers handlers
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle || !newBannerImage) return;
    setLoading(true);
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBannerTitle,
          subtitle: newBannerSubtitle,
          imageUrl: newBannerImage,
          categoryLink: newBannerCategory,
          discountBadge: newBannerBadge
        })
      });
      if (res.ok) {
        setNewBannerTitle('');
        setNewBannerSubtitle('');
        setNewBannerImage('');
        setStatusMsg('Promo banner broadcasted successfully!');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you dynamic banner to be delisted from customers home page?')) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Promo banner purged.');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Customers manager handlers
  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to ban/purge this customer index from Daily Mart database?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('Customer profile safely purged from database.');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      } else {
        alert(`Deletion failed: ${data.error || 'Server error occurred'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Deletion failed: ${e.message || 'Network error occurred'}`);
    }
  };

  const handleDeleteSeller = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this Seller and ALL their associated products, inventory, and orders from Supabase? This action is IRREVERSIBLE.')) return;
    try {
      console.log(`[ADMIN DELETE SELLER] Deleting seller with ID: ${id}`);
      const res = await fetch(`/api/sellers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('Seller profile and all nested shop data permanently deleted.');
        setTimeout(() => setStatusMsg(''), 4000);
        // Refresh local listing of sellers
        setSellers(prev => prev.filter(s => s.id !== id));
        fetchMetrics();
      } else {
        alert(`Deletion failed: ${data.error || 'Server error occurred'}`);
      }
    } catch (e: any) {
      console.error('[ADMIN DELETE SELLER ERROR]', e);
      alert(`Deletion failed: ${e.message || 'Network error occurred'}`);
    }
  };

  const handleDeleteRider = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this Delivery Rider and unset their assigned orders from Supabase? This action is IRREVERSIBLE.')) return;
    try {
      console.log(`[ADMIN DELETE RIDER] Deleting rider with ID: ${id}`);
      const res = await fetch(`/api/riders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('Rider profile and related assets completely deleted.');
        setTimeout(() => setStatusMsg(''), 4000);
        // Refresh local listing of riders
        setRiders(prev => prev.filter(r => r.id !== id));
        fetchMetrics();
      } else {
        alert(`Deletion failed: ${data.error || 'Server error occurred'}`);
      }
    } catch (e: any) {
      console.error('[ADMIN DELETE RIDER ERROR]', e);
      alert(`Deletion failed: ${e.message || 'Network error occurred'}`);
    }
  };

  // Products CRUD Management
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice(0);
    setFormOriginalPrice(0);
    setFormImage('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200');
    setFormCategory('vegetables');
    setFormStock(25);
    setFormUnit('500 g');
    setFormDescription('Fresh, organic healthy items straight from certified organic partner farmlands.');
    setFormFeatured(false);
    setFormBestSeller(false);
    setShowProductModal(true);
  };

  const handleOpenProductEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice || p.price);
    setFormImage(p.image);
    setFormCategory(p.category);
    setFormStock(p.stock);
    setFormUnit(p.unit);
    setFormDescription(p.description || '');
    setFormFeatured(p.isTrending || false);
    setFormBestSeller(p.isRecommended || false);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || formPrice <= 0 || !formImage) {
      alert('Product Name, Price, and Image Link are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formName,
        price: Number(formPrice),
        originalPrice: Number(formOriginalPrice || formPrice),
        image: formImage,
        category: formCategory,
        stock: Number(formStock),
        unit: formUnit,
        description: formDescription,
        isTrending: formFeatured,
        isRecommended: formBestSeller,
        sellerId: 'admin_managed',
        sellerName: 'Daily Mart Express Depot',
        deliveryMinutes: 10
      };

      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        setStatusMsg(editingProduct ? 'Inventory product modified successfully.' : 'New fresh product listed successfully!');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to modify database inventory.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you certain you want to de-list this inventory product from the marketplace?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Product removed from active catalog.');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      } else {
        alert('Failed to delete catalog item.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Admin Analytics row
  const adminTodayDateStr = new Date().toDateString();
  const isAdminDateToday = (dateStr?: string) => {
    try {
      if (!dateStr) return false;
      return new Date(dateStr).toDateString() === adminTodayDateStr;
    } catch {
      return false;
    }
  };

  const adminTodaysOrders = orders.filter(o => isAdminDateToday(o.createdAt)).length;
  const adminTodaysCompletedOrders = orders.filter(o => o.status === 'delivered' && isAdminDateToday(o.deliveredAt || o.createdAt)).length;
  const adminTotalOrders = orders.length;
  const adminTotalCompletedOrders = orders.filter(o => o.status === 'delivered').length;
  const adminTodaysRevenue = orders.filter(o => o.status === 'delivered' && isAdminDateToday(o.deliveredAt || o.createdAt)).reduce((sum, o) => sum + o.total, 0);
  const adminTotalRevenue = orders.reduce((sum, o) => o.status === 'delivered' ? sum + o.total : sum, 0);

  const totalSalesVolume = adminTotalRevenue;
  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length;
  const approvedSellersCount = sellers.filter(s => s.status === 'approved').length;

  // LAST 7 DAYS & CATEGORIES MAPPING PROPERTIES
  const CATEGORIES_MAP = useMemo(() => [
    { id: 'vegetables', name: 'Vegetables', color: '#10B981' },
    { id: 'fruits', name: 'Fruits', color: '#EF4444' },
    { id: 'dairy-eggs', name: 'Dairy & Eggs', color: '#3B82F6' },
    { id: 'munchies', name: 'Munchies', color: '#F59E0B' },
    { id: 'drinks', name: 'Cold Drinks', color: '#06B6D4' },
    { id: 'instant', name: 'Instant & Frozen', color: '#8B5CF6' },
    { id: 'bakery', name: 'Bakery', color: '#EC4899' },
    { id: 'sweets', name: 'Sweets', color: '#D946EF' },
    { id: 'baby-care', name: 'Baby Care', color: '#6366F1' },
    { id: 'pet-care', name: 'Pet Care', color: '#A855F7' },
    { id: 'fresh-meat', name: 'Fresh Meat', color: '#BE123C' },
    { id: 'tiffin', name: 'Tiffin', color: '#0D9488' },
  ], []);

  const [selectedMetric, setSelectedMetric] = useState<'count' | 'quantity' | 'revenue'>('count');

  const last7Days = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  }, []);

  const getYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const chartData = useMemo(() => {
    return last7Days.map(day => {
      const dateStr = getYYYYMMDD(day);
      const label = day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      
      const dataPoint: any = {
        dateLabel: label,
        dateKey: dateStr,
      };

      CATEGORIES_MAP.forEach(cat => {
        dataPoint[cat.name] = 0;
      });

      const dailyOrders = orders.filter(o => {
        if (o.status === 'rejected' || o.status === 'refunded') return false;
        const oDate = new Date(o.createdAt);
        return getYYYYMMDD(oDate) === dateStr;
      });

      dailyOrders.forEach(o => {
        const categoriesInOrder = new Set<string>();

        (o.items || []).forEach(item => {
          if (!item || !item.product) return;
          const catId = item.product.category;
          const catObj = CATEGORIES_MAP.find(c => c.id === catId);
          const catName = catObj ? catObj.name : 'Others';

          if (selectedMetric === 'count') {
            categoriesInOrder.add(catName);
          } else if (selectedMetric === 'quantity') {
            dataPoint[catName] = (dataPoint[catName] || 0) + (item.quantity || 0);
          } else if (selectedMetric === 'revenue') {
            dataPoint[catName] = (dataPoint[catName] || 0) + ((item.product.price || 0) * (item.quantity || 0));
          }
        });

        if (selectedMetric === 'count') {
          categoriesInOrder.forEach(catName => {
            dataPoint[catName] = (dataPoint[catName] || 0) + 1;
          });
        }
      });

      let dailyTotal = 0;
      CATEGORIES_MAP.forEach(cat => {
        dailyTotal += dataPoint[cat.name] || 0;
      });
      dataPoint['Total'] = dailyTotal;

      return dataPoint;
    });
  }, [orders, last7Days, selectedMetric, CATEGORIES_MAP]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    CATEGORIES_MAP.forEach(cat => {
      totals[cat.name] = 0;
    });

    chartData.forEach(dp => {
      CATEGORIES_MAP.forEach(cat => {
        totals[cat.name] += (dp[cat.name] as number) || 0;
      });
    });

    return totals;
  }, [chartData, CATEGORIES_MAP]);

  const totalVolume = useMemo(() => {
    let sum = 0;
    CATEGORIES_MAP.forEach(cat => {
      sum += categoryTotals[cat.name] || 0;
    });
    return sum;
  }, [categoryTotals, CATEGORIES_MAP]);

  const topCategory = useMemo(() => {
    let maxVal = -1;
    let maxCat = 'None';
    CATEGORIES_MAP.forEach(cat => {
      const val = categoryTotals[cat.name] || 0;
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat.name;
      }
    });
    return { name: maxCat, value: maxVal };
  }, [categoryTotals, CATEGORIES_MAP]);

  const mostActiveDay = useMemo(() => {
    let maxVal = -1;
    let maxLabel = 'None';
    chartData.forEach(dp => {
      let dailySum = 0;
      CATEGORIES_MAP.forEach(cat => {
        dailySum += dp[cat.name] || 0;
      });
      if (dailySum > maxVal) {
        maxVal = dailySum;
        maxLabel = dp.dateLabel;
      }
    });
    return { label: maxLabel, value: maxVal };
  }, [chartData, CATEGORIES_MAP]);

  const pieChartData = useMemo(() => {
    const list = CATEGORIES_MAP.map(cat => ({
      name: cat.name,
      value: categoryTotals[cat.name] || 0,
      color: cat.color
    })).filter(item => item.value > 0);

    if (list.length === 0) {
      return [{ name: 'Placeholder', value: 1, color: '#94A3B8' }];
    }
    return list;
  }, [categoryTotals, CATEGORIES_MAP]);

  // Handle Search Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/15 rounded-full blur-2xl animate-pulse animate-duration-3000"></div>
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl animate-pulse animate-duration-3000"></div>

          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              Initialization Blocked
            </span>
            <h3 className="text-xl font-black text-white tracking-tight mt-3">Operations Suite Unreachable</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              We encountered a connection block or session expiry while pulling your admin terminal data. This usually happens if you are disconnected or the database is restarting.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left font-mono text-[11px] text-red-400/95 leading-normal break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
            <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Diagnostic Detail:</div>
            {initError}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                setInitError(null);
                setInitLoading(true);
                fetchMetrics();
              }}
              className="py-3 px-5 bg-gradient-to-r from-red-650 to-amber-600 hover:from-red-600 hover:to-amber-550 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              RE-ESTABLISH CONNECTION
            </button>
            <button
              onClick={onLogout}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer border border-slate-750/60 flex items-center justify-center gap-2"
            >
              <PowerOff className="w-4 h-4" />
              SIGN OFF OPERATOR
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-3xl border border-slate-800 animate-ping"></div>
            <div className="absolute inset-2 rounded-2xl border-2 border-slate-700/40 border-t-amber-500 animate-spin" style={{ animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-black tracking-widest text-slate-550 uppercase">Securing Command Core</h4>
            <h2 className="text-base font-black text-white tracking-tight">Accessing Daily Mart Admin...</h2>
            <p className="text-[11px] text-slate-400 font-medium max-w-xs mx-auto">
              Decrypting system credentials, establishing secure session, and auditing live transaction lanes.
            </p>
          </div>
          <div className="flex justify-center gap-1.5 pt-1">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-6 space-y-6">
      
      {/* Dynamic alert toaster */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-emerald-400 font-bold border border-emerald-900 px-5 py-3 rounded-2xl shadow-2xl animate-bounce-subtle flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs">{statusMsg}</span>
        </div>
      )}

      {newOrderAlert && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-5 text-white animate-bounce-subtle">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h4 className="text-xs font-black text-amber-500 tracking-tight flex flex-wrap items-center gap-2">
              <span>🚨 NEW PLATFORM Order!</span>
              <span className="bg-red-650 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono animate-pulse tracking-widest">
                ALARM RESONATING
              </span>
            </h4>
            <button 
              onClick={() => setNewOrderAlert(null)}
              className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer animate-pulse"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2.5 text-xs text-left">
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Order ID: <span className="text-white font-extrabold">#{newOrderAlert.id}</span></span>
              <span className="text-emerald-400 font-extrabold">₹{newOrderAlert.total}</span>
            </div>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              Customer <span className="text-white font-bold">{newOrderAlert.customerName || 'Valued Resident'}</span> just placed a checkout ticket for <span className="text-amber-455 font-black">{newOrderAlert.items?.length || 1} items</span>!
            </p>
            <div className="text-[10px] text-slate-500 pt-0.5 font-medium">
              📍 Destination: {newOrderAlert.address}
            </div>
            <button 
              onClick={() => {
                setActiveTab('orders');
                setNewOrderAlert(null);
              }}
              className="mt-2 w-full py-2.5 bg-slate-800 hover:bg-slate-755 text-amber-400 hover:text-amber-350 font-black text-center text-[11px] rounded-xl border border-amber-950/50 transition cursor-pointer"
            >
              INVESTIGATE TICKET
            </button>
          </div>
        </div>
      )}

      {/* ADMIN TITLE BOX */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="text-left">
          <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200. flex items-center gap-1 w-max">
            🔑 Certified Root Admin Access
          </span>
          <h2 className="text-2xl font-black text-slate-950 mt-1 tracking-tight">Daily Mart Operations Admin</h2>
          <p className="text-xs text-slate-450 font-semibold mt-0.5">Control live transactions, delist inventory, inspect demographics, and configure campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchMetrics} 
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button 
            onClick={onLogout} 
            className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-2xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <PowerOff className="w-4 h-4" /> Sign Off
          </button>
        </div>
      </div>

      {/* WIDE CONTROL TAB NAVIGATION */}
      <div className="flex flex-wrap bg-white p-1.5 border border-slate-100 rounded-2xl gap-1 overflow-x-auto shadow-xs select-none">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'analytics' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 home-tab'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics &amp; Fleet
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'products' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Products Shelf
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'orders' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Order Pipelines
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'customers' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Customer Index
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'coupons' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" /> Coupons Manager
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'banners' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Image className="w-4 h-4" /> Ads &amp; Banners
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'requests' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Role Approvals
          {roleRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-4 text-center animate-bounce">
              {roleRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'notifications' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Outbox Alerts
          {outboundNotifications.length > 0 && (
            <span className="bg-sky-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
              {outboundNotifications.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('infographic')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'infographic' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-700 bg-emerald-500/5'
          }`}
        >
          <Utensils className="w-4 h-4" /> Manage Restaurants
        </button>
        <button
          onClick={() => setActiveTab('tiffins')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'tiffins' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-teal-750 bg-teal-500/5'
          }`}
        >
          <Coffee className="w-4 h-4" /> Manage Tiffins
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'backups' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-500 hover:text-indigo-700 bg-indigo-500/5'
          }`}
        >
          <Database className="w-4 h-4" /> Server Backups
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'updates' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-orange-700 bg-orange-500/5'
          }`}
        >
          <Smartphone className="w-4 h-4" /> APK Updates
        </button>
      </div>

      {/* TAB CONTAINER 1: ANALYTICS & FLEET */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Active Mode Background Alarm Simulator and Heed */}
          <div className="bg-gradient-to-br from-red-500/10 via-amber-500/5 to-slate-50 border border-red-500/20 rounded-[32px] p-6 shadow-xs space-y-4 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider">
                  🚨 Active-Mode Super Admin Alarm
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  Super Admin Real-Time Platform Sirens Active (24/7 Perpetual Support)
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
          
          {/* Stats Bar KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Orders</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">{adminTodaysOrders}</h4>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">Pending + Delivered</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Completed</p>
              <h4 className="text-xl font-black font-mono mt-2 text-emerald-600">{adminTodaysCompletedOrders}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Delivered today</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">{adminTotalOrders}</h4>
              <p className="text-[10px] text-slate-500 font-bold mt-1">All-time carts</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Completed</p>
              <h4 className="text-xl font-black font-mono mt-2 text-indigo-600">{adminTotalCompletedOrders}</h4>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">All-time delivered</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono text-teal-600">Today's Revenue</p>
              <h4 className="text-xl font-black font-mono mt-2 text-teal-600">₹{adminTodaysRevenue.toLocaleString('en-IN')}</h4>
              <p className="text-[10px] text-teal-600 font-bold mt-1">Settled today</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h4 className="text-xl font-black font-mono mt-2 text-emerald-700">₹{adminTotalRevenue.toLocaleString('en-IN')}</h4>
              <p className="text-[10px] text-emerald-700 font-bold mt-1">All-time sales</p>
            </div>
          </div>

          {/* Recharts Graphics */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 text-left">
              <div>
                <h3 className="text-base font-black text-slate-950">Intelligent 7-Day Sales &amp; Departments Metrics</h3>
                <p className="text-xs text-slate-400 mt-0.5">Aggregated category margins and shopping volumes over the last 7 days.</p>
              </div>
              
              <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl shrink-0 select-none">
                <button
                  onClick={() => setSelectedMetric('count')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${
                    selectedMetric === 'count' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setSelectedMetric('quantity')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${
                    selectedMetric === 'quantity' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quantity
                </button>
                <button
                  onClick={() => setSelectedMetric('revenue')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition ${
                    selectedMetric === 'revenue' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Revenue (₹)
                </button>
              </div>
            </div>

            {totalVolume === 0 ? (
              <div className="p-16 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-3xl">
                Place and deliver some orders in the Customer app first to automatically plot metrics!
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="dateLabel" tick={{ fill: '#64748B', fontSize: 9, fontWeight: '700' }} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 9 }} />
                      <Tooltip />
                      {CATEGORIES_MAP.map(cat => (
                        <Bar key={cat.id} dataKey={cat.name} fill={cat.color} stackId="a" />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60 flex flex-col justify-between">
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400">Share Ratio Index</span>
                    <h5 className="text-xs font-extrabold text-slate-800 mt-1">Department Pie Proportion</h5>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value">
                          {pieChartData.map((e, i) => (
                            <Cell key={`cell-${i}`} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold border-t border-slate-200 pt-2 text-left">
                    {pieChartData.slice(0, 4).map(item => (
                      <div key={item.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-slate-600 truncate">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vendors & Riders Fleets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Vendor List */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-left">Listed Dark Stores &amp; Partners</h3>
              <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-3xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[9.5px] border-b border-slate-100">
                      <th className="px-5 py-4 font-bold">Seller Name</th>
                      <th className="px-5 py-4 font-bold">Registered Email</th>
                      <th className="px-5 py-4 font-bold">Registered Telephone</th>
                      <th className="px-5 py-4 font-bold">Created On</th>
                      <th className="px-5 py-4 font-bold">Partner Status</th>
                      <th className="px-5 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sellers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400 italic">No stores approved yet.</td>
                      </tr>
                    ) : (
                      sellers.map(s => {
                        const displayName = s.ownerName && s.ownerName.trim() ? s.ownerName : (s.storeName && s.storeName.trim() ? s.storeName : (s.id ? `Seller #${s.id.slice(-4)}` : 'Guest Seller'));
                        const avatarLetter = displayName.charAt(0).toUpperCase();

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100/80 text-emerald-800 font-extrabold flex items-center justify-center text-xs uppercase shadow-3xs shrink-0">
                                {avatarLetter}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-slate-800 font-extrabold truncate text-xs">{displayName}</span>
                                <span className="text-[9.5px] font-medium text-slate-400 truncate">Store: {s.storeName || 'Unknown store'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">{s.email || 'N/A'}</td>
                            <td className="px-5 py-4 font-mono text-slate-700 font-bold whitespace-nowrap">{s.phone || 'N/A'}</td>
                            <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{new Date(s.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-block text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${
                                s.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 
                                s.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-150' :
                                'bg-amber-50 text-amber-700 border border-amber-150'
                              }`}>{s.status}</span>
                            </td>
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                {s.status !== 'approved' && (
                                  <button 
                                    onClick={() => handleApproveSeller(s.id, 'approved')} 
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Approve Seller"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {s.status !== 'rejected' && (
                                  <button 
                                    onClick={() => handleApproveSeller(s.id, 'rejected')} 
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Reject Seller"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteSeller(s.id)} 
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-xl transition cursor-pointer active:scale-95"
                                  title="Delete Seller Permanent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riders List */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-left">Delivery Fleet Partners</h3>
              <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-3xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[9.5px] border-b border-slate-100">
                      <th className="px-5 py-4 font-bold">Rider Name</th>
                      <th className="px-5 py-4 font-bold">Registered Telephone</th>
                      <th className="px-5 py-4 font-bold">Vehicle Number</th>
                      <th className="px-5 py-4 font-bold">Created On</th>
                      <th className="px-5 py-4 text-right font-bold">Current Status</th>
                      <th className="px-5 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {riders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400 italic">No rider units configured.</td>
                      </tr>
                    ) : (
                      riders.map(r => {
                        const displayName = r.name && r.name.trim() ? r.name : (r.id ? `Rider #${r.id.slice(-4)}` : 'Guest Rider');
                        const avatarLetter = displayName.charAt(0).toUpperCase();

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100/80 text-indigo-800 font-extrabold flex items-center justify-center text-xs uppercase shadow-3xs shrink-0">
                                {avatarLetter}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-slate-800 font-extrabold truncate text-xs">{displayName}</span>
                                {r.id && <span className="text-[9px] text-slate-400 font-mono tracking-tight select-all truncate">UID: {r.id}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono text-slate-700 font-bold whitespace-nowrap">{r.phone || 'N/A'}</td>
                            <td className="px-5 py-4 font-mono text-slate-700 font-medium whitespace-nowrap">{r.vehicleNumber || 'N/A'}</td>
                            <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <span className={`inline-block text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${
                                r.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 
                                r.status === 'delivering' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150/40 animate-pulse' :
                                'bg-slate-50 text-slate-450 border border-slate-150'
                              }`}>{r.status}</span>
                            </td>
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteRider(r.id)}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 px-3 py-1.5 rounded-xl transition duration-150"
                                title="Delete Rider Permanent"
                              >
                                Delete Partner
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTAINER 2: PRODUCTS SHELF */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-6 text-left animate-fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-950">Catalog Shell &amp; Stocks Console</h3>
              <p className="text-xs text-slate-400 mt-0.5">Add, Edit, delist products, adjust stock quantities on dark store depots.</p>
            </div>
            
            <button
              onClick={handleOpenProductCreate}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/10 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Fresh Product
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog products by name or department..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-450 uppercase font-black tracking-wider text-[9px] border-b border-slate-100">
                  <th className="p-4">Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Original price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Delivery time</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-sans">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 flex items-center gap-3">
                      <img src={p.image} className="w-10 h-10 rounded-xl object-cover border" alt="" />
                      <div>
                        <p className="font-extrabold text-slate-900 leading-snug">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.unit}</p>
                        {p.isTrending && <span className="bg-amber-50 text-amber-700 font-bold border border-amber-200. text-[8px] px-1 py-0.5 rounded uppercase mr-1">Featured</span>}
                        {p.isRecommended && <span className="bg-blue-50 text-blue-700 font-bold border border-blue-200. text-[8px] px-1 py-0.5 rounded uppercase">Best Seller</span>}
                      </div>
                    </td>
                    <td className="p-4 capitalize font-bold text-slate-500">{p.category.replace('-', ' ')}</td>
                    <td className="p-4 font-black font-mono text-slate-900">₹{p.price}</td>
                    <td className="p-4 font-bold font-mono text-slate-400 line-through">₹{p.originalPrice || p.price}</td>
                    <td className="p-4 font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        p.stock <= 5 ? 'bg-rose-50 text-rose-700 animate-pulse' :
                        p.stock <= 15 ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-500">{p.deliveryMinutes} mins</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenProductEdit(p)}
                          className="p-1.5 border hover:bg-slate-50 text-slate-600 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 border hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTAINER 3: ORDER PIPELINES */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 space-y-4 text-left animate-fade-in">
          
          <div>
            <h3 className="text-base font-black text-slate-950">Active Orders Pipeline Dispatcher</h3>
            <p className="text-xs text-slate-400 mt-0.5">Inspect incoming customer requests, change statuses to Pending, Confirmed, Shipped, Delivered, Cancelled.</p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                  <th className="p-3.5 font-bold">Order ID</th>
                  <th className="p-3.5 font-bold">Customer Address</th>
                  <th className="p-3.5 font-bold">Bill</th>
                  <th className="p-3.5 font-bold">Pipeline Status</th>
                  <th className="p-3.5 text-right font-bold">Dispatcher Controller</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No checkout placements in sandbox system yet.</td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr 
                      key={o.id}
                      onClick={() => setSelectedOrderRow(selectedOrderRow === o.id ? null : o.id)}
                      className={`border-b border-slate-55 hover:bg-slate-50/40 cursor-pointer ${
                        selectedOrderRow === o.id ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="p-3.5 font-black text-slate-900"># {o.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{o.customerName || 'Loyal Customer'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{o.address}</div>
                      </td>
                      <td className="p-3.5 font-mono font-black text-slate-900">₹{o.total}</td>
                      <td className="p-3.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded-lg ${
                          o.status === 'placed' ? 'bg-amber-50 text-amber-600 border-amber-200. whitespace-nowrap' :
                          o.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-200.' :
                          o.status === 'dispatched' ? 'bg-indigo-50 text-indigo-600 border-indigo-200.' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200.'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Assign Rider select */}
                          {o.status !== 'delivered' && (
                            <select
                              value={o.riderId || ''}
                              onChange={(e) => handleAssignRider(o.id, e.target.value)}
                              className="bg-white border rounded text-[10px] font-bold py-1 px-1.5 focus:outline-none"
                            >
                              <option value="">-- Manual Rider --</option>
                              {riders.map(r => (
                                <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
                              ))}
                            </select>
                          )}

                          {/* Quick manual overrides */}
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className="bg-white border text-xs font-bold py-1 px-1.5 rounded focus:outline-none text-slate-800"
                          >
                            <option value="placed">Placed (Pending)</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="dispatched">Dispatched (Shipped)</option>
                            <option value="delivered">Delivered</option>
                            <option value="rejected">Cancelled (Rejected)</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Details Row Dropdown Info */}
          {selectedOrderRow && (() => {
            const currentSelectedOrder = orders.find(o => o.id === selectedOrderRow);
            if (!currentSelectedOrder) return null;
            return (
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-2 text-xs">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-extrabold text-slate-900">Order Particulars: #{selectedOrderRow}</span>
                  <span className="font-mono text-slate-400">Placed: {currentSelectedOrder.createdAt ? new Date(currentSelectedOrder.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="space-y-1.5 py-1">
                  {(currentSelectedOrder.items || []).map((item, idx) => (
                    <div key={item?.product?.id || idx} className="flex justify-between font-semibold text-slate-600">
                      <span>{item?.product?.name || 'Item'} x {item?.quantity || 1} ({item?.selectedVariant || item?.product?.unit || 'unit'})</span>
                      <span className="font-mono">₹ {(item?.product?.price || 0) * (item?.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between font-black text-slate-900 text-xs">
                  <span>Total bill value (with promo):</span>
                  <span className="font-mono">₹ {currentSelectedOrder.total || 0}</span>
                </div>
              </div>
            );
          })()}

        </div>
      )}

      {/* TAB CONTAINER 4: CUSTOMER INDEX */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-6 text-left animate-fade-in font-sans">
          
          <div>
            <h3 className="text-lg font-black text-slate-950">Registered System Customers</h3>
            <p className="text-xs text-slate-450 mt-0.5">Monitor client details, wallet balances, and de-register profiles to preserve security covenants.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients by name, email, or telephone contact ID..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-3xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[9.5px] border-b border-slate-100">
                  <th className="px-6 py-4.5 font-bold">Customer Name</th>
                  <th className="px-6 py-4.5 font-bold">Registered Email</th>
                  <th className="px-6 py-4.5 font-bold">Registered Telephone</th>
                  <th className="px-6 py-4.5 font-bold">Created On</th>
                  <th className="px-6 py-4.5 text-right font-bold">Delete Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No matching client records discovered.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => {
                    const displayName = c.name && c.name.trim() ? c.name : (c.id ? `Customer #${c.id.slice(-4)}` : 'Guest User');
                    const avatarLetter = displayName.charAt(0).toUpperCase();

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100/85 text-emerald-800 font-extrabold flex items-center justify-center text-xs uppercase shadow-3xs shrink-0">
                            {avatarLetter}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-slate-800 font-extrabold truncate text-xs">{displayName}</span>
                            {c.id && <span className="text-[9px] text-slate-400 font-mono tracking-tight select-all truncate">UID: {c.id}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{c.email || 'N/A'}</td>
                        <td className="px-6 py-4 font-mono text-slate-700 font-bold whitespace-nowrap">{c.phone || 'Firebase-linked'}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">{new Date(c.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="p-2 border border-slate-100 hover:border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-xl transition cursor-pointer active:scale-95"
                            title="Delete customer index"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB CONTAINER 5: COUPONS MANAGER */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left">
          
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 h-max">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Deploy Active Coupon Campaign</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Coupon code</label>
                <input
                  type="text"
                  placeholder="e.g. FLASH30"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold uppercase placeholder:normal-case focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Discount type</label>
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-extrabold focus:outline-none"
                >
                  <option value="flat_discount">Flat Discount (Rupees)</option>
                  <option value="percentage">Percentage Discount (%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 font-sans font-mono">Value</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono focus:outline-none"
                    required
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Min basket</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono focus:outline-none"
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Campaign copy text description</label>
                <input
                  type="text"
                  placeholder="e.g. Save ₹50 on order above ₹150..."
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Ship Campaign Code
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Active Promo Code Registers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map(c => (
                <div key={c.code} className="p-4 bg-slate-50 border rounded-2xl relative flex flex-col justify-between items-start gap-2.5 hover:border-emerald-250 transition-all">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono font-black text-sm bg-slate-900 text-white px-2.5 py-1 rounded-lg tracking-wider">
                      {c.code}
                    </span>
                    <button 
                      onClick={() => handleDeleteCoupon(c.code)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-left font-sans text-xs">
                    <p className="text-slate-450 font-bold uppercase text-[9px] tracking-wide">parameters</p>
                    <p className="font-black text-slate-900 mt-0.5">
                      {c.discountType === 'percentage' ? `${c.discountValue}% Off Percentage` : `₹${c.discountValue} Flat Discount`}
                    </p>
                    <p className="text-slate-400 mt-1 leading-snug">{c.description}</p>
                    <p className="text-[10px] font-bold text-slate-450 mt-1">Min cart basket: ₹{c.minOrderValue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTAINER 6: ADS & BANNERS */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fade-in font-sans">
          
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 h-max">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Register Banner Ad Promo</h3>
            <form onSubmit={handleCreateBanner} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Banner Main Title Copy</label>
                <input
                  type="text"
                  placeholder="e.g. MONSOON SNACKING: 50% OFF"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Banner Subtitle Copy</label>
                <input
                  type="text"
                  placeholder="e.g. Free delivery on orders exceeding 200..."
                  value={newBannerSubtitle}
                  onChange={(e) => setNewBannerSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Abstract image URL Link</label>
                <input
                  type="url"
                  placeholder="e.g. https://images.unsplash.com/..."
                  value={newBannerImage}
                  onChange={(e) => setNewBannerImage(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">Department Link</label>
                  <select
                    value={newBannerCategory}
                    onChange={(e) => setNewBannerCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold focus:outline-none text-slate-700"
                  >
                    <option value="vegetables">🥬 Vegetables</option>
                    <option value="fruits">🍎 Fruits</option>
                    <option value="dairy-eggs">Eggs &amp; Dairy</option>
                    <option value="munchies">Munchies Snacks</option>
                    <option value="drinks">Chilled Sodas</option>
                    <option value="pet-care">🐾 Pet Care</option>
                    <option value="fresh-meat">🥩 Fresh Meat</option>
                    <option value="tiffin">🍱 Tiffin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">Promotion Badge Copy</label>
                  <input
                    type="text"
                    placeholder="e.g. Best Deal"
                    value={newBannerBadge}
                    onChange={(e) => setNewBannerBadge(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Publish Home Banner
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Shedded Live Promo Banners</h3>
            <div className="space-y-4">
              {banners.map(b => (
                <div key={b.id} className="p-3 bg-slate-50 border rounded-2xl flex flex-col md:flex-row items-center gap-4 hover:border-emerald-200 transition">
                  <img src={b.imageUrl} className="w-full md:w-32 h-20 rounded-xl object-cover border" alt="" />
                  <div className="flex-1 text-xs">
                    <span className="bg-yellow-400 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full uppercase">
                      {b.discountBadge || 'Promo'}
                    </span>
                    <h5 className="font-extrabold text-[#00875A] text-sm mt-1">{b.title}</h5>
                    <p className="text-slate-400 font-semibold mt-0.5">{b.subtitle}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Department Link: <span className="text-slate-700 underline capitalize">{b.categoryLink?.replace('-', ' ')}</span></p>
                  </div>
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTAINER 7: ROLE APPROVAL REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6 animate-fade-in font-sans text-left">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-950">Role Approval Requests Pool</h3>
                <p className="text-xs text-slate-400 mt-0.5">Review, approve, or reject applications for Seller and Rider accounts.</p>
              </div>

              {/* Status Filters */}
              <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl w-max">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setFilterStatus(status);
                      setRejectionRequestId(null);
                      setRejectionReason('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      filterStatus === status
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-550 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {requestsError && (
              <div className="bg-rose-50 border border-rose-100/60 p-3.5 rounded-2xl text-xs text-rose-600 font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span> {requestsError}
              </div>
            )}

            {requestsLoading && roleRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold font-sans">
                <div className="inline-block w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p>Loading application pool...</p>
              </div>
            ) : (
              (() => {
                const filtered = roleRequests.filter(r => filterStatus === 'all' || r.status === filterStatus);
                if (filtered.length === 0) {
                  return (
                    <div className="py-12 border border-dashed border-slate-100 rounded-3xl text-center space-y-2">
                      <span className="text-3xl block">📬</span>
                      <p className="text-xs font-black text-slate-900">No Applications Found</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">There are no applications matching the status filter '<b>{filterStatus}</b>'.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    {filtered.map(req => (
                      <div key={req.id} className="bg-slate-50/55 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs hover:border-slate-200 transition">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-sm tracking-wider ${
                              req.targetRole === 'seller' ? 'bg-[#F2F9F5] text-[#00875A]' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {req.targetRole === 'seller' ? '🏪 Seller Applicant' : '🛵 Rider Applicant'}
                            </span>
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider ${
                              req.status === 'pending' ? 'text-amber-600' : req.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              ● {req.status}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-xs">
                            Applicant Name: <span className="font-sans font-medium text-slate-700">{req.fullName || req.userName}</span>
                          </h4>
                          <div className="font-mono text-[10px] text-slate-450 mt-2 space-y-0.5">
                            <p>Phone Number: <span className="font-bold text-slate-700">{req.phoneNumber || req.userPhone || 'N/A'}</span></p>
                            <p>Email: <span className="font-bold text-slate-700">{req.userEmail || 'N/A'}</span></p>
                            <p>Application Date: <span className="font-bold text-slate-700">{new Date(req.createdAt).toLocaleString()}</span></p>
                          </div>

                          {/* Role Specific Details */}
                          <div className="bg-white rounded-xl p-3 border border-slate-100 mt-3 text-xs font-sans space-y-1">
                            {req.targetRole === 'seller' ? (
                              <>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Store Name &amp; Outlet</p>
                                <p className="font-black text-slate-800 text-xs">{req.storeName || 'N/A'}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vehicle Number</p>
                                <p className="font-mono font-black text-slate-800 text-xs">{req.vehicleNumber || 'N/A'}</p>
                              </>
                            )}
                            {req.address && (
                              <div className="mt-1.5 border-t pt-1.5 border-slate-50">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Business Address Location</p>
                                <p className="text-[11px] text-slate-600 font-semibold leading-tight">{req.address}</p>
                              </div>
                            )}
                          </div>

                          {/* Reviewed Information */}
                          {req.reviewedAt && (
                            <div className="mt-3 border-t border-slate-200/50 pt-2.5 text-[11px] font-semibold text-slate-450">
                              <p>Reviewed: <span className="text-slate-700 font-bold">{new Date(req.reviewedAt).toLocaleString()}</span></p>
                              {req.status === 'rejected' && (
                                <p className="text-rose-600 mt-1">Rejection Reason: <span className="font-bold">{req.rejectionReason}</span></p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Approved / Rejection Action Panel */}
                        {req.status === 'pending' && (
                          <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col gap-2">
                            {rejectionRequestId === req.id ? (
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-rose-600 uppercase block pl-0.5">Please provide a rejection reason</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Invalid vehicle papers, or address out of service bounds..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full p-2.5 bg-white border border-rose-200 focus:border-rose-400 rounded-xl text-xs font-semibold focus:outline-none"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => { setRejectionRequestId(null); setRejectionReason(''); }}
                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10.5px] rounded-lg cursor-pointer transition animate-fade-in"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={requestsLoading}
                                    onClick={() => handleReviewRequest(req.id, 'rejected', rejectionReason)}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10.5px] rounded-lg cursor-pointer transition"
                                  >
                                    Submit Rejection
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-lg cursor-pointer transition text-[11px] uppercase tracking-wide"
                                  onClick={() => { setRejectionRequestId(req.id); setRejectionReason(''); }}
                                >
                                  Reject Applicant
                                </button>
                                <button
                                  type="button"
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg cursor-pointer transition text-[11px] uppercase tracking-wide flex items-center gap-1"
                                  disabled={requestsLoading}
                                  onClick={() => handleReviewRequest(req.id, 'approved')}
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve Partner
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* TAB CONTAINER 8: OUTBOUND ALERTS LOGS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-fade-in font-sans text-left">
          
          {/* A. ENTERPRISE PUSH HEALTH DIAGNOSTICS CONTROL BOARD */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6 shadow-xl border border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">System Operations Control Desk</span>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" /> FCM Push Telemetry &amp; Diagnostics Panel
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchMetrics}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-[11px] uppercase tracking-wider text-emerald-400 transition shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-emerald-400" /> Forces Refresh Telemetry
              </button>
            </div>

            {/* DIAGNOSTIC METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shadow-sm text-left">
              
              {/* Metric 1: Firebase Status */}
              <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Firebase Gateway</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Configured Sandbox</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${fcmDiagnostics?.firebaseConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {fcmDiagnostics?.firebaseConnected ? 'CONNECTED' : 'STANDBY (PWA)'}
                  </span>
                </div>
              </div>

              {/* Metric 2: Active FCM Tokens */}
              <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active FCM Devices</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Registered tokens</p>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-emerald-400">
                    {fcmDiagnostics?.activeFcmTokens || 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Device tokens synced</span>
                </div>
              </div>

              {/* Metric 3: Last Notification Sent */}
              <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Last Dispatched</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Latest outbound timestamp</p>
                </div>
                <div className="mt-3">
                  <span className="text-[11px] font-mono block text-indigo-300 truncate font-bold">
                    {fcmDiagnostics?.lastNotificationSent ? new Date(fcmDiagnostics.lastNotificationSent).toLocaleTimeString() : 'No records'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Simulated router ticker</span>
                </div>
              </div>

              {/* Metric 4: Last Delivery Marker */}
              <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Last Delivery</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Acknowledged by target</p>
                </div>
                <div className="mt-3">
                  <span className="text-[11px] font-mono block text-emerald-300 truncate font-bold">
                    {fcmDiagnostics?.lastNotificationDelivered ? new Date(fcmDiagnostics.lastNotificationDelivered).toLocaleTimeString() : 'No records'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Instant gateway ping</span>
                </div>
              </div>

              {/* Metric 5: Failed / Suppressed */}
              <div className="p-4 bg-slate-850/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Failures / Mutes</span>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Unreachable or filter muted</p>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-rose-400">
                    {fcmDiagnostics?.failedDeliveriesCount || 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Redirected to backup cache</span>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2 font-sans">
                  <MessageSquare className="w-5 h-5 text-sky-500" /> Outbound Push SMS &amp; WhatsApp Simulation Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify instant SMS and WhatsApp triggers sent to Telangana store Sellers and super Admins.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchMetrics}
                className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-50 text-[11px] transition shrink-0 cursor-pointer flex items-center gap-1 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Re-sync Logs
              </button>
            </div>

            {/* CHANNEL STATS OVERWRITE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block">FCM Primary Dispatch</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {outboundNotifications.filter(n => n.channel === 'fcm').length}
                </span>
                <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-1">Triggered to device tokens</span>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">PWA Fallback Stores</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {outboundNotifications.filter(n => n.channel === 'pwa' || (!n.channel && n.recipientRole === 'customer')).length}
                </span>
                <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-1">Written to local fallback memory</span>
              </div>
              <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                <span className="text-[9px] font-black text-orange-700 uppercase tracking-wider block">Total Retries Triaged</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {outboundNotifications.reduce((acc, curr) => acc + (curr.retryCount || 0), 0)}
                </span>
                <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-1">Re-delivery sweeps conducted</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider block">Acknowledged Read (Opened)</span>
                <span className="text-xl font-black text-slate-900 block mt-1">
                  {outboundNotifications.filter(n => n.status === 'opened').length}
                </span>
                <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-1">Explicit recipient action taps</span>
              </div>
            </div>

            {/* TRACE LOG FEED TABLE */}
            <div className="space-y-4 pt-4 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Comprehensive Outbound Push Logs &amp; Delivery Traces</span>
              {outboundNotifications.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center space-y-2 bg-slate-25/50">
                  <p className="text-3xl">📭</p>
                  <h4 className="text-sm font-black text-slate-800 font-sans">No notifications have been dispatched on this node</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                    FCM &amp; PWA notifications trigger automatically when customers checkout, riders assign status flags, or admins alter status variables.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="p-4">Notification ID &amp; Target</th>
                          <th className="p-4">Recipient Info</th>
                          <th className="p-4">Delivery Channel</th>
                          <th className="p-4">Status &amp; Handshake</th>
                          <th className="p-4">Retries</th>
                          <th className="p-4">Timestamps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {[...outboundNotifications].reverse().map((not) => (
                          <React.Fragment key={not.id}>
                            <tr className="hover:bg-slate-50/50 transition duration-150">
                              <td className="p-4 font-mono font-bold text-slate-850">
                                <div className="text-[11px] truncate max-w-[140px]">{not.id}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black ${
                                    not.recipientRole === 'admin' ? 'bg-indigo-150 text-indigo-850 border border-indigo-200' :
                                    not.recipientRole === 'seller' ? 'bg-amber-100 text-amber-850 border border-amber-200' :
                                    not.recipientRole === 'rider' ? 'bg-sky-100 text-sky-850 border border-sky-200' :
                                    'bg-slate-100 text-slate-850 border border-slate-200'
                                  }`}>
                                    {not.recipientRole}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-mono">
                                    {not.category || 'alert'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-extrabold text-slate-900">{not.recipientName}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{not.recipientPhone}</div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-mono font-bold border ${
                                  not.channel === 'fcm' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                  not.channel === 'pwa' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  'bg-slate-50 text-slate-600 border-slate-150'
                                }`}>
                                  {not.channel?.toUpperCase() || 'PWA'}
                                </span>
                              </td>
                              <td className="p-4 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${
                                    not.status === 'opened' ? 'bg-emerald-500' :
                                    not.status === 'delivered' ? 'bg-sky-500 animate-pulse' :
                                    not.status === 'failed' ? 'bg-rose-500' : 'bg-slate-350'
                                  }`} />
                                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide">
                                    {not.status?.toUpperCase() || 'SENT'}
                                  </span>
                                </div>
                                {not.failedReason && (
                                  <div className="text-[9.5px] text-rose-500 font-sans mt-1 leading-snug">
                                    ⚠️ {not.failedReason}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-mono font-extrabold text-slate-600 text-[11px]">
                                {not.retryCount || 0}
                              </td>
                              <td className="p-4 text-[11px] text-slate-500 leading-normal font-mono">
                                <div><span className="text-slate-400 block text-[9px] font-bold">SENT:</span> {not.sentAt ? new Date(not.sentAt).toLocaleTimeString() : 'N/A'}</div>
                                {not.deliveredAt && (
                                  <div className="mt-0.5"><span className="text-sky-600 block text-[9px] font-bold">DELIVERED:</span> {new Date(not.deliveredAt).toLocaleTimeString()}</div>
                                )}
                                {not.openedAt && (
                                  <div className="mt-0.5"><span className="text-emerald-600 block text-[9px] font-bold font-sans">OPENED:</span> {new Date(not.openedAt).toLocaleTimeString()}</div>
                                )}
                              </td>
                            </tr>
                            {/* Message content drawer */}
                            <tr className="bg-slate-50/30">
                              <td colSpan={6} className="p-3 border-t border-slate-100 pl-4">
                                <div className="text-[11px] font-medium text-slate-700 bg-slate-50/50 p-2.5 rounded-xl border border-dotted border-slate-200">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Payload Message Body</span>
                                  {not.message || not.body}
                                </div>
                              </td>
                            </tr>
                            {/* Retry logs trace drawer */}
                            {not.retryLogs && not.retryLogs.length > 0 && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={6} className="p-3 border-t border-slate-100 font-sans">
                                  <div className="pl-4 border-l-2 border-indigo-600 text-left space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest block mb-1 font-sans">
                                      Best-Effort Automatic Retry Operations Trace Log
                                    </span>
                                    {not.retryLogs.map((log: string, idx: number) => (
                                      <div key={idx} className="text-[10px] font-mono text-slate-600 leading-normal">
                                        👉 {log}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* NEW: ALARM AUDITS & ALERT SLA LOGS SECTION */}
            <div className="space-y-4 pt-4 text-left border-t border-slate-100">
              <div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block font-sans">
                  🚨 Real-Time Alarm Telemetry &amp; Response SLA Analytics (alert_logs)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Explicitly logs when dispatch alarms are displayed on active screens and targets execute an acceptance or rejection click to comply with strict SLA reporting directives.
                </p>
              </div>

              {!fcmDiagnostics?.alertLogs || fcmDiagnostics.alertLogs.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center space-y-2 bg-slate-25/40">
                  <p className="text-2xl">⏳</p>
                  <h4 className="text-xs font-black text-slate-700 font-sans">No alarm response records logged yet</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-normal">
                    This reporting table connects live to the Supabase <code className="text-rose-700">alert_logs</code> database table. Perform direct actions on the Rider or Seller Dashboards to see audits populate here instantly!
                  </p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-3xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="p-4">Order ID</th>
                          <th className="p-4">Target Role</th>
                          <th className="p-4">⏰ Alert Opened Time</th>
                          <th className="p-4">✅ Accept/Reject Time</th>
                          <th className="p-4">📊 Action Result</th>
                          <th className="p-4 text-right">SLA Clock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
                        {[...fcmDiagnostics.alertLogs].reverse().map((log: any) => {
                          const actionTime = log.acceptedAt || log.rejectedAt || log.missedAt;
                          const actionResult = log.acceptedAt ? 'accepted' : (log.rejectedAt ? 'rejected' : (log.missedAt ? 'missed' : null));

                          // Calculate delay between alert opened and action time if both are present
                          let responseTimeMilli: number | null = null;
                          if (log.alertOpenedAt && actionTime) {
                            responseTimeMilli = new Date(actionTime).getTime() - new Date(log.alertOpenedAt).getTime();
                          }
                          const secs = responseTimeMilli !== null ? (responseTimeMilli / 1000).toFixed(1) + 's' : '—';
                          
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150">
                              <td className="p-4 font-bold text-slate-900 font-sans">
                                #{log.orderId}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black font-sans border ${
                                  log.role === 'seller' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                  log.role === 'rider' ? 'bg-sky-100 text-sky-800 border-sky-200' :
                                  'bg-slate-100 text-slate-800 border-slate-200'
                                }`}>
                                  {log.role}
                                </span>
                              </td>
                              <td className="p-4 text-slate-550">
                                {log.alertOpenedAt ? new Date(log.alertOpenedAt).toLocaleTimeString() : <span className="text-slate-350 italic">Waiting...</span>}
                              </td>
                              <td className="p-4 text-slate-550">
                                {actionTime ? new Date(actionTime).toLocaleTimeString() : <span className="text-slate-350 italic">Pending response</span>}
                              </td>
                              <td className="p-4">
                                {actionResult ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black font-sans ${
                                    actionResult === 'accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                    actionResult === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                    'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}>
                                    {actionResult}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black font-sans bg-slate-100 text-slate-450 border border-slate-200">
                                    PENDING
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right font-bold text-indigo-700">
                                {secs !== '—' && Number(secs.replace('s', '')) > 60 ? (
                                  <span className="text-rose-600 font-sans">🚨 {secs} (SLA Breach)</span>
                                ) : secs !== '—' ? (
                                  <span className="text-emerald-700 font-sans">⚡ {secs} (Compliant)</span>
                                ) : (
                                  <span className="text-slate-300 font-sans">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FCM Push notifications Inbox / Settings block for Admin */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600 animate-pulse" /> Live Firebase Cloud Messaging (FCM) Inbox &amp; Preferences (Admin Center)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure real-time console notification parameters and sync administrator devices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => syncFcmAndPreferences(true)}
                disabled={fcmSaving}
                className="px-4 py-2 bg-indigo-50 hover:bg-slate-100 text-indigo-750 font-extrabold rounded-xl text-[11px] transition shrink-0 uppercase tracking-widest cursor-pointer flex items-center gap-1 self-start"
              >
                {fcmSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Sync Device Token
              </button>
            </div>

            {/* FCM settings card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 border border-slate-100 p-5 rounded-3xl text-xs font-semibold text-slate-600 text-left">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Registered Device token</span>
                <span className="font-mono bg-white border border-slate-100 px-3 py-1.5 rounded-lg block truncate max-w-full text-slate-500 font-bold select-all">
                  {fcmToken}
                </span>
                <p className="text-[10px] text-slate-400">Registered FCM terminal token for direct target system pings.</p>
              </div>
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Active notification channels</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={notifAlerts} 
                      onChange={(e) => { setNotifAlerts(e.target.checked); }}
                    />
                    <span>High-Priority System Alerts (Active)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={notifStatuses} 
                      onChange={(e) => { setNotifStatuses(e.target.checked); }}
                    />
                    <span>Platform Order Escalations</span>
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
            <div className="space-y-4 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Admin Notification Thread Log</span>
              {fcmNotifications.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center space-y-2 bg-white">
                  <p className="text-3xl">📭</p>
                  <h4 className="text-sm font-black text-slate-800">Your administrator push notification inbox is empty</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When high-priority alarms trigger system escalations, real-time alerts will stream here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                  {fcmNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-3xl border flex flex-col justify-between transition-all duration-150 ${
                        n.isRead ? 'bg-white border-slate-100 text-slate-400' : 'bg-indigo-50/20 border-indigo-100/30 font-bold text-slate-800 shadow-3xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${n.isRead ? 'bg-slate-350' : 'bg-indigo-600 animate-pulse'}`} />
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
                            className="px-3 py-1 bg-white hover:bg-slate-50 border rounded-lg text-[10px] font-extrabold text-indigo-600 shadow-xs cursor-pointer"
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

      {/* TAB CONTAINER 9: RESTAURANT PORTAL MANAGEMENT */}
      {activeTab === 'infographic' && (
        <RestaurantAdminPortal />
      )}

      {/* TAB CONTAINER 11: HOSTELS & TIFFINS MANAGEMENT */}
      {activeTab === 'tiffins' && (
        <TiffinAdminPortal />
      )}

      {/* TAB CONTAINER 10: AUTOMATED BACKUPS AND DISASTER RECOVERY */}
      {activeTab === 'backups' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          {/* Header Dashboard Banner */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-indigo-900/50 text-indigo-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border border-indigo-800/40 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active Database Protection Protocol Activated
              </span>
              <h3 className="text-lg font-black tracking-tight mt-1">Disaster Recovery &amp; Automated Backups Shelf</h3>
              <p className="text-xs text-slate-400 max-w-2xl font-medium">
                Our core memory database is automatically backed up every 24 hours. Keep up to 7 rolling snapshots to prevent data loss or reverse system tests reliably.
              </p>
            </div>
            
            <button
              onClick={triggerManualBackup}
              disabled={backupRunning}
              className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer border border-indigo-500/30"
            >
              <Database className="w-4 h-4" />
              {backupRunning ? 'Running Snapshot...' : 'Trigger Live Backup'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT SIDE: Snapshot Historical Records */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-indigo-650" />
                      Serversnapshots Index ({backupsList.length})
                    </h4>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-bold">Max 7 historical images retained on file system storage.</p>
                  </div>
                  <button 
                    onClick={fetchBackupsList}
                    className="p-2 border border-slate-100 hover:bg-slate-50 rounded-xl transition text-slate-500 cursor-pointer"
                    title="Refresh snapshots"
                  >
                    <RefreshCw className={`w-4 h-4 ${backupsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {backupsLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">
                    <span className="block animate-spin mr-1.5 inline-block border-2 border-indigo-600 border-t-transparent w-4 h-4 rounded-full" />
                    Connecting to local backups directory...
                  </div>
                ) : backupsList.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400">No historical database backups found on the server.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Click "Trigger Live Backup" above to formulate your first system image!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {backupsList.map((backup) => (
                      <div 
                        key={backup.filename} 
                        className="p-4 bg-slate-50 border border-slate-100/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/85 transition"
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-black text-indigo-950 truncate block max-w-xs md:max-w-md">
                            {backup.filename}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                            <span>Size: {(backup.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>Created: {new Date(backup.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setShowRestoreConfirm(backup.filename)}
                            className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-black transition cursor-pointer"
                          >
                            Hot Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Interactive Backup Editor Console */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col h-full justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Raw JSON Restore Console
                  </h4>
                  <p className="text-[10px] text-slate-455 mt-0.5 leading-snug font-semibold">
                    Paste a valid JSON recovery snapshot to perform direct backfills. This will sync both the local memory state and Supabase relational schema immediately.
                  </p>
                </div>

                <div className="space-y-3 mt-4 flex-1">
                  <textarea
                    value={rawBackupInput}
                    onChange={(e) => setRawBackupInput(e.target.value)}
                    placeholder='{&#10;  "metadata": { "version": "1.2" },&#10;  "data": {&#10;    "users": [],&#10;    "products": [],&#10;    "orders": []&#10;  }&#10;}'
                    className="w-full h-80 bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 border border-slate-800"
                  />
                  
                  <span className="text-[9.5px] font-semibold text-amber-600 block pl-1">
                    ⚠️ WARNING: Restoring will overwrite existing databases and cascade deletes down into connected live database layers!
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                  <button
                    onClick={() => {
                      const sample = {
                        metadata: {
                          version: "1.2",
                          timestamp: new Date().toISOString(),
                          notes: "Manually synthesized live snapshot"
                        },
                        data: {
                          users: [...customers],
                          products: [...products],
                          orders: [...orders],
                          coupons: [...coupons],
                          banners: [...banners]
                        }
                      };
                      setRawBackupInput(JSON.stringify(sample, null, 2));
                    }}
                    className="px-3.5 py-2.5 text-[11px] font-black border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Load Current Live State
                  </button>

                  <button
                    onClick={() => {
                      if (!rawBackupInput.trim()) {
                        alert('Provide a valid JSON backup payload first.');
                        return;
                      }
                      setShowRestoreConfirm('RAW_JSON_INPUT');
                    }}
                    disabled={restoreRunning}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold rounded-xl text-[11px] uppercase transition cursor-pointer flex items-center gap-1"
                  >
                    Push raw schema
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* REALTIME SYSTEM RESTORE CONFIRMATION INTERLOCK WINDOW */}
          {showRestoreConfirm && (
            <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] max-w-md w-full p-6 border shadow-2xl space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-rose-950 font-sans">
                    Confirm Extreme Structural Override!
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    You are initiating a target database restore query. This overrides the current in-memory store and cascades down to wipe/repopulate active Supabase relational records with 100% integrity. This action is irreversible.
                  </p>
                  <p className="bg-slate-50 p-3 rounded-2xl text-[10px] text-left text-slate-400 font-mono truncate border border-slate-100">
                    Target Snapshot: <span className="text-indigo-950 font-black">{showRestoreConfirm === 'RAW_JSON_INPUT' ? 'Raw Clipboard Paste Block' : showRestoreConfirm}</span>
                  </p>
                </div>

                <div className="flex gap-2 text-xs pt-2">
                  <button
                    onClick={() => setShowRestoreConfirm(null)}
                    disabled={restoreRunning}
                    className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Abort Recovery
                  </button>
                  <button
                    onClick={() => {
                      if (showRestoreConfirm === 'RAW_JSON_INPUT') {
                        triggerRestore(null, rawBackupInput);
                      } else {
                        triggerRestore(showRestoreConfirm);
                      }
                    }}
                    disabled={restoreRunning}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white font-black rounded-xl transition cursor-pointer"
                  >
                    {restoreRunning ? 'Synthesizing...' : 'Override & Hydrate'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB CONTAINER 12: APK UPDATE POLICY & LIVE SIMULATION PLAYGROUND */}
      {activeTab === 'updates' && (
        <div className="space-y-6 text-left animate-fade-in">
          
          {/* Header Card */}
          <div className="bg-slate-900 text-white rounded-[32px] p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border border-orange-500/20 inline-flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Production APK Release Channel
              </span>
              <h3 className="text-lg font-black tracking-tight mt-1">Daily Mart APK Update Management Center</h3>
              <p className="text-xs text-slate-400 max-w-2xl font-medium">
                Configure release versions, force crucial security upgrades, and direct users to correct APK downloads. Syncs with PostgreSQL server and local memory storage channels automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Policy Management Settings Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-orange-600" />
                      Global Version parameters
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Control live upgrade dialogs across customer, seller, and rider application nodes.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={fetchApkSettingsOnLoad}
                    className="p-1.5 border border-slate-100 hover:bg-slate-50 rounded-xl transition text-slate-500 cursor-pointer"
                    title="Reload from backend"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${apkLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setApkLoading(true);
                    setApkError('');
                    setApkSuccess(false);

                    try {
                      const res = await fetch('/api/app-version', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          latestVersion: apkLatestVersion.trim(),
                          minimumSupportedVersion: apkMinSupported.trim(),
                          forceUpdate: apkForceUpdate,
                          apkUrl: apkDownloadUrl.trim(),
                          releaseNotes: apkReleaseNotes.trim(),
                        }),
                      });

                      if (res.ok) {
                        setApkSuccess(true);
                      } else {
                        const data = await res.json();
                        setApkError(data.error || 'Failed to update APK settings');
                      }
                    } catch (err: any) {
                      setApkError(`Network error while writing update policy: ${err.message}`);
                    } finally {
                      setApkLoading(false);
                    }
                  }} 
                  className="space-y-4 text-xs"
                >
                  {apkSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-850 font-extrabold rounded-2xl flex items-center gap-2 animate-fade-in">
                      <span>🎉 Settings written and applied successfully to PostgreSQL datastore!</span>
                    </div>
                  )}

                  {apkError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-850 font-extrabold rounded-2xl animate-fade-in">
                      <span>⚠️ {apkError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Latest version */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-455 block pl-0.5">Latest Released version</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.2.0"
                        value={apkLatestVersion}
                        onChange={(e) => setApkLatestVersion(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:outline-none"
                        required
                      />
                    </div>

                    {/* Minimum supported version */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-455 block pl-0.5">Minimum Supported version</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.0.0"
                        value={apkMinSupported}
                        onChange={(e) => setApkMinSupported(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Force update toggle */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="space-y-0.5 text-left">
                      <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide block">Force crucial Upgrade Toggle</span>
                      <p className="text-[9.5px] text-slate-400">Lock users below the minimum version out of the system entirely.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apkForceUpdate}
                        onChange={(e) => setApkForceUpdate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* APK Link download */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 block pl-0.5">APK Download URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={apkDownloadUrl}
                      onChange={(e) => setApkDownloadUrl(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-semibold font-mono text-[11px] focus:outline-none"
                      required
                    />
                  </div>

                  {/* Release Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 block pl-0.5">Release Notes &amp; Highlights</label>
                    <textarea
                      placeholder="What is new in this update..."
                      value={apkReleaseNotes}
                      onChange={(e) => setApkReleaseNotes(e.target.value)}
                      className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 font-semibold focus:outline-none placeholder-slate-400"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={apkLoading}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-extrabold cursor-pointer transition flex items-center gap-2 shadow-md uppercase text-xs"
                    >
                      {apkLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Publishing Policy...
                        </>
                      ) : (
                        'Save & Deploy Version Policy'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Side: Interactive Version Simulation & Integrity Checker */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                    Live Simulation Sandbox
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Verify semver rule outputs immediately and ensure perfect layout rendering before real client deployments.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 block pl-0.5">Simulated Client App Version</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 1.0.0"
                        value={simInstalledVersion}
                        onChange={(e) => setSimInstalledVersion(e.target.value)}
                        className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Simulation output calculations */}
                  {(() => {
                    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
                    const compareVersions = (v1: string, v2: string) => {
                      const p1 = parse(v1);
                      const p2 = parse(v2);
                      for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                        const val1 = p1[i] || 0;
                        const val2 = p2[i] || 0;
                        if (val1 > val2) return 1;
                        if (val1 < val2) return -1;
                      }
                      return 0;
                    };

                    const isNewer = compareVersions(apkLatestVersion, simInstalledVersion) > 0;
                    const isBelowMinimum = compareVersions(simInstalledVersion, apkMinSupported) < 0;
                    const mustForceUpdate = isNewer && (apkForceUpdate || isBelowMinimum);

                    let resultType = "UP_TO_DATE";
                    if (isNewer && mustForceUpdate) {
                      resultType = "FORCE_UPDATE";
                    } else if (isNewer) {
                      resultType = "OPTIONAL_UPDATE";
                    }

                    return (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 font-sans text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Simulator Assessment</span>
                        
                        {resultType === "UP_TO_DATE" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                              Client Up To Date
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal font-medium leading-relaxed">
                              Because simulated version ({simInstalledVersion}) is greater than or equal to current latest ({apkLatestVersion}), the client experiences clean, immediate entry. No version alerts trigger.
                            </p>
                          </div>
                        )}

                        {resultType === "OPTIONAL_UPDATE" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-800 font-extrabold font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-ping" />
                              Optional Update Dialog Triggers
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal font-medium leading-relaxed">
                              Simulated client version ({simInstalledVersion}) is older than server latest ({apkLatestVersion}), but above critical minimum ({apkMinSupported}). Client sees an update popup with a <b>"Later"</b> choice to defer.
                            </p>
                          </div>
                        )}

                        {resultType === "FORCE_UPDATE" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-rose-800 font-extrabold font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                              CRITICAL FORCE UPDATE LOCK TRIGGERED
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal font-medium leading-relaxed">
                              Client version ({simInstalledVersion}) is older than the latest ({apkLatestVersion}) AND either the global force policy is enabled OR client version lies below minimum supported ({apkMinSupported}). <b>The app is locked completely. The dismiss button is removed.</b>
                            </p>
                          </div>
                        )}
                        
                        <div className="pt-2.5 border-t border-slate-200 flex flex-col gap-1.5 text-[9px] text-slate-400 font-medium leading-snug">
                          <div className="flex justify-between">
                            <span>Older APK detects newer APK:</span>
                            <span className="font-bold text-slate-600">{isNewer ? 'YES' : 'NO'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Below Minimum version:</span>
                            <span className="font-bold text-slate-650">{isBelowMinimum ? 'YES' : 'NO'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Force Policy Active:</span>
                            <span className="font-bold text-slate-650">{apkForceUpdate ? 'YES' : 'NO'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WINDOW DIALOG FOR PRODUCT ADDITION / MODIFICATION */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border shadow-2xl text-left space-y-4 shrink-0 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="text-base font-black text-slate-950">
                {editingProduct ? `Edit Catalog Details: #${editingProduct.id}` : 'Create Fresh Catalog Registry'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Certified Organic Gala Apples"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Category Department</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold focus:outline-none text-slate-700"
                  >
                    <option value="vegetables">🥬 Vegetables</option>
                    <option value="fruits">🍎 Fruits</option>
                    <option value="dairy-eggs">🥛 Dairy, Bread &amp; Eggs</option>
                    <option value="munchies">🍪 Munchies &amp; Chips</option>
                    <option value="drinks">🥤 Cold Drinks &amp; Juices</option>
                    <option value="instant">🍲 Instant &amp; Frozen</option>
                    <option value="bakery">🥐 Bakery &amp; Biscuits</option>
                    <option value="sweets">🍨 Sweets &amp; Ice Creams</option>
                    <option value="baby-care">👶 Baby Care</option>
                    <option value="pet-care">🐾 Pet Care</option>
                    <option value="fresh-meat">🥩 Fresh Meat</option>
                    <option value="tiffin">🍱 Tiffin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Weight / Selling unit</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 g, 6 pcs, 1 L"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold focus:outline-none text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Product Display Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 195"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 font-black font-mono rounded-xl focus:outline-none"
                    required
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Original Strike Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 250"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 font-bold font-mono rounded-xl focus:outline-none"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 font-bold font-mono rounded-xl focus:outline-none"
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Image Link URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block pl-0.5">Detailed Description</label>
                <textarea
                  placeholder="Describe nutritional value, farm details, dynamic copy metrics..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full h-18 bg-slate-50 border rounded-xl p-3 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 p-2 px-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="accent-emerald-600 scale-110"
                  />
                  <div>
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">Featured Product Toggle</span>
                    <p className="text-[8.5px] text-slate-400">Highlight in homepage featured carousels</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 px-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formBestSeller}
                    onChange={(e) => setFormBestSeller(e.target.checked)}
                    className="accent-emerald-600 scale-110"
                  />
                  <div>
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">Best Seller Toggle</span>
                    <p className="text-[8.5px] text-slate-400">Badge with recommendation tags</p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-5 py-2.5 border rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold cursor-pointer transition flex items-center gap-1 shrink-0"
                >
                  {loading ? 'Filing...' : editingProduct ? 'Save product parameters' : 'Ship Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
