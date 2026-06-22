import React, { useState, useEffect, useRef } from 'react';
import { LogOut, ShieldAlert, Sparkles, User, RefreshCw, Layout, Bike, Store, ShoppingBag, Bell, Volume2, X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { UserRole } from './types';
import AuthPage from './components/AuthPage';
import CustomerApp from './components/CustomerApp';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import RiderDashboard from './components/RiderDashboard';
import LegalPages from './components/LegalPages';
import RoleSelector from './components/RoleSelector';
import { getIsCapacitor, getApiBase } from './apiConfig';
// @ts-ignore
import dailyMartLogo from './assets/images/daily_mart_green_logo_1781598237470.jpg';

export default function App() {
  // Loop-guard mechanism to detect infinite state updates (Requirement 7)
  const renderCountRef = useRef(0);
  const renderTimerRef = useRef<number | null>(null);

  renderCountRef.current += 1;
  if (!renderTimerRef.current && typeof window !== 'undefined') {
    renderTimerRef.current = window.setTimeout(() => {
      if (renderCountRef.current > 45) {
        const errorMsg = `🚨 INFINITE RENDER LOOP DETECTED: App component rendered ${renderCountRef.current} times within a 2-second interval! This suggests a broken React state loop. Forcing fallback crash.`;
        if (typeof window !== 'undefined') {
          (window as any).__addDiagnosticLog?.('error', errorMsg);
        }
        throw new Error(errorMsg);
      }
      renderCountRef.current = 0;
      renderTimerRef.current = null;
    }, 2000);
  }

  // Authentication & session state
  const CURRENT_VERSION = '1.0.0';
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; latestVersion: string; apkUrl: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(() => {
    const raw = typeof window !== 'undefined' ? window.location.pathname : '/';
    return raw === '/index.html' || raw.endsWith('/index.html') ? '/' : raw;
  });
  
  // Loading & status flags
  const [sessionLoading, setSessionLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [splashLoading, setSplashLoading] = useState(true);

  // Admin secure verification layer states
  const [isAdminPasswordVerified, setIsAdminPasswordVerified] = useState(() => {
    return sessionStorage.getItem('is_admin_verified') === 'true';
  });
  const [showAdminVerifyModal, setShowAdminVerifyModal] = useState(false);
  const [adminVerifyPasswordInput, setAdminVerifyPasswordInput] = useState('');
  const [adminVerifyError, setAdminVerifyError] = useState('');
  const [adminVerifyLoading, setAdminVerifyLoading] = useState(false);
  const [pendingAdminSwitch, setPendingAdminSwitch] = useState<{
    customToken?: string;
    customProfile?: any;
  } | null>(null);

  // Global Alarm / Push Notifications States
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [showNotifBanner, setShowNotifBanner] = useState<boolean>(() => {
    return localStorage.getItem('dismiss_notif_banner') !== 'true';
  });
  const [lastCheckedSeenIds, setLastCheckedSeenIds] = useState<Record<string, string[]>>({
    rider: [],
    seller: [],
    admin: []
  });

  // Background and Closed App alarm trigger states
  const [isSWMiniAlarmActive, setIsSWMiniAlarmActive] = useState(false);
  const [swMiniAlarmRole, setSWMiniAlarmRole] = useState('rider');
  const [swMiniAlarmOrderId, setSWMiniAlarmOrderId] = useState('SC-120935');

  // Trigger helper to register and audit background SLA response alarms
  const logAlertEvent = (orderId: string, role: string, eventType: string) => {
    fetch('/api/notifications/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        role,
        eventType
      })
    }).catch(err => console.warn('PWA Alert event log failed:', err));
  };

  // Automated trigger detecting when the alert is displayed on screen (alert_opened_at)
  useEffect(() => {
    if (isSWMiniAlarmActive && swMiniAlarmOrderId && swMiniAlarmRole) {
      logAlertEvent(swMiniAlarmOrderId, swMiniAlarmRole, 'opened');
    }
  }, [isSWMiniAlarmActive, swMiniAlarmOrderId, swMiniAlarmRole]);

  // Service worker background-to-foreground communication listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TRIGGER_EMERGENCYS_SIREN') {
          console.log('[App] SW TRIGGER_EMERGENCYS_SIREN message received!');
          setIsSWMiniAlarmActive(true);
          setSWMiniAlarmRole(event.data.role || 'rider');
          if (event.data.orderId) {
            setSWMiniAlarmOrderId(event.data.orderId);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // Hash-based check on application mount / hash change (when URL launches from SW click)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHash = () => {
      if (window.location.hash.includes('alarm-trigger=true')) {
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const role = urlParams.get('role') || 'rider';
        setIsSWMiniAlarmActive(true);
        setSWMiniAlarmRole(role);
        // Clear hash so reloads don't persist it
        window.location.hash = '';
      }
    };
    
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Synchronized persistent dual-frequency Audio Alarm generator for continuous active mode ring
  useEffect(() => {
    if (!isSWMiniAlarmActive) return;

    const playHighVolumeBuzzer = () => {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        const ctx = new AudioCtxClass();
        const now = ctx.currentTime;

        // Custom Sawtooth rapid alarm oscillations
        const playTone = (frequency: number, delay: number, length: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(frequency, now + delay);
          gain.gain.setValueAtTime(0.3, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + length);
          
          osc.start(now + delay);
          osc.stop(now + delay + length);
        };

        // Dual sirens sounding simultaneously to penetrate sleep
        playTone(1100, 0, 0.35);
        playTone(900, 0.4, 0.35);
      } catch (err) {
        console.warn('AudioContext alert failed:', err);
      }
    };

    playHighVolumeBuzzer();
    const intervalAlert = setInterval(playHighVolumeBuzzer, 1100);

    return () => clearInterval(intervalAlert);
  }, [isSWMiniAlarmActive]);

  // Background poller for 24/7 dispatcher alerts
  useEffect(() => {
    if (!isAuthenticated || !userProfile || selectedRole !== 'rider') return;

    const alarmSoundUrls: Record<string, string> = {
      chirp: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav',
      beeping: 'https://assets.mixkit.co/active_storage/sfx/911/911-84.wav',
      bell: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav',
      synth: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
    };

    const playGlobalAudioAlarm = (style = 'chirp', vol = 0.6) => {
      try {
        const url = alarmSoundUrls[style] || alarmSoundUrls.chirp;
        const audio = new Audio(url);
        audio.volume = vol;
        audio.play().catch(() => {});
      } catch (e) {
        console.warn('Audio play block:', e);
      }
    };

    const triggerWebNotification = (title: string, body: string) => {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
        }
      } catch (err) {
        console.warn('Background notification error:', err);
      }
    };

    // Pre-populate already existing orders once to avoid historic sirens
    const seedActiveIds = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const orders = await res.json();
          setLastCheckedSeenIds(prev => {
            const initialRider = orders
              .filter((o: any) => (o.status === 'confirmed' || (o.status === 'placed' && o.packingStatus === 'ready')) && !o.riderId)
              .map((o: any) => o.id);

            return {
              rider: initialRider,
              seller: prev.seller,
              admin: prev.admin
            };
          });
        }
      } catch (e) {
        console.warn('Could not populate background alert items:', e);
      }
    };

    seedActiveIds();

    const checkBackgroundAlarms = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const orders: any[] = await res.json();

        setLastCheckedSeenIds(prev => {
          let updatedRider = [...prev.rider];
          let playSound = false;
          let sStyle = 'chirp';
          let sVol = 0.6;
          let notifTitle = '';
          let notifBody = '';

          // 1. Rider Job Siren check (runs if logged in user is a rider OR in rider mode workspace)
          const unassignedJobs = orders.filter(o => 
            (o.status === 'confirmed' || (o.status === 'placed' && o.packingStatus === 'ready')) && 
            !o.riderId
          );
          const freshJob = unassignedJobs.find(o => !updatedRider.includes(o.id));
          if (freshJob) {
            updatedRider.push(freshJob.id);
            playSound = true;

            // Read user-defined custom alarm rings
            const savedEnabled = localStorage.getItem('rider_alarm_enabled') !== 'false';
            if (savedEnabled) {
              sStyle = localStorage.getItem('rider_alarm_sound') || 'chirp';
              const savedVol = localStorage.getItem('rider_alarm_volume');
              sVol = savedVol ? parseFloat(savedVol) : 0.6;
            } else {
              playSound = false;
            }

            notifTitle = '🛵 New Delivery Offer!';
            notifBody = `A dispatch ticket worth ₹50 is ready at ${freshJob.items[0]?.product?.sellerName || 'dark store base'}. Open Daily Mart to accept order #${freshJob.id}!`;
          }

          if (playSound) {
            playGlobalAudioAlarm(sStyle, sVol);
            triggerWebNotification(notifTitle, notifBody);
          }

          return {
            rider: updatedRider,
            seller: prev.seller,
            admin: prev.admin
          };
        });

      } catch (err) {
        console.warn('Error inside background monitoring alarm thread:', err);
      }
    };

    const threadInterval = setInterval(checkBackgroundAlarms, 4500);
    return () => clearInterval(threadInterval);

  }, [isAuthenticated, userProfile?.id, userProfile?.role, selectedRole]);

  const handleRequestNotifPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotifPermission(permission);
        if (permission === 'granted') {
          try {
            const bellObj = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
            bellObj.volume = 0.55;
            bellObj.play().catch(() => {});
          } catch(e) {}
          
          new Notification("🔔 Alarms Activated", {
            body: "Daily Mart dispatch ringtones are now configured in your browser. Alarms will sound instantly!",
            icon: '/favicon.ico'
          });
        }
      });
    }
  };

  const handleDismissNotifBanner = () => {
    setShowNotifBanner(false);
    localStorage.setItem('dismiss_notif_banner', 'true');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCapacitor = getIsCapacitor();
      const apiBase = getApiBase();
      console.log('App Boot - API BASE:', apiBase);
      console.log('App Boot - IS CAPACITOR:', isCapacitor);
      
      const win = window as any;
      win.__addDiagnosticLog?.('info', `🎯 App booted with platform: ${isCapacitor ? 'native' : 'web'} and apiBase: ${apiBase}`);
    }

    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', '📱 React: App container component mounted successfully.');
    }
    tryRecoverySession();
    
    const handleLocationChange = () => {
      const raw = window.location.pathname;
      const path = raw === '/index.html' || raw.endsWith('/index.html') ? '/' : raw;
      setCurrentPath(path);
      
      // Auto adjust selected view based on active path
      if (path === '/admin') setSelectedRole('admin');
      else if (path === '/seller') setSelectedRole('seller');
      else if (path === '/rider') setSelectedRole('rider');
      else setSelectedRole('customer');
    };
    
    window.addEventListener('popstate', handleLocationChange);

    // Guarantee minimum splash screen showtime for clean branding transition
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 1800);
    
    return () => {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', '📱 React: App container component unmounted.');
      }
      window.removeEventListener('popstate', handleLocationChange);
      clearTimeout(timer);
    };
  }, []);

  // APK update checker
  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        let base = '';
        if (typeof window !== 'undefined') {
          const isCapacitor = typeof window !== 'undefined' && (
            window.location.protocol === 'file:' ||
            window.location.protocol === 'capacitor:' ||
            !!(window as any).Capacitor?.isNativePlatform?.()
          );
          
          const savedOverride = localStorage.getItem('swiftcart_api_base_override');
          if (isCapacitor) {
            base = savedOverride || '';
          } else {
            // Browser environment - always relative or window.location.origin, no remote hardcoded fallbacks
            base = window.location.origin;
          }
          console.log('API BASE', base);
          console.log('IS CAPACITOR', isCapacitor);
        }
        
        const versionJsonUrl = `${base.replace(/\/+$/, '')}/version.json`;
        console.log('[AutoUpdater] CURRENT_VERSION:', CURRENT_VERSION);
        console.log('[AutoUpdater] TARGET_URL_FETCH:', versionJsonUrl);
        console.log('[AutoUpdater] Checking version from:', versionJsonUrl);
        
        const res = await fetch(versionJsonUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch version.json, status: ${res.status}`);
        }
        const data = await res.json();
        const latestVersion = data.latestVersion;
        const apkUrl = data.apkUrl;
        
        console.log('[AutoUpdater] FETCHED latestVersion:', latestVersion);
        console.log('[AutoUpdater] FETCHED apkUrl:', apkUrl);
        
        if (latestVersion && apkUrl) {
          // Compare semver
          const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
          const curParts = parse(CURRENT_VERSION);
          const latParts = parse(latestVersion);
          let isNewer = false;
          for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
            const curVal = curParts[i] || 0;
            const latVal = latParts[i] || 0;
            if (latVal > curVal) {
              isNewer = true;
              break;
            }
            if (latVal < curVal) {
              break;
            }
          }
          
          console.log('[AutoUpdater] COMPARISON_RESULT (isNewer):', isNewer);
          
          if (isNewer) {
            console.log(`[AutoUpdater] New update found: server has ${latestVersion}, client has ${CURRENT_VERSION}`);
            setUpdateInfo({
              hasUpdate: true,
              latestVersion,
              apkUrl
            });
            console.log('[AutoUpdater] UPDATE_MODAL_SHOWN (shouldShow): true');
          } else {
            console.log('[AutoUpdater] App is up to date.');
            console.log('[AutoUpdater] UPDATE_MODAL_SHOWN (shouldShow): false');
          }
        } else {
          console.log('[AutoUpdater] Missing latestVersion or apkUrl in server response.');
        }
      } catch (err) {
        console.warn('[AutoUpdater] Failed to complete update checks:', err);
      }
    };

    checkAppVersion();
  }, []);

  const handleOpenUpdateUrl = async (url: string) => {
    try {
      const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
      if (isCapacitor) {
        await Browser.open({ url });
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('[AutoUpdater] Capacitor Browser.open error, fallback to window.open', err);
      window.open(url, '_blank');
    }
  };

  // Monitor loading durations (Task 5)
  const [loadingTimeExceeded, setLoadingTimeExceeded] = useState(false);
  useEffect(() => {
    if (sessionLoading || splashLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeExceeded(true);
        if (typeof window !== 'undefined') {
          const win = window as any;
          win.__addDiagnosticLog?.('warn', '⏳ INF_LOAD_ALERT: Loading screens active for over 5 seconds. Providing interactive bypass controls to prevent white/blank screens.');
        }
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeExceeded(false);
    }
  }, [sessionLoading, splashLoading]);

  // Trace active route settings and identify unmatched paths (Requirement 2 & Task 2)
  const prevRouteRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const prevPath = prevRouteRef.current;
      
      win.__addDiagnosticLog?.('info', `🧭 [ROUTING EVENT] Route transition update:`, {
        previousRoute: prevPath || 'INITIAL_MOUNT',
        currentRoute: currentPath,
        time: new Date().toISOString()
      });
      
      const recognizedPaths = ['/', '/admin', '/seller', '/rider', '/privacy', '/terms', '/refunds', ''];
      if (!recognizedPaths.includes(currentPath)) {
        win.__addDiagnosticLog?.('error', `🧭 [ROUTING FAILURE] Route match failure! No component handler registered for: "${currentPath}". Fallback rendering defaults to primary Customer dashboard view.`);
      }
      
      prevRouteRef.current = currentPath;
    }
  }, [currentPath]);

  // Secure path and role protection guard
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      if (currentPath === '/admin') {
        if (userProfile.role !== 'admin') {
          // Show the verification modal. If they fail or cancel, they get redirected to customer home.
          setShowAdminVerifyModal(true);
        } else {
          const isVerified = sessionStorage.getItem('is_admin_verified') === 'true';
          if (!isVerified) {
            setShowAdminVerifyModal(true);
          }
        }
      }
    }
  }, [currentPath, isAuthenticated, userProfile, isAdminPasswordVerified]);

  const navigateRole = (role: UserRole) => {
    const prev = currentPath;
    setSelectedRole(role);
    const path = role === 'customer' ? '/' : `/${role}`;
    
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', `🧭 [ROUTING REDIRECT] Initiated navigateRole redirect: "${role}" workspace`, {
        fromPath: prev,
        toPath: path
      });
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  const handleVerifyAdminPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminVerifyPasswordInput) {
      setAdminVerifyError('Password is required');
      return;
    }

    setAdminVerifyLoading(true);
    setAdminVerifyError('');

    try {
      const savedToken = pendingAdminSwitch?.customToken || localStorage.getItem('swiftcart_jwt_token');
      const res = await fetch('/api/auth/verify-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        body: JSON.stringify({ password: adminVerifyPasswordInput })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminPasswordVerified(true);
        sessionStorage.setItem('is_admin_verified', 'true');
        setShowAdminVerifyModal(false);
        setAdminVerifyPasswordInput('');
        
        if (data.token && data.profile) {
          localStorage.setItem('swiftcart_jwt_token', data.token);
          setToken(data.token);
          setUserProfile(data.profile);
          setIsAuthenticated(true);
        } else if (pendingAdminSwitch?.customToken && pendingAdminSwitch?.customProfile) {
          localStorage.setItem('swiftcart_jwt_token', pendingAdminSwitch.customToken);
          setToken(pendingAdminSwitch.customToken);
          setUserProfile(pendingAdminSwitch.customProfile);
          setIsAuthenticated(true);
        }
        setPendingAdminSwitch(null);
        navigateRole('admin');
      } else {
        setAdminVerifyError(data.error || 'Incorrect admin password');
      }
    } catch (err: any) {
      setAdminVerifyError('Connection failed. Please try again.');
    } finally {
      setAdminVerifyLoading(false);
    }
  };

  const tryRecoverySession = async () => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', '🔑 [SESSION RESTORE ENGINE] Start session restoration sequence.');
    }
    const savedToken = localStorage.getItem('swiftcart_jwt_token');
    
    if (!savedToken) {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', 'ℹ️ [SESSION RESTORE ENGINE] No swiftcart_jwt_token was found in localStorage. Proceeding as Guest customer user.');
      }
      setSessionLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__addDiagnosticLog?.('info', `🔑 [SESSION RESTORE ENGINE] Token discovered in cache. Verifying signature and lifespan with endpoint /api/auth/verify-token`, {
        tokenPreview: `${savedToken.substring(0, 12)}...`
      });
    }

    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const activeToken = data.token || savedToken;
        setToken(activeToken);
        if (data.token) {
          localStorage.setItem('swiftcart_jwt_token', data.token);
        }
        if (data.profile) {
          localStorage.setItem('swiftcart_user_profile', JSON.stringify(data.profile));
        }
        
        // Sync role based on path on load
        const rawPath = window.location.pathname;
        const pathname = rawPath === '/index.html' || rawPath.endsWith('/index.html') ? '/' : rawPath;
        const actualRole = data.role;
        let roleToSet = 'customer';

        if (typeof window !== 'undefined') {
          const win = window as any;
          win.__addDiagnosticLog?.('info', `✅ [SESSION RESTORE ENGINE] Credentials verified successfully! Profile: ${data.profile?.email || 'N/A'}, dbRole: ${actualRole}, targetView: ${pathname}`);
        }

        if (pathname === '/admin') {
          if (actualRole === 'admin') {
            roleToSet = 'admin';
          } else {
            roleToSet = 'customer';
            window.history.replaceState({}, '', '/');
            setCurrentPath('/');
            if (typeof window !== 'undefined') {
              const win = window as any;
              win.__addDiagnosticLog?.('warn', `🧭 [ROUTING GUARD] Non-admin cannot load /admin. Redirecting user to customer home page.`);
            }
          }
        }
        else if (pathname === '/seller') {
          if (actualRole === 'seller') {
            roleToSet = 'seller';
          } else {
            roleToSet = 'customer';
            window.history.replaceState({}, '', '/');
            setCurrentPath('/');
            if (typeof window !== 'undefined') {
              const win = window as any;
              win.__addDiagnosticLog?.('warn', `🧭 [ROUTING GUARD] User lacks seller privileges. Redirecting to customer landing.`);
            }
          }
        }
        else if (pathname === '/rider') {
          if (actualRole === 'rider') {
            roleToSet = 'rider';
          } else {
            roleToSet = 'customer';
            window.history.replaceState({}, '', '/');
            setCurrentPath('/');
            if (typeof window !== 'undefined') {
              const win = window as any;
              win.__addDiagnosticLog?.('warn', `🧭 [ROUTING GUARD] User lacks rider privileges. Redirecting to customer landing.`);
            }
          }
        }
        else if (pathname === '/' || pathname === '') {
          roleToSet = actualRole;
          if (actualRole !== 'customer' && actualRole !== 'admin') {
            window.history.replaceState({}, '', `/${actualRole}`);
            setCurrentPath(`/${actualRole}`);
            if (typeof window !== 'undefined') {
              const win = window as any;
              win.__addDiagnosticLog?.('info', `🧭 [ROUTING GUARD] Auto routing user to corresponding native home view: /${actualRole}`);
            }
          }
        } else {
          roleToSet = 'customer';
          window.history.replaceState({}, '', '/');
          setCurrentPath('/');
        }

        setSelectedRole(roleToSet as UserRole);
        setUserProfile(data.profile);
        setIsAuthenticated(true);
        console.log('[SESSION ENGINE] Recovered JWT for active user: ', data.profile.email);
      } else {
        const isExplicitAuthFailure = res.status === 401 || res.status === 403;
        
        // Attempt Silent L2 session restoration using refresh token rotation first!
        if (res.status === 401) {
          const cachedRefreshToken = localStorage.getItem('swiftcart_refresh_token');
          if (cachedRefreshToken) {
            if (typeof window !== 'undefined') {
              const win = window as any;
              win.__addDiagnosticLog?.('info', '🔄 [SESSION SILENT ATTEMPT] Access token was expired. Attempting silent secure refresh token rotation...');
            }
            try {
              const refreshRes = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: cachedRefreshToken })
              });
              const refreshData = await refreshRes.json();

              if (refreshRes.ok && refreshData.success) {
                setToken(refreshData.token);
                localStorage.setItem('swiftcart_jwt_token', refreshData.token);
                if (refreshData.refreshToken) {
                  localStorage.setItem('swiftcart_refresh_token', refreshData.refreshToken);
                }
                if (refreshData.profile) {
                  localStorage.setItem('swiftcart_user_profile', JSON.stringify(refreshData.profile));
                }

                if (typeof window !== 'undefined') {
                  const win = window as any;
                  win.__addDiagnosticLog?.('info', `✅ [SESSION SILENT ATTEMPT SUCCESS] Successfully restored L2 session with newly rotated keys for: ${refreshData.profile?.email || 'N/A'}`);
                }

                // Hydrate view state dynamically and skip auth destruction
                const rawPath = window.location.pathname;
                const pathname = rawPath === '/index.html' || rawPath.endsWith('/index.html') ? '/' : rawPath;
                const actualRole = refreshData.role || 'customer';
                let roleToSet = 'customer';

                if (pathname === '/admin' && actualRole === 'admin') roleToSet = 'admin';
                else if (pathname === '/seller' && actualRole === 'seller') roleToSet = 'seller';
                else if (pathname === '/rider' && actualRole === 'rider') roleToSet = 'rider';
                else if (pathname === '/' || pathname === '') roleToSet = actualRole;

                setSelectedRole(roleToSet as UserRole);
                setUserProfile(refreshData.profile);
                setIsAuthenticated(true);
                setSessionLoading(false);
                return;
              } else {
                if (typeof window !== 'undefined') {
                  const win = window as any;
                  win.__addDiagnosticLog?.('warn', `⚠️ [SESSION SILENT ATTEMPT FAILED] Silent token rotation rejected by master vault: ${refreshData.error || 'N/A'}. Purging keys.`);
                }
              }
            } catch (errRefresh) {
              console.error('[SILENT REFRESH RECOVERY REJECTED]', errRefresh);
            }
          }
        }

        if (typeof window !== 'undefined') {
          const win = window as any;
          win.__addDiagnosticLog?.('warn', `⚠️ [SESSION RESTORE ENGINE] Token verify-token check failed. Status: ${res.status}. Server message: ${data.error || 'Authentication rejected'}. ${isExplicitAuthFailure ? 'Clearing cached token.' : 'Retaining token and attempting L1 Restore.'}`);
        }
        
        if (isExplicitAuthFailure) {
          localStorage.removeItem('swiftcart_jwt_token');
          localStorage.removeItem('swiftcart_refresh_token');
          localStorage.removeItem('swiftcart_user_profile');
        } else {
          // It's a non-auth server error (e.g. 502/503/504 gateway/cold-start error), try cached credentials fallback
          try {
            const cachedProfileStr = localStorage.getItem('swiftcart_user_profile');
            if (cachedProfileStr) {
              const cachedProfile = JSON.parse(cachedProfileStr);
              setUserProfile(cachedProfile);
              setToken(savedToken);
              setIsAuthenticated(true);
              
              const rawPath = window.location.pathname;
              const pathname = rawPath === '/index.html' || rawPath.endsWith('/index.html') ? '/' : rawPath;
              const actualRole = cachedProfile.role || 'customer';
              let roleToSet = 'customer';
              if (pathname === '/admin' && actualRole === 'admin') roleToSet = 'admin';
              else if (pathname === '/seller' && actualRole === 'seller') roleToSet = 'seller';
              else if (pathname === '/rider' && actualRole === 'rider') roleToSet = 'rider';
              else if (pathname === '/' || pathname === '') roleToSet = actualRole;
              setSelectedRole(roleToSet as UserRole);
              
              if (typeof window !== 'undefined') {
                const win = window as any;
                win.__addDiagnosticLog?.('info', `✅ [SESSION RESTORE TRANSIT FALLBACK] Successfully restored session offline after gateway status ${res.status} for user: ${cachedProfile.email}`);
              }
            }
          } catch (errJson) {
            console.error('[SESSION LOCAL DEGRADE ERR]', errJson);
          }
        }
      }
    } catch (e: any) {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('warn', `⚠️ [SESSION RESTORE ENGINE] Network request failed. Trying cached L1 offline user session restoration in client WebView...`, {
          error: e.message || String(e)
        });
        
        try {
          const cachedProfileStr = localStorage.getItem('swiftcart_user_profile');
          if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            setUserProfile(cachedProfile);
            setToken(savedToken);
            setIsAuthenticated(true);
            
            // Re-sync current workspace based on path/saved profile role
            const rawPath = window.location.pathname;
            const pathname = rawPath === '/index.html' || rawPath.endsWith('/index.html') ? '/' : rawPath;
            const actualRole = cachedProfile.role || 'customer';
            let roleToSet = 'customer';
            if (pathname === '/admin' && actualRole === 'admin') roleToSet = 'admin';
            else if (pathname === '/seller' && actualRole === 'seller') roleToSet = 'seller';
            else if (pathname === '/rider' && actualRole === 'rider') roleToSet = 'rider';
            else if (pathname === '/' || pathname === '') roleToSet = actualRole;
            setSelectedRole(roleToSet as UserRole);
            
            win.__addDiagnosticLog?.('info', `✅ [SESSION RESTORE OFFLINE FALLBACK] Successfully restored offline local workspace for user: ${cachedProfile.email || 'N/A'} (L1 Cached Profile)`);
          } else {
            win.__addDiagnosticLog?.('error', `❌ [SESSION RESTORE ENGINE] No cached user profile found in L1 cache store on device.`);
          }
        } catch (errJson: any) {
          win.__addDiagnosticLog?.('error', `❌ [SESSION RESTORE ENGINE] Offline fallback parsing failed: ${errJson.message || String(errJson)}`);
        }
      }
      console.warn('[SESSION ENGINE] Connection to sandbox failed. Default to auth screen.', e);
    } finally {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.__addDiagnosticLog?.('info', `🏁 [SESSION RESTORE ENGINE] Session restoration completed.`);
      }
      setSessionLoading(false);
    }
  };

  const handleLoginSuccess = (phone: string, role: UserRole, profile: any) => {
    if (typeof window !== 'undefined') {
      (window as any).__addDiagnosticLog?.('info', `🔑 [AUTH EVENT] Login succeeded with identity: ${phone || (profile && profile.phone) || 'N/A'}. Target workspace role: ${role || (profile && profile.role) || 'N/A'}`);
    }
    setUserProfile(profile);
    if (profile) {
      localStorage.setItem('swiftcart_user_profile', JSON.stringify(profile));
    }
    setToken(localStorage.getItem('swiftcart_jwt_token'));
    setIsAuthenticated(true);
    
    // Auto route to their corresponding authorized database role
    let actualRole = profile?.role || role;
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone === '7032865951' || cleanPhone === '7032865110' || (profile && (profile.phone === '7032865951' || profile.phone === '7032865110'))) {
      actualRole = 'admin';
    }
    navigateRole(actualRole);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      (window as any).__addDiagnosticLog?.('info', `🔑 [AUTH EVENT] User sign out requested for active profile: ${userProfile?.email || 'Authenticated User'}. Wiping transaction caches and redirecting to Customer view.`);
    }
    const cachedRefreshToken = localStorage.getItem('swiftcart_refresh_token');
    if (cachedRefreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cachedRefreshToken })
      }).catch(err => console.error('[LOGOUT SYNC ERROR]', err));
    }
    localStorage.removeItem('swiftcart_jwt_token');
    localStorage.removeItem('swiftcart_refresh_token');
    localStorage.removeItem('swiftcart_user_profile');
    sessionStorage.removeItem('is_admin_verified');
    setIsAdminPasswordVerified(false);
    setUserProfile(null);
    setToken(null);
    setIsAuthenticated(false);
    setStatusMsg('Session logged out successfully.');
    setSelectedRole('customer');
    
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleAdminLoginRedirect = () => {
    const cachedRefreshToken = localStorage.getItem('swiftcart_refresh_token');
    if (cachedRefreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cachedRefreshToken })
      }).catch(err => console.error('[LOGOUT SYNC ERROR]', err));
    }
    localStorage.removeItem('swiftcart_jwt_token');
    localStorage.removeItem('swiftcart_refresh_token');
    localStorage.removeItem('swiftcart_user_profile');
    sessionStorage.removeItem('is_admin_verified');
    setToken(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setIsAdminPasswordVerified(false);
    setSelectedRole('admin');
    
    window.history.pushState({}, '', '/admin');
    setCurrentPath('/admin');
  };

  const reloadUserProfile = async () => {
    const savedToken = localStorage.getItem('swiftcart_jwt_token');
    if (!savedToken) return;
    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserProfile(data.profile);
        if (data.profile) {
          localStorage.setItem('swiftcart_user_profile', JSON.stringify(data.profile));
        }
      }
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    }
  };

  // Intercept publicly accessible legal pages
  if (['/privacy', '/terms', '/refunds'].includes(currentPath)) {
    const tabName = currentPath === '/privacy' ? 'privacy' : (currentPath === '/terms' ? 'terms' : 'refund');
    return (
      <LegalPages 
        initialTab={tabName} 
        onBack={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }} 
      />
    );
  }

  if (sessionLoading || splashLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Glowing background ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-yellow-500/5 rounded-full blur-[100px]"></div>

        <div className="max-w-md w-full text-center space-y-8 z-10">
          
          {/* Main animated hub */}
          <div className="relative inline-block">
            {/* outer halo pulsing */}
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-md animate-ping scale-75"></div>
            
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-[24px] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mx-auto relative animate-float-slow overflow-hidden">
              <img 
                src={dailyMartLogo} 
                alt="Daily Mart Logo" 
                className="w-full h-full object-cover rounded-[24px]" 
                referrerPolicy="no-referrer"
              />
              {/* Little moving courier pill */}
              <div className="absolute -bottom-2 -right-3 bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider flex items-center gap-0.5 border-2 border-slate-950 z-20">
                <Bike className="w-3 h-3 animate-bounce" /> 10 MINS
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-black text-3xl text-white tracking-tight">
              Daily<span className="text-emerald-400">Mart</span>
            </h1>
            <p className="font-sans text-[11px] text-emerald-400 font-extrabold uppercase tracking-widest">
              Express Cargo Delivery Engine
            </p>
            <p className="font-sans text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs mx-auto">
              Simulating institutional dark-stores and real-time hyper-local dispatch channels in 10 minutes.
            </p>
          </div>

          {/* Real-time status list simulator with subtle fading */}
          <div className="h-6 overflow-hidden max-w-xs mx-auto relative">
            <div className="text-[10px] font-mono text-slate-400 font-medium animate-pulse-subtle">
              {sessionLoading ? "• Instantiating local database session parameters..." : "• Access granted. Seamlessly booting store dashboards..."}
            </div>
          </div>

          {/* Premium micro progress bar */}
          <div className="max-w-xs mx-auto">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-[1600ms] ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                style={{ width: sessionLoading ? '40%' : '100%' }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-2">
              <span>BOOT_OK v1.5</span>
              <span>100% SECURE</span>
            </div>

            {loadingTimeExceeded && (
              <div id="stuck-loader-bypass" className="mt-6 p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl animate-fade-in space-y-3 text-left">
                <p className="text-[10px] font-mono text-amber-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  ⚠️ High Latency / Network Offline Bypass
                </p>
                <p className="text-[10.5px] text-slate-400 font-light leading-relaxed font-sans">
                  Daily Mart is verifying credentials with our sandboxed backend. If your device has slow or offline connection features, tap below to bypass:
                </p>
                <div className="flex gap-2">
                  <button
                    id="btn-bypass-loader"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        (window as any).__addDiagnosticLog?.('info', '⏭️ User bypassed loading screens manually.');
                      }
                      setSessionLoading(false);
                      setSplashLoading(false);
                    }}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 text-center"
                  >
                    Bypass & Load
                  </button>
                  <button
                    id="btn-reset-loader"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Reset Cache
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Humble unobtrusive watermark */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-600 font-mono tracking-widest uppercase">
          SSL CERTIFIED • PLATFORM LABS
        </div>
      </div>
    );
  }

  // Not authenticated? Show the unified sleek AuthPage
  if (!isAuthenticated) {
    return (
      <div className="relative">
        {statusMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-xs font-bold text-emerald-800 shadow-lg">
            {statusMsg}
          </div>
        )}
        <AuthPage 
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Guard manual path inputs
  const isUnauthorized = 
    (currentPath === '/admin' && userProfile?.role !== 'admin') ||
    (currentPath === '/seller' && userProfile?.role !== 'seller') ||
    (currentPath === '/rider' && userProfile?.role !== 'rider');

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-rose-500/10 rounded-full blur-[80px]"></div>
        
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-6 z-10 shadow-2xl relative">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg border border-rose-500/20 animate-pulse">
            🔒
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight">Access Restricted</h2>
            <p className="text-[10px] font-mono text-rose-405 uppercase tracking-widest font-black">
              Role-Based Route Security Guard Active
            </p>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Your authenticated profile role (<span className="text-yellow-400 font-black px-1.5 py-0.5 bg-slate-800 rounded">{userProfile?.role}</span>) does not have keys to clear this terminal's route path (<span className="text-slate-350 font-mono font-bold">{currentPath}</span>).
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850 text-left space-y-2.5 text-[11px] text-slate-400 leading-normal font-sans">
            <p className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>🛡️</span> Security Telemetry:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 font-mono text-[9px]">
              <li>Identity Ref: {userProfile?.email || 'N/A'}</li>
              <li>Required Scope: Key of matching partner entity</li>
              <li>Diagnostic Exception: JWT_ROLE_MISMATCH</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                navigateRole('customer');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl transition font-extrabold text-xs uppercase tracking-wider shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              Return to Customer Dashboard
            </button>

            {currentPath === '/admin' && (
              <button
                onClick={handleAdminLoginRedirect}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-2xl transition font-extrabold text-xs uppercase tracking-wider cursor-pointer"
              >
                Log In as Approved Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col max-w-full overflow-x-hidden">
      
      {/* Interactive Global Role-Switching Workspace Bar */}
      <RoleSelector
        currentRole={selectedRole}
        phone={userProfile?.phone || userProfile?.email || 'Authenticated'}
        profileName={userProfile?.name}
        onLogout={handleLogout}
        onChangeRole={(newRole) => {
          if (newRole === 'admin') {
            if (isAdminPasswordVerified) {
              navigateRole('admin');
            } else {
              setShowAdminVerifyModal(true);
              setAdminVerifyError('');
              setAdminVerifyPasswordInput('');
            }
          } else {
            navigateRole(newRole);
          }
        }}
      />
      
      {/* 24/7 Background Notifications Access Banner Card */}
      {selectedRole === 'rider' && notifPermission !== 'granted' && showNotifBanner && (
        <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border-b border-teal-100 p-4 font-sans text-xs shadow-xs animate-fade-in relative z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 text-base">
                🔔
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-[12.5px]">Enable 24/7 Background Alarm Ringtones & Popups!</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Hear siren alarms of instant orders and delivery dispatches even if you are browsing customer products, minimized, or of another browser tab!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleRequestNotifPermission}
                className="px-4 py-2 bg-indigo-600 font-extrabold text-white text-[11.5px] rounded-xl cursor-pointer hover:bg-indigo-700 active:scale-95 transition-all shadow-xs uppercase tracking-wider block text-center"
              >
                Allow System Speaker
              </button>
              <button
                type="button"
                onClick={handleDismissNotifBanner}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Dismiss and ignore"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic desktop logout floating header for the Customer mobile-first app so they can switch roles on desktop */}
      {selectedRole === 'customer' && (
        <div className="hidden md:block bg-yellow-50 border-b border-yellow-100 py-2 px-6 text-xs text-yellow-800">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-600 animate-spin" />
              Desktop Preview Helper: Access partner options securely via your Profile settings once authorised!
            </span>
            <button 
              onClick={handleLogout}
              className="text-yellow-900 hover:underline font-extrabold"
            >
              Log out customer session
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Router Panel */}
      <div className={`flex-1 ${selectedRole === 'customer' ? 'p-0' : 'max-w-7xl mx-auto p-4 md:p-6 w-full'}`}>
        
        {selectedRole === 'customer' && (
          <CustomerApp 
            userProfile={userProfile}
            onLogout={handleLogout}
            reloadUserProfile={reloadUserProfile}
            onSwitchRole={(newRole, customToken, customProfile) => {
              if (newRole === 'admin') {
                if (isAdminPasswordVerified) {
                  if (customToken && customProfile) {
                    localStorage.setItem('swiftcart_jwt_token', customToken);
                    setToken(customToken);
                    setUserProfile(customProfile);
                    setIsAuthenticated(true);
                  }
                  navigateRole('admin');
                } else {
                  setPendingAdminSwitch(
                    customToken && customProfile
                      ? { customToken, customProfile }
                      : null
                  );
                  setShowAdminVerifyModal(true);
                  setAdminVerifyError('');
                  setAdminVerifyPasswordInput('');
                }
              } else {
                if (customToken && customProfile) {
                  localStorage.setItem('swiftcart_jwt_token', customToken);
                  setToken(customToken);
                  setUserProfile(customProfile);
                  setIsAuthenticated(true);
                  navigateRole(newRole);
                } else {
                  navigateRole(newRole);
                }
              }
            }}
          />
        )}

        {selectedRole === 'admin' && isAdminPasswordVerified && (
          <AdminDashboard 
            userProfile={userProfile}
            onLogout={handleLogout}
          />
        )}

        {selectedRole === 'seller' && (
          <SellerDashboard 
            userProfile={userProfile}
            onLogout={handleLogout}
          />
        )}

        {selectedRole === 'rider' && (
          <RiderDashboard 
            userProfile={userProfile}
            onLogout={handleLogout}
            reloadUserProfile={reloadUserProfile}
          />
        )}

      </div>

      {showAdminVerifyModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white border border-slate-100 max-w-sm w-full rounded-[32px] p-6 shadow-2xl relative space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm border border-emerald-100">
                🔑
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Admin Verification</h3>
              <p className="text-xs text-slate-500 leading-normal font-sans">
                Type the password for your approved administrator profile to unlock the secure workspace console.
              </p>
            </div>

            {adminVerifyError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{adminVerifyError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleVerifyAdminPassword(); }} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Admin Password</label>
                <input
                  type="password"
                  value={adminVerifyPasswordInput}
                  onChange={(e) => setAdminVerifyPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 font-bold transition-all"
                  disabled={adminVerifyLoading}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminVerifyModal(false);
                    setAdminVerifyError('');
                    setAdminVerifyPasswordInput('');
                    setPendingAdminSwitch(null);
                    // Redirect back if cancelling from /admin or if user role is not admin
                    const rawPath = window.location.pathname;
                    const normalizedPath = rawPath === '/index.html' || rawPath.endsWith('/index.html') ? '/' : rawPath;
                    if (normalizedPath === '/admin' || userProfile?.role !== 'admin') {
                      navigateRole('customer');
                    }
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10.5px] rounded-xl uppercase transition cursor-pointer text-center"
                  disabled={adminVerifyLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95 text-center"
                  disabled={adminVerifyLoading}
                >
                  {adminVerifyLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA BACKGROUND EMERGENCY SIREN BLOCK OVERLAY */}
      {isSWMiniAlarmActive && (
        <div className="fixed inset-0 bg-red-650/95 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-pulse">
          <div className="bg-slate-900 border-4 border-red-500 max-w-md w-full rounded-[36px] p-8 shadow-2xl relative text-center space-y-6 text-white">
            <div className="space-y-2">
              <div className="w-20 h-20 bg-red-600 text-white rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-lg border-2 border-red-400">
                🚨
              </div>
              <h2 className="text-2xl font-black tracking-tight font-sans text-red-500 uppercase mt-4">
                PWA Emergency Alarm Active
              </h2>
              <div className="inline-block px-3 py-1 bg-red-950 border border-red-800 text-red-450 font-mono text-[9px] font-extrabold uppercase rounded-full">
                Active Mode: Woken from Background
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              A high-priority event was received for role <strong className="text-yellow-400 font-bold uppercase">{swMiniAlarmRole}</strong>. 
              The application has been inactive, minimized, or closed for over 24 hours, but registered a real-time background dispatch push! Audio alarm sound loops immediately.
            </p>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Matched Order ID:</span>
                <span className="font-mono text-emerald-400 font-bold">#{swMiniAlarmOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Channel Resource:</span>
                <span className="font-mono text-slate-300">Service Worker Msg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Volume Amplitude:</span>
                <span className="text-yellow-400 font-bold">100% MAXIMUM</span>
              </div>
              <div className="text-[10px] text-slate-400 text-center border-t border-slate-900 pt-2 font-medium">
                Siren Dual-Tone Frequencies: 1100Hz & 900Hz oscillations
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  logAlertEvent(swMiniAlarmOrderId, swMiniAlarmRole, 'accepted');
                  setIsSWMiniAlarmActive(false);
                  if (swMiniAlarmRole === 'rider' || swMiniAlarmRole === 'seller' || swMiniAlarmRole === 'admin') {
                    setSelectedRole(swMiniAlarmRole as any);
                  }
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer text-center"
              >
                ⚡ Accept Dispatch & Silence Alarm
              </button>
              
              <button
                type="button"
                onClick={() => {
                  logAlertEvent(swMiniAlarmOrderId, swMiniAlarmRole, 'rejected');
                  setIsSWMiniAlarmActive(false);
                }}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-700 text-slate-400 font-bold rounded-xl text-[10px] uppercase transition cursor-pointer text-center"
              >
                Decline & Mute Loop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APK Update Alert modal popup */}
      {updateInfo && updateInfo.hasUpdate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[999999] animate-fade-in">
          <div className="bg-white border border-slate-100 max-w-sm w-full rounded-[32px] p-6 shadow-2xl relative space-y-5 text-left">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm border border-emerald-100 animate-bounce">
                🚀
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Update Available</h3>
              <p className="text-xs text-slate-500 leading-normal font-sans px-2 text-center">
                A newer version of DailyMart is available. Update now to experience new performance enhancements, secure encryption, and smooth live orders!
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Installed Version</span>
                <span className="font-mono text-slate-600 font-bold bg-slate-200/50 px-2.5 py-0.5 rounded-full text-[11px]">{CURRENT_VERSION}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Latest Version</span>
                <span className="font-mono text-emerald-700 font-black bg-emerald-55 px-2.5 py-0.5 rounded-full text-[11px]">{updateInfo.latestVersion}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setUpdateInfo(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] rounded-xl uppercase transition cursor-pointer text-center"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => handleOpenUpdateUrl(updateInfo.apkUrl)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase shadow-md flex items-center justify-center cursor-pointer transition active:scale-95 text-center"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
