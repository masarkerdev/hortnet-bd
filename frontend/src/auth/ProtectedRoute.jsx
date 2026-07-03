import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted">লোড হচ্ছে…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
