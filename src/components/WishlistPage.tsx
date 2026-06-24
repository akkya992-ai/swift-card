import React from 'react';
import { 
  Heart, 
  Trash2, 
  ShoppingBag, 
  Plus, 
  ArrowLeft,
  XCircle,
  Clock
} from 'lucide-react';
import { Product } from '../types';

interface WishlistPageProps {
  wishlist: string[];
  products: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variant?: string) => void;
  getProductQuantity: (productId: string, variant?: string) => number;
  onSelectProduct: (product: Product) => void;
  onBack: () => void;
}

export default function WishlistPage({
  wishlist,
  products,
  onRemoveFromWishlist,
  onAddToCart,
  getProductQuantity,
  onSelectProduct,
  onBack
}: WishlistPageProps) {
  
  // Resolve actual product objects matching wishlist product IDs
  const lovedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div id="wishlist-page-view" className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Return to shopping
        </button>
        <span className="text-xs font-black tracking-widest text-[#10b981] uppercase flex items-center gap-1">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" /> My Wishlist ({lovedProducts.length} items)
        </span>
      </div>

      {lovedProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-xs space-y-4 text-slate-700">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 fill-none" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase">Your Wishlist is Empty</h3>
            <p className="text-xs text-slate-400">Save healthy organic fruits, dairy dairy products and snack packs for later buy!</p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
          >
            Shed Light On Items Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-left">
          {lovedProducts.map((p) => {
            const currentQty = getProductQuantity(p.id);
            const displayUnit = (p.variants && p.variants[0]) || p.unit;
            return (
              <div 
                key={p.id}
                className="bg-white rounded-[28px] border border-slate-100 hover:border-emerald-500/10 hover:shadow-[0_12px_36px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col justify-between relative group shadow-xs"
              >
                {/* 10MIN shipping tag */}
                <div className="absolute top-3 left-3 bg-emerald-50 text-emerald-850 text-[9px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 z-10 shadow-xs border border-emerald-100/50 leading-none">
                  <Clock className="w-3 h-3 text-emerald-600 animate-pulse-subtle" />
                  <span>{p.deliveryMinutes} MINS</span>
                </div>

                {/* Delete/Heart removal trigger absolute */}
                <button
                  onClick={() => onRemoveFromWishlist(p.id)}
                  className="absolute top-3 right-3 p-2 bg-rose-50 hover:bg-rose-100 rounded-full text-rose-600 border border-rose-100/50 cursor-pointer z-10 transition duration-100"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Cover Photo */}
                <div 
                  className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50/55 relative cursor-pointer flex items-center justify-center p-3 mt-6 mb-2"
                  onClick={() => onSelectProduct(p)}
                >
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-104 transition-transform duration-300"
                  />
                </div>

                {/* Details info */}
                <div className="mt-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">{p.sellerName}</span>
                    <h4 
                      onClick={() => onSelectProduct(p)}
                      className="font-sans font-extrabold text-xs text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-600 cursor-pointer text-left mt-1 min-h-[36px]"
                    >
                      {p.name}
                    </h4>
                    <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-lg mt-2 inline-block truncate max-w-full font-mono">
                      {displayUnit}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-baseline gap-1.5 text-left font-sans">
                      <span className="font-black text-sm text-slate-900 font-mono">₹{p.price}</span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[10px] text-slate-400 font-bold line-through font-mono">₹{p.originalPrice}</span>
                      )}
                    </div>

                    <button
                      onClick={() => onAddToCart(p)}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-md hover:shadow-emerald-500/20 flex items-center justify-center gap-1.5 uppercase tracking-wider border border-emerald-500/35"
                    >
                      <span>Add to Cart</span>
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
