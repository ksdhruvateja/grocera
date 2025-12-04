import React, { useEffect } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Users, Package, MessageSquare } from 'lucide-react';
import { useAdminStats } from '../../hooks/api/useAdminStats';
import { formatCurrency } from '../../assets';
import toast from 'react-hot-toast';

const DashboardCards = ({ socket }) => {
  const { data: stats, refetch, isLoading: loading } = useAdminStats();

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    socket.on('orderCreated', (order) => {
      toast.success(`New order #${order.orderId} received!`);
      refetch(); // Refresh stats
    });

    socket.on('newMessage', () => {
      refetch();
    });

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('orderCreated');
        socket.off('newMessage');
      }
    };
  }, [socket, refetch]);

  // Default values if stats is undefined
  const statsData = stats || {
    totalSales: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
    unreadMessages: 0,
  };

  const cards = [
    {
      title: 'Total Sales',
      value: formatCurrency(statsData.totalSales),
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-400',
      change: '+12.5%',
    },
    {
      title: 'Total Orders',
      value: statsData.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
      change: '+8.2%',
    },
    {
      title: 'Revenue',
      value: formatCurrency(statsData.totalRevenue),
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
      change: '+15.3%',
    },
    {
      title: 'Total Users',
      value: statsData.totalUsers.toLocaleString(),
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-400',
      change: '+5.7%',
    },
    {
      title: 'Products',
      value: statsData.totalProducts.toLocaleString(),
      icon: Package,
      color: 'from-cyan-500 to-cyan-600',
      textColor: 'text-cyan-400',
      change: '+3.1%',
    },
    {
      title: 'Messages',
      value: statsData.unreadMessages.toLocaleString(),
      icon: MessageSquare,
      color: 'from-pink-500 to-pink-600',
      textColor: 'text-pink-400',
      change: statsData.unreadMessages > 0 ? 'New' : '',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-dark-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-dark-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="card-dark rounded-xl p-6 hover-lift animate-fade-in overflow-hidden group"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-all duration-300`}></div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color} shadow-glow`}>
                <card.icon className="text-white" size={24} />
              </div>
              {card.change && (
                <span className={`text-sm font-bold ${card.textColor} bg-dark-900/50 px-2 py-1 rounded-full`}>
                  {card.change}
                </span>
              )}
            </div>
            <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">{card.title}</h3>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>

          {/* Glow Effect on Hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-transparent"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
