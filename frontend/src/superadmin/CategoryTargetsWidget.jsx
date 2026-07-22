import { useEffect, useState } from 'react';
import saApi from './saApi';
import { useSa } from './SaAuth';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',red:'#dc2626',accent:'#3b6d11' };
const shadow = '0 1px 3px rgba(0,0,0,0.08)';
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);

const MOTHER_CATEGORIES = [
  'ফলদ চারা', 'ফলদ কলম', 'শীতকালীন সবজি চারা', 'গ্রীষ্মকালীন সবজি চারা',
  'ঔষধি চারা', 'মসলার চারা', 'মসলার কলম', 'শোভাবর্ধনকারী চারা', 'শোভাবর্ধনকারী কলম',
  'ফুলের চারা', 'শীতকালীন ফুল', 'গ্রীষ্মকালীন ফুল', 'পাম জাতীয় চারা', 'অন্যান্য চারা',
];

function fmtN(n) { return toBn(Math.round(n || 0)); }

export default function CategoryTargetsWidget() {
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
  const [collapsed, setCollapsed] = useState(true);

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
  const filledCount = MOTHER_CATEGORIES.filter((mc) => (Number(values[mc]) || 0) > 0).length;

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

  if (loading) return <div style={{ padding:'20px 0', textAlign:'center', color:C.muted, fontFamily:FONT }}>লোড হচ্ছে…</div>;

  if (!isDir) {
    return null; // শুধু পরিচালক দেখবেন
  }

  return (
    <div style={{ fontFamily: FONT, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:shadow, overflow:'hidden' }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', background:'linear-gradient(135deg, #16a34a10, #16a34a05)', borderBottom: collapsed ? 'none' : `1px solid ${C.border}` }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🎯</span>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text }}>ক্যাটাগরি-ভিত্তিক লক্ষ্যমাত্রা নির্ধারণ</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>প্রতিটি সেন্টারের জন্য ১৩টি ক্যাটাগরিতে বার্ষিক লক্ষ্যমাত্রা নির্ধারণ করুন</div>
          </div>
        </div>
        <span style={{ fontSize:14, color:C.muted, transform: collapsed ? 'none' : 'rotate(180deg)', transition:'.2s' }}>▼</span>
      </div>

      {!collapsed && (
        <div style={{ padding:20 }}>
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
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

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10, marginBottom:18 }}>
            {MOTHER_CATEGORIES.map((mc) => (
              <div key={mc} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.bg, borderRadius:9, border:`1px solid ${(Number(values[mc])||0)>0 ? '#16a34a33' : C.border}` }}>
                <span style={{ flex:1, fontSize:13, color:C.text }}>{mc}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={values[mc] ?? 0}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setValues({ ...values, [mc]: v === '' ? 0 : parseInt(v) });
                  }}
                  style={{ width:90, padding:'6px 10px', border:`1px solid ${C.border}`, borderRadius:7, fontFamily:FONT, fontSize:13, textAlign:'right', outline:'none', background:C.card }}
                />
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', background:C.green3, borderRadius:10 }}>
              <span style={{ fontSize:14, fontWeight:600, color:'#15803d' }}>সর্বমোট লক্ষ্যমাত্রা</span>
              <span style={{ fontSize:24, fontWeight:700, color:'#15803d' }}>{fmtN(grandTotal)}টি</span>
            </div>
            <div style={{ minWidth:140, display:'flex', flexDirection:'column', justifyContent:'center', padding:'14px 18px', background:C.bg, borderRadius:10 }}>
              <span style={{ fontSize:12, color:C.muted }}>নির্ধারিত ক্যাটাগরি</span>
              <span style={{ fontSize:18, fontWeight:700, color:C.text }}>{toBn(filledCount)}/{toBn(MOTHER_CATEGORIES.length)}</span>
            </div>
          </div>

          {msg && <div style={{ color: msg.startsWith('✓') ? C.green : C.red, fontSize:13, marginBottom:12 }}>{msg}</div>}

          <button
            onClick={save}
            disabled={saving}
            style={{ width:'100%', padding:'13px 20px', borderRadius:10, background:C.accent, color:'#fff', border:'none', cursor:'pointer', fontSize:15, fontFamily:FONT, fontWeight:600 }}
          >
            {saving ? 'সংরক্ষণ হচ্ছে…' : '✓ লক্ষ্যমাত্রা সংরক্ষণ করুন'}
          </button>
        </div>
      )}
    </div>
  );
}
