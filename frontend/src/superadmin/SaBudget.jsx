import { useState, useEffect } from 'react';
import axios from 'axios';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#f8f6f0', card:'#fff', border:'#e2ddd5', text:'#1a1a18', muted:'#888780', green:'#16a34a', green3:'#f0fdf4', red:'#dc2626', red2:'#fee2e2', amber:'#d97706', blue:'#2563eb', shadow:'0 1px 3px rgba(0,0,0,0.08)' };
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0).toLocaleString('en-IN'));
const curFY = () => { const now=new Date(); return now.getMonth()>=6 ? now.getFullYear() : now.getFullYear()-1; };

export default function SaBudget() {
  const [fy, setFy] = useState(curFY());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null); // {center_slug, leaf_code, current}
  const [allocValue, setAllocValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const base = (import.meta.env.VITE_API_URL || '/api');
    const token = sessionStorage.getItem('sa_tk');
    try {
      const r = await axios.get(`${base}/budget-admin/consolidated?fy=${fy}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.success) setData(r.data);
    } catch (e) {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [fy]);

  async function saveAllocation() {
    if (!editing) return;
    setSaving(true);
    const base = (import.meta.env.VITE_API_URL || '/api');
    const token = sessionStorage.getItem('sa_tk');
    try {
      await axios.post(`${base}/budget-admin/allocate`, {
        tenant_slug: editing.center_slug,
        leaf_code: editing.leaf_code,
        fiscal_year: fy,
        allocated_amount: Number(allocValue) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditing(null);
      load();
    } catch (e) {} finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return <div style={{ padding:20, color:V.muted, fontFamily:FONT }}>ডেটা আনা যায়নি।</div>;

  // leaf_code অনুযায়ী center-wise rows group করি
  const byLeafCode = {};
  data.center_rows.forEach(r => {
    if (!byLeafCode[r.leaf_code]) byLeafCode[r.leaf_code] = [];
    byLeafCode[r.leaf_code].push(r);
  });

  const totalDemand = data.by_mother.reduce((s, m) => s + m.total_demand, 0);
  const totalAllocated = data.by_mother.reduce((s, m) => s + m.total_allocated, 0);

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>💰 বরাদ্দ চাহিদাপত্র — Consolidated</h2>
          <p style={{ fontSize:13, color:V.muted }}>সব সেন্টারের চাহিদা ও বরাদ্দ একসাথে</p>
        </div>
        <select value={fy} onChange={e=>setFy(Number(e.target.value))}
          style={{ padding:'8px 12px', border:`1px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, outline:'none', background:V.card }}>
          {[curFY(), curFY()-1, curFY()-2].map(y => <option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'মোট চাহিদা (সব সেন্টার)', value:fmtN(totalDemand), color:V.green },
          { label:'মোট বরাদ্দ প্রদত্ত', value:fmtN(totalAllocated), color:V.blue },
          { label:'মোট ঘাটতি', value:fmtN(Math.max(totalDemand - totalAllocated, 0)), color:V.red },
        ].map(k => (
          <div key={k.label} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:12, color:V.muted, marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:k.color }}>৳{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>📊 মাদার কোড অনুযায়ী KPI</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginBottom:24 }}>
        {data.by_mother.filter(m => m.total_demand > 0).map(m => (
          <div key={m.mother_code} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, color:V.muted, marginBottom:4 }}>{m.mother_code} — {m.mother_name}</div>
            <div style={{ fontSize:16, fontWeight:700, color:V.green }}>৳{fmtN(m.total_demand)}</div>
            <div style={{ fontSize:11, color:V.muted, marginTop:2 }}>বরাদ্দ: ৳{fmtN(m.total_allocated)}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>🏢 কোড অনুযায়ী সেন্টার-ভিত্তিক বিস্তারিত</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {Object.entries(byLeafCode).map(([leafCode, rows]) => {
          const code = data.codes.find(c => c.leaf_code === leafCode);
          const totalD = rows.reduce((s,r)=>s+r.demanded_amount,0);
          const totalA = rows.reduce((s,r)=>s+r.allocated_amount,0);
          return (
            <div key={leafCode} style={{ background:V.card, borderRadius:10, boxShadow:V.shadow, overflow:'hidden' }}>
              <div onClick={()=>setExpanded(p=>({...p,[leafCode]:!p[leafCode]}))}
                style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:V.muted, transform: expanded[leafCode] ? 'rotate(90deg)' : 'none', display:'inline-block', transition:'.15s' }}>▶</span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{leafCode} — {code?.leaf_name || ''}</span>
                </div>
                <div style={{ display:'flex', gap:14, fontSize:12, color:V.muted }}>
                  <span>চাহিদা: <b style={{color:V.text}}>৳{fmtN(totalD)}</b></span>
                  <span>বরাদ্দ: <b style={{color:V.blue}}>৳{fmtN(totalA)}</b></span>
                </div>
              </div>
              {expanded[leafCode] && (
                <table style={{ width:'100%', borderCollapse:'collapse', borderTop:`1px solid ${V.border}` }}>
                  <thead>
                    <tr style={{ background:V.bg }}>
                      {['সেন্টার','চাহিদা','বরাদ্দ','ঘাটতি','মন্তব্য',''].map(h=>(
                        <th key={h} style={{ padding:'6px 12px', fontSize:11, color:V.muted, textAlign:'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,i) => (
                      <tr key={i} style={{ borderTop:`1px solid ${V.border}` }}>
                        <td style={{ padding:'6px 12px', fontSize:12 }}>{r.center_name}</td>
                        <td style={{ padding:'6px 12px', fontSize:12 }}>৳{fmtN(r.demanded_amount)}</td>
                        <td style={{ padding:'6px 12px', fontSize:12, color:V.blue, fontWeight:600 }}>৳{fmtN(r.allocated_amount)}</td>
                        <td style={{ padding:'6px 12px', fontSize:12, color: (r.demanded_amount - r.allocated_amount) > 0 ? V.red : V.green }}>
                          ৳{fmtN(Math.max(r.demanded_amount - r.allocated_amount, 0))}
                        </td>
                        <td style={{ padding:'6px 12px', fontSize:11, color:V.muted }}>{r.remarks || '—'}</td>
                        <td style={{ padding:'6px 12px' }}>
                          <button onClick={()=>{ setEditing({ center_slug:r.center_slug, leaf_code:leafCode }); setAllocValue(String(r.allocated_amount||0)); }}
                            style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:11, fontFamily:FONT }}>
                            বরাদ্দ দিন
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {!Object.keys(byLeafCode).length && (
          <div style={{ textAlign:'center', color:V.muted, padding:30, background:V.card, borderRadius:10 }}>কোনো চাহিদা এখনো জমা পড়েনি</div>
        )}
      </div>

      {/* Allocation Modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:V.card, borderRadius:14, padding:24, width:340 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>বরাদ্দের পরিমাণ নির্ধারণ করুন</div>
            <input type="text" inputMode="numeric" value={allocValue}
              onChange={e=>setAllocValue(e.target.value.replace(/[^0-9]/g,''))}
              placeholder="টাকার পরিমাণ"
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:16 }}
            />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setEditing(null)} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:13, fontFamily:FONT }}>বাতিল</button>
              <button onClick={saveAllocation} disabled={saving} style={{ padding:'8px 16px', borderRadius:8, background:V.green, color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                {saving ? 'সংরক্ষণ হচ্ছে...' : '✓ সংরক্ষণ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
