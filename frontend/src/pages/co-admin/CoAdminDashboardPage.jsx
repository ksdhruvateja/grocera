import React from 'react';
import CoAdminDashboard from '../../components/co-admin/CoAdminDashboard';
import { useSocket } from '../../hooks/useSocket';

const CoAdminDashboardPage = () => {
  const socket = useSocket();

  return <CoAdminDashboard socket={socket} />;
};

export default CoAdminDashboardPage;
