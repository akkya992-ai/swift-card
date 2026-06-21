import React, { useState, useEffect } from 'react';
import { 
  getApiBase, 
  getIsCapacitor, 
  subscribeToNetworkLogs, 
  NetworkLog 
} from '../apiConfig';

export default function NetworkDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [apiBase, setApiBase] = useState(() => getApiBase());
  const [isCapacitor, setIsCapacitor] = useState(() => getIsCapacitor());
  const [customOverride, setCustomOverride] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('swiftcart_api_base_override') || '') : '';
  });
  const [ipInput, setIpInput] = useState(customOverride);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Subscribe to global network interceptor logs
    const unsubscribe = subscribeToNetworkLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    // Check configuration periodically
    const timer = setInterval(() => {
      setApiBase(getApiBase());
      setIsCapacitor(getIsCapacitor());
    }, 1500);

    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__triggerApiConfigRefresh = (newBase: string) => {
        setApiBase(newBase);
      };
    }

    return () => {
      unsubscribe();
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        const win = window as any;
        delete win.__triggerApiConfigRefresh;
      }
    };
  }, []);

  const handleSaveOverride = () => {
    if (typeof window !== 'undefined') {
      const trimmed = ipInput.trim();
      if (trimmed) {
        localStorage.setItem('swiftcart_api_base_override', trimmed);
      } else {
        localStorage.removeItem('swiftcart_api_base_override');
      }
      setCustomOverride(trimmed);
      setApiBase(getApiBase());
      
      // Flash a beautiful notification
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      
      // Trigger temporary console notification and reload hint
      console.log(`[DEBUG] API base override set to: "${trimmed}"`);
    }
  };

  const handleClearOverride = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('swiftcart_api_base_override');
      setIpInput('');
      setCustomOverride('');
      setApiBase(getApiBase());
      
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      
      console.log('[DEBUG] API base override cleared. Falling back.');
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status >= 200 && status < 300) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status >= 300 && status < 400) return 'bg-sky-50 text-sky-700 border-sky-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  };

  // Determine if there's any active request logs to trace
  const activeFetchUrl = logs[0]?.resolvedUrl || 'None yet';

  return (
    <div id="unified-debug-system" className="fixed bottom-4 right-4 z-[999999] font-sans">
      {/* Floating Pill Toggle Button to avoid distracting unless opened */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-100 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          🛡️ Networking Console
        </button>
      )}

      {/* Main Debug Panel Card */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-32px)] bg-slate-950/98 border border-slate-800 rounded-3xl shadow-2xl p-5 text-left text-slate-100 animate-slide-up flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wide text-white">NETWORK DIAGNOSTICS</span>
              <span className="font-mono text-[9px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase">
                Hybrid Applet
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 px-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition duration-200 cursor-pointer text-xs font-mono font-bold"
            >
              [Hide]
            </button>
          </div>

          <div className="overflow-y-auto space-y-4 flex-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Environment Overview Bento Section */}
            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-850 space-y-3 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase text-[9px]">Platform Detected</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                  isCapacitor 
                    ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/50' 
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50'
                }`}>
                  {isCapacitor ? 'Native Mobile (Capacitor)' : 'Web Browser Standard'}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="text-slate-400 font-semibold uppercase text-[9px]">Resolved Base URL</div>
                <div className="text-sky-400 break-all select-all font-bold font-mono">
                  {apiBase}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-850 space-y-1">
                <div className="text-slate-400 font-semibold uppercase text-[9px]">Active Traced Target</div>
                <div className="text-amber-400 break-all truncate font-bold" title={activeFetchUrl}>
                  {activeFetchUrl}
                </div>
              </div>
            </div>

            {/* Dynamic IP / Base URL override formulation */}
            <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-850/60 space-y-2 text-xs">
              <span className="text-slate-300 font-bold text-[11px] block">Override Backend API Host (Capacitor/PWA)</span>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                If testing on a physical android device using APK, enter your computer local subnet IP (e.g. <span className="font-mono text-slate-400">http://192.168.1.50:3000</span>) so requests reach your local server.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. http://192.168.x.x:3000"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition duration-200 active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  Apply
                </button>
              </div>

              {/* Quick Preset Toggles for Cloud Environments */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('swiftcart_api_base_override', 'https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setIpInput('https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setCustomOverride('https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setApiBase(getApiBase());
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 2000);
                  }}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[9px] text-indigo-400 font-bold rounded-lg font-mono transition active:scale-95 cursor-pointer"
                >
                  SANDBOX (DEV)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('swiftcart_api_base_override', 'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setIpInput('https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setCustomOverride('https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
                    setApiBase(getApiBase());
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 2000);
                  }}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[9px] text-emerald-400 font-bold rounded-lg font-mono transition active:scale-95 cursor-pointer"
                >
                  RELEASE (PRE)
                </button>
              </div>

              {customOverride && (
                <div className="flex items-center justify-between text-[10px] bg-slate-900 px-2.5 py-1 rounded-xl">
                  <span className="text-amber-400 font-semibold">Active localStorage Override:</span>
                  <button
                    type="button"
                    onClick={handleClearOverride}
                    className="text-rose-400 hover:text-rose-300 font-extrabold uppercase text-[9px] cursor-pointer"
                  >
                    Clear [x]
                  </button>
                </div>
              )}
            </div>

            {/* Real-time Network Log Stream */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Live Stream Interceptor Logs</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">{logs.length} logged</span>
              </div>
              
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                {logs.length === 0 ? (
                  <div className="text-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-850/60 text-[10px] text-slate-500 font-mono">
                    No intercepted network calls yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-2 bg-slate-900 border border-slate-850/50 rounded-xl flex items-center justify-between gap-1 text-[10px] font-mono hover:bg-slate-850/60 transition"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[9px] uppercase text-indigo-400 bg-indigo-950/50 px-1.5 py-0.2 rounded border border-indigo-900/30">
                            {log.type}
                          </span>
                          <span className="font-black text-slate-300 text-[9px]">
                            {log.method}
                          </span>
                          <span className="text-slate-500 text-[8px]">{log.timestamp}</span>
                        </div>
                        <div className="text-slate-400 truncate break-all select-all font-medium py-0.5" title={log.originalUrl}>
                          {log.originalUrl}
                        </div>
                        <div className="text-[9px] text-sky-400/90 truncate font-semibold" title={log.resolvedUrl}>
                          ↳ {log.resolvedUrl}
                        </div>
                      </div>
                      
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${getStatusColor(log.status)}`}>
                        {log.status || 'PEND'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Toast Alert Popup */}
          {showNotification && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl text-center space-y-1 z-50 animate-fade-in max-w-[280px]">
              <span className="text-lg">⚙️</span>
              <p className="text-xs font-bold text-white leading-tight">API base updated successfully!</p>
              <p className="text-[10px] text-slate-400 font-sans leading-normal">
                Changes applied instantly. Native wrappers and direct fetch will now route through the new URL.
              </p>
            </div>
          )}

          {/* Footer branding info avoiding margins */}
          <div className="mt-3 pt-2.5 border-t border-slate-850 text-center">
            <span className="font-mono text-[8px] text-slate-600 uppercase font-semibold">
              DailyMart Hardened Unified Networking Engine v1.2
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
