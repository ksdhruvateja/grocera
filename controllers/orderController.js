const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

class OrderController {

  // Create new order from cart
  static async createOrder(req, res) {
    try {
      const {
        shippingAddress,
        paymentMethodId,
        notes = ''
      } = req.body;
      const userId = req.user.id;

      // Validate shipping address
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
          !shippingAddress.zipCode || !shippingAddress.phone) {
        return res.status(400).json({
          success: false,
          message: 'Complete shipping address with phone number is required'
        });
      }

      // Get user's cart
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty. Cannot create order.'
        });
      }

      // Validate all cart items and calculate totals
      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = cartItem.productId;

        if (!product) {
          return res.status(400).json({
            success: false,
            message: 'Some products in cart no longer exist'
          });
        }

        const availableQuantity = product.quantity || 0;
        if (!product.inStock || availableQuantity < cartItem.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${availableQuantity}`,
            productId: product._id,
            availableQuantity: availableQuantity
          });
        }

        const itemTotal = product.price * cartItem.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          total: itemTotal,
          image: product.image,
          category: product.category
        });
      }

      // Calculate taxes and shipping
      const taxRate = 0.08875; // 8.875% NY state tax
      const taxAmount = subtotal * taxRate;
      const shippingAmount = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order
      const order = new Order({
        userId,
        items: orderItems,
        totalAmount,
        subtotal,
        taxAmount,
        shippingAmount,
        shippingAddress,
        paymentMethodId: paymentMethodId || null,
        notes,
        status: 'pending',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(),
            note: 'Order created'
          }
        ]
      });

      // Update product stock quantities
      for (const cartItem of cart.items) {
        await Product.findByIdAndUpdate(
          cartItem.productId,
          { 
            $inc: { quantity: -cartItem.quantity }
          }
        );

        // Update inStock status if quantity is now 0
        const updatedProduct = await Product.findById(cartItem.productId);
        if ((updatedProduct.quantity || 0) <= 0) {
          updatedProduct.inStock = false;
          await updatedProduct.save();
        }
      }

      await order.save();

      // Clear the cart after successful order
      await cart.clearCart();

      // Update user's order history
      await User.findByIdAndUpdate(
        userId,
        { 
          $push: { orderHistory: order._id },
          $inc: { totalOrders: 1, totalSpent: totalAmount }
        }
      );

      console.log(`📦 Order created: ${order._id} for user: ${req.user.email}, total: $${totalAmount}`);

      // Emit WebSocket notification for new order (if WebSocket is available)
      try {
        const { emitNewOrder } = require('../config/websocket');
        const orderData = {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          customerName: req.user.name || (req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : 'Customer'),
          customerEmail: req.user.email,
          itemCount: order.items.length,
          createdAt: order.createdAt
        };
        emitNewOrder(orderData);
      } catch (error) {
        // WebSocket not available, continue without it
        console.log('ℹ️ WebSocket notification skipped');
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount.toFixed(2),
            itemCount: order.items.length,
            createdAt: order.createdAt,
            estimatedDelivery: order.estimatedDelivery
          }
        }
      });

    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get user's order history
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      // Build filter
      const filter = { userId };
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get orders with pagination
      const [orders, totalCount] = await Promise.all([
        Order.find(filter)
          .populate('items.product', 'name image')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select('orderNumber status totalAmount subtotal taxAmount shippingAmount items createdAt estimatedDelivery deliveredAt paymentStatus remainingAmount requestedPaymentAmount requestedPaymentAt'),
        Order.countDocuments(filter)
      ]);

      // Format orders for response
      const formattedOrders = orders.map(order => ({
        id: order._id,
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        shippingAmount: order.shippingAmount,
        remainingAmount: order.remainingAmount,
        requestedPaymentAmount: order.requestedPaymentAmount,
        requestedPaymentAt: order.requestedPaymentAt,
        itemCount: order.items.length,
        items: order.items,
        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      console.log(`📋 Order history retrieved for user: ${req.user.email}, orders: ${orders.length}/${totalCount}`);

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit)
          },
          filter: {
            status: status || 'all'
          }
        }
      });

    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving order history'
      });
    }
  }

  // Get specific order details
  static async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?._id || req.user?.id;

      // Validate order ID format (MongoDB ObjectId)
      if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order ID format'
        });
      }

      // Find order belonging to the user
      const order = await Order.findOne({ 
        _id: orderId, 
        $or: [
          { userId: userId },
          { user: userId }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Format order for response
      const formattedOrder = {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price.toFixed(2),
          quantity: item.quantity,
          total: item.total.toFixed(2),
          image: item.image,
          category: item.category
        })),
        pricing: {
          subtotal: order.subtotal.toFixed(2),
          taxAmount: order.taxAmount.toFixed(2),
          shippingAmount: order.shippingAmount.toFixed(2),
          totalAmount: order.totalAmount.toFixed(2)
        },
        shippingAddress: order.shippingAddress,
        paymentMethodId: order.paymentMethodId,
        notes: order.notes,
        statusHistory: order.statusHistory.map(history => ({
          status: history.status,
          timestamp: history.timestamp,
          note: history.note
        })),
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        trackingNumber: order.trackingNumber
      };

      console.log(`📋 Order details retrieved: ${order.orderNumber} for user: ${req.user.email}`);

      res.json({
        success: true,
        data: {
          order: formattedOrder
        }
      });

    } catch (error) {
      console.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving order details'
      });
    }
  }

  // Get order summary (for recent orders widget)
  static async getOrderSummary(req, res) {
    try {
      const userId = req.user.id;

      // Get user statistics
      const [recentOrders, totalOrders, totalSpent] = await Promise.all([
        Order.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('orderNumber status totalAmount createdAt'),
        Order.countDocuments({ userId }),
        Order.aggregate([
          { $match: { userId: userId } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);

      const formattedRecentOrders = recentOrders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount.toFixed(2),
        createdAt: order.createdAt
      }));

      console.log(`📊 Order summary retrieved for user: ${req.user.email}`);

      res.json({
        success: true,
        data: {
          recentOrders: formattedRecentOrders,
          statistics: {
            totalOrders,
            totalSpent: totalSpent.length > 0 ? totalSpent[0].total.toFixed(2) : '0.00',
            averageOrderValue: totalOrders > 0 ? 
              ((totalSpent[0]?.total || 0) / totalOrders).toFixed(2) : '0.00'
          }
        }
      });

    } catch (error) {
      console.error('Get order summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving order summary'
      });
    }
  }

  // Cancel order (if still pending/confirmed)
  static async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason = 'Customer cancellation' } = req.body;
      const userId = req.user.id;

      // Validate order ID format
      if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order ID format'
        });
      }

      // Find order
      const order = await Order.findOne({ 
        _id: orderId, 
        userId 
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel order with status: ${order.status}`
        });
      }

      // Restore product quantities
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { 
            $inc: { quantity: item.quantity },
            inStock: true
          }
        );
      }

      // Update order status
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: reason
      });

      await order.save();

      // Update user statistics
      await User.findByIdAndUpdate(
        userId,
        { 
          $inc: { 
            totalOrders: -1, 
            totalSpent: -order.totalAmount 
          }
        }
      );

      console.log(`❌ Order cancelled: ${order.orderNumber} by user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status
          }
        }
      });

    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error cancelling order'
      });
    }
  }

  // ADMIN ONLY METHODS

  // Get all orders (Admin only)
  static async getAllOrders(req, res) {
    try {
      const { page = 1, limit = 20, status, userId, startDate, endDate } = req.query;

      // Build filter
      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (userId) {
        filter.userId = userId;
      }
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get orders with user population
      const [orders, totalCount] = await Promise.all([
        Order.find(filter)
          .populate('userId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Order.countDocuments(filter)
      ]);

      // Format orders for admin view
      const formattedOrders = orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          id: order.userId._id,
          name: `${order.userId.firstName} ${order.userId.lastName}`,
          email: order.userId.email
        },
        status: order.status,
        totalAmount: order.totalAmount.toFixed(2),
        itemCount: order.items.length,
        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery
      }));

      console.log(`📋 All orders retrieved by admin: ${req.user.email}, count: ${orders.length}/${totalCount}`);

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1
          },
          filters: {
            status: status || 'all',
            userId,
            startDate,
            endDate
          }
        }
      });

    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving orders'
      });
    }
  }

  // Update order status (Admin only)
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, note = '', trackingNumber } = req.body;
      
      // Validate inputs
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
          validStatuses
        });
      }

      // Find order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Update order
      const oldStatus = order.status;
      order.status = status;
      
      // Add to status history
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note: note || `Status updated from ${oldStatus} to ${status}`
      });

      // Set delivered date if status is delivered
      if (status === 'delivered') {
        order.deliveredAt = new Date();
      }

      // Set tracking number if provided
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      await order.save();

      console.log(`📦 Order status updated: ${order.orderNumber} from ${oldStatus} to ${status} by admin: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            trackingNumber: order.trackingNumber,
            deliveredAt: order.deliveredAt
          }
        }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating order status'
      });
    }
  }
}

module.exports = OrderController;