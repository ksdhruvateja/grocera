import React from 'react';
import PriceRequests from '../../components/co-admin/PriceRequests';
import { useSocket } from '../../hooks/useSocket';

const CoAdminPriceRequestsPage = () => {
  const { socket, connected, error } = useSocket();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Price Change Requests</h1>
        <p className="text-gray-400">Track the status of your price change requests</p>
      </div>
      <PriceRequests socket={socket} />
    </div>
  );
};

export default CoAdminPriceRequestsPage;
