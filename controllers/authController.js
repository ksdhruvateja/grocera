const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Cart = require('../models/Cart');

// Production-ready Authentication Controller
class AuthController {
  // User Registration
  static async register(req, res) {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        address,
        preferences = {}
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists.',
          code: 'EMAIL_EXISTS'
        });
      }

      // Validate password strength
      if (!AuthController.validatePasswordStrength(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.',
          code: 'WEAK_PASSWORD'
        });
      }

      // Create new user
      const user = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`, // Backward compatibility
        email: email.toLowerCase().trim(),
        password,
        phone: phone?.trim(),
        address,
        preferences,
        role: 'customer',
        isActive: true,
        isEmailVerified: false, // Email verification required in production
        lastActivity: new Date()
      });

      await user.save();

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken(
        `${req.get('User-Agent')} - ${req.ip}`
      );
      await user.save(); // Save refresh token

      // Create user's cart
      await Cart.findOrCreateCart(user._id);

      // Log registration
      console.log(`✅ New user registered: ${email}`);

      // Response (don't include sensitive data)
      const userResponse = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified
      };

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: userResponse,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists.',
          code: 'EMAIL_EXISTS'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during registration.'
      });
    }
  }

  // User Login
  static async login(req, res) {
    try {
      const { email, password, rememberMe = false, guestCartId } = req.body;

      // Find user with password field
      const user = await User.findByEmailWithPassword(email.toLowerCase());
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts.',
          lockUntil: user.lockUntil,
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Log failed attempt
        await user.incLoginAttempts();
        
        // Log login history
        user.loginHistory.push({
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false
        });
        await user.save();

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Successful login - reset login attempts
      await user.resetLoginAttempts();

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken(
        `${req.get('User-Agent')} - ${req.ip}`
      );

      // Log successful login
      user.loginHistory.push({
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });

      // Keep only last 10 login entries
      if (user.loginHistory.length > 10) {
        user.loginHistory = user.loginHistory.slice(-10);
      }

      await user.save();

      // Handle cart merging if guest cart exists
      if (guestCartId) {
        try {
          const userCart = await Cart.findOrCreateCart(user._id, guestCartId);
          console.log(`🛒 Merged guest cart for user: ${email}`);
        } catch (cartError) {
          console.warn('Cart merge error:', cartError);
          // Don't fail login if cart merge fails
        }
      }

      // Clean expired tokens periodically
      await user.cleanExpiredTokens();

      console.log(`✅ User logged in: ${email}`);

      // Set secure HTTP-only cookie for refresh token if rememberMe
      if (rememberMe) {
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      // Response
      const userResponse = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login.'
      });
    }
  }

  // Refresh Token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body || req.cookies;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not provided.',
          code: 'NO_REFRESH_TOKEN'
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
        );
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token.',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if refresh token is in user's tokens
      const tokenExists = user.refreshTokens.some(
        tokenData => tokenData.token === refreshToken
      );

      if (!tokenExists) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is invalid or has been revoked.',
          code: 'TOKEN_REVOKED'
        });
      }

      // Check if user is still active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Generate new access token
      const newAccessToken = user.generateAuthToken();

      // Update last activity
      user.lastActivity = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token refresh.'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body || req.cookies;
      const user = req.user;

      if (refreshToken && user) {
        // Remove specific refresh token
        user.refreshTokens = user.refreshTokens.filter(
          tokenData => tokenData.token !== refreshToken
        );
        await user.save();
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      console.log(`👋 User logged out: ${user?.email || 'anonymous'}`);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout.'
      });
    }
  }

  // Logout from all devices
  static async logoutAll(req, res) {
    try {
      const user = req.user;

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      console.log(`👋 User logged out from all devices: ${user.email}`);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout.'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user;

      const userResponse = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      };

      res.json({
        success: true,
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }

  // Validate password strength
  static validatePasswordStrength(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // Change Password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // Validate new password strength
      if (!AuthController.validatePasswordStrength(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.',
          code: 'WEAK_PASSWORD'
        });
      }

      // Update password
      user.password = newPassword;
      
      // Clear all refresh tokens (force re-login on all devices)
      user.refreshTokens = [];
      
      await user.save();

      console.log(`🔐 Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again on all devices.'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = AuthController;