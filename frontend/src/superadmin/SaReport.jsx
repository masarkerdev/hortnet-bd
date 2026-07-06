import { useEffect, useState, useMemo } from 'react';
import saApi from './saApi';
import { toBn, fmt, fmtN, V, FONT } from './saUtils';

const curFY = () => { const n=new Date(); return n.getMonth()>=6?n.getFullYear():n.getFullYear()-1; };

function exportCSV(rows, filename) {
  const csv = rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(title, tableHTML) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap" rel="stylesheet">
    <style>body{font-family:'Noto Sans Bengali',sans-serif;font-size:11px;padding:20px}
    h1{font-size:16px;color:#1a4731;margin-bottom:4px}.sub{color:#666;font-size:10px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}th{background:#1a4731;color:#fff;padding:7px;font-size:10px;text-align:left}
    td{padding:6px 7px;border-bottom:1px solid #e5e7eb;font-size:10px}
    tr:nth-child(even)td{background:#f9fafb}</style></head><body>
    <h1>🌿 ${title}</h1>
    <div class="sub">তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
    ${tableHTML}</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),600);
}

// ── STOCK REPORT ──
function StockReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [varietyFilter, setVarietyFilter] = useState('');
  const [viewMode, setViewMode] = useState('category'); // category | center | variety

  async function load() {
    setLoading(true);
    try {
      const r = await saApi.get(`/report/stock-summary${catFilter?`?category=${encodeURIComponent(catFilter)}`:''}`);
      if (r.data?.success) setData(r.data.data||[]);
    } catch {} finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[catFilter]);

  // সব categories
  const allCats = useMemo(()=>[...new Set(data.flatMap(c=>c.seedlings.map(s=>s.category_bn)).filter(Boolean))].sort(),[data]);
  const allCenters = useMemo(()=>data.filter(c=>!centerFilter||c.slug===centerFilter),[data,centerFilter]);

  // Category-wise aggregation — সব center একসাথে
  const catSummary = useMemo(()=>{
    const map = {};
    data.forEach(center=>{
      center.seedlings.forEach(s=>{
        const cat = s.category_bn||'অন্যান্য';
        const name = s.name_bn||'—';
        const variety = s.variety||'সাধারণ';
        if(!map[cat]) map[cat]={};
        if(!map[cat][name]) map[cat][name]={};
        if(!map[cat][name][variety]) map[cat][name][variety]={total:0,centers:{}};
        map[cat][name][variety].total += parseInt(s.current_stock)||0;
        map[cat][name][variety].centers[center.slug] = (map[cat][name][variety].centers[center.slug]||0) + (parseInt(s.current_stock)||0);
      });
    });
    return map;
  },[data]);

  // Export CSV — category view
  function exportCatCSV() {
    const rows = [['ক্যাটাগরি','চারার নাম','জাত',...data.map(c=>c.name_bn),'মোট']];
    Object.entries(catSummary).forEach(([cat,names])=>{
      Object.entries(names).forEach(([name,varieties])=>{
        Object.entries(varieties).forEach(([variety,v])=>{
          rows.push([cat,name,variety,...data.map(c=>v.centers[c.slug]||0),v.total]);
        });
      });
    });
    exportCSV(rows, `Stock_Report_${new Date().toISOString().slice(0,10)}.csv`);
  }

  function exportCatPDF() {
    let html = `<table><thead><tr><th>ক্যাটাগরি</th><th>চারার নাম</th><th>জাত</th>${data.map(c=>`<th>${c.name_bn}</th>`).join('')}<th>মোট</th></tr></thead><tbody>`;
    Object.entries(catSummary).forEach(([cat,names])=>{
      Object.entries(names).forEach(([name,varieties])=>{
        Object.entries(varieties).forEach(([variety,v])=>{
          html+=`<tr><td>${cat}</td><td>${name}</td><td>${variety}</td>${data.map(c=>`<td>${v.centers[c.slug]||0}</td>`).join('')}<td><b>${v.total}</b></td></tr>`;
        });
      });
    });
    html+=`</tbody></table>`;
    exportPDF('স্টক রিপোর্ট', html);
  }

  const inp = { padding:'8px 12px', border:`1px solid ${V.border}`, borderRadius:8, fontSize:13, fontFamily:FONT, color:V.text, background:V.bg, outline:'none', cursor:'pointer' };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', boxShadow:V.shadow }}>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={inp}>
          <option value="">সব ক্যাটাগরি</option>
          {allCats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={centerFilter} onChange={e=>setCenterFilter(e.target.value)} style={inp}>
          <option value="">সব সেন্টার</option>
          {data.map(c=><option key={c.slug} value={c.slug}>{c.name_bn}</option>)}
        </select>
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {[['category','ক্যাটাগরি ভিউ'],['center','সেন্টার ভিউ']].map(([m,l])=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${V.border}`, background:viewMode===m?V.green:V.card, color:viewMode===m?'#fff':V.muted, cursor:'pointer', fontSize:13, fontFamily:FONT }}>
              {l}
            </button>
          ))}
          <button onClick={exportCatCSV}
            style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${V.border}`, background:V.green, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-file-spreadsheet"/> Excel
          </button>
          <button onClick={exportCatPDF}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #c084fc44', background:'#c084fc22', color:'#c084fc', cursor:'pointer', fontSize:13, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-file-type-pdf"/> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:V.muted }}>
          <div style={{ width:32, height:32, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }}/>
          লোড হচ্ছে...
        </div>
      ) : (
        <>
          {/* Category View */}
          {viewMode==='category' && (
            <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, overflow:'hidden', boxShadow:V.shadow }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
                  <thead>
                    <tr>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}`, whiteSpace:'nowrap' }}>ক্যাটাগরি</th>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}` }}>চারার নাম</th>
                      <th style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}` }}>জাত</th>
                      {(centerFilter ? data.filter(c=>c.slug===centerFilter) : data).map(c=>(
                        <th key={c.slug} style={{ padding:'10px 14px', textAlign:'right', fontSize:12, color:V.green2, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}`, whiteSpace:'nowrap' }}>{c.name_bn}</th>
                      ))}
                      <th style={{ padding:'10px 14px', textAlign:'right', fontSize:12, color:V.amber, fontWeight:700, background:V.card2, borderBottom:`1px solid ${V.border}` }}>মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(catSummary).map(([cat,names])=>(
                      Object.entries(names).map(([name,varieties],ni)=>(
                        Object.entries(varieties).map(([variety,v],vi)=>(
                          <tr key={`${cat}-${name}-${variety}`}
                            onMouseEnter={e=>e.currentTarget.style.background=V.green3}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'10px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, color:V.muted, whiteSpace:'nowrap' }}>
                              {ni===0&&vi===0?cat:''}
                            </td>
                            <td style={{ padding:'10px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, fontWeight:vi===0?600:400 }}>
                              {vi===0?name:''}
                            </td>
                            <td style={{ padding:'10px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.muted }}>{variety}</td>
                            {(centerFilter ? data.filter(c=>c.slug===centerFilter) : data).map(c=>(
                              <td key={c.slug} style={{ padding:'10px 14px', textAlign:'right', fontSize:13, borderBottom:`1px solid ${V.border}`, color:v.centers[c.slug]>0?V.text:V.muted }}>
                                {v.centers[c.slug]>0?fmtN(v.centers[c.slug]):'—'}
                              </td>
                            ))}
                            <td style={{ padding:'10px 14px', textAlign:'right', fontSize:13, fontWeight:700, borderBottom:`1px solid ${V.border}`, color:V.amber }}>
                              {fmtN(v.total)}
                            </td>
                          </tr>
                        ))
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Center View */}
          {viewMode==='center' && (
            <div style={{ display:'grid', gap:14 }}>
              {allCenters.map(center=>(
                <div key={center.slug} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, overflow:'hidden', boxShadow:V.shadow }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${V.border}`, background:V.card2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:15, fontWeight:600 }}>{center.name_bn}</span>
                    <span style={{ fontSize:12, color:V.muted }}>{center.district} • মোট: {fmtN(center.seedlings.reduce((s,i)=>s+(+i.current_stock||0),0))}টি</span>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr>{['ক্যাটাগরি','চারার নাম','জাত','স্টক','মূল্য'].map(h=>(
                          <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}` }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {center.seedlings.map((s,i)=>(
                          <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=V.green3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.muted }}>{s.category_bn||'—'}</td>
                            <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, fontWeight:600 }}>{s.name_bn}</td>
                            <td style={{ padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.muted }}>{s.variety||'সাধারণ'}</td>
                            <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, fontWeight:600, color:V.amber }}>{fmtN(s.current_stock)}টি</td>
                            <td style={{ padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.green }}>৳{fmtN(s.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── PRODUCTION REPORT ──
function ProductionReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fy, setFy] = useState(curFY());
  const [centerFilter, setCenterFilter] = useState('');
  const fyOpts = [curFY(), curFY()-1, curFY()-2];

  async function load() {
    setLoading(true);
    try {
      const r = await saApi.get(`/report/production-summary?fy=${fy}${centerFilter?`&center=${centerFilter}`:''}`);
      if (r.data?.success) setData(r.data.data||[]);
    } catch {} finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[fy, centerFilter]);

  const inp = { padding:'8px 12px', border:`1px solid ${V.border}`, borderRadius:8, fontSize:13, fontFamily:FONT, color:V.text, background:V.bg, outline:'none', cursor:'pointer' };

  return (
    <div>
      {/* Filter */}
      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <select value={fy} onChange={e=>setFy(parseInt(e.target.value))} style={inp}>
          {fyOpts.map(y=><option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
        </select>
        <select value={centerFilter} onChange={e=>setCenterFilter(e.target.value)} style={inp}>
          <option value="">সব সেন্টার</option>
          {data.map(c=><option key={c.slug} value={c.slug}>{c.name_bn}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:V.muted }}>লোড হচ্ছে...</div>
      ) : (
        <div style={{ display:'grid', gap:14 }}>
          {data.map(center=>(
            <div key={center.slug} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, overflow:'hidden', boxShadow:V.shadow }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${V.border}`, background:V.card2, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600 }}>{center.name_bn}</span>
                <span style={{ fontSize:12, color:V.muted }}>FY {toBn(fy)}-{toBn(fy+1)}</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['ক্যাটাগরি','চারার নাম','জাত','মোট উৎপাদন','মৃত/বিনষ্ট','বর্তমান স্টক'].map(h=>(
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.card2, borderBottom:`1px solid ${V.border}` }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {center.data.map((s,i)=>(
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=V.green3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.muted }}>{s.category_bn||'—'}</td>
                        <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, fontWeight:600 }}>{s.name_bn}</td>
                        <td style={{ padding:'8px 14px', fontSize:12, borderBottom:`1px solid ${V.border}`, color:V.muted }}>{s.variety||'সাধারণ'}</td>
                        <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, color:V.purple, fontWeight:600 }}>{fmtN(s.total_produced)}টি</td>
                        <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, color:V.red }}>{fmtN(s.total_failed)}টি</td>
                        <td style={{ padding:'8px 14px', fontSize:13, borderBottom:`1px solid ${V.border}`, color:V.amber, fontWeight:600 }}>{fmtN(s.current_stock)}টি</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN REPORT PAGE ──
export default function SaReport() {
  const [tab, setTab] = useState('stock');

  const TABS = [
    { id:'stock', label:'📦 স্টক রিপোর্ট' },
    { id:'production', label:'🌱 উৎপাদন রিপোর্ট' },
  ];

  return (
    <div style={{ fontFamily:FONT }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Tab navigation */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${V.border}`, cursor:'pointer', fontSize:14, fontFamily:FONT,
              background:tab===t.id?V.green:V.card, color:tab===t.id?'#fff':V.muted, fontWeight:tab===t.id?600:400, transition:'.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='stock' && <StockReport/>}
      {tab==='production' && <ProductionReport/>}
    </div>
  );
}
