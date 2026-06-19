import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Plus, 
  Minus, 
  Search,
  Check,
  Briefcase,
  Clock,
  Sparkles
} from 'lucide-react';
import { Product, Hostel, TiffinCategory, TiffinItem } from '../types';

interface TiffinCustomerFlowProps {
  cart: any[];
  handleAddToCart: (product: Product, chosenVariant?: string) => void;
  handleRemoveFromCart: (productId: string, chosenVariant?: string) => void;
  getProductQuantity: (productId: string, chosenVariant?: string) => number;
}

export default function TiffinCustomerFlow({
  cart,
  handleAddToCart,
  handleRemoveFromCart,
  getProductQuantity
}: TiffinCustomerFlowProps) {
  // DB States
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [tiffinCategories, setTiffinCategories] = useState<TiffinCategory[]>([]);
  const [tiffinItems, setTiffinItems] = useState<TiffinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow State
  const [selectedHostelId, setSelectedHostelId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch hostels
  useEffect(() => {
    const fetchHostels = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/hostels');
        if (res.ok) {
          const data = await res.json();
          setHostels(data);
        } else {
          setError('Failed to fetch hostels list.');
        }
      } catch (err) {
        setError('Connection error fetching hostels from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchHostels();
  }, []);

  // Fetch categories and items when hostel changes
  useEffect(() => {
    if (!selectedHostelId) {
      setTiffinCategories([]);
      setTiffinItems([]);
      setSelectedCatId(null);
      return;
    }

    const fetchHostelDetails = async () => {
      try {
        const [catsRes, itemsRes] = await Promise.all([
          fetch(`/api/tiffin-categories?hostelId=${selectedHostelId}`),
          fetch(`/api/tiffin-items?hostelId=${selectedHostelId}`)
        ]);

        if (catsRes.ok && itemsRes.ok) {
          const catsData = await catsRes.json();
          const itemsData = await itemsRes.json();
          setTiffinCategories(catsData);
          setTiffinItems(itemsData);
          
          if (catsData.length > 0) {
            setSelectedCatId(catsData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching hostel details:', err);
      }
    };

    fetchHostelDetails();
  }, [selectedHostelId]);

  // Adapt a TiffinItem to stand-in as a standard Product for the cart
  const adaptToStandardProduct = (ti: TiffinItem, hostelName: string): Product => {
    return {
      id: ti.id,
      name: ti.name,
      price: ti.price,
      image: ti.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120',
      category: 'tiffin',
      stock: 100,
      unit: '1 Thali',
      sellerId: ti.hostelId,
      sellerName: hostelName,
      deliveryMinutes: 25,
      description: ti.description || 'Delectable, sanitary home-cooked hostel mess meal.',
    };
  };

  const currentHostel = hostels.find(h => h.id === selectedHostelId);
  const currentCategory = tiffinCategories.find(c => c.id === selectedCatId);

  // Filters
  const filteredHostels = hostels.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedItems = tiffinItems.filter(i => 
    (!selectedCatId || i.tiffinCategoryId === selectedCatId) &&
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && hostels.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 space-y-3">
        <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-teal-600 animate-spin mx-auto"></div>
        <p className="font-medium animate-pulse text-sm">Synchronizing hostel records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-6 text-center text-red-700 max-w-md mx-auto my-12">
        <p className="font-semibold mb-2">Error Occurred</p>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. Hostels Grid View */}
      {!selectedHostelId ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-600" />
                Hostel Tiffin Services
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Delicious, budget-friendly mess thalis prepared in local hostels & meshes.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Search premium hostels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
              />
            </div>
          </div>

          {filteredHostels.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-sm text-slate-500">No active hostels found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHostels.map((h) => {
                // Count active tiffins from this hostel in the cart
                const hostelCartItemsCount = cart
                  .filter(item => item.product.category === 'tiffin' && item.product.sellerId === h.id)
                  .reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <div 
                    key={h.id}
                    id={`hostel-card-${h.id}`}
                    onClick={() => {
                      setSelectedHostelId(h.id);
                      setSearchQuery('');
                    }}
                    className="group bg-white rounded-xl border border-slate-100 hover:border-teal-100 hover:shadow-lg hover:shadow-teal-50/50 cursor-pointer overflow-hidden transition-all duration-300"
                  >
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                      <img 
                        src={h.image || 'https://images.unsplash.com/photo-1555854817-2b2260177747?auto=format&fit=crop&q=80&w=200'} 
                        alt={h.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                      
                      {/* Active count badge */}
                      {hostelCartItemsCount > 0 && (
                        <div className="absolute top-3 right-3 bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {hostelCartItemsCount} Ordered
                        </div>
                      )}

                      {/* Header tags */}
                      <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        Verified Mess
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700 transition-colors line-clamp-1">
                        {h.name}
                      </h3>
                      
                      <div className="space-y-1 text-[11px] text-slate-500">
                        {h.address && (
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{h.address}</span>
                          </div>
                        )}
                        {h.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{h.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px]">
                        <span className="text-teal-600 font-medium">Daily & Meal plans</span>
                        <div className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          <span>Delivered Hot</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. Hostel Menu & Items View */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <button 
            onClick={() => {
              setSelectedHostelId(null);
              setSelectedCatId(null);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors group mb-2"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to hostels list
          </button>

          {/* Hostel Banner */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="w-full md:w-48 h-32 rounded-lg bg-slate-100 overflow-hidden shrink-0">
              <img 
                src={currentHostel?.image || 'https://images.unsplash.com/photo-1555854817-2b2260177747?auto=format&fit=crop&q=80&w=200'} 
                alt={currentHostel?.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  {currentHostel?.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {currentHostel?.address || 'Verified Residency'}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                {currentHostel?.phone && (
                  <div className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-slate-50">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>Contact: {currentHostel.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-teal-50 text-teal-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mess Timings: Live Breakfast / Lunch / Dinner / Snacks</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left sidebar / Tabs: Tiffin Categories (Breakfast, Lunch, Dinner, Snacks) */}
            <div className="lg:col-span-1 space-y-2">
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2 px-1">
                Meal Schedule
              </p>
              <div className="flex flex-row lg:flex-col overflow-x-auto gap-1.5 pb-2 lg:pb-0 scrollbar-none">
                {tiffinCategories.map((cat) => {
                  const isActive = selectedCatId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-xs font-semibold text-left transition-all flex items-center justify-between gap-2 shrink-0 ${
                        isActive 
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-100' 
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right container: Items list */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Available Tiffins — {currentCategory?.name || 'Items'}
                </span>

                {/* Inline search box */}
                <div className="relative w-48 shrink-0">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    type="text"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-1.5 pl-8 pr-3 bg-white border border-slate-100 rounded-lg text-[11px] focus:ring-1 focus:ring-teal-500 Focus:outline-none"
                  />
                </div>
              </div>

              {displayedItems.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-400">No tiffin menu options are active in this schedule category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedItems.map((item) => {
                    const standardProd = adaptToStandardProduct(item, currentHostel?.name || 'Hostel Mess');
                    const qtyInCart = getProductQuantity(standardProd.id);

                    return (
                      <div 
                        key={item.id}
                        id={`tiffin-item-${item.id}`}
                        className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 overflow-hidden flex shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="w-24 h-24 bg-slate-100 shrink-0 relative">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120'} 
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-xs text-slate-800 line-clamp-1">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2">
                              {item.description || 'Hygienically prepared home mess taste.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-slate-800">
                              ₹{item.price}
                            </span>

                            {/* Add to / quantity control in cart */}
                            {qtyInCart > 0 ? (
                              <div className="flex items-center gap-2.5 bg-teal-600 text-white rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFromCart(standardProd.id);
                                  }}
                                  className="hover:scale-110 active:scale-95 transition-transform"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="min-w-4 text-center">{qtyInCart}</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(standardProd);
                                  }}
                                  className="hover:scale-110 active:scale-95 transition-transform"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(standardProd);
                                }}
                                className="flex items-center gap-1 bg-teal-50 hover:bg-teal-650 hover:text-white text-teal-700 rounded-lg px-3 py-1 text-[11px] font-bold border border-teal-100 transition-colors shadow-sm"
                              >
                                <Plus className="w-3 h-3" />
                                Add
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
        </div>
      )}
    </div>
  );
}
