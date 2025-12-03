import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';
import { formatCurrency } from '../../assets';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import axios from 'axios';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to add items to cart');
        navigate('/login');
        return;
      }

      await axios.post(
        'http://localhost:5000/api/cart/add',
        {
          productId: product._id,
          quantity: 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    navigate(`/products/${product._id}`);
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.success(
      isWishlisted ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700"
      onClick={() => navigate(`/products/${product._id}`)}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {hasDiscount && (
          <span className="badge-danger text-xs font-bold px-2 py-1">
            -{discountPercentage}%
          </span>
        )}
        {product.isNew && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
            NEW
          </span>
        )}
        {!product.inStock && (
          <span className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleWishlist}
          className={`p-2 rounded-full bg-white dark:bg-gray-700 shadow-lg hover:scale-110 transition-transform ${
            isWishlisted ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleQuickView}
          className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-lg hover:scale-110 transition-transform text-gray-600 dark:text-gray-300"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Product Image */}
      <div className="relative h-56 bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <img
          src={product.imageUrl || 'https://via.placeholder.com/300x300?text=Product'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          {product.category || 'Grocery'}
        </p>

        {/* Product Name */}
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(product.rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
              ({product.rating})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary-600">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Unit Info */}
        {product.unit && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Per {product.unit}
          </p>
        )}

        {/* Add to Cart Button */}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleAddToCart}
          disabled={!product.inStock || loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Adding...
            </span>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
