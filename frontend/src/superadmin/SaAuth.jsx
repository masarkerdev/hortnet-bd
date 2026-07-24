import { createContext, useContext, useState } from 'react';
import saApi from './saApi';

const Ctx = createContext(null);
export const useSa = () => useContext(Ctx);

export function SaAuthProvider({ children }) {
  const [sa, setSa] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sa_me') || 'null'); } catch { return null; }
  });

  async function login(email, password) {
    const r = await saApi.post('/login', { email, password });
    if (!r.data?.success) throw new Error(r.data?.message || 'লগইন ব্যর্থ');
    const me = { name: r.data.name, person_name: r.data.person_name, office: r.data.office, subject: r.data.subject, role: r.data.role, assignedCenters: r.data.assignedCenters || [] };
    sessionStorage.setItem('sa_tk', r.data.token);
    sessionStorage.setItem('sa_me', JSON.stringify(me));
    setSa(me);
    return me;
  }
  function logout() {
    sessionStorage.removeItem('sa_tk');
    sessionStorage.removeItem('sa_me');
    setSa(null);
  }
  return <Ctx.Provider value={{ sa, login, logout }}>{children}</Ctx.Provider>;
}
