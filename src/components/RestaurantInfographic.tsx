import React, { useState } from 'react';
import { 
  ArrowRight, 
  Smartphone, 
  Sparkles, 
  Search, 
  Plus, 
  ShoppingBag, 
  Star, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Database, 
  Settings, 
  Users, 
  PlusCircle, 
  Info,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Package,
  Layers,
  Store,
  Grid,
  BarChart3
} from 'lucide-react';

export default function RestaurantInfographic() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Realistic looking battery/status bar data
  const renderStatusBar = () => (
    <div className="flex justify-between items-center px-4 py-1 bg-slate-100 text-[10px] font-mono text-slate-500 rounded-t-[22px]">
      <span className="font-bold">09:41</span>
      <div className="flex items-center gap-1">
        <span className="text-[8px] px-1 bg-emerald-500/10 text-emerald-700 rounded font-black border border-emerald-500/20">FCM LIVE</span>
        <span>5G</span>
        <div className="w-4 h-2 bg-slate-400 rounded-xs relative">
          <div className="absolute top-[1px] bottom-[1px] left-[1px] right-[2px] bg-slate-600 rounded-xs"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-[32px] p-6 md:p-8 space-y-8 shadow-xs w-full max-w-7xl mx-auto selection:bg-emerald-100 animate-fade-in">
      
      {/* Header section with Swift Cart Branding and Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-950/25">
              Swift Cart architecture
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#00A86B] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Full Schema Blueprint Ready
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Restaurant Marketplace <span className="text-emerald-600">UI/UX Hierarchy Hierarchy</span>
          </h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed max-w-3xl">
            A beautifully structured modular layout highlighting how the marketplace scales dynamically.
            Admin maintains full backend authority over categories, restaurants, menu lists, and products,
            which are instantenously rendered for customer checkout.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System State</div>
            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">✓</span> Dynamic Taxonomies Active
            </div>
          </div>
        </div>
      </div>

      {/* Screen Sequence - 5 Android mockups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
            5 Connected Marketplace Screen Mockups (Tap any step to highlight flow)
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
            <Sparkles className="w-3 h-3 text-emerald-600 animate-spin" /> Interactive Walkthrough Enabled
          </div>
        </div>

        {/* 16:9 horizontal scrollable flow layout for the 5 screens with connecting arrows */}
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 lg:gap-2 overflow-x-auto pb-4 pt-2">
          
          {/* SCREEN 1: Home page */}
          <div className="flex-1 min-w-[200px] max-w-[240px] mx-auto w-full flex flex-col">
            <div 
              onClick={() => setActiveStep(1)}
              className={`cursor-pointer transition-all duration-300 transform bg-white rounded-[26px] border shadow-md hover:shadow-lg flex flex-col flex-1 relative ${
                activeStep === 1 ? 'ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              {renderStatusBar()}
              
              {/* Screen Header */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs text-slate-800 tracking-tight">Swift Cart Delivery</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">10 Min</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1.5">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-semibold">Search for "Coke", "Bread" etc...</span>
                </div>
              </div>

              {/* Screen Body */}
              <div className="p-3 flex-1 space-y-4">
                {/* Category Grid */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Fast Categories</span>
                    <span className="text-[8px] text-emerald-600 font-bold">See all</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl flex flex-col justify-between h-14 border border-slate-100">
                      <span className="text-lg">🍇</span>
                      <span className="text-[9px] font-extrabold text-slate-700">Grocery</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl flex flex-col justify-between h-14 border border-slate-100">
                      <span className="text-lg">🥛</span>
                      <span className="text-[9px] font-extrabold text-slate-700">Dairy &amp; Milk</span>
                    </div>
                  </div>
                </div>

                {/* Core Feature highlight: New Restaurants Category */}
                <div className="space-y-2 relative">
                  <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-900 border border-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded-full scale-90 tracking-widest animate-bounce">
                    NEW
                  </div>
                  
                  {/* HIGHLIGHTED CATEGORY CARD */}
                  <div className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl shadow-md border-2 border-emerald-500 flex items-center justify-between transition-all">
                    <div className="space-y-0.5 max-w-[70%]">
                      <span className="text-[8px] font-bold text-emerald-100 tracking-wider uppercase">LAUNCH SPECIAL</span>
                      <h4 className="text-[11px] font-black leading-tight tracking-tight">RESTAURANTS</h4>
                      <p className="text-[7.5px] text-emerald-100 font-medium">Bestselling meals, street treats, and café grids.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-sm">
                      🍔
                    </div>
                  </div>
                </div>

                {/* Advert Banner Spot */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-dashed border-slate-200">
                  <div className="bg-yellow-150 rounded px-1.5 py-0.5 inline-block text-[7px] font-bold text-yellow-800">PROMO AD</div>
                  <p className="text-[8px] text-slate-400 font-medium mt-1">Sleek instant groceries at discounts of up to 45%.</p>
                </div>
              </div>

              {/* Screen Banner Footer / Label */}
              <div className="bg-slate-900 text-white p-2.5 text-center text-[9px] font-bold rounded-b-[24px]">
                <div className="flex items-center justify-center gap-1">
                  <span>Screen 1: Home Page</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTING ARROW 1 */}
          <div className="flex items-center justify-center self-center py-2 shrink-0">
            <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 lg:rotate-0 animate-pulse" />
          </div>

          {/* SCREEN 2: Restaurant Categories */}
          <div className="flex-1 min-w-[200px] max-w-[240px] mx-auto w-full flex flex-col">
            <div 
              onClick={() => setActiveStep(2)}
              className={`cursor-pointer transition-all duration-300 transform bg-white rounded-[26px] border shadow-md hover:shadow-lg flex flex-col flex-1 relative ${
                activeStep === 2 ? 'ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              {renderStatusBar()}

              {/* Screen Header */}
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">←</span>
                <span className="font-black text-xs text-slate-800">Restaurant Categories</span>
              </div>

              {/* Screen Body */}
              <div className="p-3 flex-1 space-y-3">
                <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                  Taxonomy Structure / Admin Config
                </div>

                {/* Dynamic Categories Managed by Admin */}
                <div className="space-y-2">
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-dashed border-emerald-500/20 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-800 font-mono">[Category Slot #1]</span>
                      <span className="text-[7px] text-emerald-600 font-semibold bg-emerald-50/80 px-1 py-0.2 rounded">Admin defined</span>
                    </div>
                    <p className="text-[8px] text-slate-445 leading-tight text-slate-500">All Restaurants linked under category ID 1 load dynamically.</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-800 font-mono">[Category Slot #2]</span>
                      <span className="text-[7px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded font-semibold">Admin defined</span>
                    </div>
                    <p className="text-[8px] text-slate-450 leading-tight">All Restaurants linked under category ID 2 load dynamically.</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-800 font-mono">[Category Slot #3]</span>
                      <span className="text-[7px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded font-semibold">Admin defined</span>
                    </div>
                    <p className="text-[8px] text-slate-450 leading-tight">All Restaurants linked under category ID 3 load dynamically.</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-800 font-mono">[Category Slot #4]</span>
                    </div>
                    <p className="text-[8px] text-slate-400">All Restaurants linked under category ID 4 load dynamically.</p>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg text-center">
                  <p className="text-[7.5px] text-amber-700 font-semibold">No Real Food Category Names Used.</p>
                </div>
              </div>

              {/* Screen Banner Footer / Label */}
              <div className="bg-slate-900 text-white p-2.5 text-center text-[9px] font-bold rounded-b-[24px]">
                <div className="flex items-center justify-center gap-1">
                  <span>Screen 2: Categories</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTING ARROW 2 */}
          <div className="flex items-center justify-center self-center py-2 shrink-0">
            <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 lg:rotate-0 animate-pulse" />
          </div>

          {/* SCREEN 3: Restaurants List */}
          <div className="flex-1 min-w-[200px] max-w-[240px] mx-auto w-full flex flex-col">
            <div 
              onClick={() => setActiveStep(3)}
              className={`cursor-pointer transition-all duration-300 transform bg-white rounded-[26px] border shadow-md hover:shadow-lg flex flex-col flex-1 relative ${
                activeStep === 3 ? 'ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              {renderStatusBar()}

              {/* Screen Header */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px]">←</span>
                  <span className="font-extrabold text-[11px] text-slate-800">Category Selected</span>
                </div>
                <span className="text-[8.5px] font-bold text-[#00A86B] bg-emerald-50 px-1.5 py-0.5 rounded">Filter ✓</span>
              </div>

              {/* Screen Body */}
              <div className="p-3 flex-1 space-y-3">
                <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">
                  Dynamic Merchant Profiles
                </div>

                {/* Dynamic Restaurant Placeholders */}
                <div className="space-y-2.5">
                  <div className="bg-slate-50 rounded-xl border border-slate-150 p-2 space-y-1.5">
                    <div className="h-14 bg-slate-200/60 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      🏢 Merchant Logo Mock
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-black text-slate-800">[Restaurant Placeholder A]</h5>
                      <div className="flex items-center gap-2 text-[7.5px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-2 h-2 fill-current" /> 4.7</span>
                        <span>•</span>
                        <span>15-20 Mins</span>
                        <span>•</span>
                        <span>₹200 limit</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-150 p-2 space-y-1.5">
                    <div className="h-12 bg-slate-200/40 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      🏢 Merchant Logo Mock
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-bold text-slate-850">[Restaurant Placeholder B]</h5>
                      <div className="flex items-center gap-2 text-[7.5px] text-slate-450">
                        <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-2 h-2 fill-current" /> 4.2</span>
                        <span>•</span>
                        <span>25-30 Mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen Banner Footer / Label */}
              <div className="bg-slate-900 text-white p-2.5 text-center text-[9px] font-bold rounded-b-[24px]">
                <div className="flex items-center justify-center gap-1">
                  <span>Screen 3: Merchants</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTING ARROW 3 */}
          <div className="flex items-center justify-center self-center py-2 shrink-0">
            <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 lg:rotate-0 animate-pulse" />
          </div>

          {/* SCREEN 4: Menu Categories */}
          <div className="flex-1 min-w-[200px] max-w-[240px] mx-auto w-full flex flex-col">
            <div 
              onClick={() => setActiveStep(4)}
              className={`cursor-pointer transition-all duration-300 transform bg-white rounded-[26px] border shadow-md hover:shadow-lg flex flex-col flex-1 relative ${
                activeStep === 4 ? 'ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              {renderStatusBar()}

              {/* Screen Header */}
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">←</span>
                <span className="font-black text-[10.5px] text-emerald-700 truncate">Chosen Restaurant</span>
              </div>

              {/* Screen Body */}
              <div className="p-3 flex-1 space-y-3">
                {/* Menu Categories tabs layout */}
                <div className="flex gap-1.5 border-b border-slate-100 pb-1 overflow-x-auto">
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    [Section 1]
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                    [Section 2]
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                    [Section 3]
                  </span>
                </div>

                {/* Stack of Sub-Category sections list */}
                <div className="space-y-2 mt-1">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-slate-800">[Menu Section Slot A]</span>
                      <span className="text-[7px] text-slate-400 font-mono">(4 Items)</span>
                    </div>
                    <p className="text-[8px] text-slate-450 leading-relaxed font-medium">
                      Groups together specific item taxonomies defined by the merchant.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-slate-800">[Menu Section Slot B]</span>
                      <span className="text-[7px] text-slate-400 font-mono">(11 Items)</span>
                    </div>
                    <p className="text-[8px] text-slate-450 leading-relaxed font-bold">
                      For example, breakfast lists, beverage groupings, or sets.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-slate-800">[Menu Section Slot C]</span>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold">
                      Categories can be sorted or temporarily locked by seller dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Screen Banner Footer / Label */}
              <div className="bg-slate-900 text-white p-2.5 text-center text-[9px] font-bold rounded-b-[24px]">
                <div className="flex items-center justify-center gap-1">
                  <span>Screen 4: Menu Headers</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* CONNECTING ARROW 4 */}
          <div className="flex items-center justify-center self-center py-2 shrink-0">
            <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 lg:rotate-0 animate-pulse" />
          </div>

          {/* SCREEN 5: Products */}
          <div className="flex-1 min-w-[200px] max-w-[240px] mx-auto w-full flex flex-col">
            <div 
              onClick={() => setActiveStep(5)}
              className={`cursor-pointer transition-all duration-300 transform bg-white rounded-[26px] border shadow-md hover:shadow-lg flex flex-col flex-1 relative ${
                activeStep === 5 ? 'ring-4 ring-emerald-500 ring-offset-2 scale-[1.01]' : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              {renderStatusBar()}

              {/* Screen Header */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">←</span>
                <span className="font-black text-[10px] text-slate-850 truncate">Selected Menu Section</span>
                <ShoppingCartAndCount />
              </div>

              {/* Screen Body */}
              <div className="p-3 flex-1 space-y-3">
                {/* Product Grid Placer */}
                <div className="space-y-2.5">
                  
                  {/* Product Card 1 */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 border border-emerald-500 p-[1px] flex items-center justify-center rounded-xs">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                        </span>
                        <span className="text-[9.5px] font-black text-slate-800">[Product Item A]</span>
                      </div>
                      <p className="text-[7.5px] text-slate-400 leading-tight">Admin-defined product description placeholder text here.</p>
                      <span className="text-[9px] font-black text-slate-800">₹XXX</span>
                    </div>
                    <div className="w-14 h-14 bg-slate-200 rounded-lg relative self-center flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                      Image
                      <button className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-white text-emerald-600 border border-emerald-500 hover:bg-emerald-50 rounded px-2.5 py-0.5 text-[8.5px] font-black shadow-xs cursor-pointer">
                        ADD
                      </button>
                    </div>
                  </div>

                  {/* Product Card 2 */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 border border-red-500 p-[1px] flex items-center justify-center rounded-xs">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        </span>
                        <span className="text-[9.5px] font-black text-slate-800">[Product Item B]</span>
                      </div>
                      <p className="text-[7.5px] text-slate-400 leading-tight">Admin-defined product description placeholder text here.</p>
                      <span className="text-[9px] font-black text-slate-800 font-mono">₹XXX</span>
                    </div>
                    <div className="w-14 h-14 bg-slate-200 rounded-lg relative self-center flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                      Image
                      <button className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-white text-emerald-600 border border-emerald-500 hover:bg-emerald-50 rounded px-2.5 py-0.5 text-[8.5px] font-black shadow-xs cursor-pointer">
                        ADD
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Screen Banner Footer / Label */}
              <div className="bg-slate-900 text-white p-2.5 text-center text-[9px] font-bold rounded-b-[24px]">
                <div className="flex items-center justify-center gap-1">
                  <span>Screen 5: Products list</span>
                  <span className="text-emerald-400 font-bold">🛒</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Explanatory Walkthrough Alert Box conditional in details */}
      {activeStep !== null && (
        <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl flex gap-3 animate-fade-in text-left">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
            💡
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-emerald-900 uppercase">
              Step {activeStep} Walkthrough Details
            </h4>
            <div className="text-[11px] text-emerald-800 font-medium leading-relaxed">
              {activeStep === 1 && "The Home Page provides access to standard delivery sections. In Swift Cart's scalable marketplace system, we introduce a beautiful highlighted category card for Restaurants. Clicking this triggers the downstream lookup tree."}
              {activeStep === 2 && "The Restaurant Categories show groupings defined by Admin (e.g., bakeries, fast food, healthy joints). This categorizer dynamically maps store items in database.json and allows sellers to categorize their shopfront."}
              {activeStep === 3 && "The Restaurants List presents dynamic seller accounts. These sellers register via onboarding flows and are authorized by the Admin to start publishing products under the parent category."}
              {activeStep === 4 && "The Menu Categories partition products (such as Starters, Main Course, Shakes, Sides). Having distinct groupings improves visual flow and conversion, keeping list navigation compact and structured."}
              {activeStep === 5 && "The Product Level displays the actual available food items. All items feature custom price flags (₹XXX) and rapid 'ADD' buttons so shoppers can compile an order and trigger immediate rider dispatch."}
            </div>
            <button 
              onClick={() => setActiveStep(null)}
              className="text-[9px] text-[#00A86B] font-extrabold uppercase tracking-wider hover:underline"
            >
              Clear highlight
            </button>
          </div>
        </div>
      )}

      {/* Bottom section: Hierarchy Diagram & Flowchart */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400">
            Swift Cart Hierarchy Diagram
          </h4>
          <p className="text-slate-400 text-xs mt-1">
            Dynamic data schema flow from entry point down to actionable products:
          </p>
        </div>

        {/* Dynamic flow chart nodes mapping the requested exact hierarchy */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 relative text-left">
          
          {/* Node 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Step 1</div>
            <div className="text-xs font-black text-white">Main Category</div>
            <div className="text-[14px] text-emerald-500 text-center font-bold">↓</div>
            <div className="p-1.5 bg-emerald-500/10 rounded text-[9px] font-bold text-emerald-400">
              Gateway Entry Card
            </div>
          </div>

          {/* Node 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Step 2</div>
            <div className="text-xs font-black text-white">Restaurants</div>
            <div className="text-[14px] text-emerald-500 text-center font-bold">↓</div>
            <div className="p-1.5 bg-slate-900 rounded text-[9px] font-bold text-slate-400">
              Parent Feature Flag
            </div>
          </div>

          {/* Node 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Step 3</div>
            <div className="text-xs font-black text-white">Restaurant Categories</div>
            <div className="text-[14px] text-emerald-500 text-center font-bold">↓</div>
            <div className="p-1.5 bg-slate-900 rounded text-[9px] font-bold text-slate-400">
              Taxonomy Mapping
            </div>
          </div>

          {/* Node 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Step 4</div>
            <div className="text-xs font-black text-white">Restaurants</div>
            <div className="text-[14px] text-emerald-500 text-center font-bold">↓</div>
            <div className="p-1.5 bg-slate-900 rounded text-[9px] font-bold text-slate-400">
              Sellers / Merchants
            </div>
          </div>

          {/* Node 5 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Step 5</div>
            <div className="text-xs font-black text-white">Menu Categories</div>
            <div className="text-[14px] text-emerald-500 text-center font-bold">↓</div>
            <div className="p-1.5 bg-slate-900 rounded text-[9px] font-bold text-slate-400">
              Item Headers Groups
            </div>
          </div>

          {/* Node 6 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 h-full">
            <div className="text-[10px] text-slate-550 font-extrabold uppercase tracking-widest">Step 6</div>
            <div className="text-xs font-black text-white">Products</div>
            <div className="text-[9px] text-slate-500 font-mono mt-0.5">And Checked-Out items</div>
            <div className="p-1.5 bg-emerald-500/10 rounded text-[9px] font-bold text-emerald-400">
              In-Cart Customer Lists
            </div>
          </div>

        </div>

        {/* Explanatory callouts & scope descriptions requested by the user */}
        <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] leading-relaxed text-slate-400 text-left">
          <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <h5 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[12px]">
              <Database className="w-4 h-4 text-emerald-500" /> Admin Permissions Panel
            </h5>
            <ul className="list-disc pl-4 space-y-2 text-slate-300">
              <li><strong>Admin can create Categories:</strong> Dynamically establishes parent groupings and triggers store taxonomy indices.</li>
              <li><strong>Admin can create Restaurants:</strong> Deploys new dynamic store accounts with automated dispatch boundaries.</li>
              <li><strong>Admin can create Menu Categories:</strong> Partitions internal meal listings cleanly for enhanced visual conversions.</li>
              <li><strong>Admin can create Products:</strong> Adds standard items with custom placeholder keys, tags, and price indicators (₹XXX).</li>
            </ul>
          </div>

          <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <h5 className="font-bold text-white uppercase tracking-wide flex items-center gap-1.5 text-[12px]">
              <CheckCircle className="w-4 h-4 text-[#00A86B]" /> Customer Flow Panel
            </h5>
            <ul className="list-disc pl-4 space-y-2 text-slate-300">
              <li><strong>Browse categories:</strong> Users trigger prompt category lookups.</li>
              <li><strong>Select restaurant:</strong> Discovers matching active food merchants in their zip/pin codes.</li>
              <li><strong>Browse menu sections:</strong> Instant headers render lists cleanly.</li>
              <li><strong>Add products:</strong> Real-time checkout increment keys dynamic cart state.</li>
              <li><strong>Place order:</strong> Generates outbox notifications immediately to riders.</li>
              <li><strong>Customers can browse and order</strong> smoothly across all 5 linked modules.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}

// Help sub-component
function ShoppingCartAndCount() {
  return (
    <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-black text-[9px] rounded-full flex items-center gap-0.5">
      <span>🛒</span>
      <span>0</span>
    </div>
  );
}
