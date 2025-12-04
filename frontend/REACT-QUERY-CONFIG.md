// ROOT ENTRY: src/index.js
// ─────────────────────────────────────────────────────────────────────────
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

// Service Worker cleanup
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

// ✅ Provider Hierarchy L1: Browser Router + Context Providers
root.render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

unregister();


// WRAPPER: src/App.js
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import AppRouter from './router/App';

function App() {
  return <AppRouter />;
}

export default App;


// MAIN ROUTER: src/router/App.jsx
// ─────────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

// ... imports ...

// ✅ QueryClient Configuration (v5 @tanstack/react-query)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,  // 60 seconds
    },
  },
});

// ... component definitions ...

function AppRouter() {
  return (
    // ✅ LEVEL 1: Stripe Provider
    <Elements stripe={stripePromise}>
      
      {/* ✅ LEVEL 2: React Query Provider */}
      <QueryClientProvider client={queryClient}>
        
        {/* ✅ LEVEL 3: App Container & Layout */}
        <div className="App min-h-screen bg-gradient-to-br from-dark-900 to-dark-800 font-sans">
          <Header />
          <ChatWidget />
          
          <main className="main-content min-h-screen py-8">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner />}>
                
                {/* ✅ LEVEL 4: Routes */}
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Homepage />} />
                  <Route path="/products" element={<Products />} />
                  {/* ... more routes ... */}
                </Routes>
                
                {/* ✅ React Query Devtools (Inside Provider) */}
                <ReactQueryDevtools initialIsOpen={false} />
              
              </Suspense>
            </ErrorBoundary>
          </main>
          
          <Footer />
        </div>
      
      </QueryClientProvider>
    </Elements>
  );
}

export default AppRouter;


// COMPLETE PROVIDER HIERARCHY
// ─────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────┐
│ <BrowserRouter>                 [src/index.js L24]                       │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ <AuthProvider>              [src/context/AuthContext]            │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │ <CartProvider>          [src/context/CartContext]        │   │   │
│  │  │                                                           │   │   │
│  │  │  ┌────────────────────────────────────────────────────┐  │   │   │
│  │  │  │ <App />             [src/App.js]                  │  │   │   │
│  │  │  │  └─> <AppRouter />  [src/router/App.jsx]         │  │   │   │
│  │  │  │                                                    │  │   │   │
│  │  │  │      ┌──────────────────────────────────────────┐ │  │   │   │
│  │  │  │      │ <Elements stripe={stripePromise}>      │ │  │   │   │
│  │  │  │      │  (Stripe Payment Provider)             │ │  │   │   │
│  │  │  │      │                                          │ │  │   │   │
│  │  │  │      │  ┌────────────────────────────────────┐ │ │  │   │   │
│  │  │  │      │  │ <QueryClientProvider>    ✅ HERE  │ │ │  │   │   │
│  │  │  │      │  │ client={queryClient}               │ │ │  │   │   │
│  │  │  │      │  │                                     │ │ │  │   │   │
│  │  │  │      │  │ ┌─────────────────────────────────┐│ │ │  │   │   │
│  │  │  │      │  │ │ <App Container>                 ││ │ │  │   │   │
│  │  │  │      │  │ │  - Header                       ││ │ │  │   │   │
│  │  │  │      │  │ │  - ChatWidget                   ││ │ │  │   │   │
│  │  │  │      │  │ │  - Main Content (Routes)        ││ │ │  │   │   │
│  │  │  │      │  │ │  - <Routes>...</Routes>         ││ │ │  │   │   │
│  │  │  │      │  │ │  - ReactQueryDevtools ✅        ││ │ │  │   │   │
│  │  │  │      │  │ │  - Footer                       ││ │ │  │   │   │
│  │  │  │      │  │ └─────────────────────────────────┘│ │ │  │   │   │
│  │  │  │      │  │                                     │ │ │  │   │   │
│  │  │  │      │  └────────────────────────────────────┘ │ │  │   │   │
│  │  │  │      │                                          │ │  │   │   │
│  │  │  │      └──────────────────────────────────────────┘ │  │   │   │
│  │  │  │                                                    │  │   │   │
│  │  │  └────────────────────────────────────────────────────┘  │   │   │
│  │  │                                                           │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


REACT QUERY CONFIGURATION SUMMARY
─────────────────────────────────────────────────────────────────────────

✅ Framework: @tanstack/react-query v5
✅ QueryClient initialized: Line 75 in src/router/App.jsx
✅ Default Options configured:
   - retry: 1 (retry failed requests once)
   - refetchOnWindowFocus: false (don't refetch on window focus)
   - staleTime: 60_000 (60 seconds cache duration)

✅ QueryClientProvider wraps: Elements (Stripe) provider at Line 114
✅ ReactQueryDevtools: Line 188 (inside QueryClientProvider)
✅ DevTools initialIsOpen: false (hidden by default, press Ctrl+K to toggle)

✅ All child routes and components can now:
   - Use useQuery() hooks
   - Use useMutation() hooks
   - Use useInfiniteQuery() hooks
   - Use useQueryClient() to access the client
   - Trigger queries with queryClient.refetchQueries()
   - ChatWidget can use React Query if needed


HOW TO VERIFY IN BROWSER
─────────────────────────────────────────────────────────────────────────

1. Open: http://localhost:3000
2. Press: Ctrl + K (to toggle React Query DevTools)
3. You should see a floating panel showing:
   - Active queries
   - Cache state
   - Query status
   - Mutation history
4. All queries in the app will be visible there

