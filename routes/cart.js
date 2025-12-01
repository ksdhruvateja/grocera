const express = require('express');
const CartController = require('../controllers/cartController');
const { authenticate: auth } = require('../middleware/security');
const { validateCartInput } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(auth);

/**
 * GET /api/cart
 * Get current user's cart with all items
 */
router.get('/', CartController.getCart);

/**
 * POST /api/cart/add
 * Add item to cart
 * Body: { productId: string, quantity: number }
 */
router.post('/add', validateCartInput, CartController.addToCart);

/**
 * PUT /api/cart/update
 * Update item quantity in cart
 * Body: { productId: string, quantity: number }
 */
router.put('/update', validateCartInput, CartController.updateCartItem);

/**
 * DELETE /api/cart/remove
 * Remove item from cart
 * Body: { productId: string }
 */
router.delete('/remove', CartController.removeFromCart);

/**
 * DELETE /api/cart/clear
 * Clear entire cart
 */
router.delete('/clear', CartController.clearCart);

/**
 * POST /api/cart/merge
 * Merge guest cart with user cart (called during login)
 * Body: { guestCartId: string, guestCartItems: array }
 */
router.post('/merge', CartController.mergeGuestCart);

/**
 * GET /api/cart/summary
 * Get cart summary for checkout (with tax, shipping calculations)
 */
router.get('/summary', CartController.getCartSummary);

module.exports = router;