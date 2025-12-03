const express = require('express');
const OrderController = require('../controllers/orderController');
const { authenticate: auth, authorize } = require('../middleware/security');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    street: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Street address must be at least 5 characters',
      'string.max': 'Street address cannot exceed 200 characters',
      'any.required': 'Street address is required'
    }),
    city: Joi.string().min(2).max(100).required().messages({
      'string.min': 'City must be at least 2 characters',
      'string.max': 'City cannot exceed 100 characters',
      'any.required': 'City is required'
    }),
    state: Joi.string().min(2).max(50).optional().messages({
      'string.min': 'State must be at least 2 characters',
      'string.max': 'State cannot exceed 50 characters'
    }),
    zipCode: Joi.string().min(5).max(10).required().messages({
      'string.min': 'ZIP code must be at least 5 characters',
      'string.max': 'ZIP code cannot exceed 10 characters',
      'any.required': 'ZIP code is required'
    }),
    country: Joi.string().min(2).max(100).default('United States').messages({
      'string.min': 'Country must be at least 2 characters',
      'string.max': 'Country cannot exceed 100 characters'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).required().messages({
      'string.pattern.base': 'Phone number format is invalid',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 20 characters',
      'any.required': 'Phone number is required'
    })
  }).required().messages({
    'any.required': 'Shipping address is required'
  }),

  paymentMethodId: Joi.string().optional().messages({
    'string.base': 'Payment method ID must be a string'
  }),

  notes: Joi.string().max(500).default('').messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled',
      'any.required': 'Status is required'
    }),

  note: Joi.string().max(300).default('').messages({
    'string.max': 'Note cannot exceed 300 characters'
  }),

  trackingNumber: Joi.string().max(100).optional().messages({
    'string.max': 'Tracking number cannot exceed 100 characters'
  })
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(300).default('Customer cancellation').messages({
    'string.max': 'Reason cannot exceed 300 characters'
  })
});

// Legacy Stripe validation schemas for backward compatibility
const createPaymentIntentSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  shippingAddress: Joi.object().required()
});

// Validation middleware
const validateCreateOrder = (req, res, next) => {
  const { error, value } = createOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
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

  req.body = value;
  next();
};

const validateUpdateOrderStatus = (req, res, next) => {
  const { error, value } = updateOrderStatusSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
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

  req.body = value;
  next();
};

const validateCancelOrder = (req, res, next) => {
  const { error, value } = cancelOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
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

  req.body = value;
  next();
};

// All routes require authentication
router.use(auth);

/**
 * POST /api/orders/create-direct
 * Create order directly with items (for checkout flow)
 * Body: { items: [], shippingAddress: {}, customerInfo: {}, totals: {}, paymentMethod: string }
 */
router.post('/create-direct', async (req, res) => {
  try {
    const { items, shippingAddress, customerInfo, totals, paymentMethod } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      console.error('No user ID found. User object:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required (street, city, zipCode)'
      });
    }

    // Validate and calculate totals
    const Product = require('../models/Product');
    const orderItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }

      if (!product.inStock || (product.quantity || 0) < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      // For vegetables, calculate: price per lb × weight × quantity
      // For other items, calculate: price × quantity
      const isVegetable = product.category?.toLowerCase().includes('vegetable') ||
                         product.category === 'Fresh Vegetables';
      const selectedWeight = item.selectedWeight;
      
      let itemTotal;
      if (isVegetable && selectedWeight) {
        // Vegetable: price per lb × weight × quantity
        itemTotal = (item.price || product.price) * selectedWeight * item.quantity;
      } else {
        // Regular item: price × quantity
        itemTotal = (item.price || product.price) * item.quantity;
      }
      
      calculatedSubtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: item.displayName || product.name, // Include displayName for vegetables with weight
        productImage: product.image,
        price: item.price || product.price,
        quantity: item.quantity,
        subtotal: itemTotal,
        productSku: product.sku,
        productCategory: product.category,
        selectedWeight: item.selectedWeight // Include weight for vegetables
      });
    }

    // Use provided totals or calculate
    const subtotal = totals?.subtotal || calculatedSubtotal;
    const taxAmount = totals?.tax || (subtotal * 0.08875); // NY tax rate 8.875%
    const shippingAmount = totals?.shipping !== undefined ? totals.shipping : (subtotal < 35 ? 10 : 0); // $10 if < $35, free if $35+
    const tipAmount = totals?.tip || 0; // Driver tip (optional)
    const totalAmount = totals?.total || (subtotal + taxAmount + shippingAmount + tipAmount);

    // Create order
    const Order = require('../models/Order');
    const order = new Order({
      userId,
      user: userId,
      items: orderItems,
      subtotal,
      taxAmount,
      shippingAmount: shippingAmount || 0,
      tipAmount: tipAmount || 0,
      totalAmount,
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state || 'NY',
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'United States',
        phone: shippingAddress.phone,
        email: customerInfo?.email || shippingAddress.email || ''
      },
      paymentMethod: paymentMethod || 'stripe',
      paymentStatus: 'pending',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created'
      }]
    });

    await order.save();
    
    // Emit realtime notification to admin/co-admin dashboards
    try {
      const { emitNewOrder } = require('../config/websocket');
      const orderData = {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        customerEmail: customerInfo?.email || shippingAddress.email || ''
      };
      emitNewOrder(orderData);
    } catch (e) {
      console.log('ℹ️ WebSocket emit skipped for create-direct');
    }

    console.log(`✅ Direct order created: ${order.orderNumber} (ID: ${order._id}) for user: ${userId}`);
    console.log(`📦 Order details:`, {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      createdAt: order.createdAt
    });

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
      
      // Update inStock status if quantity is now 0
      const updatedProduct = await Product.findById(item.product);
      if (updatedProduct && (updatedProduct.quantity || 0) <= 0) {
        updatedProduct.inStock = false;
        await updatedProduct.save();
      }
    }

    console.log(`✅ Direct order created: ${order.orderNumber} for user: ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        _id: order._id,
        orderNumber: order.orderNumber
      },
      _id: order._id, // Also include at root level for backward compatibility
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('Create direct order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/orders
 * Create new order from current user's cart
 * Body: { shippingAddress: {}, paymentMethodId?: string, notes?: string }
 */
router.post('/', validateCreateOrder, OrderController.createOrder);

/**
 * GET /api/orders
 * Get current user's order history
 * Query params: page, limit, status
 */
router.get('/', OrderController.getUserOrders);

/**
 * GET /api/orders/summary
 * Get order summary for dashboard (recent orders + statistics)
 */
router.get('/summary', OrderController.getOrderSummary);

/**
 * GET /api/orders/:orderId/payment-info
 * Get order payment info (remaining amount, etc.) - No auth required for payment purposes
 */
router.get('/:orderId/payment-info', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate order ID format
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const Order = require('../models/Order');
    const order = await Order.findById(orderId).select('orderNumber remainingAmount totalAmount paymentStatus');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        remainingAmount: order.remainingAmount,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    console.error('Get order payment info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order payment information'
    });
  }
});

/**
 * GET /api/orders/:orderId/public
 * Get order details without authentication (for order success page)
 */
router.get('/:orderId/public', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate order ID format (MongoDB ObjectId)
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const Order = require('../models/Order');
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Format order for response - match frontend expectations
    const formattedOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: order.items.map(item => ({
        product: {
          _id: item.product,
          name: item.productName || item.name,
          price: item.price,
          image: item.productImage || item.image
        },
        quantity: item.quantity,
        price: item.price,
        name: item.productName || item.name
      })),
      totals: {
        subtotal: order.subtotal || 0,
        tax: order.taxAmount || 0,
        shipping: order.shippingAmount || 0,
        tip: order.tipAmount || 0,
        total: order.totalAmount || 0
      },
      customerInfo: order.shippingAddress ? {
        firstName: order.shippingAddress.firstName || '',
        lastName: order.shippingAddress.lastName || '',
        address: order.shippingAddress.street || '',
        city: order.shippingAddress.city || '',
        state: order.shippingAddress.state || '',
        zipCode: order.shippingAddress.zipCode || '',
        phone: order.shippingAddress.phone || '',
        email: order.shippingAddress.email || ''
      } : null,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      estimatedDelivery: order.estimatedDelivery
    };

    res.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    console.error('Get public order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order details'
    });
  }
});

/**
 * GET /api/orders/:orderId
 * Get specific order details (requires authentication)
 */
router.get('/:orderId', auth, OrderController.getOrderById);

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order (if status allows)
 * Body: { reason?: string }
 */
router.post('/:orderId/cancel', validateCancelOrder, OrderController.cancelOrder);

// LEGACY STRIPE ROUTES (for backward compatibility)

/**
 * GET /api/orders/my-orders
 * Legacy route - redirects to main orders endpoint
 */
router.get('/my-orders', (req, res) => {
  res.redirect('/api/orders');
});

/**
 * POST /api/orders/create-payment-intent
 * Legacy Stripe payment intent creation
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { error, value } = createPaymentIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details
      });
    }

    const { items, shippingAddress } = value;
    const Product = require('../models/Product');

    // Validate and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          message: `Product ${item.productId} not found`
        });
      }
      if (!product.inStock || (product.quantity || 0) < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Add tax and shipping
    const taxAmount = totalAmount * 0.08875; // NY tax rate 8.875%
    const shippingAmount = totalAmount >= 50 ? 0 : 5.99;
    const finalAmount = totalAmount + taxAmount + shippingAmount;

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: req.user.id,
        itemCount: orderItems.length.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: finalAmount,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ message: 'Server error creating payment intent' });
  }
});

/**
 * POST /api/orders/confirm-payment
 * Legacy payment confirmation
 */
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment Intent ID is required' });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    res.json({
      message: 'Payment confirmed successfully',
      status: 'success'
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ message: 'Server error confirming payment' });
  }
});

/**
 * PATCH /api/orders/:id/cancel
 * Legacy cancel order route
 */
router.patch('/:id/cancel', async (req, res) => {
  try {
    // Redirect to new cancel endpoint
    const response = await OrderController.cancelOrder({
      ...req,
      params: { orderId: req.params.id },
      body: { reason: 'Customer cancellation' }
    }, res);

  } catch (error) {
    console.error('Legacy order cancellation error:', error);
    res.status(500).json({ message: 'Server error cancelling order' });
  }
});

// ADMIN ONLY ROUTES

/**
 * GET /api/orders/admin/all
 * Get all orders with filtering (Admin only)
 * Query params: page, limit, status, userId, startDate, endDate
 */
router.get('/admin/all',
  authorize(['admin']),
  OrderController.getAllOrders
);

/**
 * PUT /api/orders/:orderId/status
 * Update order status (Admin only)
 * Body: { status: string, note?: string, trackingNumber?: string }
 */
router.put('/:orderId/status',
  authorize(['admin']),
  validateUpdateOrderStatus,
  OrderController.updateOrderStatus
);

module.exports = router;