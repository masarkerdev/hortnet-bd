import { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import saApi from './saApi';
import { toBn, fmt, fmtN, fmtK, V, FONT } from './saUtils';

const scoreColor = s => s>=70?V.green:s>=45?V.amber:V.red;
const tlLabel = t => t==='green'?'ভালো':t==='yellow'?'মাঝারি':'দুর্বল';

function RankBadge({ i }) {
  if (i===0) return <span>🥇</span>;
  if (i===1) return <span>🥈</span>;
  if (i===2) return <span>🥉</span>;
  return <span style={{ color:V.muted, fontWeight:700 }}>#{toBn(i+1)}</span>;
}

function CatBadge({ cat }) {
  const bg = { A:'#1e1b4b', B:'#052e16', C:'#431407' }[cat]||'#1e293b';
  const color = { A:'#a5b4fc', B:'#4ade80', C:'#fb923c' }[cat]||'#94a3b8';
  return <span style={{ fontSize:11, padding:'2px 6px', borderRadius:5, fontWeight:700, background:bg, color }}>{cat}</span>;
}

function TLBadge({ tl }) {
  const bg = { green:'#064e3b', yellow:'#451a03', red:'#450a0a' }[tl]||'#1e293b';
  const color = { green:'#4ade80', yellow:'#fbbf24', red:'#f87171' }[tl]||'#94a3b8';
  const label = { green:'ভালো', yellow:'মাঝারি', red:'দুর্বল' }[tl]||'—';
  return <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, background:bg, color }}>{label}</span>;
}

function ScoreRing({ score }) {
  const c = scoreColor(score);
  const pct = (score/100)*157;
  return (
    <div style={{ position:'relative', width:52, height:52, flexShrink:0 }}>
      <svg width="52" height="52" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="25" fill="none" stroke="#1e293b" strokeWidth="6"/>
        <circle cx="30" cy="30" r="25" fill="none" stroke={c} strokeWidth="6"
          strokeDasharray={`${pct.toFixed(1)} 157`} strokeLinecap="round" transform="rotate(-90 30 30)"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:13, fontWeight:700, color:c, lineHeight:1 }}>{toBn(score)}</div>
        <div style={{ fontSize:9, color:V.muted }}>/১০০</div>
      </div>
    </div>
  );
}

function rankTableHTML(sorted, type, navigate) {
  const best = sorted[0], worst = sorted[sorted.length-1];
  return (
    <div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['#','Center','জেলা','Cat','বিক্রয়','উৎপাদন','স্টক','অবস্থা'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:V.muted, fontWeight:600, background:V.card2, whiteSpace:'nowrap', borderBottom:`1px solid ${V.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c,i)=>(
              <tr key={c.slug}
                style={{ cursor:'pointer' }}
                onClick={()=>navigate(`/superadmin/center/${c.slug}`)}
                onMouseEnter={e=>{if(c!==best&&c!==worst)e.currentTarget.style.background=V.green3;}}
                onMouseLeave={e=>{if(c!==best&&c!==worst)e.currentTarget.style.background='transparent';}}>
                <td style={{ padding:'12px 14px', fontWeight:700, color:i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':V.muted }}><RankBadge i={i}/></td>
                <td style={{ padding:'12px 14px' }}><div style={{ fontWeight:600, fontSize:15 }}>{c.name_bn}</div></td>
                <td style={{ padding:'12px 14px', color:V.muted, fontSize:13 }}>{c.district||'—'}</td>
                <td style={{ padding:'12px 14px' }}><CatBadge cat={c.category}/></td>
                <td style={{ padding:'12px 14px', fontWeight:700, color:type==='sales'?V.green:V.text }}>৳{fmtK(c.total_revenue)}</td>
                <td style={{ padding:'12px 14px', fontWeight:700, color:type==='production'?V.purple:V.text }}>{fmtN(c.total_produced)}</td>
                <td style={{ padding:'12px 14px', fontWeight:700, color:type==='stock'?V.amber:V.text }}>{fmtN(c.total_stock)}</td>
                <td style={{ padding:'12px 14px' }}><TLBadge tl={c.traffic_light}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length>=2 && (
        <div style={{ display:'flex', gap:16, padding:'12px 16px', borderTop:`1px solid ${V.border}`, fontSize:12 }}>
          <span>🟢 <b style={{ color:'#4ade80' }}>{best?.name_bn}</b> — সর্বোচ্চ</span>
          <span>🔴 <b style={{ color:'#f87171' }}>{worst?.name_bn}</b> — সর্বনিম্ন</span>
        </div>
      )}
    </div>
  );
}

export default function SaCompare() {
  const { search='' } = useOutletContext()||{};
  const navigate = useNavigate();
  const [allStats, setAllStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catF, setCatF] = useState('');
  const [distF, setDistF] = useState('');
  const [divF, setDivF] = useState('');
  const [sortType, setSortType] = useState('sales');

  useEffect(()=>{
    saApi.get('/stats-all').then(r=>setAllStats(r.data?.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const ok = useMemo(()=>allStats.filter(c=>c.status==='ok'),[allStats]);
  const districts = useMemo(()=>[...new Set(ok.map(c=>c.district).filter(Boolean))].sort(),[ok]);
  const divisions = useMemo(()=>[...new Set(ok.map(c=>c.division).filter(Boolean))].sort(),[ok]);

  const filtered = useMemo(()=>{
    let d = ok;
    if (catF) d=d.filter(c=>c.category===catF);
    if (distF) d=d.filter(c=>c.district===distF);
    if (divF) d=d.filter(c=>c.division===divF);
    if (search) d=d.filter(c=>[c.name_bn,c.name_en,c.district,c.division].some(v=>(v||'').toLowerCase().includes(search.toLowerCase())));
    return d;
  },[ok,catF,distF,divF,search]);

  const ranked = useMemo(()=>[...filtered].sort((a,b)=>b.perf_score-a.perf_score),[filtered]);

  const sorted = useMemo(()=>{
    if (sortType==='production') return [...filtered].sort((a,b)=>b.total_produced-a.total_produced);
    if (sortType==='stock') return [...filtered].sort((a,b)=>b.total_stock-a.total_stock);
    return [...filtered].sort((a,b)=>b.total_revenue-a.total_revenue);
  },[filtered,sortType]);

  const curFY = new Date().getMonth()>=6 ? new Date().getFullYear() : new Date().getFullYear()-1;

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['Center','Category','জেলা','বিভাগ','মোট বিক্রয় (৳)','মোট উৎপাদন','মোট স্টক','Performance Score','অবস্থা'];
    const rows = filtered.map(c=>[c.name_bn,c.category,c.district||'',c.division||'',c.total_revenue,c.total_produced,c.total_stock,c.perf_score,tlLabel(c.traffic_light)]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`HortNet-BD_Report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!filtered.length) return;
    const rows = filtered.map((c,i)=>`<tr><td>${i+1}</td><td><b>${c.name_bn}</b></td><td>${c.category}</td><td>${c.district||'—'}</td><td>৳${c.total_revenue.toLocaleString()}</td><td>${c.total_produced.toLocaleString()}</td><td>${c.total_stock.toLocaleString()}</td><td><b>${c.perf_score}</b>/১০০</td><td>${tlLabel(c.traffic_light)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HortNet-BD তুলনামূলক রিপোর্ট</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap" rel="stylesheet">
      <style>body{font-family:'Noto Sans Bengali',sans-serif;font-size:12px;padding:20px}h1{font-size:18px;color:#1a4731;margin-bottom:4px}.sub{color:#666;font-size:11px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#1a4731;color:#fff;padding:8px;font-size:11px}td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}tr:nth-child(even)td{background:#f9fafb}</style>
      </head><body>
      <h1>🌿 HortNet-BD — তুলনামূলক রিপোর্ট</h1>
      <div class="sub">তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD')} | মোট center: ${filtered.length}টি</div>
      <table><thead><tr><th>#</th><th>Center</th><th>Cat</th><th>জেলা</th><th>বিক্রয়</th><th>উৎপাদন</th><th>স্টক</th><th>Score</th><th>অবস্থা</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open('','_blank'); win.document.write(html); win.document.close();
    setTimeout(()=>win.print(),500);
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}><div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/></div>;

  if (!ok.length) return <div style={{ textAlign:'center', padding:'60px 0', color:V.muted, fontFamily:FONT }}><i className="ti ti-chart-off" style={{ fontSize:40, display:'block', marginBottom:12 }}/>Data নেই।</div>;

  return (
    <div style={{ fontFamily:FONT }}>
      {/* Filter bar */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14, boxShadow:V.shadow }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, color:V.muted, fontWeight:600 }}>ফিল্টার:</span>
          <select value={catF} onChange={e=>setCatF(e.target.value)}
            style={{ background:V.bg, border:`1px solid ${V.border}`, color:V.text, padding:'6px 12px', borderRadius:7, fontSize:13, fontFamily:FONT, cursor:'pointer' }}>
            <option value="">সব Category</option>
            <option value="A">A — উপপরিচালক</option>
            <option value="B">B — উদ্যানতত্ত্ববিদ</option>
            <option value="C">C — নার্সারী</option>
          </select>
          <select value={distF} onChange={e=>setDistF(e.target.value)}
            style={{ background:V.bg, border:`1px solid ${V.border}`, color:V.text, padding:'6px 12px', borderRadius:7, fontSize:13, fontFamily:FONT, cursor:'pointer' }}>
            <option value="">সব জেলা</option>
            {districts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={divF} onChange={e=>setDivF(e.target.value)}
            style={{ background:V.bg, border:`1px solid ${V.border}`, color:V.text, padding:'6px 12px', borderRadius:7, fontSize:13, fontFamily:FONT, cursor:'pointer' }}>
            <option value="">সব বিভাগ</option>
            {divisions.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={()=>{setCatF('');setDistF('');setDivF('');}}
            style={{ background:V.card, border:`1px solid ${V.border}`, color:V.muted, padding:'6px 12px', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:FONT }}>
            ✕ Reset
          </button>
          <span style={{ fontSize:12, color:V.muted, marginLeft:'auto' }}>{toBn(filtered.length)}টি center</span>
          <button onClick={exportCSV}
            style={{ background:V.green, border:'none', color:'#fff', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-file-spreadsheet"/> Excel
          </button>
          <button onClick={exportPDF}
            style={{ background:'#c084fc22', border:'1px solid #c084fc44', color:'#c084fc', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-file-type-pdf"/> PDF
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, marginBottom:14, overflow:'hidden', boxShadow:V.shadow }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${V.border}`, fontSize:16, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', background:V.card2 }}>
          <span>🏆 Performance Leaderboard</span>
          <span style={{ fontSize:13, color:V.muted, fontWeight:400 }}>Score অনুযায়ী rank</span>
        </div>
        <div style={{ padding:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {ranked.map((c,i)=>(
              <div key={c.slug}
                onClick={()=>navigate(`/superadmin/center/${c.slug}`)}
                style={{ background:V.bg, border:`1px solid ${V.border}`, borderRadius:10, padding:14, display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=V.green}
                onMouseLeave={e=>e.currentTarget.style.borderColor=V.border}>
                <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, background:i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'#334155', color:i<3?'#000':'#94a3b8' }}>
                  <RankBadge i={i}/>
                </div>
                <ScoreRing score={c.perf_score}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name_bn}</div>
                  <div style={{ fontSize:13, color:V.muted, marginTop:2 }}>{c.district||''} • <CatBadge cat={c.category}/></div>
                </div>
                <div style={{ display:'flex', gap:14, flexShrink:0 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, color:V.green, fontWeight:600 }}>৳{fmtK(c.total_revenue)}</div>
                    <div style={{ fontSize:12, color:V.muted, marginTop:1 }}>বিক্রয়</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14, color:(c.growth_rate||0)>=0?V.green:V.red, fontWeight:600 }}>
                      {(c.growth_rate||0)>=0?'▲':'▼'}{toBn(Math.abs((c.growth_rate||0)).toFixed(1))}%
                    </div>
                    <div style={{ fontSize:12, color:V.muted, marginTop:1 }}>প্রবৃদ্ধি</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:{green:V.green,yellow:V.amber,red:V.red}[c.traffic_light]||V.amber, margin:'0 auto 2px' }}/>
                    <div style={{ fontSize:12, color:V.muted }}>{tlLabel(c.traffic_light)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* লক্ষ্যমাত্রা */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, marginBottom:14, overflow:'hidden', boxShadow:V.shadow }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${V.border}`, fontSize:16, fontWeight:600, display:'flex', justifyContent:'space-between', background:V.card2 }}>
          <span>🎯 লক্ষ্যমাত্রা অর্জন</span>
          <span style={{ fontSize:13, color:V.muted, fontWeight:400 }}>FY {toBn(curFY)}-{toBn(curFY+1)}</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Center','Cat','অর্থবছরের লক্ষ্যমাত্রা','চলতি মাসের লক্ষ্যমাত্রা','চলতি মাসের অর্জন','অগ্রগতি'].map((h,i)=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}`, color:i===2?V.purple:i===3?V.blue:i===4?V.green:V.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a,b)=>{
                const ap=a.monthly_prod_target>0?a.monthly_prod_achieved/a.monthly_prod_target:0;
                const bp=b.monthly_prod_target>0?b.monthly_prod_achieved/b.monthly_prod_target:0;
                return bp-ap;
              }).map(c=>{
                const pct = c.monthly_prod_target>0 ? Math.min(Math.round((c.monthly_prod_achieved/c.monthly_prod_target)*100),200) : null;
                const color = pct===null?V.muted:pct>=70?V.green:pct>=40?V.amber:V.red;
                return (
                  <tr key={c.slug} onMouseEnter={e=>e.currentTarget.style.background=V.green3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, fontSize:15 }}>{c.name_bn}</div>
                      <div style={{ fontSize:13, color:V.muted }}>{c.district||''}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}><CatBadge cat={c.category}/></td>
                    <td style={{ padding:'12px 14px', color:V.purple, fontWeight:600 }}>
                      {c.annual_prod_target>0 ? `${fmtN(c.annual_prod_target)}টি` : <span style={{ color:V.muted, fontStyle:'italic' }}>নির্ধারিত নেই</span>}
                    </td>
                    <td style={{ padding:'12px 14px', color:V.blue, fontWeight:600 }}>
                      {c.monthly_prod_target>0 ? `${fmtN(c.monthly_prod_target)}টি` : <span style={{ color:V.muted }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 14px', color:V.green, fontWeight:600 }}>{fmtN(c.monthly_prod_achieved)}টি</td>
                    <td style={{ padding:'12px 14px', minWidth:140 }}>
                      {pct!==null ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:V.border, borderRadius:3 }}>
                            <div style={{ height:6, width:`${Math.min(pct,100)}%`, background:color, borderRadius:3 }}/>
                          </div>
                          <span style={{ fontSize:15, fontWeight:700, color, minWidth:36 }}>{toBn(pct)}%</span>
                        </div>
                      ) : <span style={{ fontSize:13, color:V.muted, fontStyle:'italic' }}>লক্ষ্যমাত্রা নেই</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* র‍্যাংকিং টেবিল */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, overflow:'hidden', boxShadow:V.shadow }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${V.border}`, fontSize:16, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', background:V.card2 }}>
          <span>🏅 র‍্যাংকিং টেবিল</span>
          <div style={{ display:'flex', gap:6 }}>
            {[['sales','বিক্রয়'],['production','উৎপাদন'],['stock','স্টক']].map(([t,l])=>(
              <button key={t} onClick={()=>setSortType(t)}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:FONT, border:`1px solid ${V.border}`, background:sortType===t?V.green:V.card, color:sortType===t?'#fff':V.muted }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {rankTableHTML(sorted, sortType, navigate)}
      </div>
    </div>
  );
}
