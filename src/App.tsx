import React, { useState, useEffect } from 'react';
import { LogOut, ShieldAlert, Sparkles, User, RefreshCw, Layout, Bike, Store, ShoppingBag } from 'lucide-react';
import { UserRole } from './types';
import AuthPage from './components/AuthPage';
import CustomerApp from './components/CustomerApp';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import RiderDashboard from './components/RiderDashboard';

export default function App() {
  // Authentication & session state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Loading & status flags
  const [sessionLoading, setSessionLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [splashLoading, setSplashLoading] = useState(true);

  useEffect(() => {
    tryRecoverySession();
    // Guarantee minimum splash screen showtime for clean branding transition
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const tryRecoverySession = async () => {
    const savedToken = localStorage.getItem('swiftcart_jwt_token');
    
    if (!savedToken) {
      setSessionLoading(false);
      return;
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
        setToken(savedToken);
        setSelectedRole(data.role);
        setUserProfile(data.profile);
        setIsAuthenticated(true);
        console.log('[SESSION ENGINE] Recovered JWT for active user: ', data.profile.email);
      } else {
        localStorage.removeItem('swiftcart_jwt_token');
      }
    } catch (e) {
      console.warn('[SESSION ENGINE] Connection to sandbox failed. Default to auth screen.', e);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleLoginSuccess = (phone: string, role: UserRole, profile: any) => {
    setUserProfile(profile);
    setSelectedRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('swiftcart_jwt_token');
    setUserProfile(null);
    setToken(null);
    setIsAuthenticated(false);
    setStatusMsg('Session logged out successfully.');
    setTimeout(() => setStatusMsg(''), 4000);
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
      }
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    }
  };

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
            
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-[24px] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mx-auto relative animate-float-slow">
              <ShoppingBag className="w-10 h-10 stroke-[2.2]" />
              {/* Little moving courier pill */}
              <div className="absolute -bottom-2 -right-3 bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider flex items-center gap-0.5 border-2 border-slate-950">
                <Bike className="w-3 h-3 animate-bounce" /> 10 MINS
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-black text-3xl text-white tracking-tight">
              Blink<span className="text-emerald-400">Store</span>
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

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      
      {/* Dynamic Navigation Top Admin bar (Hidden inside primary mobile checkout layouts to preserve native Look and feel) */}
      <nav className={`bg-slate-900 text-white py-3 px-6 shadow-md flex justify-between items-center ${selectedRole === 'customer' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 text-slate-900 p-1.5 rounded-lg font-black text-xs">SC</div>
          <span className="font-black text-sm tracking-tight">swift<span className="text-emerald-400">cart</span></span>
          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full capitalize">
            {selectedRole} Mode Workspace
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          
          <div className="items-center gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-slate-300 font-semibold truncate max-w-[170px]">
              Profile: {userProfile?.name || userProfile?.email || 'Authenticated User'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-slate-750"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Role / Logout</span>
          </button>

        </div>
      </nav>

      {/* Dynamic desktop logout floating header for the Customer mobile-first app so they can switch roles on desktop */}
      {selectedRole === 'customer' && (
        <div className="hidden md:block bg-yellow-50 border-b border-yellow-100 py-2 px-6 text-xs text-yellow-800">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-600 animate-spin" />
              Desktop Preview Helper: Switch to other workspaces via the dark navigation strip at the top anytime!
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
              if (customToken && customProfile) {
                localStorage.setItem('swiftcart_jwt_token', customToken);
                setToken(customToken);
                setSelectedRole(newRole);
                setUserProfile(customProfile);
                setIsAuthenticated(true);
              } else {
                setSelectedRole(newRole);
              }
            }}
          />
        )}

        {selectedRole === 'admin' && (
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
          />
        )}

      </div>

    </div>
  );
}
