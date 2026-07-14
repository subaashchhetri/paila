import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all API calls and route them to Render backend in production/native mode
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // On native apps (Capacitor) or in production web, redirect relative /api calls to Render server
    const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'http:' && !isLocalhost;
    
    if (isCapacitor || !isLocalhost) {
      const baseUrl = 'https://paila-1.onrender.com';
      input = `${baseUrl}${input}`;
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
