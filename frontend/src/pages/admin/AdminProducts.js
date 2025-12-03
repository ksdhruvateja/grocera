import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearch } from '../../hooks/usePerformance';
import { OptimizedImageUpload } from '../../utils/OptimizedImage';
import '../../styles/pages/admin/AdminProducts.css';

const ProductTableRow = React.memo(({ product, onEdit, onDelete }) => {
  const calculateProfit = useCallback((price, cost) => {
    if (!price || price === 0) return '0.0';
    if (!cost || cost === 0) return 'N/A';
    const profitPercent = ((price - cost) / cost * 100);
    return profitPercent.toFixed(1);
  }, []);

  return (
    <div className="table-row">
      <div className="col-image">
        <div className="product-image-small">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name} 
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent && !parent.querySelector('.image-placeholder')) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'image-placeholder';
                  placeholder.textContent = '📦';
                  parent.appendChild(placeholder);
                }
              }}
            />
          ) : (
            <div className="image-placeholder">📦</div>
          )}
        </div>
      </div>
      <div className="col-name">
        <div className="product-name">{product.name}</div>
        <div className="product-description">{product.description}</div>
      </div>
      <div className="col-category">
        <span className="category-badge">{product.category}</span>
      </div>
      <div className="col-price">
        <span className="price">${product.price}</span>
      </div>
      <div className="col-cost">
        <span className="cost">${product.cost || 0}</span>
      </div>
      <div className="col-profit">
        <span className={`profit ${calculateProfit(product.price, product.cost) !== 'N/A' && parseFloat(calculateProfit(product.price, product.cost)) > 20 ? 'good' : 'low'}`}>
          {calculateProfit(product.price, product.cost) === 'N/A' ? 'N/A' : `${calculateProfit(product.price, product.cost)}%`}
        </span>
      </div>
      <div className="col-stock">
        <span className="stock">{product.quantity || 0}</span>
      </div>
      <div className="col-status">
        <span className={`status-badge ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
          {product.inStock ? '✅ In Stock' : '❌ Out of Stock'}
        </span>
      </div>
      <div className="col-actions">
        <button 
          className="btn-edit"
          onClick={() => onEdit(product)}
        >
          ✏️ Edit
        </button>
        <button 
          className="btn-delete"
          onClick={() => onDelete(product._id)}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
});

ProductTableRow.displayName = 'ProductTableRow';

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { searchTerm, debouncedSearchTerm, handleSearchChange } = useSearch('', 300);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Daily Essentials',
    description: '',
    image: '',
    inStock: true,
    cost: '',
    quantity: '0'
  });

  const categories = [
    'All',
    // Indian
    'Daily Essentials',
    'Fruits',
    'Vegetables',
    'Exotics', // Spices & Masalas
    'Pooja Items',
    'God Idols',
    // American
    'American Breakfast',
    'American Snacks',
    'American Sauces',
    // Chinese
    'Chinese Noodles',
    'Chinese Sauces',
    'Chinese Snacks',
    // Turkish
    'Turkish Sweets',
    'Turkish Staples',
    'Turkish Drinks'
  ];

  const productCategories = categories.filter(cat => cat !== 'All');

  // Memoized filtered products for better performance
  const filteredProducts = useMemo(() => {
    let filtered = Array.isArray(products) ? products : [];

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (debouncedSearchTerm) {
      const lowercaseSearch = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(lowercaseSearch) ||
        product.description.toLowerCase().includes(lowercaseSearch)
      );
    }

    return filtered;
  }, [products, debouncedSearchTerm, selectedCategory]);

  // Memoized statistics
  const productStats = useMemo(() => ({
    total: filteredProducts.length,
    inStock: filteredProducts.filter(p => p.inStock).length,
    outOfStock: filteredProducts.filter(p => !p.inStock).length,
    totalValue: filteredProducts.reduce((sum, p) => sum + (p.price || 0), 0)
  }), [filteredProducts]);

  useEffect(() => {
    const loadProductsData = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/admin/products`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const productsData = (await response.json()).data || (await response.json()).products || (await response.json());
          console.log('Admin loaded products:', productsData.length);
          setProducts(Array.isArray(productsData) ? productsData : []);
        } else {
          console.error('Failed to load products:', response.status);
          setProducts([]);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadProductsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = useCallback((product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        // Preserve exact price value - convert to string without rounding
        price: product.price != null ? String(product.price) : '',
        category: product.category,
        description: product.description,
        image: product.image || '',
        inStock: product.inStock,
        // Preserve exact cost value - convert to string without rounding
        cost: product.cost != null ? String(product.cost) : '',
        quantity: product.quantity?.toString() || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        category: 'Daily Essentials',
        description: '',
        image: '',
        inStock: true,
        cost: '',
        quantity: ''
      });
    }
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      category: 'Daily Essentials',
      description: '',
      image: '',
      inStock: true,
      cost: '',
      quantity: ''
    });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-update inStock based on quantity
      if (name === 'quantity') {
        const qty = parseInt(value) || 0;
        if (qty === 0) {
          newData.inStock = false;
        } else if (qty > 0 && !newData.inStock) {
          // Auto-set to true if quantity > 0 and not explicitly set to false
          newData.inStock = true;
        }
      }
      
      return newData;
    });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in all required fields (Name, Price, Category)');
      return;
    }

    // Validate price is a number
    if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      alert('Please enter a valid price (must be a positive number)');
      return;
    }
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to continue');
        return;
      }

      const quantity = parseInt(formData.quantity) || 0;
      
      // Parse price and cost preserving exact values (no rounding, no modifications)
      // Only parse at the last moment before sending to API
      const priceStr = String(formData.price).trim();
      const costStr = formData.cost ? String(formData.cost).trim() : '';
      
      // Validate price format
      if (!priceStr || priceStr === '') {
        alert('Please enter a selling price');
        return;
      }
      
      const priceValue = parseFloat(priceStr);
      if (isNaN(priceValue) || priceValue <= 0) {
        alert('Please enter a valid price (must be a positive number)');
        return;
      }
      
      // Validate cost format (optional field)
      let costValue = 0;
      if (costStr && costStr !== '') {
        costValue = parseFloat(costStr);
        if (isNaN(costValue) || costValue < 0) {
          alert('Please enter a valid cost (must be a non-negative number)');
          return;
        }
      }
      
      // Use the exact parsed values - no rounding, no modifications
      const productData = {
        name: formData.name,
        category: formData.category,
        description: formData.description || '',
        price: priceValue, // Exact value as entered, no modifications
        stockQuantity: quantity,
        quantity: quantity, // For backward compatibility
        cost: costValue, // Exact value as entered, no modifications
        // ALWAYS set inStock based on quantity: quantity > 0 = true, quantity = 0 = false
        inStock: quantity > 0,
        image: formData.image || ''
      };

      console.log('Submitting product:', { 
        name: productData.name, 
        category: productData.category,
        price: productData.price,
        cost: productData.cost,
        imageLength: productData.image?.length || 0,
        imagePreview: productData.image?.substring(0, 50) + (productData.image?.length > 50 ? '...' : '')
      });

      if (editingProduct) {
        // Update existing product via API
        const response = await fetch(`${API_URL}/products/${editingProduct._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update product');
        }

        // Reload products from server to ensure sync
        const reloadResponse = await fetch(`${API_URL}/admin/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (reloadResponse.ok) {
          const reloadResult = await reloadResponse.json();
          const productsData = reloadResult.data || reloadResult.products || reloadResult;
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
        
        alert('Product updated successfully!');
      } else {
        // Create new product via API
        let response;
        try {
          response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
          });
        } catch (fetchError) {
          // Network error (server not reachable, CORS, etc.)
          console.error('Fetch error:', fetchError);
          throw new Error(`Network error: ${fetchError.message}. Please check if the backend server is running and accessible.`);
        }

        if (!response.ok) {
          let errorMessage = 'Failed to create product';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            
            // Include validation errors if present
            if (errorData.errors && Array.isArray(errorData.errors)) {
              const validationErrors = errorData.errors.map(e => `${e.field}: ${e.message}`).join('\n');
              errorMessage += '\n\nValidation errors:\n' + validationErrors;
            }
          } catch (parseError) {
            // If response is not JSON, try to get text
            try {
              const text = await response.text();
              errorMessage = `Server error (${response.status}): ${text || response.statusText}`;
            } catch {
              errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
          }
          throw new Error(errorMessage);
        }

        // Reload products from server to ensure sync
        try {
          const reloadResponse = await fetch(`${API_URL}/admin/products`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (reloadResponse.ok) {
            const reloadResult = await reloadResponse.json();
            const productsData = reloadResult.data || reloadResult.products || reloadResult;
            setProducts(Array.isArray(productsData) ? productsData : []);
          }
        } catch (reloadError) {
          console.warn('Failed to reload products, but product was created:', reloadError);
          // Don't fail the whole operation if reload fails
        }
        
        alert('Product created successfully!');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMsg = error.message || 'Unknown error occurred';
      alert(`Error saving product:\n\n${errorMsg}\n\nPlease check:\n1. Backend server is running\n2. You are logged in as admin\n3. All required fields are filled\n4. Image URL is valid (if provided)`);
    }
  }, [formData, editingProduct, closeModal]);

  const handleDelete = useCallback(async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        
        if (!token) {
          alert('Please login to continue');
          return;
        }

        const response = await fetch(`${API_URL}/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete product');
        }

        // Reload products from server to ensure sync
        const reloadResponse = await fetch(`${API_URL}/admin/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (reloadResponse.ok) {
          const reloadResult = await reloadResponse.json();
          const productsData = reloadResult.data || reloadResult.products || reloadResult;
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
        
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert(`Error deleting product: ${error.message}`);
      }
    }
  }, []);

  const calculateProfit = useCallback((price, cost) => {
    const priceNum = parseFloat(price) || 0;
    const costNum = parseFloat(cost) || 0;
    if (priceNum === 0) return '0.0';
    if (costNum === 0) return 'N/A';
    const profitPercent = ((priceNum - costNum) / costNum * 100);
    return profitPercent.toFixed(1);
  }, []);

  if (loading) {
    return (
      <div className="admin-products-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-products-container">
      <div className="admin-header">
        <div className="header-content">
          <h1>📦 Product Management</h1>
          <p>Manage your inventory, pricing, and product catalog</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          ➕ Add New Product
        </button>
      </div>

      <div className="admin-filters">
        <div className="search-section">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        </div>

        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="products-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-number">{productStats.total}</span>
            <span className="stat-label">Total Products</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-number">{productStats.inStock}</span>
            <span className="stat-label">In Stock</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-number">{productStats.outOfStock}</span>
            <span className="stat-label">Out of Stock</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-number">
              ${productStats.totalValue.toFixed(2)}
            </span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="no-products">
          <div className="no-products-icon">📦</div>
          <h3>No products found</h3>
          <p>Try adjusting your search or add new products</p>
        </div>
      ) : (
        <div className="products-table">
          <div className="table-header">
            <div className="col-image">Image</div>
            <div className="col-name">Product Name</div>
            <div className="col-category">Category</div>
            <div className="col-price">Price</div>
            <div className="col-cost">Cost</div>
            <div className="col-profit">Profit %</div>
            <div className="col-stock">Stock</div>
            <div className="col-status">Status</div>
            <div className="col-actions">Actions</div>
          </div>

          {filteredProducts.map(product => (
            <ProductTableRow
              key={product._id}
              product={product}
              onEdit={openModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal for Add/Edit Product */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Product Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter product name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {productCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="price">Selling Price *</label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    pattern="[0-9]+(\.[0-9]{1,2})?"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cost">Cost Price</label>
                  <input
                    type="text"
                    id="cost"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    pattern="[0-9]+(\.[0-9]{1,2})?"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">Stock Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={formData.inStock && (parseInt(formData.quantity) || 0) > 0}
                      onChange={handleInputChange}
                      disabled={(parseInt(formData.quantity) || 0) === 0}
                    />
                    <span className="checkbox-text">
                      In Stock {parseInt(formData.quantity) === 0 ? '(Set quantity > 0 first)' : ''}
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter product description"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="image">Product Image</label>
                <OptimizedImageUpload
                  currentImage={formData.image}
                  onImageChange={(imageData) => setFormData(prev => ({ ...prev, image: imageData }))}
                  placeholder="Upload product image"
                />
              </div>

              {(formData.price || formData.cost) && (
                <div className="profit-indicator">
                  <span className="profit-label">Profit Margin: </span>
                  <span className={`profit-value ${calculateProfit(formData.price, formData.cost) !== 'N/A' && parseFloat(calculateProfit(formData.price, formData.cost)) > 20 ? 'good' : 'low'}`}>
                    {calculateProfit(formData.price, formData.cost) === 'N/A' ? 'N/A (Enter cost price)' : `${calculateProfit(formData.price, formData.cost)}%`}
                  </span>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? '💾 Update Product' : '➕ Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;