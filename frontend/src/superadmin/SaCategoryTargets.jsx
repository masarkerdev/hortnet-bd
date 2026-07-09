import { useEffect, useState } from 'react';
import saApi from './saApi';
import { useSa } from './SaAuth';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',red:'#dc2626',accent:'#3b6d11' };
const shadow = '0 1px 3px rgba(0,0,0,0.08)';
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);

const MOTHER_CATEGORIES = [
  'ফলদ চারা', 'ফলদ কলম', 'শীতকালীন সবজি চারা', 'গ্রীষ্মকালীন সবজি চারা',
  'ঔষধি চারা', 'মসলার চারা/কলম', 'শোভাবর্ধনকারী চারা/কলম', 'ফুলের চারা/কলম',
  'শীতকালীন ফুল', 'গ্রীষ্মকালীন ফুল', 'পাম জাতীয় চারা',
];

function fmtN(n) { return toBn(Math.round(n || 0)); }

export default function SaCategoryTargets() {
  const { sa } = useSa();
  const isDir = sa?.role === 'director';
  const curFY = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const [centers, setCenters] = useState([]);
  const [slug, setSlug] = useState('');
  const [fy, setFy] = useState(curFY);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    saApi.get('/tenants').then((r) => {
      const list = r.data?.data || [];
      setCenters(list);
      if (list.length) setSlug(list[0].slug);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    setMsg('');
    saApi.get(`/center/${slug}/category-targets`, { params: { fy } }).then((r) => {
      const map = r.data?.data?.targets || {};
      const next = {};
      MOTHER_CATEGORIES.forEach((mc) => { next[mc] = map[mc] || 0; });
      setValues(next);
    }).catch(() => {
      const next = {};
      MOTHER_CATEGORIES.forEach((mc) => { next[mc] = 0; });
      setValues(next);
    });
  }, [slug, fy]);

  const grandTotal = MOTHER_CATEGORIES.reduce((s, mc) => s + (Number(values[mc]) || 0), 0);

  async function save() {
    setSaving(true); setMsg('');
    try {
      const targets = MOTHER_CATEGORIES.map((mc) => ({
        mother_category_name_bn: mc,
        target_quantity: Number(values[mc]) || 0,
      }));
      const r = await saApi.post(`/center/${slug}/set-category-targets`, { fy, targets });
      if (r.data?.success) setMsg('✓ সংরক্ষণ হয়েছে');
      else setMsg(r.data?.message || 'সমস্যা হয়েছে');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  }

  const inp = { width:'100%', padding:'10px 14px', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:9, color:C.text, fontSize:14, outline:'none', fontFamily:FONT, boxSizing:'border-box' };

  if (loading) return <div style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontFamily:FONT }}>লোড হচ্ছে…</div>;

  if (!isDir) {
    return <div style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontFamily:FONT }}>শুধু পরিচালক ক্যাটাগরি-ওয়াইজ লক্ষ্যমাত্রা নির্ধারণ করতে পারবেন।</div>;
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:16 }}>🎯 ক্যাটাগরি-ওয়াইজ লক্ষ্যমাত্রা নির্ধারণ</div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, boxShadow:shadow, maxWidth:560 }}>
        <div style={{ display:'flex', gap:12, marginBottom:18 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>সেন্টার</label>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} style={inp}>
              {centers.map((c) => <option key={c.slug} value={c.slug}>{c.name_bn}</option>)}
            </select>
          </div>
          <div style={{ width:160 }}>
            <label style={{ display:'block', fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>অর্থবছর</label>
            <select value={fy} onChange={(e) => setFy(Number(e.target.value))} style={inp}>
              {[curFY, curFY - 1, curFY - 2].map((y) => (
                <option key={y} value={y}>FY {toBn(y)}-{toBn(y + 1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {MOTHER_CATEGORIES.map((mc) => (
            <div key={mc} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ flex:1, fontSize:13, color:C.text }}>{mc}</span>
              <input
                type="text"
                inputMode="numeric"
                value={values[mc] ?? 0}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setValues({ ...values, [mc]: v === '' ? 0 : parseInt(v) });
                }}
                style={{ ...inp, width:140, textAlign:'right' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:C.green3, borderRadius:10, marginBottom:16 }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#15803d' }}>সর্বমোট লক্ষ্যমাত্রা</span>
          <span style={{ fontSize:22, fontWeight:700, color:'#15803d' }}>{fmtN(grandTotal)}টি</span>
        </div>

        {msg && <div style={{ color: msg.startsWith('✓') ? C.green : C.red, fontSize:13, marginBottom:12 }}>{msg}</div>}

        <button
          onClick={save}
          disabled={saving}
          style={{ width:'100%', padding:'12px 20px', borderRadius:9, background:C.accent, color:'#fff', border:'none', cursor:'pointer', fontSize:15, fontFamily:FONT, fontWeight:600 }}
        >
          {saving ? 'সংরক্ষণ হচ্ছে…' : '✓ লক্ষ্যমাত্রা সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}
