import React, { useState, useEffect, useMemo } from 'react';
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
  Layers
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  
  // Tab control states: 'analytics' | 'products' | 'orders' | 'customers' | 'coupons' | 'banners'
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'customers' | 'coupons' | 'banners'>('analytics');

  // UI status messages
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedOrderRow, setSelectedOrderRow] = useState<string | null>(null);

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
  const [newBannerCategory, setNewBannerCategory] = useState('veg-fruits');
  const [newBannerBadge, setNewBannerBadge] = useState('Limited Offer');

  // Product Creator/Editor Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formOriginalPrice, setFormOriginalPrice] = useState(0);
  const [formImage, setFormImage] = useState('');
  const [formCategory, setFormCategory] = useState('veg-fruits');
  const [formStock, setFormStock] = useState(10);
  const [formUnit, setFormUnit] = useState('1 unit');
  const [formDescription, setFormDescription] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formBestSeller, setFormBestSeller] = useState(false);

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
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData);
      }

      // Load sellers
      const sRes = await fetch('/api/sellers');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSellers(sData);
      }

      // Load riders
      const rRes = await fetch('/api/riders');
      if (rRes.ok) {
        const rData = await rRes.json();
        setRiders(rData);
      }

      // Load products
      const pRes = await fetch('/api/products');
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(pData);
      }

      // Load customers
      const cRes = await fetch('/api/customers');
      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData);
      }

      // Load coupons
      const cpRes = await fetch('/api/coupons');
      if (cpRes.ok) {
        const cpData = await cpRes.json();
        setCoupons(cpData);
      }

      // Load banners
      const bRes = await fetch('/api/banners');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBanners(bData);
      }

    } catch (e) {
      console.error('Error fetching admin metrics', e);
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
    if (!confirm('Are you absolute sure you want to ban/purge this customer index from Swift Cart database?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Customer profile safely purged from database.');
        setTimeout(() => setStatusMsg(''), 4000);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Products CRUD Management
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice(0);
    setFormOriginalPrice(0);
    setFormImage('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200');
    setFormCategory('veg-fruits');
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
        sellerName: 'Swift Cart Express Depot',
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
  const totalSalesVolume = orders.reduce((sum, o) => o.status === 'delivered' ? sum + o.total : sum, 0);
  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length;
  const approvedSellersCount = sellers.filter(s => s.status === 'approved').length;

  // LAST 7 DAYS & CATEGORIES MAPPING PROPERTIES
  const CATEGORIES_MAP = useMemo(() => [
    { id: 'veg-fruits', name: 'Veg & Fruits', color: '#10B981' },
    { id: 'dairy-eggs', name: 'Dairy & Eggs', color: '#3B82F6' },
    { id: 'munchies', name: 'Munchies', color: '#F59E0B' },
    { id: 'drinks', name: 'Cold Drinks', color: '#06B6D4' },
    { id: 'instant', name: 'Instant & Frozen', color: '#8B5CF6' },
    { id: 'bakery', name: 'Bakery', color: '#EC4899' },
    { id: 'sweets', name: 'Sweets', color: '#D946EF' },
    { id: 'baby-care', name: 'Baby Care', color: '#6366F1' },
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

        o.items.forEach(item => {
          const catId = item.product.category;
          const catObj = CATEGORIES_MAP.find(c => c.id === catId);
          const catName = catObj ? catObj.name : 'Others';

          if (selectedMetric === 'count') {
            categoriesInOrder.add(catName);
          } else if (selectedMetric === 'quantity') {
            dataPoint[catName] = (dataPoint[catName] || 0) + item.quantity;
          } else if (selectedMetric === 'revenue') {
            dataPoint[catName] = (dataPoint[catName] || 0) + (item.product.price * item.quantity);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-6 space-y-6">
      
      {/* Dynamic alert toaster */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-emerald-400 font-bold border border-emerald-900 px-5 py-3 rounded-2xl shadow-2xl animate-bounce-subtle flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs">{statusMsg}</span>
        </div>
      )}

      {/* ADMIN TITLE BOX */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="text-left">
          <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200. flex items-center gap-1 w-max">
            🔑 Certified Root Admin Access
          </span>
          <h2 className="text-2xl font-black text-slate-950 mt-1 tracking-tight">SwiftCart Operations Admin</h2>
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
      </div>

      {/* TAB CONTAINER 1: ANALYTICS & FLEET */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Stats Bar KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Volume</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">₹{totalSalesVolume.toLocaleString('en-IN')}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">From delivered baskets</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unresolved Orders</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">{pendingOrdersCount} Placed</h4>
              <p className="text-[10px] text-amber-600 font-bold mt-1">Awaiting rider dropoffs</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Clients</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">{customers.length} Profiles</h4>
              <p className="text-[10px] text-blue-600 font-bold mt-1">Customers online in app</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
              <h4 className="text-xl font-black font-mono mt-2 text-slate-950">{products.length} Items</h4>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">Active listed catalog shelf</p>
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
              <div className="space-y-2 text-left">
                {sellers.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No stores approved yet.</p>
                ) : (
                  sellers.map(s => (
                    <div key={s.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100/80 flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 font-sans">{s.storeName}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{s.ownerName} | {s.phone}</p>
                        <span className={`inline-block text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded ${
                          s.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>{s.status}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {s.status !== 'approved' && (
                          <button onClick={() => handleApproveSeller(s.id, 'approved')} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.status !== 'rejected' && (
                          <button onClick={() => handleApproveSeller(s.id, 'rejected')} className="p-2 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Riders List */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Delivery Fleet Partners</h3>
              <div className="space-y-2">
                {riders.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50/60 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{r.name}</p>
                      <p className="text-[9px] text-slate-450 font-mono mt-0.5">{r.vehicleNumber} | {r.phone}</p>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
                      <span className="text-[9px] font-semibold text-slate-400 capitalize">{r.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Payouts</p>
                      <p className="font-black font-mono text-slate-900 text-xs">₹{r.earnings}</p>
                    </div>
                  </div>
                ))}
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
          {selectedOrderRow && orders.find(o => o.id === selectedOrderRow) && (
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-2 text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-extrabold text-slate-900">Order Particulars: #{selectedOrderRow}</span>
                <span className="font-mono text-slate-400">Placed: {new Date(orders.find(o => o.id === selectedOrderRow)!.createdAt).toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 py-1">
                {orders.find(o => o.id === selectedOrderRow)!.items.map(item => (
                  <div key={item.product.id} className="flex justify-between font-semibold text-slate-600">
                    <span>{item.product.name} x {item.quantity} ({item.selectedVariant || item.product.unit})</span>
                    <span className="font-mono">₹ {item.product.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex justify-between font-black text-slate-900 text-xs">
                <span>Total bill value (with promo):</span>
                <span className="font-mono">₹ {orders.find(o => o.id === selectedOrderRow)!.total}</span>
              </div>
            </div>
          )}

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

          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-450 uppercase font-black tracking-wider text-[9px] border-b">
                  <th className="p-4">Customer Wallet details</th>
                  <th className="p-4">Registered email</th>
                  <th className="p-4">Registered telephone</th>
                  <th className="p-4 font-mono">Cash balance</th>
                  <th className="p-4">Created On</th>
                  <th className="p-4 text-right">Delete Account</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">No matching client records discovered.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-4 font-extrabold text-slate-950 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs uppercase">
                          {(c.name || 'C')[0]}
                        </span>
                        <span>{c.name || `Customer ID ${c.id.slice(-4)}`}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{c.email}</td>
                      <td className="p-4 font-mono text-slate-700">{c.phone || 'Firebase-linked'}</td>
                      <td className="p-4 font-black font-mono text-emerald-700">₹{(c.walletBalance || 0).toLocaleString('en-IN')}</td>
                      <td className="p-4 text-slate-400 font-medium">{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteCustomer(c.id)}
                          className="p-1.5 border hover:bg-rose-50 text-rose-600 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
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
                    <option value="veg-fruits">Fruits &amp; Vegs</option>
                    <option value="dairy-eggs">Eggs &amp; Dairy</option>
                    <option value="munchies">Munchies Snacks</option>
                    <option value="drinks">Chilled Sodas</option>
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
                    <option value="veg-fruits">🥬 Vegetables &amp; Fruits</option>
                    <option value="dairy-eggs">🥛 Dairy, Bread &amp; Eggs</option>
                    <option value="munchies">🍪 Munchies &amp; Chips</option>
                    <option value="drinks">🥤 Cold Drinks &amp; Juices</option>
                    <option value="instant">🍲 Instant &amp; Frozen</option>
                    <option value="bakery">🥐 Bakery &amp; Biscuits</option>
                    <option value="sweets">🍨 Sweets &amp; Ice Creams</option>
                    <option value="baby-care">👶 Baby Care</option>
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
