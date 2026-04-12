import { Link } from 'react-router-dom';
import { useAdminEvents } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminEventList() {
  const { data: events, isLoading } = useAdminEvents();
  const qc = useQueryClient();

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return;
    await apiClient.delete(`/api/admin/events/${id}`);
    qc.invalidateQueries({ queryKey: ['admin', 'events'] });
  }

  if (isLoading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          to="/admin/events/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
        >
          + New Event
        </Link>
      </div>

      {!events?.length ? (
        <p className="text-gray-500">No events yet.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Ticket Types</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(event.starts_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {event.ticket_types.length}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      to={`/admin/events/${event.id}/edit`}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/admin/events/${event.id}/ticket-types`}
                      className="text-green-600 hover:underline text-xs"
                    >
                      Ticket Types
                    </Link>
                    <Link
                      to={`/admin/events/${event.id}/attendee-report`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Attendee Report
                    </Link>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[status] ?? ''}`}>
      {status}
    </span>
  );
}
