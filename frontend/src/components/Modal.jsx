import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ width: '100vw', height: '100dvh' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(28,43,34,0.45)' }} onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6`}
        style={{ boxShadow: '0 1px 2px rgba(28,43,34,0.04), 0 8px 24px -12px rgba(28,43,34,0.12)' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="-mr-1 rounded-md p-1 text-xl leading-none text-muted hover:text-ink" aria-label="বন্ধ">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
