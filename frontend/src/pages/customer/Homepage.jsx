import React, { useState, useEffect } from 'react';
import { Mail, TrendingUp, Package, Truck } from 'lucide-react';
import Hero from '../../components/customer/Hero';
import ProductCard from '../../components/customer/ProductCard';
import CategoryGrid from '../../components/customer/CategoryGrid';
import SearchFilter from '../../components/customer/SearchFilter';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import axios from 'axios';

const Homepage = () => {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [filters, setFilters] = useState({ category: 'all', sortBy: 'popular' });

  // Old slider removed fully; Hero component provides the hero layout.

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  // Slider auto-advance retained for potential future use
  // (Hero component now replaces visual slider)

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.append('category', filters.category);
      params.append('sort', filters.sortBy);

      const response = await axios.get(
        `http://localhost:5000/api/products?${params.toString()}`
      );
      setProducts(response.data);
      setFeaturedProducts(response.data.slice(0, 8));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/newsletter/subscribe', { email });
      toast.success('Successfully subscribed to newsletter!');
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    }
  };

  // Slider auto-advance retained for potential future use

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="px-4 md:px-6 py-8">
        <Hero />
      </div>

      {/* Features Bar */}
      <div className="bg-primary-600 py-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white text-center">
            <div className="flex items-center justify-center gap-3">
              <Truck className="w-6 h-6" />
              <span className="font-semibold">Free Delivery Over $50</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Package className="w-6 h-6" />
              <span className="font-semibold">Fresh Products Daily</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <TrendingUp className="w-6 h-6" />
              <span className="font-semibold">Best Prices Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="mb-12">
          <SearchFilter
            onSearch={(term) => console.log('Search:', term)}
            onFilter={(newFilters) => setFilters(newFilters)}
          />
        </div>

        {/* Categories Section */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Shop by Category
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Browse our wide selection of fresh groceries
            </p>
          </div>
          <CategoryGrid />
        </section>

        {/* Featured Products - American */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                American Favorites
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Popular products loved by our customers
              </p>
            </div>
            <Button variant="outline">View All</Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Promo Banner */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center p-8 md:p-12">
              <div className="text-white">
                <h2 className="text-4xl font-bold mb-4">
                  Weekend Special Offers
                </h2>
                <p className="text-xl mb-6">
                  Save up to 50% on fresh produce and dairy products
                </p>
                <Button variant="secondary" size="lg">
                  Shop Deals Now
                </Button>
              </div>
              <div className="hidden md:block">
                <img
                  src="https://images.unsplash.com/photo-1543168256-418811576931?w=600"
                  alt="Special Offers"
                  className="rounded-2xl shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Asian Specialties Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Asian Specialties
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Authentic ingredients for traditional Asian cuisine
              </p>
            </div>
            <Button variant="outline">View All</Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(4, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Get exclusive deals, new product alerts, and recipe ideas delivered to your inbox
            </p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="max-w-md mx-auto flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:ring-4 focus:ring-white/50 outline-none"
              />
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="whitespace-nowrap"
              >
                Subscribe Now
              </Button>
            </form>

            <p className="text-sm mt-4 opacity-75">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* Fresh Produce Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Fresh Produce
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Farm-fresh fruits and vegetables
              </p>
            </div>
            <Button variant="outline">View All</Button>
          </div>

          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Trust Badges */}
        <section className="py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-md">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Why Shop With ZIPPYYY?
            </h3>
          </div>
          <div className="grid md:grid-cols-4 gap-8 px-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Quality Products
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only the finest quality groceries
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Fast Delivery
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Same-day delivery available
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Best Prices
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Competitive pricing guaranteed
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                24/7 Support
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Always here to help you
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Homepage;
