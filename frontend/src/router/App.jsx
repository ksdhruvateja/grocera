import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

// Route Guards
import AdminRoute from './AdminRoute';
import CoAdminRoute from './CoAdminRoute';
import ProtectedRoute from './ProtectedRoute';

// Components (always loaded)
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Critical pages (loaded immediately)
import Home from '../pages/Home';
import Homepage from '../pages/customer/Homepage';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';

// Lazy loaded pages (loaded when needed)
const Products = lazy(() => import('../pages/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/customer/Checkout'));
const OrderSuccess = lazy(() => import('../pages/OrderSuccess'));
const Profile = lazy(() => import('../pages/Auth/Profile'));
const Orders = lazy(() => import('../pages/Orders'));
const Payment = lazy(() => import('../pages/Payment'));
const Contact = lazy(() => import('../pages/Contact'));
const AdminInfo = lazy(() => import('../pages/AdminInfo'));
const About = lazy(() => import('../pages/About'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'));
const OrderTracking = lazy(() => import('../pages/customer/OrderTracking'));

// Lazy loaded admin pages
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminCoAdminsPage = lazy(() => import('../pages/admin/AdminCoAdminsPage'));
const AdminPricing = lazy(() => import('../pages/AdminPricing'));
const AdminMessages = lazy(() => import('../pages/admin/AdminMessages'));
const AdminContacts = lazy(() => import('../pages/admin/AdminContacts'));

// Lazy loaded co-admin pages
const CoAdminLayout = lazy(() => import('../components/co-admin/CoAdminLayout'));
const CoAdminDashboardPage = lazy(() => import('../pages/co-admin/CoAdminDashboardPage'));
const CoAdminOrdersPage = lazy(() => import('../pages/co-admin/CoAdminOrdersPage'));
const CoAdminProductsPage = lazy(() => import('../pages/co-admin/CoAdminProductsPage'));
const CoAdminPriceRequestsPage = lazy(() => import('../pages/co-admin/CoAdminPriceRequestsPage'));
const CoAdminNotificationsPage = lazy(() => import('../pages/co-admin/CoAdminNotificationsPage'));

// Loading component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
    <p>Loading...</p>
  </div>
);

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

/**
 * RoleBasedRedirect - Redirects users based on their role after login
 * Admin → /admin/dashboard
 * Co-Admin → /co-admin/dashboard
 * Customer → /shop
 */
const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'co-admin':
      return <Navigate to="/co-admin/dashboard" replace />;
    case 'customer':
    default:
      return <Navigate to="/shop" replace />;
  }
};

function AppRouter() {
  return (
    <Elements stripe={stripePromise}>
      <QueryClientProvider client={queryClient}>
      <div className="App min-h-screen bg-gradient-to-br from-dark-900 to-dark-800 font-sans">
        <Header />
        <main className="main-content min-h-screen py-8">
          <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Homepage />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/admin-info" element={<AdminInfo />} />
              <Route path="/about" element={<About />} />
              
              {/* Public Order Tracking */}
              <Route path="/track/:orderId" element={<OrderTracking />} />

              {/* Role-based redirect after login */}
              <Route path="/dashboard" element={<RoleBasedRedirect />} />

              {/* Protected Customer Routes */}
              <Route path="/cart" element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/order-tracking/:orderId" element={
                <ProtectedRoute>
                  <OrderTracking />
                </ProtectedRoute>
              } />
              <Route path="/order-success" element={
                <ProtectedRoute>
                  <OrderSuccess />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/payment" element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              } />

              {/* Protected Admin Routes - Admin Only */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="co-admins" element={<AdminCoAdminsPage />} />
                <Route path="promotions" element={<AdminPricing />} />
                <Route path="reports" element={<AdminPricing />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="contacts" element={<AdminContacts />} />
              </Route>

              {/* Protected Co-Admin Routes - Co-Admin or Admin */}
              <Route path="/co-admin" element={
                <CoAdminRoute>
                  <CoAdminLayout />
                </CoAdminRoute>
              }>
                <Route index element={<Navigate to="/co-admin/dashboard" replace />} />
                <Route path="dashboard" element={<CoAdminDashboardPage />} />
                <Route path="orders" element={<CoAdminOrdersPage />} />
                <Route path="products" element={<CoAdminProductsPage />} />
                <Route path="price-requests" element={<CoAdminPriceRequestsPage />} />
                <Route path="notifications" element={<CoAdminNotificationsPage />} />
              </Route>

              {/* Fallback Route */}
              <Route path="*" element={
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                    <p className="text-xl text-gray-400 mb-8">Page Not Found</p>
                    <a 
                      href="/" 
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              } />
            </Routes>
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
