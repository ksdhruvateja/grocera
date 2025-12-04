import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Package, AlertCircle, DollarSign } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';

const ProductsTable = ({ socket }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const productsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    originalPrice: '',
    listedPrice: '',
    stock: '',
    image: '',
    inStock: true,
  });

  const [priceRequestData, setPriceRequestData] = useState({
    proposedPrice: '',
    reason: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Ensure products is an array
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }

    let result = products;

    if (categoryFilter !== 'all') {
      result = result.filter(product => product.category === categoryFilter);
    }

    if (searchTerm) {
      result = result.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, categoryFilter, searchTerm]);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/products');
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProducts(data);
      } else if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = (original, listed) => {
    if (!original || !listed) return 0;
    return (((original - listed) / original) * 100).toFixed(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        originalPrice: parseFloat(formData.originalPrice),
        listedPrice: parseFloat(formData.listedPrice),
        stock: parseInt(formData.stock),
      };

      if (editingProduct) {
        await axios.put(`/api/co-admin/products/${editingProduct._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/co-admin/products', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product created successfully');
      }

      fetchProducts();
      closeModal();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/co-admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handlePriceRequest = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/co-admin/price-requests',
        {
          productId: selectedProduct._id,
          currentPrice: selectedProduct.listedPrice,
          proposedPrice: parseFloat(priceRequestData.proposedPrice),
          reason: priceRequestData.reason,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Price change request submitted successfully');
      
      // Emit socket event to notify admin
      if (socket) {
        socket.emit('priceRequestSubmitted', {
          productId: selectedProduct._id,
          productName: selectedProduct.name,
          currentPrice: selectedProduct.listedPrice,
          proposedPrice: parseFloat(priceRequestData.proposedPrice),
        });
      }

      closePriceRequestModal();
    } catch (error) {
      console.error('Failed to submit price request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit price request');
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        originalPrice: product.originalPrice,
        listedPrice: product.listedPrice,
        stock: product.stock,
        image: product.image,
        inStock: product.inStock,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        originalPrice: '',
        listedPrice: '',
        stock: '',
        image: '',
        inStock: true,
      });
    }
    setShowModal(true);
  };

  const openCreateModal = () => openModal(null);
  const openEditModal = (product) => openModal(product);

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const openPriceRequestModal = (product) => {
    setSelectedProduct(product);
    setPriceRequestData({
      proposedPrice: product.listedPrice,
      reason: '',
    });
    setShowPriceRequestModal(true);
  };

  const closePriceRequestModal = () => {
    setShowPriceRequestModal(false);
    setSelectedProduct(null);
    setPriceRequestData({ proposedPrice: '', reason: '' });
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = Array.isArray(filteredProducts) ? filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct) : [];
  const totalPages = Array.isArray(filteredProducts) ? Math.ceil(filteredProducts.length / productsPerPage) : 0;

  const categories = Array.isArray(products) ? [...new Set(products.map(p => p.category))] : [];

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
    <div>
      <div className="card-dark rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-2xl font-bold text-gradient">Products Management</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-dark pl-10 w-full sm:w-64"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-dark"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                onClick={openCreateModal}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Image</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4">
                      <img
                        src={product.image || '/placeholder.jpg'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white max-w-xs truncate">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{product.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-400">
                        {formatCurrency(product.listedPrice)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package size={16} className={product.stock < 10 ? 'text-red-400' : 'text-gray-400'} />
                        <span className={`text-sm ${product.stock < 10 ? 'text-red-400' : 'text-gray-300'}`}>
                          {product.stock}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.inStock
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPriceRequestModal(product)}
                          className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all hover:scale-110"
                          title="Request Price Change"
                        >
                          <DollarSign size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all hover:scale-110"
                          title="Edit Product"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all hover:scale-110"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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
              Showing {indexOfFirstProduct + 1} to {Math.min(indexOfLastProduct, filteredProducts.length)} of{' '}
              {filteredProducts.length} products
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="modal-content rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  rows="3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Original Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Listed Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.listedPrice}
                    onChange={(e) => setFormData({ ...formData, listedPrice: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="inStock" className="text-sm text-gray-300">
                  Product is in stock
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Change Request Modal */}
      {showPriceRequestModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Request Price Change</h3>
              <button onClick={closePriceRequestModal} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handlePriceRequest} className="p-6 space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">{selectedProduct.name}</h4>
                <div className="text-sm text-gray-400">
                  Current Price: <span className="text-white font-semibold">{formatCurrency(selectedProduct.listedPrice)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proposed New Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceRequestData.proposedPrice}
                  onChange={(e) => setPriceRequestData({ ...priceRequestData, proposedPrice: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {priceRequestData.proposedPrice && selectedProduct.listedPrice && (
                <div className={`bg-${parseFloat(priceRequestData.proposedPrice) < selectedProduct.listedPrice ? 'red' : 'green'}-500/10 border border-${parseFloat(priceRequestData.proposedPrice) < selectedProduct.listedPrice ? 'red' : 'green'}-500/30 rounded-lg p-3`}>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle size={16} />
                    <span>
                      Change: {formatCurrency(parseFloat(priceRequestData.proposedPrice) - selectedProduct.listedPrice)}
                      {' '}({((parseFloat(priceRequestData.proposedPrice) - selectedProduct.listedPrice) / selectedProduct.listedPrice * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Change
                </label>
                <textarea
                  value={priceRequestData.reason}
                  onChange={(e) => setPriceRequestData({ ...priceRequestData, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  rows="3"
                  placeholder="Explain why this price change is needed..."
                  required
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-gray-300">
                  <AlertCircle size={14} className="inline mr-1" />
                  This request will be sent to the admin for approval. You'll receive a notification once it's reviewed.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={closePriceRequestModal}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTable;
