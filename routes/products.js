const express = require('express');
const multer = require('multer');
const path = require('path');
const ProductController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/security');
const { validateProductFilter } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Multer configuration for file uploads
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

// Validation schemas for admin operations
const createProductSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required'
    }),
  
  description: Joi.string()
    .max(500)
    .trim()
    .default('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  price: Joi.number()
    .positive()
    .max(1000)
    .required()
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.max': 'Price cannot exceed $1000',
      'any.required': 'Price is required'
    }),
  
  cost: Joi.number()
    .min(0)
    .max(1000)
    .default(0)
    .messages({
      'number.min': 'Cost cannot be negative',
      'number.max': 'Cost cannot exceed $1000'
    }),
  
  image: Joi.string()
    .max(2000)
    .allow('')
    .default('/images/default-product.jpg')
    .messages({
      'string.max': 'Image URL cannot exceed 2000 characters'
    }),
  
  category: Joi.string()
    .valid(
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
    )
    .required()
    .messages({
      'any.only': 'Category must be one of the valid categories',
      'any.required': 'Category is required'
    }),
  
  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .max(9999)
    .default(0)
    .messages({
      'number.integer': 'Stock quantity must be a whole number',
      'number.min': 'Stock quantity cannot be negative',
      'number.max': 'Stock quantity cannot exceed 9999'
    }),

  // Legacy fields for backward compatibility
  quantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().max(50).default('piece'),
  discount: Joi.number().min(0).max(100).default(0),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).default([]),
  nutritionInfo: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .trim()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  price: Joi.number()
    .positive()
    .max(1000)
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.max': 'Price cannot exceed $1000'
    }),
  
  cost: Joi.number()
    .min(0)
    .max(1000)
    .messages({
      'number.min': 'Cost cannot be negative',
      'number.max': 'Cost cannot exceed $1000'
    }),
  
  image: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Image URL cannot exceed 2000 characters'
    }),
  
  category: Joi.string()
    .valid(
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
    )
    .messages({
      'any.only': 'Category must be one of the valid categories'
    }),
  
  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .max(9999)
    .messages({
      'number.integer': 'Stock quantity must be a whole number',
      'number.min': 'Stock quantity cannot be negative',
      'number.max': 'Stock quantity cannot exceed 9999'
    }),

  // Legacy fields
  quantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().max(50).optional(),
  discount: Joi.number().min(0).max(100).optional(),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  nutritionInfo: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional()
}).min(1).messages({
  'object.min': 'At least one field is required for update'
});

// Validation middleware
const validateCreateProduct = (req, res, next) => {
  // Handle file upload first - only set if file is uploaded
  // If image URL is provided in body, it will be preserved
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

  // Handle tags conversion
  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  // Handle nutrition info parsing
  if (req.body.nutritionInfo && typeof req.body.nutritionInfo === 'string') {
    try {
      req.body.nutritionInfo = JSON.parse(req.body.nutritionInfo);
    } catch (e) {
      req.body.nutritionInfo = {};
    }
  }

  const { error, value } = createProductSchema.validate(req.body, {
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

const validateUpdateProduct = (req, res, next) => {
  // Handle file upload first - only set if file is uploaded
  // If image URL is provided in body, it will be preserved
  if (req.file) {
    req.body.image = `/uploads/${req.file.filename}`;
  }
  // If image is a URL (starts with http:// or https://), keep it as is
  // Don't override existing image if no file uploaded

  // Handle legacy quantity field
  if (req.body.quantity && !req.body.stockQuantity) {
    req.body.stockQuantity = req.body.quantity;
  }

  // Handle tags conversion
  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  // Handle nutrition info parsing
  if (req.body.nutritionInfo && typeof req.body.nutritionInfo === 'string') {
    try {
      req.body.nutritionInfo = JSON.parse(req.body.nutritionInfo);
    } catch (e) {
      req.body.nutritionInfo = {};
    }
  }

  const { error, value } = updateProductSchema.validate(req.body, {
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

// PUBLIC ROUTES

/**
 * GET /api/products
 * Get all products with filtering, searching, and pagination
 * Query params: category, search, minPrice, maxPrice, sortBy, sortOrder, page, limit, inStockOnly
 */
router.get('/', validateProductFilter, ProductController.getProducts);

/**
 * GET /api/products/categories
 * Get all categories with product counts
 */
router.get('/categories', ProductController.getCategories);

/**
 * GET /api/products/search
 * Search products by name/description
 * Query params: q (search query), category, page, limit
 */
router.get('/search', ProductController.searchProducts);

/**
 * GET /api/products/category/:category
 * Get products by specific category
 * Params: category (Daily Essentials, Fruits, Vegetables, Exotics)
 * Query params: page, limit, sortBy, sortOrder, inStockOnly
 */
router.get('/category/:category', ProductController.getProductsByCategory);

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', ProductController.getProductById);

// ADMIN ONLY ROUTES

/**
 * POST /api/products
 * Create new product (Admin only)
 * Body: { name, description, price, image, category, stockQuantity }
 * File upload: image (optional)
 */
router.post('/', 
  authenticate, 
  authorize(['admin', 'co-admin']), // Allow both admin and co-admin
  upload.single('image'),
  validateCreateProduct, 
  ProductController.createProduct
);

/**
 * PUT /api/products/:id
 * Update product (Admin and Co-Admin)
 * Body: { name?, description?, price?, image?, category?, stockQuantity? }
 * File upload: image (optional)
 */
router.put('/:id', 
  authenticate, 
  authorize(['admin', 'co-admin']), // Allow both admin and co-admin
  upload.single('image'),
  validateUpdateProduct, 
  ProductController.updateProduct
);

/**
 * DELETE /api/products/:id
 * Delete product (Admin and Co-Admin)
 */
router.delete('/:id', 
  authenticate, 
  authorize(['admin', 'co-admin']), // Allow both admin and co-admin
  ProductController.deleteProduct
);

module.exports = router;