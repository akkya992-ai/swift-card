import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getIsCapacitor, getApiBase, applyGlobalNetworkingInterceptors } from './apiConfig';

console.log("MAIN_TSX_LOADED");

// System diagnostic utility for Capacitor/PWA debugging
const addDiagEntry = (type: 'info' | 'warn' | 'error', message: string, meta?: any) => {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (typeof win.__addDiagnosticLog === 'function') {
      win.__addDiagnosticLog(type, message, meta);
    } else {
      // Fallback to plain console logs formatted properly
      if (type === 'error') console.error(message, meta || '');
      else if (type === 'warn') console.warn(message, meta || '');
      else console.log(message, meta || '');
    }
  }
};

addDiagEntry('info', '🏁 STAGE 1: src/main.tsx loaded by browser engine.');

// Global Fetch Interceptor to support native Capacitor builds on physical Android devices
if (typeof window !== 'undefined') {
  addDiagEntry('info', '⚙️ STAGE 2: Evaluating execution environment features.');
  const isCapacitor = getIsCapacitor();
  
  // High-fidelity User Agent & System inspection for APK behavior analysis
  const userAgentStr = navigator.userAgent || '';
  const isAndroid = /Android/i.test(userAgentStr);
  const isWebView = /wv|Version\/[0-9.]+/i.test(userAgentStr) && isAndroid;
  let webviewEngine = 'Standard Browser';
  
  if (isWebView) {
    const match = userAgentStr.match(/Chrome\/([0-9.]+)/);
    webviewEngine = match ? `Android WebView (Chrome Engine v${match[1]})` : 'Android Custom Tabs/WebView';
  } else if (isAndroid) {
    webviewEngine = 'Android Mobile Native Browser';
  }

  const capacitorPlugins = (window as any).Capacitor?.Plugins ? Object.keys((window as any).Capacitor.Plugins) : [];

  addDiagEntry('info', '📊 Web platform assessment completed successfully', { 
    isCapacitor, 
    hostname: window.location.hostname, 
    protocol: window.location.protocol,
    isAndroid,
    isWebView,
    webviewEngine,
    userAgent: userAgentStr,
    capacitorPluginsAvailableDaily: capacitorPlugins
  });

  applyGlobalNetworkingInterceptors();
}

// Register the PWA background alarm service worker and request notification permissions
if (typeof window !== 'undefined') {
  addDiagEntry('info', '⚡ STAGE 6: Checking service worker registration qualifications.');
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Safely register PWA SW only on HTTP/HTTPS to prevent crashing on file or native Capacitor schemas
      const isWebProtocol = window.location.protocol === 'http:' || window.location.protocol === 'https:';
      if (isWebProtocol) {
        addDiagEntry('info', '📬 Registering serviceWorker sw.js');
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            addDiagEntry('info', '🎉 ServiceWorker active', { scope: reg.scope });
            
            // Request browser notification permissions instantly on login / load
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
              Notification.requestPermission().then(permission => {
                addDiagEntry('info', `🔔 Notification state updated: ${permission}`);
              });
            }
          })
          .catch((err) => {
            addDiagEntry('error', '❌ ServiceWorker subscription failed', { error: err.message || String(err) });
          });
      } else {
        addDiagEntry('info', `ℹ️ ServiceWorker standard registry bypassed. Packaging Protocol: ${window.location.protocol}`);
      }
    });
  } else {
    addDiagEntry('warn', '⚠️ navigator.serviceWorker is not supported in this client environment.');
  }
}

// Mount validation
if (typeof window !== 'undefined') {
  addDiagEntry('info', '🖥️ STAGE 7: Locating target DOM node matching id "root"');
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    addDiagEntry('error', '💥 FATAL: HTML Document has no target container with id="root". Hydration cannot happen!');
  } else {
    addDiagEntry('info', '✅ Target division found. Triggering React element tree hydration.');
  }
}

const rootContainer = document.getElementById('root');
if (rootContainer) {
  console.log("REACT_RENDER_START");
  createRoot(rootContainer).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log("REACT_RENDER_COMPLETE");

  // Set success mount signals to prevent watchdog indicators
  if (typeof window !== 'undefined') {
    (window as any).__REACT_INIT_SUCCESS__ = true;
    addDiagEntry('info', '🚀 STAGE 8: React applet rendered successfully on screen viewports container.');

    // Watchdog checking for near-zero viewport height after 5 seconds
    setTimeout(() => {
      const rootEl = document.getElementById('root');
      if (rootEl) {
        const height = rootEl.offsetHeight || rootEl.clientHeight || 0;
        addDiagEntry('info', `📏 Mounting viewport validation. Height detected: ${height}px`);
        if (height <= 10) {
          addDiagEntry('error', 'CRITICAL: React mounted but no visible UI rendered. Viewport height is near zero!', {
            offsetHeight: rootEl.offsetHeight,
            clientHeight: rootEl.clientHeight,
            childrenCount: rootEl.children.length,
            innerHTML: rootEl.innerHTML ? rootEl.innerHTML.substring(0, 300) + '...' : 'empty'
          });
        } else {
          addDiagEntry('info', `✅ Mount is visible on screen. Height verified: ${height}px`);
        }
      }
    }, 5000);
  }
}

