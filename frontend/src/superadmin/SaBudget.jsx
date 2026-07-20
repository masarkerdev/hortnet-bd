import { useState, useEffect } from 'react';
import axios from 'axios';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#f8f6f0', card:'#fff', border:'#e2ddd5', text:'#1a1a18', muted:'#888780', green:'#16a34a', green3:'#f0fdf4', red:'#dc2626', red2:'#fee2e2', amber:'#d97706', blue:'#2563eb', shadow:'0 1px 3px rgba(0,0,0,0.08)' };
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0).toLocaleString('en-IN'));
const curFY = () => { const now=new Date(); return now.getMonth()>=6 ? now.getFullYear() : now.getFullYear()-1; };

function apiBase() { return (import.meta.env.VITE_API_URL || '/api'); }
function authHeader() { return { Authorization: `Bearer ${sessionStorage.getItem('sa_tk')}` }; }

export default function SaBudget() {
  const [fy, setFy] = useState(curFY());
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [allocValue, setAllocValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [periodModal, setPeriodModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [periodMessage, setPeriodMessage] = useState('');
  const [periodSaving, setPeriodSaving] = useState(false);
  const [periodMsg, setPeriodMsg] = useState('');

  const [editPeriodModal, setEditPeriodModal] = useState(false);
  const [editPeriodName, setEditPeriodName] = useState('');
  const [editPeriodMessage, setEditPeriodMessage] = useState('');
  const [editPeriodMsg, setEditPeriodMsg] = useState('');
  const [editPeriodSaving, setEditPeriodSaving] = useState(false);

  async function saveEditPeriod() {
    if (!editPeriodName.trim() || !periodId) return;
    setEditPeriodSaving(true); setEditPeriodMsg('');
    try {
      const r = await axios.put(`${apiBase()}/budget-admin/periods/${periodId}`, { name: editPeriodName.trim(), message: editPeriodMessage.trim() }, { headers: authHeader() });
      if (r.data?.success) {
        setEditPeriodMsg('✓ আপডেট হয়েছে');
        await loadPeriods();
        setTimeout(() => { setEditPeriodModal(false); setEditPeriodMsg(''); }, 1000);
      } else {
        setEditPeriodMsg(r.data?.message || 'সমস্যা হয়েছে');
      }
    } catch (e) {
      setEditPeriodMsg(e?.response?.data?.message || 'সমস্যা হয়েছে');
    } finally { setEditPeriodSaving(false); }
  }

  async function deletePeriod() {
    if (!periodId) return;
    if (!window.confirm('এই কিস্তি সম্পূর্ণভাবে মুছে ফেলতে চান? এই কিস্তির সব চাহিদা/বরাদ্দ ডেটাও দেখা বন্ধ হয়ে যাবে। এটা ফেরানো যাবে না।')) return;
    setEditPeriodSaving(true); setEditPeriodMsg('');
    try {
      const r = await axios.delete(`${apiBase()}/budget-admin/periods/${periodId}`, { headers: authHeader() });
      if (r.data?.success) {
        setEditPeriodModal(false);
        setPeriodId('');
        await loadPeriods();
      } else {
        setEditPeriodMsg(r.data?.message || 'সমস্যা হয়েছে');
      }
    } catch (e) {
      setEditPeriodMsg(e?.response?.data?.message || 'সমস্যা হয়েছে');
    } finally { setEditPeriodSaving(false); }
  }

  async function loadPeriods() {
    try {
      const r = await axios.get(`${apiBase()}/budget-admin/periods?fy=${fy}`, { headers: authHeader() });
      if (r.data?.success) {
        const list = r.data.data || [];
        setPeriods(list);
        // যদি আগের selected period এই FY-তে না থাকে, প্রথমটা (সর্বশেষ) বেছে নিই
        if (list.length && !list.find(p => p.id === periodId)) {
          setPeriodId(list[0].id);
        } else if (!list.length) {
          setPeriodId('');
        }
      }
    } catch (e) {}
  }

  async function load() {
    if (!periodId) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await axios.get(`${apiBase()}/budget-admin/consolidated?fy=${fy}&period_id=${periodId}`, { headers: authHeader() });
      if (r.data?.success) setData(r.data);
    } catch (e) {} finally { setLoading(false); }
  }

  useEffect(() => { loadPeriods(); }, [fy]);
  useEffect(() => { load(); }, [periodId]);

  async function createPeriod() {
    if (!newPeriodName.trim()) return;
    setPeriodSaving(true); setPeriodMsg('');
    try {
      const r = await axios.post(`${apiBase()}/budget-admin/periods`, { fiscal_year: fy, name: newPeriodName.trim(), message: periodMessage.trim() }, { headers: authHeader() });
      if (r.data?.success) {
        setPeriodMsg('✓ কিস্তি তৈরি হয়েছে');
        setNewPeriodName('');
        setPeriodMessage('');
        await loadPeriods();
        setPeriodId(r.data.data.id);
        setTimeout(() => { setPeriodModal(false); setPeriodMsg(''); }, 1000);
      } else {
        setPeriodMsg(r.data?.message || 'সমস্যা হয়েছে');
      }
    } catch (e) {
      setPeriodMsg(e?.response?.data?.message || 'সমস্যা হয়েছে');
    } finally { setPeriodSaving(false); }
  }

  async function saveAllocation() {
    if (!editing) return;
    setSaving(true);
    try {
      await axios.post(`${apiBase()}/budget-admin/allocate`, {
        tenant_slug: editing.center_slug,
        leaf_code: editing.leaf_code,
        fiscal_year: fy,
        period_id: periodId,
        allocated_amount: Number(allocValue) || 0,
      }, { headers: authHeader() });
      setEditing(null);
      load();
    } catch (e) {} finally { setSaving(false); }
  }

  const selectStyle = { padding:'8px 12px', border:`1px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, outline:'none', background:V.card };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>💰 বরাদ্দ চাহিদাপত্র — Consolidated</h2>
          <p style={{ fontSize:13, color:V.muted }}>সব সেন্টারের চাহিদা ও বরাদ্দ একসাথে</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select value={fy} onChange={e=>setFy(Number(e.target.value))} style={selectStyle}>
            {[curFY(), curFY()-1, curFY()-2].map(y => <option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
          </select>
          <select value={periodId} onChange={e=>setPeriodId(Number(e.target.value))} style={{ ...selectStyle, minWidth:180 }}>
            {!periods.length && <option value="">কোনো কিস্তি নেই</option>}
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {periodId && (
            <button onClick={async ()=>{
              const cur = periods.find(p=>p.id===periodId);
              setEditPeriodName(cur?.name || '');
              setEditPeriodMessage('');
              setEditPeriodMsg('');
              setEditPeriodModal(true);
              try {
                const r = await axios.get(`${apiBase()}/budget-admin/periods/${periodId}/notice`, { headers: authHeader() });
                if (r.data?.success && r.data.data) setEditPeriodMessage(r.data.data.content || '');
              } catch (e) {}
            }}
              style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:13, fontFamily:FONT }}>
              ✏️ নাম সংশোধন
            </button>
          )}
          <button onClick={()=>{ setPeriodModal(true); setNewPeriodName(''); setPeriodMessage(''); setPeriodMsg(''); }}
            style={{ padding:'8px 14px', borderRadius:8, background:V.green, color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600 }}>
            + নতুন কিস্তি
          </button>
        </div>
      </div>

      {!periodId ? (
        <div style={{ textAlign:'center', color:V.muted, padding:50, background:V.card, borderRadius:12 }}>
          এই অর্থবছরে এখনো কোনো কিস্তি তৈরি করা হয়নি। "+ নতুন কিস্তি" বাটনে ক্লিক করে একটা তৈরি করুন — যেমন "জুলাই-সেপ্টেম্বর (১ম কিস্তি)"।
        </div>
      ) : loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : !data ? (
        <div style={{ padding:20, color:V.muted }}>ডেটা আনা যায়নি।</div>
      ) : (
        <BudgetContent data={data} expanded={expanded} setExpanded={setExpanded} setEditing={setEditing} setAllocValue={setAllocValue} />
      )}

      {/* কিস্তির নাম সংশোধন Modal */}
      {editPeriodModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:V.card, borderRadius:14, padding:24, width:400 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>✏️ কিস্তি সংশোধন করুন</div>
            <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>কিস্তির নাম</label>
            <input type="text" value={editPeriodName} onChange={e=>setEditPeriodName(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:12 }}
            />
            <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>সেন্টারগুলোকে যে বার্তা পাঠাবেন (Notice হিসেবে দেখাবে)</label>
            <textarea value={editPeriodMessage} onChange={e=>setEditPeriodMessage(e.target.value)} rows={4}
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:12, resize:'vertical' }}
            />
            {editPeriodMsg && <div style={{ color: editPeriodMsg.startsWith('✓') ? V.green : V.red, fontSize:13, marginBottom:10 }}>{editPeriodMsg}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={deletePeriod} disabled={editPeriodSaving} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${V.red}`, background:'transparent', color:V.red, cursor:'pointer', fontSize:13, fontFamily:FONT }}>
                🗑️ কিস্তি মুছুন
              </button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setEditPeriodModal(false)} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:13, fontFamily:FONT }}>বাতিল</button>
                <button onClick={saveEditPeriod} disabled={editPeriodSaving} style={{ padding:'8px 16px', borderRadius:8, background:V.green, color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                  {editPeriodSaving ? 'সংরক্ষণ হচ্ছে...' : '✓ সংরক্ষণ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* নতুন কিস্তি তৈরি Modal */}
      {periodModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:V.card, borderRadius:14, padding:24, width:380 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>🗓️ নতুন কিস্তি তৈরি করুন</div>
            <div style={{ fontSize:12, color:V.muted, marginBottom:16 }}>FY {toBn(fy)}-{toBn(fy+1)}</div>
            <input type="text" value={newPeriodName} onChange={e=>setNewPeriodName(e.target.value)}
              placeholder="যেমন: জুলাই-সেপ্টেম্বর (১ম কিস্তি)"
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:12 }}
            />
            <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>সেন্টারগুলোকে যে বার্তা পাঠাবেন (Notice হিসেবে দেখাবে)</label>
            <textarea value={periodMessage} onChange={e=>setPeriodMessage(e.target.value)} rows={4}
              placeholder="যেমন: এই কিস্তিতে শুধু পণ্য ও সেবা খাতের চাহিদা দিন। ২০ তারিখের মধ্যে জমা দিতে হবে।"
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:12, resize:'vertical' }}
            />
            {periodMsg && <div style={{ color: periodMsg.startsWith('✓') ? V.green : V.red, fontSize:13, marginBottom:10 }}>{periodMsg}</div>}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setPeriodModal(false)} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:13, fontFamily:FONT }}>বাতিল</button>
              <button onClick={createPeriod} disabled={periodSaving} style={{ padding:'8px 16px', borderRadius:8, background:V.green, color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                {periodSaving ? 'তৈরি হচ্ছে...' : '✓ তৈরি করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

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

function BudgetContent({ data, expanded, setExpanded, setEditing, setAllocValue }) {
  const byLeafCode = {};
  data.center_rows.forEach(r => {
    if (!byLeafCode[r.leaf_code]) byLeafCode[r.leaf_code] = [];
    byLeafCode[r.leaf_code].push(r);
  });

  const totalDemand = data.by_mother.reduce((s, m) => s + m.total_demand, 0);
  const totalAllocated = data.by_mother.reduce((s, m) => s + m.total_allocated, 0);

  return (
    <>
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
          <div style={{ textAlign:'center', color:V.muted, padding:30, background:V.card, borderRadius:10 }}>এই কিস্তিতে কোনো চাহিদা এখনো জমা পড়েনি</div>
        )}
      </div>
    </>
  );
}
