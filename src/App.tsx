import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import CreateSchedule from './pages/admin/CreateSchedule';
import ScheduleDetails from './pages/admin/ScheduleDetails';
import BookingPage from './pages/book/BookingPage';
import RequireAuth from './components/admin/RequireAuth';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/create"
          element={
            <RequireAuth>
              <CreateSchedule />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/schedule/:slug"
          element={
            <RequireAuth>
              <ScheduleDetails />
            </RequireAuth>
          }
        />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </Router>
  );
}
