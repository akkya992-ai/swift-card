import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  Layers, 
  MapPin, 
  Phone, 
  Sparkles,
  DollarSign,
  Check,
  X
} from 'lucide-react';
import { Hostel, TiffinCategory, TiffinItem } from '../types';

export default function TiffinAdminPortal() {
  const [activeSubTab, setActiveSubTab] = useState<'hostels' | 'categories' | 'items'>('hostels');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // DB States
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [tiffinCategories, setTiffinCategories] = useState<TiffinCategory[]>([]);
  const [tiffinItems, setTiffinItems] = useState<TiffinItem[]>([]);

  // Form Fields - Hostel Additions
  const [hostelName, setHostelName] = useState('');
  const [hostelImage, setHostelImage] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');
  const [hostelPhone, setHostelPhone] = useState('');

  // Form Fields - Category Additions
  const [catHostelId, setCatHostelId] = useState('');
  const [catName, setCatName] = useState('Breakfast');

  // Form Fields - Item Additions
  const [itemHostelId, setItemHostelId] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);

  // Filter Categories dropdown in Items form based on selected Hostel ID
  const filteredCategoriesForItemForm = tiffinCategories.filter(
    (c) => c.hostelId === itemHostelId
  );

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
      const [hostelsRes, catsRes, itemsRes] = await Promise.all([
        fetch('/api/hostels'),
        fetch('/api/tiffin-categories'),
        fetch('/api/tiffin-items')
      ]);

      if (hostelsRes.ok && catsRes.ok && itemsRes.ok) {
        setHostels(await hostelsRes.json());
        setTiffinCategories(await catsRes.json());
        setTiffinItems(await itemsRes.json());
      } else {
        triggerError('Failed to fetch full administrative dataset.');
      }
    } catch (e) {
      triggerError('Error establishing DB connections for Tiffin tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update default selections in forms when data lists finish loading
  useEffect(() => {
    if (hostels.length > 0) {
      if (!catHostelId) setCatHostelId(hostels[0].id);
      if (!itemHostelId) setItemHostelId(hostels[0].id);
    } else {
      setCatHostelId('');
      setItemHostelId('');
    }
  }, [hostels]);

  useEffect(() => {
    if (filteredCategoriesForItemForm.length > 0) {
      setItemCategoryId(filteredCategoriesForItemForm[0].id);
    } else {
      setItemCategoryId('');
    }
  }, [itemHostelId, tiffinCategories]);

  // Submit CRUD helpers
  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelName.trim()) return triggerError('Hostel Name is required');

    try {
      setLoading(true);
      const res = await fetch('/api/hostels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hostelName,
          image: hostelImage || undefined,
          address: hostelAddress || undefined,
          phone: hostelPhone || undefined,
          isActive: true
        })
      });

      if (res.ok) {
        const added = await res.json();
        setHostels((prev) => [...prev, added]);
        setHostelName('');
        setHostelImage('');
        setHostelAddress('');
        setHostelPhone('');
        triggerSuccess(`Hostel "${added.name}" registered successfully.`);
      } else {
        const err = await res.json();
        triggerError(err.error || 'Failed saving Hostel record.');
      }
    } catch (error) {
      triggerError('Connection failed registering Hostel.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHostel = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete hostel "${name}"? This removes all active tiffin items and categories associated with it.`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHostels((prev) => prev.filter((h) => h.id !== id));
        setTiffinCategories((prev) => prev.filter((c) => c.hostelId !== id));
        setTiffinItems((prev) => prev.filter((i) => i.hostelId !== id));
        triggerSuccess(`Permanently removed "${name}" and all of its items.`);
      } else {
        triggerError('Failed to remove hostel from database.');
      }
    } catch (error) {
      triggerError('Connection failed deleting hostel.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catHostelId) return triggerError('Please select a parent hostel first.');
    if (!catName.trim()) return triggerError('Category name is required.');

    try {
      setLoading(true);
      const res = await fetch('/api/tiffin-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostelId: catHostelId, name: catName })
      });

      if (res.ok) {
        const added = await res.json();
        setTiffinCategories((prev) => [...prev, added]);
        triggerSuccess(`Tiffin category "${added.name}" added successfully.`);
      } else {
        const err = await res.json();
        triggerError(err.error || 'Failed registering category.');
      }
    } catch (error) {
      triggerError('Connection failed appending category.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? This will cascadingly purge all assigned tiffin items.`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/tiffin-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTiffinCategories((prev) => prev.filter((c) => c.id !== id));
        setTiffinItems((prev) => prev.filter((i) => i.tiffinCategoryId !== id));
        triggerSuccess(`Purged "${name}" and associated tiffins.`);
      } else {
        triggerError('Server failed clearing category.');
      }
    } catch (error) {
      triggerError('Connection failed resetting categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemHostelId) return triggerError('Selecting a parent hostel is required');
    if (!itemCategoryId) return triggerError('Selecting a tiffin category is required');
    if (!itemName.trim()) return triggerError('Tiffin product title is required');
    if (!itemPrice || Number(itemPrice) <= 0) return triggerError('A valid price is required');

    try {
      setLoading(true);
      const res = await fetch('/api/tiffin-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelId: itemHostelId,
          tiffinCategoryId: itemCategoryId,
          name: itemName,
          price: Number(itemPrice),
          description: itemDesc || undefined,
          image: itemImage || undefined,
          isAvailable: itemAvailable
        })
      });

      if (res.ok) {
        const added = await res.json();
        setTiffinItems((prev) => [...prev, added]);
        setItemName('');
        setItemPrice('');
        setItemDesc('');
        setItemImage('');
        triggerSuccess(`Tiffin food item "${added.name}" is now live!`);
      } else {
        const err = await res.json();
        triggerError(err.error || 'Failed saving tiffin meal.');
      }
    } catch (error) {
      triggerError('Connection failed live broadcasting item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Do you wish to remove menu item: "${name}"?`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/tiffin-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTiffinItems((prev) => prev.filter((i) => i.id !== id));
        triggerSuccess(`Removed tiffin item "${name}".`);
      } else {
        triggerError('Failed to remove item from list.');
      }
    } catch (e) {
      triggerError('Connection error clearing item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Messages */}
      {successMsg && (
        <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-3 h-3" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center justify-between">
          <span className="font-semibold text-rose-700">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><X className="w-3 h-3 text-rose-600" /></button>
        </div>
      )}

      {/* Title */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-teal-500 animate-ping" />
            <span className="bg-teal-900/40 text-teal-300 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider border border-teal-800/20">
              Hostel Tiffin Terminal
            </span>
          </div>
          <h2 className="text-xl font-black mt-1">Tiffin Service Management Hub</h2>
          <p className="text-xs text-slate-400 max-w-xl font-medium mt-1">
            Register local hostels, setup active meal hour categories, and curate thali options. Add custom images, select pricing, and link dependencies effortlessly.
          </p>
        </div>

        {/* Sync Indicator */}
        <button 
          onClick={fetchAllData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          {loading ? 'Refreshing database...' : 'Reload Data Sync'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-1.5 pb-2">
        <button
          onClick={() => { setActiveSubTab('hostels'); setErrorMsg(''); }}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'hostels' ? 'bg-teal-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" /> 1. Manage Hostels ({hostels.length})
        </button>
        <button
          onClick={() => { setActiveSubTab('categories'); setErrorMsg(''); }}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'categories' ? 'bg-teal-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" /> 2. Tiffin Categories ({tiffinCategories.length})
        </button>
        <button
          onClick={() => { setActiveSubTab('items'); setErrorMsg(''); }}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'items' ? 'bg-teal-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" /> 3. Menu Items ({tiffinItems.length})
        </button>
      </div>

      {/* SUB-PANEL 1: HOSTELS MANAGER */}
      {activeSubTab === 'hostels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Hostel Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 lg:col-span-1 h-fit">
            <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Register Hostel</h3>
            <form onSubmit={handleAddHostel} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Hostel / Mess Name *</label>
                <input 
                  type="text"
                  placeholder="e.g., Green Valley Girls Residency"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Cover Photo URL (Optional)</label>
                <input 
                  type="text"
                  placeholder="Unsplash image URL to represent messenger"
                  value={hostelImage}
                  onChange={(e) => setHostelImage(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Address Location</label>
                <input 
                  type="text"
                  placeholder="Street details or sector block"
                  value={hostelAddress}
                  onChange={(e) => setHostelAddress(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Contact Mobile</label>
                <input 
                  type="text"
                  placeholder="e.g., +91 9988771122"
                  value={hostelPhone}
                  onChange={(e) => setHostelPhone(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-shadow"
              >
                <Plus className="w-4 h-4" /> Save Hostel
              </button>
            </form>
          </div>

          {/* List display */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Existing Hostels ({hostels.length})</h3>
            {hostels.length === 0 ? (
              <div className="py-16 text-center border rounded-2xl bg-slate-50 text-slate-400">
                No active hostels registered yet. Add your first hostel above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hostels.map((h) => (
                  <div key={h.id} className="bg-white rounded-xl border border-slate-100 p-4 flex gap-4 items-start shadow-xs relative">
                    <button 
                      onClick={() => handleDeleteHostel(h.id, h.name)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-650 transition-colors"
                      title="Purge Hostel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="w-16 h-16 rounded bg-slate-100 overflow-hidden shrink-0">
                      <img src={h.image || 'https://images.unsplash.com/photo-1555854817-2b2260177747?auto=format&fit=crop&q=80&w=120'} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-555">
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1 pr-6">{h.name}</h4>
                      {h.address && <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {h.address}</p>}
                      {h.phone && <p className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {h.phone}</p>}
                      <span className="inline-flex py-0.5 px-1.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[9px]">Open for Booking</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: CATEGORIES MANAGER */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category add */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 lg:col-span-1 h-fit">
            <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Setup Active Schedule</h3>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Select Hostel *</label>
                <select 
                  value={catHostelId}
                  onChange={(e) => setCatHostelId(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                  required
                >
                  <option value="" disabled>--- Select Registered Hostel ---</option>
                  {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Tiffin Hour category *</label>
                <select 
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                  required
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-shadow"
              >
                <Plus className="w-4 h-4" /> Link Category
              </button>
            </form>
          </div>

          {/* List display */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Configured Category Links</h3>
            {tiffinCategories.length === 0 ? (
              <div className="py-16 text-center border rounded-2xl bg-slate-50 text-slate-400">
                No timeslot links defined. Define scheduled plans above.
              </div>
            ) : (
              <div className="space-y-2">
                {tiffinCategories.map((cat) => {
                  const parentHostel = hostels.find((h) => h.id === cat.hostelId);
                  return (
                    <div key={cat.id} className="bg-white rounded-xl border border-slate-100 p-3.5 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <span className="font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 tracking-wider text-[10px]">{cat.name}</span>
                        <p className="text-slate-500 font-medium">Hostel reference: <span className="text-slate-800 font-bold">{parentHostel ? parentHostel.name : `ID: ${cat.hostelId}`}</span></p>
                      </div>

                      <button 
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg flex items-center gap-1 font-bold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove link
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: MENU ITEMS MANAGER */}
      {activeSubTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Item Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 lg:col-span-1 h-fit">
            <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Broadcasting Tiffin dish</h3>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Parent Hostel *</label>
                <select 
                  value={itemHostelId}
                  onChange={(e) => setItemHostelId(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                  required
                >
                  <option value="" disabled>--- Select Parent Hostel ---</option>
                  {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Category Slot *</label>
                <select 
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white"
                  required
                  disabled={filteredCategoriesForItemForm.length === 0}
                >
                  {filteredCategoriesForItemForm.length === 0 ? (
                    <option value="" disabled>Please add categories to this hostel first!</option>
                  ) : (
                    filteredCategoriesForItemForm.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Tiffin dish Title *</label>
                <input 
                  type="text"
                  placeholder="e.g., Shahi Paneer Butter meal with soft tandoori roti"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Price (INR) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    placeholder="e.g., 90"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full pl-6 p-2 border rounded-lg"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Description details</label>
                <textarea 
                  placeholder="Tell clients what is included, e.g., soft paratha, fresh curd, pickle, dal."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full p-2 border rounded-lg min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Dish Photo URL (Optional)</label>
                <input 
                  type="text"
                  placeholder="Thali image reference"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox"
                  id="itemAvailableBox"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                  className="scale-105 accent-teal-650"
                />
                <label htmlFor="itemAvailableBox" className="font-bold text-slate-600 select-none cursor-pointer">Immediately available in stock</label>
              </div>

              <button
                type="submit"
                disabled={loading || filteredCategoriesForItemForm.length === 0}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-shadow disabled:bg-slate-350"
              >
                <Plus className="w-4 h-4" /> Live Broadcast Dish
              </button>
            </form>
          </div>

          {/* List display */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Broadcasting Dishes ({tiffinItems.length})</h3>
            {tiffinItems.length === 0 ? (
              <div className="py-16 text-center border rounded-2xl bg-slate-50 text-slate-400 text-xs">
                No active meals recorded yet. Build healthy options above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiffinItems.map((item) => {
                  const parentHostel = hostels.find((h) => h.id === item.hostelId);
                  const parentCategory = tiffinCategories.find((c) => c.id === item.tiffinCategoryId);
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs relative flex gap-4">
                      {/* Delete */}
                      <button 
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="absolute top-3 right-3 text-slate-400 hover:text-red-650 transition-colors"
                        title="Purge Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Cover Photo */}
                      <div className="w-16 h-16 rounded bg-slate-100 overflow-hidden shrink-0">
                        <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120'} alt="" className="w-full h-full object-cover" />
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 text-[11px] text-slate-555 flex-1 pr-4">
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{item.name}</h4>
                        <div className="flex flex-wrap gap-1 text-[9px] font-black tracking-wider uppercase">
                          <span className="bg-teal-50 px-1 py-0.5 text-teal-800 rounded">{parentCategory ? parentCategory.name : 'Category'}</span>
                          <span className="bg-slate-50 px-1 py-0.5 text-slate-600 rounded line-clamp-1 max-w-[120px]">{parentHostel ? parentHostel.name : 'Hostel'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pr-2 line-clamp-2">{item.description || 'No description entered.'}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                          <span className="text-xs font-bold text-slate-800">₹{item.price}</span>
                          <span className={`font-semibold ${item.isAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.isAvailable ? '● Available' : '○ Out of stock'}
                          </span>
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
    </div>
  );
}
