import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';
import { CreditCard, Wallet, Building, MapPin, CheckCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import { formatCurrency } from '../../assets';
import { CheckoutSkeleton } from '../../components/customer/Skeletons';

const Checkout = () => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // stripe | ebt | otc
  const [ebtCard, setEbtCard] = useState({ number: '', name: '' });
  const [otcCard, setOtcCard] = useState({ number: '', name: '' });
  const [orderSummary, setOrderSummary] = useState({ subtotal: 0, discount: 0, tip: 0, total: 0 });
  const [placingOrder, setPlacingOrder] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const init = async () => {
      try {
        const [profileRes, cartRes] = await Promise.all([
          api.get('/auth/profile'),
          api.get('/cart'),
        ]);

        setAddresses(profileRes.data.addresses || []);
        setSelectedAddressId(profileRes.data.addresses?.[0]?._id || '');

        const items = cartRes.data.items || [];
        const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const discount = cartRes.data.promo?.type === 'percent' ? (subtotal * cartRes.data.promo.value) / 100 : cartRes.data.promo?.type === 'amount' ? cartRes.data.promo.value : 0;
        const tip = cartRes.data.driverTip || 0;
        const total = Math.max(0, subtotal - discount) + tip;
        setOrderSummary({ subtotal, discount, tip, total });
      } catch (e) {
        toast.error('Failed to load checkout data');
      }
    };
    if (token) init();
  }, [token]);

  const placeOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    setPlacingOrder(true);
    try {
      const body = {
        addressId: selectedAddressId,
        paymentMethod,
        ebtCard: paymentMethod === 'ebt' ? ebtCard : undefined,
        otcCard: paymentMethod === 'otc' ? otcCard : undefined,
      };
      // Encrypt card details if present
      const secret = process.env.REACT_APP_CARD_SECRET || 'zippyyy-demo-secret';
      let encryptedBody = { ...body };
      if (body.ebtCard) {
        encryptedBody.ebtCard = {
          number: CryptoJS.AES.encrypt(body.ebtCard.number, secret).toString(),
          name: CryptoJS.AES.encrypt(body.ebtCard.name, secret).toString(),
        };
      }
      if (body.otcCard) {
        encryptedBody.otcCard = {
          number: CryptoJS.AES.encrypt(body.otcCard.number, secret).toString(),
          name: CryptoJS.AES.encrypt(body.otcCard.name, secret).toString(),
        };
      }

      const res = await api.post('/checkout', encryptedBody);

      toast.success('Order placed successfully!');
      window.location.href = `/order-tracking/${res.data.orderId}`;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!addresses.length && placingOrder === false && !orderSummary.total) {
    // show skeleton while initial data loads
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>
          <CheckoutSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Address Selector */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delivery Address</h2>
            {addresses.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">No saved addresses. Please add one in your profile.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label key={addr._id} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      checked={selectedAddressId === addr._id}
                      onChange={() => setSelectedAddressId(addr._id)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{addr.country}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Payment Methods */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-4">Payment Options</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-lg border ${paymentMethod === 'stripe' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <CreditCard className="w-6 h-6 mb-2" />
                <p className="font-semibold">Credit/Debit (Stripe)</p>
              </button>
              <button
                onClick={() => setPaymentMethod('ebt')}
                className={`p-4 rounded-lg border ${paymentMethod === 'ebt' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <Wallet className="w-6 h-6 mb-2" />
                <p className="font-semibold">EBT Card</p>
              </button>
              <button
                onClick={() => setPaymentMethod('otc')}
                className={`p-4 rounded-lg border ${paymentMethod === 'otc' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <Building className="w-6 h-6 mb-2" />
                <p className="font-semibold">OTC Card</p>
              </button>
            </div>

            {/* EBT / OTC Details */}
            {paymentMethod !== 'stripe' && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Enter your {paymentMethod.toUpperCase()} card details</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={paymentMethod === 'ebt' ? ebtCard.number : otcCard.number}
                    onChange={(e) =>
                      paymentMethod === 'ebt'
                        ? setEbtCard({ ...ebtCard, number: e.target.value })
                        : setOtcCard({ ...otcCard, number: e.target.value })
                    }
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Name on Card"
                    value={paymentMethod === 'ebt' ? ebtCard.name : otcCard.name}
                    onChange={(e) =>
                      paymentMethod === 'ebt'
                        ? setEbtCard({ ...ebtCard, name: e.target.value })
                        : setOtcCard({ ...otcCard, name: e.target.value })
                    }
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Card details will be securely stored for admin review.</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(orderSummary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Discount</span>
                <span className="text-green-600">-{formatCurrency(orderSummary.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Driver Tip</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(orderSummary.tip)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(orderSummary.total)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-6"
              onClick={placeOrder}
              disabled={placingOrder}
            >
              {placingOrder ? 'Placing Order...' : 'Place Order'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Secure checkout powered by ZIPPYYY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
