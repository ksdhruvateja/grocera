import React from 'react';
import OrdersTable from '../../components/admin/OrdersTable';
import { useSocket } from '../../hooks/useSocket';

const CoAdminOrdersPage = () => {
  const socket = useSocket();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Orders Management</h1>
        <p className="text-gray-400">View and manage orders assigned to you</p>
      </div>
      <OrdersTable socket={socket} />
    </div>
  );
};

export default CoAdminOrdersPage;
