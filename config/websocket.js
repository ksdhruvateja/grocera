// WebSocket Configuration for Real-time Updates
// This is optional - the app works with polling, but WebSockets provide better real-time experience

let io = null;
let wsAvailable = false;

// Initialize Socket.io if available
if (process.env.ENABLE_WEBSOCKET !== 'false') {
  try {
    const { Server } = require('socket.io');
    wsAvailable = true;
    console.log('✅ WebSocket support enabled');
  } catch (error) {
    console.warn('⚠️ Socket.io not installed, real-time features will use polling');
    console.warn('💡 Install with: npm install socket.io');
    wsAvailable = false;
  }
}

// Initialize WebSocket server
function initializeWebSocket(server) {
  if (!wsAvailable) {
    console.log('ℹ️ WebSocket disabled, using polling for real-time updates');
    return null;
  }

  try {
    const { Server } = require('socket.io');
    const { authenticate: auth } = require('../middleware/security');
    
    io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['https://your-domain.com']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Socket.io authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify token (simplified - use your actual JWT verification)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`✅ WebSocket client connected: ${socket.userId} (${socket.userRole})`);

      // Join role-based rooms
      if (socket.userRole === 'admin' || socket.userRole === 'co-admin') {
        socket.join('admin-room');
        socket.join('co-admin-room');
      }

      // Handle new order notifications
      socket.on('subscribe:orders', () => {
        socket.join('orders');
        console.log(`📦 Client ${socket.userId} subscribed to orders`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`❌ WebSocket client disconnected: ${socket.userId}`);
      });
    });

    console.log('✅ WebSocket server initialized');
    return io;
  } catch (error) {
    console.error('❌ WebSocket initialization error:', error);
    wsAvailable = false;
    return null;
  }
}

// Emit new order to connected clients
function emitNewOrder(orderData) {
  if (!io || !wsAvailable) return false;

  try {
    // Emit to admin and co-admin rooms
    io.to('admin-room').emit('new-order', orderData);
    io.to('co-admin-room').emit('new-order', orderData);
    io.to('orders').emit('new-order', orderData);
    
    console.log('📢 New order notification sent via WebSocket');
    return true;
  } catch (error) {
    console.error('WebSocket emit error:', error);
    return false;
  }
}

// Emit order status update
function emitOrderStatusUpdate(orderId, status) {
  if (!io || !wsAvailable) return false;

  try {
    io.emit('order-status-update', { orderId, status });
    return true;
  } catch (error) {
    console.error('WebSocket emit error:', error);
    return false;
  }
}

// Emit product update (for real-time sync)
function emitProductUpdate(productData) {
  if (!io || !wsAvailable) return false;

  try {
    // Emit to all connected clients for product sync
    io.emit('product-update', productData);
    console.log('📢 Product update notification sent via WebSocket');
    return true;
  } catch (error) {
    console.error('WebSocket emit error:', error);
    return false;
  }
}

module.exports = {
  initializeWebSocket,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitProductUpdate,
  getIO: () => io,
  isAvailable: () => wsAvailable
};

