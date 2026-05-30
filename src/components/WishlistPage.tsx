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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-left">
          {lovedProducts.map((p) => {
            const currentQty = getProductQuantity(p.id);
            const displayUnit = (p.variants && p.variants[0]) || p.unit;
            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl border border-slate-100 hover:border-slate-205 transition duration-150 p-3 flex flex-col justify-between relative group shadow-xs"
              >
                {/* 10MIN shipping tag */}
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 z-10">
                  <Clock className="w-2.5 h-2.5" />
                  {p.deliveryMinutes} MINS
                </div>

                {/* Delete/Heart removal trigger absolute */}
                <button
                  onClick={() => onRemoveFromWishlist(p.id)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 rounded-full text-rose-600 border border-rose-100/50 cursor-pointer z-10 transition duration-100"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Cover Photo */}
                <div 
                  className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 relative cursor-pointer flex items-center justify-center p-2 mb-2"
                  onClick={() => onSelectProduct(p)}
                >
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition duration-200"
                  />
                </div>

                {/* Details info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">{p.sellerName}</span>
                    <h4 
                      onClick={() => onSelectProduct(p)}
                      className="font-bold text-xs text-slate-800 line-clamp-1 hover:text-emerald-700 cursor-pointer text-left mt-0.5"
                    >
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{displayUnit}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-slate-900">₹{p.price}</span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[9px] text-slate-400 font-semibold line-through ml-1 font-mono">₹{p.originalPrice}</span>
                      )}
                    </div>

                    <button
                      onClick={() => onAddToCart(p)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-1.5 shadow-xs transition transform active:scale-90 cursor-pointer flex items-center gap-1 text-[10px] font-black uppercase px-2.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
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
