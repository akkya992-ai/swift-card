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
  
  // Combine rules securely: if verified native platform flag is true,
  // or Capacitor object is present AND running on a native scheme or Capacitor UA
  return !!(isNativePlatform || (hasCapObject && (isNativeProtocol || isCapacitorUA)));
};

/**
 * 1. Implement a SINGLE reliable API base strategy:
 * Priority order:
 * - import.meta.env.VITE_API_BASE_URL (highest priority)
 * - localStorage override key: swiftcart_api_base_override
 * - fallback to Cloud Run backend URL: https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app
 *
 * 3. Remove any logic that forces window.location.origin as API base unless backend is confirmed same-origin.
 */
export const getApiBase = (): string => {
  // 1. Highest priority: VITE_API_BASE_URL
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    logConfigState(cleanUrl, 'Environment Variable (VITE_API_BASE_URL)');
    return cleanUrl;
  }

  // 2. Second priority: localStorage override key
  if (typeof window !== 'undefined') {
    const overrideUrl = localStorage.getItem('swiftcart_api_base_override');
    if (overrideUrl && overrideUrl.trim() !== '') {
      const cleanUrl = overrideUrl.replace(/\/+$/, '');
      logConfigState(cleanUrl, 'LocalStorage Override (swiftcart_api_base_override)');
      return cleanUrl;
    }
  }

  // 3. Optional fallback: Same-origin window.location.origin ONLY if explicitly confirmed as a direct development same-origin host
  if (typeof window !== 'undefined' && !getIsCapacitor()) {
    const hostname = window.location.hostname;
    const isSameOriginHost = 
      hostname.includes('ais-dev-') || 
      hostname.includes('ais-pre-') || 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0';
      
    if (isSameOriginHost) {
      const cleanUrl = window.location.origin.replace(/\/+$/, '');
      logConfigState(cleanUrl, 'Confirmed same-origin development host');
      return cleanUrl;
    }
  }

  // 4. Fallback to Cloud Run backend URL
  const fallbackUrl = 'https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app';
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
  
  const isRelativeApi = 
    url.startsWith('/api') || 
    url.startsWith('api/') ||
    (typeof window !== 'undefined' && url.startsWith(window.location.origin + '/api'));

  if (isRelativeApi) {
    let apiPath = '';
    if (url.startsWith('/api')) {
      apiPath = url;
    } else if (url.startsWith('api/')) {
      apiPath = '/' + url;
    } else if (typeof window !== 'undefined' && url.startsWith(window.location.origin + '/api')) {
      apiPath = url.substring(window.location.origin.length);
    }
    
    const apiBase = getApiBase();
    return safeUrlJoin(apiBase, apiPath);
  }
  
  return url;
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
  const customFetch = function (input: any, init?: any): Promise<Response> {
    let originalUrl = '';
    if (typeof input === 'string') {
      originalUrl = input;
    } else if (input && typeof input === 'object' && 'url' in input) {
      originalUrl = (input as any).url;
    }

    const resolvedUrl = resolveApiUrl(originalUrl);
    const method = init?.method || (input && typeof input === 'object' && (input as any).method) || 'GET';

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
        if (response.ok) {
          addDiagEntry('info', `📡 [API SUCCESS] HTTP ${response.status}: ${cleanPath}`, {
            status: response.status,
            preview: bodyText.substring(0, 150)
          });
        } else {
          addDiagEntry('error', `📡 [API ERROR] HTTP ${response.status}: ${cleanPath}`, {
            status: response.status,
            preview: bodyText.substring(0, 400)
          });
        }
      }).catch(() => {});
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
};
