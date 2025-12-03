# RBAC Router - Quick Reference

## 🎯 Route Structure

```
PUBLIC (No Auth)
├── /                           Homepage
├── /shop                       Customer shop
├── /products                   Product listing
├── /products/:id               Product detail
├── /login                      Login
├── /register                   Register
└── /track/:orderId             Public order tracking

CUSTOMER (Auth Required)
├── /cart                       Shopping cart
├── /checkout                   Checkout
├── /profile                    User profile
├── /orders                     Order history
└── /order-tracking/:orderId    Order tracking

ADMIN (Admin Only)
├── /admin                      → Redirects to /admin/dashboard
├── /admin/dashboard            Dashboard
├── /admin/orders               Orders
├── /admin/products             Products
├── /admin/users                Users
├── /admin/co-admins            Co-admins
└── /admin/*                    Other admin pages

CO-ADMIN (Admin OR Co-Admin)
├── /co-admin                   → Redirects to /co-admin/dashboard
├── /co-admin/dashboard         Dashboard
├── /co-admin/orders            Orders
├── /co-admin/products          Products
├── /co-admin/price-requests    Price requests
└── /co-admin/notifications     Notifications
```

---

## 🛡️ Route Guards

### ProtectedRoute
```jsx
// Any authenticated user
<ProtectedRoute>
  <Cart />
</ProtectedRoute>

// Co-admin only
<ProtectedRoute coAdminOnly>
  <CoAdminPage />
</ProtectedRoute>

// Multiple roles
<ProtectedRoute allowRoles={['admin', 'customer']}>
  <SharedPage />
</ProtectedRoute>
```

### AdminRoute
```jsx
// Admin only (blocks co-admins)
<AdminRoute>
  <AdminLayout />
</AdminRoute>
```

### CoAdminRoute
```jsx
// Admin OR Co-Admin (blocks customers)
<CoAdminRoute>
  <CoAdminLayout />
</CoAdminRoute>
```

---

## 🔄 Auto-Redirect After Login

| User Role | Redirects To        |
|-----------|---------------------|
| admin     | /admin/dashboard    |
| co-admin  | /co-admin/dashboard |
| customer  | /shop               |

Implemented in:
- `Login.jsx` (line 36-48)
- `Register.jsx` (line 52-64)
- `router/App.jsx` (RoleBasedRedirect component)

---

## 📂 File Locations

```
src/
├── router/
│   ├── App.jsx              ← Main router with all routes
│   ├── ProtectedRoute.jsx   ← Generic protection
│   ├── AdminRoute.jsx       ← Admin-only
│   └── CoAdminRoute.jsx     ← Admin OR Co-Admin
├── App.js                   ← Entry point (uses router/App.jsx)
└── pages/
    └── Auth/
        ├── Login.jsx        ← Auto-redirect after login
        └── Register.jsx     ← Auto-redirect after register
```

---

## ⚡ Quick Commands

### Test as Customer
```javascript
// Login form
Email: customer@example.com
Password: password123
Role: Customer

// Should redirect to: /shop
```

### Test as Co-Admin
```javascript
// Login form
Email: coadmin@example.com
Password: password123
Role: Co-Admin

// Should redirect to: /co-admin/dashboard
```

### Test as Admin
```javascript
// Login form
Email: admin@rbsgrocery.com
Password: admin123
Role: Admin

// Should redirect to: /admin/dashboard
```

---

## 🧪 Quick Tests

1. **Login redirect:**
   - Login → Check URL matches role

2. **URL manipulation:**
   - As customer, try `/admin/dashboard` → Should redirect to `/`

3. **Token expiration:**
   - Clear localStorage → Try protected route → Should redirect to `/login`

4. **Direct URL:**
   - Not logged in → Go to `/admin/dashboard` → Should redirect to `/login` → After login → Should go back to `/admin/dashboard`

---

## 🔧 Common Issues

### Infinite redirect
- Check `isLoading` state in route guards
- Ensure loading spinner shows before auth check

### Wrong redirect after login
- Verify `user.role` is correct in response
- Check switch statement in Login.jsx

### Can access admin routes as customer
- Check AdminRoute is applied to admin routes
- Verify `user.role` is 'admin' in JWT

### Token not in API requests
- Check `Authorization` header is set
- Verify token exists in localStorage

---

## 📋 Checklist

Frontend:
- [x] Router structure created
- [x] Route guards implemented
- [x] Auto-redirect after login
- [x] Role-based navigation
- [x] Loading states handled
- [x] Error boundaries added

Backend (TODO):
- [ ] Role middleware created
- [ ] JWT includes role field
- [ ] Admin routes protected
- [ ] Co-admin routes protected
- [ ] Token expiration set
- [ ] Refresh token flow

---

## 🚀 Next Steps

1. **Start frontend:** `cd frontend && npm start`
2. **Test login flow** with different roles
3. **Verify route protection** by URL manipulation
4. **Implement backend** role middleware
5. **Test end-to-end** with real API

---

**Full Documentation:** See `RBAC-ROUTER-DOCS.md`
