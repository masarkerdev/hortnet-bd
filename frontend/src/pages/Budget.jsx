import { useState, useEffect } from 'react';
import api from '../lib/api';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0).toLocaleString('en-IN'));
const curFY = () => { const now=new Date(); return now.getMonth()>=6 ? now.getFullYear() : now.getFullYear()-1; };

export default function Budget() {
  const [fy, setFy] = useState(curFY());
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [values, setValues] = useState({});

  async function loadPeriods() {
    try {
      const r = await api.get(`/budget/periods?fy=${fy}`);
      if (r.data?.success) {
        const list = r.data.data || [];
        setPeriods(list);
        if (list.length && !list.find(p => p.id === periodId)) {
          setPeriodId(list[0].id);
        } else if (!list.length) {
          setPeriodId('');
        }
      }
    } catch (e) {}
  }

  async function load() {
    if (!periodId) { setData([]); return; }
    setLoading(true); setMsg('');
    try {
      const r = await api.get(`/budget/demands?fy=${fy}&period_id=${periodId}`);
      if (r.data?.success) {
        setData(r.data.data || []);
        const v = {};
        (r.data.data || []).forEach(d => { v[d.leaf_code] = { amount: d.demanded_amount || 0, remarks: d.remarks || '' }; });
        setValues(v);
      }
    } catch (e) {} finally { setLoading(false); }
  }

  useEffect(() => { loadPeriods(); }, [fy]);
  useEffect(() => { load(); }, [periodId]);

  const grouped = {};
  data.forEach(d => {
    if (!grouped[d.mother_code]) grouped[d.mother_code] = { mother_name: d.mother_name, items: [] };
    grouped[d.mother_code].items.push(d);
  });

  const totalDemand = data.reduce((s, d) => s + (Number(values[d.leaf_code]?.amount) || 0), 0);
  const totalAllocated = data.reduce((s, d) => s + (d.allocated_amount || 0), 0);
  const totalShortfall = Math.max(totalDemand - totalAllocated, 0);

  async function save() {
    if (!periodId) return;
    setSaving(true); setMsg('');
    try {
      const demands = data.map(d => ({
        leaf_code: d.leaf_code,
        demanded_amount: Number(values[d.leaf_code]?.amount) || 0,
        remarks: values[d.leaf_code]?.remarks || '',
      }));
      const r = await api.post('/budget/demands', { fy, period_id: periodId, demands });
      if (r.data?.success) { setMsg('✓ সংরক্ষণ হয়েছে'); load(); }
      else setMsg(r.data?.message || 'সমস্যা হয়েছে');
    } catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা হয়েছে'); }
    finally { setSaving(false); }
  }

  const inp = { width: 130, padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 7, fontFamily: FONT, fontSize: 13, textAlign: 'right', outline: 'none' };
  const selectStyle = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, fontFamily: FONT, outline: 'none', background: '#fff' };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📋 বরাদ্দ চাহিদাপত্র</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>অর্থনৈতিক কোড অনুযায়ী বরাদ্দ চাহিদা প্রেরণ</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={fy} onChange={e => setFy(Number(e.target.value))} style={selectStyle}>
            {[curFY(), curFY()-1, curFY()-2].map(y => <option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
          </select>
          <select value={periodId} onChange={e => setPeriodId(Number(e.target.value))} style={{ ...selectStyle, minWidth: 180 }}>
            {!periods.length && <option value="">কোনো কিস্তি খোলা নেই</option>}
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {!periodId ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: 50, background: '#fff', borderRadius: 12, border: '1px solid #e8f5ed' }}>
          এই অর্থবছরে পরিচালক এখনো কোনো চাহিদার কিস্তি খোলেননি। কিস্তি খোলা হলে এখানে দেখা যাবে।
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'মোট চাহিদা', value: fmtN(totalDemand), color: '#1a6b3a' },
              { label: 'মোট বরাদ্দ প্রাপ্ত', value: fmtN(totalAllocated), color: '#2563eb' },
              { label: 'ঘাটতি', value: fmtN(totalShortfall), color: '#dc2626' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>৳{k.value}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>লোড হচ্ছে...</div>
          ) : (
            Object.entries(grouped).map(([mcode, group]) => (
              <div key={mcode} style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '10px 16px', background: '#f0faf3', fontSize: 14, fontWeight: 600 }}>
                  {mcode} — {group.mother_name}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f7f5' }}>
                      {['কোড', 'বিবরণ', 'চাহিদা (৳)', 'বরাদ্দ (৳)', 'ঘাটতি (৳)', 'মন্তব্য'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#5a7a5a', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(d => (
                      <tr key={d.leaf_code} style={{ borderTop: '1px solid #f5f7f5' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{d.leaf_code}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{d.leaf_name}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="text" inputMode="numeric" style={inp}
                            value={values[d.leaf_code]?.amount ?? 0}
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              setValues({ ...values, [d.leaf_code]: { ...values[d.leaf_code], amount: v === '' ? 0 : parseInt(v) } });
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, color: '#2563eb', fontWeight: 600 }}>৳{fmtN(d.allocated_amount)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, color: d.shortfall > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>৳{fmtN(d.shortfall)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="text" style={{ ...inp, width: 140, textAlign: 'left' }}
                            value={values[d.leaf_code]?.remarks ?? ''}
                            onChange={e => setValues({ ...values, [d.leaf_code]: { ...values[d.leaf_code], remarks: e.target.value } })}
                            placeholder="মন্তব্য"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}

          {msg && (
            <div style={{ color: msg.startsWith('✓') ? '#16a34a' : '#dc2626', fontSize: 13, marginBottom: 12 }}>{msg}</div>
          )}

          <button onClick={save} disabled={saving}
            style={{ padding: '12px 24px', borderRadius: 10, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: FONT, fontWeight: 600 }}>
            {saving ? 'সংরক্ষণ হচ্ছে...' : '✓ চাহিদা সংরক্ষণ করুন'}
          </button>
        </>
      )}
    </div>
  );
}
