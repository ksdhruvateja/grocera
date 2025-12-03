import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Minus, Plus, Star, Truck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { ProductDetailSkeleton } from '../../components/customer/Skeletons';
import { formatCurrency } from '../../assets';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const changeQty = (delta) => {
    setQty((prev) => Math.max(1, prev + delta));
  };

  const addToCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to add items to cart');
        return;
      }
      await axios.post(
        'http://localhost:5000/api/cart',
        { productId: product._id, quantity: qty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Added to cart');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add to cart');
    }
  };

  const toggleWishlist = () => {
    setWishlisted((w) => !w);
    toast.success(!wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-10">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl];

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
              <img
                src={images[activeImage] || 'https://via.placeholder.com/600x600'}
                alt={product.name}
                className="w-full h-[420px] object-cover rounded-xl"
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-20 rounded-lg overflow-hidden border ${
                    activeImage === idx ? 'border-primary-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{product.name}</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{product.description}</p>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                ))}
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">({product.rating})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary-600">{formatCurrency(product.price)}</span>
              {hasDiscount && (
                <span className="text-xl text-gray-500 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>

            {/* Qty selector */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onClick={() => changeQty(-1)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-gray-900 dark:text-white">{qty}</span>
                <button onClick={() => changeQty(1)} className="px-3 py-2 bg-gray-100 dark:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button variant="primary" onClick={addToCart}>Add to Cart</Button>
              <button onClick={toggleWishlist} className={`p-3 rounded-lg border ${wishlisted ? 'text-red-500 border-red-300' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}>
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Delivery info */}
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 mb-6">
              <Truck className="w-5 h-5" />
              <span>Free delivery on orders over $50. Same-day delivery available.</span>
            </div>

            {/* Specifications */}
            {product.specs && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Specifications</h3>
                <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-medium capitalize">{k}:</span> {String(v)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
