import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Login from './Login';

const RESERVED = ['login','app','superadmin','catalog','notices','superadmin'];

export default function TenantLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!slug || RESERVED.includes(slug)) {
      navigate('/');
      return;
    }
    localStorage.setItem('tenantSlug', slug);
    setReady(true);
  }, [slug]);

  if (!ready) return null;
  return <Login />;
}
