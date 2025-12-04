import React from 'react';
import OrdersTable from '../../components/admin/OrdersTable';
import { useSocket } from '../../hooks/useSocket';

const AdminOrders = () => {
  const { socket, connected, error } = useSocket();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Orders Management</h1>
        <p className="text-gray-400">Manage and track all customer orders</p>
      </div>

      <OrdersTable socket={socket} />
    </div>
  );
};

export default AdminOrders;
