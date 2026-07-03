import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saApi from './saApi';
import { useSa } from './SaAuth';
import { toBn } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',green4:'#dcfce7',red:'#dc2626',amber:'#d97706',purple:'#7c3aed',blue:'#2563eb',teal:'#0d9488',accent:'#3b6d11' };
const shadow='0 1px 3px rgba(0,0,0,0.08)';
const MONTHS=['','জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

function fmtN(n){return toBn(parseInt(n||0).toLocaleString('en-IN'));}
function pcColor(p){return p>=70?C.green:p>=40?C.amber:C.red;}
function CatBadge({cat}){const s={A:{bg:'#1e1b4b',col:'#a5b4fc'},B:{bg:'#052e16',col:'#4ade80'},C:{bg:'#431407',col:'#fb923c'}}[cat]||{bg:'#1e293b',col:'#94a3b8'};return<span style={{fontSize:11,padding:'2px 6px',borderRadius:5,fontWeight:700,background:s.bg,color:s.col}}>{cat}</span>;}
function Pill({type,children}){const s={on:{bg:C.green3,col:'#15803d',bd:C.green4},paid:{bg:'#eff6ff',col:C.blue,bd:'#bfdbfe'},due:{bg:'#fef2f2',col:C.red,bd:'#fecaca'}}[type]||{bg:C.green3,col:'#15803d',bd:C.green4};return<span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:500,background:s.bg,color:s.col,border:`1px solid ${s.bd}`}}>{children}</span>;}

export default function SaTargetSummary() {
  const { sa } = useSa();
  const navigate = useNavigate();
  const isDir = sa?.role === 'director';
  const [rows, setRows] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ slug:'', type:'production', period:'annual', fy:'', month:'7', qty:'', amt:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const curFY = new Date().getMonth()>=6 ? new Date().getFullYear() : new Date().getFullYear()-1;
  const curMonth = new Date().getMonth()+1;

  useEffect(() => {
    Promise.all([saApi.get('/stats-all'), saApi.get('/tenants')])
      .then(([sr, cr]) => { setRows(sr.data?.data||[]); setCenters(cr.data?.data||[]); })
      .finally(() => setLoading(false));
  }, []);

  const ok = rows.filter(c => c.status==='ok' || c.total_revenue!=null);
  const totalAnnual = ok.reduce((s,c)=>s+(+c.annual_prod_target||0),0);
  const totalMonthlyTarget = ok.reduce((s,c)=>s+(+c.monthly_prod_target||0),0);
  const totalMonthlyAchieved = ok.reduce((s,c)=>s+(+c.monthly_prod_achieved||0),0);
  const overallPct = totalMonthlyTarget>0 ? Math.round((totalMonthlyAchieved/totalMonthlyTarget)*100) : 0;
  const centersOnTrack = ok.filter(c=>c.monthly_prod_target>0 && c.monthly_prod_achieved/c.monthly_prod_target>=0.7).length;

  function openModal() {
    setForm({ slug: centers[0]?.slug||'', type:'production', period:'annual', fy:String(curFY), month:'7', qty:'', amt:'', notes:'' });
    setMsg(''); setModal(true);
  }

  async function save() {
    if (!form.slug) { setMsg('সেন্টার বেছে নিন।'); return; }
    if (!form.qty && !form.amt) { setMsg('পরিমাণ বা বিক্রয়ের লক্ষ্য দিন।'); return; }
    setSaving(true); setMsg('');
    const month = form.period==='annual' ? 0 : parseInt(form.month);
    const year = form.period==='annual' ? parseInt(form.fy) : (month>=7 ? parseInt(form.fy) : parseInt(form.fy)+1);
    try {
      const r = await saApi.post(`/center/${form.slug}/set-target`, { target_type:form.type, target_month:month, target_year:year, target_quantity:+form.qty||0, target_amount:+form.amt||0, notes:form.notes });
      if (r.data?.success) { setModal(false); const sr=await saApi.get('/stats-all'); setRows(sr.data?.data||[]); }
      else setMsg(r.data?.message||'সমস্যা');
    } catch (e) { setMsg(e?.response?.data?.message||'সমস্যা'); } finally { setSaving(false); }
  }

  const inp = { width:'100%',padding:'10px 14px',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',fontFamily:FONT,boxSizing:'border-box' };

  if (loading) return <div style={{ padding:'40px 0',textAlign:'center',color:C.muted,fontFamily:FONT }}>লোড হচ্ছে…</div>;

  return (
    <div style={{ fontFamily:FONT }}>
      {isDir && (
        <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
          <button onClick={openModal} style={{ padding:'9px 18px',background:C.accent,color:'#fff',border:`1px solid ${C.accent}`,borderRadius:8,cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>🎯 লক্ষ্যমাত্রা নির্ধারণ</button>
        </div>
      )}

      {/* KPI */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { l:'অর্থবছরের মোট লক্ষ্যমাত্রা', v:fmtN(totalAnnual)+'টি', sub:`FY ${toBn(curFY)}-${toBn(curFY+1)}`, top:C.purple, col:C.purple },
          { l:'চলতি মাসের লক্ষ্যমাত্রা', v:fmtN(totalMonthlyTarget)+'টি', sub:MONTHS[curMonth], top:C.blue, col:C.blue },
          { l:'চলতি মাসের অর্জন', v:fmtN(totalMonthlyAchieved)+'টি', sub:toBn(overallPct)+'% অগ্রগতি', top:pcColor(overallPct), col:pcColor(overallPct) },
          { l:'লক্ষ্যমাত্রা অনুযায়ী (≥৭০%)', v:toBn(centersOnTrack), sub:`${toBn(ok.length)}টি center-এর মধ্যে`, top:C.teal, col:C.teal },
        ].map(k=>(
          <div key={k.l} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,boxShadow:shadow,borderTop:`3px solid ${k.top}` }}>
            <div style={{ fontSize:13,color:C.muted,marginBottom:8,fontWeight:500 }}>{k.l}</div>
            <div style={{ fontSize:26,fontWeight:700,lineHeight:1,color:k.col }}>{k.v}</div>
            {k.sub&&<div style={{ fontSize:12,color:C.muted,marginTop:4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* বিস্তারিত টেবিল */}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',boxShadow:shadow }}>
        <div style={{ padding:'14px 18px',borderBottom:`1px solid ${C.border}`,fontSize:16,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.card2 }}>
          📋 প্রতিটি Center-এর লক্ষ্যমাত্রা অর্জন
          <span style={{ fontSize:13,color:C.muted }}>FY {toBn(curFY)}-{toBn(curFY+1)} | {MONTHS[curMonth]}</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead><tr>
              {['Center','Cat','অর্থবছরের লক্ষ্যমাত্রা','চলতি মাসের লক্ষ্যমাত্রা','চলতি মাসের অর্জন','অগ্রগতি','অবস্থা'].map(h=>(
                <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:13,color:C.muted,fontWeight:600,background:C.card2,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...ok].sort((a,b)=>{ const ap=a.monthly_prod_target>0?a.monthly_prod_achieved/a.monthly_prod_target:0; const bp=b.monthly_prod_target>0?b.monthly_prod_achieved/b.monthly_prod_target:0; return bp-ap; }).map(c=>{
                const pct=c.monthly_prod_target>0?Math.min(Math.round((c.monthly_prod_achieved/c.monthly_prod_target)*100),200):null;
                const col=pct===null?C.muted:pcColor(pct);
                return(
                  <tr key={c.slug} onMouseEnter={e=>e.currentTarget.style.background=C.green3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px',borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ fontWeight:600,fontSize:15,color:C.text,cursor:'pointer' }} onClick={()=>navigate(`/superadmin/center/${c.slug}`)}>{c.name_bn}</div>
                      <div style={{ fontSize:11,color:C.muted }}>{c.district||''}</div>
                    </td>
                    <td style={{ padding:'12px 14px',borderBottom:`1px solid ${C.border}` }}><CatBadge cat={c.category}/></td>
                    <td style={{ padding:'12px 14px',color:C.purple,fontWeight:600,borderBottom:`1px solid ${C.border}` }}>{c.annual_prod_target>0?fmtN(c.annual_prod_target)+'টি':'—'}</td>
                    <td style={{ padding:'12px 14px',color:C.blue,fontWeight:600,borderBottom:`1px solid ${C.border}` }}>{c.monthly_prod_target>0?fmtN(c.monthly_prod_target)+'টি':'—'}</td>
                    <td style={{ padding:'12px 14px',color:C.green,fontWeight:600,borderBottom:`1px solid ${C.border}` }}>{fmtN(c.monthly_prod_achieved)}টি</td>
                    <td style={{ padding:'12px 14px',minWidth:130,borderBottom:`1px solid ${C.border}` }}>
                      {pct!==null?(
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ flex:1,height:6,background:C.bg,borderRadius:3 }}><div style={{ height:6,width:`${Math.min(pct,100)}%`,background:col,borderRadius:3 }}/></div>
                          <span style={{ fontSize:15,fontWeight:700,color:col,minWidth:36 }}>{toBn(pct)}%</span>
                        </div>
                      ):<span style={{ fontSize:13,color:C.muted,fontStyle:'italic' }}>লক্ষ্যমাত্রা নেই</span>}
                    </td>
                    <td style={{ padding:'12px 14px',borderBottom:`1px solid ${C.border}` }}>
                      <Pill type={c.traffic_light==='green'?'on':c.traffic_light==='yellow'?'paid':'due'}>{c.traffic_light==='green'?'ভালো':c.traffic_light==='yellow'?'মাঝারি':'দুর্বল'}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* লক্ষ্যমাত্রা নির্ধারণ Modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(26,46,26,0.45)' }}>
          <div style={{ background:C.card,borderRadius:16,padding:28,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontSize:17,fontWeight:700,color:C.text }}>🎯 লক্ষ্যমাত্রা নির্ধারণ করুন</div>
              <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted }}>×</button>
            </div>
            <div style={{ marginBottom:14 }}><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>সেন্টার বেছে নিন</label>
              <select value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} style={inp}>
                {centers.map(c=><option key={c.slug} value={c.slug}>{c.name_bn}</option>)}
              </select>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>লক্ষ্যমাত্রার ধরন</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                  <option value="production">🌱 উৎপাদন</option>
                  <option value="sales">💰 বিক্রয়</option>
                </select>
              </div>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>সময়কাল</label>
                <select value={form.period} onChange={e=>setForm({...form,period:e.target.value})} style={inp}>
                  <option value="annual">বার্ষিক (অর্থবছর)</option>
                  <option value="monthly">মাসিক</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>অর্থবছর</label>
                <select value={form.fy} onChange={e=>setForm({...form,fy:e.target.value})} style={inp}>
                  {[curFY,curFY-1,curFY-2].map(y=><option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
                </select>
              </div>
              {form.period==='monthly' && (
                <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>মাস</label>
                  <select value={form.month} onChange={e=>setForm({...form,month:e.target.value})} style={inp}>
                    {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>উৎপাদন লক্ষ্য (টি)</label><input type="text" inputMode="decimal" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} placeholder="যেমন: ৫০০০" style={inp}/></div>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>বিক্রয় লক্ষ্য (৳)</label><input type="text" inputMode="decimal" value={form.amt} onChange={e=>setForm({...form,amt:e.target.value})} placeholder="যেমন: ১০০০০০" style={inp}/></div>
            </div>
            <div style={{ marginBottom:14 }}><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>মন্তব্য (ঐচ্ছিক)</label><input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন" style={inp}/></div>
            {msg && <div style={{ color:C.red,fontSize:13,marginBottom:8 }}>{msg}</div>}
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
              <button onClick={()=>setModal(false)} style={{ padding:'10px 20px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontSize:14,fontFamily:FONT }}>বাতিল</button>
              <button onClick={save} disabled={saving} style={{ padding:'10px 20px',borderRadius:8,background:C.accent,color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>{saving?'সংরক্ষণ হচ্ছে…':'✓ সংরক্ষণ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
