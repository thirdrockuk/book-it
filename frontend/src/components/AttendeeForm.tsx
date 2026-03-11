import type { TicketType, PriceBand } from '../types';
import { ageAtEvent } from '../utils/age';
import { formatPence } from '../utils/currency';

export interface AttendeeInput {
  attendee_name: string;
  attendee_dob: string;
  ticket_type_id: string;
  is_student: boolean;
}

interface Props {
  index: number;
  attendee: AttendeeInput;
  ticketTypes: TicketType[];
  eventStart: Date;
  onChange: (index: number, updated: AttendeeInput) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function resolvePriceBand(
  ticketType: TicketType | undefined,
  dob: string,
  eventStart: Date,
  isStudent: boolean
): PriceBand | null {
  if (!ticketType || !dob) return null;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const age = ageAtEvent(d, eventStart);
    const matching = ticketType.price_bands.filter((b) => age >= b.age_min && age <= b.age_max);
    if (!matching.length) return null;
    if (isStudent) {
      const studentBand = matching.find((b) => b.qualifier === 'student');
      if (studentBand) return studentBand;
    }
    return matching.find((b) => !b.qualifier) ?? matching[0];
  } catch {
    return null;
  }
}

function hasStudentBandForAge(
  ticketType: TicketType | undefined,
  dob: string,
  eventStart: Date
): boolean {
  if (!ticketType || !dob) return false;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return false;
    const age = ageAtEvent(d, eventStart);
    return ticketType.price_bands.some(
      (b) => b.qualifier === 'student' && age >= b.age_min && age <= b.age_max
    );
  } catch {
    return false;
  }
}

export default function AttendeeForm({
  index,
  attendee,
  ticketTypes,
  eventStart,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const selectedTicketType = ticketTypes.find((t) => t.id === attendee.ticket_type_id);
  const showStudentCheckbox = hasStudentBandForAge(selectedTicketType, attendee.attendee_dob, eventStart);
  const resolvedBand = resolvePriceBand(selectedTicketType, attendee.attendee_dob, eventStart, attendee.is_student);

  function update(field: keyof AttendeeInput, value: string) {
    onChange(index, { ...attendee, [field]: value });
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800">Attendee {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 text-sm hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={attendee.attendee_name}
            onChange={(e) => update('attendee_name', e.target.value)}
            placeholder="Full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={attendee.attendee_dob}
            onChange={(e) => update('attendee_dob', e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={attendee.ticket_type_id}
            onChange={(e) => update('ticket_type_id', e.target.value)}
            required
          >
            <option value="">Select ticket type…</option>
            {ticketTypes.filter((t) => t.is_active).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.available !== null && t.available !== undefined
                  ? ` (${t.available} available)`
                  : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStudentCheckbox && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={attendee.is_student}
              onChange={(e) => onChange(index, { ...attendee, is_student: e.target.checked })}
              className="rounded"
            />
            I am in full-time education (student rate applies)
          </label>
        </div>
      )}

      {resolvedBand && (
        <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-800">
          ✅ {resolvedBand.label} (age {resolvedBand.age_min}–{resolvedBand.age_max}) —{' '}
          <strong>{formatPence(resolvedBand.price_pence)}</strong>
        </div>
      )}
      {attendee.attendee_dob && attendee.ticket_type_id && !resolvedBand && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          ⚠️ No price band found for this date of birth and ticket type.
        </div>
      )}
    </div>
  );
}
