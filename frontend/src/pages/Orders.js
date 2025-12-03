import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Orders.css';

function Orders() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  // Removed unused setProcessingPayment

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your orders');
        setLoading(false);
        return;
      }
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/orders${filter !== 'all' ? `?status=${filter}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const responseData = await response.json();
        const ordersData = responseData.data?.orders || responseData.orders || responseData.data || [];
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } else if (response.status === 401) {
        setError('Please log in to view your orders');
      } else {
        setError('Failed to load orders. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Error loading orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
    if (searchParams.get('canceled') === 'true') {
      const orderId = searchParams.get('order_id');
      if (orderId) {
        fetchOrders();
      }
    }
  }, [isAuthenticated, filter, searchParams, fetchOrders]);


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return '#128807';
      case 'processing':
      case 'confirmed':
        return '#2196F3';
      case 'shipped':
        return '#FF9800';
      case 'cancelled':
      case 'refunded':
        return '#ef4444';
      case 'pending':
      default:
        return '#ff6b00';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePayRemaining = (orderId, remainingAmount) => {
    // Redirect to payment page
    navigate(`/payment?orderId=${orderId}&remaining=true`);
  };

  const handlePayExtra = (orderId) => {
    // Redirect to payment page for extra payment
    navigate(`/payment?orderId=${orderId}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="orders-container">
        <div className="container">
          <div className="orders-empty">
            <h2>Please Log In</h2>
            <p>You need to be logged in to view your order history.</p>
            <Link to="/login" className="btn btn-primary">
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-container">
        <div className="container">
          <div className="loading-section">
            <div className="spinner-large"></div>
            <p>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <div className="container">
          <div className="orders-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchOrders} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status?.toLowerCase() === filter.toLowerCase());

  return (
    <div className="orders-container">
      <div className="container">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>View your order history and track your deliveries</p>
        </div>

        <div className="orders-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'processing' ? 'active' : ''}`}
            onClick={() => setFilter('processing')}
          >
            Processing
          </button>
          <button
            className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <div className="empty-icon">📦</div>
            <h2>No Orders Found</h2>
            <p>
              {filter === 'all' 
                ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                : `No ${filter} orders found.`}
            </p>
            <Link to="/products" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order.id || order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <div className="order-number-section">
                      <h3>Order #{order.orderNumber || order._id?.slice(-8)?.toUpperCase()}</h3>
                      <button
                        className="btn-pay-extra-header"
                        onClick={() => handlePayExtra(order._id || order.id)}
                        title="Pay additional or pending charges for this order"
                      >
                        💰 Pay Additional / Pending Charges
                      </button>
                    </div>
                    <p className="order-date">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="order-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-summary">
                    <div className="summary-item">
                      <span className="label">Items:</span>
                      <span className="value">{order.itemCount || order.items?.length || 0} item(s)</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Subtotal:</span>
                      <span className="value">${order.subtotal || order.subtotalAmount || '0.00'}</span>
                    </div>
                    {order.taxAmount > 0 && (
                      <div className="summary-item">
                        <span className="label">Tax:</span>
                        <span className="value">${order.taxAmount || '0.00'}</span>
                      </div>
                    )}
                    {order.shippingAmount > 0 && (
                      <div className="summary-item">
                        <span className="label">Shipping:</span>
                        <span className="value">${order.shippingAmount || '0.00'}</span>
                      </div>
                    )}
                    <div className="summary-item total">
                      <span className="label">Total:</span>
                      <span className="value">${order.totalAmount || '0.00'}</span>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="order-items">
                      <h4>Items:</h4>
                      <div className="items-list">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item">
                            <div className="item-info">
                              <span className="item-name">
                                {item.productName || item.product?.name || item.name}
                                {item.selectedWeight && ` (${item.selectedWeight} lb)`}
                              </span>
                              <span className="item-quantity">Qty: {item.quantity}</span>
                            </div>
                            <span className="item-price">
                              ${((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.estimatedDelivery && (
                    <div className="delivery-info">
                      <p>
                        <strong>Estimated Delivery:</strong>{' '}
                        {formatDate(order.estimatedDelivery)}
                      </p>
                    </div>
                  )}

                  {/* Admin Requested Payment */}
                  {order.requestedPaymentAmount > 0 && (
                    <div className="requested-payment-section">
                      <div className="requested-payment-info">
                        <p className="requested-amount-label">
                          <strong>💰 Payment Requested by Admin:</strong>
                        </p>
                        <p className="requested-amount-value">
                          ${order.requestedPaymentAmount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        className="btn-pay-requested"
                        onClick={() => navigate(`/payment?orderId=${order._id || order.id}&requested=true&amount=${order.requestedPaymentAmount}`)}
                      >
                        💳 Pay Requested Amount
                      </button>
                    </div>
                  )}

                  {/* Payment Status and Payment Buttons */}
                  {order.paymentStatus === 'partial' && order.remainingAmount > 0 && (
                    <div className="payment-remaining-section">
                      <div className="remaining-payment-info">
                        <p className="remaining-amount-label">
                          <strong>Remaining Amount:</strong>
                        </p>
                        <p className="remaining-amount-value">
                          ${order.remainingAmount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        className="btn-pay-remaining"
                        onClick={() => handlePayRemaining(order._id || order.id, order.remainingAmount)}
                      >
                        💳 Pay Remaining Amount
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;
