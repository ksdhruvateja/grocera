import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index-tailwind.css';
import './styles/index.css';
import './styles/design-system.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { unregister } from './serviceWorkerRegistration';

// Hard-kill any previously installed service workers + caches to stop offline fallbacks
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => {
      registrations.forEach(reg => reg.unregister());
    })
    .catch(() => {/* ignore */});

  if (window.caches && window.caches.keys) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {/* ignore */});
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

// Completely unregister service worker to prevent reload issues
unregister();