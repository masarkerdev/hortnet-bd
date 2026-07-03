import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

let _set = null;

// confirm({ title, message, confirmLabel, cancelLabel, danger, icon }) -> Promise<boolean>
export function confirm(opts = {}) {
  return new Promise((resolve) => {
    if (_set) {
      _set({
        resolve,
        title: opts.title || 'আপনি কি নিশ্চিত?',
        message: opts.message !== undefined ? opts.message : 'মুছলে Recycle Bin-এ যাবে — পরে পুনরুদ্ধার করা যাবে।',
        confirmLabel: opts.confirmLabel || 'হাঁ, মুছুন',
        cancelLabel: opts.cancelLabel || 'বাতিল',
        danger: opts.danger !== false,
        icon: opts.icon || '🗑️',
      });
    } else {
      resolve(window.confirm(opts.title || 'নিশ্চিত?'));
    }
  });
}

export function ConfirmHost() {
  const [s, setS] = useState(null);
  useEffect(() => { _set = setS; return () => { _set = null; }; }, []);
  if (!s) return null;
  const done = (v) => { s.resolve(v); setS(null); };
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ width: '100vw', height: '100dvh' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(28,43,34,0.45)' }} onClick={() => done(false)} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center" style={{ boxShadow: '0 10px 30px -12px rgba(28,43,34,0.25)' }}>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl" style={{ background: s.danger ? '#fdecec' : 'var(--g50)' }}>{s.icon}</div>
        <div className="text-[15px] font-bold" style={{ color: 'var(--tp)' }}>{s.title}</div>
        {s.message && <div className="mt-1.5 text-[13px]" style={{ color: 'var(--tm)' }}>{s.message}</div>}
        <div className="mt-5 flex gap-2.5">
          <button onClick={() => done(false)} className="flex-1 rounded-lg border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor: 'var(--bd)' }}>{s.cancelLabel}</button>
          <button onClick={() => done(true)} className="flex-1 rounded-lg px-4 py-2.5 text-[13px] font-semibold" style={s.danger ? { background: '#fdecec', color: '#d63333' } : { background: 'var(--g600)', color: '#fff' }}>✓ {s.confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
