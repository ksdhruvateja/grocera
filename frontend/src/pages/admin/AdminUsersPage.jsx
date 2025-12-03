import React from 'react';
import UsersTable from '../../components/admin/UsersTable';

const AdminUsers = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
        <p className="text-gray-400">View and manage all registered users</p>
      </div>

      <UsersTable />
    </div>
  );
};

export default AdminUsers;
