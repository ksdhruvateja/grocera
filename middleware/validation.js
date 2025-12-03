const Joi = require('joi');

// Validation schemas
const cartItemSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    }),
  
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(99)
    .default(1)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 99'
    })
});

const cartUpdateSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    }),
  
  quantity: Joi.number()
    .integer()
    .min(0)
    .max(99)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity cannot be negative',
      'number.max': 'Quantity cannot exceed 99',
      'any.required': 'Quantity is required'
    })
});

const cartRemoveSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    })
});

const guestCartMergeSchema = Joi.object({
  guestCartId: Joi.string().optional(),
  guestCartItems: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
        quantity: Joi.number()
          .integer()
          .min(1)
          .max(99)
          .required()
      })
    )
    .max(50) // Limit guest cart items
    .default([])
    .messages({
      'array.max': 'Too many items in guest cart'
    })
});

// Validation middleware functions
const validateCartInput = (req, res, next) => {
  let schema;
  
  // Determine which schema to use based on the route
  if (req.path.includes('/add')) {
    schema = cartItemSchema;
  } else if (req.path.includes('/update')) {
    schema = cartUpdateSchema;
  } else if (req.path.includes('/remove')) {
    schema = cartRemoveSchema;
  } else if (req.path.includes('/merge')) {
    schema = guestCartMergeSchema;
  } else {
    return next(); // No validation needed for this route
  }
  
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
  
  // Replace request body with validated/sanitized data
  req.body = value;
  next();
};

// Product validation helpers
const validateProductExists = async (productId) => {
  const Product = require('../models/Product');
  
  try {
    const product = await Product.findById(productId);
    return !!product;
  } catch (error) {
    return false;
  }
};

const validateProductAvailability = async (productId, quantity) => {
  const Product = require('../models/Product');
  
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return { valid: false, message: 'Product not found' };
    }
    
    if (!product.inStock) {
      return { valid: false, message: 'Product is out of stock' };
    }
    
    if (product.stockQuantity < quantity) {
      return { 
        valid: false, 
        message: `Only ${product.stockQuantity} items available`,
        availableQuantity: product.stockQuantity
      };
    }
    
    return { valid: true, product };
  } catch (error) {
    return { valid: false, message: 'Error validating product' };
  }
};

// Validation for product filtering
const productFilterSchema = Joi.object({
  category: Joi.string()
    .valid('Daily Essentials', 'Fruits', 'Vegetables', 'Exotics', 'Spices & Seasonings', 'Fresh Vegetables', 'Rice & Grains', 'Lentils & Pulses', 'Snacks & Sweets', 'Frozen Foods', 'Beverages', 'American Breakfast Fusions')
    .optional()
    .messages({
      'any.only': 'Invalid category'
    }),
  
  search: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Search term must be at least 1 character',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  minPrice: Joi.number()
    .min(0)
    .max(1000)
    .optional()
    .messages({
      'number.min': 'Minimum price cannot be negative',
      'number.max': 'Minimum price cannot exceed $1000'
    }),
  
  maxPrice: Joi.number()
    .min(0)
    .max(1000)
    .optional()
    .messages({
      'number.min': 'Maximum price cannot be negative',
      'number.max': 'Maximum price cannot exceed $1000'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'price', 'category', 'createdAt')
    .default('name')
    .messages({
      'any.only': 'Invalid sort field. Must be one of: name, price, category, createdAt'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1',
      'number.max': 'Page cannot exceed 100'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  inStockOnly: Joi.boolean()
    .default(false)
});

const validateProductFilter = (req, res, next) => {
  const { error, value } = productFilterSchema.validate(req.query, {
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
      message: 'Invalid filter parameters',
      errors
    });
  }
  
  // Validate price range
  if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
    return res.status(400).json({
      success: false,
      message: 'Minimum price cannot be greater than maximum price',
      errors: [{
        field: 'priceRange',
        message: 'Invalid price range',
        value: { minPrice: value.minPrice, maxPrice: value.maxPrice }
      }]
    });
  }
  
  // Replace query with validated data
  req.query = value;
  next();
};

module.exports = {
  validateCartInput,
  validateProductFilter,
  validateProductExists,
  validateProductAvailability,
  cartItemSchema,
  cartUpdateSchema,
  cartRemoveSchema,
  guestCartMergeSchema,
  productFilterSchema
};