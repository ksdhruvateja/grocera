# Co-Admin Dashboard Documentation

## Overview
The Co-Admin Dashboard provides a role-based interface for managing products, orders, and price change requests. Co-admins have limited permissions compared to full admins but can manage day-to-day operations and submit price change requests for admin approval.

---

## Components Structure

### Layout
**File:** `frontend/src/components/co-admin/CoAdminLayout.jsx`

Sidebar navigation with 5 menu items:
- 📊 Dashboard
- 📦 Orders
- 📦 Products
- 💰 Price Requests
- 🔔 Notifications

**Features:**
- Collapsible sidebar with toggle
- Responsive mobile menu
- Blue accent color (#3B82F6) to differentiate from admin
- Logout functionality with confirmation
- Active route highlighting

---

### Dashboard
**File:** `frontend/src/components/co-admin/CoAdminDashboard.jsx`

**Statistics Cards (4):**
1. **Pending Orders** - Orders awaiting processing
2. **Pending Requests** - Price change requests awaiting approval
3. **Approved Requests** - Successfully approved price changes
4. **Rejected Requests** - Rejected price changes

**Features:**
- Real-time Socket.IO integration
- Pending orders list (last 5)
- Recent price requests list (last 5) with status badges
- Info banner explaining co-admin permissions
- Click-to-navigate on stat cards

**Socket.IO Events Listened:**
- `priceApprovalUpdate` - Admin approves/rejects price request
- `orderCreated` - New order placed

---

### Products Table
**File:** `frontend/src/components/co-admin/ProductsTable.jsx`

**CRUD Operations:**
- ✅ Add new products
- ✅ Edit existing products
- ✅ Delete products
- ✅ View product details with margin calculation

**Special Feature: Request Price Change**
- Dollar sign icon button in actions column
- Modal form with:
  - Current price display
  - Proposed price input
  - Automatic change percentage calculation
  - Visual alerts (red for decrease, green for increase)
  - Reason textarea (required)
  - Yellow info alert about admin approval process

**Socket.IO Event Emitted:**
```javascript
socket.emit('priceRequestSubmitted', {
  productId,
  productName,
  currentPrice,
  proposedPrice,
  reason
});
```

**API Endpoint:**
```
POST /api/co-admin/price-requests
Body: {
  productId,
  currentPrice,
  proposedPrice,
  reason
}
```

**Features:**
- Search by product name
- Filter by category
- Pagination (10 items per page)
- Stock tracking with visual warnings

---

### Price Requests Component
**File:** `frontend/src/components/co-admin/PriceRequests.jsx`

**Features:**
- View all submitted price change requests
- Status badges: Pending (yellow), Approved (green), Rejected (red)
- Search by product name
- Filter by status (All/Pending/Approved/Rejected)
- Pagination (10 requests per page)
- Real-time updates via Socket.IO

**Request Card Display:**
- Product name and status badge
- Current price vs. Proposed price
- Change amount and percentage (color-coded)
- Reason for price change
- Submission timestamp
- Approval/Rejection timestamp
- Admin note (if provided)

**Socket.IO Events Listened:**
```javascript
socket.on('priceApprovalUpdate', (data) => {
  // data: { requestId, approved, productName, adminNote }
  // Updates request status in real-time
  // Shows toast notification
});
```

**API Endpoint:**
```
GET /api/co-admin/price-requests
Response: [
  {
    _id,
    product: { _id, name },
    currentPrice,
    proposedPrice,
    reason,
    status: 'pending|approved|rejected',
    createdAt,
    updatedAt,
    adminNote
  }
]
```

**Summary Stats:**
- Total Pending requests
- Total Approved requests
- Total Rejected requests

---

### Notifications Page
**File:** `frontend/src/pages/co-admin/CoAdminNotificationsPage.jsx`

**Features:**
- Real-time notification history stored in localStorage
- Unread count badge
- Mark all as read button
- Clear all notifications button
- Filter by type: All/Unread/Approved/Rejected/Orders

**Notification Types:**
1. **Price Approved** - Green with checkmark icon
2. **Price Rejected** - Red with X icon
3. **Order Created** - Blue with shopping bag icon
4. **Order Updated** - Yellow with dollar sign icon

**Socket.IO Events Listened:**
- `priceApprovalUpdate` - Admin response to price request
- `orderCreated` - New order notification
- `orderUpdated` - Order status change

**Notification Structure:**
```javascript
{
  id: timestamp,
  type: 'price-approved|price-rejected|order-created|order-updated',
  title: 'Notification Title',
  message: 'Notification message',
  data: { ...eventData },
  timestamp: ISOString,
  read: boolean
}
```

**LocalStorage Key:** `coAdminNotifications`

---

### Orders Page
**File:** `frontend/src/pages/co-admin/CoAdminOrdersPage.jsx`

**Features:**
- Reuses `OrdersTable` component from admin
- Can be role-filtered on backend to show only assigned orders
- Search, filter, and pagination
- Status updates with dropdown
- Assign delivery agent
- Real-time updates via Socket.IO

---

## Routing Configuration

**Base Route:** `/co-admin/*`

**Routes in App.js:**
```javascript
<Route path="/co-admin" element={
  <ProtectedRoute coAdminOnly>
    <CoAdminLayout />
  </ProtectedRoute>
}>
  <Route path="dashboard" element={<CoAdminDashboardPage />} />
  <Route path="orders" element={<CoAdminOrdersPage />} />
  <Route path="products" element={<CoAdminProductsPage />} />
  <Route path="price-requests" element={<CoAdminPriceRequestsPage />} />
  <Route path="notifications" element={<CoAdminNotificationsPage />} />
</Route>
```

**ProtectedRoute Update:**
```javascript
function ProtectedRoute({ children, adminOnly = false, coAdminOnly = false }) {
  // ...
  if (coAdminOnly && user?.role !== 'co-admin') {
    return <Navigate to="/" replace />;
  }
  // ...
}
```

---

## Socket.IO Integration

### useSocket Hook
**File:** `frontend/src/hooks/useSocket.js`

**Updated to auto-detect token and role:**
```javascript
export const useSocket = (providedToken, providedRole) => {
  // Auto-fetches from localStorage if not provided
  const token = providedToken || localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = providedRole || user.role;
  // ...
}
```

**Usage in Components:**
```javascript
import { useSocket } from '../../hooks/useSocket';

const MyComponent = () => {
  const socket = useSocket(); // Auto-detects token and role
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('eventName', (data) => {
      // Handle event
    });
    
    return () => {
      socket.off('eventName');
    };
  }, [socket]);
};
```

### Socket.IO Events

#### Co-Admin Emits:
1. **priceRequestSubmitted**
   ```javascript
   socket.emit('priceRequestSubmitted', {
     productId: '507f1f77bcf86cd799439011',
     productName: 'Organic Bananas',
     currentPrice: 2.99,
     proposedPrice: 3.49,
     reason: 'Supplier cost increase'
   });
   ```

#### Co-Admin Listens:
1. **priceApprovalUpdate**
   ```javascript
   socket.on('priceApprovalUpdate', (data) => {
     // data: {
     //   requestId: '507f1f77bcf86cd799439011',
     //   approved: true,
     //   productName: 'Organic Bananas',
     //   adminNote: 'Approved due to market conditions'
     // }
   });
   ```

2. **orderCreated**
   ```javascript
   socket.on('orderCreated', (order) => {
     // order: { _id, orderNumber, total, items, status, ... }
   });
   ```

3. **orderUpdated**
   ```javascript
   socket.on('orderUpdated', (order) => {
     // order: { _id, orderNumber, status, ... }
   });
   ```

---

## Price Change Request Workflow

### 1. Co-Admin Submits Request
**UI:** ProductsTable → "Request Price Change" button → Modal

**Process:**
1. Co-admin fills out modal:
   - Proposed price
   - Reason for change
2. System calculates percentage change
3. Visual alert shows increase/decrease
4. Submit button POSTs to API
5. Socket.IO event emitted to admin

**Code:**
```javascript
const handlePriceRequestSubmit = async (e) => {
  e.preventDefault();
  
  const requestData = {
    productId: selectedProduct._id,
    currentPrice: selectedProduct.listedPrice,
    proposedPrice: parseFloat(priceRequestData.proposedPrice),
    reason: priceRequestData.reason
  };
  
  // POST to API
  await axios.post('/api/co-admin/price-requests', requestData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Emit Socket.IO event
  if (socket) {
    socket.emit('priceRequestSubmitted', {
      ...requestData,
      productName: selectedProduct.name
    });
  }
  
  toast.success('Price change request submitted');
};
```

### 2. Admin Receives Notification
**Location:** Admin Dashboard, CoAdminTable component

**Display:**
- Notification toast appears
- Request appears in pending list
- Card shows current vs. proposed price

### 3. Admin Reviews and Approves/Rejects
**UI:** Admin → Co-Admins Page → Price Requests Section

**Process:**
1. Admin clicks Approve or Reject button
2. Modal appears for admin note (optional)
3. API updates request status
4. Socket.IO event sent back to co-admin

**Backend (to be implemented):**
```javascript
// PUT /api/admin/price-requests/:id
router.put('/:id', async (req, res) => {
  const { approved, adminNote } = req.body;
  
  const request = await PriceRequest.findByIdAndUpdate(req.params.id, {
    status: approved ? 'approved' : 'rejected',
    adminNote,
    reviewedBy: req.user._id,
    reviewedAt: new Date()
  }, { new: true }).populate('product');
  
  // Emit Socket.IO event
  io.to('co-admins').emit('priceApprovalUpdate', {
    requestId: request._id,
    approved,
    productName: request.product.name,
    adminNote
  });
  
  res.json(request);
});
```

### 4. Co-Admin Receives Response
**Locations:**
- Price Requests page (real-time update)
- Notifications page (new notification)
- Toast notification

**Display:**
- Status badge changes color
- Admin note displayed if provided
- Timestamp of approval/rejection shown

---

## Backend API Endpoints (To Implement)

### Co-Admin Routes
**Base:** `/api/co-admin`

1. **GET /price-requests**
   - Get all price requests for logged-in co-admin
   - Query params: status, page, limit
   - Response: Array of price request objects

2. **POST /price-requests**
   - Submit new price change request
   - Body: { productId, currentPrice, proposedPrice, reason }
   - Response: Created price request object

3. **GET /dashboard/stats**
   - Get dashboard statistics
   - Response: { pendingOrders, pendingRequests, approvedRequests, rejectedRequests }

4. **GET /orders**
   - Get orders assigned to co-admin
   - Query params: status, page, limit
   - Response: Array of order objects

5. **GET /products**
   - Get all products (for management)
   - Query params: category, search, page, limit
   - Response: Array of product objects

6. **POST /products**
   - Create new product
   - Body: { name, description, price, category, stock, image }
   - Response: Created product object

7. **PUT /products/:id**
   - Update existing product
   - Body: { name, description, price, category, stock, image }
   - Response: Updated product object

8. **DELETE /products/:id**
   - Delete product
   - Response: Success message

### Admin Routes (Price Approval)
**Base:** `/api/admin`

1. **PUT /price-requests/:id**
   - Approve or reject price request
   - Body: { approved: boolean, adminNote: string }
   - Response: Updated price request object
   - Socket.IO: Emits `priceApprovalUpdate` to co-admins

---

## Backend Socket.IO Handlers (To Implement)

### Server Setup
**File:** `server.js` or `websocket.js`

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.userRole})`);
  
  // Subscribe to role-based rooms
  socket.on('subscribe:admin', () => {
    if (socket.userRole === 'admin') {
      socket.join('admins');
      console.log(`Admin ${socket.userId} joined admins room`);
    }
  });
  
  socket.on('subscribe:co-admin', () => {
    if (socket.userRole === 'co-admin') {
      socket.join('co-admins');
      console.log(`Co-admin ${socket.userId} joined co-admins room`);
    }
  });
  
  // Price request submitted by co-admin
  socket.on('priceRequestSubmitted', (data) => {
    if (socket.userRole === 'co-admin') {
      // Broadcast to all admins
      io.to('admins').emit('newPriceRequest', {
        ...data,
        submittedBy: socket.userId,
        timestamp: new Date()
      });
      
      console.log(`Price request submitted for ${data.productName}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

module.exports = io;
```

### Admin Approval Handler
```javascript
// In admin routes or controller
const approvePriceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, adminNote } = req.body;
    
    const request = await PriceRequest.findByIdAndUpdate(
      id,
      {
        status: approved ? 'approved' : 'rejected',
        adminNote,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('product submittedBy');
    
    // Update product price if approved
    if (approved) {
      await Product.findByIdAndUpdate(request.product._id, {
        listedPrice: request.proposedPrice,
        lastPriceUpdate: new Date()
      });
    }
    
    // Emit Socket.IO event to co-admins
    req.app.get('io').to('co-admins').emit('priceApprovalUpdate', {
      requestId: request._id,
      approved,
      productName: request.product.name,
      adminNote
    });
    
    res.json(request);
  } catch (error) {
    console.error('Price approval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

---

## Database Models (To Implement)

### PriceRequest Model
**File:** `models/PriceRequest.js`

```javascript
const mongoose = require('mongoose');

const priceRequestSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  proposedPrice: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  adminNote: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
priceRequestSchema.index({ submittedBy: 1, status: 1 });
priceRequestSchema.index({ product: 1 });
priceRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PriceRequest', priceRequestSchema);
```

---

## Styling and Theme

### Colors
**Co-Admin Blue Accent:** `#3B82F6`
- Used for: Sidebar active states, buttons, badges, accents
- Differentiates from Admin orange (`#FF6B35`)

**Status Colors:**
- Pending: Yellow (`#EAB308`)
- Approved: Green (`#10B981`)
- Rejected: Red (`#EF4444`)

**Background:**
- Main: `bg-gray-900`
- Cards: `bg-gray-800`
- Borders: `border-gray-700`
- Hover: `hover:bg-gray-700`

### Typography
- Headings: `font-bold text-white`
- Body: `text-gray-300`
- Muted: `text-gray-400`
- Small: `text-sm` or `text-xs`

---

## Testing Checklist

### Frontend
- [ ] Co-admin can login and access /co-admin/dashboard
- [ ] All sidebar links navigate correctly
- [ ] Dashboard shows stats cards with correct counts
- [ ] Products table loads and displays products
- [ ] "Request Price Change" button opens modal
- [ ] Price request modal calculates percentage correctly
- [ ] Price request submission shows success toast
- [ ] Price Requests page displays all submitted requests
- [ ] Status filter works (All/Pending/Approved/Rejected)
- [ ] Search by product name works
- [ ] Pagination works correctly
- [ ] Notifications page displays real-time notifications
- [ ] Mark as read / Mark all as read works
- [ ] Clear all notifications works
- [ ] Real-time Socket.IO updates work
- [ ] Responsive design works on mobile

### Backend (To Implement)
- [ ] Co-admin routes require authentication
- [ ] Co-admin routes check role permissions
- [ ] GET /co-admin/price-requests returns only user's requests
- [ ] POST /co-admin/price-requests creates new request
- [ ] POST /co-admin/price-requests emits Socket.IO event
- [ ] PUT /admin/price-requests/:id updates request status
- [ ] PUT /admin/price-requests/:id emits Socket.IO event
- [ ] Price approval updates product price in database
- [ ] Socket.IO rooms work correctly (admins, co-admins)
- [ ] Socket.IO authentication middleware works

### Integration
- [ ] Co-admin submits request → Admin receives notification
- [ ] Admin approves request → Co-admin sees update
- [ ] Admin rejects request → Co-admin sees update
- [ ] Product price updates after approval
- [ ] Real-time notifications appear immediately
- [ ] Multiple co-admins can work simultaneously
- [ ] Admin can see all co-admin requests

---

## Security Considerations

1. **Role-Based Access Control**
   - ProtectedRoute enforces coAdminOnly
   - Backend middleware checks user role
   - Socket.IO rooms prevent cross-role eavesdropping

2. **Input Validation**
   - Price values validated (positive numbers)
   - Reason field required (min length)
   - Product ID validated before requests

3. **Authorization**
   - Co-admins can only view their own requests
   - Co-admins cannot approve their own requests
   - Only admins can approve/reject requests

4. **Socket.IO Security**
   - JWT authentication on connection
   - Role verification before room subscription
   - Event emission restricted by role

---

## Performance Optimizations

1. **Lazy Loading**
   - All co-admin pages loaded on demand
   - Components split by route

2. **Pagination**
   - 10 items per page standard
   - Reduces initial load time

3. **LocalStorage Caching**
   - Notifications stored locally
   - Reduces API calls

4. **Socket.IO Rooms**
   - Targeted event emission
   - Reduces unnecessary network traffic

5. **Debouncing**
   - Search inputs debounced (300ms)
   - Prevents excessive API calls

---

## Future Enhancements

1. **Bulk Price Changes**
   - Request price changes for multiple products
   - CSV upload for bulk requests

2. **Price History**
   - View historical price changes
   - Track price trends

3. **Request Templates**
   - Save common request reasons
   - Quick-fill forms

4. **Approval Workflow**
   - Multi-level approvals
   - Auto-approval for small changes

5. **Analytics Dashboard**
   - Approval rate statistics
   - Average response time
   - Top requested products

6. **Email Notifications**
   - Email alerts for request status
   - Daily digest of pending requests

7. **Mobile App**
   - Native mobile app for co-admins
   - Push notifications

---

## Troubleshooting

### Socket.IO Not Connecting
1. Check token in localStorage
2. Verify SOCKET_URL in useSocket.js
3. Check backend CORS settings
4. Verify JWT authentication middleware

### Real-Time Updates Not Working
1. Check Socket.IO connection status
2. Verify event names match frontend/backend
3. Check room subscription (subscribe:co-admin)
4. Inspect browser console for errors

### Price Requests Not Appearing
1. Verify API endpoint returns data
2. Check axios Authorization header
3. Verify user role is 'co-admin'
4. Check backend route permissions

### Notifications Not Persisting
1. Check localStorage quota
2. Verify JSON serialization
3. Clear localStorage and retry
4. Check browser privacy settings

---

## Support and Documentation

For additional help:
- Backend API documentation: See server README
- Socket.IO setup: See `websocket.js`
- Component props: See JSDoc comments in files
- Styling guide: See `tailwind.config.js`

---

**Last Updated:** 2024
**Version:** 1.0.0
**Author:** ZIPPYYY Development Team
