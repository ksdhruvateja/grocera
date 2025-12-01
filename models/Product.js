const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Daily Essentials',
      'Spices & Seasonings',
      'Fresh Vegetables',
      'Fruits',
      'Rice & Grains',
      'Lentils & Pulses',
      'Snacks & Sweets',
      'Frozen Foods',
      'Beverages',
      'American Breakfast Fusions',
      'Vegetables',  // For backward compatibility
      'Exotics'      // For backward compatibility
    ]
  },
  image: {
    type: String,
    default: ''
  },
  inStock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    default: 'piece',
    enum: ['piece', 'kg', 'g', 'l', 'ml', 'dozen', 'pack']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: [{
    type: String,
    trim: true
  }],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Pre-save middleware to auto-update inStock based on quantity
productSchema.pre('save', function(next) {
  // Always auto-update inStock based on quantity
  const qty = this.quantity || 0;
  // Force inStock to match quantity: if quantity > 0, inStock = true; if quantity = 0, inStock = false
  this.inStock = qty > 0;
  next();
});

module.exports = mongoose.model('Product', productSchema);