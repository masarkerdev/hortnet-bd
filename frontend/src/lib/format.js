const BN = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
export const toBn = (v) => String(v ?? '').replace(/[0-9]/g, (d) => BN[Number(d)]);
export function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '৳ ০';
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return '৳ ' + toBn(s);
}

// বাংলাদেশ সময় (Asia/Dhaka, UTC+6) অনুযায়ী সঠিক YYYY-MM-DD বের করে —
// আগে new Date().toISOString().slice(0,10) ব্যবহার হতো, যেটা UTC তারিখ দেয়,
// এবং মধ্যরাতের কাছাকাছি সময়ে ভুল (এক দিন কম/বেশি) তারিখ দেখাতো
export function localDateStr(input) {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
}

export const today = () => localDateStr();

export function dateBn(v) {
  if (!v) return '—';
  const d = localDateStr(v).split('-');
  return d.length === 3 ? toBn(`${d[2]}-${d[1]}-${d[0]}`) : toBn(v);
}
