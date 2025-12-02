const express = require('express');
const multer = require('multer');
const path = require('path');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Message = require('../models/Message');
const ProductController = require('../controllers/productController');
const { authenticate: auth, authorize } = require('../middleware/security');
const coAdminAuth = [auth, authorize(['co-admin', 'admin'])]; // Allow both co-admin and admin

const router = express.Router();

// Optional Socket.IO subscription endpoint for co-admin dashboards
try {
  const { getIO } = require('../config/websocket');
  const io = getIO && getIO();
  if (io) {
    io.on('connection', (socket) => {
      socket.on('subscribe:co-admin', () => {
        if (socket.userRole === 'co-admin' || socket.userRole === 'admin') {
          socket.join('co-admin-room');
        }
      });
    });
  }
} catch (_) {}

// Multer configuration for file uploads (same as products route)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get new/pending orders only (Co-Admin view)
router.get('/orders', coAdminAuth, async (req, res) => {
  try {
    const { status = 'pending', limit = 50, page = 1 } = req.query;
    
    // Co-admin can only view pending/new orders
    const query = { status: { $in: ['pending', 'confirmed'] } };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'name email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'userId',
        select: 'name email',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'items.product',
        select: 'name price',
        options: { strictPopulate: false }
      })
      .lean()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Enrich orders with customer info
    const enrichedOrders = orders.map(order => ({
      ...order,
      customerName: order.user?.name || order.userId?.name || 
                    `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 
                    'Guest Customer',
      customerEmail: order.user?.email || order.userId?.email || 
                     order.shippingAddress?.email || 
                     'No email provided'
    }));
    
    const totalOrders = await Order.countDocuments(query);
    
    res.json({
      success: true,
      orders: enrichedOrders,
      totalOrders,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalOrders / parseInt(limit))
    });
  } catch (error) {
    console.error('Co-admin orders fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders'
    });
  }
});

// Get order count for notifications
router.get('/orders/count', coAdminAuth, async (req, res) => {
  try {
    const newOrdersCount = await Order.countDocuments({ 
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });
    
    res.json({
      success: true,
      count: newOrdersCount
    });
  } catch (error) {
    console.error('Co-admin order count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order count'
    });
  }
});

// Get all products (Co-Admin can view and manage)
router.get('/products', coAdminAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Co-admin products fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching products' });
  }
});

// Create product (Co-Admin) - with file upload support
router.post('/products', coAdminAuth, upload.single('image'), async (req, res) => {
  try {
    // Handle file upload - set image path if file uploaded
    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }
    // If image is a URL (starts with http:// or https://), keep it as is
    // Otherwise, if no file uploaded and no image provided, use default
    if (!req.file && !req.body.image) {
      req.body.image = req.body.image || '/images/default-product.jpg';
    }

    // Handle legacy quantity field
    if (req.body.quantity && !req.body.stockQuantity) {
      req.body.stockQuantity = req.body.quantity;
    }

    // Use the same controller as admin
    await ProductController.createProduct(req, res);
  } catch (error) {
    console.error('Co-admin product creation error:', error);
    res.status(500).json({ success: false, message: 'Server error creating product', error: error.message });
  }
});

// Update product (Co-Admin) - with file upload support
router.put('/products/:id', coAdminAuth, upload.single('image'), async (req, res) => {
  try {
    // Handle file upload - set image path if file uploaded
    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }
    // If image is a URL (starts with http:// or https://), keep it as is
    // Don't override existing image if no file uploaded

    // Handle legacy quantity field
    if (req.body.quantity && !req.body.stockQuantity) {
      req.body.stockQuantity = req.body.quantity;
    }

    // Use the same controller as admin
    await ProductController.updateProduct(req, res);
  } catch (error) {
    console.error('Co-admin product update error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product', error: error.message });
  }
});

// Delete product (Co-Admin)
router.delete('/products/:id', coAdminAuth, async (req, res) => {
  try {
    const ProductController = require('../controllers/productController');
    // Use the same controller as admin
    await ProductController.deleteProduct(req, res);
  } catch (error) {
    console.error('Co-admin product deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
});

module.exports = router;

// ==============================
// Messages (mirror admin queries)
// ==============================
// List customer messages (Co-Admin/Admin)
router.get('/messages', coAdminAuth, async (req, res) => {
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
    console.error('Co-admin messages fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
});

// Update message status (Co-Admin/Admin)
router.patch('/messages/:id/status', coAdminAuth, async (req, res) => {
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
    console.error('Co-admin message status update error:', error);
    res.status(500).json({ success: false, message: 'Server error updating message status' });
  }
});

// Reply to message (Co-Admin/Admin)
router.post('/messages/:id/reply', coAdminAuth, async (req, res) => {
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
    console.error('Co-admin message reply error:', error);
    res.status(500).json({ success: false, message: 'Server error sending reply' });
  }
});

// Message statistics (Co-Admin/Admin)
router.get('/messages/stats', coAdminAuth, async (req, res) => {
  try {
    const stats = await Message.getMessageStats();
    const totalMessages = await Message.countDocuments();

    const statusCounts = { unread: 0, read: 0, replied: 0, resolved: 0 };
    stats.forEach(stat => { statusCounts[stat._id] = stat.count; });

    res.json({
      success: true,
      stats: { total: totalMessages, ...statusCounts }
    });
  } catch (error) {
    console.error('Co-admin message stats error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching message statistics' });
  }
});

