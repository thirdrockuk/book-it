import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminOrder } from '../../api/admin';
import { recordPayment, deletePayment } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
  stub: 'Online',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useAdminOrder(id);
  const qc = useQueryClient();

  const [paymentForm, setPaymentForm] = useState({
    amountGbp: '',
    method: 'cash',
    reference: '',
    note: '',
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/booking/${order?.view_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return;
    await apiClient.post(`/api/admin/orders/${id}/cancel`);
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    const pence = Math.round(parseFloat(paymentForm.amountGbp) * 100);
    if (!pence || pence <= 0) { setPaymentError('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      await recordPayment(id!, {
        amount_pence: pence,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      });
      setPaymentForm({ amountGbp: '', method: 'cash', reference: '', note: '' });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    } catch {
      setPaymentError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm('Remove this payment record?')) return;
    await deletePayment(id!, paymentId);
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
  }

  if (isLoading) return <div className="text-gray-500">Loading…</div>;
  if (!order) return <div className="text-red-500">Order not found.</div>;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/admin/orders')}
        className="text-sm text-indigo-600 hover:underline mb-4 block"
      >
        ← Back to orders
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.created_at).toLocaleString('en-GB')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-1">
            <a
              href={`/booking/${order.view_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline font-mono"
            >
              {`${window.location.origin}/booking/${order.view_token}`}
            </a>
            <button
              onClick={handleCopyLink}
              className="text-xs text-gray-500 hover:text-gray-800 ml-1 shrink-0"
              title="Copy link"
            >
              {linkCopied ? '✓' : '⎘'}
            </button>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Booker Details</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Name</dt>
            <dd className="text-gray-800">{order.booker_name}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Email</dt>
            <dd className="text-gray-800">{order.booker_email}</dd>
          </div>
          {order.booker_phone && (
            <div className="flex gap-4">
              <dt className="text-gray-500 w-24">Phone</dt>
              <dd className="text-gray-800">{order.booker_phone}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Attendees</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b text-xs uppercase">
              <th className="pb-2">Name</th>
              <th className="pb-2">DOB</th>
              <th className="pb-2">Band</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.attendee_name}</td>
                <td className="py-2 text-gray-500">{item.attendee_dob}</td>
                <td className="py-2 text-gray-500">
                  {item.price_band_label ?? '—'}
                  {item.price_band_qualifier && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                      {item.price_band_qualifier}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">{formatPence(item.price_pence)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 font-semibold">Total</td>
              <td className="pt-3 font-semibold text-right">{formatPence(order.total_pence)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payments */}
      <div className="bg-white border rounded-lg p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Payments</h2>

        {order.payments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs uppercase">
                <th className="pb-2">Date</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Reference / Note</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 text-gray-500 whitespace-nowrap">
                    {new Date(p.received_at ?? p.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-2">{METHOD_LABELS[p.provider] ?? p.provider}</td>
                  <td className="py-2 text-gray-500 text-xs">
                    {[p.provider_txn_id, p.note].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="py-2 text-right">{formatPence(p.amount_pence)}</td>
                  <td className="py-2 text-right">
                    {p.provider !== 'stub' && (
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-semibold">
                <td colSpan={3} className="pt-3">Total paid</td>
                <td className="pt-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                <td />
              </tr>
              <tr className={`text-sm font-bold ${order.balance_pence <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <td colSpan={3} className="pt-1">Balance remaining</td>
                <td className="pt-1 text-right">{formatPence(Math.max(0, order.balance_pence))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        {/* Summary when no payment rows yet */}
        {order.payments.length === 0 && (
          <div className="flex justify-between text-sm font-semibold text-red-600 mb-4">
            <span>Balance remaining</span>
            <span>{formatPence(order.total_pence)}</span>
          </div>
        )}

        {/* Add payment form */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <form onSubmit={handleRecordPayment} className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Record a payment</h3>
            {paymentError && (
              <p className="text-xs text-red-600">{paymentError}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="0.00"
                  value={paymentForm.amountGbp}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountGbp: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Method</label>
                <select
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reference (optional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="Cheque no., transfer ref…"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="Any additional note"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-5 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Record Payment'}
            </button>
          </form>
        )}
      </div>

      {order.status === 'pending' || order.status === 'confirmed' ? (
        <button
          onClick={handleCancel}
          className="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700"
        >
          Cancel Order
        </button>
      ) : null}
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
