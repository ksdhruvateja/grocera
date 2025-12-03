# React Router v6 RBAC (Role-Based Access Control) Implementation

## 📁 Directory Structure

```
src/
├── router/
│   ├── App.jsx                  # Main router with all routes
│   ├── ProtectedRoute.jsx       # Generic auth + role protection
│   ├── AdminRoute.jsx           # Admin-only protection
│   └── CoAdminRoute.jsx         # Admin OR Co-Admin protection
├── context/
│   └── AuthContext.js           # JWT auth & role management
└── pages/
    ├── Auth/
    │   ├── Login.jsx            # Auto-redirect after login
    │   └── Register.jsx         # Auto-redirect after registration
    ├── admin/                   # Admin-only pages
    ├── co-admin/                # Co-admin pages
    └── customer/                # Customer pages
```

---

## 🔐 Route Protection Components

### 1. ProtectedRoute.jsx
**Generic authentication guard with optional role checks**

```jsx
<ProtectedRoute>
  <CustomerPage />
</ProtectedRoute>

// With role restrictions
<ProtectedRoute coAdminOnly>
  <CoAdminPage />
</ProtectedRoute>

<ProtectedRoute allowRoles={['admin', 'customer']}>
  <SharedPage />
</ProtectedRoute>
```

**Props:**
- `children`: React components to render if authorized
- `adminOnly`: Boolean - requires admin role (legacy)
- `coAdminOnly`: Boolean - requires co-admin role specifically
- `allowRoles`: Array - list of allowed roles `['admin', 'co-admin', 'customer']`

**Behavior:**
- Shows loading spinner during auth check
- Redirects to `/login` if not authenticated
- Redirects to `/` if authenticated but wrong role
- Preserves original URL in location state for redirect after login

---

### 2. AdminRoute.jsx
**Admin-only access control**

```jsx
<AdminRoute>
  <AdminLayout />
</AdminRoute>
```

**Features:**
- Only allows `role === 'admin'`
- Blocks co-admins and customers
- Orange spinner theme (matches admin branding)

**Use Cases:**
- `/admin/*` routes
- Admin dashboard
- User management
- Co-admin approval workflows
- System settings

---

### 3. CoAdminRoute.jsx
**Admin OR Co-Admin access control**

```jsx
<CoAdminRoute>
  <CoAdminLayout />
</CoAdminRoute>
```

**Features:**
- Allows `role === 'admin'` OR `role === 'co-admin'`
- Blocks customers
- Blue spinner theme (matches co-admin branding)

**Use Cases:**
- `/co-admin/*` routes
- Product management
- Order processing
- Price change requests
- Inventory management

**Note:** Admins can access co-admin routes, enabling them to see the co-admin experience.

---

## 🗺️ Route Configuration

### Public Routes (No Auth Required)
```javascript
Route: /                        → Homepage
Route: /shop                    → Customer shop
Route: /products                → Product listing
Route: /products/:id            → Product detail
Route: /contact                 → Contact page
Route: /login                   → Login page
Route: /register                → Register page
Route: /forgot-password         → Password reset
Route: /admin-info              → Admin information
Route: /about                   → About page
Route: /track/:orderId          → Public order tracking (no auth)
```

---

### Protected Customer Routes (Auth Required)
```javascript
Route: /cart                    → Shopping cart
Route: /checkout                → Checkout flow
Route: /order-tracking/:orderId → Authenticated order tracking
Route: /order-success           → Order confirmation
Route: /profile                 → User profile
Route: /orders                  → Order history
Route: /payment                 → Payment processing
```

**Protection:** `<ProtectedRoute>` (any authenticated user)

---

### Admin Routes (Admin Only)
```javascript
Route: /admin                   → Auto-redirect to /admin/dashboard
Route: /admin/dashboard         → Admin dashboard
Route: /admin/orders            → Order management
Route: /admin/products          → Product management
Route: /admin/users             → User management
Route: /admin/co-admins         → Co-admin management
Route: /admin/promotions        → Promotions & pricing
Route: /admin/reports           → Analytics & reports
Route: /admin/messages          → Messages inbox
Route: /admin/contacts          → Contact submissions
```

**Protection:** `<AdminRoute>` (admin only)
**Layout:** `<AdminLayout>` with orange theme

---

### Co-Admin Routes (Admin OR Co-Admin)
```javascript
Route: /co-admin                → Auto-redirect to /co-admin/dashboard
Route: /co-admin/dashboard      → Co-admin dashboard
Route: /co-admin/orders         → Order management
Route: /co-admin/products       → Product management + price requests
Route: /co-admin/price-requests → Price change request tracking
Route: /co-admin/notifications  → Real-time notifications
```

**Protection:** `<CoAdminRoute>` (admin OR co-admin)
**Layout:** `<CoAdminLayout>` with blue theme

---

## 🔄 Auto-Redirect After Login

### RoleBasedRedirect Component
Automatically redirects users based on their role after authentication.

```javascript
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" />;
    case 'co-admin':
      return <Navigate to="/co-admin/dashboard" />;
    case 'customer':
    default:
      return <Navigate to="/shop" />;
  }
};
```

**Triggered by:**
- Successful login
- Successful registration
- Accessing `/dashboard` route

**Redirect Logic:**
| User Role  | Redirect To          | Reason                    |
|------------|---------------------|---------------------------|
| admin      | /admin/dashboard    | Full admin access         |
| co-admin   | /co-admin/dashboard | Limited admin access      |
| customer   | /shop               | Customer shopping page    |

---

## 🎯 JWT & Role Detection

### User Object Structure
```javascript
{
  id: "507f1f77bcf86cd799439011",
  name: "John Doe",
  email: "john@example.com",
  role: "admin" | "co-admin" | "customer",
  phone: "+1234567890",
  addresses: [...],
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

**Role Field:** `user.role`
- Stored in JWT token payload
- Decoded on backend middleware
- Returned in `/auth/login` and `/auth/register` responses
- Cached in `localStorage` as `user` JSON string

---

### AuthContext Integration

**Login Flow:**
```javascript
const login = async (credentials) => {
  // 1. POST /api/auth/login
  const { token, user } = await api.post('/auth/login', credentials);
  
  // 2. Store in localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // 3. Update auth state
  dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  
  // 4. Role-based redirect (in component)
  switch (user.role) {
    case 'admin': navigate('/admin/dashboard'); break;
    case 'co-admin': navigate('/co-admin/dashboard'); break;
    default: navigate('/shop');
  }
};
```

**Auth State:**
```javascript
{
  user: { id, name, email, role, ... },
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  isAuthenticated: true,
  isLoading: false
}
```

---

## 🛡️ Security Features

### 1. JWT Token Validation
- Token stored in `localStorage` (key: `token`)
- Added to all API requests via `Authorization: Bearer <token>`
- Backend verifies JWT signature and expiration
- Invalid token → 401 Unauthorized → Logout + Redirect to `/login`

### 2. Role Verification
- Role extracted from JWT payload on backend
- Double-checked on frontend route guards
- Prevents unauthorized access via URL manipulation

### 3. Protected API Endpoints
```javascript
// Backend middleware
const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role; // From JWT
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
};

// Apply to routes
router.get('/admin/users', verifyRole(['admin']), getUsersController);
router.get('/co-admin/products', verifyRole(['admin', 'co-admin']), getProductsController);
```

### 4. Loading States
- Prevents flash of unauthorized content
- Shows spinner during auth check
- Smooth transition to authorized content

---

## 📊 Route Access Matrix

| Route                | Customer | Co-Admin | Admin |
|---------------------|----------|----------|-------|
| /                   | ✅       | ✅       | ✅    |
| /shop               | ✅       | ✅       | ✅    |
| /cart               | ✅       | ✅       | ✅    |
| /track/:id          | ✅       | ✅       | ✅    |
| /admin/*            | ❌       | ❌       | ✅    |
| /co-admin/*         | ❌       | ✅       | ✅    |

**Legend:**
- ✅ Full access
- ❌ Blocked (redirects to `/`)

---

## 🧪 Testing Guide

### Test Case 1: Customer Login
```
1. Navigate to /login
2. Enter customer credentials
3. Click "Sign In"
✓ Expect: Redirect to /shop
✓ Expect: Cannot access /admin/* (redirects to /)
✓ Expect: Cannot access /co-admin/* (redirects to /)
```

### Test Case 2: Admin Login
```
1. Navigate to /login
2. Select "Admin" role tab
3. Enter admin credentials
4. Click "Sign In"
✓ Expect: Redirect to /admin/dashboard
✓ Expect: Can access all /admin/* routes
✓ Expect: Can access /co-admin/* routes (viewing co-admin experience)
```

### Test Case 3: Co-Admin Login
```
1. Navigate to /login
2. Select "Co-Admin" role tab
3. Enter co-admin credentials
4. Click "Sign In"
✓ Expect: Redirect to /co-admin/dashboard
✓ Expect: Can access all /co-admin/* routes
✓ Expect: Cannot access /admin/* (redirects to /)
```

### Test Case 4: URL Manipulation
```
1. Login as customer
2. Manually type /admin/dashboard in URL
✓ Expect: Redirect to / (homepage)
3. Manually type /co-admin/dashboard in URL
✓ Expect: Redirect to / (homepage)
```

### Test Case 5: Token Expiration
```
1. Login with valid credentials
2. Wait for token to expire (or manually expire in backend)
3. Try to access protected route
✓ Expect: API returns 401
✓ Expect: AuthContext triggers logout
✓ Expect: Redirect to /login
```

### Test Case 6: Direct URL Access
```
1. Without logging in, navigate to /admin/dashboard
✓ Expect: Redirect to /login
✓ Expect: Location state preserves /admin/dashboard
2. Login with admin credentials
✓ Expect: Redirect back to /admin/dashboard
```

---

## 🚀 Implementation Checklist

### Frontend ✅
- [x] Create `router/` directory
- [x] Implement `ProtectedRoute.jsx`
- [x] Implement `AdminRoute.jsx`
- [x] Implement `CoAdminRoute.jsx`
- [x] Create `router/App.jsx` with all routes
- [x] Update main `App.js` to use router
- [x] Add role-based redirect in Login
- [x] Add role-based redirect in Register
- [x] Update AuthContext with role detection
- [x] Test all route guards

### Backend ⏳
- [ ] Create `verifyRole` middleware
- [ ] Apply middleware to admin routes
- [ ] Apply middleware to co-admin routes
- [ ] Ensure JWT includes `role` in payload
- [ ] Test role-based API access

---

## 🐛 Troubleshooting

### Issue: Infinite redirect loop
**Cause:** Loading state not handled properly
**Solution:** Ensure `isLoading` check returns spinner before auth check

### Issue: User can access admin routes
**Cause:** JWT role not set or checked incorrectly
**Solution:** Verify `user.role` is properly set in JWT and checked in guards

### Issue: Redirect after login not working
**Cause:** Navigate called before state update
**Solution:** Use `useEffect` or callback after successful login

### Issue: Token not included in API requests
**Cause:** Axios default headers not set
**Solution:** Set `api.defaults.headers.common['Authorization'] = Bearer ${token}`

---

## 📚 Best Practices

1. **Always use route guards** - Never rely solely on hiding UI elements
2. **Double-check on backend** - Frontend guards are for UX, backend for security
3. **Handle loading states** - Prevent flash of unauthorized content
4. **Store minimal data** - Only store what's necessary in localStorage
5. **Clear data on logout** - Remove token and user data
6. **Use HTTPS in production** - Protect JWT tokens in transit
7. **Set token expiration** - Use short-lived tokens (1-7 days)
8. **Implement refresh tokens** - For seamless re-authentication

---

## 🔮 Future Enhancements

1. **Permission-based access** - Granular permissions within roles
2. **Multi-factor authentication** - Additional security layer
3. **Session management** - Track active sessions
4. **Role hierarchy** - Parent-child role relationships
5. **Audit logging** - Track role-based actions
6. **Dynamic role assignment** - Admin can change user roles
7. **Token refresh** - Auto-refresh expired tokens
8. **Remember me** - Persistent sessions

---

## 📖 Related Documentation

- AuthContext: `src/context/AuthContext.js`
- API Integration: `src/services/api.js`
- Admin Dashboard: `ADMIN-DASHBOARD-DOCS.md`
- Co-Admin Dashboard: `CO-ADMIN-DASHBOARD-DOCS.md`

---

**Version:** 1.0.0
**Last Updated:** December 2024
**Author:** ZIPPYYY Development Team
