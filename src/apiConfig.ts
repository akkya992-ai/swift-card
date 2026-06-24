// System diagnostic utility for Capacitor/PWA debugging
export const addDiagEntry = (type: 'info' | 'warn' | 'error', message: string, meta?: any) => {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (typeof win.__addDiagnosticLog === 'function') {
      win.__addDiagnosticLog(type, message, meta);
    } else {
      if (type === 'error') console.error(message, meta || '');
      else if (type === 'warn') console.warn(message, meta || '');
      else console.log(message, meta || '');
    }
  }
};

/**
 * 2. Improved Capacitor detection to avoid false positives in web builds:
 * - Do NOT rely on window.Capacitor existence alone
 * - Use safe detection: window.Capacitor?.isNativePlatform?.()
 * - Validate native schemas/user agent
 * - Ensure web browser NEVER returns true
 */
export const getIsCapacitor = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const win = window as any;
  
  // 1. Direct evaluation of Cap native platform flag
  const hasCapObject = !!win.Capacitor;
  const isNativePlatform = hasCapObject && typeof win.Capacitor.isNativePlatform === 'function' && win.Capacitor.isNativePlatform();
  
  // 2. Protocol validations (native apps usually run under capacitor://, ionic://, or file://)
  const isNativeProtocol = 
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'file:' || 
    window.location.protocol === 'ionic:';
  
  // 3. User Agent markers
  const userAgent = navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
  const isCapacitorUA = userAgent.includes('capacitor');

  // 4. Capacitor WebView standard address mapping:
  // Android/iOS Capacitor local servers are hosted on localhost but with empty port (e.g. http://localhost)
  // Standard computer Web browser localhost has a port (e.g. :5173 or :3000)
  const isCapacitorAndroidOrigin = window.location.hostname === 'localhost' && window.location.port === '';
  
  // Combine rules securely: if verified native platform flag is true,
  // or running on a native scheme or Capacitor UA, or mobile WebView native mapping matches
  return !!(isNativePlatform || isNativeProtocol || isCapacitorUA || isCapacitorAndroidOrigin);
};

// Self-healing legacy local storage cleanup block has been bypassed to allow development testing in local APK WebView.

export const CANDIDATE_BACKENDS = [
  'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app',
  'https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app'
];

export const startBackendAutoDiscovery = () => {
  if (typeof window === 'undefined') return;

  const win = window as any;
  if (win.__BACKEND_AUTO_DISCOVERY_STARTED__) return;
  win.__BACKEND_AUTO_DISCOVERY_STARTED__ = true;

  // Skip dynamic probing if the user set a manual absolute IP/host override to preserve intentional developer configurations
  const overrideUrl = localStorage.getItem('swiftcart_api_base_override');
  if (overrideUrl && overrideUrl.trim() !== '') {
    addDiagEntry('info', 'ℹ️ [AUTO DISCOVERY] Manual override is active. Skipping background backend health probing.');
    return;
  }

  addDiagEntry('info', '🛰️ [AUTO DISCOVERY] Launching background health-checks on candidate backend servers...', { CANDIDATE_BACKENDS });

  // Probe candidates concurrently
  CANDIDATE_BACKENDS.forEach((base) => {
    const healthUrl = `${base}/api/health`;
    const callerFetch = win.__originalFetchBackup || window.fetch;

    callerFetch(healthUrl, { method: 'GET', mode: 'cors', cache: 'no-cache' })
      .then(async (res: Response) => {
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            addDiagEntry('warn', `⚠️ [AUTO DISCOVERY REJECT] Backend at ${base} returned HTML instead of JSON. Likely blocked by cookie check.`);
            return;
          }
          try {
            const data = await res.json();
            if (data && data.status === 'ok') {
              addDiagEntry('info', `📡 [AUTO DISCOVERY OK] Backend responded at ${base} with valid status. Setting as active discovered endpoint.`);
              localStorage.setItem('swiftcart_auto_discovered_backend', base);
              
              // Re-update the config in real-time
              if (typeof win.__triggerApiConfigRefresh === 'function') {
                win.__triggerApiConfigRefresh(base);
              }
            } else {
              addDiagEntry('warn', `⚠️ [AUTO DISCOVERY REJECT] Backend at ${base} returned JSON but missing status 'ok'.`);
            }
          } catch (err: any) {
            addDiagEntry('warn', `⚠️ [AUTO DISCOVERY REJECT] Backend at ${base} failed to parse JSON: ${err.message}`);
          }
        }
      })
      .catch(() => {
        // Silent catch for candidate being offline
      });
  });
};

/**
 * 1. Implement a SINGLE reliable API base strategy:
 * Priority order:
 * - import.meta.env.VITE_API_BASE_URL (highest priority)
 * - localStorage override key: swiftcart_api_base_override
 * - Dynamic auto-discovered working backend URL
 * - fallback to Cloud Run backend URL: https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app
 *
 * 3. Remove any logic that forces window.location.origin as API base unless backend is confirmed same-origin.
 */
export const getApiBase = (): string => {
  // 1. Highest priority: VITE_API_BASE_URL
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl.trim() !== '/') {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    if (cleanUrl && cleanUrl.startsWith('http')) {
      logConfigState(cleanUrl, 'Environment Variable (VITE_API_BASE_URL)');
      return cleanUrl;
    }
  }

  // 2. Second priority: localStorage override key
  if (typeof window !== 'undefined') {
    const overrideUrl = localStorage.getItem('swiftcart_api_base_override');
    if (overrideUrl && overrideUrl.trim() !== '' && overrideUrl.trim() !== '/') {
      const cleanUrl = overrideUrl.replace(/\/+$/, '');
      if (cleanUrl && cleanUrl.startsWith('http')) {
        logConfigState(cleanUrl, 'LocalStorage Override (swiftcart_api_base_override)');
        return cleanUrl;
      }
    }
  }

  // If we are on web browser (non-Capacitor), and there is no explicit manual developer override,
  // we MUST return an empty string "" to keep all API routes relative.
  // This completely bypasses Cloud Run's iframe absolute-routing cookie checkpoint redirect (e.g. /__cookie_check.html).
  if (typeof window !== 'undefined' && !getIsCapacitor()) {
    logConfigState('', 'Web relative path default');
    return '';
  }

  // 3. Third priority: Auto-discovered working backend url
  if (typeof window !== 'undefined') {
    const discoveredUrl = localStorage.getItem('swiftcart_auto_discovered_backend');
    if (discoveredUrl && discoveredUrl.trim() !== '' && discoveredUrl.trim() !== '/') {
      const cleanUrl = discoveredUrl.replace(/\/+$/, '');
      if (cleanUrl && cleanUrl.startsWith('http')) {
        logConfigState(cleanUrl, 'Auto-Discovered Backend (swiftcart_auto_discovered_backend)');
        return cleanUrl;
      }
    }
  }

  // 4. Optional fallback: Same-origin window.location.origin ONLY if explicitly confirmed as a direct development same-origin host
  if (typeof window !== 'undefined' && !getIsCapacitor()) {
    const hostname = window.location.hostname;
    // Standard local development PC hostnames (must have port specified)
    const isSameOriginHost = 
      hostname.includes('ais-dev-') || 
      hostname.includes('ais-pre-') || 
      (hostname === 'localhost' && window.location.port !== '') || 
      (hostname === '127.0.0.1' && window.location.port !== '') || 
      (hostname === '0.0.0.0' && window.location.port !== '');
      
    if (isSameOriginHost) {
      const cleanUrl = window.location.origin.replace(/\/+$/, '');
      logConfigState(cleanUrl, 'Confirmed same-origin development host');
      return cleanUrl;
    }
  }

  // 5. Fallback to Cloud Run backend URL
  // For native platforms we default to our persistent workspace app domain to ensure local changes sync instantly.
  const fallbackUrl = getIsCapacitor()
    ? 'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app'
    : (typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app');
  logConfigState(fallbackUrl, 'Default Fallback (Cloud Run backend)');
  return fallbackUrl;
};

// Internal caching of last logged configuration to prevent console flood
let lastLoggedBase = '';
let lastLoggedPlatform = '';

export const logConfigState = (apiBase: string, source: string) => {
  if (typeof window === 'undefined') return;
  const isCapacitor = getIsCapacitor();
  const capPresent = !!(window as any).Capacitor;
  const platformStr = isCapacitor ? 'native' : 'web';
  
  const cacheKey = `${apiBase}_${platformStr}_${capPresent}`;
  const loggedKey = `${lastLoggedBase}_${lastLoggedPlatform}`;
  
  if (cacheKey !== loggedKey) {
    lastLoggedBase = apiBase;
    lastLoggedPlatform = platformStr;
    
    addDiagEntry('info', `🔌 [API BASE CONFIG] Resolved API base URL to: ${apiBase}`, {
      apiBase,
      source,
      detectedPlatform: platformStr,
      isCapacitor,
      CapacitorObjectPresent: capPresent,
      href: window.location.href,
      protocol: window.location.protocol,
    });
    
    console.log(`[API CONFIG] Base URL: ${apiBase} | Source: ${source} | Platform: ${platformStr} | Capacitor Object: ${capPresent}`);
  }
};

/**
 * 2. Safe URL join utility to prevent double slashes
 */
export const safeUrlJoin = (base: string, path: string): string => {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
};

/**
 * Helper to determine if a URL is a relative or absolute API path to sandbox/route
 */
export const resolveApiUrl = (url: string): string => {
  if (typeof url !== 'string') return url;
  
  // If the URL is already pointing to our valid cloud backend hosts, do not intercept or change it!
  const isAlreadyBackend = CANDIDATE_BACKENDS.some(backend => url.startsWith(backend));
  if (isAlreadyBackend) {
    return url;
  }

  // Robustly identify relative API routes, local web server paths, or native loopbacks on mobile WebView:
  const isPlainRelative = url.startsWith('/api') || url.startsWith('api/');
  const isLocalhostApi = url.includes('localhost/api') || (url.includes('localhost:') && url.includes('/api'));
  const isIPLocalApi = url.includes('127.0.0.1/api') || url.includes('0.0.0.0/api') || url.includes('10.0.2.2/api');
  const isCurrentOriginApi = typeof window !== 'undefined' && url.startsWith(window.location.origin + '/api');

  if (isPlainRelative || isLocalhostApi || isIPLocalApi || isCurrentOriginApi) {
    let apiPath = '';
    const apiIndex = url.indexOf('/api');
    
    if (apiIndex !== -1) {
      apiPath = url.substring(apiIndex);
    } else if (url.startsWith('api/')) {
      apiPath = '/' + url;
    }

    if (apiPath) {
      const isNative = getIsCapacitor();
      const apiBase = getApiBase();
      
      if (!isNative) {
        // For web browsers, keep the URL completely relative if there is no explicit absolute override
        if (!apiBase || apiBase === '/' || !apiBase.startsWith('http')) {
          return apiPath;
        }
        return safeUrlJoin(apiBase, apiPath);
      }
      
      // Native Capacitor mobile application logic
      let nativeBase = apiBase;
      if (!nativeBase || nativeBase === '/' || !nativeBase.startsWith('http')) {
        nativeBase = 'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app';
      } else if (nativeBase.includes('localhost')) {
        // A native platform should never request localhost of the host machine unless customized
        nativeBase = 'https://ais-pre-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app';
      }
      
      const resolved = safeUrlJoin(nativeBase, apiPath);
      return resolved;
    }
  }
  
  return url;
};

/**
 * Safe JSON parser to handle cases where backend might return HTML error pages or redirects.
 * Solves "Unexpected token '<'..." error by throwing a clear network message
 */
export const getJsonSafe = async (res: Response): Promise<any> => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  
  if (contentType.includes('text/html') || text.trim().startsWith('<')) {
    console.warn(`[HTML DETECTED] Expected JSON, got HTML from ${res.url}. Status: ${res.status}. Header Content-Type: ${contentType}. Body snippet: ${text.slice(0, 300)}`);
    throw new Error(`[Server HTTP ${res.status}] Expected JSON response but received HTML. The backend server might be starting up or under maintenance. URL: ${res.url.split('?')[0]}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (err: any) {
    console.error(`[JSON PARSE ERROR] Failed to parse response from ${res.url}. Status: ${res.status}. Body snippet: ${text.slice(0, 350)}`);
    throw new Error(`[Server HTTP ${res.status}] Failed to parse response as JSON. Expected structured data but received: "${text.slice(0, 80)}..."`);
  }
};

/**
 * Network Logging Interface for the debugging dashboard panel
 */
export interface NetworkLog {
  id: string;
  timestamp: string;
  method: string;
  originalUrl: string;
  resolvedUrl: string;
  status?: number;
  type: 'fetch' | 'xhr';
}

const MAX_LOGS = 30;
export const networkLogs: NetworkLog[] = [];
const subscribers = new Set<(logs: NetworkLog[]) => void>();

export const addNetworkLog = (log: Omit<NetworkLog, 'id' | 'timestamp'>) => {
  const newLog: NetworkLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
  };
  networkLogs.unshift(newLog);
  if (networkLogs.length > MAX_LOGS) {
    networkLogs.pop();
  }
  subscribers.forEach((cb) => cb([...networkLogs]));
};

export const subscribeToNetworkLogs = (cb: (logs: NetworkLog[]) => void) => {
  subscribers.add(cb);
  cb([...networkLogs]);
  return () => {
    subscribers.delete(cb);
  };
};

/**
 * 7. Ensure all /api calls (fetch + axios + interceptors) route through a single unified request layer
 * 8. Guarantee no environment can bypass API base resolver
 */
export const applyGlobalNetworkingInterceptors = () => {
  if (typeof window === 'undefined') return;
  const win = window as any;
  if (win.__NETWORKING_INTERCEPTORS_APPLIED__) {
    return;
  }
  win.__NETWORKING_INTERCEPTORS_APPLIED__ = true;

  // 1. Intercept window.fetch
  const originalFetch = window.fetch;
  win.__originalFetchBackup = originalFetch; // Store a safe, direct backup for discovery operations

  const customFetch = function (input: any, init?: any): Promise<Response> {
    let originalUrl = '';
    if (typeof input === 'string') {
      originalUrl = input;
    } else if (input && typeof input === 'object' && 'url' in input) {
      originalUrl = (input as any).url;
    }

    const resolvedUrl = resolveApiUrl(originalUrl);
    const method = init?.method || (input && typeof input === 'object' && (input as any).method) || 'GET';

    // Extract request headers and payload for security auditing & tracking
    let requestPayload: any = null;
    try {
      if (init && init.body) {
        requestPayload = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } else if (input && typeof input === 'object' && (input as any).body) {
        const bodyVal = (input as any).body;
        requestPayload = typeof bodyVal === 'string' ? JSON.parse(bodyVal) : bodyVal;
      }
    } catch {}

    const reqHeadersObj: Record<string, string> = {};
    if (init && init.headers) {
      if (typeof init.headers.forEach === 'function') {
        init.headers.forEach((value: string, key: string) => { reqHeadersObj[key] = value; });
      } else {
        Object.assign(reqHeadersObj, init.headers);
      }
    }

    console.log(`[NETWORK_DIAGNOSTICS OUTGOING]`);
    console.log(`• URL: ${resolvedUrl}`);
    console.log(`• Method: ${method}`);
    console.log(`• Headers:`, JSON.stringify(reqHeadersObj, null, 2));
    console.log(`• Payload:`, JSON.stringify(requestPayload, null, 2));

    const cleanPath = resolvedUrl.split('?')[0];
    const logEntry: Omit<NetworkLog, 'id' | 'timestamp'> = {
      method,
      originalUrl,
      resolvedUrl,
      type: 'fetch'
    };

    let requestPromise: Promise<Response>;
    if (resolvedUrl !== originalUrl) {
      addDiagEntry('info', `🛰️ [FETCH RE-ROUTE] ${originalUrl} -> ${resolvedUrl}`);
      if (typeof input === 'string') {
        requestPromise = originalFetch(resolvedUrl, init);
      } else {
        try {
          const newReq = new Request(resolvedUrl, input as any);
          requestPromise = originalFetch(newReq, init);
        } catch (e: any) {
          requestPromise = originalFetch(resolvedUrl, init);
        }
      }
    } else {
      requestPromise = originalFetch(input, init);
    }

    return requestPromise.then((response) => {
      logEntry.status = response.status;
      addNetworkLog(logEntry);
      
      const responseCopy = response.clone();
      responseCopy.text().then((bodyText) => {
        // Collect exact HTTP response headers
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });

        // Detailed live network diagnostics
        const logsPayload = {
          url: resolvedUrl,
          originalUrl: originalUrl,
          status: response.status,
          contentType: response.headers.get('content-type') || 'unknown',
          headers: headersObj,
          bodySnippet: bodyText.substring(0, 500)
        };

        console.log(`[NETWORK_DIAGNOSTICS] REQUEST URL: ${resolvedUrl}`);
        console.log(`[NETWORK_DIAGNOSTICS] HTTP STATUS: ${response.status}`);
        console.log(`[NETWORK_DIAGNOSTICS] HEADERS:`, JSON.stringify(headersObj, null, 2));
        console.log(`[NETWORK_DIAGNOSTICS] FIRST 500 CHARACTERS OF BODY:\n${logsPayload.bodySnippet}`);

        if (response.ok) {
          addDiagEntry('info', `📡 [API SUCCESS] HTTP ${response.status}: ${cleanPath}`, logsPayload);
        } else {
          addDiagEntry('error', `📡 [API ERROR] HTTP ${response.status}: ${cleanPath}`, logsPayload);
        }

        // Warn users if an API request returns index.html or other HTML documents
        if (logsPayload.contentType.includes('text/html') || bodyText.trim().startsWith('<')) {
          const warningMessage = `🚨 [HTML RESPONSE CRASH WARNING] API request to "${resolvedUrl}" returned an HTML response instead of valid JSON. Content-Type: ${logsPayload.contentType}. Body snippet: ${bodyText.substring(0, 100)}`;
          addDiagEntry('warn', warningMessage);
          console.warn(warningMessage);
        }
      }).catch((e) => {
        console.error('[NETWORK_DIAGNOSTICS] Failed to read intercepted response body text clone:', e);
      });
      return response;
    }).catch((err) => {
      addNetworkLog(logEntry);
      addDiagEntry('error', `💥 [API SEVERE FAILURE] Fetch to "${cleanPath}" failed entirely`, {
        message: err?.message || String(err)
      });
      throw err;
    });
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
    addDiagEntry('info', '🛡️ Registered custom global window.fetch interceptor successfully.');
  } catch (e) {
    win.fetch = customFetch;
    addDiagEntry('info', '🛡️ Bound custom global window.fetch interceptor via direct assignment.');
  }

  // 2. Intercept window.XMLHttpRequest to support Axios and raw XHR automatically
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const resolvedUrl = resolveApiUrl(urlStr);
    
    if (resolvedUrl !== urlStr) {
      addDiagEntry('info', `🛰️ [XHR RE-ROUTE] ${urlStr} -> ${resolvedUrl}`);
    }

    const logEntry: Omit<NetworkLog, 'id' | 'timestamp'> = {
      method,
      originalUrl: urlStr,
      resolvedUrl,
      type: 'xhr'
    };

    this.addEventListener('load', () => {
      logEntry.status = this.status;
      addNetworkLog(logEntry);
    });

    this.addEventListener('error', () => {
      addNetworkLog(logEntry);
    });

    return originalOpen.apply(this, [method, resolvedUrl, ...args] as any);
  };
  addDiagEntry('info', '🛡️ Registered custom global window.XMLHttpRequest interceptor successfully.');

  // Kickstart asynchronous background candidate server discovery
  startBackendAutoDiscovery();
};
