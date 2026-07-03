import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

// v1-এর দুই-ধাপ login: send-otp -> verify-otp। token+user sessionStorage-এ।
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('hc_tk') || '');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('hc_me') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem('hc_tk')));

  // reload-এ token বৈধ কিনা যাচাই
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/profile')
      .then((r) => { if (r.data?.data) { setUser(r.data.data); sessionStorage.setItem('hc_me', JSON.stringify(r.data.data)); } })
      .catch(() => logout())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ধাপ ১ — ইমেইল/পাসওয়ার্ড যাচাই + OTP পাঠানো
  async function sendOtp(email, password) {
    const r = await api.post('/auth/send-otp', { email, password });
    return r.data; // { success, message }
  }

  // ধাপ ২ — OTP যাচাই -> token
  async function verifyOtp(email, otp) {
    const r = await api.post('/auth/verify-otp', { email, otp });
    if (r.data?.success) {
      sessionStorage.setItem('hc_tk', r.data.token);
      sessionStorage.setItem('hc_me', JSON.stringify(r.data.user));
      setToken(r.data.token);
      setUser(r.data.user);
    }
    return r.data;
  }

  function logout() {
    sessionStorage.removeItem('hc_tk');
    sessionStorage.removeItem('hc_me');
    setToken('');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
