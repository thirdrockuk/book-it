import { Link } from 'react-router-dom';
import type { Event } from '../types';

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const start = new Date(event.starts_at);
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h2>
      <p className="text-sm text-gray-500 mb-2">
        {start.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
      {event.location && (
        <p className="text-sm text-gray-600 mb-3">📍 {event.location}</p>
      )}
      <p className="text-gray-700 text-sm line-clamp-2 mb-4">{event.description}</p>
      <Link
        to={`/events/${event.id}`}
        className="inline-block bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
      >
        View Details
      </Link>
    </div>
  );
}
