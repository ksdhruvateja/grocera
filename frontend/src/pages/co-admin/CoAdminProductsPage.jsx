import React from 'react';
import ProductsTable from '../../components/co-admin/ProductsTable';
import { useSocket } from '../../hooks/useSocket';

const CoAdminProductsPage = () => {
  const { socket, connected, error } = useSocket();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Products Management</h1>
        <p className="text-gray-400">Manage product inventory and request price changes</p>
      </div>
      <ProductsTable socket={socket} />
    </div>
  );
};

export default CoAdminProductsPage;
