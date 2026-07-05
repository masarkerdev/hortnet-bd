import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IcEye } from '../components/icons';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitStep1(e) {
    e.preventDefault();
    setError(''); setHint(''); setBusy(true);
    try {
      const d = await sendOtp(email.trim(), password);
      if (d.success) { setStep(2); setHint(d.message || ''); }
      else setError(d.message || 'ইমেইল বা পাসওয়ার্ড ভুল।');
    } catch (err) {
      setError(err?.response?.data?.message || 'সংযোগ সমস্যা।');
    } finally { setBusy(false); }
  }

  async function submitStep2(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await verifyOtp(email.trim(), otp.trim());
      if (d.success) navigate('/app', { replace: true });
      else setError(d.message || 'OTP ভুল।');
    } catch (err) {
      setError(err?.response?.data?.message || 'সংযোগ সমস্যা।');
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-brand-800 px-8 py-10 text-white lg:px-12 lg:py-14">
        <Botanical />
        <div className="relative flex items-center gap-2.5">
          <LeafMark className="h-9 w-9" />
          <span className="text-xl font-semibold tracking-tight">HortNet-BD</span>
        </div>
        <div className="relative hidden lg:block">
          <h2 className="max-w-sm text-3xl font-semibold leading-snug">হর্টিকালচার সেন্টার ব্যবস্থাপনা</h2>
          <p className="mt-3 max-w-sm text-brand-100">কৃষি সম্প্রসারণ অধিদপ্তরের হর্টিকালচার সেন্টারের চারা, স্টক ও বিক্রয় ব্যবস্থাপনা।</p>
        </div>
        <div className="relative hidden text-sm text-brand-200 lg:block">কৃষি সম্প্রসারণ অধিদপ্তর (DAE)</div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">লগইন করুন</h1>
              <p className="mt-1 text-sm text-muted">ইমেইল ও পাসওয়ার্ড দিন।</p>
              <form onSubmit={submitStep1} className="mt-8 space-y-4">
                <div>
                  <label className="field-label">ইমেইল</label>
                  <input type="email" className="field-input" value={email} onChange={(e)=>setEmail(e.target.value)} autoFocus required />
                </div>
                <div>
                  <label className="field-label">পাসওয়ার্ড</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className="field-input pr-10" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                    <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--tm)' }} aria-label="পাসওয়ার্ড দেখান">
                      <IcEye className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
                <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'যাচাই হচ্ছে…' : 'লগইন করুন'}</button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">OTP যাচাই</h1>
              <p className="mt-1 text-sm text-muted">{email}-এ পাঠানো ৬ সংখ্যার কোড দিন।</p>
              {hint && <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">{hint}</div>}
              <form onSubmit={submitStep2} className="mt-6 space-y-4">
                <div>
                  <label className="field-label">OTP</label>
                  <input inputMode="numeric" maxLength={6} className="field-input tracking-[0.5em] text-center text-lg" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,''))} autoFocus required />
                </div>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
                <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'যাচাই হচ্ছে…' : 'প্রবেশ করুন'}</button>
                <button type="button" onClick={()=>{setStep(1);setOtp('');setError('');}} className="w-full text-sm text-muted hover:text-ink">← ফিরে যান</button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LeafMark({ className }) {
  return (<svg className={className} viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28C9 28 5 22 5 15 5 9 9 5 16 4c7 1 11 5 11 11 0 7-4 13-11 13Z" fill="#eef6f0"/><path d="M16 24V9M16 15l5-4M16 19l-5-4" stroke="#25794a" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>);
}
function Botanical() {
  return (<svg className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 text-brand-700/40" viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d="M100 190V40" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M100 90c0-22 18-40 40-40 0 22-18 40-40 40Z" fill="currentColor"/><path d="M100 130c0-22-18-40-40-40 0 22 18 40 40 40Z" fill="currentColor"/></svg>);
}
