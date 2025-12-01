const Product = require('../models/Product');

class ProductController {
  // Get all products with filtering and pagination
  static async getProducts(req, res) {
    try {
      const {
        category,
        search,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 50,
        inStockOnly = false
      } = req.query;

      // Build filter query
      const filter = {};

      // Only apply category filter if provided and not 'All'
      if (category && category !== 'All') {
        filter.category = category;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (inStockOnly === 'true' || inStockOnly === true) {
        filter.inStock = true;
      }

      // Debug logging
      console.log('🔍 Product query filter:', JSON.stringify(filter));
      console.log('📊 Sort:', sortBy, sortOrder);
      console.log('📄 Pagination:', {page, limit});

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      let products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Fix inStock status for all products to match quantity
      const productsToUpdate = [];
      for (const product of products) {
        const qty = product.quantity || 0;
        const shouldBeInStock = qty > 0;
        if (product.inStock !== shouldBeInStock) {
          product.inStock = shouldBeInStock;
          productsToUpdate.push(product.save());
        }
      }
      if (productsToUpdate.length > 0) {
        await Promise.all(productsToUpdate);
        console.log(`✅ Fixed inStock status for ${productsToUpdate.length} products`);
      }

      const total = await Product.countDocuments(filter);

      console.log(`✅ Found ${products.length} products out of ${total} total`);

      res.json({
        success: true,
        data: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total,
          hasNextPage: skip + products.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products'
      });
    }
  }

  // Get single product by ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;

      let product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Fix inStock status to match quantity
      const qty = product.quantity || 0;
      const shouldBeInStock = qty > 0;
      if (product.inStock !== shouldBeInStock) {
        product.inStock = shouldBeInStock;
        await product.save();
        console.log(`✅ Fixed inStock status for product ${id}`);
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product'
      });
    }
  }

  // Get products by category
  static async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc', inStockOnly = false } = req.query;

      const filter = { category };
      if (inStockOnly === 'true' || inStockOnly === true) {
        filter.inStock = true;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Fix inStock status for all products to match quantity
      const productsToUpdate = [];
      for (const product of products) {
        const qty = product.quantity || 0;
        const shouldBeInStock = qty > 0;
        if (product.inStock !== shouldBeInStock) {
          product.inStock = shouldBeInStock;
          productsToUpdate.push(product.save());
        }
      }
      if (productsToUpdate.length > 0) {
        await Promise.all(productsToUpdate);
        console.log(`✅ Fixed inStock status for ${productsToUpdate.length} products in category`);
      }

      const total = await Product.countDocuments(filter);

      res.json({
        success: true,
        data: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total
        }
      });
    } catch (error) {
      console.error('Get products by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products by category'
      });
    }
  }

  // Search products
  static async searchProducts(req, res) {
    try {
      const { q, category, page = 1, limit = 50 } = req.query;

      const filter = {};
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ];
      }
      if (category) {
        filter.category = category;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find(filter)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Product.countDocuments(filter);

      res.json({
        success: true,
        data: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total
        }
      });
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching products'
      });
    }
  }

  // Get categories
  static async getCategories(req, res) {
    try {
      const categories = await Product.distinct('category');

      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const count = await Product.countDocuments({ category });
          return { name: category, count };
        })
      );

      res.json({
        success: true,
        data: categoriesWithCounts
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories'
      });
    }
  }

  // Create new product (Admin only)
  static async createProduct(req, res) {
    try {
      const productData = req.body;

      // Ensure quantity and stockQuantity are synced
      if (productData.stockQuantity !== undefined && productData.quantity === undefined) {
        productData.quantity = productData.stockQuantity;
      } else if (productData.quantity !== undefined && productData.stockQuantity === undefined) {
        productData.stockQuantity = productData.quantity;
      }

      // Preserve exact price and cost values (no rounding)
      if (productData.price !== undefined && productData.price !== null) {
        productData.price = typeof productData.price === 'string' ? parseFloat(productData.price) : productData.price;
      }
      if (productData.cost !== undefined && productData.cost !== null && productData.cost !== '') {
        productData.cost = typeof productData.cost === 'string' ? parseFloat(productData.cost) : productData.cost;
        if (isNaN(productData.cost) || productData.cost < 0) {
          productData.cost = 0;
        }
      } else if (productData.cost === '' || productData.cost === null || productData.cost === undefined) {
        productData.cost = 0;
      }

      // ALWAYS set inStock based on quantity - force it to match
      if (productData.quantity !== undefined || productData.stockQuantity !== undefined) {
        const qty = productData.quantity || productData.stockQuantity || 0;
        // Force inStock to match quantity: quantity > 0 = inStock true, quantity = 0 = inStock false
        productData.inStock = qty > 0;
      } else {
        // Default to false if quantity is not specified
        productData.inStock = false;
      }

      // Create new product
      const product = new Product(productData);
      await product.save();

      console.log(`✅ Product created: ${product.name} by ${req.user.role}: ${req.user.email}`);

      // Emit WebSocket notification for product update (if WebSocket is available)
      try {
        const { emitProductUpdate } = require('../config/websocket');
        emitProductUpdate({ type: 'created', product });
      } catch (error) {
        // WebSocket not available, continue without it
      }

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating product',
        error: error.message
      });
    }
  }

  // Update product (Admin only)
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate product ID
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      // Ensure quantity and stockQuantity are synced
      if (updates.stockQuantity !== undefined && updates.quantity === undefined) {
        updates.quantity = updates.stockQuantity;
      } else if (updates.quantity !== undefined && updates.stockQuantity === undefined) {
        updates.stockQuantity = updates.quantity;
      }

      // ALWAYS set inStock based on quantity - force it to match
      if (updates.quantity !== undefined || updates.stockQuantity !== undefined) {
        const qty = updates.quantity || updates.stockQuantity || 0;
        // Force inStock to match quantity: quantity > 0 = inStock true, quantity = 0 = inStock false
        updates.inStock = qty > 0;
      } else if (updates.inStock !== undefined) {
        // If only inStock checkbox is being toggled, verify it matches current quantity
        const currentProduct = await Product.findById(id);
        if (currentProduct) {
          const currentQty = currentProduct.quantity || currentProduct.stockQuantity || 0;
          // Force inStock to match quantity - can't have inStock true if quantity is 0
          if (currentQty === 0) {
            updates.inStock = false;
          } else if (currentQty > 0 && updates.inStock === false) {
            // If quantity > 0, force inStock to true
            updates.inStock = true;
          }
        }
      } else {
        // If neither quantity nor inStock is being updated, check current quantity and update inStock
        const currentProduct = await Product.findById(id);
        if (currentProduct) {
          const currentQty = currentProduct.quantity || currentProduct.stockQuantity || 0;
          updates.inStock = currentQty > 0;
        }
      }

      // Ensure cost is a valid number (preserve exact value)
      if (updates.cost !== undefined && updates.cost !== null && updates.cost !== '') {
        const costValue = typeof updates.cost === 'string' ? parseFloat(updates.cost) : updates.cost;
        if (isNaN(costValue) || costValue < 0) {
          updates.cost = 0;
        } else {
          updates.cost = costValue; // Preserve exact value, no rounding
        }
      }
      
      // Ensure price is a valid number (preserve exact value)
      if (updates.price !== undefined && updates.price !== null && updates.price !== '') {
        const priceValue = typeof updates.price === 'string' ? parseFloat(updates.price) : updates.price;
        if (isNaN(priceValue) || priceValue <= 0) {
          // Don't update price if invalid, let validation handle it
        } else {
          updates.price = priceValue; // Preserve exact value, no rounding
        }
      }

      console.log('Updating product with data:', { id, updates: { ...updates, image: updates.image ? '...' : '' } });

      // Find and update product
      const product = await Product.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      console.log(`✅ Product updated: ${product.name} by ${req.user.role}: ${req.user.email}`);

      // Emit WebSocket notification for product update (if WebSocket is available)
      try {
        const { emitProductUpdate } = require('../config/websocket');
        emitProductUpdate({ type: 'updated', product });
      } catch (error) {
        // WebSocket not available, continue without it
      }

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: {
          product
        }
      });

    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating product'
      });
    }
  }

  // Delete product (Admin only)
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      // Find and delete product
      const product = await Product.findByIdAndDelete(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Remove product from all carts
      const Cart = require('../models/Cart');
      await Cart.updateMany(
        { 'items.productId': id },
        { $pull: { items: { productId: id } } }
      );

      console.log(`🗑️ Product deleted: ${product.name} by ${req.user.role}: ${req.user.email}`);

      // Emit WebSocket notification for product update (if WebSocket is available)
      try {
        const { emitProductUpdate } = require('../config/websocket');
        emitProductUpdate({ type: 'deleted', product: { id: product._id, name: product.name } });
      } catch (error) {
        // WebSocket not available, continue without it
      }

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: {
          deletedProduct: {
            id: product._id,
            name: product.name
          }
        }
      });

    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting product'
      });
    }
  }
}

module.exports = ProductController;