# Socket.IO Frontend Integration Guide - Quick Start

Ready-to-copy code snippets for admin and co-admin dashboards.

---

## 📦 Installation

```bash
npm install socket.io-client
```

---

## ⚡ Quick Start - React Hook (Recommended)

### Custom Hook: `useSocket.js`

```javascript
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = (role) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('token');
    if (!token || !role) return;

    // Connect to Socket.IO server
    const socketInstance = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socketInstance;

    // Connection established
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);

      // Subscribe to role-specific room
      if (role === 'admin') {
        socketInstance.emit('subscribe:admin');
      } else if (role === 'co-admin') {
        socketInstance.emit('subscribe:co-admin');
      }
    });

    // Listen for order notifications
    socketInstance.on('orderCreated', (data) => {
      console.log('📦 New order:', data);
      setNotifications(prev => [...prev, data.order]);
    });

    // Handle disconnection
    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    // Handle errors
    socketInstance.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('orderCreated');
        socketRef.current.close();
      }
    };
  }, [role]);

  return { socket, connected, notifications };
};
```

---

## 👑 Admin Dashboard Component

```javascript
import React from 'react';
import { useSocket } from './hooks/useSocket';

const AdminDashboard = () => {
  const { connected, notifications } = useSocket('admin');

  return (
    <div className="dashboard">
      <header>
        <h1>Admin Dashboard</h1>
        <span className={connected ? 'status-online' : 'status-offline'}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </header>

      <section className="notifications">
        <h2>Order Notifications ({notifications.length})</h2>
        {notifications.map((order, index) => (
          <div key={index} className="notification-card">
            <h3>{order.orderNumber}</h3>
            <p>Amount: ${order.totalAmount?.toFixed(2)}</p>
            <p>Status: {order.status}</p>
            <small>{new Date(order.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminDashboard;
```

---

## 🤝 Co-Admin Dashboard Component

```javascript
import React from 'react';
import { useSocket } from './hooks/useSocket';

const CoAdminDashboard = () => {
  const { connected, notifications } = useSocket('co-admin');

  return (
    <div className="dashboard">
      <header>
        <h1>Co-Admin Dashboard</h1>
        <span className={connected ? 'status-online' : 'status-offline'}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </header>

      <section className="notifications">
        <h2>New Orders ({notifications.length})</h2>
        {notifications.map((order, index) => (
          <div key={index} className="notification-card">
            <h3>{order.orderNumber}</h3>
            <p>Amount: ${order.totalAmount?.toFixed(2)}</p>
            <p>Items: {order.items?.length || 0}</p>
            <small>{new Date(order.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </section>
    </div>
  );
};

export default CoAdminDashboard;
```

---

## 🎨 Vue 3 Composition API

### `useSocket.js`

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export function useSocket(role) {
  const socket = ref(null);
  const connected = ref(false);
  const notifications = ref([]);

  onMounted(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to Socket.IO
    socket.value = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Connection established
    socket.value.on('connect', () => {
      console.log('✅ Socket connected');
      connected.value = true;

      // Subscribe to room
      if (role === 'admin') {
        socket.value.emit('subscribe:admin');
      } else if (role === 'co-admin') {
        socket.value.emit('subscribe:co-admin');
      }
    });

    // Listen for orders
    socket.value.on('orderCreated', (data) => {
      console.log('📦 New order:', data);
      notifications.value.push(data.order);
    });

    // Handle disconnect
    socket.value.on('disconnect', () => {
      console.log('🔌 Disconnected');
      connected.value = false;
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.off('connect');
      socket.value.off('disconnect');
      socket.value.off('orderCreated');
      socket.value.close();
    }
  });

  return { socket, connected, notifications };
}
```

### Vue Component

```vue
<template>
  <div class="dashboard">
    <header>
      <h1>Admin Dashboard</h1>
      <span :class="connected ? 'online' : 'offline'">
        {{ connected ? '🟢 Live' : '🔴 Offline' }}
      </span>
    </header>

    <section>
      <h2>Order Notifications ({{ notifications.length }})</h2>
      <div v-for="(order, index) in notifications" :key="index" class="card">
        <h3>{{ order.orderNumber }}</h3>
        <p>Amount: ${{ order.totalAmount?.toFixed(2) }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useSocket } from './composables/useSocket';

const { connected, notifications } = useSocket('admin');
</script>
```

---

## 📱 Vanilla JavaScript

```javascript
// Import Socket.IO client
import io from 'socket.io-client';

// Get token from localStorage
const token = localStorage.getItem('token');
const role = localStorage.getItem('role'); // 'admin' or 'co-admin'

// Connect to Socket.IO server
const socket = io('/', {
  auth: { token: token },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Connection established
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Subscribe to role-specific room
  if (role === 'admin') {
    socket.emit('subscribe:admin');
  } else if (role === 'co-admin') {
    socket.emit('subscribe:co-admin');
  }
});

// Listen for new orders
socket.on('orderCreated', (data) => {
  console.log('📦 New order:', data);
  updateOrders(data.order);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('🔌 Disconnected');
  updateConnectionStatus(false);
});

// Handle errors
socket.on('connect_error', (err) => {
  console.error('❌ Error:', err.message);
  updateConnectionStatus(false);
});

// Update UI with new order
function updateOrders(order) {
  const container = document.getElementById('orders-list');
  const orderCard = document.createElement('div');
  orderCard.className = 'order-card';
  orderCard.innerHTML = `
    <h3>${order.orderNumber}</h3>
    <p>Total: $${order.totalAmount.toFixed(2)}</p>
    <p>Status: ${order.status}</p>
  `;
  container.prepend(orderCard);
}

// Update connection status
function updateConnectionStatus(isConnected) {
  const badge = document.getElementById('status-badge');
  badge.textContent = isConnected ? '🟢 Live' : '🔴 Offline';
  badge.className = isConnected ? 'status-online' : 'status-offline';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  socket.close();
});
```

---

## 🔄 Advanced: Reconnection Logic

```javascript
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useSocketWithReconnect = (role) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxAttempts = 5;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketInstance = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: maxAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected');
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      if (role === 'admin') {
        socketInstance.emit('subscribe:admin');
      } else if (role === 'co-admin') {
        socketInstance.emit('subscribe:co-admin');
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      setConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, manually reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setError(err.message);
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxAttempts) {
        setError('Max reconnection attempts reached. Please refresh.');
      }
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${maxAttempts}`);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setError(null);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('reconnect_attempt');
      socketInstance.off('reconnect');
      socketInstance.close();
    };
  }, [role]);

  return { socket, connected, error };
};
```

---

## 🎯 Usage Examples

### Admin Dashboard with Toast Notifications

```javascript
import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';

const AdminDashboard = () => {
  const { socket, connected, notifications } = useSocket('admin');
  const [showToast, setShowToast] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      setLatestOrder(latest);
      setShowToast(true);
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => setShowToast(false), 5000);
      
      // Play notification sound
      new Audio('/notification.mp3').play().catch(() => {});
    }
  }, [notifications]);

  return (
    <div className="dashboard">
      <header>
        <h1>Admin Dashboard</h1>
        <span className={connected ? 'badge-online' : 'badge-offline'}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </header>

      {showToast && latestOrder && (
        <div className="toast">
          <strong>🔔 New Order!</strong>
          <p>{latestOrder.orderNumber}</p>
          <p>${latestOrder.totalAmount?.toFixed(2)}</p>
          <button onClick={() => setShowToast(false)}>✕</button>
        </div>
      )}

      <section className="orders">
        <h2>Recent Orders ({notifications.length})</h2>
        {notifications.map((order, idx) => (
          <div key={idx} className="order-card">
            <h3>{order.orderNumber}</h3>
            <p>Total: ${order.totalAmount?.toFixed(2)}</p>
            <p>Status: {order.status}</p>
            <p>Items: {order.items?.length || 0}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminDashboard;
```

---

## 🎨 CSS Styling

```css
/* Connection Status Badge */
.badge-online {
  background: #d4edda;
  color: #155724;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
}

.badge-offline {
  background: #f8d7da;
  color: #721c24;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
}

/* Toast Notification */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-left: 4px solid #28a745;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 15px 20px;
  border-radius: 8px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Order Card */
.order-card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}

.order-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.order-card p {
  margin: 5px 0;
  color: #666;
}
```

---

## 🔧 Environment Configuration

### Development
```javascript
// In your React app
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  auth: { token: localStorage.getItem('token') }
});
```

### Production
```javascript
// Use relative path (same domain)
const socket = io('/', {
  auth: { token: localStorage.getItem('token') }
});

// Or absolute URL
const socket = io('https://api.yourdomain.com', {
  auth: { token: localStorage.getItem('token') }
});
```

---

## ✅ Quick Integration Checklist

- [ ] Install socket.io-client: `npm install socket.io-client`
- [ ] Copy `useSocket.js` hook to your project
- [ ] Get JWT token from localStorage
- [ ] Connect to Socket.IO server with `io('/', {auth: {token}})`
- [ ] Subscribe to room: `socket.emit('subscribe:admin')` or `subscribe:co-admin`
- [ ] Listen for events: `socket.on('orderCreated', (data) => {...})`
- [ ] Add useEffect cleanup to disconnect on unmount
- [ ] Update UI when orders are received
- [ ] Add connection status indicator
- [ ] Test with order creation from customer

---

## 🧪 Testing

### Test Order Creation

```javascript
// In browser console or test file
const token = localStorage.getItem('token');

fetch('/api/orders/create-direct', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    items: [{ product: 'PRODUCT_ID', quantity: 1, price: 10 }],
    totalAmount: 10,
    paymentMethod: 'stripe'
  })
})
.then(res => res.json())
.then(data => console.log('Order created:', data));

// Should trigger orderCreated event in admin/co-admin dashboards
```

---

## 📝 Summary

**Quick Setup (3 steps):**

1. **Install:** `npm install socket.io-client`

2. **Copy hook:** Use `useSocket.js` from above

3. **Use in component:**
```javascript
const { connected, notifications } = useSocket('admin');
```

**That's it!** Your admin/co-admin dashboard now receives real-time order notifications. 🚀

---

**Full documentation:** See `frontend-socket-guide.md` for advanced features, Vue/vanilla JS examples, and troubleshooting.
