import React, { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import DashboardCards from '../../components/admin/DashboardCards';
import OrdersTable from '../../components/admin/OrdersTable';
import { Activity, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  const { socket, connected, error } = useSocket();
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Fetch recent activity
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    // Placeholder for recent activity
    setRecentActivity([
      { id: 1, type: 'order', message: 'New order #1234 received', time: '2 mins ago' },
      { id: 2, type: 'user', message: 'New user registered', time: '15 mins ago' },
      { id: 3, type: 'product', message: 'Product stock updated', time: '1 hour ago' },
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="glass px-4 py-2 rounded-full flex items-center gap-2 text-sm text-gray-300">
          <Activity size={16} className="text-green-400 animate-pulse-slow" />
          <span className="status-online">All systems operational</span>
        </div>
      </div>

      {/* Dashboard Cards */}
      <DashboardCards socket={socket} />

      {/* Quick Stats & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="card-dark rounded-xl p-6 hover-lift">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">Sales Trend</h3>
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-glow">
              <TrendingUp size={20} className="text-white" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-400 font-medium">Today</span>
              <span className="text-base font-bold text-white currency">2,450</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-400 font-medium">This Week</span>
              <span className="text-base font-bold text-white currency">15,230</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-400 font-medium">This Month</span>
              <span className="text-base font-bold text-white currency">62,890</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card-dark rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Top Products</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-200 font-medium">Organic Bananas</span>
              <span className="badge badge-primary">245 sold</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-200 font-medium">Fresh Milk</span>
              <span className="badge badge-primary">198 sold</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
              <span className="text-sm text-gray-200 font-medium">Brown Eggs</span>
              <span className="badge badge-primary">167 sold</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-dark rounded-xl p-6 hover-lift">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 transition-all">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shadow-glow animate-pulse-slow"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-200 font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <OrdersTable socket={socket} />
    </div>
  );
};

export default AdminDashboard;
