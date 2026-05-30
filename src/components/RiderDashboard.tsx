import React, { useState, useEffect, useRef } from 'react';
import { 
  Bike, 
  MapPin, 
  IndianRupee, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  ShoppingBag,
  TrendingUp,
  Map,
  Navigation,
  Power,
  ShieldCheck,
  History,
  Compass,
  CheckCircle2,
  ChevronRight,
  Play,
  Eye,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Order, RiderProfile } from '../types';

// Establish API Key for Google Maps Platform routing
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim().length > 10;

// Coordinate mapping parameters for New Delhi dispatch centers
const DelhiStores: Record<string, { name: string; lat: number; lng: number }> = {
  s1: { name: "Vasant Kunj Base", lat: 28.5385, lng: 77.1610 },
  s2: { name: "Connaught Place Base", lat: 28.6304, lng: 77.2177 },
  s3: { name: "Saket Base Cluster", lat: 28.5244, lng: 77.2066 },
};

// Predictable coordinate generation matching order IDs
const getSellerCoordinates = (sellerId: string) => {
  return DelhiStores[sellerId] || DelhiStores.s1;
};

const getCustomerCoordinates = (orderId: string, sellerId: string) => {
  const base = getSellerCoordinates(sellerId);
  // predictable hashing for Delhi-bound locations
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = 0.009 + (Math.abs(hash % 100) / 3500);
  const lngOffset = 0.009 + (Math.abs((hash >> 8) % 100) / 3500);
  return {
    lat: base.lat + (hash % 2 === 0 ? latOffset : -latOffset),
    lng: base.lng + (((hash >> 4) % 2 === 0) ? lngOffset : -lngOffset)
  };
};

// Helper to calculate distance in KM between 2 points (for metrics representation)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // radius of Earth
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(2));
};

interface RiderDashboardProps {
  userProfile: any;
  onLogout: () => void;
}

// Sub-component nested inside <APIProvider> to safely invoke Map hooks and render Polylines.
interface GoogleRouteDisplayProps {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  travelMode: 'DRIVING' | 'WALKING';
  onMetricsChanged?: (distance: string, duration: string) => void;
}

function GoogleRouteDisplay({ origin, destination, travelMode, onMetricsChanged }: GoogleRouteDisplayProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Clear old tracks
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: travelMode === 'WALKING' ? 'WALKING' : 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then(({ routes }) => {
        if (routes?.[0]) {
          const newPolylines = routes[0].createPolylines();
          newPolylines.forEach(p => {
            p.setMap(map);
            // style the GPS route track
            p.setOptions({
              strokeColor: '#6366f1',
              strokeOpacity: 0.8,
              strokeWeight: 5
            });
          });
          polylinesRef.current = newPolylines;

          // Adjust bounds if viewport available per standard design
          if (routes[0].viewport) {
            map.fitBounds(routes[0].viewport);
          }

          if (onMetricsChanged) {
            const km = (routes[0].distanceMeters / 1000).toFixed(1) + ' km';
            const durationNum = typeof routes[0].durationMillis === 'string' ? parseInt(routes[0].durationMillis, 10) : Number(routes[0].durationMillis);
            const mins = Math.round(durationNum / 60000) + ' mins';
            onMetricsChanged(km, mins);
          }
        }
      })
      .catch((err) => {
        console.error("Google computeRoutes API Error: ", err);
      });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, travelMode]);

  return null;
}

export default function RiderDashboard({ userProfile, onLogout }: RiderDashboardProps) {
  const [riderInfo, setRiderInfo] = useState<RiderProfile | null>(null);
  const [feedOrders, setFeedOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [activeJob, setActiveJob] = useState<Order | null>(null);

  // Availability Online switches
  const [isOnline, setIsOnline] = useState(true);

  // Active Job Sub-stages: 'pickup_nav', 'delivery_nav', 'otp_verify'
  const [deliveryStage, setDeliveryStage] = useState<'pickup_nav' | 'delivery_nav' | 'otp_verify'>('pickup_nav');

  // Animated routing/movement simulated progress percentage (0 - 100%)
  const [routeProgress, setRouteProgress] = useState(0);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);

  // Real-time calculated Google API or Fallback metrics
  const [mapDistance, setMapDistance] = useState("1.8 km");
  const [mapDuration, setMapDuration] = useState("8 mins");

  // OTP inputs keyboard variables
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Developer Map Mode Selector: 'google' | 'fallback'
  const [isSimulationModeActive, setIsSimulationModeActive] = useState(!hasValidKey);

  // Rider's dynamic coordinate state (Simulated GPS positioning)
  const [riderCoords, setRiderCoords] = useState<google.maps.LatLngLiteral>({ lat: 28.5284, lng: 77.2185 });

  const resolvedRiderId = userProfile.id || 'r1';
  const resolvedRiderName = userProfile.name || 'Rohan Kumar';

  useEffect(() => {
    fetchRiderScope();
    const interval = setInterval(() => {
      fetchRiderScope();
    }, 4500);
    return () => clearInterval(interval);
  }, [isOnline]);

  const fetchRiderScope = async () => {
    try {
      // 1. Fetch info for this rider to show correct commission totals
      const rRes = await fetch('/api/riders');
      if (rRes.ok) {
        const ridersList: RiderProfile[] = await rRes.json();
        const matched = ridersList.find(r => r.phone === userProfile.phone || r.id === resolvedRiderId);
        if (matched) {
          setRiderInfo(matched);
        }
      }

      // 2. Fetch order feed
      const oRes = await fetch('/api/orders');
      if (oRes.ok) {
        const ordersList: Order[] = await oRes.json();
        
        // Active job check
        const currentActive = ordersList.find(o => 
          (o.riderId === resolvedRiderId || o.riderName === resolvedRiderName) && 
          o.status !== 'delivered' && o.status !== 'rejected'
        );
        
        if (currentActive) {
          setActiveJob(currentActive);
          // Set appropriate delivery stage if loaded from fresh state
          if (currentActive.status === 'dispatched') {
            // Check if rider has completed pickup or not
            if (currentActive.packingStatus === 'ready' || currentActive.packingStatus === 'packing') {
              // Not yet picked up
            }
          }
        } else {
          setActiveJob(null);
        }

        // Available Job Board Feed: Orders confirmed/prepped by store but unassigned
        const unassignedFeed = ordersList.filter(o => 
          (o.status === 'confirmed' || (o.status === 'placed' && o.packingStatus === 'ready')) && 
          !o.riderId
        );
        setFeedOrders(unassignedFeed);

        // Deliveries History feed: matching this rider that are delivered
        const deliveredHistory = ordersList.filter(o => 
          o.riderId === resolvedRiderId && o.status === 'delivered'
        );
        setCompletedOrders(deliveredHistory);
      }
    } catch (e) {
      console.error("Scope fetching breakdown: ", e);
    }
  };

  // Toggle Online/Offline Profile Status via PUT to /api/riders/:id
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    try {
      const res = await fetch(`/api/riders/${resolvedRiderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextState ? 'available' : 'offline' })
      });
      if (res.ok) {
        fetchRiderScope();
      }
    } catch (e) {
      console.warn("Rider online toggle issue: ", e);
    }
  };

  // Accept a Delivery Ticket Log
  const handleAcceptJob = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dispatched',
          riderId: resolvedRiderId,
          riderName: resolvedRiderName,
          riderPhone: userProfile.phone,
          packingStatus: 'ready' // Set packing status to ready for instant logistics coordination
        })
      });

      if (res.ok) {
        // Increment rider status on the DB
        await fetch(`/api/riders/${resolvedRiderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'delivering' })
        });
        
        // Reset navigation simulation track values
        setRouteProgress(0);
        setDeliveryStage('pickup_nav');
        setIsSimulatingMovement(false);

        // Position rider dynamic starting coords about 1.5km offset from seller Hub
        const targetOrder = feedOrders.find(o => o.id === orderId);
        if (targetOrder) {
          const storeBaseCoords = getSellerCoordinates(targetOrder.sellerId);
          setRiderCoords({
            lat: storeBaseCoords.lat - 0.012,
            lng: storeBaseCoords.lng - 0.012
          });
        }

        fetchRiderScope();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manual or automatic GPS step simulation progressor
  const handleSimulateGPSProgress = () => {
    if (isSimulatingMovement) return;
    setIsSimulatingMovement(true);
    setRouteProgress(0);

    const interval = setInterval(() => {
      setRouteProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingMovement(false);
          return 100;
        }
        return prev + 10; // Progress 10% on each step tick
      });
    }, 400);
  };

  // Process Rider's current simulated coordinate positioning along active stage
  const getInterpolatedCoordinates = () => {
    if (!activeJob) return riderCoords;

    const store = getSellerCoordinates(activeJob.sellerId);
    const customer = getCustomerCoordinates(activeJob.id, activeJob.sellerId);
    const startPoint = deliveryStage === 'pickup_nav' 
      ? { lat: store.lat - 0.012, lng: store.lng - 0.012 } 
      : store;
    const endPoint = deliveryStage === 'pickup_nav' ? store : customer;

    // Linear interpolation
    const ratio = routeProgress / 100;
    const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * ratio;
    const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * ratio;
    return { lat, lng };
  };

  const activeInterpCoords = getInterpolatedCoordinates();

  // Complete Store Pickup Stage, advancing to Customer Delivery navigation
  const handleMarkPickedUp = () => {
    setDeliveryStage('delivery_nav');
    setRouteProgress(0);
    setIsSimulatingMovement(false);
    // Position starting Rider precisely at merchant hub address
    if (activeJob) {
      setRiderCoords(getSellerCoordinates(activeJob.sellerId));
    }
  };

  // Complete Customer Delivery, advancing to OTP dialogue
  const handleArrivedAtDestination = () => {
    setDeliveryStage('otp_verify');
    setEnteredOtp('');
    setOtpError('');
  };

  // Confirm safe delivery and post transaction on correctly verified OTP matching
  const handleVerifyOTPAndSubmit = async () => {
    if (!activeJob) return;

    const actualOtp = activeJob.otp || '1234'; // Default to 1234 safe fallback

    if (enteredOtp.trim() !== actualOtp.trim()) {
      setOtpError("Invalid delivery PIN! Please check the customer's live tracking panel or enter '" + actualOtp + "'.");
      return;
    }

    try {
      // Puts order into complete state, which automatically credits rider ₹50 and releases duty available
      const res = await fetch(`/api/orders/${activeJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      });

      if (res.ok) {
        setActiveJob(null);
        setRouteProgress(0);
        setEnteredOtp('');
        setOtpError('');
        setDeliveryStage('pickup_nav');
        
        // Fetch to sync logs
        fetchRiderScope();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Metrics representations derived from coordinates if API not computed
  useEffect(() => {
    if (!activeJob) return;
    const store = getSellerCoordinates(activeJob.sellerId);
    const customer = getCustomerCoordinates(activeJob.id, activeJob.sellerId);

    let originPt: google.maps.LatLngLiteral = riderCoords;
    let destPt: google.maps.LatLngLiteral = { lat: store.lat, lng: store.lng };

    if (deliveryStage === 'delivery_nav' || deliveryStage === 'otp_verify') {
      originPt = { lat: store.lat, lng: store.lng };
      destPt = { lat: customer.lat, lng: customer.lng };
    }

    const distance = getDistanceKm(originPt.lat, originPt.lng, destPt.lat, destPt.lng);
    const duration = Math.ceil(distance * 4); // roughly 4 mins per KM driving

    setMapDistance(`${distance} km`);
    setMapDuration(`${duration} mins`);
  }, [activeJob, deliveryStage, riderCoords]);

  return (
    <div className="space-y-6 text-left pb-16">
      
      {/* 1. Header Hero Status Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Abstract background graphics representing city grids */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${isOnline ? 'bg-indigo-600' : 'bg-slate-800'} text-white transition-all shadow-md`}>
              <Bike className="w-8 h-8 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-800 text-slate-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Dispatch Agent Desk
                </span>
                {isOnline ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    On Duty
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Off Duty
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black mt-1">{resolvedRiderName}</h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Vehicle: <strong className="text-slate-200">{userProfile.vehicleNumber || 'DL-3S-CQ-8982'}</strong></span>
                <span>•</span>
                <span>Phone: <strong className="text-slate-200">{userProfile.phone}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Online Switch */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <span className={`text-xs font-black transition-colors ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
              <button
                id="online-offline-toggle"
                onClick={handleToggleOnline}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                  isOnline ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
            </div>

            {/* Total Balance Commission Card */}
            <div className="text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-800 min-w-[130px] flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <IndianRupee className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Commission Bal.</p>
                <h4 className="text-xl font-black text-emerald-400 font-mono">₹{riderInfo?.earnings || 0}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Span 8: Map Tracking & Stages Navigation Panel */}
        <div className="lg:col-span-8 space-y-6">

          {/* Active Job Routing & Map */}
          {activeJob ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              {/* Header bar of Stage */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded uppercase">
                      Active Navigation Track
                    </span>
                    <span className="font-mono text-xs text-slate-500 font-bold">
                      ID: #{activeJob.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {deliveryStage === 'pickup_nav' && "Collect from Merchant"}
                    {deliveryStage === 'delivery_nav' && "Deliver to Customer House"}
                    {deliveryStage === 'otp_verify' && "Delivery Verification"}
                  </h3>
                </div>

                {/* GPS Simulated Telemetrics */}
                <div className="flex gap-4">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Distance</span>
                    <p className="text-sm font-black font-mono text-slate-850">{mapDistance}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">ETA Duration</span>
                    <p className="text-sm font-black font-mono text-slate-850">{mapDuration}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Status Stepper Tracker */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { stage: 'pickup_nav', label: '1. Merchant Pickup', desc: 'Heading to hub' },
                  { stage: 'delivery_nav', label: '2. Customer Transit', desc: 'Out for delivery' },
                  { stage: 'otp_verify', label: '3. PIN Handover', desc: 'Secure verification' }
                ].map((s, idx) => {
                  const isActive = deliveryStage === s.stage;
                  const isDone = 
                    (s.stage === 'pickup_nav' && (deliveryStage === 'delivery_nav' || deliveryStage === 'otp_verify')) ||
                    (s.stage === 'delivery_nav' && deliveryStage === 'otp_verify');

                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isActive 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 ring-1 ring-indigo-200' 
                        : isDone 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}
                    >
                      <h4 className="text-xs font-black truncate">{s.label}</h4>
                      <p className="text-[9px] mt-0.5 opacity-80">{s.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* MAP BODY CONTAINER */}
              <div className="space-y-2 relative">
                
                {/* Simulated/Real Map Controls Toggle */}
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    Delhi Logistic Transit Area
                  </span>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setIsSimulationModeActive(false)}
                      disabled={!hasValidKey}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        !isSimulationModeActive && hasValidKey
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 disabled:opacity-40'
                      }`}
                    >
                      Google Maps API
                    </button>
                    <button
                      onClick={() => setIsSimulationModeActive(true)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        isSimulationModeActive 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-500'
                      }`}
                    >
                      Vector Sandbox Map
                    </button>
                  </div>
                </div>

                {/* Google Maps setup instruction guide if required but missing key */}
                {!hasValidKey && !isSimulationModeActive && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-150 text-left space-y-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Key className="w-5 h-5 shrink-0" />
                      <h4 className="font-black text-sm">Google Maps API Key Configuration Required</h4>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      To load actual live satellite routes, you must bind your Google Maps Platform credential API Key. Follow these directions:
                    </p>
                    <div className="text-xs text-slate-700 bg-white/70 p-3 rounded-xl border border-amber-150 space-y-1.5 font-sans leading-relaxed">
                      <p><strong>Step 1:</strong> Obtain a key via <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">Google Cloud Console</a>.</p>
                      <p><strong>Step 2:</strong> Open <strong>Settings</strong> (⚙️ gear icon, top-right) → <strong>Secrets</strong>.</p>
                      <p><strong>Step 3:</strong> Input <code>GOOGLE_MAPS_PLATFORM_KEY</code> as secret name and paste your API key as value.</p>
                      <p><em>The sandbox compiles and boots automatically. No page reload is needed!</em></p>
                    </div>
                    <button
                      onClick={() => setIsSimulationModeActive(true)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl"
                    >
                      Switch back to Vector Sandbox Simulator (Instant preview)
                    </button>
                  </div>
                )}

                {/* REAL GOOGLE MAP CONTAINER */}
                {hasValidKey && !isSimulationModeActive ? (
                  <div className="relative w-full h-80 rounded-3xl overflow-hidden border border-slate-150 bg-slate-100 shadow-inner">
                    <APIProvider apiKey={API_KEY} version="weekly text-left">
                      <GoogleMap
                        defaultCenter={getSellerCoordinates(activeJob.sellerId)}
                        defaultZoom={13}
                        mapId="DEMO_MAP_ID"
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        style={{ width: '100%', height: '100%' }}
                      >
                        {/* 1. Draw Polyline Route */}
                        {deliveryStage === 'pickup_nav' && (
                          <GoogleRouteDisplay 
                            origin={riderCoords} 
                            destination={getSellerCoordinates(activeJob.sellerId)} 
                            travelMode="DRIVING" 
                          />
                        )}
                        {deliveryStage === 'delivery_nav' && (
                          <GoogleRouteDisplay 
                            origin={getSellerCoordinates(activeJob.sellerId)} 
                            destination={getCustomerCoordinates(activeJob.id, activeJob.sellerId)} 
                            travelMode="DRIVING" 
                          />
                        )}

                        {/* 2. Rider Marker */}
                        <AdvancedMarker 
                          position={activeInterpCoords} 
                          title="My Courier Bike Location"
                        >
                          <div className="bg-indigo-600 text-white rounded-full p-2 border-2 border-white shadow-lg animate-bounce select-none">
                            <Bike className="w-5 h-5 shrink-0" />
                          </div>
                        </AdvancedMarker>

                        {/* 3. Merchant / Seller Marker */}
                        <AdvancedMarker 
                          position={getSellerCoordinates(activeJob.sellerId)} 
                          title="Seller Market Hub"
                        >
                          <div className="bg-amber-500 text-white rounded-full p-2 border-2 border-white shadow-lg select-none">
                            <ShoppingBag className="w-5 h-5 shrink-0" />
                          </div>
                        </AdvancedMarker>

                        {/* 4. Customer / Address Dropoff Marker */}
                        <AdvancedMarker 
                          position={getCustomerCoordinates(activeJob.id, activeJob.sellerId)} 
                          title="Deliver to Customer Address"
                        >
                          <div className="bg-rose-600 text-white rounded-full p-2 border-2 border-white shadow-lg select-none">
                            <MapPin className="w-5 h-5 shrink-0" />
                          </div>
                        </AdvancedMarker>

                      </GoogleMap>
                    </APIProvider>
                  </div>
                ) : (
                  /* HIGH FIDELITY VECTOR BACKFALL SIMULATION CANVAS */
                  <div className="relative w-full h-80 bg-slate-950 rounded-3xl border border-slate-800 p-4 text-white overflow-hidden shadow-inner flex flex-col justify-between">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                    
                    {/* Sandboxed GPS Status Header */}
                    <div className="relative z-10 flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-extrabold">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
                        SANDBOX LOGISTIC TRACKER
                      </div>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                        PROG: {routeProgress}%
                      </span>
                    </div>

                    {/* SVG Vector Map Area representing coordinates and wind routes */}
                    <div className="relative w-full h-full my-3 flex items-center justify-center">
                      <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Reference grids */}
                        <circle cx="50" cy="50" r="30" stroke="#1e293b" fill="none" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2" />
                        <line x1="50" y1="10" x2="50" y2="90" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2" />

                        {/* Map routes */}
                        {deliveryStage === 'pickup_nav' ? (
                          <>
                            {/* Path from Rider to Store */}
                            <path d="M 20 80 Q 35 45 50 60" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 20 80 Q 35 45 50 60" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - routeProgress} />
                          </>
                        ) : (
                          <>
                            {/* Path from Store to Customer */}
                            <path d="M 50 60 Q 65 30 80 20" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 50 60 Q 65 30 80 20" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - routeProgress} />
                          </>
                        )}
                      </svg>

                      {/* Store Node (Center of Map Hub) */}
                      <div 
                        className="absolute flex flex-col items-center"
                        style={{ left: '50%', top: '60%' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500 border border-white text-white flex items-center justify-center shadow-lg transform translate-y-[-50%] translate-x-[-50%]">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <span className="text-[8px] bg-slate-900 border border-slate-800 border-slate-200 px-1.5 py-0.5 rounded text-amber-400 font-extrabold whitespace-nowrap mt-1 translate-x-[-15px] translate-y-[5px]">
                          Store Hub
                        </span>
                      </div>

                      {/* Rider Location (Moves Dynamically along stage and progress percentage) */}
                      {deliveryStage === 'pickup_nav' ? (
                        /* Heading to Pickup Hub location */
                        <div 
                          className="absolute flex flex-col items-center transition-all duration-300"
                          style={{
                            left: `${20 + (50 - 20) * (routeProgress / 100)}%`,
                            top: `${80 + (60 - 80) * (routeProgress / 100)}%`
                          }}
                        >
                          <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-xl animate-bounce transform translate-y-[-50%] translate-x-[-50%]">
                            <Bike className="w-5 h-5 shrink-0" />
                          </div>
                          <span className="text-[8px] bg-indigo-900 px-1 rounded text-white font-mono mt-1 transform translate-x-[-2px] translate-y-[5px] whitespace-nowrap">
                            Me (Rider)
                          </span>
                        </div>
                      ) : (
                        /* Route heading towards customer drop off point */
                        <div 
                          className="absolute flex flex-col items-center transition-all duration-300"
                          style={{
                            left: `${50 + (80 - 50) * (routeProgress / 100)}%`,
                            top: `${60 + (20 - 60) * (routeProgress / 100)}%`
                          }}
                        >
                          <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-xl animate-bounce transform translate-y-[-50%] translate-x-[-50%]">
                            <Bike className="w-5 h-5 shrink-0" />
                          </div>
                          <span className="text-[8px] bg-indigo-900 px-1 rounded text-white font-mono mt-1 transform translate-x-[-2px] translate-y-[5px] whitespace-nowrap">
                            Me (Rider)
                          </span>
                        </div>
                      )}

                      {/* Customer Address Node Dropoff */}
                      <div 
                        className="absolute flex flex-col items-center"
                        style={{ left: '80%', top: '20%' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center shadow-lg transform translate-y-[-50%] translate-x-[-50%]">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-rose-400 font-extrabold whitespace-nowrap mt-1 translate-x-[-15px] translate-y-[-5px]">
                          Customer Drop
                        </span>
                      </div>

                    </div>

                    {/* Footer diagnostics telemetry log readout */}
                    <div className="relative z-10 flex text-[9px] text-slate-400 justify-between items-center mt-1">
                      <span>GPS Track: New Delhi Area Logistics Area Grid</span>
                      <span className="text-indigo-400 font-bold">Simulator Connected</span>
                    </div>

                  </div>
                )}

              </div>

              {/* STAGE-SPECIFIC NAVIGATION ACTIONS CARDS */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                <div className="space-y-1.5">
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded uppercase">
                    LOGISTIC SIMULATION STEPS
                  </span>
                  
                  {deliveryStage === 'pickup_nav' && (
                    <div>
                      <h4 className="font-bold text-sm text-slate-850">Direction: Ride to Seller Hub</h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Riding to <span className="font-black text-slate-700">Oliver's shop</span> at Connaught Block B to pick up prepped items.
                      </p>
                    </div>
                  )}

                  {deliveryStage === 'delivery_nav' && (
                    <div>
                      <h4 className="font-bold text-sm text-slate-850">Direction: Ride to Customer House</h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Package collected successfully! Driving safely to <span className="font-black text-slate-700">{activeJob.address}</span>.
                      </p>
                    </div>
                  )}

                  {deliveryStage === 'otp_verify' && (
                    <div>
                      <h4 className="font-bold text-sm text-slate-850">Direction: Ask Customer for Delivery PIN</h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Verify client security code to finalize handover of the organic goods.
                      </p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                  {routeProgress < 100 && deliveryStage !== 'otp_verify' && (
                    <button
                      onClick={handleSimulateGPSProgress}
                      disabled={isSimulatingMovement}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSimulatingMovement ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div>
                          <span>Navigating Satellite Coords... {routeProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-400 animate-pulse fill-emerald-400" />
                          <span>Simulate Ride Movement Progress</span>
                        </>
                      )}
                    </button>
                  )}

                  {routeProgress >= 100 && deliveryStage === 'pickup_nav' && (
                    <button
                      onClick={handleMarkPickedUp}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transform hover:scale-103 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Arrived at Merchant: Collect Box</span>
                    </button>
                  )}

                  {routeProgress >= 100 && deliveryStage === 'delivery_nav' && (
                    <button
                      onClick={handleArrivedAtDestination}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transform hover:scale-103 transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Arrived at Gate: Open Verification PIN Panel</span>
                    </button>
                  )}
                </div>

              </div>

              {/* SECURE DELIVERY OTP KEYPAD BLOCK */}
              {deliveryStage === 'otp_verify' && (
                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  <div className="md:col-span-5 text-left space-y-2">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl w-max">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="font-extrabold text-base text-slate-800">Verify Customer Secure PIN</h4>
                    <p className="text-xs text-slate-500 leading-normal">
                      Ask the resident customer for their 4-digit security code. This code is visible directly inside the customer's order tracking panel.
                    </p>
                    <div className="pt-2">
                      <span className="text-[10px] bg-indigo-200/50 text-indigo-800 font-bold px-2 py-0.5 rounded">
                        Developer Helper Code: <strong className="font-mono text-xs">{activeJob?.otp || '1234'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    <div className="flex flex-col items-center space-y-2">
                      
                      {/* OTP display boxes */}
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map((idx) => {
                          const char = enteredOtp[idx] || '';
                          return (
                            <div 
                              key={idx} 
                              className={`w-12 h-14 rounded-2xl bg-white border-2 flex items-center justify-center text-xl font-black font-mono transition-all ${
                                char 
                                ? 'border-indigo-600 text-indigo-900 shadow-sm' 
                                : 'border-slate-200 text-slate-300'
                              }`}
                            >
                              {char}
                            </div>
                          );
                        })}
                      </div>

                      {otpError && (
                        <p className="text-[10px] font-extrabold text-rose-500 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 animate-shake">
                          {otpError}
                        </p>
                      )}

                      {/* Manual entry buttons array */}
                      <div className="w-full max-w-[240px] grid grid-cols-3 gap-2 pt-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setOtpError('');
                              if (enteredOtp.length < 4) {
                                setEnteredOtp(prev => prev + num);
                              }
                            }}
                            className="p-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-sm rounded-xl transition cursor-pointer shadow-xs active:bg-slate-200 font-mono"
                          >
                            {num}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setEnteredOtp('')}
                          className="p-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer active:bg-slate-300"
                        >
                          Clear
                        </button>

                        <button
                          onClick={() => {
                            setOtpError('');
                            if (enteredOtp.length < 4) {
                              setEnteredOtp(prev => prev + '0');
                            }
                          }}
                          className="p-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-850 font-extrabold text-sm rounded-xl transition cursor-pointer shadow-xs active:bg-slate-250 font-mono"
                        >
                          0
                        </button>

                        <button
                          onClick={() => {
                            setOtpError('');
                            if (enteredOtp.length > 0) {
                              setEnteredOtp(prev => prev.slice(0, -1));
                            }
                          }}
                          className="p-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer active:bg-slate-300"
                        >
                          Del
                        </button>
                      </div>

                      <button
                        onClick={handleVerifyOTPAndSubmit}
                        disabled={enteredOtp.length !== 4}
                        className="w-full max-w-[240px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Verify OTP & Finalize Delivery
                      </button>

                    </div>
                  </div>

                </div>
              )}

              {/* PACKAGE AND CHECKLIST DETAILS CARD */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
                
                {/* Active address specs details */}
                <div className="flex flex-col md:flex-row justify-between gap-4 pb-3 border-b border-slate-200/60 text-xs">
                  
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px]">Destination Client</span>
                    <p className="font-extrabold text-slate-700">{activeJob.customerName || 'Valued Resident Client'}</p>
                    <p className="font-mono text-slate-500 font-semibold">{activeJob.customerPhone}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px]">Street Address</span>
                    <p className="font-extrabold text-slate-700">{activeJob.address}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px]">Cart Packaging value</span>
                    <p className="font-extrabold text-emerald-800">
                      {activeJob.paymentMethod === 'COD' ? `Collect Cash ₹${activeJob.total}` : 'PREPAID UPI (₹0 to collect)'}
                    </p>
                  </div>

                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-400 uppercase tracking-tight text-[9px]">Invoice item checklists ({activeJob.items.length})</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeJob.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-150 font-semibold">
                        <span>{item.product.name} ({item.product.unit})</span>
                        <span className="font-bold text-indigo-700">x {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* NO ACTIVE JOB: PENDING ORDERS JOBS FEED DECK BOARD */
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-lg font-black text-slate-900">Duty Job Board Feed</h3>
                  <p className="text-xs text-slate-400 font-medium">Accept freshly posted deliveries nearby to start collecting commissions</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-full border border-indigo-100">
                  {feedOrders.length} Ready Job{feedOrders.length !== 1 ? 's' : ''}
                </span>
              </div>

              {!isOnline ? (
                /* Offline warning */
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">You are currently Off Duty</h4>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      Toggle the **"DUTY ONLINE"** switch in the upper header bar to declare yourself available and load ready dispatch jobs.
                    </p>
                  </div>
                </div>
              ) : feedOrders.length === 0 ? (
                /* No jobs available */
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Bike className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Scanning for logistics cargo tickets...</h4>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      All orders are currently dispatched! Keep this screen open; new deliveries posted by seller partners will flash here.
                    </p>
                  </div>
                </div>
              ) : (
                /* Active jobs listing array */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {feedOrders.map((job) => {
                    const sellerObj = getSellerCoordinates(job.sellerId);
                    const custObj = getCustomerCoordinates(job.id, job.sellerId);
                    const drivingDistance = getDistanceKm(sellerObj.lat, sellerObj.lng, custObj.lat, custObj.lng);
                    const durationMins = Math.ceil(drivingDistance * 4.5);

                    return (
                      <div 
                        key={job.id} 
                        className="bg-slate-50 hover:bg-slate-100 hover:border-slate-350 rounded-2xl p-4 border border-slate-200 text-left transition flex flex-col justify-between space-y-4 shadow-xs"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-indigo-700 font-mono">#{job.id}</span>
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 font-black border border-emerald-100 px-2 py-0.5 rounded uppercase">
                              PREPPED READY
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5 text-slate-600 font-semibold">
                            <p className="truncate text-slate-800">
                              <span className="text-slate-400 font-bold">Pick Store:</span> {DelhiStores[job.sellerId]?.name || 'Fresh Farms Hub'}
                            </p>
                            <p className="truncate">
                              <span className="text-slate-400 font-bold">Drop to:</span> {job.address}
                            </p>
                            <p className="text-emerald-800 font-bold">
                              <span className="text-slate-400 font-bold">Payout:</span> ₹50 Commission • COD: {job.paymentMethod}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                            <div>
                              <span>Saddle payload:</span>
                              <p className="font-extrabold text-slate-700">{job.items.length} unique items</p>
                            </div>
                            <div className="text-right">
                              <span>Travel scope:</span>
                              <p className="font-extrabold text-slate-700 font-mono">~{drivingDistance} km ({durationMins}m)</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAcceptJob(job.id)}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer text-center"
                        >
                          Accept Cargo Delivery
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* 3. HISTORIC DELIVERIES COMPLETED LOGS HISTORY */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                Completions Duty Logbook
              </h3>
              <span className="text-xs font-bold text-slate-500">{completedOrders.length} Completed trips</span>
            </div>

            {completedOrders.length === 0 ? (
              <p className="text-xs italic text-slate-400 text-center py-6">No completed trips registered in active duty logbook yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-wider pb-2">
                      <th className="py-2.5 font-bold">Order ID</th>
                      <th className="py-2.5 font-bold">Destination Address</th>
                      <th className="py-2.5 font-bold">Comming Date</th>
                      <th className="py-2.5 font-bold">Collected Sum</th>
                      <th className="py-2.5 text-right font-bold">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((hist) => (
                      <tr key={hist.id} className="border-b border-slate-100/60 hover:bg-slate-50/50 font-semibold text-slate-600">
                        <td className="py-3 font-mono font-bold text-indigo-700">#{hist.id}</td>
                        <td className="py-3 truncate max-w-[180px]">{hist.address}</td>
                        <td className="py-3 text-slate-400 font-mono">{new Date(hist.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-3 font-mono">
                          {hist.paymentMethod === 'COD' ? `₹${hist.total} COD` : '₹0 Prepaid'}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-600 font-mono">+ ₹50.00</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Span 4: Earnings metrics breakdown controls cards */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* EARNINGS METRICS BREAKDOWN PANEL */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
              Earnings Performance
            </h3>

            <div className="space-y-4">
              
              {/* Daily Target Progress Wheel alternative */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Daily Target (Commissions)</span>
                  <span className="font-extrabold text-indigo-600">
                    {Math.min(100, Math.round(((riderInfo?.earnings || 0) / 500) * 100))}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((riderInfo?.earnings || 0) / 500) * 100)}%` }}
                  ></div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between leading-none font-medium">
                  <span>Current: ₹{riderInfo?.earnings || 0}</span>
                  <span>Goal: ₹500.00</span>
                </div>
              </div>

              {/* Statistics Grid readout */}
              <div className="grid grid-cols-2 gap-3 text-left">
                
                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Total Deliveries</span>
                  <p className="text-xl font-black text-slate-800 font-mono mt-1">{completedOrders.length}</p>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Customer Rating</span>
                  <p className="text-xl font-black text-emerald-800 font-mono mt-1">4.92 ⭐</p>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Acc. Ratio</span>
                  <p className="text-xl font-black text-amber-800 font-mono mt-1">100%</p>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Online hours</span>
                  <p className="text-xl font-black text-rose-800 font-mono mt-1">{isOnline ? "3.2 hrs" : "0 hrs"}</p>
                </div>

              </div>

              {/* Responsive SVG earnings bars chart */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Weekly Daily Earnings Trend (Incentives + Pay)</span>
                <div className="flex items-end justify-between h-28 pt-4 pb-1 px-2 border-b border-l border-slate-100">
                  {[
                    { day: "Mon", val: 150 },
                    { day: "Tue", val: 350 },
                    { day: "Wed", val: completedOrders.length * 50 },
                    { day: "Thu", val: 0 },
                    { day: "Fri", val: 0 },
                    { day: "Sat", val: 0 },
                    { day: "Sun", val: 0 },
                  ].map((d, index) => {
                    const percentHeight = Math.max(8, Math.min(100, Math.round((d.val / 500) * 100)));
                    return (
                      <div key={index} className="flex flex-col items-center gap-1.5 flex-1 group">
                        <div className="w-full text-[8px] font-black font-semibold text-slate-700 h-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          ₹{d.val}
                        </div>
                        <div 
                          className={`w-4 rounded-t-xs transition-all duration-500 ${
                            d.day === "Wed" ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                          style={{ height: `${percentHeight}px` }}
                        ></div>
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* SYSTEM GUIDELINE ADVICE BAR FOR RIDERS */}
          <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 border border-slate-800 space-y-3.5 shadow-md">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Safety Protocols & SOP
            </h4>
            <ul className="text-[10px] space-y-2 leading-relaxed text-slate-400 font-medium">
              <li className="flex gap-1.5">
                <span className="text-indigo-400 font-bold shrink-0">1.</span>
                <span>Wear your branded helmets and gloves at all times for electric scooter riding safety.</span>
              </li>
              <li className="flex gap-1.5">
                <span className="text-indigo-400 font-bold shrink-0">2.</span>
                <span>Confirm package count before dispatching to prevent inventory miscounts.</span>
              </li>
              <li className="flex gap-1.5">
                <span className="text-indigo-400 font-bold shrink-0">3.</span>
                <span>Collect COD amounts exactly matching the invoice to prevent personal wage penalties.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
