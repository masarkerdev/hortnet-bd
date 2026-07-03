const BN = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
export const toBn = (v) => String(v ?? '').replace(/[0-9]/g, (d) => BN[Number(d)]);
export function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '৳ ০';
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return '৳ ' + toBn(s);
}
export const today = () => new Date().toISOString().slice(0, 10);
export function dateBn(v) {
  if (!v) return '—';
  const d = String(v).slice(0, 10).split('-');
  return d.length === 3 ? toBn(`${d[2]}-${d[1]}-${d[0]}`) : toBn(v);
}
