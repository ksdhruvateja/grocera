import React, { useEffect, useState } from 'react';
import { Search, Plus, UserX, CheckCircle, Clock, DollarSign } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';

const CoAdminTable = () => {
  const [coAdmins, setCoAdmins] = useState([]);
  const [priceChangeRequests, setPriceChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoAdminEmail, setNewCoAdminEmail] = useState('');

  useEffect(() => {
    fetchCoAdmins();
    fetchPriceChangeRequests();
  }, []);

  const fetchCoAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/admin/co-admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoAdmins(data);
    } catch (error) {
      console.error('Failed to fetch co-admins:', error);
      toast.error('Failed to load co-admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceChangeRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/admin/price-change-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPriceChangeRequests(data);
    } catch (error) {
      console.error('Failed to fetch price change requests:', error);
    }
  };

  const addCoAdmin = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/admin/co-admins',
        { email: newCoAdminEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Co-admin added successfully');
      setShowAddModal(false);
      setNewCoAdminEmail('');
      fetchCoAdmins();
    } catch (error) {
      console.error('Failed to add co-admin:', error);
      toast.error(error.response?.data?.message || 'Failed to add co-admin');
    }
  };

  const removeCoAdmin = async (coAdminId) => {
    if (!window.confirm('Are you sure you want to remove this co-admin?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/co-admins/${coAdminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Co-admin removed successfully');
      fetchCoAdmins();
    } catch (error) {
      console.error('Failed to remove co-admin:', error);
      toast.error('Failed to remove co-admin');
    }
  };

  const approvePriceChange = async (requestId, approved) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/api/admin/price-change-requests/${requestId}`,
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(approved ? 'Price change approved' : 'Price change rejected');
      fetchPriceChangeRequests();
    } catch (error) {
      console.error('Failed to process price change:', error);
      toast.error('Failed to process price change');
    }
  };

  const filteredCoAdmins = coAdmins.filter(coAdmin =>
    coAdmin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coAdmin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Co-Admins Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">Co-Admins</h2>
              
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search co-admins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none w-64"
                  />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Co-Admin
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Co-Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Added On</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Permissions</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCoAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      No co-admins found
                    </td>
                  </tr>
                ) : (
                  filteredCoAdmins.map((coAdmin) => (
                    <tr key={coAdmin._id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {coAdmin.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-white">{coAdmin.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{coAdmin.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {new Date(coAdmin.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Price Management
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeCoAdmin(coAdmin._id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove Co-Admin"
                        >
                          <UserX size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Change Requests */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Price Change Requests</h2>
          </div>

          <div className="p-6">
            {priceChangeRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No pending price change requests
              </div>
            ) : (
              <div className="space-y-4">
                {priceChangeRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-orange-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={20} className="text-orange-400" />
                          <h3 className="text-lg font-semibold text-white">
                            {request.product?.name}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <span className="text-xs text-gray-400">Current Price</span>
                            <div className="text-sm font-medium text-gray-300">
                              {formatCurrency(request.currentPrice)}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Proposed Price</span>
                            <div className="text-sm font-medium text-orange-400">
                              {formatCurrency(request.proposedPrice)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={14} />
                          Requested by {request.requestedBy?.name} on{' '}
                          {new Date(request.createdAt).toLocaleString()}
                        </div>
                        {request.reason && (
                          <div className="mt-2 text-sm text-gray-300">
                            <span className="text-gray-400">Reason:</span> {request.reason}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => approvePriceChange(request._id, true)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => approvePriceChange(request._id, false)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <UserX size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Co-Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Add Co-Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={addCoAdmin} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={newCoAdminEmail}
                  onChange={(e) => setNewCoAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  User must already have an account with customer role
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  Add Co-Admin
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CoAdminTable;
