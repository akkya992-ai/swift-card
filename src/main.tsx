import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Global Fetch Interceptor to support native Capacitor builds on physical Android devices
if (typeof window !== 'undefined') {
  const isCapacitor = (window as any).Capacitor || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.protocol === 'file:';
  
  // Sourced from local storage config or defaulting to the current Cloud Run sandbox URI
  let remoteApiBase = localStorage.getItem('swiftcart_api_base_override') || '';
  
  if (!remoteApiBase && isCapacitor) {
    // Dynamic fallback to standard development service container url
    remoteApiBase = 'https://ais-dev-u4qsdpfkg63jdkgnj3beph-260720568939.asia-southeast1.run.app';
  }

  if (remoteApiBase) {
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.startsWith('/api')) {
        const sanitizedBase = remoteApiBase.replace(/\/+$/, '');
        const absoluteUrl = `${sanitizedBase}${input}`;
        console.log(`⚡ [CAPACITOR INTERCEPTOR] Redirecting: ${input} -> ${absoluteUrl}`);
        return originalFetch(absoluteUrl, init);
      }
      return originalFetch(input, init);
    };
  }
}

// Register the PWA background alarm service worker and request notification permissions
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('⚡ [PWA SERVICE WORKER] Registered successfully:', reg.scope);
          
          // Request browser notification permissions instantly on login / load
          if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              console.log(`[PWA NOTIFICATION PERMISSION] Status updated: ${permission}`);
            });
          }
        })
        .catch((err) => {
          console.error('❌ [PWA SERVICE WORKER] Registration failed:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

