import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import '../styles/pages/AdminDashboard.css';

function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    sales: { day: 0, week: 0, month: 0 },
    orders: { pending: 0, delivered: 0, total: 0 },
    profits: { day: 0, week: 0, month: 0 },
    products: { total: 0, lowStock: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      // Auto-refresh dashboard every 30 seconds to show new orders immediately
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      // Fetch real dashboard data from backend
      const dashboardResponse = await fetch(`${API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await dashboardResponse.json();

      // Calculate sales and profits for different periods
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - 1);

      // Fetch orders for calculations
      const ordersResponse = await fetch(`${API_URL}/admin/orders?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let allOrders = [];
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        allOrders = ordersData.orders || [];
      }

      // Calculate sales and profits by period
      const calculatePeriodData = (orders, startDate) => {
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startDate && order.paymentStatus === 'completed';
        });

        const sales = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const profit = filteredOrders.reduce((sum, order) => {
          const orderProfit = order.items?.reduce((itemSum, item) => {
            const itemCost = item.product?.cost || 0;
            const itemPrice = item.price || 0;
            const itemQuantity = item.quantity || 0;
            return itemSum + ((itemPrice - itemCost) * itemQuantity);
          }, 0) || 0;
          return sum + orderProfit;
        }, 0);

        return { sales, profit };
      };

      const dayData = calculatePeriodData(allOrders, todayStart);
      const weekData = calculatePeriodData(allOrders, weekStart);
      const monthData = calculatePeriodData(allOrders, monthStart);

      // Count orders by status
      const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered').length;

      // Fetch products data
      const productsResponse = await fetch(`${API_URL}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let totalProducts = 0;
      let lowStockProducts = 0;
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.products || productsData.data || [];
        totalProducts = products.length;
        lowStockProducts = products.filter(p => (p.quantity || 0) < 10).length;
      }

      // Format recent orders from backend
      const formattedRecentOrders = (dashboardData.recentOrders || []).map(order => {
        const customerName = order.user?.name || 
                            `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() ||
                            order.user?.email?.split('@')[0] ||
                            'Customer';
        
        const items = order.items?.map(item => 
          item.product?.name || item.name || 'Unknown Item'
        ) || [];

        // Calculate profit for this order
        const orderProfit = order.items?.reduce((sum, item) => {
          const itemCost = item.product?.cost || 0;
          const itemPrice = item.price || 0;
          const itemQuantity = item.quantity || 0;
          return sum + ((itemPrice - itemCost) * itemQuantity);
        }, 0) || 0;

        return {
          id: order.orderNumber || order._id?.slice(-8) || 'N/A',
          customer: customerName,
          items: items,
          total: order.totalAmount || 0,
          profit: orderProfit,
          status: order.status || 'pending',
          date: new Date(order.createdAt).toLocaleDateString()
        };
      });

      setStats({
        sales: {
          day: dayData.sales,
          week: weekData.sales,
          month: monthData.sales
        },
        orders: {
          pending: pendingOrders,
          delivered: deliveredOrders,
          total: allOrders.length
        },
        profits: {
          day: dayData.profit,
          week: weekData.profit,
          month: monthData.profit
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts
        }
      });
      setRecentOrders(formattedRecentOrders);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data on error
      setStats({
        sales: { day: 0, week: 0, month: 0 },
        orders: { pending: 0, delivered: 0, total: 0 },
        profits: { day: 0, week: 0, month: 0 },
        products: { total: 0, lowStock: 0 }
      });
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff6b00';
      case 'delivered': return '#128807';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-section">
          <div className="loading-spinner-large">
            <div className="spinner-large"></div>
          </div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.name}! Here's your store overview.</p>
        </div>
        
        <div className="period-selector">
          <button 
            className={`period-btn ${selectedPeriod === 'day' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('day')}
          >
            Today
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Sales & Profit Cards */}
        <div className="stats-row">
          <div className="stat-card sales-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Sales ({selectedPeriod})</h3>
              <div className="stat-value">${stats.sales[selectedPeriod].toLocaleString()}</div>
              <div className="stat-subtext">Total Revenue</div>
            </div>
          </div>

          <div className="stat-card profit-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>Profit ({selectedPeriod})</h3>
              <div className="stat-value">${stats.profits[selectedPeriod].toLocaleString()}</div>
              <div className="stat-subtext">Net Profit</div>
            </div>
          </div>

          <div className="stat-card orders-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Orders</h3>
              <div className="stat-value">{stats.orders.total}</div>
              <div className="stat-subtext">
                {stats.orders.pending} Pending • {stats.orders.delivered} Delivered
              </div>
            </div>
          </div>

          <div className="stat-card products-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-content">
              <h3>Products</h3>
              <div className="stat-value">{stats.products.total}</div>
              <div className="stat-subtext">
                {stats.products.lowStock} Low Stock
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/admin/pricing" className="action-btn price-management">
              <div className="action-icon">💲</div>
              <span>Price Management</span>
            </Link>
            
            <Link to="/admin/products" className="action-btn add-product">
              <div className="action-icon">➕</div>
              <span>Add Product</span>
            </Link>
            
            <button className="action-btn upload-images">
              <div className="action-icon">🖼️</div>
              <span>Upload Images</span>
            </button>
            
            <Link to="/admin/orders" className="action-btn order-management">
              <div className="action-icon">📋</div>
              <span>Manage Orders</span>
            </Link>
            
            <button className="action-btn sales-report">
              <div className="action-icon">📊</div>
              <span>Sales Report</span>
            </button>
            
            <Link to="/admin/users" className="action-btn customer-management">
              <div className="action-icon">👥</div>
              <span>Customers</span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <button className="view-all-btn">View All Orders</button>
          </div>
          
          <div className="orders-table">
            <div className="table-header">
              <div className="col-order-id">Order ID</div>
              <div className="col-customer">Customer</div>
              <div className="col-items">Items</div>
              <div className="col-total">Total</div>
              <div className="col-profit">Profit</div>
              <div className="col-status">Status</div>
              <div className="col-date">Date</div>
            </div>
            
            {recentOrders.length === 0 ? (
              <div className="table-row" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  No orders yet. Orders will appear here when customers place them.
                </div>
              </div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="table-row">
                  <div className="col-order-id">
                    <span className="order-id">{order.id}</span>
                  </div>
                  <div className="col-customer">{order.customer}</div>
                  <div className="col-items">
                    <span className="items-preview">
                      {order.items.length > 0 ? order.items.slice(0, 3).join(', ') + (order.items.length > 3 ? '...' : '') : 'No items'}
                    </span>
                  </div>
                  <div className="col-total">
                    <span className="total-amount">${order.total.toFixed(2)}</span>
                  </div>
                  <div className="col-profit">
                    <span className="profit-amount">${order.profit.toFixed(2)}</span>
                  </div>
                  <div className="col-status">
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="col-date">{order.date}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Charts */}
        <div className="performance-section">
          <h2>Performance Overview</h2>
          <div className="chart-cards">
            <div className="chart-card">
              <h3>Sales vs Profit Margin</h3>
              <div className="chart-placeholder">
                <div className="chart-bar sales-bar" style={{height: '80%'}}>
                  <span>Sales</span>
                </div>
                <div className="chart-bar profit-bar" style={{height: '60%'}}>
                  <span>Profit</span>
                </div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color sales-color"></div>
                  <span>Sales Revenue</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color profit-color"></div>
                  <span>Net Profit</span>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Order Status Distribution</h3>
              <div className="pie-chart-placeholder">
                <div className="pie-segment pending" style={{transform: 'rotate(0deg)'}}>
                  <span>Pending<br/>{stats.orders.pending}</span>
                </div>
                <div className="pie-segment delivered" style={{transform: 'rotate(120deg)'}}>
                  <span>Delivered<br/>{stats.orders.delivered}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;