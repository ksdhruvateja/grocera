import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, XCircle, DollarSign, ShoppingBag, Clock, Trash2 } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const CoAdminNotificationsPage = () => {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('coAdminNotifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('coAdminNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    // Price approval updates
    socket.on('priceApprovalUpdate', (data) => {
      const newNotification = {
        id: Date.now(),
        type: data.approved ? 'price-approved' : 'price-rejected',
        title: `Price Change ${data.approved ? 'Approved' : 'Rejected'}`,
        message: `Your price change request for "${data.productName}" has been ${data.approved ? 'approved' : 'rejected'}.`,
        data: data,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    // New order created
    socket.on('orderCreated', (order) => {
      const newNotification = {
        id: Date.now(),
        type: 'order-created',
        title: 'New Order Received',
        message: `Order #${order.orderNumber || order._id} has been placed.`,
        data: order,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    // Order status updated
    socket.on('orderUpdated', (order) => {
      const newNotification = {
        id: Date.now(),
        type: 'order-updated',
        title: 'Order Status Updated',
        message: `Order #${order.orderNumber || order._id} status changed to ${order.status}.`,
        data: order,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      socket.off('priceApprovalUpdate');
      socket.off('orderCreated');
      socket.off('orderUpdated');
    };
  }, [socket]);

  const notificationConfig = {
    'price-approved': {
      icon: CheckCircle,
      color: 'bg-green-500/20 text-green-400 border-green-500/50',
      iconColor: 'text-green-400',
    },
    'price-rejected': {
      icon: XCircle,
      color: 'bg-red-500/20 text-red-400 border-red-500/50',
      iconColor: 'text-red-400',
    },
    'order-created': {
      icon: ShoppingBag,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      iconColor: 'text-blue-400',
    },
    'order-updated': {
      icon: DollarSign,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      iconColor: 'text-yellow-400',
    },
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    toast.success('Notification deleted');
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      toast.success('All notifications cleared');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    return notif.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-400">Stay updated with real-time notifications</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('price-approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'price-approved'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('price-rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'price-rejected'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilter('order-created')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'order-created'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
              {filter === 'all'
                ? 'No notifications yet'
                : `No ${filter === 'unread' ? 'unread' : filter.replace('-', ' ')} notifications`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredNotifications.map((notification) => {
              const config = notificationConfig[notification.type];
              const Icon = config?.icon || Bell;

              return (
                <div
                  key={notification.id}
                  className={`p-5 hover:bg-gray-700/30 transition-colors ${
                    !notification.read ? 'bg-gray-700/20' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${config?.color || 'bg-gray-700'}`}>
                      <Icon size={20} className={config?.iconColor || 'text-gray-400'} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                        )}
                      </div>

                      <p className="text-sm text-gray-300 mb-2">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
                          {new Date(notification.timestamp).toLocaleString()}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoAdminNotificationsPage;
