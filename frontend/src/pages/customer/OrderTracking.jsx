import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { OrderTrackingSkeleton } from '../../components/customer/Skeletons';
import { CheckCircle, Clock, Truck, MapPin } from 'lucide-react';

const steps = [
  { key: 'received', label: 'Order Received', icon: Clock },
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle },
  { key: 'out-delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(res.data);
      } catch (e) {
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-10">
          <OrderTrackingSkeleton />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Order Tracking</h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= currentIndex;
              return (
                <div key={step.key} className="flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className={`mt-2 text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}>{step.label}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-1 mx-2 mt-3 ${idx < currentIndex ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Details */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Order Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Order ID: {order._id}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Placed: {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="border rounded-lg p-4 border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delivery Address</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {order.address?.street}, {order.address?.city}, {order.address?.state} {order.address?.zipCode}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
