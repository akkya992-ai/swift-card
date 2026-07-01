import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Bike, 
  Phone, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Send, 
  UserCheck, 
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  ShoppingBag,
  Package,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Order } from '../types';

interface LiveTrackingProps {
  order: Order;
  onBack: () => void;
  onStatusUpdate?: (status: 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'refunded') => void;
  reloadUserProfile?: () => Promise<any>;
  triggerNotification?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'promo') => void;
}

export default function LiveTracking({ 
  order, 
  onBack, 
  onStatusUpdate,
  reloadUserProfile,
  triggerNotification
}: LiveTrackingProps) {
  // Cancellation / refund states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered wrong items or size');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showQrLive, setShowQrLive] = useState(true);
  const [cancelError, setCancelError] = useState('');

  // Chat tracking states and quick responses
  const [riderMessage, setRiderMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'rider'; text: string; time: string }>>(() => [
    { 
      sender: 'rider', 
      text: order.riderName 
        ? `Hi! I am ${order.riderName.split(' ')[0]}, your delivery partner. I am heading to the merchant to collect your order.` 
        : 'Hi! I am your assigned delivery partner. I am heading to the merchant to collect your order.', 
      time: 'Just now' 
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const appendMessage = (sender: 'user' | 'rider', text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender, text, time: timeStr }]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderMessage.trim()) return;

    appendMessage('user', riderMessage);
    const textSent = riderMessage.toLowerCase();
    setRiderMessage('');

    // Pre-scheduled smart replies from simulated rider
    setTimeout(() => {
      if (textSent.includes('where') || textSent.includes('reach') || textSent.includes('far')) {
        appendMessage('rider', `I am on my way, passing through main cross-road. I should arrive in about 4-5 mins!`);
      } else if (textSent.includes('gate') || textSent.includes('security') || textSent.includes('guard')) {
        appendMessage('rider', 'Understood! I will leave it with the security guard / front desk and place an update.');
      } else if (textSent.includes('fresh') || textSent.includes('cold') || textSent.includes('ice') || textSent.includes('melt')) {
        appendMessage('rider', 'Yes! Your chilled products are safely packed inside our cold-preservation thermal wrap.');
      } else {
        appendMessage('rider', 'Thank you! Driving safely to your address now.');
      }
    }, 1100);
  };

  // Instant wallet-credit cancellation system
  const handleTriggerRefund = async () => {
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          refundReason: cancelReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel and refund your order.');
      }

      if (triggerNotification) {
        triggerNotification(
          "Refund Processed! 💳",
          `₹${order.total} has been credited back to your Daily Mart Wallet instantly.`,
          "success"
        );
      }

      if (reloadUserProfile) {
        await reloadUserProfile();
      }

      if (onStatusUpdate) {
        onStatusUpdate('refunded');
      }

      onBack();
    } catch (err: any) {
      const msg = err.message || 'Error occurred during cancellation.';
      if (triggerNotification) {
        triggerNotification('Cancellation Failed', msg, 'warning');
      }
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Dynamic ETA & visual tracker parameters calculations
  const getDeliveryETAString = (): { minutes: string; subtext: string; themeColor: string } => {
    if (order.status === 'delivered') {
      return { minutes: 'Delivered', subtext: 'Successfully completed on time', themeColor: 'text-[#00B853] bg-emerald-50 border-emerald-100' };
    }
    if (order.status === 'refunded') {
      return { minutes: 'Cancelled', subtext: 'Wallet refund has completed', themeColor: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    if (order.status === 'rejected') {
      return { minutes: 'Rejected', subtext: 'Rejected by merchant', themeColor: 'text-slate-500 bg-slate-50 border-slate-100' };
    }

    const isDispatched = order.status === 'dispatched';
    const pStatus = order.packingStatus || 'pending';
    const dStage = order.deliveryStage || 'pickup_nav';

    if (isDispatched) {
      if (dStage === 'otp_verify') {
        return { minutes: 'Arrived! 🚴', subtext: 'Waiting at door to verify PIN', themeColor: 'text-[#00A86B] bg-emerald-50 border-emerald-100 animate-pulse' };
      }
      if (dStage === 'delivery_nav') {
        return { minutes: '3-5 Mins', subtext: 'Rider is speeding down your block', themeColor: 'text-indigo-600 bg-indigo-50 border-indigo-100 font-black' };
      }
      return { minutes: '7-10 Mins', subtext: 'Rider is picking up from seller', themeColor: 'text-amber-600 bg-amber-50 border-amber-100' };
    }

    if (pStatus === 'ready') {
      return { minutes: '10-12 Mins', subtext: 'Awaiting rider agent assignment', themeColor: 'text-amber-600 bg-amber-50 border-amber-100' };
    }
    if (['preparing', 'packing'].includes(pStatus)) {
      return { minutes: '12-15 Mins', subtext: 'Store agents are sealing ingredients', themeColor: 'text-slate-800 bg-slate-50 border-slate-100 font-extrabold' };
    }

    return { minutes: '15-20 Mins', subtext: 'Waiting for store acceptance receipt', themeColor: 'text-slate-700 bg-slate-50 border-slate-100' };
  };

  const etaInfo = getDeliveryETAString();

  // Define the 8 exact statuses requested by the user
  const timelineSteps = [
    { 
      label: 'Order Placed', 
      desc: 'We have received your cart list. Budget security verification locked.', 
      icon: CheckCircle2 
    },
    { 
      label: 'Seller Accepted', 
      desc: 'Merchant has reviewed store stock and acknowledged packaging receipt.', 
      icon: ShieldCheck 
    },
    { 
      label: 'Preparing Order', 
      desc: 'Store representatives are hand-picking, scanning & sterile-bagging groceries.', 
      icon: Clock 
    },
    { 
      label: 'Rider Assigned', 
      desc: 'Nearby delivery partner has accepted coordinates and registered EV unit.', 
      icon: Bike 
    },
    { 
      label: 'Rider Going to Seller', 
      desc: 'Rider has ignited transit and is traveling to merchant hub.', 
      icon: ShoppingBag 
    },
    { 
      label: 'Order Picked Up', 
      desc: 'Sealed crate successfully loaded into cold-preservation thermal bag.', 
      icon: Package 
    },
    { 
      label: 'Out for Delivery', 
      desc: 'Rider is navigation-routing directly to your main entrance pins.', 
      icon: Bike 
    },
    { 
      label: 'Delivered', 
      desc: 'Crate handed over safely of zero-contact protocols.', 
      icon: UserCheck 
    }
  ];

  // Helper code to map dynamic system status triggers into the 8 requested steps
  const getStepStatus = (index: number): 'completed' | 'active' | 'upcoming' => {
    const status = order.status;
    const pStatus = order.packingStatus || 'pending';
    const dStage = order.deliveryStage || 'pickup_nav';
    const hasRider = !!order.riderId;

    if (status === 'delivered') return 'completed';

    switch (index) {
      case 0: // 1. Order Placed
        return 'completed'; // Always passed once on this tracking view

      case 1: // 2. Seller Accepted
        if (['confirmed', 'dispatched'].includes(status)) return 'completed';
        if (pStatus === 'accepted') return 'active';
        return status === 'placed' ? 'active' : 'upcoming'; // Placed is current active until confirmed

      case 2: // 3. Preparing Order
        if (status === 'dispatched' || pStatus === 'ready') return 'completed';
        if (['preparing', 'packing'].includes(pStatus)) return 'active';
        if (status === 'confirmed') return 'active'; // Confirmed maps to seller accepting & prepacking
        return 'upcoming';

      case 3: // 4. Rider Assigned
        if (hasRider) return 'completed';
        if (pStatus === 'ready' && !hasRider) return 'active';
        return 'upcoming';

      case 4: // 5. Rider Going to Seller
        if (hasRider && dStage === 'pickup_nav') return 'active';
        if (hasRider && (dStage === 'delivery_nav' || dStage === 'otp_verify')) return 'completed';
        return 'upcoming';

      case 5: // 6. Order Picked Up
        if (hasRider && (dStage === 'delivery_nav' || dStage === 'otp_verify')) return 'completed';
        if (hasRider && pStatus === 'ready' && dStage === 'pickup_nav') {
          // If rider is assigned, checking item collected
          return 'upcoming';
        }
        return 'upcoming';

      case 6: // 7. Out for Delivery
        if (hasRider && (dStage === 'delivery_nav' || dStage === 'otp_verify')) return 'active';
        return 'upcoming';

      case 7: // 8. Delivered
        return order.status === 'delivered' ? 'completed' : 'upcoming';

      default:
        return 'upcoming';
    }
  };

  // Generate a premium completed stage timestamp based on order.createdAt (+ offsets)
  const getSimulatedStepTime = (orderCreatedAt: string, stepIndex: number) => {
    try {
      const createdDate = new Date(orderCreatedAt);
      // Realistic minutes elapsed relative to creation
      const offsetsInMinutes = [0, 1.2, 3.4, 4.0, 4.8, 6.0, 7.5, 11.0];
      const stepTime = new Date(createdDate.getTime() + offsetsInMinutes[stepIndex] * 60 * 1000);
      const now = new Date();
      // Floor to now so we never show future times
      const displayTime = stepTime < now ? stepTime : now;
      return displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Determine an overall visual slider progress value (0 to 100) for the top CSS tracker
  const getOverallProgressPercentage = (): number => {
    let completedStepsCount = 0;
    for (let i = 0; i < 8; i++) {
      if (getStepStatus(i) === 'completed') {
        completedStepsCount++;
      }
    }
    return Math.floor((completedStepsCount / 8) * 100);
  };

  const progressPercentage = getOverallProgressPercentage();

  // Chat tracking alerts
  const sentStepsRef = useRef<Record<number, boolean>>({});
  useEffect(() => {
    // Sync simulated conversational notifications with steps
    let currentStepIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (getStepStatus(i) === 'active') {
        currentStepIndex = i;
        break;
      }
    }
    if (currentStepIndex === 0) return;
    if (sentStepsRef.current[currentStepIndex]) return;
    sentStepsRef.current[currentStepIndex] = true;

    if (currentStepIndex === 1) {
      appendMessage('rider', 'Order confirmed by seller! Packed & sealed cleanly. Moving shortly.');
    } else if (currentStepIndex === 3) {
      appendMessage('rider', 'Secure dispatch verified! I have loaded your groceries into my thermally insulated box.');
    } else if (currentStepIndex === 5) {
      appendMessage('rider', "I've picked up your order from Oliver's. Racing over right now! 🚴");
    } else if (currentStepIndex === 6) {
      appendMessage('rider', "I'm on my way! Safe travel transit is active. ETA is 3-5 minutes, please keep OTP handy.");
    }
  }, [order.id, order.status, order.packingStatus, order.deliveryStage]);

  return (
    <div id="live-tracking-panel" className="max-w-4xl mx-auto space-y-4 animate-fade-in pl-1 pr-1 pb-16">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-extrabold text-xs cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </button>
        <span className="text-[10px] font-black tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 uppercase px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          DAILY MART DISPATCH FEEDBACK ACTIVE
        </span>
      </div>

      {/* TOP DASHBOARD CARD: REAL-TIME TIMELINE FEEDBACK ETA BANNERS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-xs text-left relative overflow-hidden">
        {/* Background visual styling loops */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] bg-[size:12px_12px] hidden sm:block"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Dropoff Countdown</p>
            <h2 className="text-3xl font-black text-slate-950 font-sans tracking-tight">
              {etaInfo.minutes}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {etaInfo.subtext}
            </p>
          </div>

          {/* SECURE DELIVERY PIN BLOCK */}
          <div className="p-3 bg-emerald-50 hover:bg-emerald-100/75 border border-emerald-150 rounded-2xl flex items-center gap-4 transition duration-200 w-full sm:w-auto">
            <div className="bg-[#00B853] text-white p-2 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] text-[#008A3E] font-black uppercase tracking-wider block">Share OTP with Rider</p>
              <p className="text-xl font-black text-emerald-950 font-mono tracking-widest mt-0.5">{order.otp || '1111'}</p>
            </div>
          </div>
        </div>

        {/* MODERN CUSTOM TRANSIT PROGRESS SLIDER (No maps representation) */}
        <div className="pt-5 space-y-2">
          <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Sealing Bag</span>
            <span>Rider Dispatched</span>
            <span>At Your Gate</span>
          </div>

          <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(5, progressPercentage)}%` }}
            >
              <div className="absolute right-1 top-[2px] w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              ORDER REF: #{order.id} • {order.paymentMethod}
            </span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
              SYSTEM SYNC COMPLETED ({progressPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* CORE 2-COLUMN LAYOUT PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: SWIGGY/BLINKIT STYLE 8-STAGE VERTICAL TIMELINE CARDS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs md:col-span-6 text-left space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-850 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
              Live Logistics Status Tracker
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium leading-normal">
              Direct updates received in real-time. Maps are retired to provide secure, distraction-free order checkpoints.
            </p>
          </div>

          {/* Timeline Nodes */}
          <div className="relative pl-3 pt-2 space-y-5">
            {/* Connecting Vertical Track Thread Bar */}
            <div className="absolute left-[14px] top-4 bottom-4 w-0.5 bg-slate-100"></div>

            {timelineSteps.map((s, idx) => {
              const statusState = getStepStatus(idx);
              const isDone = statusState === 'completed';
              const isActive = statusState === 'active';
              const StepIcon = s.icon;
              
              return (
                <div key={idx} className="flex gap-4 relative z-10 transition-all duration-300">
                  {/* Indicator Bulb Node Dot */}
                  <div className="relative shrink-0">
                    <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border text-xs transition-all duration-300 ${
                      isDone 
                        ? 'bg-[#00B853] border-[#00B853] text-white shadow-sm' 
                        : isActive
                          ? 'bg-amber-100 border-amber-500 text-amber-700 ring-4 ring-amber-400/20 scale-105 font-bold animate-pulse'
                          : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Main descriptions panel */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-xs font-black tracking-tight leading-normal ${
                        isDone ? 'text-slate-800' : isActive ? 'text-amber-700' : 'text-slate-450'
                      }`}>
                        {s.label}
                      </h4>
                      {isDone && (
                        <span className="text-[9px] text-[#008A3E] font-black font-mono tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                          {getSimulatedStepTime(order.createdAt, idx)}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] text-amber-600 font-extrabold font-mono uppercase bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                          Active Now
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 leading-relaxed leading-normal ${
                      isDone ? 'text-slate-500 font-medium' : isActive ? 'text-slate-600 font-semibold' : 'text-slate-400'
                    }`}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cancellation Option Link */}
          {order.status !== 'delivered' && order.status !== 'refunded' && order.status !== 'rejected' && (
            <div className="pt-4 border-t border-slate-100">
              {!showCancelConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError('');
                    setShowCancelConfirm(true);
                  }}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-rose-100/65 uppercase tracking-wide"
                >
                  🗑️ Cancel Purchase & Refund to Wallet
                </button>
              ) : (
                <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-[11px] text-rose-900 uppercase">Confirm Cancel Purchase?</h4>
                      <p className="text-[10px] text-rose-700 font-semibold mt-0.5 leading-relaxed">
                        This order will be terminated. Since payment was completed, a full refund of <span className="font-black text-rose-950 font-mono">₹{order.total}</span> will be credited instantly back to your Daily Mart Wallet balance.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-rose-800 uppercase block tracking-wide">Cancellation Reason</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-white border border-rose-200 text-slate-800 py-1.5 px-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-black cursor-pointer"
                    >
                      <option value="Ordered wrong items or size">Ordered wrong items/variant</option>
                      <option value="Change of mind">Ordered by mistake</option>
                      <option value="Rider taking longer than 10 mins">Rider taking too long</option>
                      <option value="Host destination address needs correction">Incorrect drop address</option>
                      <option value="Other / Support case">Other support issue</option>
                    </select>
                  </div>

                  {cancelError && (
                    <div className="p-2 bg-rose-100/80 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold text-center">
                      {cancelError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="py-2 bg-slate-150 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                      disabled={isCancelling}
                    >
                      Nevermind, Keep
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerRefund}
                      className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer"
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Processing...' : 'Cancel & Refund'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: RIDER DETAILS + LIVE-CHAT SIMULATION + MOBILE SYNC PANEL */}
        <div className="md:col-span-6 space-y-4">
          
          {/* Rider Assigned Profile Block */}
          {order.riderId ? (
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50/70 text-indigo-700 rounded-full border border-indigo-100 flex items-center justify-center font-black text-sm uppercase">
                  {order.riderName ? order.riderName.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'RD'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-black text-sm text-slate-800">{order.riderName || 'Premium Delivery Executive'}</h5>
                    <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide border border-indigo-100 shrink-0">
                      Active EV Agent
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">Daily Mart Electric Fleet • Zero Emission Transit</p>
                  {order.riderPhone && (
                    <p className="text-[10px] text-slate-500 font-sans mt-1">Phone: <span className="font-extrabold text-slate-700">{order.riderPhone}</span></p>
                  )}
                </div>
              </div>
              
              {order.riderPhone && (
                <a 
                  href={`tel:${order.riderPhone}`}
                  className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition shrink-0 self-end sm:self-center border border-emerald-100 active:scale-95 cursor-pointer"
                >
                  <Phone className="w-4.5 h-4.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="bg-amber-50/50 rounded-3xl p-4 border border-amber-100 shadow-xs flex items-center gap-3 text-left">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-lg shadow-inner">
                ⏳
              </div>
              <div>
                <h5 className="font-black text-sm text-amber-900">Rider assignation queue active</h5>
                <p className="text-[10.5px] text-amber-700 font-medium leading-relaxed leading-normal mt-0.5">
                  Your order packing status is complete. Connecting with proximate EV carriers for delivery routing.
                </p>
              </div>
            </div>
          )}

          {/* SMS / CHAT SIMULATION PANEL */}
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs flex flex-col h-64 text-left">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-800 font-sans uppercase tracking-tight">Direct Message Link</span>
            </div>

            {/* Chat conversation lines */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatHistory.map((chat, cidx) => {
                const isRider = chat.sender === 'rider';
                return (
                  <div 
                    key={cidx} 
                    className={`flex ${isRider ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                      isRider 
                        ? 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-150' 
                        : 'bg-indigo-600 text-white rounded-br-none font-medium shadow-xs'
                    }`}>
                      <p className="leading-relaxed">{chat.text}</p>
                      <span className={`text-[8px] block text-right mt-0.5 ${
                        isRider ? 'text-slate-400 font-mono' : 'text-indigo-200 font-mono'
                      }`}>
                        {chat.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}></div>
            </div>

            {/* Quick Presets row tags */}
            <div className="px-2 py-1.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
              {[
                { text: "Leave with guard 👮", response: "Understood! I will drop it off at the lobby security guard block and notify." },
                { text: "Call upon arrival 📞", response: "Yes, sure. I will dial your phone upon arriving at the main gate." },
                { text: "Keep ice cream sealed 🍦", response: "Absolutely. Chilled cargo is stored within padded high-retention packs." },
                { text: "Don't ring the bell 🤫", response: "Understood. I will place it softly on the door sill and text you." }
              ].map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    appendMessage('user', preset.text);
                    setTimeout(() => {
                      appendMessage('rider', preset.response);
                    }, 1000);
                  }}
                  className="bg-white hover:bg-indigo-50 text-slate-650 hover:text-indigo-750 border border-slate-200 hover:border-indigo-200 px-2 py-0.5 rounded-full text-[9px] font-black transition cursor-pointer active:scale-95 uppercase tracking-wide"
                >
                  {preset.text}
                </button>
              ))}
            </div>

            {/* Input typing field */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder={`Text ${order.riderName ? order.riderName.split(' ')[0] : 'your rider'}...`}
                value={riderMessage}
                onChange={(e) => setRiderMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-250 hover:border-slate-350 px-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition active:scale-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* SHARE STATE/QR WIDGET SECTION */}
          <div className="bg-slate-50 rounded-3xl p-3 border border-slate-100 space-y-2 text-left">
            <div className="flex items-center justify-between cursor-pointer group select-none" onClick={() => setShowQrLive(!showQrLive)}>
              <div className="flex items-center gap-2">
                <span className="text-xs">📱</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider font-sans">Track LIVE on smartphone screen</span>
              </div>
              <span className="text-[9.5px] font-black text-indigo-600 bg-indigo-100/50 px-2.5 py-0.5 rounded-lg group-hover:bg-indigo-150 transition-colors whitespace-nowrap">
                {showQrLive ? 'Hide QR Code' : 'Show Scan QR'}
              </span>
            </div>
            
            {showQrLive && (
              <div className="pt-2 border-t border-slate-150/50 flex gap-3 animate-fade-in items-center">
                <div className="p-1 px-1.5 bg-white border border-slate-200 rounded-xl shrink-0 shadow-xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=${encodeURIComponent(
                      typeof window !== 'undefined'
                        ? window.location.origin 
                        : ""
                    )}`}
                    alt="Scan Live Link"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10.5px] text-slate-800 font-extrabold leading-normal">Open tracker bypass sandbox</p>
                  <p className="text-[9.5px] text-slate-450 mt-0.5 leading-relaxed leading-normal">
                    Avoid iframe viewport constraints of AI Studio workspace. Scan with your camera app to tracking order and synchronize delivery state natively.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
