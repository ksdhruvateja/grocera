const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Cart Controller for user-specific cart management
class CartController {
  
  // Get user's cart (creates if doesn't exist)
  static async getCart(req, res) {
    try {
      const userId = req.user.id;
      
      // Find or create user's cart
      let cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image category inStock stockQuantity'
      });
      
      if (!cart) {
        cart = await Cart.findOrCreateCart(userId);
        await cart.populate({
          path: 'items.productId',
          select: 'name price image category inStock stockQuantity'
        });
      }
      
      // Validate cart items and update prices
      const validatedItems = [];
      let cartUpdated = false;
      
      for (const item of cart.items) {
        const product = item.productId;
        
        if (!product) {
          // Remove items for deleted products
          cartUpdated = true;
          continue;
        }
        
        if (!product.inStock || product.stockQuantity < item.quantity) {
          // Update quantity if insufficient stock
          const availableQuantity = Math.max(0, product.stockQuantity);
          if (availableQuantity === 0) {
            cartUpdated = true;
            continue; // Remove item
          } else {
            item.quantity = availableQuantity;
            cartUpdated = true;
          }
        }
        
        // Update price if it has changed
        if (item.addedPrice !== product.price) {
          item.addedPrice = product.price;
          cartUpdated = true;
        }
        
        validatedItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          category: product.category,
          quantity: item.quantity,
          subtotal: product.price * item.quantity,
          inStock: product.inStock,
          stockQuantity: product.stockQuantity,
          addedAt: item.addedAt
        });
      }
      
      // Update cart if needed
      if (cartUpdated) {
        cart.items = validatedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          addedPrice: item.price,
          addedAt: item.addedAt
        }));
        await cart.save();
      }
      
      // Calculate totals
      const totalItems = validatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
      
      console.log(`🛒 Cart retrieved for user: ${req.user.email}, items: ${totalItems}`);
      
      res.json({
        success: true,
        data: {
          cart: {
            id: cart._id,
            userId: cart.userId,
            items: validatedItems,
            totalItems,
            subtotal: subtotal.toFixed(2),
            lastModified: cart.lastModified,
            itemCount: validatedItems.length
          }
        }
      });
      
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving cart'
      });
    }
  }
  
  // Add item to cart
  static async addToCart(req, res) {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user.id;
      
      // Validate input
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      if (quantity < 1 || quantity > 99) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be between 1 and 99'
        });
      }
      
      // Check if product exists and is available
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (!product.inStock) {
        return res.status(400).json({
          success: false,
          message: 'Product is out of stock'
        });
      }
      
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stockQuantity} items available in stock`,
          availableQuantity: product.stockQuantity
        });
      }
      
      // Find or create user's cart
      let cart = await Cart.findOrCreateCart(userId);
      
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );
      
      if (existingItemIndex > -1) {
        // Update existing item
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        if (newQuantity > product.stockQuantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot add ${quantity} more items. Only ${product.stockQuantity - cart.items[existingItemIndex].quantity} more available`,
            currentQuantity: cart.items[existingItemIndex].quantity,
            availableToAdd: product.stockQuantity - cart.items[existingItemIndex].quantity
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].addedPrice = product.price;
        cart.items[existingItemIndex].addedAt = new Date();
      } else {
        // Add new item
        cart.items.push({
          productId,
          quantity,
          addedPrice: product.price,
          addedAt: new Date()
        });
      }
      
      await cart.save();
      
      // Get updated cart with populated items
      const updatedCart = await Cart.findById(cart._id).populate({
        path: 'items.productId',
        select: 'name price image category inStock stockQuantity'
      });
      
      console.log(`🛒 Item added to cart: ${product.name} (${quantity}) for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Item added to cart successfully',
        data: {
          cart: {
            totalItems: updatedCart.totalItems,
            subtotal: updatedCart.subtotal.toFixed(2),
            itemCount: updatedCart.items.length
          },
          addedItem: {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: existingItemIndex > -1 ? 
              updatedCart.items[existingItemIndex].quantity : 
              quantity
          }
        }
      });
      
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding item to cart'
      });
    }
  }
  
  // Update cart item quantity
  static async updateCartItem(req, res) {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user.id;
      
      // Validate input
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      if (quantity < 0 || quantity > 99) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be between 0 and 99'
        });
      }
      
      // Get user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      // If quantity is 0, remove the item
      if (quantity === 0) {
        return CartController.removeFromCart(req, res);
      }
      
      // Check product availability
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (!product.inStock) {
        return res.status(400).json({
          success: false,
          message: 'Product is out of stock'
        });
      }
      
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stockQuantity} items available in stock`,
          availableQuantity: product.stockQuantity
        });
      }
      
      // Update item in cart
      await cart.updateItemQuantity(productId, quantity);
      
      // Get updated cart
      const updatedCart = await Cart.findById(cart._id).populate({
        path: 'items.productId',
        select: 'name price image category inStock stockQuantity'
      });
      
      console.log(`🛒 Cart item updated: ${product.name} (${quantity}) for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Cart item updated successfully',
        data: {
          cart: {
            totalItems: updatedCart.totalItems,
            subtotal: updatedCart.subtotal.toFixed(2),
            itemCount: updatedCart.items.length
          }
        }
      });
      
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating cart item'
      });
    }
  }
  
  // Remove item from cart
  static async removeFromCart(req, res) {
    try {
      const { productId } = req.body;
      const userId = req.user.id;
      
      // Validate input
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      // Get user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      // Find the item to remove (for logging)
      const itemToRemove = cart.items.find(item => 
        item.productId.toString() === productId
      );
      
      if (!itemToRemove) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }
      
      // Remove item from cart
      await cart.removeItem(productId);
      
      // Get product name for logging
      const product = await Product.findById(productId);
      const productName = product ? product.name : 'Unknown Product';
      
      console.log(`🛒 Item removed from cart: ${productName} for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Item removed from cart successfully',
        data: {
          cart: {
            totalItems: cart.totalItems,
            subtotal: cart.subtotal.toFixed(2),
            itemCount: cart.items.length
          },
          removedItem: {
            productId,
            name: productName
          }
        }
      });
      
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing item from cart'
      });
    }
  }
  
  // Clear entire cart
  static async clearCart(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      // Clear cart
      await cart.clearCart();
      
      console.log(`🛒 Cart cleared for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Cart cleared successfully',
        data: {
          cart: {
            totalItems: 0,
            subtotal: '0.00',
            itemCount: 0
          }
        }
      });
      
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing cart'
      });
    }
  }
  
  // Merge guest cart with user cart (called during login)
  static async mergeGuestCart(req, res) {
    try {
      const { guestCartId, guestCartItems = [] } = req.body;
      const userId = req.user.id;
      
      if (!guestCartItems || guestCartItems.length === 0) {
        return res.json({
          success: true,
          message: 'No guest cart to merge'
        });
      }
      
      // Find or create user's cart
      let userCart = await Cart.findOrCreateCart(userId);
      
      // Merge items from guest cart
      for (const guestItem of guestCartItems) {
        const product = await Product.findById(guestItem.productId);
        
        if (product && product.inStock && product.stockQuantity >= guestItem.quantity) {
          const existingItemIndex = userCart.items.findIndex(
            item => item.productId.toString() === guestItem.productId
          );
          
          if (existingItemIndex > -1) {
            // Merge quantities
            const newQuantity = userCart.items[existingItemIndex].quantity + guestItem.quantity;
            if (newQuantity <= product.stockQuantity) {
              userCart.items[existingItemIndex].quantity = newQuantity;
              userCart.items[existingItemIndex].addedAt = new Date();
            }
          } else {
            // Add new item
            userCart.items.push({
              productId: guestItem.productId,
              quantity: guestItem.quantity,
              addedPrice: product.price,
              addedAt: new Date()
            });
          }
        }
      }
      
      await userCart.save();
      
      // Delete guest cart if it was stored in database
      if (guestCartId) {
        await Cart.deleteOne({ guestId: guestCartId });
      }
      
      console.log(`🛒 Guest cart merged for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Guest cart merged successfully',
        data: {
          cart: {
            totalItems: userCart.totalItems,
            subtotal: userCart.subtotal.toFixed(2),
            itemCount: userCart.items.length
          }
        }
      });
      
    } catch (error) {
      console.error('Merge guest cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error merging guest cart'
      });
    }
  }
  
  // Get cart summary for checkout
  static async getCartSummary(req, res) {
    try {
      const userId = req.user.id;
      
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image category inStock stockQuantity'
      });
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }
      
      // Validate all items
      const validItems = [];
      for (const item of cart.items) {
        const product = item.productId;
        
        if (!product || !product.inStock || product.stockQuantity < item.quantity) {
          continue; // Skip invalid items
        }
        
        validItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: item.quantity,
          subtotal: product.price * item.quantity
        });
      }
      
      if (validItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid items in cart'
        });
      }
      
      const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxRate = 0.08875; // 8.875% NY state tax
      const taxAmount = subtotal * taxRate;
      const shippingAmount = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
      const totalAmount = subtotal + taxAmount + shippingAmount;
      
      res.json({
        success: true,
        data: {
          items: validItems,
          summary: {
            subtotal: subtotal.toFixed(2),
            tax: taxAmount.toFixed(2),
            shipping: shippingAmount.toFixed(2),
            total: totalAmount.toFixed(2),
            itemCount: validItems.length,
            totalQuantity: validItems.reduce((sum, item) => sum + item.quantity, 0)
          }
        }
      });
      
    } catch (error) {
      console.error('Get cart summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cart summary'
      });
    }
  }
}

module.exports = CartController;