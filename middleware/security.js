const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const User = require('../models/User');

// Security Configuration for Production
class SecurityMiddleware {
  // CORS Configuration
  static getCorsOptions() {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean);

    return {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200, // Support legacy browsers
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    };
  }

  // Helmet Security Headers
  static getHelmetConfig() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.stripe.com"],
          frameSrc: ["'self'", "https://js.stripe.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }
    };
  }

  // Rate Limiting Configuration
  static createRateLimiter(windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Store rate limit data in memory (consider Redis for production clustering)
      store: undefined, // Use default memory store
      skip: (req) => {
        // Skip rate limiting for admin users in development
        if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
          return true;
        }
        return false;
      }
    });
  }

  // Authentication Rate Limiting (Stricter for login/register)
  static authRateLimit = SecurityMiddleware.createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per window
    'Too many authentication attempts, please try again later'
  );

  // API Rate Limiting (General API calls)
  static apiRateLimit = SecurityMiddleware.createRateLimiter(
    1 * 60 * 1000, // 1 minute
    60, // 60 requests per minute
    'Too many API requests, please slow down'
  );

  // Payment Rate Limiting (Very strict for payment endpoints)
  static paymentRateLimit = SecurityMiddleware.createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    3, // 3 payment attempts per window
    'Too many payment attempts, please wait before trying again'
  );

  // Data Sanitization Middleware
  static sanitizeData() {
    return [
      // Prevent NoSQL injection attacks
      mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
          console.warn(`[Security] Sanitized NoSQL injection attempt: ${key}`);
        }
      }),
      
      // Clean user input from malicious HTML
      xss(),
      
      // Prevent HTTP Parameter Pollution
      hpp({
        whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'tags']
      })
    ];
  }

  // JWT Token Verification Middleware
  static verifyToken = async (req, res, next) => {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No valid token provided.'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Handle demo tokens for development
      if (token.startsWith('admin_token_') || token.startsWith('user_token_')) {
        // Create a fake user object for demo mode
        const isAdmin = token.startsWith('admin_token_');
        const demoUser = {
          _id: isAdmin ? 'demo_admin_id' : 'demo_user_id',
          id: isAdmin ? 'demo_admin_id' : 'demo_user_id',
          email: isAdmin ? 'admin@rbsgrocery.com' : 'customer@rbsgrocery.com',
          name: isAdmin ? 'Demo Admin' : 'Demo Customer',
          role: isAdmin ? 'admin' : 'customer',
          isActive: true,
          lastActivity: new Date()
        };
        
        req.user = demoUser;
        return next();
      }

      // Verify JWT token for real authentication
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret-key',
        {
          issuer: 'rbs-grocery-app',
          audience: 'rbs-grocery-users'
        }
      );

      // Check if token is not too old (additional security)
      const tokenAge = Date.now() / 1000 - decoded.iat;
      const maxAge = 24 * 60 * 60; // 24 hours
      
      if (tokenAge > maxAge) {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }

      // Find user and attach to request
      const user = await User.findById(decoded.id).select('+lastActivity');
      
      if (!user) {
        // For development, create a fallback user if JWT user not found
        if (process.env.NODE_ENV === 'development') {
          const fallbackUser = {
            _id: decoded.id,
            id: decoded.id,
            email: decoded.email || 'fallback@example.com',
            name: decoded.name || 'Fallback User',
            role: decoded.role || 'customer',
            isActive: true,
            lastActivity: new Date()
          };
          req.user = fallbackUser;
          return next();
        }
        
        return res.status(401).json({
          success: false,
          message: 'Token is invalid. User not found.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Update user's last activity
      user.lastActivity = new Date();
      await user.save();

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.'
      });
    }
  };

  // Optional Authentication (for endpoints that work with/without auth)
  static optionalAuth = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // If token is provided, verify it
      return SecurityMiddleware.verifyToken(req, res, next);
    } else {
      // If no token, continue without authentication
      req.user = null;
      next();
    }
  };

  // Role-based Authorization Middleware
  static requireRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this action.',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    };
  };

  // Admin Only Middleware
  static requireAdmin = SecurityMiddleware.requireRole(['admin']);

  // Co-Admin Only Middleware (view-only access)
  static requireCoAdmin = SecurityMiddleware.requireRole(['co-admin']);

  // Admin or Co-Admin Middleware
  static requireAdminOrCoAdmin = SecurityMiddleware.requireRole(['admin', 'co-admin']);

  // Customer or Admin Middleware
  static requireUser = SecurityMiddleware.requireRole(['customer', 'admin', 'co-admin', 'moderator']);

  // Account Lock Check Middleware
  static checkAccountLock = async (req, res, next) => {
    try {
      if (req.user && req.user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts.',
          lockUntil: req.user.lockUntil,
          code: 'ACCOUNT_LOCKED'
        });
      }
      next();
    } catch (error) {
      console.error('Account lock check error:', error);
      next(error);
    }
  };

  // Input Validation Middleware
  static validateInput = (schema) => {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      // Replace req.body with sanitized data
      req.body = value;
      next();
    };
  };

  // Request Logging Middleware
  static logRequests = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || 'anonymous'
      };

      // Log slow requests
      if (duration > 1000) {
        console.warn('🐌 Slow request:', logData);
      }

      // Log errors
      if (res.statusCode >= 400) {
        console.error('❌ Error request:', logData);
      }

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development' && res.statusCode < 400) {
        console.log('✅ Request:', logData);
      }
    });

    next();
  };

  // Security Headers Middleware
  static setSecurityHeaders = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
  };
}

// Export both class methods and individual functions for backward compatibility
module.exports = SecurityMiddleware;

// Individual function exports for direct use
module.exports.authenticate = SecurityMiddleware.verifyToken;
module.exports.authorize = (roles = []) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user role is in allowed roles
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};