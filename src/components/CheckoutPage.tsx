import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  CreditCard, 
  MapPin, 
  ShoppingBag, 
  Truck, 
  Gift, 
  Check, 
  ShieldCheck, 
  Lock, 
  Key,
  AlertCircle,
  Wallet,
  Sparkles,
  AlertTriangle,
  FileText,
  Download,
  RotateCcw,
  RefreshCw,
  X,
  Receipt,
  BookOpen,
  Copy,
  Info
} from 'lucide-react';
import { CartItem } from '../types';

interface AddressItem {
  id: string;
  label: string;
  address: string;
}

interface CheckoutPageProps {
  cart: CartItem[];
  subtotal: number;
  deliveryFee: number;
  originalDiscount: number; // default discount (from automatic platform rewards)
  savedAddresses: AddressItem[];
  activeAddressId: string | null;
  onPlaceOrder: (
    address: string, 
    paymentMethod: string, 
    couponApplied: string | null, 
    finalDiscount: number,
    paymentStatus?: string,
    transactionId?: string,
    deliveryInstructions?: string,
    deliveryTip?: number
  ) => Promise<any>;
  onBack: () => void;
  triggerNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'promo') => void;
  walletBalance?: number;
  onTopUpWallet?: (amount: number, gateway: string, gatewayStatus: string) => Promise<any>;
  deliveryInstructions: string;
  setDeliveryInstructions: (instructions: string) => void;
}

export default function CheckoutPage({
  cart,
  subtotal,
  deliveryFee,
  originalDiscount,
  savedAddresses,
  activeAddressId,
  onPlaceOrder,
  onBack,
  triggerNotification,
  walletBalance = 1000,
  onTopUpWallet,
  deliveryInstructions,
  setDeliveryInstructions
}: CheckoutPageProps) {
  
  // Choose address
  const activeAddressObj = savedAddresses.find(a => a.id === activeAddressId) || savedAddresses[0];
  const [selectedAddress, setSelectedAddress] = useState(activeAddressObj?.address || '');

  useEffect(() => {
    const freshAddressObj = savedAddresses.find(a => a.id === activeAddressId) || savedAddresses[0];
    if (freshAddressObj?.address) {
      setSelectedAddress(freshAddressObj.address);
    } else {
      setSelectedAddress('');
    }
  }, [activeAddressId, savedAddresses]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE' | 'WALLET' | 'RAZORPAY'>('COD');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [dbCoupons, setDbCoupons] = useState<any[]>([]);

  useEffect(() => {
    const fetchDbCoupons = async () => {
      try {
        const res = await fetch('/api/coupons');
        if (res.ok) {
          const data = await res.json();
          setDbCoupons(data);
        }
      } catch (err) {
        console.warn('Failed loading coupons database:', err);
      }
    };
    fetchDbCoupons();
  }, []);

  // Online Card details (Stripe layout)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardZip, setCardZip] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Razorpay simulated portal state
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayMethod, setRazorpayMethod] = useState<'CARD' | 'UPI' | 'NET_BANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [razorpaySuccessSimulate, setRazorpaySuccessSimulate] = useState(true);

  // Stripe 3DS verification state
  const [showStripe3DS, setShowStripe3DS] = useState(false);
  const [stripeSuccessSimulate, setStripeSuccessSimulate] = useState(true);
  const [stripe3dsCode, setStripe3dsCode] = useState('1234');

  // Interactive topup panel inside Wallet
  const [walletTopUpOpen, setWalletTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [topUpGateway, setTopUpGateway] = useState<'Razorpay' | 'Stripe'>('Razorpay');
  const [topUpSimulateSuccess, setTopUpSimulateSuccess] = useState(true);
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Checkout states
  const [deliveryTip, setDeliveryTip] = useState<number>(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState<{ code: string; message: string; gateway: string } | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);
  const [successForwardTimer, setSuccessForwardTimer] = useState(9);

  // Sync address changes
  useEffect(() => {
    if (activeAddressObj) {
      setSelectedAddress(activeAddressObj.address);
    }
  }, [activeAddressId, activeAddressObj]);

  // Forward Countdown timer on Success
  useEffect(() => {
    if (!placedOrder) return;
    if (successForwardTimer <= 0) {
      // Automatic close or view tracking
      return;
    }
    const t = setInterval(() => {
      setSuccessForwardTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [placedOrder, successForwardTimer]);

  // Format Card Number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const matched = val.match(/.{1,4}/g);
    const formatted = matched ? matched.join(' ').substring(0, 19) : val;
    setCardNumber(formatted);
  };

  // Format Expiry
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length > 2) {
      formatted = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardExpiry(formatted.substring(0, 5));
  };

  const applyCoupon = () => {
    setCouponError(null);
    setCouponSuccess(null);
    const inputCode = couponCode.trim().toUpperCase();

    if (!inputCode) {
      setCouponError("Please type a coupon code first.");
      return;
    }

    // Try dynamic matches from active campaign list first
    const dynamicMatch = dbCoupons.find(c => c.code === inputCode && c.isActive !== false);
    if (dynamicMatch) {
      if (subtotal < dynamicMatch.minOrderValue) {
        setCouponError(`${dynamicMatch.code} requires a minimum order value of ₹${dynamicMatch.minOrderValue}.`);
        return;
      }

      const discountValue = Number(dynamicMatch.discountValue);
      let calculatedSaved = 0;
      if (dynamicMatch.discountType === 'percentage') {
        calculatedSaved = Math.round(subtotal * (discountValue / 100));
      } else {
        calculatedSaved = discountValue;
      }

      setAppliedCoupon(dynamicMatch.code);
      setCouponDiscount(calculatedSaved);
      setCouponSuccess(`${dynamicMatch.code} applied! Saved ₹${calculatedSaved} on this basket.`);
      triggerNotification("Coupon Applied 🎉", `${dynamicMatch.code} is active. Saving ₹${calculatedSaved}!`, "success");
      setCouponCode('');
      return;
    }

    // Static fallback options
    if (inputCode === 'FAST50') {
      if (subtotal < 200) {
        setCouponError("FAST50 requires a minimum order value of ₹200.");
        return;
      }
      setAppliedCoupon('FAST50');
      setCouponDiscount(50);
      setCouponSuccess("FAST50 applied successfully! Saved ₹50 flat.");
      triggerNotification("Coupon Applied 🎉", "FAST50 coupon code unlocked ₹50 discount!", "success");
    } else if (inputCode === 'FRESH10') {
      if (subtotal < 150) {
        setCouponError("FRESH10 requires a minimum order value of ₹150.");
        return;
      }
      setAppliedCoupon('FRESH10');
      const pctDiscount = Math.round(subtotal * 0.10);
      setCouponDiscount(pctDiscount);
      setCouponSuccess(`FRESH10 applied! Saved 10% (₹${pctDiscount}) on fresh greens.`);
      triggerNotification("10% Saved!", "FRESH10 coupon code applied successfully.", "success");
    } else if (inputCode === 'VIPDELIVERY') {
      setAppliedCoupon('VIPDELIVERY');
      setCouponDiscount(deliveryFee);
      setCouponSuccess("VIPDELIVERY code accepted! Standard delivery fees waived off entirely.");
      triggerNotification("Free Deliveries wavered 🛵", "You saved ₹25 on delivery fees.", "success");
    } else {
      setCouponError("Oops! Code not found in dynamic registry or fallbacks.");
    }
    setCouponCode('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Sum total
  const finalDiscount = originalDiscount + couponDiscount;
  const netTotal = Math.max(0, subtotal + deliveryFee + deliveryTip - finalDiscount);

  // Trigger wallet top up request
  const handleWalletTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please specify a valid numeric amount to top up.");
      return;
    }

    setIsToppingUp(true);
    try {
      if (onTopUpWallet) {
        const topupStatus = topUpSimulateSuccess ? 'success' : 'failed';
        await onTopUpWallet(amount, topUpGateway, topupStatus);
        
        if (topUpSimulateSuccess) {
          triggerNotification("Wallet Credited 💳", `Successfully added ₹${amount} using simulated ${topUpGateway} channel!`, "success");
          setWalletTopUpOpen(false);
          setPaymentError(null);
        } else {
          triggerNotification("Top-up Failed ❌", `Simulated top-up through ${topUpGateway} was canceled by user/gateway.`, "warning");
          alert(`Simulated Transaction Failed: Bank server responded with status "REJECTED_BY_ISSUING_BANK" over ${topUpGateway}.`);
        }
      }
    } catch (err: any) {
      alert("Failed top up wallet transaction: " + err.message);
    } finally {
      setIsToppingUp(false);
    }
  };

  // Main payment processing execution
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!selectedAddress.trim()) {
      alert("Please select or enter a valid shipping destination.");
      return;
    }

    if (paymentMethod === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        alert("Please enter a valid UPI ID (e.g. name@upi)");
        return;
      }
      setIsSubmittingOrder(true);
      try {
        const generatedTx = 'upi_' + Math.random().toString(36).substring(2, 10) + Math.floor(1000 + Math.random()*9000);
        const order = await onPlaceOrder(selectedAddress, 'UPI', appliedCoupon, finalDiscount, 'success', generatedTx, deliveryInstructions, deliveryTip);
        setPlacedOrder(order || { id: 'SC-' + Math.floor(100000 + Math.random() * 900000), total: netTotal, createdAt: new Date().toISOString() });
        triggerNotification("Order Confirmed 🎉", "Paid using UPI ID " + upiId + " instantly!", "success");
      } catch (err: any) {
        setPaymentError({
          code: 'UPI_COLLECT_FAILED',
          message: err.message || "Failed to process UPI payment collect request.",
          gateway: 'UPI Secure'
        });
      } finally {
        setIsSubmittingOrder(false);
      }
    } 
    else if (paymentMethod === 'COD') {
      setIsSubmittingOrder(true);
      try {
        const order = await onPlaceOrder(selectedAddress, 'COD', appliedCoupon, finalDiscount, 'pending', undefined, deliveryInstructions, deliveryTip);
        setPlacedOrder(order || { id: 'SC-' + Math.floor(100000 + Math.random() * 900000), total: netTotal, createdAt: new Date().toISOString() });
        triggerNotification("Order Booked (COD) 📦", "Pay ₹" + netTotal + " directly to the delivery rider.", "success");
      } catch (err: any) {
        alert("Failed to register cash-on-delivery order: " + err.message);
      } finally {
        setIsSubmittingOrder(false);
      }
    } else if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
      // Validate Card Form fields
      if (cardNumber.replace(/\s/g, '').length < 16) {
        alert("Please complete the 16-digit card input.");
        return;
      }
      if (cardExpiry.length < 5) {
        alert("Please complete card expiration MM/YY.");
        return;
      }
      if (cardCvv.length < 3) {
        alert("Please provide the card secure CVV.");
        return;
      }
      if (!cardHolder.trim()) {
        alert("Please enter the Cardholder Name.");
        return;
      }
      
      // Open simulated Stripe 3DS iframe modal
      setShowStripe3DS(true);
    }
  };

  // Triggered when Stripe 3D-Secure complete
  const handleStripeMockComplete = async () => {
    setShowStripe3DS(false);
    if (!stripeSuccessSimulate) {
      setPaymentError({
        code: 'CARD_SECURITY_FAIL',
        message: "Cardholder authentication verification failed. Reason: [CVV_EXPIRED] Expired or invalid CVV security configuration.",
        gateway: 'Secure Pay'
      });
      triggerNotification("Card Declined 💳", "Credit card failed verification checkout. Please check parameters.", "warning");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const cardTypeLabel = paymentMethod === 'CREDIT_CARD' ? 'Credit Card' : 'Debit Card';
      const generatedTx = 'ch_' + Math.random().toString(36).substring(2, 12);
      const order = await onPlaceOrder(selectedAddress, cardTypeLabel, appliedCoupon, finalDiscount, 'success', generatedTx, deliveryInstructions, deliveryTip);
      setPlacedOrder(order || { id: 'SC-' + Math.floor(100000 + Math.random() * 900000), total: netTotal, createdAt: new Date().toISOString() });
      triggerNotification(`${cardTypeLabel} Verified ⚡️`, "Transaction completed successfully!", "success");
    } catch (err: any) {
      setPaymentError({
        code: 'CARD_CAPTURE_FAILED',
        message: err.message || "Card capture was declined by card network.",
        gateway: 'Stripe'
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Auto recognizer for card logos
  const getCardLogo = () => {
    if (cardNumber.startsWith('4')) return 'VISA';
    if (cardNumber.startsWith('5')) return 'MASTERCARD';
    if (cardNumber.startsWith('3')) return 'AMEX';
    return 'CARD';
  };

  return (
    <div id="checkout-view-panel" className="max-w-2xl mx-auto space-y-4">
      
      {/* 1. SUCCESS OVERLAY INVOICE (No unrequested features - directly handles the requested feature of Payment Success Page!) */}
      {placedOrder ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-2xl text-center space-y-6 pt-10 pb-8 animate-fade-in text-slate-800">
          
          {/* Animated celebration icon */}
          <div className="relative w-20 h-20 mx-auto">
            <motion.div 
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 z-10"
            >
              <Check className="w-10 h-10 stroke-[3]" />
            </motion.div>
            
            {/* Ambient Sparkles */}
            <span className="absolute -top-1 -left-2 text-yellow-500 text-lg animate-spin">✨</span>
            <span className="absolute top-8 -right-3 text-amber-500 text-xs animate-bounce">⚡️</span>
            <span className="absolute -bottom-2 left-6 text-emerald-500 text-base animate-pulse">🎉</span>
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Payment Completed Successfully!</h2>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Your account was billed <span className="font-bold text-slate-700 font-mono">₹{netTotal}</span> using <span className="font-black text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{paymentMethod === 'ONLINE' ? 'Stripe Gateway' : paymentMethod}</span>. Here is your tracking receipt.
            </p>
          </div>

          {/* Reference transaction detail box */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs space-y-2 text-left max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-[9px]">Registered Order:</span>
              <span className="font-extrabold text-slate-800 font-mono">#{placedOrder.id}</span>
            </div>
            
            {placedOrder.transactionId && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Transaction Ref:</span>
                <span className="font-mono text-[10px] text-emerald-700 flex items-center gap-1">
                  {placedOrder.transactionId}
                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded uppercase">PAID</span>
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-500">
              <span>Delivery Eta Hub:</span>
              <span className="font-bold text-slate-700 font-medium">🛵 Express (<span className="text-emerald-600">10 Mins</span>)</span>
            </div>

            <div className="flex justify-between text-slate-500">
              <span className="">Destination drop address:</span>
              <span className="font-semibold text-slate-600 truncate max-w-[200px]">{selectedAddress}</span>
            </div>
          </div>

          {/* Interactive invoice breakdown toggle */}
          <div className="max-w-md mx-auto space-y-2">
            <button
              onClick={() => setShowReceiptDetail(!showReceiptDetail)}
              className="text-xs text-slate-500 hover:text-emerald-600 font-bold flex items-center gap-1.5 mx-auto py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              {showReceiptDetail ? 'Hide Detailed Grocery Receipt' : 'Expand Grocery Receipt Breakdown'}
            </button>

            {showReceiptDetail && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border rounded-2xl p-4 text-left text-xs space-y-3 shadow-inner"
              >
                <div className="border-b pb-2 font-bold text-[10px] text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Grocery Item</span>
                  <span>Qty • Total</span>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700 text-[11px]">
                      <span>{item.product?.name || 'Deleted Product'} <span className="text-slate-400">({item.product?.unit || '1 unit'})</span></span>
                      <span className="font-mono text-slate-800 font-bold">x{item.quantity} • ₹{(item.product?.price || 0) * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed pt-2 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-mono">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  {deliveryTip > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-500/5 px-1.5 py-0.5 rounded-lg">
                      <span>Rider Delivery Tip 💝:</span>
                      <span className="font-mono font-bold">₹{deliveryTip}</span>
                    </div>
                  )}
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Reward / Coupons code off:</span>
                      <span className="font-mono">-₹{finalDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 font-black pt-1.5 border-t">
                    <span>Net Paid Amount:</span>
                    <span className="font-mono text-base text-emerald-700">₹{netTotal}</span>
                  </div>
                </div>

                {/* Simulate invoice downloading PDF */}
                <button
                  onClick={() => {
                    alert("DOWNLOADING INVOICE... Simulated PDF file downloaded: dailymart_invoice_" + placedOrder.id + ".pdf");
                  }}
                  className="w-full mt-2 py-1.5 bg-slate-900 text-white font-extrabold text-[10px] rounded-lg tracking-wider hover:bg-slate-800 uppercase flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Digital PDF Invoice Receipt
                </button>
              </motion.div>
            )}
          </div>

          <div className="h-px bg-slate-100 my-4 max-w-md mx-auto"></div>

          {/* Action buttons */}
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={onBack}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer text-xs uppercase cursor-pointer"
            >
              🚀 Track Live Store Dispatch Progress Now ({successForwardTimer}s)
            </button>
            <p className="text-[10px] text-slate-400 font-semibold italic">or press the Back button inside workspace to return immediately</p>
          </div>

        </div>
      ) : (
        <div id="checkout-main-grid" className="space-y-4">
          
          {/* Nav Header */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 font-bold text-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel & Back to Cart
            </button>
            <span className="text-xs font-black tracking-widest text-[#10b981] uppercase flex items-center gap-1 font-mono">
              <ShieldCheck className="w-4 h-4" /> SECURE CHECKOUT SSL
            </span>
          </div>

          {/* 2. DYNAMIC FAILED PAYMENT DIAGNOSTICS CARD */}
          {paymentError && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-3 text-left shadow-md"
            >
              <div className="flex items-start gap-2.5 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider">Payment Transaction Failure</h4>
                  <p className="text-[11px] font-semibold text-rose-700 leading-normal">{paymentError.message}</p>
                </div>
              </div>

              <div className="bg-white/80 border border-rose-100 rounded-xl p-2.5 px-3 text-[10px] font-mono text-rose-800 space-y-1">
                <div>Source Gateway: <span className="font-extrabold">{paymentError.gateway}</span></div>
                <div>Declined Code: <span className="font-extrabold">{paymentError.code}</span></div>
                <div>Status Reason: <span className="italic">Customer security clearance decline or client balance depletion.</span></div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('COD');
                    setPaymentError(null);
                  }}
                  className="px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Switch pay method to COD
                </button>
                
                {paymentMethod === 'WALLET' && (
                  <button
                    type="button"
                    onClick={() => {
                      setWalletTopUpOpen(true);
                      setPaymentError(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
                  >
                    Quick Wallet Top-up
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentError(null)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-350 rounded-xl text-[10px] font-extrabold uppercase cursor-pointer"
                >
                  Dismiss error
                </button>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-left">
            {/* Step 1: Destination location */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                <MapPin className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">1. Shipping Destination Location</h3>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Selected drop address point:</span>
                <textarea
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none leading-normal font-medium h-16"
                  placeholder="e.g. H.No 5-2/12, Main Road, Mahabubabad, Telangana"
                  required
                />
                {savedAddresses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase mt-1">Quick Select:</span>
                    {savedAddresses.map((ad) => (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => setSelectedAddress(ad.address)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase transition duration-100 cursor-pointer ${
                          selectedAddress === ad.address
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-150'
                        }`}
                      >
                        {ad.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivery Instructions for Rider 🛵:</span>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none leading-normal font-medium"
                  placeholder="e.g. Leave at the gate, call upon arrival, etc."
                />
              </div>
            </div>

            {/* Step 2: Promo Coupons discount section */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                <Gift className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">2. Apply Reward Discount Code</h3>
              </div>

              <div className="space-y-2">
                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo Code (FAST50, FRESH10, VIPDELIVERY)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="bg-slate-50 text-slate-800 flex-1 px-3 py-2 border border-slate-250 rounded-xl uppercase font-black tracking-wider text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white border border-slate-900 rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] bg-emerald-600 text-white font-extrabold rounded px-1.5 py-0.5 uppercase block w-max">
                        {appliedCoupon} ACTIVE
                      </span>
                      <p className="text-[11px] text-emerald-800 font-bold mt-1">₹{couponDiscount} coupon savings automatically saved!</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove Coupon
                    </button>
                  </div>
                )}

                {/* Error & Success info layouts */}
                {couponError && (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" /> {couponSuccess}
                  </p>
                )}

                {/* Visual Clickable Voucher Deck */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">One-Click Available Promos</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                    {[
                      { code: 'FAST50', name: '₹50 flat savings', min: 'Min: ₹200', desc: 'On grocery staples', color: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/25 text-amber-900 disabled:opacity-50' },
                      { code: 'FRESH10', name: '10% on whole cart', min: 'Min: ₹150', desc: 'On fresh greens', color: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/25 text-emerald-900 disabled:opacity-50' },
                      { code: 'VIPDELIVERY', name: 'Free Express Shipping', min: 'Min: ₹0', desc: 'Zero delivery fee', color: 'bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/25 text-sky-900 disabled:opacity-50' }
                    ].map((voucher) => (
                      <button
                        key={voucher.code}
                        type="button"
                        onClick={() => {
                          setCouponCode(voucher.code);
                          setTimeout(() => {
                            const inputCode = voucher.code;
                            if (inputCode === 'FAST50') {
                              if (subtotal < 200) {
                                setCouponError("FAST50 requires a minimum order value of ₹200.");
                                return;
                              }
                              setAppliedCoupon('FAST50');
                              setCouponDiscount(50);
                              setCouponSuccess("FAST50 applied successfully! Saved ₹50 flat.");
                              triggerNotification("Coupon Applied 🎉", "FAST50 coupon code unlocked ₹50 discount!", "success");
                              setCouponCode('');
                            } else if (inputCode === 'FRESH10') {
                              if (subtotal < 150) {
                                setCouponError("FRESH10 requires a minimum order value of ₹150.");
                                return;
                              }
                              setAppliedCoupon('FRESH10');
                              const pctDiscount = Math.round(subtotal * 0.10);
                              setCouponDiscount(pctDiscount);
                              setCouponSuccess(`FRESH10 applied! Saved 10% (₹${pctDiscount}) on fresh greens.`);
                              triggerNotification("10% Saved!", "FRESH10 coupon code applied successfully.", "success");
                              setCouponCode('');
                            } else if (inputCode === 'VIPDELIVERY') {
                              setAppliedCoupon('VIPDELIVERY');
                              setCouponDiscount(deliveryFee);
                              setCouponSuccess("VIPDELIVERY code accepted! Standard delivery fees waived off entirely.");
                              triggerNotification("Free Deliveries waived 🛵", "You saved ₹25 on delivery fees.", "success");
                              setCouponCode('');
                            }
                          }, 50);
                        }}
                        className={`border border-dashed p-2.5 rounded-xl text-left transition active:scale-95 cursor-pointer relative overflow-hidden flex flex-col justify-between ${voucher.color} h-[85px]`}
                        disabled={!!appliedCoupon}
                      >
                        {/* Ticket scissor cuts decoration */}
                        <div className="absolute top-1/2 -left-1.5 w-3 h-3 rounded-full bg-white border-r border-slate-200 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 -right-1.5 w-3 h-3 rounded-full bg-white border-l border-slate-200 -translate-y-1/2"></div>

                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-[9px] tracking-wider text-slate-800 bg-white/80 px-1 py-0.2 rounded border border-slate-200/55">
                              {voucher.code}
                            </span>
                            <span className="text-[7.5px] font-bold opacity-75">{voucher.min}</span>
                          </div>
                          <p className="text-[9.5px] font-black tracking-tight leading-tight mt-1">{voucher.name}</p>
                        </div>
                        <p className="text-[8px] opacity-60 leading-none truncate">{voucher.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2 px-3 text-[10px] text-slate-500 flex gap-2">
                  <span className="font-extrabold uppercase text-amber-600 shrink-0">Available Promos:</span>
                  <span className="font-semibold select-all font-mono">FAST50 (₹50 off, Min ₹200) • FRESH10 (10% off) • VIPDELIVERY (Free Shipping)</span>
                </div>
              </div>
            </div>

            {/* Step 3: Payment Type selection */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">3. Select Payment Method</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                
                {/* 1. Cash on delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3 rounded-2xl text-left border flex flex-col gap-1 cursor-pointer transition ${
                    paymentMethod === 'COD'
                      ? 'border-emerald-600 bg-emerald-50/30 text-slate-850'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs">Cash on Delivery (COD)</span>
                  <span className="text-[9px] text-slate-400 line-clamp-2">Pay cash or scan UPI QR-code directly to delivery rider at your doorstep.</span>
                </button>

                {/* 2. UPI Instant Pay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-2xl text-left border flex flex-col gap-1 cursor-pointer transition ${
                    paymentMethod === 'UPI'
                      ? 'border-emerald-600 bg-emerald-50/30 text-slate-850'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs text-slate-850">UPI Instant Pay</span>
                    <span className="text-[8px] tracking-wide bg-emerald-600 text-white font-black px-1 rounded uppercase">UPI</span>
                  </div>
                  <span className="text-[9px] text-slate-400 line-clamp-2">Instant payment redirect using Google Pay, PhonePe, Paytm, or BHIM.</span>
                </button>

                {/* 3. Credit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`p-3 rounded-2xl text-left border flex flex-col gap-1 cursor-pointer transition ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-indigo-600 bg-indigo-50/30 text-slate-855 font-bold'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs text-slate-800">Credit Card</span>
                    <span className="text-[8px] tracking-wide bg-indigo-600 text-white font-black px-1 rounded uppercase">CC</span>
                  </div>
                  <span className="text-[9px] text-slate-400 line-clamp-2">Secure transaction via Visa, Mastercard, AMEX with 3D Secure verification.</span>
                </button>

                {/* 4. Debit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEBIT_CARD')}
                  className={`p-3 rounded-2xl text-left border flex flex-col gap-1 cursor-pointer transition ${
                    paymentMethod === 'DEBIT_CARD'
                      ? 'border-indigo-600 bg-indigo-50/30 text-slate-855 font-bold'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-xs text-slate-800">Debit Card</span>
                    <span className="text-[8px] tracking-wide bg-indigo-600 text-white font-black px-1 rounded uppercase">DC</span>
                  </div>
                  <span className="text-[9px] text-slate-400 line-clamp-2">Use RuPay, Visa, Mastercard debit cards with bank authentication page.</span>
                </button>

              </div>

              {/* UPI ID Info panel */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-3 animate-fade-in text-slate-700">
                  <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Enter UPI ID</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. mobileNo@ybl, yourname@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="bg-white border text-slate-800 border-slate-205 px-3 py-2 text-xs rounded-xl flex-1 focus:ring-1 focus:ring-emerald-500 outline-none animate-none"
                    />
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    You will receive a payment request on your preferred UPI app. Just enter your UPI PIN there to approve the transaction. Common handles: @okaxis, @okhdfcbank, @paytm, @ybl
                  </p>
                </div>
              )}

              {/* Stripe elements card detail block panel */}
              {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
                <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-150 space-y-4 animate-fade-in text-slate-700">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" /> Secure Card Transaction
                    </h4>
                    <span className="text-[8px] bg-slate-100 uppercase border font-bold px-1 rounded text-slate-500">PCIDSS Compliant</span>
                  </div>

                  {/* HIGH-END INTERACTIVE DEBIT CARD PREVIEW GRAPHICS */}
                  <div className="perspective-1000 max-w-sm mx-auto w-full h-44 cursor-pointer" onClick={() => setIsCardFlipped(!isCardFlipped)}>
                    <motion.div 
                      animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6 }}
                      className="w-full h-full relative transform-style-3d shadow-xl rounded-2xl"
                    >
                      {/* CARD FRONT SIDE GRAPHIC */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 p-4 font-mono text-white rounded-2xl flex flex-col justify-between backface-hidden">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] text-slate-400 uppercase font-bold block">Daily Mart Premium Card</span>
                            <span className="text-xs font-black tracking-widest text-emerald-400">{paymentMethod.replace('_', ' ')}</span>
                          </div>
                          
                          {/* Gold holographic microchip chip */}
                          <div className="w-9 h-7 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-md border border-yellow-200"></div>
                        </div>

                        {/* Interactive formatted card digits */}
                        <div className="text-sm font-black tracking-widest text-center my-4 select-all text-slate-100">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>

                        <div className="flex justify-between text-left text-[9px] text-slate-400">
                          <div>
                            <span className="block text-[7px] text-slate-500 uppercase">Card Holder Name</span>
                            <span className="font-bold text-slate-200 uppercase truncate max-w-[150px] inline-block">{cardHolder || 'Your Name'}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[7px] text-slate-500 uppercase">Expires End</span>
                            <span className="font-bold text-slate-250 font-mono">{cardExpiry || 'MM/YY'}</span>
                          </div>
                        </div>
                      </div>

                      {/* CARD BACK SIDE GRAPHIC */}
                      <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl flex flex-col justify-between backface-hidden [transform:rotateY(180deg)] border-t border-slate-700">
                        <div className="w-full h-9 bg-slate-800 mt-4"></div>
                        
                        <div className="p-4 flex flex-col">
                          <label className="text-[7px] text-slate-400 uppercase tracking-wider text-right pr-2">CVV Security Number</label>
                          <div className="flex justify-between items-center bg-slate-100 text-slate-800 px-3 py-1 text-sm text-right rounded font-bold">
                            <span className="text-xs text-slate-400 font-mono">Daily signature column check</span>
                            <span className="font-mono text-slate-900">{cardCvv || '•••'}</span>
                          </div>
                        </div>

                        <div className="p-3 text-[8px] text-slate-500 text-center font-mono">
                          Simulated Card Elements node. Flip back.
                        </div>
                      </div>

                    </motion.div>
                  </div>

                  {/* CARD INPUT FIELDS */}
                  <div className="space-y-3.5 text-xs pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="Owner Name"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-white px-3 py-2 border border-slate-250 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                          required={paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">16-Digit Card Number</label>
                        <input
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          onFocus={() => setIsCardFlipped(false)}
                          className="w-full bg-white px-3 py-2 border border-slate-250 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-mono tracking-wider"
                          maxLength={19}
                          required={paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          onFocus={() => setIsCardFlipped(false)}
                          className="w-full bg-white px-3 py-1.5 border border-slate-250 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-center"
                          maxLength={5}
                          required={paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">CVV (3 Digits)</label>
                        <input
                          type="password"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          className="w-full bg-white px-3 py-1.5 border border-slate-250 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-center"
                          maxLength={3}
                          required={paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">ZIP Code</label>
                        <input
                          type="text"
                          placeholder="110017"
                          value={cardZip}
                          onChange={(e) => setCardZip(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          className="w-full bg-white px-3 py-1.5 border border-slate-250 text-xs rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-center"
                          maxLength={6}
                          required={paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Razorpay element guide block */}
              {paymentMethod === 'RAZORPAY' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-xs space-y-3 animate-fade-in text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-600 text-[10px] flex items-center gap-1 uppercase">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Razorpay Unified Secure Checkout
                    </span>
                    <span className="text-[8px] bg-white border px-1.5 font-bold uppercase rounded">NPCI UPI Grounded</span>
                  </div>

                  <p className="text-[11px] leading-normal text-slate-500">
                    Choosing Razorpay allows you to pay securely via netbanking options or scanning standard QR codes.
                  </p>
                </div>
              )}

            </div>

            {/* Step 3.5: Add Delivery Partner Tip */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="text-sm">💝</span>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">3.5 Add Delivery Partner Tip</h3>
                </div>
                {deliveryTip > 0 && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setDeliveryTip(0);
                      triggerNotification("Tip Removed 💝", "Delivery partner tip was reset to zero.", "info");
                    }}
                    className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 tracking-wider hover:underline cursor-pointer"
                  >
                    Reset Tip
                  </button>
                )}
              </div>

              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
                100% of your generous tip goes directly to your e-bike delivery partner to appreciate their lightning-fast efforts.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 0, label: 'No Tip' },
                  { value: 10, label: '₹10', desc: '☕ chai break' },
                  { value: 20, label: '₹20', desc: '🍪 small treat' },
                  { value: 50, label: '₹50', desc: '🚀 rider power' }
                ].map((preset) => {
                  const isSelected = deliveryTip === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setDeliveryTip(preset.value);
                        if (preset.value > 0) {
                          triggerNotification("Tip Added! 💝", `Thank you! Added a ₹${preset.value} tip for your delivery partner.`, "success");
                        }
                      }}
                      className={`p-2 py-2.5 rounded-2xl text-center border transition active:scale-95 duration-150 cursor-pointer flex flex-col justify-center items-center ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-black ring-2 ring-emerald-500/10' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{preset.label}</span>
                      {preset.desc && <span className="text-[7.5px] mt-0.5 font-normal opacity-75">{preset.desc}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Invoice Summary Box */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3 pb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">4. Review Bill Invoice Summaries</h3>
              </div>

               <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Basket Items Subtotal:</span>
                  <span className="font-bold text-slate-800 font-mono">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Standard delivery cargo:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {deliveryFee === 0 || appliedCoupon === 'VIPDELIVERY' ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                {deliveryTip > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-100/50">
                    <span className="flex items-center gap-1">Rider Delivery Tip 💝:</span>
                    <span className="font-mono">₹{deliveryTip}</span>
                  </div>
                )}
                {finalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-extrabold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span>Total Coupon & Rewards Discount:</span>
                    <span className="font-mono">-₹{finalDiscount}</span>
                  </div>
                )}
                
                <div className="h-px bg-slate-100 my-2"></div>
                
                <div className="flex justify-between font-black text-sm text-slate-900 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                  <span className="uppercase text-[11px] font-black text-slate-600 flex items-center gap-1">
                    Net Final Amount:
                  </span>
                  <span className="font-mono text-base text-emerald-700 flex items-center gap-1">
                    <span className="text-xs text-slate-400 line-through font-normal">{finalDiscount > 0 ? `₹${subtotal + deliveryFee}` : ''}</span>
                    ₹{netTotal}
                  </span>
                </div>
              </div>

              {/* Place submission button */}
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black py-3 px-6 rounded-2xl shadow-md transition transform active:scale-95 duration-100 cursor-pointer flex justify-between items-center text-xs"
              >
                <span>
                  {isSubmittingOrder ? 'TRANSACTING SECURE PAYMENTS...' : `CONFIRM & DEPOSIT ₹${netTotal} PAY`}
                </span>
                <span className="font-mono uppercase">{paymentMethod === 'COD' ? 'PLACE COD ORDER' : `🔒 ${paymentMethod} SECUREPAY`}</span>
              </button>
            </div>
          </form>

        </div>
      )}



      {/* 4. STRIPE 3D-SECURE SECURE CODING POPUP VERIFIER (Meets requested features criteria!) */}
      {showStripe3DS && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl relative text-slate-800 space-y-4 text-left">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-tight">Stripe 3D-Secure Authorization</h3>
              <p className="text-[11px] text-slate-500 leading-normal pr-4 pl-4">
                Please enter the secure verification code sent to your registered mobile ending in ****.
              </p>
            </div>

            {/* Input code block */}
            <div className="space-y-2 text-center">
              <input
                type="text"
                placeholder="OTP PIN Code"
                maxLength={4}
                value={stripe3dsCode}
                onChange={(e) => setStripe3dsCode(e.target.value.replace(/\D/g, ''))}
                className="w-40 text-center bg-slate-50 font-mono text-lg font-black py-2 rounded-xl border border-slate-250 focus:ring-1 focus:ring-indigo-500 outline-none select-all"
              />
            </div>

            <button
              onClick={handleStripeMockComplete}
              className="w-full bg-[#635bff] hover:bg-[#5b51ea] text-white font-extrabold py-3 rounded-2xl text-xs tracking-wider transition cursor-pointer"
            >
              APPROVE SECURE IDENTITY CHECK
            </button>
          </div>
        </div>
      )}

      {/* 5. COGNIZABLE QUICK TOPUP MODAL (Directly supports the requested user Wallet system topup!) */}
      {walletTopUpOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleWalletTopUpSubmit}
            className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl relative text-slate-850 space-y-4 text-left"
          >
            <button
              type="button"
              onClick={() => setWalletTopUpOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 uppercase">Top-Up Wallet Sync</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">
                Credit funds instantly using Stripe card elements or simulated Razorpay UPI overlays.
              </p>
            </div>

            {/* Input amount */}
            <div className="space-y-1 text-center">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-left">Top-Up Deposit Value</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
                <input
                  type="text"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 font-mono text-center text-lg font-black py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none select-all border pl-8"
                  placeholder="e.g. 500"
                  required
                />
              </div>

              {/* Suggestions shortcuts */}
              <div className="flex justify-center gap-1.5 pt-1 bg-white select-none">
                {['200', '500', '1000', '2000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className="px-2 py-1 bg-slate-105 border hover:bg-slate-150 text-[10px] rounded font-extrabold font-mono"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Gateway */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left block">Checkout Route Channel</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTopUpGateway('Razorpay')}
                  className={`p-2 rounded-xl border text-center transition ${topUpGateway === 'Razorpay' ? 'border-blue-500 bg-blue-50/20 text-blue-800' : 'border-slate-200'}`}
                >
                  UPI (Razorpay Mock)
                </button>
                <button
                  type="button"
                  onClick={() => setTopUpGateway('Stripe')}
                  className={`p-2 rounded-xl border text-center transition ${topUpGateway === 'Stripe' ? 'border-indigo-500 bg-indigo-50/20 text-indigo-800' : 'border-slate-200'}`}
                >
                  Card (Stripe Elements)
                </button>
              </div>
            </div>



            <button
              type="submit"
              disabled={isToppingUp}
              className="w-full bg-slate-900 hover:bg-slate-955 text-white font-black py-3 rounded-2xl text-xs uppercase cursor-pointer"
            >
              🚀 {isToppingUp ? 'DEPOSITING FUNDS...' : `Secure Deposit ₹${topUpAmount} now`}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
