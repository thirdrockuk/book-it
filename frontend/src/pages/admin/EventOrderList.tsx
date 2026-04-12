import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelAdminOrder, useAdminEvent, useAdminEventOrders } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';

export default function AdminEventOrderList() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: isEventLoading } = useAdminEvent(eventId);
  const { data: orders, isLoading: isOrdersLoading } = useAdminEventOrders(eventId);
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  async function handleCancel(orderId: string) {
    if (!confirm('Cancel this booking?')) return;
    setActionError(null);
    setCancellingOrderId(orderId);
    try {
      await cancelAdminOrder(orderId);
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      const detail = apiError.response?.data?.detail;
      setActionError(detail || 'Failed to cancel booking');
    } finally {
      setCancellingOrderId(null);
    }
  }

  if (isEventLoading || isOrdersLoading) return <div className="text-gray-500">Loading…</div>;

  const sorted = [...(orders ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      <Link to={`/admin/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
        ← Back to event
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-1">{event?.title}</h1>
      <p className="text-sm text-gray-500 mb-6">Orders</p>

      {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

      {!sorted.length ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Order #</th>
                <th className="px-4 py-3 text-left">Booker</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <div>{order.booker_name}</div>
                    <div className="text-xs text-gray-500">{order.booker_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">{formatPence(order.total_pence)}</td>
                  <td className="px-4 py-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${order.balance_pence > 0 ? 'text-red-600' : 'text-green-600'}`}> 
                    {formatPence(Math.max(0, order.balance_pence))}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap flex gap-2 justify-end">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-block bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      View
                    </Link>
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="inline-block bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {cancellingOrderId === order.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            {sorted.length} order{sorted.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    refunded: 'bg-purple-100 text-purple-700',
    expired: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[status] ?? ''}`}>
      {status}
    </span>
  );
}
