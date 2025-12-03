import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/pages/Cart.css';

function Cart() {
  const { items, total, itemCount, removeFromCart, updateQuantity, clearCart } = useCart();

  if (itemCount === 0) {
    return (
      <div className="cart-container">
        <div className="container">
          <div className="cart-empty">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your Cart is Empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <Link to="/products" className="btn btn-primary">
              🛍️ Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="container">
        <div className="cart-header">
          <h1>🛒 Shopping Cart</h1>
          <div className="cart-summary">
            <span className="item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            <span className="cart-total">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map((item, index) => {
              // Create unique key for cart items - include weight for vegetables
              const isVeg = item.product?.category?.toLowerCase().includes('vegetable') || 
                          item.product?.category === 'Fresh Vegetables';
              const uniqueKey = isVeg && item.product?.selectedWeight
                ? `${item.product._id || item.product.id}_${item.product.selectedWeight}`
                : `${item.product._id || item.product.id}_${index}`;
              
              return (
              <div key={uniqueKey} className="cart-item">
                <div className="item-image">
                  <img 
                    src={item.product.image || '/api/placeholder/80/80'} 
                    alt={item.product.name}
                    onError={(e) => {
                      e.target.src = '/api/placeholder/80/80';
                    }}
                  />
                </div>
                
                <div className="item-details">
                  <h3 className="item-name">
                    {item.product.displayName || item.product.name}
                    {item.product.selectedWeight && (
                      <span className="weight-info"> - Total: {(item.product.selectedWeight * item.quantity).toFixed(1)} lb</span>
                    )}
                  </h3>
                  <p className="item-category">{item.product.category}</p>
                  <p className="item-price">
                    ${item.product.price?.toFixed(2)}
                    {item.product.selectedWeight && <span className="per-weight"> per lb</span>}
                  </p>
                </div>
                
                <div className="item-controls">
                  <div className="quantity-controls">
                    <button 
                      className="qty-btn"
                      onClick={() => {
                        const productId = item.product._id || item.product.id;
                        const weight = isVeg ? item.product?.selectedWeight : undefined;
                        updateQuantity(productId, item.quantity - 1, weight);
                      }}
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="qty-btn"
                      onClick={() => {
                        const productId = item.product._id || item.product.id;
                        const weight = isVeg ? item.product?.selectedWeight : undefined;
                        updateQuantity(productId, item.quantity + 1, weight);
                      }}
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="item-total">
                    ${(() => {
                      const isVeg = item.product?.category?.toLowerCase().includes('vegetable') || 
                                   item.product?.category === 'Fresh Vegetables';
                      const weight = item.product?.selectedWeight;
                      
                      if (isVeg && weight) {
                        // For vegetables: price per lb × weight × quantity
                        return (item.product.price * weight * item.quantity).toFixed(2);
                      } else {
                        // For other items: price × quantity
                        return (item.product.price * item.quantity).toFixed(2);
                      }
                    })()}
                  </div>
                  
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const productId = item.product._id || item.product.id;
                      const weight = isVeg ? item.product?.selectedWeight : undefined;
                      removeFromCart(productId, weight);
                    }}
                    aria-label="Remove item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          <div className="cart-actions">
            <button 
              className="btn btn-secondary"
              onClick={clearCart}
            >
              Clear Cart
            </button>
            
            <div className="checkout-section">
              <div className="total-summary">
                <div className="subtotal">
                  <span>Subtotal ({itemCount} items):</span>
                  <span className="amount">${total.toFixed(2)}</span>
                </div>
                <div className="delivery-info">
                  <span>🚚 Free delivery on orders over $25</span>
                </div>
              </div>
              
              <Link to="/checkout" className="btn btn-primary btn-lg checkout-btn">
                🛒 Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;