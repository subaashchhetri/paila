import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all API calls and route them to Render backend in production/native mode
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isCapacitor = window.location.protocol === 'capacitor:';
    
    // Only redirect if running inside native mobile container (Capacitor) or on an external frontend host (like Vercel)
    const isExternalHost = !isLocalhost && window.location.hostname !== 'paila-todo.onrender.com';
    
    if (isCapacitor || isExternalHost) {
      const baseUrl = 'https://paila-todo.onrender.com';
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
