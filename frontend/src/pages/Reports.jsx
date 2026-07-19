import { useState, useEffect } from 'react';
import api from '../lib/api';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0));

const curFY = () => { const now=new Date(); return now.getMonth()>=6 ? now.getFullYear() : now.getFullYear()-1; };
const MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

// ৪ অর্থবছরের রোলিং রাজস্ব চার্ট — SVG, trend line সহ, কোনো external library ছাড়াই
function RevenueBarChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null); // { fy_year, amount, notes }
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/reports/yearly-revenue').then(r => {
      if (r.data?.success) setData(r.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function saveOverride() {
    if (!editModal) return;
    setSaving(true);
    try {
      await api.post('/reports/historical-revenue', {
        fiscal_year: editModal.fy_year,
        amount: Number(editModal.amount) || 0,
        notes: editModal.notes,
      });
      setEditModal(null);
      load();
    } catch (e) {} finally { setSaving(false); }
  }

  if (loading || !data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const W = 700, H = 300, PAD_TOP = 40, PAD_BOTTOM = 55, PAD_SIDE = 50;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const barGap = 30;
  const barWidth = (W - PAD_SIDE * 2 - barGap * (data.length - 1)) / data.length;
  const fmtMoney = (n) => {
    if (n >= 100000) return toBn((n / 100000).toFixed(2)) + 'ল';
    if (n >= 1000) return toBn((n / 1000).toFixed(1)) + 'হা';
    return toBn(n);
  };
  const points = data.map((d, i) => {
    const barH = maxVal > 0 ? (d.total / maxVal) * chartH : 0;
    const x = PAD_SIDE + i * (barWidth + barGap) + barWidth / 2;
    const y = H - PAD_BOTTOM - barH;
    return { x, y, barH, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18' }}>📈 অর্থবছর অনুযায়ী মোট বিক্রয়/রাজস্ব (গত ৪ বছর)</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 320 }}>
        {[0, 0.33, 0.66, 1].map((f, i) => (
          <line key={i} x1={PAD_SIDE} y1={H - PAD_BOTTOM - f * chartH} x2={W - PAD_SIDE} y2={H - PAD_BOTTOM - f * chartH} stroke="#f0f0ee" strokeWidth="1" />
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <rect x={p.x - barWidth / 2} y={p.y} width={barWidth} height={p.barH} rx="6" fill={p.is_manual ? '#c8d8cc' : (i === points.length - 1 ? '#1a6b3a' : '#7fb896')} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a6b3a">৳{fmtMoney(p.total)}</text>
            <text x={p.x} y={H - PAD_BOTTOM + 20} textAnchor="middle" fontSize="12" fill="#5a7a5a">{toBn(p.fy)}</text>
            <text x={p.x} y={H - PAD_BOTTOM + 36} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.is_manual ? 'ম্যানুয়াল' : 'প্রকৃত ডেটা'}</text>
          </g>
        ))}
        <path d={linePath} fill="none" stroke="#1a6b3a" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#1a6b3a" />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {data.map((d) => (
          <button key={d.fy_year} onClick={() => setEditModal({ fy_year: d.fy_year, amount: String(d.total), notes: '' })}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e0e0e0', background: '#f8fafc', color: '#6b7280', fontSize: 11, fontFamily: FONT, cursor: 'pointer' }}>
            ✏️ {toBn(d.fy)} সংশোধন করুন
          </button>
        ))}
      </div>

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 340 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>রাজস্ব ম্যানুয়াল এন্ট্রি</div>
            <input type="text" inputMode="numeric" value={editModal.amount}
              onChange={(e) => setEditModal({ ...editModal, amount: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="টাকার পরিমাণ"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontFamily: FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <input type="text" value={editModal.notes}
              onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
              placeholder="মন্তব্য (ঐচ্ছিক)"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontFamily: FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বাতিল</button>
              <button onClick={saveOverride} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
                {saving ? 'সংরক্ষণ হচ্ছে...' : '✓ সংরক্ষণ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [fy, setFy] = useState(curFY());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [catDetail, setCatDetail] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  async function loadTopsheet() {
    setLoading(true); setError(''); setSelectedCat(null); setCatDetail([]);
    try {
      const r = await api.get(`/reports/topsheet?fy=${fy}&month=${month}`);
      if (r.data?.success) { setData(r.data.data || []); setMeta({ fy: r.data.fy, month: r.data.month }); }
      else setError(r.data?.message || 'সমস্যা হয়েছে');
    } catch (e) {
      setError(e?.response?.data?.message || 'সংযোগ সমস্যা');
    } finally { setLoading(false); }
  }

  async function loadCatDetail(mc) {
    setSelectedCat(mc);
    setCatLoading(true); setCatDetail([]);
    try {
      const r = await api.get(`/reports/category-detail?mother_category=${encodeURIComponent(mc.mother_category)}&fy=${fy}&month=${month}`);
      if (r.data?.success) { setCatDetail(r.data.data || []); setSelectedCat({...mc, propagation_class: r.data.propagation_class}); }
    } catch {} finally { setCatLoading(false); }
  }

  useEffect(() => { loadTopsheet(); }, [fy, month]);

  useEffect(() => {
    api.get(`/reports/target-summary?fy=${fy}`).then(r => { if (r.data?.success) setSummary(r.data); }).catch(() => {});
  }, [fy]);

  const totals = data.reduce((acc, r) => ({
    target: acc.target + r.divisional_target,
    prodCur: acc.prodCur + r.production.current_month,
    prodPrev: acc.prodPrev + r.production.prev_months_total,
    prodSub: acc.prodSub + r.production.subtotal,
    prodDae: acc.prodDae + r.production.dae_challan_received,
    prodJer: acc.prodJer + r.production.prev_year_balance,
    prodTotal: acc.prodTotal + r.production.grand_total,
    distTarget: acc.distTarget + r.distribution.target,
    distCur: acc.distCur + r.distribution.current_month,
    distPrev: acc.distPrev + r.distribution.prev_months_total,
    distSub: acc.distSub + r.distribution.subtotal,
    distDae: acc.distDae + r.distribution.dae_challan_sent,
    distDamaged: acc.distDamaged + r.distribution.damaged,
    distTotal: acc.distTotal + r.distribution.grand_total,
    netStock: acc.netStock + r.net_stock,
  }), { target:0,prodCur:0,prodPrev:0,prodSub:0,prodDae:0,prodJer:0,prodTotal:0,distTarget:0,distCur:0,distPrev:0,distSub:0,distDae:0,distDamaged:0,distTotal:0,netStock:0 });

  const th = { padding: '8px 10px', fontSize: 11, color: '#5a7a5a', fontWeight: 600, borderBottom: '1px solid #e8f5ed', whiteSpace: 'nowrap', textAlign: 'center', background: '#f0faf3' };
  const td = { padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f5f7f5', textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📊 রিপোর্ট ও বিশ্লেষণ — টপশিট</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>মাসিক চারা ও কলম উৎপাদন বিতরণ রিপোর্ট</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap:'wrap' }}>
          <select value={fy} onChange={e => setFy(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fff' }}>
            {[curFY(), curFY()-1, curFY()-2].map(y => <option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fff' }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, marginBottom:16 }}>
          <div style={{ background:'#fff', border:'1px solid #e8f5ed', borderRadius:14, padding:'18px 20px', borderTop:'3px solid #1a6b3a' }}>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:6 }}>মোট লক্ষ্যমাত্রা</div>
            <div style={{ fontSize:26, fontWeight:700, color:'#1a6b3a' }}>{fmtN(summary.target)}<span style={{ fontSize:14, fontWeight:500 }}> টি চারা/কলম</span></div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>({summary.fy} অর্থবছরে)</div>
          </div>
          <div style={{ background:'#fff', border:'1px solid #e8f5ed', borderRadius:14, padding:'18px 20px', borderTop:'3px solid #d97706' }}>
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:6 }}>অর্জিত</div>
            <div style={{ fontSize:26, fontWeight:700, color:'#d97706' }}>{fmtN(summary.achieved)}<span style={{ fontSize:14, fontWeight:500 }}> টি চারা/কলম</span></div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>এখন অব্দি</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Topsheet Table */}
      <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8f5ed', background: '#f0faf3' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>📋 টপশিট — অর্থবছর {meta?.fy || `${fy}-${String(fy+1).slice(-2)}`}, {MONTHS[month-1]} পর্যন্ত</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e8f5ed', borderTopColor: '#1a6b3a', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }}/>
            লোড হচ্ছে...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...th, textAlign:'left', minWidth: 60 }}>ক্র.নং</th>
                  <th rowSpan={2} style={{ ...th, textAlign:'left', minWidth: 160 }}>বিবরণ</th>
                  <th rowSpan={2} style={{ ...th, minWidth: 90, background:'#e8f5ed' }}>বিভাগীয় লক্ষ্যমাত্রা</th>
                  <th colSpan={6} style={{ ...th, background:'#dcfce7' }}>উৎপাদন</th>
                  <th colSpan={7} style={{ ...th, background:'#fef3c7' }}>বিতরণ</th>
                  <th rowSpan={2} style={{ ...th, minWidth: 90, background:'#dbeafe' }}>নীট মজুদ</th>
                </tr>
                <tr>
                  <th style={{ ...th, background:'#dcfce7' }}>চলতি মাস</th>
                  <th style={{ ...th, background:'#dcfce7' }}>পূর্বমাস পর্যন্ত</th>
                  <th style={{ ...th, background:'#dcfce7' }}>মোট</th>
                  <th style={{ ...th, background:'#dcfce7' }}>ডিএই চালান প্রাপ্তি</th>
                  <th style={{ ...th, background:'#dcfce7' }}>পূর্ব বছরের মজুদ</th>
                  <th style={{ ...th, background:'#dcfce7', fontWeight:700 }}>সর্বমোট</th>
                  <th style={{ ...th, background:'#fef3c7' }}>লক্ষ্যমাত্রা</th>
                  <th style={{ ...th, background:'#fef3c7' }}>চলতি মাস</th>
                  <th style={{ ...th, background:'#fef3c7' }}>পূর্বমাস পর্যন্ত</th>
                  <th style={{ ...th, background:'#fef3c7' }}>মোট</th>
                  <th style={{ ...th, background:'#fef3c7' }}>ডিএই চালান</th>
                  <th style={{ ...th, background:'#fef3c7' }}>মৃত/বিনষ্ট</th>
                  <th style={{ ...th, background:'#fef3c7', fontWeight:700 }}>সর্বমোট</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.mother_category}
                    onClick={() => loadCatDetail(row)}
                    style={{ cursor: 'pointer', background: selectedCat?.mother_category === row.mother_category ? '#f0faf3' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf3'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedCat?.mother_category === row.mother_category ? '#f0faf3' : 'transparent'}>
                    <td style={{ ...td, textAlign:'left', color:'#6b7280' }}>{toBn(i+1)}</td>
                    <td style={{ ...td, textAlign:'left', fontWeight:600 }}>{row.mother_category}</td>
                    <td style={{ ...td, color:'#1a6b3a', fontWeight:600 }}>{row.divisional_target ? fmtN(row.divisional_target) : '—'}</td>
                    <td style={td}>{fmtN(row.production.current_month)}</td>
                    <td style={td}>{fmtN(row.production.prev_months_total)}</td>
                    <td style={{...td, fontWeight:600}}>{fmtN(row.production.subtotal)}</td>
                    <td style={td}>{fmtN(row.production.dae_challan_received)}</td>
                    <td style={td}>{fmtN(row.production.prev_year_balance)}</td>
                    <td style={{...td, fontWeight:700, color:'#059669'}}>{fmtN(row.production.grand_total)}</td>
                    <td style={{...td, color:'#d97706'}}>{row.distribution.target ? fmtN(row.distribution.target) : '—'}</td>
                    <td style={td}>{fmtN(row.distribution.current_month)}</td>
                    <td style={td}>{fmtN(row.distribution.prev_months_total)}</td>
                    <td style={{...td, fontWeight:600}}>{fmtN(row.distribution.subtotal)}</td>
                    <td style={td}>{fmtN(row.distribution.dae_challan_sent)}</td>
                    <td style={{...td, color: row.distribution.damaged>0 ? '#dc2626':'inherit'}}>{fmtN(row.distribution.damaged)}</td>
                    <td style={{...td, fontWeight:700, color:'#b45309'}}>{fmtN(row.distribution.grand_total)}</td>
                    <td style={{...td, fontWeight:700, color:'#1d4ed8'}}>{fmtN(row.net_stock)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0faf3' }}>
                  <td colSpan={2} style={{ ...td, textAlign:'left', fontWeight:700, borderTop:'2px solid #c8e0cc' }}>সর্বমোট</td>
                  <td style={{ ...td, fontWeight:700, color:'#1a6b3a', borderTop:'2px solid #c8e0cc' }}>{fmtN(totals.target)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodCur)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodPrev)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodSub)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodDae)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodJer)}</td>
                  <td style={{...td, fontWeight:700, color:'#059669', borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.prodTotal)}</td>
                  <td style={{...td, fontWeight:700, color:'#d97706', borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distTarget)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distCur)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distPrev)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distSub)}</td>
                  <td style={{...td, fontWeight:700, borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distDae)}</td>
                  <td style={{...td, fontWeight:700, color:'#dc2626', borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distDamaged)}</td>
                  <td style={{...td, fontWeight:700, color:'#b45309', borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.distTotal)}</td>
                  <td style={{...td, fontWeight:700, color:'#1d4ed8', borderTop:'2px solid #c8e0cc'}}>{fmtN(totals.netStock)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Detail */}
      {selectedCat && (
        <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8f5ed', background: '#f0faf3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>🌱 {selectedCat.mother_category} — বিস্তারিত (জাত অনুযায়ী নীট মজুদ)</span>
            <button onClick={() => { setSelectedCat(null); setCatDetail([]); }}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
          </div>
          {catLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>লোড হচ্ছে...</div>
          ) : !catDetail.length ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <p>এই ক্যাটাগরিতে কোনো চারা নেই</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#f0faf3', textAlign:'left' }}>ক্র.নং</th>
                    <th rowSpan={2} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#f0faf3', textAlign:'left', minWidth:120 }}>নাম (বাংলা)</th>
                    <th rowSpan={2} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#f0faf3', textAlign:'left', minWidth:100 }}>জাত</th>
                    <th colSpan={5} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#dcfce7', textAlign:'center' }}>উৎপাদন</th>
                    <th colSpan={4} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#fef3c7', textAlign:'center' }}>বিতরণ</th>
                    <th rowSpan={2} style={{ padding:'8px 10px', fontSize:11, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#dbeafe', textAlign:'right', minWidth:80 }}>নীট মজুদ</th>
                  </tr>
                  <tr>
                    {['চলতি মাস','পূর্বমাস','মোট','পূর্ববছর জের','সর্বমোট'].map(h=>(
                      <th key={h} style={{ padding:'6px 8px', fontSize:10, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#dcfce7', textAlign:'right' }}>{h}</th>
                    ))}
                    {['চলতি মাস','পূর্বমাস','মৃত/বিনষ্ট','সর্বমোট'].map(h=>(
                      <th key={h} style={{ padding:'6px 8px', fontSize:10, color:'#5a7a5a', fontWeight:600, borderBottom:'1px solid #e8f5ed', background:'#fef3c7', textAlign:'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catDetail.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f7f5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0faf3'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>{toBn(i + 1)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{item.common_name}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: '#6b7280' }}>{item.variety || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right' }}>{fmtN(item.production.current_month)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right' }}>{fmtN(item.production.prev_months_total)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right', fontWeight:600 }}>{fmtN(item.production.subtotal)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right' }}>{fmtN(item.production.prev_year_balance)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right', fontWeight:700, color:'#059669' }}>{fmtN(item.production.grand_total)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right' }}>{fmtN(item.distribution.current_month)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right' }}>{fmtN(item.distribution.prev_months_total)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right', color: item.distribution.damaged>0?'#dc2626':'inherit' }}>{fmtN(item.distribution.damaged)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, textAlign:'right', fontWeight:700, color:'#b45309' }}>{fmtN(item.distribution.grand_total)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: '#1d4ed8', textAlign:'right' }}>{fmtN(item.current_stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <RevenueBarChart />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
