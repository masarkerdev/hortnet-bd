import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSa } from './SaAuth';

export default function SaLogin() {
  const { login } = useSa();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try { await login(email.trim(), password); navigate('/superadmin'); }
    catch (e) { setErr(e?.response?.data?.message || e.message || 'লগইন ব্যর্থ'); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background:'#f8f6f0', fontFamily:"'Noto Sans Bengali','Segoe UI',sans-serif" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-7" style={{ boxShadow: '0 10px 40px -15px rgba(28,43,34,0.25)' }}>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white" style={{ background: 'var(--g600)' }}>🏛️</div>
          <div className="text-[19px] font-bold" style={{ color: 'var(--tp)' }}>সুপার অ্যাডমিন</div>
          <div className="text-[13px]" style={{ color: 'var(--tm)' }}>হর্টিকালচার সেন্টার ব্যবস্থাপনা</div>
        </div>
        <label className="field-label">ইমেইল</label>
        <input className="field-input mb-3" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="director@dae.gov.bd" />
        <label className="field-label">পাসওয়ার্ড</label>
        <div className="relative mb-4">
          <input type={show ? 'text' : 'password'} className="field-input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--tm)' }}>{show ? 'লুকাও' : 'দেখাও'}</button>
        </div>
        {err && <div className="mb-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: '#fdecec', color: '#d63333' }}>{err}</div>}
        <button onClick={submit} disabled={busy} className="btn-primary w-full justify-center">{busy ? 'লগইন হচ্ছে…' : 'লগইন করুন'}</button>
        <div className="mt-4 text-center text-[12px]" style={{ color: 'var(--tm)' }}>
          <a href="/" style={{ color: 'var(--g600)' }}>← সেন্টার প্যানেলে ফিরুন</a>
        </div>
      </div>
    </div>
  );
}
