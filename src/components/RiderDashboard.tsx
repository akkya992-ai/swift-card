import React, { useState, useEffect, useRef, Component } from 'react';
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
  Key,
  X,
  Volume2,
  VolumeX,
  Bell,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, RiderProfile } from '../types';

// Coordinate mapping parameters for Mahabubabad, Telangana dispatch centers
const DelhiStores: Record<string, { name: string; lat: number; lng: number }> = {
  s1: { name: "Mahabubabad Main Road Hub", lat: 17.5978, lng: 80.0125 },
  s2: { name: "Kuravi Road Cluster", lat: 17.5850, lng: 80.0250 },
  s3: { name: "Thorrur Road Base", lat: 17.6110, lng: 79.9980 },
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
  reloadUserProfile?: () => Promise<void>;
}

export default function RiderDashboard({ userProfile, onLogout, reloadUserProfile }: RiderDashboardProps) {
  const [riderInfo, setRiderInfo] = useState<RiderProfile | null>(null);
  const [feedOrders, setFeedOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [activeJob, setActiveJob] = useState<Order | null>(null);
  const [riderApprovalStatus, setRiderApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'none'>('none');
  const [riderRejectionReason, setRiderRejectionReason] = useState('');

  // Job Offer alerting tracker
  const [seenJobIds, setSeenJobIds] = useState<string[]>([]);
  const [newJobAlert, setNewJobAlert] = useState<Order | null>(null);
  const isFirstLoadRef = useRef(true);

  // Rider Alarm Sound Alerts Settings
  const [isAlarmEnabled, setIsAlarmEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('rider_alarm_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [alarmVolume, setAlarmVolume] = useState<number>(() => {
    const saved = localStorage.getItem('rider_alarm_volume');
    return saved !== null ? parseFloat(saved) : 0.6;
  });
  const [alarmSound, setAlarmSound] = useState<string>(() => {
    const saved = localStorage.getItem('rider_alarm_sound');
    return saved !== null ? saved : 'chirp';
  });

  const [isPlayingTest, setIsPlayingTest] = useState<string | null>(null);

  const alarmSoundUrls: Record<string, string> = {
    chirp: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav',
    beeping: 'https://assets.mixkit.co/active_storage/sfx/911/911-84.wav',
    bell: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav',
    synth: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
  };

  const playJobAlarm = (soundKey: string, volumeLevel: number, source: 'test' | 'system' = 'system') => {
    if (source === 'test') {
      setIsPlayingTest(soundKey);
      setTimeout(() => setIsPlayingTest(null), 850);
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        // Fallback to legacy Audio tags
        const url = alarmSoundUrls[soundKey] || alarmSoundUrls.chirp;
        const audioObj = new Audio(url);
        audioObj.volume = volumeLevel;
        audioObj.play().catch(() => {});
        return;
      }
      
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      if (soundKey === 'chirp') {
        const playChirp = (delayMs: number) => {
          setTimeout(() => {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            const t = ctx.currentTime;
            
            osc.frequency.setValueAtTime(550, t);
            osc.frequency.exponentialRampToValueAtTime(1455, t + 0.12);
            
            gainNode.gain.setValueAtTime(0.01, t);
            gainNode.gain.linearRampToValueAtTime(volumeLevel * 0.45, t + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            
            osc.start(t);
            osc.stop(t + 0.13);
          }, delayMs);
        };
        playChirp(0);
        playChirp(150);
      } else if (soundKey === 'beeping') {
        const playBeep = (delayMs: number, freq: number, duration: number) => {
          setTimeout(() => {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sawtooth';
            const t = ctx.currentTime;
            
            osc.frequency.setValueAtTime(freq, t);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, t);
            osc.disconnect(gainNode);
            osc.connect(filter);
            filter.connect(gainNode);

            gainNode.gain.setValueAtTime(0.01, t);
            gainNode.gain.linearRampToValueAtTime(volumeLevel * 0.35, t + 0.03);
            gainNode.gain.setValueAtTime(volumeLevel * 0.35, t + duration - 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.01, t + duration);
            
            osc.start(t);
            osc.stop(t + duration + 0.01);
          }, delayMs);
        };
        playBeep(0, 950, 0.15);
        playBeep(220, 780, 0.15);
        playBeep(440, 950, 0.15);
      } else if (soundKey === 'bell') {
        if (ctx.state === 'suspended') ctx.resume();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1250, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2150, now);
        
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(volumeLevel * 0.5, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
      } else if (soundKey === 'synth') {
        const freqs = [440.00, 554.37, 659.25, 880.00];
        freqs.forEach((freq, idx) => {
          setTimeout(() => {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'triangle';
            const t = ctx.currentTime;
            osc.frequency.setValueAtTime(freq, t);
            
            gainNode.gain.setValueAtTime(0.01, t);
            gainNode.gain.linearRampToValueAtTime(volumeLevel * 0.35, t + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            
            osc.start(t);
            osc.stop(t + 0.38);
          }, idx * 80);
        });
      }
    } catch (audioErr) {
      console.log("Rider audio alert fallback bypassed", audioErr);
      try {
        const url = alarmSoundUrls[soundKey] || alarmSoundUrls.chirp;
        const audioObj = new Audio(url);
        audioObj.volume = volumeLevel;
        audioObj.play().catch(() => {});
      } catch (err2) {}
    }
  };

  useEffect(() => {
    localStorage.setItem('rider_alarm_enabled', String(isAlarmEnabled));
  }, [isAlarmEnabled]);

  useEffect(() => {
    localStorage.setItem('rider_alarm_volume', String(alarmVolume));
  }, [alarmVolume]);

  useEffect(() => {
    localStorage.setItem('rider_alarm_sound', alarmSound);
  }, [alarmSound]);

  // Continuous loop alarm trigger when warning rider of a new pending job offer!
  useEffect(() => {
    if (!newJobAlert || !isAlarmEnabled) return;

    // Trigger instant beep once
    playJobAlarm(alarmSound, alarmVolume);

    // Continue repeating sirening alerts every 3500ms until accepted or closed
    const repeatTimer = setInterval(() => {
      playJobAlarm(alarmSound, alarmVolume);
    }, 3500);

    return () => clearInterval(repeatTimer);
  }, [newJobAlert, isAlarmEnabled, alarmSound, alarmVolume]);

  // Telemetry event logging: Alert opened
  useEffect(() => {
    if (newJobAlert) {
      fetch('/api/notifications/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newJobAlert.id,
          role: 'rider',
          eventType: 'opened'
        })
      }).catch(err => console.warn('Rider Alert opened log failed:', err));
    }
  }, [newJobAlert]);

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

  // Developer Map Mode Selector: always defaulted to sandbox for no external OpenStreetMap embeds
  const [isSimulationModeActive, setIsSimulationModeActive] = useState<boolean>(true);

  // Rider's dynamic coordinate state (Simulated GPS positioning)
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number }>({ lat: 17.5925, lng: 80.0150 });

  // Leaflet refs for Active Order map rendering
  const rMapContainerRef = useRef<HTMLDivElement | null>(null);
  const rMapInstanceRef = useRef<L.Map | null>(null);
  const rMarkersRef = useRef<{
    rider?: L.Marker;
    store?: L.Marker;
    customer?: L.Marker;
    polyline?: L.Polyline;
  }>({});

  // FCM Cloud Messaging Preferences & Inbox
  const [fcmToken, setFcmToken] = useState(() => {
    return userProfile.fcmToken || localStorage.getItem('swiftcart_fcm_token_rider') || 'fcm_tok_rider_' + Math.random().toString(36).substring(2, 11).toUpperCase() + '_android';
  });
  const [fcmSaving, setFcmSaving] = useState(false);
  const [fcmMessage, setFcmMessage] = useState('');
  const [fcmNotifications, setFcmNotifications] = useState<any[]>([]);
  const [notifPromos, setNotifPromos] = useState(userProfile.notificationSettings?.promos !== false);
  const [notifStatuses, setNotifStatuses] = useState(userProfile.notificationSettings?.orderStatuses !== false);
  const [notifAlerts, setNotifAlerts] = useState(userProfile.notificationSettings?.systemAlerts !== false);
  const [notifSound, setNotifSound] = useState(userProfile.notificationSettings?.soundEnabled !== false);

  const fetchFcmHistory = async () => {
    try {
      const res = await fetch(`/api/notifications/history/${userProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        setFcmNotifications(data);
      }
    } catch (e) {
      console.warn('Failed to load FCM history', e);
    }
  };

  const syncFcmAndPreferences = async (forceSave = false) => {
    if (!userProfile?.id) return;
    setFcmSaving(true);
    setFcmMessage('');
    try {
      // Register Token
      await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, fcmToken })
      });
      localStorage.setItem('swiftcart_fcm_token_rider', fcmToken);

      // Register Settings
      const settingsRes = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          settings: {
            promos: notifPromos,
            orderStatuses: notifStatuses,
            systemAlerts: notifAlerts,
            soundEnabled: notifSound
          }
        })
      });

      if (settingsRes.ok) {
        if (forceSave) {
          setFcmMessage('FCM high reliability preferences and telemetry synced successfully with best-effort delivery guarantees. 🎉');
          setTimeout(() => setFcmMessage(''), 5500);
        }
        fetchFcmHistory();
      }
    } catch (err) {
      console.error('Failed to register FCM preferences', err);
    } finally {
      setFcmSaving(false);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, userId: userProfile.id })
      });
      setFcmNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    syncFcmAndPreferences(false);
    fetchFcmHistory();
    const t = setInterval(fetchFcmHistory, 10000);
    return () => clearInterval(t);
  }, [userProfile.id]);

  // Background offline alarm simulation states for Rider
  const [swSimulating, setSwSimulating] = useState(false);
  const [swCountdown, setSwCountdown] = useState(0);
  const [swMessage, setSwMessage] = useState('');

  const triggerBackgroundSimulation = () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      setSwMessage('Local Service Worker is initializing. Ensure notifications are permitted and try again in a second!');
      setTimeout(() => setSwMessage(''), 6000);
      return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          setSwMessage('System OS Notification permission is highly suggested for background alarms to buzz when the app is minimized!');
          setTimeout(() => setSwMessage(''), 6000);
        }
      });
    }

    setSwSimulating(true);
    setSwCountdown(5);

    let count = 5;
    const interval = setInterval(() => {
      count--;
      setSwCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setSwSimulating(false);
        
        // Dispatch simulation message to Service Worker with a dynamic orderId
        const linkedOrderId = feedOrders[0]?.id || ('SIM-' + Math.floor(1000 + Math.random() * 9000));
        navigator.serviceWorker.controller?.postMessage({
          type: 'SIMULATE_BACKGROUND_ALARM',
          delay: 100,
          role: 'rider',
          orderId: linkedOrderId
        });
      }
    }, 1000);
  };

  const resolvedRiderId = riderInfo?.id || (userProfile.id
    ? (userProfile.id.startsWith('r_v_') ? userProfile.id : 'r_v_' + userProfile.id)
    : 'r1');
  const resolvedRiderName = userProfile.name || 'Rohan Kumar';

  // Active state synchronization indicators
  const [syncMode, setSyncMode] = useState<'realtime' | 'polling'>('polling');
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [isSyncingState, setIsSyncingState] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initial query pull
    fetchRiderScope();

    // 2. Establish live SSE stream for sub-second updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/updates/stream');
      
      eventSource.onopen = () => {
        setSyncMode('realtime');
        console.log('[SSE] Live connection channel established with dark-store. Orders & Earnings updates active.');
        fetchRiderScope();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'refresh_all') {
            console.log('[SSE] Database synchronized update payload received. Triggering sweep...', data.timestamp);
            fetchRiderScope();
          }
        } catch (e) {
          // Silent parse failure
        }
      };

      eventSource.onerror = () => {
        setSyncMode('polling');
        console.warn('[SSE] EventSource stream interrupted. Gracefully transitioned to polling safety loop.');
      };
    } catch (err) {
      console.warn('[SSE] Could not initialize EventSource. Defaulting to standard interval polling.');
      setSyncMode('polling');
    }

    // 3. Fallback high-consistency interval polling (3 seconds)
    const interval = setInterval(() => {
      fetchRiderScope();
    }, 3000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
    };
  }, [isOnline]);

  const fetchRiderScope = async () => {
    setIsSyncingState(true);
    try {
      // 0. Fetch latest validation/application status from role-requests
      try {
        const savedToken = localStorage.getItem('swiftcart_jwt_token');
        if (savedToken) {
          const reqRes = await fetch('/api/role-requests', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (reqRes.ok) {
            const reqs = await reqRes.json();
            const myReq = reqs.find((r: any) => 
              r.userId === userProfile.id && 
              (r.targetRole === 'rider' || r.requestedRole === 'rider')
            );
            if (myReq) {
              setRiderApprovalStatus(myReq.status);
              setRiderRejectionReason(myReq.rejectionReason || '');
              
              // Automatically reload user profile if elevated to rider role but locally stale
              if (myReq.status === 'approved' && userProfile.role !== 'rider' && reloadUserProfile) {
                reloadUserProfile().catch(err => console.warn("auto-reloading user profile failure:", err));
              }
            } else {
              setRiderApprovalStatus('none');
            }
          }
        }
      } catch (err) {
        console.warn("Skipped role request status fetch:", err);
      }

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
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const oRes = await fetch('/api/orders', {
        headers: savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {}
      });
      if (oRes.ok) {
        const ordersList: Order[] = await oRes.json();
        setLastFetchTime(new Date());
        
        // Active job check
        const currentActive = ordersList.find(o => 
          (o.riderId === resolvedRiderId || o.riderName === resolvedRiderName) && 
          o.status !== 'delivered' && o.status !== 'rejected'
        );
        
        if (currentActive) {
          setActiveJob(currentActive);
          if (currentActive.deliveryStage) {
            setDeliveryStage(currentActive.deliveryStage);
          }
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

        // Notify Rider of new delivery job offers available for pickup!
        if (unassignedFeed.length > 0) {
          if (isFirstLoadRef.current) {
            setSeenJobIds(unassignedFeed.map(jb => jb.id));
            isFirstLoadRef.current = false;
          } else {
            const freshJob = unassignedFeed.find(jb => !seenJobIds.includes(jb.id));
            if (freshJob) {
              setNewJobAlert(freshJob);
              setSeenJobIds(prev => [...prev, freshJob.id]);

              // Audio frequency sound alert trigger
              if (isAlarmEnabled) {
                playJobAlarm(alarmSound, alarmVolume);
              }
            }
          }
        }

        // Deliveries History feed: matching this rider that are delivered
        const deliveredHistory = ordersList.filter(o => 
          o.riderId === resolvedRiderId && o.status === 'delivered'
        );
        setCompletedOrders(deliveredHistory);
      }
    } catch (e) {
      console.error("Scope fetching breakdown: ", e);
    } finally {
      setIsSyncingState(false);
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
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {})
        },
        body: JSON.stringify({
          status: 'dispatched',
          riderId: resolvedRiderId,
          riderName: resolvedRiderName,
          riderPhone: userProfile.phone,
          packingStatus: 'ready', // Set packing status to ready for instant logistics coordination
          deliveryStage: 'pickup_nav'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.order) {
          setActiveJob(json.order);
        }

        // Log action result to backend telemetry
        await fetch('/api/notifications/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            role: 'rider',
            eventType: 'accepted'
          })
        }).catch(err => console.warn('Telemetry accept skip:', err));
        
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

  // Calculate distance between active endpoints for displaying in the dashboard without embedding any Google Maps or OpenStreetMap
  useEffect(() => {
    if (!activeJob) return;
    try {
      const seller = getSellerCoordinates(activeJob.sellerId);
      const customer = getCustomerCoordinates(activeJob.id, activeJob.sellerId);
      const rider = activeInterpCoords;

      const getDistanceNow = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
        const R = 6371;
        const dLat = (c2.lat - c1.lat) * Math.PI / 180;
        const dLng = (c2.lng - c1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) * 
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return parseFloat((R * c).toFixed(1));
      };

      const routeLength = getDistanceNow(rider, deliveryStage === 'pickup_nav' ? seller : customer);
      setMapDistance(routeLength + " km");
      setMapDuration(Math.ceil(routeLength * 3.5) + " mins");
    } catch (err) {
      console.error("Rider Dashboard metrics calculation issue caught:", err);
    }
  }, [activeJob, activeInterpCoords, deliveryStage]);

  // Complete Store Pickup Stage, advancing to Customer Delivery navigation
  const handleMarkPickedUp = async () => {
    setDeliveryStage('delivery_nav');
    setRouteProgress(0);
    setIsSimulatingMovement(false);
    // Position starting Rider precisely at merchant hub address
    if (activeJob) {
      const storeCoords = getSellerCoordinates(activeJob.sellerId);
      setRiderCoords(storeCoords);
      try {
        const savedToken = localStorage.getItem('swiftcart_jwt_token');
        const res = await fetch(`/api/orders/${activeJob.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {})
          },
          body: JSON.stringify({ deliveryStage: 'delivery_nav' })
        });
        
        if (res.ok) {
          const json = await res.json();
          if (json && json.order) {
            setActiveJob(json.order);
          } else {
            setActiveJob(prev => prev ? { ...prev, deliveryStage: 'delivery_nav' } : null);
          }
        }

        // Also update coordinates directly to match store
        await fetch(`/api/riders/${resolvedRiderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: storeCoords.lat, lng: storeCoords.lng })
        });
      } catch (err) {
        console.warn("Could not save deliveryStage to server:", err);
      }
    }
  };

  // Complete Customer Delivery, advancing to OTP dialogue
  const handleArrivedAtDestination = async () => {
    setDeliveryStage('otp_verify');
    setEnteredOtp('');
    setOtpError('');
    if (activeJob) {
      try {
        const savedToken = localStorage.getItem('swiftcart_jwt_token');
        const res = await fetch(`/api/orders/${activeJob.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {})
          },
          body: JSON.stringify({ deliveryStage: 'otp_verify' })
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.order) {
            setActiveJob(json.order);
          } else {
            setActiveJob(prev => prev ? { ...prev, deliveryStage: 'otp_verify' } : null);
          }
        }
      } catch (err) {
        console.warn("Could not save deliveryStage to server:", err);
      }
    }
  };

  // Real-time synchronization of current rider GPS positioning back to server
  useEffect(() => {
    if (!activeJob) return;
    
    const updateCoordinatesOnServer = async () => {
      try {
        await fetch(`/api/riders/${resolvedRiderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: activeInterpCoords.lat,
            lng: activeInterpCoords.lng
          })
        });
      } catch (err) {
        console.warn("Could not sync live rider coords to backend:", err);
      }
    };

    updateCoordinatesOnServer();
  }, [activeInterpCoords.lat, activeInterpCoords.lng, activeJob?.id, resolvedRiderId]);

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
      const savedToken = localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch(`/api/orders/${activeJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(savedToken ? { 'Authorization': `Bearer ${savedToken}` } : {})
        },
        body: JSON.stringify({ status: 'delivered' })
      });

      if (res.ok) {
        const json = await res.json();
        const completedOrderObj = json?.order || { ...activeJob, status: 'delivered', deliveredAt: new Date().toISOString() };
        
        setCompletedOrders(prev => [completedOrderObj, ...prev.filter(o => o.id !== completedOrderObj.id)]);
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

  const riderTodayStr = new Date().toDateString();
  const isRiderDateToday = (dateStr?: string) => {
    try {
      if (!dateStr) return false;
      return new Date(dateStr).toDateString() === riderTodayStr;
    } catch {
      return false;
    }
  };

  const riderTodaysDeliveries = completedOrders.filter(o => isRiderDateToday(o.deliveredAt || o.createdAt || '')).length;
  const riderTodaysEarnings = riderTodaysDeliveries * 50;
  const riderTotalDeliveries = completedOrders.length;
  const riderTotalEarnings = riderInfo?.earnings || (riderTotalDeliveries * 50);

  return (
    <div className="space-y-6 text-left pb-16">

      {/* Active Mode Background Alarm Simulator and Heed */}
      <div className="bg-gradient-to-br from-red-500/15 via-indigo-500/5 to-slate-900 border border-red-500/30 rounded-[32px] p-6 shadow-xl space-y-4 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-red-650/15 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[9px] font-black uppercase tracking-wider">
              🚨 Active-Mode Rider Alarm System
            </span>
            <h3 className="text-sm font-black leading-tight">
              Instant Order Dispatch Loop Alarms Active (24/7 Offline Support)
            </h3>
            <p className="text-[11px] text-slate-400 max-w-2xl leading-normal">
              Keep this tab minimized or locked in your pocket. Even if you do not open the app for over 24 hours, the **PWA Service Worker** remains permanently active to process push events and ring physical dual-tone alarms automatically when an order is assigned!
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2.5 py-1 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Rider SW Active (24/7)
            </span>
          </div>
        </div>

        <div className="relative z-10 p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5 text-left">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">24-Hour Offline Closed-App Proof</span>
            <span className="text-xs font-bold text-slate-350 block">Simulate closed app scenario</span>
          </div>
          
          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={triggerBackgroundSimulation}
              disabled={swSimulating}
              className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-xl text-xs uppercase tracking-wide transition shadow-sm cursor-pointer hover:shadow"
            >
              {swSimulating ? `Starting in ${swCountdown}s (Now Lock/Minimize App!)` : '⚡ Simulate Offline Alarm'}
            </button>
            {swMessage && (
              <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-[11px] font-bold text-right max-w-sm">
                {swMessage}
              </div>
            )}
          </div>
        </div>
      </div>
      
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
              <div className="flex flex-wrap items-center gap-2">
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
                {/* Rider Verification Status Badge */}
                {userProfile.role === 'rider' || riderInfo ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    Verified Partner
                  </span>
                ) : riderApprovalStatus === 'pending' ? (
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                    Verification: Pending Approval
                  </span>
                ) : riderApprovalStatus === 'rejected' ? (
                  <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    Verification: Rejected
                  </span>
                ) : (
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    Sandbox Tester (Mock Rider)
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
            {/* Live Sync Station Control Tag */}
            <div className={`flex items-center gap-2 p-3 bg-slate-950/60 rounded-2xl border ${syncMode === 'realtime' ? 'border-emerald-500/30' : 'border-slate-800'} text-xs`}>
              <span className={`w-2 h-2 rounded-full ${syncMode === 'realtime' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span>
              <div className="text-left leading-normal">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">System connection</span>
                <span className={`font-mono text-[10px] font-black ${syncMode === 'realtime' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {syncMode === 'realtime' ? 'LIVE BROADCAST ⚡' : 'FALLBACK POLLING ⏱️'}
                </span>
                <span className="text-[8px] text-slate-500 block">Checked at {lastFetchTime.toLocaleTimeString()}</span>
              </div>
              <button
                id="force-refresh-button"
                onClick={() => fetchRiderScope()}
                disabled={isSyncingState}
                className="ml-2 hover:bg-slate-800 p-1.5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-slate-700 disabled:opacity-50"
                title="Force refresh database arrays now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingState ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>

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

      {riderApprovalStatus === 'pending' && !riderInfo && userProfile.role !== 'rider' && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-yellow-500 p-4 rounded-3xl text-sm flex items-center gap-3 border-dashed">
          <span className="text-xl">⏰</span>
          <div>
            <p className="font-extrabold uppercase tracking-wide text-[10px] text-yellow-600">Rider Verification Pending Approval</p>
            <p className="text-slate-400 mt-0.5 font-sans text-xs leading-normal">
              Your registration application is submitted and registered on the main system database. System administrators can approve role-requests instantly inside the System Admin workspace console.
            </p>
          </div>
        </div>
      )}

      {riderApprovalStatus === 'rejected' && !riderInfo && userProfile.role !== 'rider' && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-3xl text-sm flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className="font-extrabold uppercase tracking-wide text-[10px] text-rose-500">Rider Verification Rejected</p>
            <p className="text-slate-450 mt-0.5 font-sans text-xs leading-normal">
              Reason: <strong>{riderRejectionReason || 'Does not meet program requirements.'}</strong>. You can re-submit a new application or proceed utilizing Quick Test Mode for simulation.
            </p>
          </div>
        </div>
      )}

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
                          {/* MAP BODY CONTAINER */}
              <div className="space-y-2 relative">
                
                {/* Simulated Map Header */}
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-bold text-slate-500 flex items-center gap-1.5 font-sans">
                    <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
                    Offline Transit Sandbox Map (Telangana Grid)
                  </span>
                  <span className="text-[10px] bg-slate-100 text-indigo-700 py-1 px-2.5 rounded-lg border border-slate-200 font-extrabold uppercase">
                    Zero API Keys Required
                  </span>
                </div>

                {/* HIGH FIDELITY VECTOR BACKFALL SIMULATION CANVAS */}
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
                      <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-rose-400 font-extrabold whitespace-nowrap mt-1 translate-x-[-15px] translate-y-[5px]">
                        Customer Drop
                      </span>
                    </div>

                  </div>

                  {/* Footer diagnostics telemetry log readout */}
                  <div className="relative z-10 flex text-[9px] text-slate-400 justify-between items-center mt-1">
                    <span>GPS Track: Telangana/Mahabubabad Regional Logistics Grid</span>
                    <span className="text-indigo-400 font-bold">Simulator Connected</span>
                  </div>

                </div>

              </div>    </div>

              {/* STAGE-SPECIFIC NAVIGATION ACTIONS CARDS */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                <div className="space-y-1.5">
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded uppercase">
                    LOGISTIC SIMULATION STEPS
                  </span>
                  
                  {deliveryStage === 'pickup_nav' && (
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-850">Direction: Ride to Seller Hub</h4>
                        <p className="text-xs text-slate-500 leading-normal">
                          Riding to <a href={`https://www.google.com/maps/search/?api=1&query=${getSellerCoordinates(activeJob.sellerId).lat},${getSellerCoordinates(activeJob.sellerId).lng}`} target="_blank" rel="noopener noreferrer" className="font-black text-indigo-600 hover:underline cursor-pointer">{activeJob.items[0]?.product?.sellerName || 'Seller Store'}</a> at {DelhiStores[activeJob.sellerId]?.name || 'Mahabubabad Main Road'} to pick up prepped items.
                        </p>
                      </div>
                      <div className="pt-0.5 select-none animate-fade-in">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${getSellerCoordinates(activeJob.sellerId).lat},${getSellerCoordinates(activeJob.sellerId).lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-xs uppercase tracking-tight"
                        >
                          <Compass className="w-3.5 h-3.5 text-amber-600" />
                          <span>Navigate to Seller Hub</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {deliveryStage === 'delivery_nav' && (
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-850">Direction: Ride to Customer House</h4>
                        <p className="text-xs text-slate-500 leading-normal">
                          Package collected successfully! Driving safely to <a href={`https://www.google.com/maps/search/?api=1&query=${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lat},${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lng}`} target="_blank" rel="noopener noreferrer" className="font-black text-indigo-600 hover:underline cursor-pointer">{activeJob.address}</a>.
                        </p>
                      </div>
                      <div className="pt-0.5 select-none font-sans animate-fade-in">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lat},${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-xs uppercase tracking-tight"
                        >
                          <Compass className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Navigate to Customer House</span>
                        </a>
                      </div>
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
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px] block">Street Address</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lat},${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-extrabold text-slate-700 hover:text-indigo-600 hover:underline cursor-pointer block"
                    >
                      {activeJob.address}
                    </a>
                    <div className="pt-1 select-none">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lat},${getCustomerCoordinates(activeJob.id, activeJob.sellerId).lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-2 py-0.5 rounded border border-slate-250 transition-colors uppercase cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-indigo-600" />
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px] block">Seller Store</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${getSellerCoordinates(activeJob.sellerId).lat},${getSellerCoordinates(activeJob.sellerId).lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-extrabold text-slate-700 hover:text-indigo-600 hover:underline cursor-pointer block"
                    >
                      {activeJob.items[0]?.product?.sellerName || 'Verified Store'}
                    </a>
                    <p className="text-[10px] text-slate-500">{DelhiStores[activeJob.sellerId]?.name || 'Mahabubabad Main Road'}</p>
                    <div className="pt-1 select-none">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${getSellerCoordinates(activeJob.sellerId).lat},${getSellerCoordinates(activeJob.sellerId).lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-2 py-0.5 rounded border border-slate-250 transition-colors uppercase cursor-pointer"
                      >
                        <Compass className="w-3 h-3 text-amber-500" />
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-tight text-[9px]">Cart Packaging value</span>
                    <p className="font-extrabold text-emerald-800">
                      {activeJob.paymentMethod === 'COD' ? `Collect Cash ₹${activeJob.total}` : 'PREPAID UPI (₹0 to collect)'}
                    </p>
                  </div>

                </div>

                {activeJob.deliveryInstructions && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 text-xs leading-normal font-medium mt-1">
                    <span className="font-extrabold uppercase text-[9px] tracking-wide block text-amber-800 mb-0.5">💡 Delivery Instructions for Rider:</span>
                    "{activeJob.deliveryInstructions}"
                  </div>
                )}

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
                            <p className="text-slate-800 flex justify-between items-center gap-2">
                              <span className="truncate">
                                <span className="text-slate-400 font-bold">Pick Store:</span> {job.items[0]?.product?.sellerName || 'Nearest Dark Store Base'}
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${sellerObj.lat},${sellerObj.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-0.5 text-[9px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-black cursor-pointer uppercase"
                              >
                                <Compass className="w-2.5 h-2.5" /> Navigate
                              </a>
                            </p>
                            <p className="flex justify-between items-center gap-2">
                              <span className="truncate">
                                <span className="text-slate-400 font-bold">Drop to:</span> {job.address}
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${custObj.lat},${custObj.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-black cursor-pointer uppercase"
                              >
                                <Compass className="w-2.5 h-2.5" /> Navigate
                              </a>
                            </p>
                            <p className="text-emerald-800 font-bold">
                              <span className="text-slate-400 font-bold">Payout:</span> ₹50 Commission • COD: {job.paymentMethod}
                            </p>
                            {job.deliveryInstructions && (
                              <p className="bg-amber-50 text-amber-900 border border-amber-200/50 rounded-lg p-2 text-[11px] leading-snug font-medium truncate" title={job.deliveryInstructions}>
                                <span className="font-bold text-amber-800">Instructions:</span> {job.deliveryInstructions}
                              </p>
                            )}
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

          {/* Dedicated Earnings Section & Revenue Breakdown */}
          <div id="rider-earnings-ledger" className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 font-sans">
                  <span className="p-1 px-2 rounded-lg bg-emerald-500/10 text-emerald-800">
                    <IndianRupee className="w-4 h-4" />
                  </span>
                  Rider Earnings Ledger & Settlement
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Verified real-time payout statement querying the live <code className="bg-slate-100 font-bold px-1 py-0.5 rounded text-emerald-700 font-mono text-[9px]">orders</code> table.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] bg-slate-900 text-slate-100 font-extrabold px-2 py-0.5 rounded tracking-wide font-mono uppercase">
                  Supabase Live Sync
                </span>
                <button
                  onClick={() => fetchRiderScope()}
                  className="p-1 bg-slate-50 flex items-center justify-center text-slate-450 hover:text-slate-800 rounded transition border border-slate-200 cursor-pointer"
                  title="Query database again"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Payout Summary Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden text-left">
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none block">Trips Completed</span>
                <p className="text-2xl font-black text-slate-800 font-mono mt-1.5">{completedOrders.length}</p>
                <span className="text-[8px] text-slate-400 font-medium mt-1 block">Live Database Row Count</span>
              </div>

              <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/30 rounded-2xl relative overflow-hidden text-left">
                <span className="text-[9px] text-emerald-700/80 uppercase font-extrabold tracking-wider leading-none block">Commissions</span>
                <p className="text-2xl font-black text-emerald-900 font-mono mt-1.5">₹{completedOrders.length * 50}</p>
                <span className="text-[8px] text-slate-400 font-medium mt-1 block">Flat ₹50 / successful delivery</span>
              </div>

              <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/30 rounded-2xl relative overflow-hidden text-left">
                <span className="text-[9px] text-indigo-700/80 uppercase font-extrabold tracking-wider leading-none block">Deliv. Tips</span>
                <p className="text-2xl font-black text-indigo-900 font-mono mt-1.5">
                  ₹{completedOrders.reduce((sum, o) => sum + (o.deliveryTip || 0), 0)}
                </p>
                <span className="text-[8px] text-slate-400 font-medium mt-1 block">100% passed to Rider</span>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden text-left text-white col-span-2 md:col-span-1">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-emerald-400 pointer-events-none">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <span className="text-[9px] text-emerald-400 uppercase font-extrabold tracking-wider leading-none block">Total Settlement</span>
                <p className="text-2xl font-black font-mono mt-1.5 text-emerald-400">
                  ₹{completedOrders.reduce((sum, o) => sum + 50 + (o.deliveryTip || 0), 0)}
                </p>
                <span className="text-[8px] text-slate-400 font-normal mt-1 block">Ready for Instant Pay</span>
              </div>
            </div>

            {/* Individual Trip Breakdown with detail values */}
            {completedOrders.length > 0 && (
              <div className="border border-slate-100/80 rounded-2xl overflow-hidden bg-slate-50/20">
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
                  <span>Detailed Ledger Records</span>
                  <span className="text-indigo-600 font-mono">{completedOrders.length} records matched</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {completedOrders.map((itm) => {
                    const tip = itm.deliveryTip || 0;
                    const payout = 50 + tip;
                    return (
                      <div key={itm.id} className="p-3.5 hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600">ID: #{itm.id}</span>
                            <span className="text-[8px] text-slate-400 font-mono font-medium">
                              {new Date(itm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate max-w-[280px]">
                            {itm.address}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right text-[10px] leading-tight text-slate-400 font-medium">
                            <div>Comm: <span className="font-mono text-slate-700">₹50</span></div>
                            {tip > 0 && <div>Tip: <span className="font-mono text-emerald-600">+₹{tip}</span></div>}
                          </div>
                          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100/60 rounded-xl text-center min-w-[76px]">
                            <span className="text-[9px] text-emerald-700 font-black block uppercase tracking-wider leading-none">Payout</span>
                            <span className="font-mono font-black text-emerald-950 text-xs">₹{payout}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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

          {/* Rider FCM Sync & Push notifications Inbox */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-600 animate-pulse" />
                  High-Reliability FCM-Backed Push &amp; PWA Inbox
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Best-effort delivery push channels with automatic retry queues and resilient backup notification stores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => syncFcmAndPreferences(true)}
                disabled={fcmSaving}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-[10px] transition shrink-0 uppercase tracking-widest cursor-pointer flex items-center gap-1"
              >
                {fcmSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Re-sync Token
              </button>
            </div>

            {/* FCM Settings configuration controls */}
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 font-sans">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Registered Device token</span>
                <span className="font-mono bg-white border border-slate-100 px-2 py-1 rounded-lg block truncate max-w-full text-slate-500 font-bold selection:bg-indigo-100">
                  {fcmToken}
                </span>
                <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                  FCM active token. Actual push delivery depends on browser notification permissions, OS level schedules, and battery optimization profiles.
                </p>
              </div>
              <div className="space-y-2 text-left">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Active Channels</span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-600">Rider Alerts (Active)</span>
                  <span className="px-2 py-0.5 bg-sky-50 border border-sky-100 rounded-lg text-[9px] font-black text-sky-600">Duty Dispatch</span>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[9px] font-black text-emerald-600 font-bold">PWA Backup</span>
                </div>
              </div>
            </div>

            {fcmMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/50 rounded-xl text-emerald-800 text-[11px] font-bold text-center animate-fade-in font-sans">
                {fcmMessage}
              </div>
            )}

            {/* FCM notification logs history table */}
            <div className="space-y-3 font-sans text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Notification History Log</span>
              {fcmNotifications.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5 bg-white">
                  <p className="text-xl">📭</p>
                  <h4 className="text-xs font-black text-slate-700">No alerts matching Rider role found</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                    When dispatcher schedules new nearby pickups or order changes, loud sound alarms are pushed immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {fcmNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3.5 rounded-2xl border text-xs relative transition duration-150 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        n.isRead ? 'bg-white border-slate-100 text-slate-400' : 'bg-indigo-50/20 border-indigo-100/30 text-slate-700 font-semibold shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1 pr-4 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-1.5 h-1.5 rounded-full ${n.isRead ? 'bg-slate-300' : 'bg-indigo-600 animate-pulse'}`} />
                          <h4 className="font-extrabold text-[#020617]">{n.title}</h4>
                          <span className="text-[9px] font-semibold text-slate-400 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">{n.body}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markNotificationAsRead(n.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border rounded-lg text-[10px] font-extrabold text-indigo-600 shrink-0 select-none shadow-xs cursor-pointer h-7"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

              {/* DATABASE VERIFIED EARNINGS SUMMARY CARD */}
              <div id="db-verified-earnings-card" className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-slate-800 space-y-2.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-[0.08] text-emerald-900 pointer-events-none">
                  <ShieldCheck className="w-16 h-16" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] text-emerald-800 uppercase font-extrabold tracking-widest leading-none">
                    Database Verified Earnings
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-950 font-mono leading-none">
                    ₹{(completedOrders.length * 50).toLocaleString('en-IN')}.00
                  </span>
                  <span className="text-[9px] text-slate-500 font-extrabold bg-slate-200/30 px-1 py-0.5 rounded leading-none">
                    LIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 leading-snug border-t border-emerald-100 pt-2 flex flex-col gap-1.5 font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Source Table:</span>
                    <strong className="font-mono text-emerald-800 bg-emerald-100/50 px-1.5 py-0.5 rounded text-[9px]">orders</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Completed Trips in DB:</span>
                    <strong className="font-black text-slate-900">{completedOrders.length}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Commission / Trip:</span>
                    <strong className="font-semibold text-slate-950">₹50.00</strong>
                  </div>
                  <div className="flex justify-between items-center text-[9px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Match Pattern:</span>
                    <span className="font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">riderId === '{resolvedRiderId}'</span>
                  </div>
                </div>
              </div>

              {/* Statistics Grid readout */}
              <div className="grid grid-cols-2 gap-3 text-left">
                
                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block">Today's Deliveries</span>
                  <p className="text-xl font-black text-slate-800 font-mono mt-1">{riderTodaysDeliveries}</p>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block">Today's Earnings</span>
                  <p className="text-xl font-black text-emerald-800 font-mono mt-1">₹{riderTodaysEarnings}</p>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block">Total Deliveries</span>
                  <p className="text-xl font-black text-amber-800 font-mono mt-1">{riderTotalDeliveries}</p>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100/40">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none block">Total Earnings</span>
                  <p className="text-xl font-black text-rose-800 font-mono mt-1">₹{completedOrders.length * 50}</p>
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

          {/* RIDER ALARM & DISPATCH NOTIFICATION SETTINGS */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-1.5">
                <Bell className={`w-4 h-4 ${isAlarmEnabled ? 'text-indigo-600 animate-swing' : 'text-slate-400'}`} />
                Dispatch Audio Alarm
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isAlarmEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {isAlarmEnabled ? 'Active' : 'Muted'}
              </span>
            </h3>

            <div className="space-y-4">
              {/* Master Alarm Audio State Toggle switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-xs space-y-0.5 pr-2">
                  <p className="font-bold text-slate-700">Incoming Job Sirens</p>
                  <p className="text-[10px] text-slate-400 font-medium">Plays a repeating audio alert for new job dispatches</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAlarmEnabled(!isAlarmEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                    isAlarmEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      isAlarmEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isAlarmEnabled && (
                <>
                  {/* Select sound effect element */}
                  <div className="space-y-1.5 flex-col text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ring Sound Style</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'chirp', label: 'Bubble Chirp 🫧' },
                        { key: 'beeping', label: 'Beep Sirens 🚨' },
                        { key: 'bell', label: 'Bicycle Bell 🔔' },
                        { key: 'synth', label: 'Alert Accents ⚡' },
                      ].map((item) => {
                        const isTestingNow = isPlayingTest === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setAlarmSound(item.key);
                              playJobAlarm(item.key, alarmVolume, 'test');
                            }}
                            className={`py-2.5 px-2.5 rounded-xl font-bold border transition text-center text-[11px] cursor-pointer relative overflow-hidden active:scale-95 duration-150 ${
                              alarmSound === item.key
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                            }`}
                          >
                            {isTestingNow && (
                              <span className="absolute inset-0 bg-indigo-200/40 animate-pulse pointer-events-none"></span>
                            )}
                            <span className="relative flex items-center justify-center gap-1">
                              {isTestingNow && <span className="text-indigo-600 animate-ping">🔊</span>}
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Volume level range element slider */}
                  <div className="space-y-2 pt-1 text-left">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-black tracking-widest">
                      <span>Alarm Intensity Volume</span>
                      <span className="font-mono text-indigo-600 font-extrabold">{Math.round(alarmVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {alarmVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                      )}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={alarmVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAlarmVolume(val);
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sound Test / Preview button indicator block */}
              <button
                type="button"
                onClick={() => playJobAlarm(alarmSound, alarmVolume, 'test')}
                className={`w-full py-3 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs border relative overflow-hidden group ${
                  isPlayingTest
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-400 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
                }`}
              >
                {isPlayingTest ? (
                  <>
                    <span className="absolute inset-0 bg-white/10 animate-ping pointer-events-none"></span>
                    <span className="inline-block animate-bounce">🎶</span>
                    <span>Sirening Tested Active ({alarmSound.toUpperCase()})</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-indigo-200 group-hover:scale-110 duration-250 transition-transform" />
                    <span>Test Selected Alarm 🔊</span>
                  </>
                )}
              </button>
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

      {newJobAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-indigo-950 border-2 border-indigo-500 rounded-3xl shadow-2xl p-5 text-white animate-bounce-subtle">
          <div className="flex items-center justify-between border-b border-indigo-900 pb-2 mb-3">
            <h4 className="text-xs font-black text-indigo-400 tracking-tight flex items-center gap-1.5 uppercase">
              🛵 New Delivery Order Offer!
            </h4>
            <button 
              onClick={() => {
                fetch('/api/notifications/log-event', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: newJobAlert.id,
                    role: 'rider',
                    eventType: 'rejected'
                  })
                }).catch(err => console.warn('Telemetry reject skip:', err));
                setNewJobAlert(null);
              }}
              className="p-1 text-slate-400 hover:text-white bg-indigo-900 rounded-lg cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5 text-xs text-left">
            <div className="flex justify-between font-mono">
              <span className="text-slate-350">Order ID: <span className="text-white font-extrabold">#{newJobAlert.id}</span></span>
              <span className="text-emerald-400 font-extrabold">Payout: ₹50</span>
            </div>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              A dispatch package is ready at <span className="text-white font-bold">{newJobAlert.items[0]?.product?.sellerName || 'Nearest Dark Store Base'}</span>!
            </p>
            <div className="text-[10px] text-slate-400 pt-0.5">
              📍 Dropoff coordinates: <span className="text-slate-200 font-bold">{newJobAlert.address}</span>
            </div>
            <button 
              onClick={() => {
                handleAcceptJob(newJobAlert.id);
                setNewJobAlert(null);
              }}
              className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-center text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              ACCEPT & START RIDE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
