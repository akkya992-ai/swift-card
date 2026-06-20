import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  const isCapacitor = !!((window as any).Capacitor || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.protocol === 'file:' ||
                      window.location.protocol === 'capacitor:');
  
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

  // Sourced from local storage config or defaulting to the current Cloud Run sandbox URI
  let remoteApiBase = localStorage.getItem('swiftcart_api_base_override') || '';
  
  if (!remoteApiBase && isCapacitor) {
    // Dynamic fallback to standard development service container url
    remoteApiBase = 'https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app';
    addDiagEntry('info', '🔌 STAGE 3: Using standard development container callback host fallback.', { remoteApiBase });
  } else {
    addDiagEntry('info', '🔌 STAGE 3: Checked API base configuration.', { remoteApiBase: remoteApiBase || 'Direct backend (standard dev/prod ports)' });
  }

  if (remoteApiBase) {
    addDiagEntry('info', '🛰️ STAGE 4: Attaching interceptor middleware to window.fetch to reroute relative paths.');
    const originalFetch = window.fetch;
    
    const customFetch = function (input: any, init?: any): Promise<Response> {
      let urlStr = '';
      if (typeof input === 'string') {
        urlStr = input;
      } else if (input && typeof input === 'object' && 'url' in input) {
        urlStr = (input as any).url;
      }

      // Check if it's a relative/absolute API endpoint to sandbox
      const isRelativeApi = urlStr.startsWith('/api') || 
                            urlStr.startsWith('api/') ||
                            urlStr.startsWith(window.location.origin + '/api');

      let resolvedUrl = urlStr;
      let requestPromise: Promise<Response>;

      if (isRelativeApi) {
        const apiPath = urlStr.startsWith('/api') 
          ? urlStr 
          : urlStr.startsWith('api/') 
            ? '/' + urlStr 
            : urlStr.substring(window.location.origin.length);

        const sanitizedBase = remoteApiBase.replace(/\/+$/, '');
        resolvedUrl = `${sanitizedBase}${apiPath}`;
        
        addDiagEntry('info', `⚡ [INTERCEPT RE-ROUTE] ${urlStr} -> ${resolvedUrl}`);
        
        if (typeof input === 'string') {
          requestPromise = originalFetch(resolvedUrl, init);
        } else {
          try {
            const newReq = new Request(resolvedUrl, input as any);
            requestPromise = originalFetch(newReq, init);
          } catch (e: any) {
            addDiagEntry('warn', '⚠️ Request object cloning failed, using direct string URL fallback', { error: e.message || String(e) });
            requestPromise = originalFetch(resolvedUrl, init);
          }
        }
      } else {
        requestPromise = originalFetch(input, init);
      }

      const cleanPath = resolvedUrl.split('?')[0];

      return requestPromise.then((response) => {
        // Clone response to safely read text and log details
        const responseCopy = response.clone();
        responseCopy.text().then((bodyText) => {
          if (response.ok) {
            addDiagEntry('info', `📡 [API SUCCESS] HTTP ${response.status}: ${cleanPath}`, {
              status: response.status,
              statusText: response.statusText,
              bodyLength: bodyText.length,
              preview: bodyText.substring(0, 150)
            });
          } else {
            addDiagEntry('error', `📡 [API ERROR STATUS] HTTP ${response.status}: ${cleanPath}`, {
              status: response.status,
              statusText: response.statusText,
              preview: bodyText.substring(0, 400)
            });
          }
        }).catch(() => {
          addDiagEntry('info', `📡 [API RESPONSE ONLY] HTTP ${response.status}: ${cleanPath} (Unreadable payload binary)`);
        });
        return response;
      }).catch((err: any) => {
        addDiagEntry('error', `💥 [API SEVERE FAILURE] Fetch to "${cleanPath}" failed entirely (Network unreachable / CORS blocked / connection refused)`, {
          message: err?.message || String(err),
          name: err?.name,
          stack: err?.stack
        });
        throw err;
      });
    };

    let canOverrideFetch = false;
    try {
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
      if (desc) {
        if (desc.configurable || desc.writable) {
          canOverrideFetch = true;
        }
      } else {
        canOverrideFetch = true;
      }
    } catch (e) {
      canOverrideFetch = false;
    }

    if (canOverrideFetch) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
        addDiagEntry('info', '🛡️ STAGE 5: Global fetch redirect interceptor registered successfully using Object.defineProperty.');
      } catch (e: any) {
        addDiagEntry('warn', '⚠️ Object.defineProperty for window.fetch failed, attempting direct assignment fallback', { error: e.message || String(e) });
        try {
          (window as any).fetch = customFetch;
          addDiagEntry('info', '🛡️ STAGE 5: Global fetch redirect interceptor registered successfully using direct assignment.');
        } catch (err2: any) {
          addDiagEntry('error', '💥 All techniques to hook window.fetch failed on this device environment.', { error: err2.message || String(err2) });
        }
      }
    } else {
      addDiagEntry('warn', '⚠️ window.fetch is detected as non-configurable and non-writable (getter-only). Skipping global redirect registration to prevent crashes.');
    }
  }
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

