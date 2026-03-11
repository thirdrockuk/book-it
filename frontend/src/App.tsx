import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import BookingView from './pages/BookingView';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminEventList from './pages/admin/EventList';
import AdminEventForm from './pages/admin/EventForm';
import AdminTicketTypeForm from './pages/admin/TicketTypeForm';
import AdminTicketTypeList from './pages/admin/TicketTypeList';
import AdminOrderList from './pages/admin/OrderList';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminUserList from './pages/admin/UserList';
import AdminUserForm from './pages/admin/UserForm';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<Layout />}>
          <Route index element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/checkout" element={<Checkout />} />
          <Route path="/orders/:id/confirmation" element={<Confirmation />} />
          <Route path="/booking/:token" element={<BookingView />} />
        </Route>

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events" element={<AdminEventList />} />
            <Route path="/admin/events/new" element={<AdminEventForm />} />
            <Route path="/admin/events/:id/edit" element={<AdminEventForm />} />
            <Route path="/admin/events/:id/ticket-types" element={<AdminTicketTypeList />} />
            <Route path="/admin/events/:id/ticket-types/new" element={<AdminTicketTypeForm />} />
            <Route path="/admin/events/:id/ticket-types/:tid/edit" element={<AdminTicketTypeForm />} />
            <Route path="/admin/orders" element={<AdminOrderList />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/users" element={<AdminUserList />} />
            <Route path="/admin/users/new" element={<AdminUserForm />} />
            <Route path="/admin/users/:id/edit" element={<AdminUserForm />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
