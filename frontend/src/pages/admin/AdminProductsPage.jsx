import React from 'react';
import ProductsTable from '../../components/admin/ProductsTable';

const AdminProducts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Products Management</h1>
        <p className="text-gray-400">Manage your product catalog, inventory, and pricing</p>
      </div>

      <ProductsTable />
    </div>
  );
};

export default AdminProducts;
