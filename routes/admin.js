const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const { authenticate: auth, authorize } = require('../middleware/security');
const adminAuth = [auth, authorize(['admin'])];

const router = express.Router();

// Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      pendingContacts,
      recentOrders,
      lowStockProducts
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Contact.countDocuments({ status: { $in: ['new', 'read'] } }),
      Order.find()
        .populate('user', 'name email')
        .populate('items.product', 'name price cost')
        .sort({ createdAt: -1 })
        .limit(10),
      Product.find({ quantity: { $lt: 10 } }).sort({ quantity: 1 }).limit(10)
    ]);

    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        pendingContacts,
        totalRevenue: totalRevenue.toFixed(2)
      },
      recentOrders,
      lowStockProducts,
      ordersByStatus,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get all orders (Admin)
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch orders with all fields including paymentCards
    const orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'name email',
        options: { strictPopulate: false } // Allow null references
      })
      .populate({
        path: 'userId',
        select: 'name email',
        options: { strictPopulate: false } // Allow null references
      })
      .populate({
        path: 'items.product',
        select: 'name price',
        options: { strictPopulate: false } // Allow null references
      })
      .lean() // Convert to plain JavaScript objects for better performance
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Ensure each order has customer info from shippingAddress if user is null
    const enrichedOrders = orders.map(order => ({
      ...order,
      customerName: order.user?.name || order.userId?.name || 
                    `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 
                    'Guest Customer',
      customerEmail: order.user?.email || order.userId?.email || 
                      order.shippingAddress?.email || 
                      'No email provided'
    }));
    
    // Log for debugging
    console.log(`📋 Admin orders fetch: Found ${enrichedOrders.length} orders (query: ${JSON.stringify(query)})`);
    if (enrichedOrders.length > 0) {
      console.log('📦 Sample order:', {
        id: enrichedOrders[0]._id,
        orderNumber: enrichedOrders[0].orderNumber,
        customerName: enrichedOrders[0].customerName,
        status: enrichedOrders[0].status,
        paymentMethod: enrichedOrders[0].paymentMethod,
        paymentCards: enrichedOrders[0].paymentCards?.length || 0,
        items: enrichedOrders[0].items?.length || 0,
        createdAt: enrichedOrders[0].createdAt
      });
    } else {
      const totalInDb = await Order.countDocuments({});
      console.log(`⚠️ No orders found with query, but total orders in DB: ${totalInDb}`);
    }

    const total = await Order.countDocuments(query);

    res.json({
      orders: enrichedOrders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalOrders: total
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Update order status (Admin)
/**
 * PATCH /api/admin/orders/:id/request-payment
 * Request additional payment from customer
 */
router.patch('/orders/:id/request-payment', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid payment amount is required' 
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    order.requestedPaymentAmount = parseFloat(amount);
    order.requestedPaymentAt = new Date();
    await order.save();

    console.log(`💰 Payment requested for order ${order.orderNumber}: $${amount}`);

    res.json({
      success: true,
      message: 'Payment request sent to customer',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        requestedAmount: order.requestedPaymentAmount
      }
    });
  } catch (error) {
    console.error('Request payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error requesting payment' 
    });
  }
});

/**
 * PATCH /api/admin/orders/:id/cancel-payment-request
 * Cancel payment request
 */
router.patch('/orders/:id/cancel-payment-request', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    order.requestedPaymentAmount = undefined;
    order.requestedPaymentAt = undefined;
    await order.save();

    res.json({
      success: true,
      message: 'Payment request cancelled'
    });
  } catch (error) {
    console.error('Cancel payment request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error cancelling payment request' 
    });
  }
});

router.patch('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// Get all users (Admin)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query, '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalUsers: total
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Update user role (Admin)
router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['customer', 'admin', 'co-admin', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

// Get product analytics
router.get('/analytics/products', adminAuth, async (req, res) => {
  try {
    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          category: '$product.category',
          totalSold: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Products by category
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

    res.json({
      topProducts,
      categoryStats
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({ message: 'Server error fetching product analytics' });
  }
});

// Get all customer messages (Admin)
router.get('/messages', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalMessages: total
    });
  } catch (error) {
    console.error('Admin messages fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
});

// Create new message (from contact form)
router.post('/messages', async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message, inquiryType } = req.body;

    const newMessage = new Message({
      firstName,
      lastName,
      email,
      subject,
      message,
      inquiryType,
      status: 'unread'
    });

    await newMessage.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Message creation error:', error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
});

// Update message status (Admin)
router.patch('/messages/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['unread', 'read', 'replied', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.status = status;
    await message.save();

    res.json({
      success: true,
      message: 'Message status updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Message status update error:', error);
    res.status(500).json({ success: false, message: 'Server error updating message status' });
  }
});

// Reply to message (Admin)
router.post('/messages/:id/reply', adminAuth, async (req, res) => {
  try {
    const { replyMessage } = req.body;

    if (!replyMessage || replyMessage.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply message is required' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await message.reply(replyMessage, req.user._id);

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Message reply error:', error);
    res.status(500).json({ success: false, message: 'Server error sending reply' });
  }
});

// Get message statistics (Admin)
router.get('/messages/stats', adminAuth, async (req, res) => {
  try {
    const stats = await Message.getMessageStats();
    const totalMessages = await Message.countDocuments();

    // Convert array to object for easier frontend consumption
    const statusCounts = {
      unread: 0,
      read: 0,
      replied: 0,
      resolved: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: {
        total: totalMessages,
        ...statusCounts
      }
    });
  } catch (error) {
    console.error('Message stats error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching message statistics' });
  }
});

// Get all products for admin panel (same as public but with admin auth)
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Admin products fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching products' });
  }
});

module.exports = router;