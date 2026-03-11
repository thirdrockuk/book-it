import { Link } from 'react-router-dom';
import { useAdminUsers, useCurrentAdminUser } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminUserList() {
  const { data: users, isLoading } = useAdminUsers();
  const { data: currentUser } = useCurrentAdminUser();
  const qc = useQueryClient();

  async function handleDelete(id: string) {
    if (!confirm('Delete this admin user? This cannot be undone.')) return;
    await apiClient.delete(`/api/admin/users/${id}`);
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  if (isLoading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
        <Link
          to="/admin/users/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
        >
          + New User
        </Link>
      </div>

      {!users?.length ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.email}
                    {currentUser?.email === user.email && (
                      <span className="ml-2 text-xs text-indigo-500 font-normal">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      to={`/admin/users/${user.id}/edit`}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      Edit
                    </Link>
                    {currentUser?.email !== user.email && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    )}
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
