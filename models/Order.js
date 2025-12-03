const mongoose = require('mongoose');

// Production-ready Order Schema with comprehensive tracking
const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    index: true,
    default: function() {
      return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  
  // User Reference (backward compatible)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Enhanced Order Items with historical data preservation
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    // Store product details to preserve order history
    productName: { type: String, required: true },
    productImage: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    productSku: String,
    productCategory: String,
    selectedWeight: { type: Number } // Weight for vegetables (in lbs)
  }],
  
  // Enhanced Pricing
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  shippingAmount: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  tipAmount: { type: Number, default: 0, min: 0 }, // Driver tip
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  
  // Partial payment fields
  partialPaymentAmount: { type: Number },
  remainingAmount: { type: Number },
  
  // Admin requested payment
  requestedPaymentAmount: { type: Number },
  requestedPaymentAt: { type: Date },
  
  // Enhanced Status Tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Status History for tracking
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Enhanced Payment Information
  // Partial payment fields
  partialPaymentAmount: { type: Number },
  remainingAmount: { type: Number },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'completed', 'failed', 'refunded', 'partial_refund', 'partial'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'credit', 'debit', 'otc', 'ebt', 'card', 'cash_on_delivery', 'bank_transfer'],
    default: 'stripe'
  },
  
  // Payment Cards (for OTC/EBT multiple card payments)
  paymentCards: [{
    name: String,
    cardNumber: String, // Full card number (for admin processing)
    pin: String, // PIN for card processing
    amount: { type: Number, min: 0 },
    type: { type: String, enum: ['otc', 'ebt'] }
  }],
  
  // Payment timestamps
  paidAt: Date,
  
  // Stripe Integration
  stripePaymentIntentId: {
    type: String,
    index: true
  },
  stripePaymentMethodId: String,
  stripeSessionId: String,
  
  // Enhanced Shipping Information
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' },
    phone: String
  },
  
  // Billing Information
  billingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  
  // Delivery Tracking
  estimatedDelivery: Date,
  actualDeliveryDate: Date,
  trackingNumber: String,
  carrier: String,
  deliveryInstructions: { type: String, maxlength: 500 },
  
  // Customer Communication
  notes: { type: String, maxlength: 1000 },
  customerNotes: { type: String, maxlength: 1000 },
  internalNotes: { type: String, maxlength: 1000 },
  
  // Analytics and Performance
  orderSource: {
    type: String,
    enum: ['web', 'mobile', 'admin'],
    default: 'web'
  },
  customerType: {
    type: String,
    enum: ['new', 'returning'],
    default: 'new'
  },
  processingTime: Number,
  fulfillmentTime: Number,
  
  // Cancellation/Refund
  cancellationReason: String,
  refundAmount: { type: Number, default: 0, min: 0 },
  refundDate: Date,
  refundReason: String
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Backward compatibility
      if (!ret.userId && ret.user) ret.userId = ret.user;
      delete ret.__v;
      return ret;
    }
  }
});

// Performance Indexes for 100k+ users
orderSchema.index({ user: 1, createdAt: -1 }); // Backward compatibility
orderSchema.index({ userId: 1, createdAt: -1 }); // User orders by date
orderSchema.index({ status: 1, createdAt: -1 }); // Orders by status
orderSchema.index({ paymentStatus: 1 }); // Payment queries
orderSchema.index({ orderNumber: 1 }, { unique: true }); // Order lookup
orderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true }); // Stripe integration
orderSchema.index({ 'shippingAddress.zipCode': 1 }); // Geographic queries

// Compound indexes for complex queries
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

// Pre-save middleware to ensure data consistency
orderSchema.pre('save', function(next) {
  // Ensure backward compatibility
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;
  
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((total, item) => {
    if (!item.subtotal) item.subtotal = item.price * item.quantity;
    return total + item.subtotal;
  }, 0);
  
  // Calculate total if not set
  if (!this.totalAmount) {
    this.totalAmount = this.subtotal + this.taxAmount + this.shippingAmount + (this.tipAmount || 0) - this.discountAmount;
  }
  
  // Add status history entry if status changed
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  next();
});

// Method to calculate estimated delivery
orderSchema.methods.calculateEstimatedDelivery = function() {
  const businessDays = 3;
  const now = new Date();
  const delivery = new Date(now);
  delivery.setDate(now.getDate() + businessDays);
  
  this.estimatedDelivery = delivery;
  return delivery;
};

// Method to update status with tracking
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  return this.save();
};

// Static method for order statistics
orderSchema.statics.getOrderStats = function(userId = null) {
  const match = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);