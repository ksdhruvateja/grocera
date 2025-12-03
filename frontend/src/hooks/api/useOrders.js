import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export const useOrders = (params = {}) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/orders', { params });
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.patch(`/admin/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const assignAgent = useMutation({
    mutationFn: async ({ id, agentId }) => {
      const { data } = await api.patch(`/admin/orders/${id}/assign-agent`, { agentId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return { ordersQuery, updateStatus, assignAgent };
};

export default useOrders;