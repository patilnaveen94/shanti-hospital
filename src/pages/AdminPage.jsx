import { useSelector } from 'react-redux';

import AdminDashboard from '../components/admin/AdminDashboard';
import AdminLogin from '../components/admin/AdminLogin';
import { selectIsAdmin } from '../store/uiSlice';

/** Gate: shows the passcode screen until the staff session is active. */
export default function AdminPage() {
  const isAdmin = useSelector(selectIsAdmin);
  return <div className="bg-white">{isAdmin ? <AdminDashboard /> : <AdminLogin />}</div>;
}
