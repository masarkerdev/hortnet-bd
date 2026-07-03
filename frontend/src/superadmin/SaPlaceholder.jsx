export default function SaPlaceholder({ title }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center" style={{ border: '1px solid var(--bd)' }}>
      <div className="mb-2 text-3xl">🚧</div>
      <div className="text-[16px] font-bold" style={{ color: 'var(--tp)' }}>{title}</div>
      <div className="mt-1 text-[13px]" style={{ color: 'var(--tm)' }}>এই অংশটি পরবর্তী ধাপে তৈরি হবে।</div>
    </div>
  );
}
