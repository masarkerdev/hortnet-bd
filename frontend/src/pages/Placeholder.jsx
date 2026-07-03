export default function Placeholder({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-line bg-white py-16 text-center text-muted">
        এই page-টি নতুন ডিজাইনে তৈরি হচ্ছে — শীঘ্রই আসছে।
      </div>
    </div>
  );
}
