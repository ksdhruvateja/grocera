import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/stats');
      return data;
    },
    placeholderData: {
      totalSales: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalUsers: 0,
      totalProducts: 0,
      unreadMessages: 0
    }
  });
};

export default useAdminStats;