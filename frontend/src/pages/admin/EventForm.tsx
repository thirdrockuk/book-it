import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminEvent } from '../../api/admin';
import { apiClient } from '../../api/client';

export default function AdminEventForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { data: existing } = useAdminEvent(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    status: 'draft',
    sales_start_at: '',
    sales_end_at: '',
    banner_image_url: '',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        location: existing.location,
        starts_at: existing.starts_at.slice(0, 16),
        ends_at: existing.ends_at.slice(0, 16),
        status: existing.status,
        sales_start_at: existing.sales_start_at?.slice(0, 16) ?? '',
        sales_end_at: existing.sales_end_at?.slice(0, 16) ?? '',
        banner_image_url: existing.banner_image_url ?? '',
      });
    }
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      sales_start_at: form.sales_start_at || null,
      sales_end_at: form.sales_end_at || null,
      banner_image_url: form.banner_image_url || null,
    };
    if (isEdit) {
      await apiClient.put(`/api/admin/events/${id}`, payload);
    } else {
      await apiClient.post('/api/admin/events', payload);
    }
    navigate('/admin/events');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Event' : 'New Event'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-6">
        <Field label="Title">
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Location">
          <input
            className="input"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts At">
            <input
              type="datetime-local"
              className="input"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </Field>
          <Field label="Ends At">
            <input
              type="datetime-local"
              className="input"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sales Start (optional)">
            <input
              type="datetime-local"
              className="input"
              value={form.sales_start_at}
              onChange={(e) => setForm({ ...form, sales_start_at: e.target.value })}
            />
          </Field>
          <Field label="Sales End (optional)">
            <input
              type="datetime-local"
              className="input"
              value={form.sales_end_at}
              onChange={(e) => setForm({ ...form, sales_end_at: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Banner Image URL (optional)">
          <input
            className="input"
            type="url"
            placeholder="https://example.com/banner.jpg"
            value={form.banner_image_url}
            onChange={(e) => setForm({ ...form, banner_image_url: e.target.value })}
          />
          {form.banner_image_url && (
            <img
              src={form.banner_image_url}
              alt="Banner preview"
              className="mt-2 rounded-lg w-full object-cover max-h-40"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </Field>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded font-medium hover:bg-indigo-700"
          >
            {isEdit ? 'Save Changes' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="border border-gray-300 px-6 py-2 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
