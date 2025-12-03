import React, { useState, useEffect } from 'react';
import './AdminOrders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, processing, delivered, cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [requestPaymentModal, setRequestPaymentModal] = useState({ show: false, orderId: null, orderNumber: '' });
  const [requestAmount, setRequestAmount] = useState('');
  // No unused variables or unreachable code found

  // Load orders from backend
  useEffect(() => {
    loadOrders();
    // Auto-refresh orders every 5 seconds to show new orders immediately
    const interval = setInterval(() => {
      loadOrders();
    }, 5000); // 5 seconds for real-time updates
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/admin/orders?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const ordersData = data.orders || data.data || [];
        console.log('✅ Loaded orders:', ordersData.length, 'Total:', data.totalOrders || ordersData.length);
        if (ordersData.length > 0) {
          console.log('📦 Sample order:', {
            id: ordersData[0]._id,
            orderNumber: ordersData[0].orderNumber,
            status: ordersData[0].status,
            paymentMethod: ordersData[0].paymentMethod,
            paymentCards: ordersData[0].paymentCards,
            items: ordersData[0].items?.length || 0,
            createdAt: ordersData[0].createdAt
          });
          setError('');
        } else {
          console.log('⚠️ No orders found in database');
          setError('No orders found. Orders will appear here when customers place them.');
        }
        setOrders(ordersData);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Failed to load orders:', response.status, errorData);
        setError(`Failed to load orders: ${errorData.message || 'Server error'}`);
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      setError(`Network error: ${error.message}. Please check your connection.`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setOrders(prev => 
          prev.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        alert(`Order ${newStatus} successfully!`);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const handleRequestPayment = (orderId, orderNumber) => {
    setRequestPaymentModal({ show: true, orderId, orderNumber });
    setRequestAmount('');
  };

  const handleCancelRequestPayment = () => {
    setRequestPaymentModal({ show: false, orderId: null, orderNumber: '' });
    setRequestAmount('');
  };

  const submitRequestPayment = async () => {
    if (!requestAmount || parseFloat(requestAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/orders/${requestPaymentModal.orderId}/request-payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parseFloat(requestAmount) })
      });

      if (response.ok) {
        setOrders(prev => 
          prev.map(order => 
            order._id === requestPaymentModal.orderId 
              ? { ...order, requestedPaymentAmount: parseFloat(requestAmount), requestedPaymentAt: new Date() }
              : order
          )
        );
        alert('Payment request sent to customer successfully!');
        handleCancelRequestPayment();
        loadOrders(); // Refresh to get updated data
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to request payment');
      }
    } catch (error) {
      console.error('Error requesting payment:', error);
      alert('Failed to request payment');
    }
  };

  const handleCancelPaymentRequest = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/orders/${orderId}/cancel-payment-request`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { ...order, requestedPaymentAmount: undefined, requestedPaymentAt: undefined }
              : order
          )
        );
        alert('Payment request cancelled');
        loadOrders();
      } else {
        alert('Failed to cancel payment request');
      }
    } catch (error) {
      console.error('Error cancelling payment request:', error);
      alert('Failed to cancel payment request');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const customerName = `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim();
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order._id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#9b59b6';
      case 'processing': return '#3498db';
      case 'shipped': return '#16a085';
      case 'delivered': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.subtotal || (item.price * item.quantity)), 0).toFixed(2);
  };

  if (loading) {
    return (
      <div className="admin-orders-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders-container">
      <div className="orders-header">
        <h1>Manage Orders</h1>
        <div className="orders-controls">
          <button 
            onClick={loadOrders} 
            className="refresh-btn"
            disabled={loading}
            title="Refresh orders"
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by customer name, email, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdown">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: '#c33'
        }}>
          ⚠️ {error}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <p>No orders found.</p>
          {filter === 'all' && orders.length === 0 && (
            <div>
              <p>Orders will appear here when customers place them.</p>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#7f8c8d' }}>
                Check browser console (F12) for debugging information.
              </p>
            </div>
          )}
          {filter !== 'all' && (
            <p>Try changing the filter to see more orders.</p>
          )}
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <div className="order-number-section">
                    <h3>Order #{order.orderNumber || order._id?.slice(-8)}</h3>
                    <button
                      className="btn-request-payment"
                      onClick={() => handleRequestPayment(order._id, order.orderNumber)}
                      title="Request additional payment from customer"
                    >
                      💰 Request Payment
                    </button>
                  </div>
                  <p className="order-date">{formatDate(order.createdAt)}</p>
                  {order.requestedPaymentAmount && (
                    <div className="requested-payment-badge">
                      <span>💰 Payment Requested: ${order.requestedPaymentAmount.toFixed(2)}</span>
                      <button
                        className="btn-cancel-request"
                        onClick={() => handleCancelPaymentRequest(order._id)}
                        title="Cancel payment request"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="customer-details">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {order.shippingAddress?.firstName || ''} {order.shippingAddress?.lastName || ''}</p>
                <p><strong>Email:</strong> {order.user?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {order.shippingAddress?.phone || 'N/A'}</p>
                <div className="address">
                  <strong>Location/Address:</strong>
                  <p>{order.shippingAddress?.street || 'N/A'}</p>
                  <p>{order.shippingAddress?.city || ''}, {order.shippingAddress?.state || ''} {order.shippingAddress?.zipCode || ''}</p>
                </div>
                <div className="payment-method-info">
                  <strong>Payment Method:</strong>
                  <span className="payment-method-badge">
                    {order.paymentMethod === 'otc' ? '💊 OTC Card' : 
                     order.paymentMethod === 'ebt' ? '🛒 EBT Card' : 
                     order.paymentMethod === 'stripe' || order.paymentMethod === 'credit' ? '💳 Credit/Debit Card' :
                     order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}
                  </span>
                </div>

                {/* Display OTC/EBT Card Details */}
                {(order.paymentMethod === 'otc' || order.paymentMethod === 'ebt') && (
                  <div className="card-details-section">
                    <h4>💳 Card Details for Processing</h4>
                    {order.paymentCards && order.paymentCards.length > 0 ? (
                      order.paymentCards.map((card, cardIndex) => {
                        // Remove any masking characters and ensure full card number and PIN are displayed
                        // Get the raw card number first
                        const rawCardNumber = card.cardNumber || '';
                        // Remove all masking characters (asterisks, spaces, hyphens, X's that might be used for masking)
                        const fullCardNumber = rawCardNumber 
                          ? String(rawCardNumber)
                              .replace(/\*/g, '')
                              .replace(/\s/g, '')
                              .replace(/-/g, '')
                              .replace(/X/gi, '')
                              .replace(/x/gi, '')
                              .trim()
                          : 'N/A';
                        
                        const rawPin = card.pin || '';
                        const fullPin = rawPin 
                          ? String(rawPin)
                              .replace(/\*/g, '')
                              .replace(/\s/g, '')
                              .replace(/-/g, '')
                              .replace(/X/gi, '')
                              .replace(/x/gi, '')
                              .trim()
                          : 'N/A';
                        
                        // Debug logging
                        if (rawCardNumber && rawCardNumber !== fullCardNumber) {
                          console.log('Card number cleaned:', { raw: rawCardNumber, cleaned: fullCardNumber });
                        }
                        
                        return (
                        <div key={cardIndex} className="card-detail-card">
                          <div className="card-detail-header">
                            <strong>Card {cardIndex + 1} ({card.type?.toUpperCase() || order.paymentMethod?.toUpperCase() || 'N/A'})</strong>
                            <span className="card-amount">${card.amount?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="card-detail-info">
                            <div className="card-detail-row">
                              <span className="card-label">Cardholder Name:</span>
                              <span className="card-value">{card.name || 'N/A'}</span>
                            </div>
                            <div className="card-detail-row">
                              <span className="card-label">Full Card Number:</span>
                              <span className="card-value card-number">
                                {fullCardNumber}
                              </span>
                            </div>
                            <div className="card-detail-row">
                              <span className="card-label">PIN:</span>
                              <span className="card-value card-pin">
                                {fullPin}
                              </span>
                            </div>
                            <div className="card-detail-row">
                              <span className="card-label">Amount:</span>
                              <span className="card-value">${card.amount?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="card-detail-card">
                        <p style={{ color: '#e74c3c', fontWeight: '600' }}>
                          ⚠️ Card details not available. Payment method: {order.paymentMethod || 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="order-items">
                <h4>📦 Items to Ship ({order.items?.length || 0} items)</h4>
                {order.items && order.items.length > 0 ? (
                  <>
                    <div className="items-list">
                      {order.items.map((item, index) => {
                        const isVegetable = item.productCategory?.toLowerCase().includes('vegetable') || 
                                           item.productCategory === 'Fresh Vegetables' ||
                                           item.product?.category?.toLowerCase().includes('vegetable');
                        const selectedWeight = item.selectedWeight;
                        const totalWeight = selectedWeight ? (selectedWeight * item.quantity) : null;
                        const itemPrice = item.price || item.product?.price || 0;
                        const itemQuantity = item.quantity || 1;
                        // For vegetables, calculate: price per lb × weight × quantity
                        // For other items, calculate: price × quantity
                        const itemTotal = isVegetable && selectedWeight
                          ? itemPrice * selectedWeight * itemQuantity
                          : itemPrice * itemQuantity;
                        
                        return (
                          <div key={index} className="item-row">
                            <div className="item-info-full">
                              <div className="item-name-row">
                                <span className="item-name">
                                  <strong>{item.productName || item.name || item.product?.name || 'Unknown Item'}</strong>
                                </span>
                                {isVegetable ? (
                                  <span className="weight-detail">
                                    Weight: <strong>{selectedWeight || 'N/A'}</strong> lb each × <strong>{itemQuantity}</strong> = <strong>{totalWeight?.toFixed(1) || '0.0'}</strong> lb total
                                  </span>
                                ) : (
                                  <span className="quantity-detail">
                                    Quantity: <strong>{itemQuantity}</strong>
                                  </span>
                                )}
                              </div>
                              <div className="item-price-row">
                                <span className="item-price-per">${itemPrice.toFixed(2)} {isVegetable && selectedWeight ? 'per lb' : 'each'}</span>
                                <span className="item-price-total">Total: ${itemTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="order-total">
                      <div className="total-breakdown">
                        <div className="total-line">
                          <span>Subtotal:</span>
                          <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        {order.taxAmount > 0 && (
                          <div className="total-line">
                            <span>Tax (8.875%):</span>
                            <span>${order.taxAmount?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}
                        {order.shippingAmount > 0 && (
                          <div className="total-line">
                            <span>Shipping:</span>
                            <span>${order.shippingAmount?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}
                        <div className="total-line final-total">
                          <span><strong>Grand Total:</strong></span>
                          <span><strong>${order.totalAmount?.toFixed(2) || calculateTotal(order.items || [])}</strong></span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#e74c3c', fontWeight: '600' }}>⚠️ No items found in this order</p>
                )}
              </div>

              <div className="order-actions">
                <select 
                  value={order.status} 
                  onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Payment Modal */}
      {requestPaymentModal.show && (
        <div className="modal-overlay" onClick={handleCancelRequestPayment}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Additional Payment</h2>
              <button className="modal-close" onClick={handleCancelRequestPayment}>✕</button>
            </div>
            <div className="modal-body">
              <p>Order: <strong>#{requestPaymentModal.orderNumber}</strong></p>
              <div className="form-group">
                <label htmlFor="requestAmount">Amount to Request ($)</label>
                <input
                  type="number"
                  id="requestAmount"
                  step="0.01"
                  min="0.01"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelRequestPayment}>
                Cancel
              </button>
              <button className="btn-primary" onClick={submitRequestPayment}>
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}