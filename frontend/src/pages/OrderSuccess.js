import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/pages/OrderSuccess.css';

function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // ...existing code...
  const orderId = searchParams.get('order_id');
  const isRemainingPayment = searchParams.get('remaining_payment') === 'true';

  useEffect(() => {
    // Clear cart on successful order
    clearCart();
    // Fetch order details if available
    const fetchOrderDetails = async () => {
      try {
        // Try public endpoint first (no auth required)
        let response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/orders/${orderId}/public`);

        // If public endpoint fails, try authenticated endpoint
        if (!response.ok) {
          const token = localStorage.getItem('token');
          if (token) {
            response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/orders/${orderId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }
        }

        if (response.ok) {
          const data = await response.json();
          // Handle both response formats
          const orderData = data.data?.order || data.data || data;
          setOrderDetails(orderData);
        } else {
          console.error('Failed to fetch order details:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId, clearCart]);

  if (loading) {
    return (
      <div className="order-success-container">
        <div className="container">
          <div className="loading-section">
            <div className="spinner-large"></div>
            <p>Loading your order details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-container">
      <div className="container">
        <div className="success-content">
          <div className="success-header">
            <div className="success-icon">✅</div>
            <h1>
              {isRemainingPayment ? 'Remaining Payment Completed!' : 'Order Successfully Placed!'}
            </h1>
            <p className="success-message">
              {isRemainingPayment 
                ? 'Thank you! Your remaining payment has been processed successfully. Your order is now fully paid and will be processed accordingly.'
                : 'Your order has been placed successfully. Thank you!'}
            </p>
          </div>

          {orderDetails && (
            <div className="order-details">
              <h2>📋 Order Details</h2>
              <div className="order-info">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Order ID:</span>
                    <span className="value">#{orderDetails._id?.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Order Date:</span>
                    <span className="value">{new Date(orderDetails.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Amount:</span>
                    <span className="value amount">${orderDetails.totals?.total?.toFixed(2)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment Status:</span>
                    <span className="value status completed">✅ Completed</span>
                  </div>
                </div>

                {orderDetails.items && (
                  <div className="order-items">
                    <h3>Items Ordered:</h3>
                    {orderDetails.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-details">
                          <span className="item-name">{item.product?.name || item.name}</span>
                          <span className="item-qty">Qty: {item.quantity}</span>
                        </div>
                        <span className="item-price">
                          ${((item.product?.price || item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {orderDetails.customerInfo && (
                  <div className="shipping-info">
                    <h3>📍 Delivery Address:</h3>
                    <div className="address">
                      <p>{orderDetails.customerInfo.firstName} {orderDetails.customerInfo.lastName}</p>
                      <p>{orderDetails.customerInfo.address}</p>
                      <p>{orderDetails.customerInfo.city}, {orderDetails.customerInfo.state} {orderDetails.customerInfo.zipCode}</p>
                      <p>📞 {orderDetails.customerInfo.phone}</p>
                      <p>📧 {orderDetails.customerInfo.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="next-steps">
            <h2>🚚 What's Next?</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-icon">📦</div>
                <h3>Order Processing</h3>
                <p>It takes roughly 20 minutes to 24 hours to process your order depending on the location, quantity, and product availability.</p>
              </div>
              <div className="step-card">
                <div className="step-icon">🚚</div>
                <h3>Delivery</h3>
                <p>As soon as the product is packed, it will be delivered. Maximum turnaround time is 24 hours from the time the order is placed. Thank you for your patience.</p>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <Link to="/orders" className="btn btn-primary">
              📋 Track Your Orders
            </Link>
            <Link to="/products" className="btn btn-secondary">
              🛒 Continue Shopping
            </Link>
            <Link to="/" className="btn btn-secondary">
              🏠 Back to Home
            </Link>
          </div>

          <div className="contact-support">
            <div className="support-card">
              <h3>Need Help?</h3>
              <p>If you have any questions about your order, our customer support team is here to help!</p>
              <div className="contact-methods">
                <Link to="/contact" className="contact-method">
                  <span className="method-icon">📞</span>
                  <span>Contact Support</span>
                </Link>
                <a href="mailto:support@rbsgrocery.com" className="contact-method">
                  <span className="method-icon">📧</span>
                  <span>Email Us</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccess;