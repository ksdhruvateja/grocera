import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Trash2, Tag, Info, Gift } from 'lucide-react';
import Button from '../../components/common/Button';
import { formatCurrency } from '../../assets';
import { CartSkeleton } from '../../components/customer/Skeletons';

const Cart = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [driverTip, setDriverTip] = useState(0); // $0 - $10

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchCart = async () => {
      setLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/api/cart', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(res.data.items || []);
      } catch (e) {
        toast.error('Failed to load cart');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchCart();
  }, [token]);

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`http://localhost:5000/api/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i._id !== itemId));
      toast.success('Item removed');
    } catch (e) {
      toast.error('Failed to remove item');
    }
  };

  const updateQty = async (itemId, quantity) => {
    try {
      await axios.put(
        `http://localhost:5000/api/cart/${itemId}`,
        { quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems((prev) => prev.map((i) => (i._id === itemId ? { ...i, quantity } : i)));
    } catch (e) {
      toast.error('Failed to update quantity');
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const discount = promoApplied?.type === 'percent' ? (subtotal * promoApplied.value) / 100 : promoApplied?.type === 'amount' ? promoApplied.value : 0;
  const tip = driverTip;
  const total = Math.max(0, subtotal - discount) + tip;

  const applyPromo = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/cart/apply-promo', { code: promoCode }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPromoApplied(res.data);
      toast.success('Promo applied');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid promo code');
      setPromoApplied(null);
    }
  };

  const saveNotes = async () => {
    try {
      await axios.put('http://localhost:5000/api/cart/notes', { deliveryInstructions, driverTip }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Preferences saved');
    } catch (e) {
      toast.error('Failed to save preferences');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-10">
          <CartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            {items.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">Your cart is empty.</p>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item._id} className="flex items-center gap-4">
                    <img
                      src={item.product.imageUrl || 'https://via.placeholder.com/80x80'}
                      alt={item.product.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.product.price)} each
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                          onClick={() => updateQty(item._id, Math.max(1, item.quantity - 1))}
                        >
                          -
                        </button>
                        <span className="px-3">{item.quantity}</span>
                        <button
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                          onClick={() => updateQty(item._id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <button
                        className="mt-2 text-red-500 hover:text-red-400"
                        onClick={() => removeItem(item._id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Promo Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <Button variant="outline" onClick={applyPromo}>
                  <Tag className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              </div>
              {promoApplied && (
                <p className="mt-2 text-sm text-green-600">Promo applied: {promoApplied.label}</p>
              )}
            </div>

            {/* Delivery Instructions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Instructions
              </label>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                rows={3}
                placeholder="e.g., Leave at the door, call upon arrival"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Driver Tip */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Driver Tip (${driverTip})
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={driverTip}
                onChange={(e) => setDriverTip(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tip is optional and goes 100% to your driver</p>
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Discount</span>
                <span className="text-green-600">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Driver Tip</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(tip)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Button variant="primary" className="w-full" onClick={saveNotes}>
                <Info className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
              <a href="/checkout" className="block">
                <Button variant="secondary" className="w-full">
                  <Gift className="w-4 h-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
