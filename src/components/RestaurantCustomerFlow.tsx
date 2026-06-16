import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Plus, 
  Minus, 
  Utensils, 
  Search,
  ShoppingCart
} from 'lucide-react';
import { Product, RestaurantCategory, Restaurant, MenuCategory, RestaurantProduct } from '../types';

interface RestaurantCustomerFlowProps {
  cart: any[];
  handleAddToCart: (product: Product, chosenVariant?: string) => void;
  handleRemoveFromCart: (productId: string, chosenVariant?: string) => void;
  getProductQuantity: (productId: string, chosenVariant?: string) => number;
}

export default function RestaurantCustomerFlow({
  cart,
  handleAddToCart,
  handleRemoveFromCart,
  getProductQuantity
}: RestaurantCustomerFlowProps) {
  // DB States
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow State
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);
  const [selectedMenuCatId, setSelectedMenuCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial restaurant categories and restaurants
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoading(true);
        const [catsRes, restsRes] = await Promise.all([
          fetch('/api/restaurant-categories'),
          fetch('/api/restaurants')
        ]);
        
        if (catsRes.ok && restsRes.ok) {
          const catsData = await catsRes.json();
          const restsData = await restsRes.json();
          setCategories(catsData);
          setRestaurants(restsData);
        } else {
          setError('Failed to fetch marketplace records from server.');
        }
      } catch (err) {
        setError('Connection error fetching restaurant records.');
      } finally {
        setLoading(false);
      }
    };
    fetchBaseData();
  }, []);

  // Fetch menus and products when active restaurant changes
  useEffect(() => {
    if (!selectedRestId) {
      setMenuCategories([]);
      setProducts([]);
      setSelectedMenuCatId(null);
      return;
    }

    const fetchRestaurantDetails = async () => {
      try {
        const [menusRes, productsRes] = await Promise.all([
          fetch(`/api/menu-categories?restaurantId=${selectedRestId}`),
          fetch(`/api/restaurant-products?restaurantId=${selectedRestId}`)
        ]);

        if (menusRes.ok && productsRes.ok) {
          const menusData = await menusRes.json();
          const productsData = await productsRes.json();
          setMenuCategories(menusData);
          setProducts(productsData);
          if (menusData.length > 0) {
            setSelectedMenuCatId(menusData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching restaurant menus & products:', err);
      }
    };

    fetchRestaurantDetails();
  }, [selectedRestId]);

  // Convert a RestaurantProduct into standard Product for seamless cart integration
  const adaptToStandardProduct = (rp: RestaurantProduct, restName: string): Product => {
    return {
      id: rp.id,
      name: rp.name,
      price: rp.price,
      image: rp.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120',
      category: 'restaurants',
      stock: 99,
      unit: '1 serving',
      sellerId: rp.restaurantId,
      sellerName: restName,
      deliveryMinutes: 20,
      description: rp.description || '',
    };
  };

  const currentRestaurant = restaurants.find(r => r.id === selectedRestId);
  const currentCategory = categories.find(c => c.id === selectedCatId);

  // Search filter
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRestaurants = restaurants.filter(r => 
    (!selectedCatId || r.categoryId === selectedCatId) &&
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedProducts = products.filter(p => 
    (!selectedMenuCatId || p.menuCategoryId === selectedMenuCatId) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-semibold text-xs tracking-wide uppercase">Connecting to live marketplace database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 bg-red-50 text-red-600 rounded-2xl p-6 text-center text-xs font-bold border border-red-150">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Search Header and Navigation Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-150">
        <div className="flex items-center gap-3">
          {selectedRestId ? (
            <button 
              onClick={() => { setSelectedRestId(null); setSelectedMenuCatId(null); }}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
          ) : selectedCatId ? (
            <button 
              onClick={() => { setSelectedCatId(null); setSelectedRestId(null); }}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
          ) : null}

          <div>
            <h3 className="font-black text-sm text-slate-800 tracking-tight uppercase flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-500 text-white"><Utensils className="w-4 h-4" /></span>
              {selectedRestId ? (
                <span>{currentRestaurant?.name} ({currentCategory?.name})</span>
              ) : selectedCatId ? (
                <span>{currentCategory?.name} Sellers</span>
              ) : (
                <span>Restaurants Marketplace</span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
              {selectedRestId ? 'Browse Active Menu Card' : selectedCatId ? 'Select Preferred Dynamic Merchant' : 'Explore Parent Categories Segment'}
            </p>
          </div>
        </div>

        {/* Real-time search */}
        <div className="relative w-full md:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder={
              selectedRestId ? "Search menu items..." : selectedCatId ? "Search restaurants..." : "Search categories..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* STEP 1: Categories view */}
      {!selectedCatId && !selectedRestId && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Active Store Segments</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Admin Configured</span>
          </div>
          
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
              No categories match your search filters right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => { setSelectedCatId(cat.id); setSearchQuery(''); }}
                  className="group bg-white rounded-2xl border border-slate-150 p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer flex items-center gap-4 text-left"
                >
                  <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                    {cat.image ? (
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl">🍔</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">CLICK TO EXPLORE</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Restaurants List */}
      {selectedCatId && !selectedRestId && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Available Kitchens in {currentCategory?.name}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Dynamic List</span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-[11px] text-center space-y-2">
              <p>No active restaurants connected under this segment.</p>
              <button 
                onClick={() => setSelectedCatId(null)}
                className="text-xs text-emerald-600 font-black hover:underline"
              >
                ← Back to categories map
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRestaurants.map((rest) => (
                <div 
                  key={rest.id}
                  onClick={() => { setSelectedRestId(rest.id); setSearchQuery(''); }}
                  className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer flex flex-col text-left"
                >
                  <div className="h-32 bg-slate-200 relative">
                    {rest.image ? (
                      <img 
                        src={rest.image} 
                        alt={rest.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 text-3xl font-bold">
                        🏪
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-[10px] font-black text-slate-800">
                      <Star className="w-3 h-3 text-amber-500 fill-current" />
                      <span>{rest.rating || '4.5'}</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-black text-xs text-slate-800 hover:text-emerald-600 uppercase tracking-tight">
                        {rest.name}
                      </h4>
                      {rest.address && (
                        <p className="text-[10px] text-slate-450 flex items-center gap-1 font-semibold">
                          <MapPin className="w-3 h-3 text-slate-400 group-hover:text-emerald-500" />
                          <span className="truncate">{rest.address}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> {rest.deliveryMinutes || 25} Mins speed
                      </span>
                      <span>•</span>
                      <span>₹{rest.priceForTwo || 200} for two</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 & 4: Restaurant Menus & Products */}
      {selectedRestId && currentRestaurant && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sub menu Navigation Sidebar */}
          <div className="lg:col-span-1 bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
            <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Menu Segments</h5>
            <div className="flex flex-col gap-1">
              {menuCategories.length === 0 ? (
                <span className="text-[10px] text-slate-400 font-bold">No active sections.</span>
              ) : (
                menuCategories.map((mc) => (
                  <button
                    key={mc.id}
                    onClick={() => { setSelectedMenuCatId(mc.id); setSearchQuery(''); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${
                      selectedMenuCatId === mc.id 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-white hover:bg-slate-200 border border-slate-200 text-slate-700'
                    }`}
                  >
                    {mc.name}
                  </button>
                ))
              )}
            </div>

            {/* Restaurant Static info details card */}
            <div className="border-t border-slate-200 pt-3 space-y-2 mt-2">
              <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider block">Seller Contacts</span>
              <div className="space-y-1 text-[10px] text-slate-500 font-bold">
                {currentRestaurant.phone && (
                  <p className="flex items-center gap-1 text-slate-600 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentRestaurant.phone}
                  </p>
                )}
                <p className="flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{currentRestaurant.address || 'Authorized dark store quadrant.'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Active products listings column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
                {menuCategories.find(mc => mc.id === selectedMenuCatId)?.name || 'Menu Items'} ({displayedProducts.length})
              </span>
              <span className="text-[10px] text-slate-400 font-bold">100% Dynamic Cards</span>
            </div>

            {displayedProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-black text-xs bg-slate-50 border rounded-2xl border-dashed">
                🏪 No dynamic food variants listed inside this section.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedProducts.map((rp) => {
                  const standardProd = adaptToStandardProduct(rp, currentRestaurant.name);
                  const qty = getProductQuantity(standardProd.id);

                  return (
                    <div 
                      key={rp.id}
                      className="bg-white rounded-2xl border border-slate-150 p-4 flex gap-4 text-left hover:border-slate-350 transition-all duration-200 relative group"
                    >
                      {/* Product Content info */}
                      <div className="flex-1 space-y-1.5 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-3 h-3 border flex items-center justify-center rounded-xs p-[1.5px] ${
                              rp.isVeg ? 'border-emerald-500' : 'border-rose-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                rp.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}></span>
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight">
                              {rp.name}
                            </span>
                          </div>
                          {rp.description && (
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                              {rp.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-xs font-black text-slate-850">
                          ₹{rp.price}
                        </div>
                      </div>

                      {/* Product Visual & ADD buttons */}
                      <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 relative self-center border border-slate-100 flex items-center justify-center">
                        {rp.image ? (
                          <img 
                            src={rp.image} 
                            alt={rp.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl">🍔</span>
                        )}

                        {/* Interactive Add to Cart buttons mapped to standard Blinkit cart controls */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 shadow-sm rounded-lg">
                          {qty > 0 ? (
                            <div className="bg-emerald-600 text-white flex items-center border border-emerald-600 rounded-lg overflow-hidden text-[10px] font-black h-5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(standardProd.id); }}
                                className="px-2 py-0.5 hover:bg-emerald-700 h-full transition-colors font-black cursor-pointer"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="px-2.5 font-sans leading-none">{qty}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(standardProd); }}
                                className="px-2 py-0.5 hover:bg-emerald-700 h-full transition-colors font-black cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(standardProd); }}
                              className="bg-white text-emerald-600 border border-emerald-300 hover:bg-emerald-50 rounded-lg px-3.5 py-0.5 text-[10px] font-black transition-all cursor-pointer h-5 leading-none block active:scale-95"
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

    </div>
  );
}
