const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Load environment variables first
dotenv.config();

const app = express();

// Security Middleware
app.use(helmet()); // Set security HTTP headers

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Basic middleware
// CORS must be first to handle preflight requests
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.options('*', cors()); // Enable pre-flight for all routes

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rbs-grocery';

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}:${conn.connection.port}`);

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Suggestion: Install MongoDB locally or use MongoDB Atlas (cloud)');
      console.log('📚 MongoDB Installation: https://docs.mongodb.com/manual/installation/');
      console.log('☁️ MongoDB Atlas (Free): https://www.mongodb.com/cloud/atlas');
    }

    // Don't exit in development mode - let the server run without DB for API testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Running in development mode without database connection');
      console.log('🔧 Some features may not work until MongoDB is connected');
      return null;
    }

    process.exit(1);
  }
};

// Connect to database (skip if no MongoDB URI provided)
if (process.env.MONGODB_URI) {
  connectDB();
} else {
  console.log('⚠️ No MONGODB_URI provided - running with sample data');
  console.log('💡 To use real database, set MONGODB_URI in .env file');
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/payments', require('./routes/payments'));

// Fallback route for testing when DB is not connected
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      products: '/api/products',
      auth: '/api/auth',
      cart: '/api/cart',
      orders: '/api/orders'
    }
  });
});

// Sample products endpoint for testing without DB
app.get('/api/products/test', (req, res) => {
  const sampleProducts = [
    {
      id: '1',
      name: 'Fresh Apples',
      price: 2.99,
      category: 'Fruits',
      image: '/images/apples.jpg',
      inStock: true,
      stockQuantity: 50
    },
    {
      id: '2',
      name: 'Organic Bananas',
      price: 1.99,
      category: 'Fruits',
      image: '/images/bananas.jpg',
      inStock: true,
      stockQuantity: 30
    },
    {
      id: '3',
      name: 'Fresh Milk',
      price: 3.49,
      category: 'Daily Essentials',
      image: '/images/milk.jpg',
      inStock: true,
      stockQuantity: 25
    }
  ];

  res.json({
    success: true,
    data: {
      products: sampleProducts,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: sampleProducts.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  });
});

// Admin routes (if they exist)
try {
  app.use('/api/admin', require('./routes/admin'));
} catch (error) {
  console.log('ℹ️ Admin routes not found, skipping...');
}

// Co-Admin routes
try {
  app.use('/api/co-admin', require('./routes/co-admin'));
} catch (error) {
  console.log('ℹ️ Co-admin routes not found, skipping...');
}

// Health check route
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    message: 'RB\'s Grocery Backend is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  };

  console.log('🏥 Health check requested');
  res.json(healthData);
});

// API documentation route
app.get('/api/docs', (req, res) => {
  const apiDocs = {
    title: 'RB\'s Grocery Shopping API',
    version: '1.0.0',
    description: 'API documentation for the grocery shopping application',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'POST /api/auth/refresh': 'Refresh JWT token',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile'
      },
      products: {
        'GET /api/products': 'Get products with filtering',
        'GET /api/products/:id': 'Get single product',
        'GET /api/products/categories': 'Get product categories',
        'GET /api/products/search': 'Search products',
        'POST /api/products': 'Create product (Admin)',
        'PUT /api/products/:id': 'Update product (Admin)',
        'DELETE /api/products/:id': 'Delete product (Admin)'
      },
      cart: {
        'GET /api/cart': 'Get user cart',
        'POST /api/cart/add': 'Add item to cart',
        'PUT /api/cart/update': 'Update cart item',
        'DELETE /api/cart/remove': 'Remove cart item',
        'DELETE /api/cart/clear': 'Clear cart',
        'GET /api/cart/summary': 'Get cart summary for checkout'
      },
      orders: {
        'GET /api/orders': 'Get user order history',
        'POST /api/orders': 'Create new order',
        'GET /api/orders/:id': 'Get order details',
        'POST /api/orders/:id/cancel': 'Cancel order',
        'GET /api/orders/summary': 'Get order summary'
      }
    }
  };

  res.json(apiDocs);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Application error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
} else {
  // Development mode message
  app.get('/', (req, res) => {
    res.json({
      message: 'RB\'s Grocery API - Development Mode',
      documentation: '/api/docs',
      health: '/api/health',
      frontend: 'Run frontend separately on port 3000'
    });
  });
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');

  try {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});

// Initialize WebSocket for real-time updates
try {
  const { initializeWebSocket } = require('./config/websocket');
  initializeWebSocket(server);
} catch (error) {
  console.log('ℹ️ WebSocket initialization skipped');
}

// Initialize Redis cache
try {
  require('./config/redis');
} catch (error) {
  console.log('ℹ️ Redis initialization skipped');
}

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app;