import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/pages/ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState(0.5); // Default 0.5 lb
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Check if product is a vegetable
  const isVegetable = product?.category?.toLowerCase().includes('vegetable') || 
                      product?.category === 'Fresh Vegetables' ||
                      product?.category === 'Vegetables';
  
  const weightOptions = [0.5, 1, 2, 3, 5]; // Weight options in lbs

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/products/${id}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        // Handle different backend response structures
        setProduct(data.data || data.product || data);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      
      if (isVegetable) {
        // Add vegetable with selected weight
        const productWithWeight = {
          ...product,
          selectedWeight: selectedWeight,
          displayName: `${product.name} (${selectedWeight} lb)`
        };
        await addToCart(productWithWeight, 1);
        alert(`Added ${selectedWeight} lb of ${product.name} to cart!`);
      } else {
        // Regular product
        await addToCart(product, quantity);
        alert(`Added ${quantity} ${product.name} to cart!`);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWeightChange = (change) => {
    const currentIndex = weightOptions.indexOf(selectedWeight);
    let newIndex = currentIndex + change;
    
    // Clamp to valid range
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= weightOptions.length) newIndex = weightOptions.length - 1;
    
    setSelectedWeight(weightOptions[newIndex]);
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    const availableStock = product?.quantity || product?.stockQuantity || 999;
    if (newQuantity >= 1 && newQuantity <= availableStock) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="error-section">
          <h2>Product Not Found</h2>
          <p>{error || 'The product you are looking for does not exist.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <div className="product-detail-content">
        <button className="back-button" onClick={() => navigate('/products')}>
          ← Back to Products
        </button>

        <div className="product-detail-grid">
          {/* Product Image */}
          <div className="product-image-section">
            <div className="product-image-large">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.querySelector('.image-placeholder-large');
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              {(!product.image || product.image === '') && (
                <div className="image-placeholder-large">
                  <span>📦</span>
                  <p>No Image Available</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <div className="product-header">
              <h1>{product.name}</h1>
              <span className="category-badge">{product.category}</span>
            </div>

            <div className="product-price">
              <span className="price">${product.price?.toFixed(2)}</span>
            </div>

            <div className="product-stock">
              {product.inStock ? (
                <span className="in-stock">✅ In Stock ({product.quantity || product.stockQuantity || 0} available)</span>
              ) : (
                <span className="out-of-stock">❌ Out of Stock</span>
              )}
            </div>

            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description || 'No description available.'}</p>
            </div>

            {product.inStock && (
              <div className="product-actions">
                {isVegetable ? (
                  <>
                    <div className="weight-selector">
                      <label>Weight (lb):</label>
                      <div className="weight-controls">
                        <button
                          className="qty-btn"
                          onClick={() => handleWeightChange(-1)}
                          disabled={selectedWeight === weightOptions[0]}
                        >
                          −
                        </button>
                        <input
                          type="text"
                          value={`${selectedWeight} lb`}
                          readOnly
                          className="weight-display"
                        />
                        <button
                          className="qty-btn"
                          onClick={() => handleWeightChange(1)}
                          disabled={selectedWeight === weightOptions[weightOptions.length - 1]}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-add-to-cart"
                      onClick={handleAddToCart}
                      disabled={addingToCart || !product.inStock}
                    >
                      {addingToCart ? '🔄 Adding...' : '🛒 Add to Cart'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="quantity-selector">
                      <label>Quantity:</label>
                      <div className="quantity-controls">
                        <button
                          className="qty-btn"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const availableStock = product.quantity || product.stockQuantity || 999;
                            if (val >= 1 && val <= availableStock) {
                              setQuantity(val);
                            }
                          }}
                          min="1"
                          max={product.quantity || product.stockQuantity || 999}
                        />
                        <button
                          className="qty-btn"
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= (product.quantity || product.stockQuantity || 999)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-add-to-cart"
                      onClick={handleAddToCart}
                      disabled={addingToCart || !product.inStock}
                    >
                      {addingToCart ? '🔄 Adding...' : '🛒 Add to Cart'}
                    </button>
                  </>
                )}
              </div>
            )}

            {product.nutritionInfo && (
              <div className="nutrition-info">
                <h3>Nutrition Information</h3>
                <div className="nutrition-grid">
                  {product.nutritionInfo.calories && (
                    <div className="nutrition-item">
                      <span className="label">Calories:</span>
                      <span className="value">{product.nutritionInfo.calories}</span>
                    </div>
                  )}
                  {product.nutritionInfo.protein && (
                    <div className="nutrition-item">
                      <span className="label">Protein:</span>
                      <span className="value">{product.nutritionInfo.protein}g</span>
                    </div>
                  )}
                  {product.nutritionInfo.carbs && (
                    <div className="nutrition-item">
                      <span className="label">Carbs:</span>
                      <span className="value">{product.nutritionInfo.carbs}g</span>
                    </div>
                  )}
                  {product.nutritionInfo.fat && (
                    <div className="nutrition-item">
                      <span className="label">Fat:</span>
                      <span className="value">{product.nutritionInfo.fat}g</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;