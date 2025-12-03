import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export const useProducts = (params = {}) => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/products', { params });
      return data;
    },
  });

  const createProduct = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/admin/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put(`/admin/products/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return { productsQuery, createProduct, updateProduct, deleteProduct };
};

export default useProducts;