import React, { useEffect, useState } from 'react';
import { Search, Filter, Eye, Truck, Check, X, RefreshCw } from 'lucide-react';
import { useOrders } from '../../hooks/api/useOrders';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';

const OrdersTable = ({ socket }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const ordersPerPage = 10;

  const statusColors = {
    pending: 'badge badge-warning',
    confirmed: 'badge bg-blue-500/20 text-blue-400 border-blue-500/50',
    processing: 'badge bg-purple-500/20 text-purple-400 border-purple-500/50',
    shipped: 'badge bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    delivered: 'badge badge-success',
    cancelled: 'badge badge-danger',
  };

  const { ordersQuery, updateStatus, assignAgent } = useOrders();
  const { data: ordersData, isLoading } = ordersQuery;
  
  useEffect(() => {
    if (ordersData && Array.isArray(ordersData)) {
      setOrders(ordersData);
    } else if (ordersData) {
      // Handle case where data might be an object with orders property
      setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
    }
  }, [ordersData]);

  // Real-time order updates
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    socket.on('orderCreated', (order) => {
      setOrders(prev => Array.isArray(prev) ? [order, ...prev] : [order]);
      toast.success(`New order #${order.orderId} received!`, {
        icon: '🛒',
        duration: 4000,
      });
    });

    socket.on('orderUpdated', (updatedOrder) => {
      setOrders(prev => 
        Array.isArray(prev) 
          ? prev.map(order => order._id === updatedOrder._id ? updatedOrder : order)
          : [updatedOrder]
      );
    });

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('orderCreated');
        socket.off('orderUpdated');
      }
    };
  }, [socket]);

  // Filter and search
  useEffect(() => {
    // Ensure orders is an array before filtering
    if (!Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(
        order =>
          order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(result);
    setCurrentPage(1);
  }, [orders, statusFilter, searchTerm]);

  

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { data } = await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      setOrders(prev => prev.map(order => order._id === orderId ? data : order));
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const assignDeliveryAgent = async (orderId, agentId) => {
    try {
      await assignAgent.mutateAsync({ id: orderId, agentId });
      toast.success('Delivery agent assigned successfully');
    } catch (error) {
      toast.error('Failed to assign delivery agent');
    }
  };

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = Array.isArray(filteredOrders) ? filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder) : [];
  const totalPages = Array.isArray(filteredOrders) ? Math.ceil(filteredOrders.length / ordersPerPage) : 0;

  const loading = isLoading || loadingLocal; // maintain previous skeleton state if needed
  if (loading) {
    return (
      <div className="card-dark rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-dark-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-dark rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gradient">Orders Management</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-dark w-full sm:w-64"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-dark pl-10 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <button
              onClick={() => ordersQuery.refetch()}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              currentOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-orange-400">
                      #{order.orderId || order._id.slice(-8)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {order.user?.name || 'Guest'}
                      </div>
                      <div className="text-xs text-gray-400">{order.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">
                      {order.items?.length || 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-400">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      className={`${statusColors[order.status] || statusColors.pending} cursor-pointer bg-transparent hover:opacity-80 transition-opacity`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all hover:scale-110"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => assignDeliveryAgent(order._id, 'agent123')}
                        className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-all hover:scale-110"
                        title="Assign Delivery Agent"
                      >
                        <Truck size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of{' '}
            {filteredOrders.length} orders
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
