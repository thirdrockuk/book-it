import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelAdminOrder, useAdminOrdersPage } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';

const ORDER_LIST_STATE_KEY = 'admin-orders-list-state';

function normalisePageSize(value: unknown): 10 | 20 | 50 {
  if (value === 20) return 20;
  if (value === 50) return 50;
  return 10;
}

function loadOrderListState(): { page: number; pageSize: 10 | 20 | 50; sort: 'desc' | 'asc' } {
  if (typeof window === 'undefined') {
    return { page: 1, pageSize: 10, sort: 'desc' };
  }

  try {
    const raw = window.localStorage.getItem(ORDER_LIST_STATE_KEY);
    if (!raw) {
      return { page: 1, pageSize: 10, sort: 'desc' };
    }

    const parsed = JSON.parse(raw) as {
      page?: unknown;
      pageSize?: unknown;
      sort?: unknown;
    };

    const page =
      typeof parsed.page === 'number' && Number.isInteger(parsed.page) && parsed.page > 0
        ? parsed.page
        : 1;

    return {
      page,
      pageSize: normalisePageSize(parsed.pageSize),
      sort: parsed.sort === 'asc' ? 'asc' : 'desc',
    };
  } catch {
    return { page: 1, pageSize: 10, sort: 'desc' };
  }
}

export default function AdminOrderList() {
  const [initialListState] = useState(loadOrderListState);
  const [dateSortDirection, setDateSortDirection] = useState<'desc' | 'asc'>(initialListState.sort);
  const [page, setPage] = useState<number>(initialListState.page);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(initialListState.pageSize);
  const { data: ordersPage, isLoading, isFetching } = useAdminOrdersPage(
    page,
    pageSize,
    dateSortDirection
  );
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const orders = ordersPage?.items ?? [];
  const total = ordersPage?.total ?? 0;
  const totalPages = ordersPage?.total_pages ?? 0;
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = total === 0 ? 0 : (page - 1) * pageSize + orders.length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ORDER_LIST_STATE_KEY,
      JSON.stringify({ page, pageSize, sort: dateSortDirection })
    );
  }, [page, pageSize, dateSortDirection]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleCancel(orderId: string) {
    if (!confirm('Cancel this booking?')) return;
    setActionError(null);
    try {
      await cancelAdminOrder(orderId);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      const detail = apiError.response?.data?.detail;
      setActionError(detail || 'Failed to cancel booking');
    }
  }

  if (isLoading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Per page
          <select
            value={pageSize}
            onChange={(e) => {
              const nextPageSize = Number(e.target.value) as 10 | 20 | 50;
              setPageSize(nextPageSize);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
      {!orders?.length ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setDateSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                    title={dateSortDirection === 'desc' ? 'Sort oldest first' : 'Sort newest first'}
                  >
                    Date
                    <span aria-hidden="true">{dateSortDirection === 'desc' ? 'v' : '^'}</span>
                  </button>
                </th>
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
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                  <td className="px-4 py-3">{order.booker_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">{formatPence(order.total_pence)}</td>
                  <td className="px-4 py-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${order.balance_pence > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPence(Math.max(0, order.balance_pence))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-sky-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-red-600 hover:underline text-xs ml-3"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <p className="text-gray-600">
              Showing {fromRow}-{toRow} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isFetching}
                className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-700">
                Page {totalPages === 0 ? 1 : page} of {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={isFetching || totalPages === 0 || page >= totalPages}
                className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
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
