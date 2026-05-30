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
  AlertCircle
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [eta, setEta] = useState<number>(10);
  const [riderMessage, setRiderMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'rider'; text: string; time: string }>>([
    { sender: 'rider', text: 'Hi! I am Rahul, your delivery partner. I am heading to the merchant to collect your order.', time: 'Just now' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cancellation states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered wrong items or size');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleTriggerRefund = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
          `₹${order.total} has been credited back to your SwiftCart Wallet instantly.`,
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
      alert(err.message || 'Error occurred during cancellation.');
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  // Status mapping
  const steps = [
    { label: 'Order Placed', desc: 'Awaiting retailer approval', icon: CheckCircle2 },
    { label: 'Confirmed', desc: 'Seller is packing fresh items', icon: ShieldCheck },
    { label: 'Preparing', desc: 'Inspected & sealed for hygiene', icon: Clock },
    { label: 'Out for Delivery', desc: 'Rider Rahul is racing to your gate', icon: Bike },
    { label: 'Delivered', desc: 'Handed over safely in 10 mins', icon: UserCheck }
  ];

  // Ride progress along route (0 to 100%)
  const [progress, setProgress] = useState<number>(0);

  // Map locations
  const landmarks = [
    { name: 'Seller Hub', x: 20, y: 80, desc: 'Fresh Farms Ltd' },
    { name: 'Siri Fort Junction', x: 45, y: 55, desc: 'Signal crossroads' },
    { name: 'Lodhi Meadows', x: 60, y: 30, desc: 'Midpoint point' },
    { name: 'Your Address', x: 85, y: 15, desc: order.address.slice(0, 20) + '...' }
  ];

  // Simulate real-time progress & status shifts
  useEffect(() => {
    // Determine initial step based on order status
    let initialStep = 1;
    if (order.status === 'confirmed') initialStep = 2;
    else if (order.status === 'dispatched') initialStep = 4;
    else if (order.status === 'delivered') {
      initialStep = 5;
      setProgress(100);
      setEta(0);
    }
    setCurrentStep(initialStep);

    if (order.status === 'delivered') return;

    // Simulation intervals to advance order naturally for real-time fidelity
    const statusTimer = setInterval(() => {
      setCurrentStep(prev => {
        const next = Math.min(prev + 1, 5);
        
        // Callback to parent database node to sync status if needed
        if (onStatusUpdate) {
          const statusKeys: Record<number, 'placed' | 'confirmed' | 'dispatched' | 'delivered'> = {
            1: 'placed',
            2: 'confirmed',
            3: 'confirmed', // Keep confirmed for mid prepares
            4: 'dispatched',
            5: 'delivered'
          };
          onStatusUpdate(statusKeys[next]);
        }

        // Auto Messages from Rider
        if (next === 2) {
          appendMessage('rider', 'Order confirmed by seller! Packed & sealed cleanly. Moving shortly.');
        } else if (next === 3) {
          appendMessage('rider', 'Secure dispatch verified! I have loaded your groceries into my thermally insulated box.');
        } else if (next === 4) {
          appendMessage('rider', "I'm on my way! Google Maps is routing me through Aurobindo Marg. See you in 5 mins!");
          setEta(5);
        } else if (next === 5) {
          appendMessage('rider', 'Delivered safely! Please rate your service in the app layout. Enjoy your organic fruits!');
          setEta(0);
          setProgress(100);
        }
        return next;
      });
    }, 15000); // Shift state every 15 seconds for fast high-impact display

    // Smooth movement of the bicyclist icon
    const movementTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Move quicker as steps advance
        const currentSpeed = currentStep >= 4 ? 4 : 2;
        const nextProgress = Math.min(prev + currentSpeed, 96);
        return nextProgress;
      });
    }, 1200);

    return () => {
      clearInterval(statusTimer);
      clearInterval(movementTimer);
    };
  }, [order.id, currentStep]);

  // Handle setting initial progress
  useEffect(() => {
    if (currentStep === 1) setProgress(5);
    else if (currentStep === 2) setProgress(25);
    else if (currentStep === 3) setProgress(50);
    else if (currentStep === 4) setProgress(75);
    else if (currentStep === 5) setProgress(100);
  }, [currentStep]);

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

    // Responsive delivery system answers
    setTimeout(() => {
      if (textSent.includes('where') || textSent.includes('reach') || textSent.includes('far')) {
        appendMessage('rider', `I am currently crossing Siri Fort crossing. About ${Math.max(2, eta - 2)} mins left to reach!`);
      } else if (textSent.includes('gate') || textSent.includes('security') || textSent.includes('guard')) {
        appendMessage('rider', 'Got it, sir! I will hand it over to the tower security guard / lobby desk or call you upon arrival.');
      } else if (textSent.includes('fresh') || textSent.includes('cold') || textSent.includes('ice')) {
        appendMessage('rider', 'Yes, all chilled dairy items are securely packed in high-grade ice gel packets!');
      } else {
        appendMessage('rider', 'Thank you! I am riding as fast and safely as possible under the 10-mins guarantee.');
      }
    }, 1200);
  };

  // Convert progress (0 to 100) into SVG coordinates along custom road path
  const getRiderCoordinates = () => {
    // Quick quadratic bezier approximation for a windy route
    const p = progress / 100;
    const startX = 20, startY = 80;
    const controlX = 55, controlY = 60;
    const endX = 85, endY = 15;

    // Bezier formula: (1-p)^2 * P0 + 2(1-p)p * P1 + p^2 * P2
    const rx = Math.round((1 - p) * (1 - p) * startX + 2 * (1 - p) * p * controlX + p * p * endX);
    const ry = Math.round((1 - p) * (1 - p) * startY + 2 * (1 - p) * p * controlY + p * p * endY);
    return { x: rx, y: ry };
  };

  const riderCoords = getRiderCoordinates();

  return (
    <div id="live-tracking-panel" className="max-w-4xl mx-auto space-y-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-100 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-emerald-600 font-bold text-xs cursor-pointer"
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Back to Orders
        </button>
        <span className="text-[10px] font-black tracking-widest text-rose-500 bg-rose-50 uppercase px-2 py-1 rounded">
          ORDER TRACKING LIVE 🔴
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Side: Progress tracker timeline */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs md:col-span-5 space-y-5 text-left">
          <div className="border-b border-slate-100 pb-3 space-y-3">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Order reference number</p>
              <h3 className="font-extrabold text-sm text-slate-800 mt-1 flex items-center gap-2">
                #{order.id} 
                <span className="text-xs text-emerald-600 font-mono">• {order.paymentMethod}</span>
              </h3>
            </div>

            {/* SECURE DELIVERY OTP COMPONENT */}
            <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Delivery PIN (OTP)</p>
                <p className="text-lg font-black text-emerald-900 font-mono tracking-widest mt-0.5">{order.otp || '1111'}</p>
              </div>
              <p className="text-[9px] text-emerald-600/80 leading-tight max-w-[150px] text-right">
                Give this code to the rider on delivery arrival.
              </p>
            </div>

            <div className="text-xs flex items-center justify-between text-slate-500">
              <span>ETA Countdown:</span>
              <span className="font-black text-emerald-600 font-mono animate-pulse">{eta > 0 ? `${eta} mins remaining` : 'Arrived!'}</span>
            </div>

            {/* Elegant Cancellation / Instant Refund Action Card */}
            {order.status !== 'delivered' && order.status !== 'refunded' && order.status !== 'rejected' && (
              <div className="pt-3 border-t border-slate-100 text-left">
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-rose-100/65"
                  >
                    🗑️ Cancel Order & Refund Info
                  </button>
                ) : (
                  <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-black text-[11px] text-rose-900 uppercase">Confirm Cancel Purchase?</h4>
                        <p className="text-[10px] text-rose-700 font-semibold mt-0.5 leading-relaxed">
                          This order will be terminated. Since payment was completed via {order.paymentMethod}, a full refund of <span className="font-black text-rose-950 font-mono">₹{order.total}</span> will be credited instantly back to your SwiftCart Wallet balance.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-rose-800 uppercase block tracking-wide">Refund / Cancel Reason</label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full bg-white border border-rose-200 text-slate-800 py-1.5 px-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                      >
                        <option value="Ordered wrong items or size">Ordered wrong items/variant</option>
                        <option value="Change of mind">Change of mind / Ordered by mistake</option>
                        <option value="Rider taking longer than 10 mins">Rider taking longer than expected</option>
                        <option value="Host destination address needs correction">Incorrect drop address</option>
                        <option value="Other / Support case">Other / Support Ticket reason</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                        disabled={isCancelling}
                      >
                        Nevermind, Keep
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerRefund}
                        className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition animate-pulse cursor-pointer"
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

          {/* Timeline Nodes */}
          <div className="space-y-4 relative pl-3">
            <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-slate-100"></div>
            
            {steps.map((s, idx) => {
              const stepIndex = idx + 1;
              const isDone = currentStep >= stepIndex;
              const isActive = currentStep === stepIndex;
              const StepIcon = s.icon;
              
              return (
                <div key={idx} className="flex gap-3 relative z-10 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition ${
                    isDone 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : isActive
                        ? 'bg-amber-100 border-amber-400 text-amber-700 ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <StepIcon className="w-4 h-4" />
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold leading-normal ${
                      isDone ? 'text-slate-800' : isActive ? 'text-amber-800 font-black' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center font-bold text-slate-700">
              RP
            </div>
            <div className="flex-1">
              <h5 className="font-black text-xs text-slate-800">Rahul Prasad</h5>
              <p className="text-[10px] text-slate-400 font-mono">Hero Electric E-Bike • DL-3S-4820</p>
            </div>
            <a 
              href="tel:+919876543210"
              className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Right Side: Map & Live Chat */}
        <div className="md:col-span-7 space-y-4">
          
          {/* Animated Route Tracking Map */}
          <div className="bg-slate-900 rounded-3xl p-4 text-white relative overflow-hidden h-72 shadow-lg flex flex-col justify-between">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[9px] bg-slate-800 border border-slate-700 font-extrabold px-2 py-0.5 rounded text-slate-300">
                GPS ACCURACY 99%
              </span>
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Rahul riding
              </span>
            </div>

            {/* SVG Interactive Map Grid */}
            <div className="w-full h-full relative mt-2">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Simulated Grid Road Paths */}
                <path 
                  d="M 20 80 Q 55 60 85 15" 
                  fill="none" 
                  stroke="#334155" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                />
                
                {/* Completed road journey segment */}
                <path 
                  d="M 20 80 Q 55 60 85 15" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeDasharray="100"
                  strokeDashoffset={100 - progress}
                />

                {/* Subsidary grids routes */}
                <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
              </svg>

              {/* Landmark Node Markers */}
              {landmarks.map((mark, midx) => (
                <div 
                  key={midx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none"
                  style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                >
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    midx === 0 
                      ? 'bg-rose-500 border-rose-200' 
                      : midx === landmarks.length - 1
                        ? 'bg-emerald-500 border-emerald-200 animate-bounce'
                        : 'bg-indigo-400 border-indigo-200'
                  }`}></div>
                  <span className="text-[8px] font-black text-slate-300 bg-slate-900/90 whitespace-nowrap px-1 rounded mt-0.5">
                    {mark.name}
                  </span>
                </div>
              ))}

              {/* Dynamic Delivery Bike Icon Moving along path */}
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-full p-1.5 transition-all duration-300 shadow-xl border-2 border-white"
                style={{ left: `${riderCoords.x}%`, top: `${riderCoords.y}%` }}
              >
                <Bike className="w-4 h-4 animate-bounce shrink-0" />
              </div>
            </div>

            <div className="relative z-10 flex text-[9px] text-slate-400 justify-between">
              <span>Location: Aurobindo Marg, Saket NCR</span>
              <span>Speed: 21 km/h</span>
            </div>
          </div>

          {/* SMS / Chat Simulation Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs flex flex-col h-60 text-left">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">Quick-Chat with Delivery Rider</span>
            </div>

            {/* Chat list views */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatHistory.map((chat, cidx) => {
                const isRider = chat.sender === 'rider';
                return (
                  <div 
                    key={cidx} 
                    className={`flex ${isRider ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs ${
                      isRider 
                        ? 'bg-slate-100 text-slate-800 rounded-bl-none' 
                        : 'bg-emerald-600 text-white rounded-br-none font-medium'
                    }`}>
                      <p>{chat.text}</p>
                      <span className={`text-[8px] block text-right mt-0.5 ${
                        isRider ? 'text-slate-400' : 'text-emerald-200'
                      }`}>
                        {chat.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}></div>
            </div>

            {/* Message input triggers */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Ask Rahul a request (e.g. 'Leave with guard', 'Where are you?')"
                value={riderMessage}
                onChange={(e) => setRiderMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-250 px-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button 
                type="submit"
                className="p-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
