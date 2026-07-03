import { Navigate } from 'react-router-dom';
import { useSa } from './SaAuth';

export default function SaProtected({ children }) {
  const { sa } = useSa();
  if (!sa) return <Navigate to="/superadmin/login" replace />;
  return children;
}
