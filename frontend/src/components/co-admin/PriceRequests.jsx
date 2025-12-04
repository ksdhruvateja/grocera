import React, { useEffect, useState } from 'react';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';

const PriceRequests = ({ socket }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 10;

  const statusConfig = {
    pending: {
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      icon: Clock,
      label: 'Pending',
    },
    approved: {
      color: 'bg-green-500/20 text-green-400 border-green-500/50',
      icon: CheckCircle,
      label: 'Approved',
    },
    rejected: {
      color: 'bg-red-500/20 text-red-400 border-red-500/50',
      icon: XCircle,
      label: 'Rejected',
    },
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    socket.on('priceApprovalUpdate', (data) => {
      // Update the request in the list
      setRequests(prev =>
        prev.map(req =>
          req._id === data.requestId
            ? { ...req, status: data.approved ? 'approved' : 'rejected' }
            : req
        )
      );

      // Show notification
      const status = data.approved ? 'approved' : 'rejected';
      const statusEmoji = data.approved ? '✅' : '❌';
      
      toast(
        `Price change ${status} for ${data.productName}`,
        {
          icon: statusEmoji,
          duration: 5000,
          style: {
            background: '#1F2937',
            color: '#fff',
            border: `1px solid ${data.approved ? '#10B981' : '#EF4444'}`,
          },
        }
      );
    });

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('priceApprovalUpdate');
      }
    };
  }, [socket]);

  useEffect(() => {
    let result = requests;

    if (statusFilter !== 'all') {
      result = result.filter(req => req.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(req =>
        req.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(result);
    setCurrentPage(1);
  }, [requests, statusFilter, searchTerm]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/co-admin/price-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch price requests:', error);
      toast.error('Failed to load price requests');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Price Change Requests</h2>
            <p className="text-sm text-gray-400">Track your submitted price change requests</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none w-full sm:w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="p-6">
        {currentRequests.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'No requests match your filters'
                : 'No price change requests submitted yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentRequests.map((request) => {
              const config = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const priceChange = request.proposedPrice - request.currentPrice;
              const percentChange = ((priceChange / request.currentPrice) * 100).toFixed(1);
              
              return (
                <div
                  key={request._id}
                  className="bg-gray-700/50 rounded-lg p-5 border border-gray-600 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {request.product?.name || 'Unknown Product'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.color}`}>
                          <StatusIcon size={14} />
                          {config.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Current Price</span>
                          <div className="text-sm font-medium text-gray-300">
                            {formatCurrency(request.currentPrice)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Proposed Price</span>
                          <div className="text-sm font-medium text-blue-400">
                            {formatCurrency(request.proposedPrice)}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block mb-1">Change</span>
                          <div className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange)} ({priceChange >= 0 ? '+' : ''}{percentChange}%)
                          </div>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="bg-gray-800/50 rounded p-3 mb-3">
                          <span className="text-xs text-gray-400 block mb-1">Reason:</span>
                          <p className="text-sm text-gray-300">{request.reason}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Submitted: {new Date(request.createdAt).toLocaleString()}
                        </div>
                        {request.status !== 'pending' && request.updatedAt && (
                          <div className="flex items-center gap-1">
                            {request.status === 'approved' ? (
                              <CheckCircle size={14} className="text-green-400" />
                            ) : (
                              <XCircle size={14} className="text-red-400" />
                            )}
                            {request.status === 'approved' ? 'Approved' : 'Rejected'}: {new Date(request.updatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Response */}
                  {request.adminNote && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-orange-400 font-medium block mb-1">Admin Note:</span>
                          <p className="text-sm text-gray-300">{request.adminNote}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, filteredRequests.length)} of{' '}
            {filteredRequests.length} requests
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

      {/* Summary Stats */}
      <div className="p-6 border-t border-gray-700 bg-gray-700/30">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{requests.filter(r => r.status === 'pending').length}</div>
            <div className="text-xs text-gray-400 mt-1">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{requests.filter(r => r.status === 'approved').length}</div>
            <div className="text-xs text-gray-400 mt-1">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{requests.filter(r => r.status === 'rejected').length}</div>
            <div className="text-xs text-gray-400 mt-1">Rejected</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceRequests;
