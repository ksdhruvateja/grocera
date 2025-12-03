import React from 'react';
import CoAdminTable from '../../components/admin/CoAdminTable';

const AdminCoAdmins = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Co-Admins Management</h1>
        <p className="text-gray-400">Manage co-administrators and approve price changes</p>
      </div>

      <CoAdminTable />
    </div>
  );
};

export default AdminCoAdmins;
