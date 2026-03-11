import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Event, Order, DashboardStats, TicketType, AdminUser } from '../types';

export function useAdminEvents() {
  return useQuery<Event[]>({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const res = await apiClient.get<Event[]>('/api/admin/events');
      return res.data;
    },
  });
}

export function useAdminEvent(id: string | undefined) {
  return useQuery<Event>({
    queryKey: ['admin', 'events', id],
    queryFn: async () => {
      const res = await apiClient.get<Event>(`/api/admin/events/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useAdminOrders() {
  return useQuery<Order[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const res = await apiClient.get<Order[]>('/api/admin/orders');
      return res.data;
    },
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery<Order>({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/api/admin/orders/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<DashboardStats>('/api/admin/dashboard');
      return res.data;
    },
  });
}

export function useAdminTicketTypes(eventId: string | undefined) {
  return useQuery<TicketType[]>({
    queryKey: ['admin', 'events', eventId, 'ticket-types'],
    queryFn: async () => {
      const res = await apiClient.get<TicketType[]>(`/api/admin/events/${eventId}/ticket-types`);
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser[]>('/api/admin/users');
      return res.data;
    },
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser>(`/api/admin/users/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCurrentAdminUser() {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser>('/api/auth/me');
      return res.data;
    },
  });
}

export async function recordPayment(
  orderId: string,
  data: { amount_pence: number; method: string; reference?: string; note?: string; received_at?: string }
): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/admin/orders/${orderId}/payments`, data);
  return res.data;
}

export async function deletePayment(orderId: string, paymentId: string): Promise<void> {
  await apiClient.delete(`/api/admin/orders/${orderId}/payments/${paymentId}`);
}
