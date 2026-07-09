import { useState, useEffect } from 'react';
import api from '../lib/api';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => Number(n || 0).toLocaleString('bn-BD');

const FY_OPTIONS = [
  { label: '২০২৫-২৬', value: '2026' },
  { label: '২০২৪-২৫', value: '2025' },
  { label: '২০২৩-২৪', value: '2024' },
];

export default function Reports() {
  const [fy, setFy] = useState(localStorage.getItem('hc_fy') || '2026');
  const [topsheet, setTopsheet] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [catDetail, setCatDetail] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  async function loadTopsheet() {
    setLoading(true); setError(''); setSelectedCat(null); setCatDetail([]);
    try {
      const r = await api.get(`/reports/topsheet?fiscal_year=${fy}`);
      if (r.data?.success) setTopsheet(r.data.data || []);
      else setError(r.data?.message || 'সমস্যা হয়েছে');
    } catch (e) {
      setError(e?.response?.data?.message || 'সংযোগ সমস্যা');
    } finally { setLoading(false); }
  }

  async function loadCatDetail(mc) {
    setSelectedCat(mc);
    setCatLoading(true); setCatDetail([]);
    try {
      const r = await api.get(`/reports/category-detail?mother_category=${encodeURIComponent(mc.mother_category)}`);
      if (r.data?.success) setCatDetail(r.data.data || []);
    } catch {} finally { setCatLoading(false); }
  }

  useEffect(() => { loadTopsheet(); }, [fy]);

  const totalTarget = topsheet.reduce((s, r) => s + Number(r.target || 0), 0);
  const totalStock = topsheet.reduce((s, r) => s + Number(r.net_stock || 0), 0);

  return (
    <div style={{ fontFamily: FONT, padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📊 রিপোর্ট ও বিশ্লেষণ</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>মাসিক চারা ও কলম উৎপাদন বিতরণ রিপোর্ট</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#6b7280' }}>অর্থবছর:</label>
          <select value={fy} onChange={e => setFy(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: FONT, outline: 'none', background: '#fff' }}>
            {FY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI */}
      {!loading && topsheet.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'মোট লক্ষ্যমাত্রা', value: fmtN(totalTarget), color: '#1a6b3a' },
            { label: 'নিট মজুদ', value: fmtN(totalStock), color: '#d97706' },
            { label: 'ক্যাটাগরি', value: toBn(topsheet.length), color: '#7c3aed' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Topsheet Table */}
      <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8f5ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0faf3' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>📋 টপশিট — {fy}</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>ক্লিক করলে বিস্তারিত দেখাবে</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e8f5ed', borderTopColor: '#1a6b3a', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }}/>
            লোড হচ্ছে...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f5f7f5' }}>
                  {['ক্র.নং', 'ক্যাটাগরি', 'বিভাগীয় লক্ষ্যমাত্রা', 'প্রজাতি সংখ্যা', 'নিট মজুদ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#5a7a5a', fontWeight: 600, borderBottom: '1px solid #e8f5ed', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topsheet.map((row, i) => (
                  <tr key={row.mother_category}
                    onClick={() => loadCatDetail(row)}
                    style={{ cursor: 'pointer', background: selectedCat?.mother_category === row.mother_category ? '#f0faf3' : 'transparent', transition: '.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf3'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedCat?.mother_category === row.mother_category ? '#f0faf3' : 'transparent'}>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f5f7f5', color: '#6b7280' }}>{toBn(i + 1)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, borderBottom: '1px solid #f5f7f5' }}>{row.mother_category}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f5f7f5', color: '#1a6b3a', fontWeight: 600 }}>
                      {row.target > 0 ? fmtN(row.target) : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, borderBottom: '1px solid #f5f7f5' }}>{toBn(row.item_count)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #f5f7f5', color: '#d97706' }}>{fmtN(row.net_stock)}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr style={{ background: '#f0faf3' }}>
                  <td colSpan={2} style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, borderTop: '2px solid #c8e0cc' }}>সর্বমোট</td>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, borderTop: '2px solid #c8e0cc', color: '#1a6b3a' }}>{fmtN(totalTarget)}</td>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #c8e0cc' }}></td>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, borderTop: '2px solid #c8e0cc', color: '#d97706' }}>{fmtN(totalStock)}</td>
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
            <span style={{ fontSize: 15, fontWeight: 600 }}>🌱 {selectedCat.mother_category} — বিস্তারিত</span>
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f7f5' }}>
                  {['ক্র.নং', 'সাধারণ নাম', 'জাত', 'নিট মজুদ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#5a7a5a', fontWeight: 600, borderBottom: '1px solid #e8f5ed' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catDetail.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f7f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf3'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{toBn(i + 1)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{item.common_name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{item.variety || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#1a6b3a' }}>{fmtN(item.current_stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
