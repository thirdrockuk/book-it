import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-56 bg-white shadow-sm flex flex-col py-6">
        <div className="px-6 mb-8">
          <Link to="/admin" className="text-xl font-bold text-indigo-600">
            Bookit Admin
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-1 text-sm">
          <Link to="/admin" className="block px-3 py-2 rounded hover:bg-gray-100">
            Dashboard
          </Link>
          <Link to="/admin/events" className="block px-3 py-2 rounded hover:bg-gray-100">
            Events
          </Link>
          <Link to="/admin/orders" className="block px-3 py-2 rounded hover:bg-gray-100">
            Orders
          </Link>
          <Link to="/admin/users" className="block px-3 py-2 rounded hover:bg-gray-100">
            Users
          </Link>
        </nav>
        <div className="px-4 mt-4">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
