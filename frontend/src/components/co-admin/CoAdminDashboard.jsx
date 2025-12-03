import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CoAdminDashboard = ({ socket }) => {
  const [stats, setStats] = useState({
    pendingOrders: 0,
    pendingPriceRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [recentPriceRequests, setRecentPriceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    // Listen for price approval/rejection from admin
    socket.on('priceApprovalUpdate', (data) => {
      const status = data.approved ? 'approved' : 'rejected';
      toast.success(
        `Price change request ${status} for ${data.productName}`,
        {
          icon: data.approved ? '✅' : '❌',
          duration: 5000,
        }
      );
      fetchDashboardData(); // Refresh data
    });

    // Listen for new orders
    socket.on('orderCreated', (order) => {
      toast.success(`New order #${order.orderId} received!`);
      fetchDashboardData();
    });

    return () => {
      socket.off('priceApprovalUpdate');
      socket.off('orderCreated');
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsRes, ordersRes, requestsRes] = await Promise.all([
        axios.get('/api/co-admin/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/co-admin/orders?status=pending&limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/co-admin/price-requests?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(statsRes.data);
      setPendingOrders(ordersRes.data);
      setRecentPriceRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'badge badge-warning',
    approved: 'badge badge-success',
    rejected: 'badge badge-danger',
  };

  const cards = [
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
      action: () => navigate('/co-admin/orders'),
    },
    {
      title: 'Pending Requests',
      value: stats.pendingPriceRequests,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-400',
      action: () => navigate('/co-admin/price-requests'),
    },
    {
      title: 'Approved Requests',
      value: stats.approvedRequests,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-400',
    },
    {
      title: 'Rejected Requests',
      value: stats.rejectedRequests,
      icon: XCircle,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-400',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-dark-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold text-gradient mb-2">Co-Admin Dashboard</h1>
        <p className="text-gray-300">Manage orders and submit price change requests</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={card.action}
            className={`card-dark rounded-xl p-6 hover-lift animate-fade-in overflow-hidden ${
              card.action ? 'cursor-pointer' : ''
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-all duration-300`}></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color} shadow-glow`}>
                  <card.icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">{card.title}</h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>

            {/* Glow Effect on Hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-transparent"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="p-6 border-b border-dark-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gradient">Pending Orders</h2>
            <button
              onClick={() => navigate('/co-admin/orders')}
              className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="p-6">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
                <p>No pending orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-dark-800/50 rounded-lg p-4 hover:bg-dark-700/50 transition-all hover:scale-[1.02] cursor-pointer"
                    onClick={() => navigate(`/co-admin/orders/${order._id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-primary-400">
                        #{order.orderId || order._id.slice(-8)}
                      </span>
                      <span className="text-base font-bold text-green-400 currency">
                        {order.totalAmount}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">{order.user?.name || 'Guest'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {order.items?.length || 0} items • {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Price Requests */}
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="p-6 border-b border-dark-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gradient">Recent Price Requests</h2>
            <button
              onClick={() => navigate('/co-admin/price-requests')}
              className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="p-6">
            {recentPriceRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
                <p>No price requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPriceRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-dark-800/50 rounded-lg p-4 hover:bg-dark-700/50 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-1">
                          {request.product?.name}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-400 line-through">
                            {formatCurrency(request.currentPrice)}
                          </span>
                          <span className="text-orange-400 font-semibold">
                            {formatCurrency(request.proposedPrice)}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        statusColors[request.status] || statusColors.pending
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle size={24} className="text-blue-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Co-Admin Permissions</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• View and manage orders</li>
              <li>• Add and manage products</li>
              <li>• Request price changes (requires admin approval)</li>
              <li>• Receive real-time notifications for approval status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoAdminDashboard;
