import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Folder, 
  Store, 
  Layers, 
  Package, 
  Star, 
  Clock, 
  MapPin, 
  Phone
} from 'lucide-react';
import { RestaurantCategory, Restaurant, MenuCategory, RestaurantProduct } from '../types';

export default function RestaurantAdminPortal() {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'restaurants' | 'menus' | 'products'>('categories');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Loaded database state
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);

  // Category addition fields
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState('');

  // Restaurant addition fields
  const [restName, setRestName] = useState('');
  const [restCatId, setRestCatId] = useState('');
  const [restImage, setRestImage] = useState('');
  const [restRating, setRestRating] = useState('4.5');
  const [restMinutes, setRestMinutes] = useState('25');
  const [restPrice, setRestPrice] = useState('250');
  const [restAddress, setRestAddress] = useState('');
  const [restPhone, setRestPhone] = useState('');

  // Menu category addition fields
  const [menuRestId, setMenuRestId] = useState('');
  const [menuName, setMenuName] = useState('');

  // Product addition fields
  const [prodRestId, setProdRestId] = useState('');
  const [prodMenuCatId, setProdMenuCatId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodIsVeg, setProdIsVeg] = useState(true);

  // Sync state helpers
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4500);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [catsRes, restsRes, menusRes, prodsRes] = await Promise.all([
        fetch('/api/restaurant-categories'),
        fetch('/api/restaurants'),
        fetch('/api/menu-categories'),
        fetch('/api/restaurant-products')
      ]);

      if (catsRes.ok && restsRes.ok && menusRes.ok && prodsRes.ok) {
        setCategories(await catsRes.json());
        setRestaurants(await restsRes.json());
        setMenuCategories(await menusRes.json());
        setProducts(await prodsRes.json());
      }
    } catch (e) {
      triggerError('Failed loading connected restaurant tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Sync section selector references
  useEffect(() => {
    if (categories.length > 0 && !restCatId) {
      setRestCatId(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (restaurants.length > 0) {
      if (!menuRestId) setMenuRestId(restaurants[0].id);
      if (!prodRestId) setProdRestId(restaurants[0].id);
    }
  }, [restaurants]);

  useEffect(() => {
    const matchedMenus = menuCategories.filter(m => m.restaurantId === prodRestId);
    if (matchedMenus.length > 0) {
      setProdMenuCatId(matchedMenus[0].id);
    } else {
      setProdMenuCatId('');
    }
  }, [prodRestId, menuCategories]);

  // Handle submissions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return triggerError('Please fill category name.');
    
    try {
      const res = await fetch('/api/restaurant-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, image: catImage })
      });

      if (res.ok) {
        triggerSuccess(`Category "${catName}" added immediately.`);
        setCatName('');
        setCatImage('');
        fetchAllData();
      } else {
        triggerError('Failed saving category.');
      }
    } catch (err) {
      triggerError('Network error on save category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete category? This cascades down to restaurants, menus and products inside this slot.')) return;
    try {
      const res = await fetch(`/api/restaurant-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Category removed successfully.');
        fetchAllData();
      }
    } catch (e) {
      triggerError('Failed deleting category.');
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName.trim() || !restCatId) return triggerError('Name and Category classification are required.');

    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restName,
          categoryId: restCatId,
          image: restImage,
          rating: restRating,
          deliveryMinutes: restMinutes,
          priceForTwo: restPrice,
          address: restAddress,
          phone: restPhone
        })
      });

      if (res.ok) {
        triggerSuccess(`Restaurant "${restName}" deployed gracefully.`);
        setRestName('');
        setRestImage('');
        setRestAddress('');
        setRestPhone('');
        fetchAllData();
      } else {
        triggerError('Failed saving restaurant.');
      }
    } catch (err) {
      triggerError('Network error registering restaurant.');
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!window.confirm('Delete this restaurant and all associated menu categories + product stocks?')) return;
    try {
      const res = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Restaurant detached.');
        fetchAllData();
      }
    } catch (e) {
      triggerError('Failed deleting restaurant.');
    }
  };

  const handleAddMenuCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim() || !menuRestId) return triggerError('Provide Section Header name & select target restaurant.');

    try {
      const res = await fetch('/api/menu-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: menuRestId, name: menuName })
      });

      if (res.ok) {
        triggerSuccess(`Meal section "${menuName}" listed.`);
        setMenuName('');
        fetchAllData();
      }
    } catch (err) {
      triggerError('Failed creating meal section.');
    }
  };

  const handleDeleteMenuCategory = async (id: string) => {
    if (!window.confirm('Delete this subsection? Associated kitchen products will be deleted as well.')) return;
    try {
      const res = await fetch(`/api/menu-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Section header scrubbed.');
        fetchAllData();
      }
    } catch (e) {
      triggerError('Failed deleting section.');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodRestId || !prodMenuCatId || !prodPrice) {
      return triggerError('Fill product name, select restaurant + nested menu, and set price ₹.');
    }

    try {
      const res = await fetch('/api/restaurant-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: prodRestId,
          menuCategoryId: prodMenuCatId,
          name: prodName,
          price: prodPrice,
          description: prodDesc,
          image: prodImage,
          isVeg: prodIsVeg
        })
      });

      if (res.ok) {
        triggerSuccess(`Stock product "${prodName}" refilled.`);
        setProdName('');
        setProdPrice('');
        setProdDesc('');
        setProdImage('');
        fetchAllData();
      }
    } catch (err) {
      triggerError('Error refilling stock.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product item?')) return;
    try {
      const res = await fetch(`/api/restaurant-products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess('Product item scrubbed.');
        fetchAllData();
      }
    } catch (e) {
      triggerError('Failed deleting product.');
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 space-y-6 animate-fade-in text-left border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-black uppercase tracking-wider text-emerald-400">
            Restaurants Marketplace Control Center
          </h4>
          <p className="text-slate-400 text-xs mt-1">
            Perform actual structural writes, manage store taxonomy routing, list categories, and configure dynamic product plates:
          </p>
        </div>

        <button 
          onClick={fetchAllData}
          className="text-[10px] bg-slate-800 hover:bg-slate-700 font-extrabold px-3.5 py-2 rounded-lg uppercase tracking-wider cursor-pointer border border-slate-700 transition"
        >
          {loading ? 'Refreshing...' : '🔄 Pull Databases'}
        </button>
      </div>

      {/* Warning/Success Toast feedback */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wide">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-black uppercase tracking-wide">
          ⚠ {errorMsg}
        </div>
      )}

      {/* Sub menu controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition uppercase tracking-wider ${
            activeSubTab === 'categories' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📂 1. Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveSubTab('restaurants')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition uppercase tracking-wider ${
            activeSubTab === 'restaurants' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🏪 2. Restaurants ({restaurants.length})
        </button>
        <button
          onClick={() => setActiveSubTab('menus')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition uppercase tracking-wider ${
            activeSubTab === 'menus' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📑 3. Menu Sections ({menuCategories.length})
        </button>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition uppercase tracking-wider ${
            activeSubTab === 'products' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🍔 4. Products Refill ({products.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input addition form based on current tab */}
        <div className="lg:col-span-5 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block bg-emerald-950/40 p-1.5 rounded border border-emerald-900/30">
            {activeSubTab === 'categories' ? '➕ Register Category Taxonomy' :
             activeSubTab === 'restaurants' ? '➕ Onboard Store Account' :
             activeSubTab === 'menus' ? '➕ Setup Section Headers' :
             '➕ Refill Customer Plates Stock'}
          </span>

          {activeSubTab === 'categories' && (
            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Category Title Name Code</label>
                <input 
                  type="text" 
                  value={catName} 
                  onChange={e => setCatName(e.target.value)}
                  placeholder="e.g. Chinese Recipes, Ice Creams" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Card Display Image Unsplash Link</label>
                <input 
                  type="text" 
                  value={catImage} 
                  onChange={e => setCatImage(e.target.value)}
                  placeholder="Paste URL..." 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer transition">
                Create Category Node
              </button>
            </form>
          )}

          {activeSubTab === 'restaurants' && (
            <form onSubmit={handleAddRestaurant} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Brand Restaurant Trade Name</label>
                <input 
                  type="text" 
                  value={restName} 
                  onChange={e => setRestName(e.target.value)}
                  placeholder="e.g. [Merchant Slot C]" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Select Category Mapping</label>
                <select 
                  value={restCatId} 
                  onChange={e => setRestCatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Rating ⭐</label>
                  <input type="text" value={restRating} onChange={e => setRestRating(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Mins Speed ⏱</label>
                  <input type="number" value={restMinutes} onChange={e => setRestMinutes(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Price For Two ₹</label>
                  <input type="number" value={restPrice} onChange={e => setRestPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Store Front Address Coordinates</label>
                <input 
                  type="text" 
                  value={restAddress} 
                  onChange={e => setRestAddress(e.target.value)}
                  placeholder="e.g. Kuravi Road Crossing Hub"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Billing Merchant Contact Phone</label>
                <input 
                  type="text" 
                  value={restPhone} 
                  onChange={e => setRestPhone(e.target.value)}
                  placeholder="99XXXXXXXX"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Billboard Banner (Unsplash URL)</label>
                <input 
                  type="text" 
                  value={restImage} 
                  onChange={e => setRestImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer transition">
                Deploy Store Accounts
              </button>
            </form>
          )}

          {activeSubTab === 'menus' && (
            <form onSubmit={handleAddMenuCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tag Kitchen Restaurant</label>
                <select 
                  value={menuRestId} 
                  onChange={e => setMenuRestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meal Section Header</label>
                <input 
                  type="text" 
                  value={menuName} 
                  onChange={e => setMenuName(e.target.value)}
                  placeholder="e.g. Classic Burgers, Soup Plates" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer transition">
                Create Menu Section Header
              </button>
            </form>
          )}

          {activeSubTab === 'products' && (
            <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Select Restaurant</label>
                <select 
                  value={prodRestId} 
                  onChange={e => setProdRestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nested Menu Section</label>
                <select 
                  value={prodMenuCatId} 
                  onChange={e => setProdMenuCatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {menuCategories.filter(m => m.restaurantId === prodRestId).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Item Name</label>
                <input 
                  type="text" 
                  value={prodName} 
                  onChange={e => setProdName(e.target.value)}
                  placeholder="e.g. Double Stack Cheese Placeholder" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Customer Base Price (₹)</label>
                <input 
                  type="number" 
                  value={prodPrice} 
                  onChange={e => setProdPrice(e.target.value)}
                  placeholder="₹120" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Recipe Summary Description</label>
                <textarea 
                  value={prodDesc} 
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="Ingredients list schema metadata tags..." 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white h-14 resize-none"
                />
              </div>

              <div className="space-y-1 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={prodIsVeg} 
                  onChange={e => setProdIsVeg(e.target.checked)}
                  id="is_veg_admin" 
                  className="rounded text-emerald-600 focus:ring-0 bg-slate-900 text-xs shrink-0"
                />
                <label htmlFor="is_veg_admin" className="text-[9px] font-bold uppercase text-slate-400 cursor-pointer">
                  🟢 100% Veg / Green Dot recipe
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Illustration Icon Image Link URL</label>
                <input 
                  type="text" 
                  value={prodImage} 
                  onChange={e => setProdImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer transition">
                Deploy Product Stock
              </button>
            </form>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive display of current database state items */}
        <div className="lg:col-span-7 bg-slate-950 p-5 rounded-2xl border border-slate-800 max-h-[600px] overflow-y-auto space-y-4">
          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest block">
            Existing Registered Records: ({
              activeSubTab === 'categories' ? categories.length :
              activeSubTab === 'restaurants' ? restaurants.length :
              activeSubTab === 'menus' ? menuCategories.length :
              products.length
            }) Items
          </span>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs uppercase font-extrabold">Refetching data stream...</div>
          ) : (
            <div className="space-y-3">
              {activeSubTab === 'categories' && categories.map(c => (
                <div key={c.id} className="flex items-center justify-between border border-slate-800 p-3 rounded-xl bg-slate-900 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {c.image ? <img src={c.image} alt="" className="w-full h-full object-cover" /> : '📁'}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-white text-xs">{c.name}</h5>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{c.id}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteCategory(c.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg cursor-pointer transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {activeSubTab === 'restaurants' && restaurants.map(r => (
                <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between border border-slate-800 p-3 rounded-xl bg-slate-900 text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-700">
                      {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : '🏪'}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="font-extrabold text-white text-xs uppercase tracking-tight">{r.name}</h5>
                      <div className="flex flex-wrap gap-x-2 text-[9px] text-slate-450 font-bold">
                        <span className="text-emerald-400">⭐ {r.rating || '4.5'}</span>
                        <span>•</span>
                        <span>⏱ {r.deliveryMinutes || 25} Mins</span>
                        <span>•</span>
                        <span>₹{r.priceForTwo || 200} for two</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">Category slot ID: {r.categoryId}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteRestaurant(r.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg cursor-pointer transition self-end md:self-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {activeSubTab === 'menus' && menuCategories.map(m => {
                const associatedRest = restaurants.find(r => r.id === m.restaurantId)?.name || 'Detached Store';
                return (
                  <div key={m.id} className="flex items-center justify-between border border-slate-800 p-3 rounded-xl bg-slate-900 text-xs">
                    <div>
                      <h5 className="font-extrabold text-white text-xs">{m.name}</h5>
                      <span className="text-[9px] text-emerald-400 font-extrabold block uppercase mt-0.5">Linked Restaurant: {associatedRest}</span>
                      <span className="text-[8px] font-mono text-slate-500 block uppercase">ID: {m.id}</span>
                    </div>
                    <button onClick={() => handleDeleteMenuCategory(m.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg cursor-pointer transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {activeSubTab === 'products' && products.map(p => {
                const associatedRest = restaurants.find(r => r.id === p.restaurantId)?.name || 'Detached Store';
                const associatedMenu = menuCategories.find(m => m.id === p.menuCategoryId)?.name || 'Detached Menu';
                return (
                  <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between border border-slate-800 p-3 rounded-xl bg-slate-900 text-xs gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-700">
                        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🍔'}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2.5 h-2.5 border flex items-center justify-center rounded-xs p-[1px] shrink-0 ${p.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                            <span className={`w-1 h-1 rounded-full ${p.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          </span>
                          <h5 className="font-extrabold text-white text-xs truncate uppercase tracking-tight">{p.name}</h5>
                        </div>
                        <div className="flex flex-wrap gap-x-2 text-[9px] text-slate-450 font-bold">
                          <span className="text-emerald-400">Price: ₹{p.price}</span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{associatedRest}</span>
                          <span>•</span>
                          <span className="text-sky-400">{associatedMenu}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg cursor-pointer transition self-end md:self-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
