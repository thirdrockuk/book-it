import { useEvents } from '../api/events';
import EventCard from '../components/EventCard';

export default function EventList() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading events…</div>;
  if (error) return <div className="text-center py-12 text-red-500">Failed to load events.</div>;
  if (!events?.length)
    return <div className="text-center py-12 text-gray-500">No events available.</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Upcoming Events</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
