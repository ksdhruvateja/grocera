# Frontend WebSocket Integration Guide - Admin & Co-Admin Dashboards

Complete guide for integrating real-time Socket.IO notifications into admin and co-admin dashboard components.

---

## Prerequisites

Install Socket.IO client library:

```bash
# For React/Next.js projects
npm install socket.io-client

# For Vue projects
npm install socket.io-client

# For vanilla JavaScript
# Use CDN or install via npm
```

---

## 🔌 1. Socket.IO Connection Setup

### React Hook (Recommended)

**Create `hooks/useSocket.js`:**

```javascript
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useSocket = (token, role) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!token || !role) {
      console.warn('Socket connection requires token and role');
      return;
    }

    // Initialize Socket.IO connection
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      transports: ['websocket', 'polling']
    });

    // Connection successful
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      // Subscribe to role-specific room
      if (role === 'admin') {
        socketInstance.emit('subscribe:admin');
        console.log('📡 Subscribed to admin room');
      } else if (role === 'co-admin') {
        socketInstance.emit('subscribe:co-admin');
        console.log('📡 Subscribed to co-admin room');
      }
    });

    // Connection error
    socketInstance.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setError(`Connection failed: ${err.message}`);
      setConnected(false);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        socketInstance.close();
      }
    });

    // Disconnection
    socketInstance.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected:', reason);
      setConnected(false);

      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, manually reconnect
        socketInstance.connect();
      }
      // Otherwise, socket will auto-reconnect
    });

    // Reconnection attempt
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`);
    });

    // Reconnection successful
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setError(null);
    });

    // Reconnection failed
    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after max attempts');
      setError('Failed to reconnect. Please refresh the page.');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketInstance.off('connect');
      socketInstance.off('connect_error');
      socketInstance.off('disconnect');
      socketInstance.off('reconnect_attempt');
      socketInstance.off('reconnect');
      socketInstance.off('reconnect_failed');
      socketInstance.close();
    };
  }, [token, role]);

  return { socket, connected, error };
};
```

---

## 👑 2. Admin Dashboard Integration

### React Component

**`components/AdminDashboard.jsx`:**

```javascript
import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  
  // Get token and role from your auth context/store
  const token = localStorage.getItem('token'); // or useAuth()
  const role = 'admin';
  
  const { socket, connected, error } = useSocket(token, role);

  useEffect(() => {
    if (!socket) return;

    // Listen for new order notifications
    const handleOrderCreated = (data) => {
      console.log('📦 New order received:', data);
      
      // Add to orders list
      setOrders((prevOrders) => [data.order, ...prevOrders]);
      
      // Show notification
      const notification = {
        id: Date.now(),
        message: `New order: ${data.order.orderNumber}`,
        amount: data.order.totalAmount,
        timestamp: new Date()
      };
      
      setNotifications((prev) => [notification, ...prev]);
      setShowNotification(true);
      
      // Play notification sound (optional)
      playNotificationSound();
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setShowNotification(false), 5000);
    };

    // Subscribe to orderCreated event
    socket.on('orderCreated', handleOrderCreated);

    // Cleanup listener on unmount
    return () => {
      socket.off('orderCreated', handleOrderCreated);
    };
  }, [socket]);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="admin-dashboard">
      <header>
        <h1>Admin Dashboard</h1>
        <div className="connection-status">
          {connected ? (
            <span className="status-connected">🟢 Connected</span>
          ) : (
            <span className="status-disconnected">🔴 Disconnected</span>
          )}
        </div>
      </header>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {/* Real-time notification toast */}
      {showNotification && notifications.length > 0 && (
        <div className="notification-toast">
          <div className="notification-content">
            <span className="notification-icon">🔔</span>
            <div>
              <strong>{notifications[0].message}</strong>
              <p>Amount: ${notifications[0].amount.toFixed(2)}</p>
            </div>
            <button onClick={() => setShowNotification(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Notifications list */}
      <section className="notifications-section">
        <h2>Recent Notifications ({notifications.length})</h2>
        <div className="notifications-list">
          {notifications.map(notif => (
            <div key={notif.id} className="notification-item">
              <p>{notif.message}</p>
              <small>{notif.timestamp.toLocaleTimeString()}</small>
              <button onClick={() => dismissNotification(notif.id)}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Orders list */}
      <section className="orders-section">
        <h2>Orders ({orders.length})</h2>
        <div className="orders-list">
          {orders.map(order => (
            <div key={order._id} className="order-card">
              <h3>{order.orderNumber}</h3>
              <p>Total: ${order.totalAmount.toFixed(2)}</p>
              <p>Status: {order.status}</p>
              <p>Items: {order.items?.length || 0}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
```

### CSS for Admin Dashboard

```css
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.connection-status {
  display: inline-block;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
}

.status-connected {
  background: #d4edda;
  color: #155724;
}

.status-disconnected {
  background: #f8d7da;
  color: #721c24;
}

.notification-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-left: 4px solid #28a745;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 15px;
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

.notification-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.notification-icon {
  font-size: 24px;
}

.alert-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.orders-section, .notifications-section {
  margin-top: 30px;
}

.order-card {
  background: #f8f9fa;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}
```

---

## 🤝 3. Co-Admin Dashboard Integration

### React Component

**`components/CoAdminDashboard.jsx`:**

```javascript
import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

const CoAdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const token = localStorage.getItem('token');
  const role = 'co-admin';
  
  const { socket, connected, error } = useSocket(token, role);

  useEffect(() => {
    if (!socket) return;

    // Handle new order notifications for co-admin
    const handleOrderCreated = (data) => {
      console.log('📦 Co-Admin: New order received:', data);
      
      setOrders((prevOrders) => [data.order, ...prevOrders]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification (if permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order', {
          body: `Order ${data.order.orderNumber} - $${data.order.totalAmount.toFixed(2)}`,
          icon: '/logo.png',
          badge: '/badge.png'
        });
      }
    };

    socket.on('orderCreated', handleOrderCreated);

    return () => {
      socket.off('orderCreated', handleOrderCreated);
    };
  }, [socket]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="coadmin-dashboard">
      <header>
        <h1>Co-Admin Dashboard</h1>
        <div className="header-controls">
          <div className="connection-badge">
            {connected ? '🟢 Live' : '🔴 Offline'}
          </div>
          {unreadCount > 0 && (
            <div className="unread-badge" onClick={markAsRead}>
              {unreadCount} new
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          Connection Error: {error}
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      <section className="orders-container">
        <h2>Orders Dashboard</h2>
        {orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders yet. Waiting for new orders...</p>
            {connected && <span className="pulse">●</span>}
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map(order => (
              <div key={order._id} className="order-item">
                <div className="order-header">
                  <h3>{order.orderNumber}</h3>
                  <span className={`status status-${order.status}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-details">
                  <p><strong>Total:</strong> ${order.totalAmount.toFixed(2)}</p>
                  <p><strong>Items:</strong> {order.items?.length || 0}</p>
                  <p><strong>Payment:</strong> {order.paymentMethod}</p>
                </div>
                <div className="order-actions">
                  <button className="btn-view">View Details</button>
                  <button className="btn-process">Process</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CoAdminDashboard;
```

---

## 🎨 4. Vue.js Integration

### Vue 3 Composition API

**`components/AdminDashboard.vue`:**

```vue
<template>
  <div class="admin-dashboard">
    <header>
      <h1>Admin Dashboard</h1>
      <div class="status-indicator" :class="{ connected: isConnected }">
        {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
      </div>
    </header>

    <div v-if="connectionError" class="error-alert">
      {{ connectionError }}
    </div>

    <div v-if="latestNotification" class="notification-popup">
      <div class="popup-content">
        <span class="icon">🔔</span>
        <div>
          <strong>{{ latestNotification.message }}</strong>
          <p>Total: ${{ latestNotification.amount }}</p>
        </div>
        <button @click="dismissNotification">✕</button>
      </div>
    </div>

    <section class="orders-section">
      <h2>Orders ({{ orders.length }})</h2>
      <div class="orders-list">
        <div v-for="order in orders" :key="order._id" class="order-card">
          <h3>{{ order.orderNumber }}</h3>
          <p>Total: ${{ order.totalAmount.toFixed(2) }}</p>
          <p>Status: {{ order.status }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import io from 'socket.io-client';

const props = defineProps({
  token: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'admin'
  }
});

const socket = ref(null);
const isConnected = ref(false);
const connectionError = ref(null);
const orders = ref([]);
const latestNotification = ref(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

onMounted(() => {
  // Initialize Socket.IO connection
  socket.value = io(SOCKET_URL, {
    auth: {
      token: props.token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  // Connection handlers
  socket.value.on('connect', () => {
    console.log('✅ Socket connected');
    isConnected.value = true;
    connectionError.value = null;

    // Subscribe to admin room
    if (props.role === 'admin') {
      socket.value.emit('subscribe:admin');
    } else if (props.role === 'co-admin') {
      socket.value.emit('subscribe:co-admin');
    }
  });

  socket.value.on('connect_error', (err) => {
    console.error('❌ Connection error:', err);
    connectionError.value = `Connection failed: ${err.message}`;
    isConnected.value = false;
  });

  socket.value.on('disconnect', (reason) => {
    console.warn('🔌 Disconnected:', reason);
    isConnected.value = false;
  });

  // Order created event
  socket.value.on('orderCreated', (data) => {
    console.log('📦 New order:', data);
    
    orders.value.unshift(data.order);
    
    latestNotification.value = {
      message: `New order: ${data.order.orderNumber}`,
      amount: data.order.totalAmount
    };
    
    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      latestNotification.value = null;
    }, 5000);
  });
});

onUnmounted(() => {
  if (socket.value) {
    console.log('🧹 Cleaning up socket');
    socket.value.off('connect');
    socket.value.off('connect_error');
    socket.value.off('disconnect');
    socket.value.off('orderCreated');
    socket.value.close();
  }
});

const dismissNotification = () => {
  latestNotification.value = null;
};
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
}

.status-indicator {
  padding: 8px 16px;
  border-radius: 20px;
  background: #f8d7da;
  color: #721c24;
}

.status-indicator.connected {
  background: #d4edda;
  color: #155724;
}

.notification-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  animation: slideIn 0.3s;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.orders-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.order-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}
</style>
```

---

## 📱 5. Vanilla JavaScript Integration

### Plain HTML/JS Implementation

**`admin-dashboard.html`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
    }
    .connected { background: #d4edda; color: #155724; }
    .disconnected { background: #f8d7da; color: #721c24; }
    .notification-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-left: 4px solid #28a745;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 15px;
      border-radius: 8px;
      display: none;
      z-index: 1000;
    }
    .notification-toast.show { display: block; }
    #ordersList {
      margin-top: 30px;
    }
    .order-item {
      background: #f8f9fa;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Admin Dashboard</h1>
    <span id="statusBadge" class="status-badge disconnected">🔴 Disconnected</span>
  </header>

  <div id="notificationToast" class="notification-toast">
    <strong id="notifMessage"></strong>
    <p id="notifDetails"></p>
  </div>

  <section id="ordersSection">
    <h2>Orders (<span id="orderCount">0</span>)</h2>
    <div id="ordersList"></div>
  </section>

  <script>
    // Get token from localStorage or your auth system
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); // 'admin' or 'co-admin'
    
    if (!token) {
      alert('Please login first');
      window.location.href = '/login.html';
    }

    // Socket.IO connection
    const socket = io('http://localhost:5000', {
      auth: { token: token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    const statusBadge = document.getElementById('statusBadge');
    const notificationToast = document.getElementById('notificationToast');
    const notifMessage = document.getElementById('notifMessage');
    const notifDetails = document.getElementById('notifDetails');
    const ordersList = document.getElementById('ordersList');
    const orderCount = document.getElementById('orderCount');

    let orders = [];

    // Connection established
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      statusBadge.textContent = '🟢 Connected';
      statusBadge.className = 'status-badge connected';

      // Subscribe to role-specific room
      if (role === 'admin') {
        socket.emit('subscribe:admin');
        console.log('📡 Subscribed to admin room');
      } else if (role === 'co-admin') {
        socket.emit('subscribe:co-admin');
        console.log('📡 Subscribed to co-admin room');
      }
    });

    // Connection error
    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      statusBadge.textContent = '🔴 Connection Error';
      statusBadge.className = 'status-badge disconnected';
    });

    // Disconnected
    socket.on('disconnect', (reason) => {
      console.warn('🔌 Disconnected:', reason);
      statusBadge.textContent = '🔴 Disconnected';
      statusBadge.className = 'status-badge disconnected';
    });

    // Reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    // Order created event
    socket.on('orderCreated', (data) => {
      console.log('📦 New order received:', data);
      
      // Add to orders array
      orders.unshift(data.order);
      
      // Update UI
      renderOrders();
      
      // Show notification
      showNotification(
        `New order: ${data.order.orderNumber}`,
        `Total: $${data.order.totalAmount.toFixed(2)}`
      );
      
      // Play sound (optional)
      playNotificationSound();
    });

    // Render orders list
    function renderOrders() {
      orderCount.textContent = orders.length;
      
      ordersList.innerHTML = orders.map(order => `
        <div class="order-item">
          <h3>${order.orderNumber}</h3>
          <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Items:</strong> ${order.items?.length || 0}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod}</p>
        </div>
      `).join('');
    }

    // Show notification toast
    function showNotification(message, details) {
      notifMessage.textContent = message;
      notifDetails.textContent = details;
      notificationToast.classList.add('show');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        notificationToast.classList.remove('show');
      }, 5000);
    }

    // Play notification sound
    function playNotificationSound() {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(err => console.log('Audio play failed:', err));
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      socket.close();
    });
  </script>
</body>
</html>
```

---

## 🔧 6. Advanced Features

### Reconnection Strategy with Exponential Backoff

```javascript
import io from 'socket.io-client';

class SocketManager {
  constructor(url, token, role) {
    this.url = url;
    this.token = token;
    this.role = role;
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  connect() {
    this.socket = io(this.url, {
      auth: { token: this.token },
      reconnection: false // Manual reconnection
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Subscribe to room
      if (this.role === 'admin') {
        this.socket.emit('subscribe:admin');
      } else if (this.role === 'co-admin') {
        this.socket.emit('subscribe:co-admin');
      }

      // Re-attach listeners
      this.reattachListeners();
    });

    this.socket.on('disconnect', () => {
      console.warn('🔌 Disconnected');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err);
      this.handleReconnect();
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.socket.connect();
    }, delay);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  reattachListeners() {
    for (const [event, callbacks] of this.listeners.entries()) {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Usage
const socketManager = new SocketManager(
  'http://localhost:5000',
  localStorage.getItem('token'),
  'admin'
);

socketManager.connect();

socketManager.on('orderCreated', (data) => {
  console.log('New order:', data);
});
```

---

## 🧪 7. Testing WebSocket Connection

### Test Script

```javascript
// test-socket.js
const io = require('socket.io-client');

const token = 'YOUR_JWT_TOKEN'; // Replace with actual token
const role = 'admin'; // or 'co-admin'

const socket = io('http://localhost:5000', {
  auth: { token: token }
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  if (role === 'admin') {
    socket.emit('subscribe:admin');
    console.log('📡 Subscribed to admin room');
  } else {
    socket.emit('subscribe:co-admin');
    console.log('📡 Subscribed to co-admin room');
  }
});

socket.on('orderCreated', (data) => {
  console.log('📦 Order received:', data);
});

socket.on('connect_error', (err) => {
  console.error('❌ Error:', err.message);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected');
});

// Keep script running
process.on('SIGINT', () => {
  socket.close();
  process.exit();
});
```

Run the test:
```bash
node test-socket.js
```

---

## 📋 8. Checklist for Integration

- [ ] Install `socket.io-client` in frontend project
- [ ] Create reusable socket hook/service
- [ ] Implement connection status indicator in UI
- [ ] Add error handling and reconnection logic
- [ ] Subscribe to appropriate room (admin/co-admin) on connect
- [ ] Listen for `orderCreated` event
- [ ] Update UI state when order is received
- [ ] Implement notification toast/popup
- [ ] Add browser notification support (optional)
- [ ] Play notification sound (optional)
- [ ] Clean up listeners on component unmount
- [ ] Test connection, disconnection, and reconnection
- [ ] Test with actual order creation from customer
- [ ] Handle edge cases (token expiry, network issues)
- [ ] Add loading states and user feedback

---

## 🚨 9. Troubleshooting

### Issue: Socket not connecting

**Solution:**
```javascript
// Check token validity
console.log('Token:', localStorage.getItem('token'));

// Verify CORS settings on backend
// Check server.js has correct CORS origin

// Test with basic connection first
const socket = io('http://localhost:5000', {
  transports: ['polling', 'websocket'] // Try polling first
});
```

### Issue: Not receiving orderCreated events

**Solution:**
```javascript
// Verify subscription
socket.on('connect', () => {
  console.log('Emitting subscribe:admin');
  socket.emit('subscribe:admin');
  
  // Confirm subscription (add this to backend)
  socket.emit('test-event', { message: 'Test from client' });
});

// Check backend room emission
// In orderController.js, ensure:
// io.to('admin-room').emit('orderCreated', { order });
```

### Issue: Multiple connections created

**Solution:**
```javascript
// Use singleton pattern
let socketInstance = null;

export const getSocket = (token, role) => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      auth: { token }
    });
  }
  return socketInstance;
};

// In component
const socket = getSocket(token, role);
```

---

## 🔐 10. Security Best Practices

1. **Always validate JWT token on backend** before allowing socket connection
2. **Use HTTPS/WSS in production** for encrypted WebSocket connection
3. **Implement rate limiting** on socket events
4. **Sanitize data** before displaying in UI
5. **Handle token expiry** - reconnect with new token
6. **Validate user role** before subscribing to rooms

### Token Refresh on Expiry

```javascript
socket.on('connect_error', (err) => {
  if (err.message === 'jwt expired') {
    // Refresh token
    refreshToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

---

## 🎯 Summary

**Admin Dashboard:**
- Connects with JWT authentication
- Subscribes to `admin-room`
- Receives all `orderCreated` events
- Full order management access

**Co-Admin Dashboard:**
- Connects with JWT authentication  
- Subscribes to `co-admin-room`
- Receives all `orderCreated` events
- Limited to order viewing and processing

**Key Features:**
- Real-time order notifications
- Automatic reconnection with exponential backoff
- Clean listener management with useEffect cleanup
- Error handling and connection status indicators
- Browser notifications and sound alerts
- Production-ready with security best practices

---

**Happy coding! 🚀**

For issues or questions, refer to:
- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)
- [React Hooks Best Practices](https://react.dev/learn/synchronizing-with-effects)
