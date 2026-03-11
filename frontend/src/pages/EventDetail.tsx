import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../api/events';
import TicketTypePanel from '../components/TicketTypePanel';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id);

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if (error || !event)
    return <div className="text-center py-12 text-red-500">Event not found.</div>;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-sm text-indigo-600 hover:underline mb-4 block">
        ← Back to events
      </Link>
      {event.banner_image_url && (
        <img
          src={event.banner_image_url}
          alt={event.title}
          className="w-full rounded-xl object-cover max-h-72 mb-6"
        />
      )}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <p className="text-gray-500 mb-1">
        {start.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}{' '}
        — {end.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      {event.location && <p className="text-gray-600 mb-4">📍 {event.location}</p>}
      <p className="text-gray-700 mb-8 whitespace-pre-line">{event.description}</p>

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Ticket Types</h2>
      {event.ticket_types.length === 0 ? (
        <p className="text-gray-500">No tickets available yet.</p>
      ) : (
        <div className="space-y-4 mb-8">
          {event.ticket_types
            .filter((t) => t.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((tt) => (
              <TicketTypePanel key={tt.id} ticketType={tt} />
            ))}
        </div>
      )}

      {event.ticket_types.some((t) => t.is_active) && (
        <Link
          to={`/events/${event.id}/checkout`}
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700"
        >
          Book Now
        </Link>
      )}
    </div>
  );
}
