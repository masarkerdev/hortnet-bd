import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import saApi from './saApi';
import { useSa } from './SaAuth';
import { toBn, fmt, fmtN, fmtK, typeLabel, roleLabel, roleColor, fmtDate, V, FONT } from './saUtils';

const COLORS = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
const MONTHS = ['','জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const SANCTIONED = {
  A:{'উপপরিচালক':1,'উদ্যানতত্ত্ববিদ':1,'উপসহকারী কৃষি কর্মকর্তা':4,'স্টোর কিপার':1,'উচ্চমান সহকারী':1,'অফিস সহকারী':1,'কুক':1,'ড্রাইভার':1,'ট্রাক্টর ড্রাইভার':1,'ফার্মলেবার':16,'এমএলএসএস':1,'গার্ড':4},
  B:{'উদ্যানতত্ত্ববিদ':1,'উপসহকারী কৃষি কর্মকর্তা':3,'স্টোর কিপার':1,'উচ্চমান সহকারী':1,'অফিস সহকারী':1,'কুক':1,'ড্রাইভার':1,'ফার্মলেবার':8,'এমএলএসএস':1,'গার্ড':3},
  C:{'নার্সারী তত্ত্বাবধায়ক':1,'উপসহকারী কৃষি কর্মকর্তা':2,'অফিস সহকারী':1,'ফার্মলেবার':5,'এমএলএসএস':1,'গার্ড':2},
};

// repo-র .pill হুবহু
function Pill({ type, children }) {
  const s = {
    paid:   { bg:V.green3, color:V.green2, border:V.green4 },
    due:    { bg:V.red3,   color:V.red,    border:'#fecaca' },
    active: { bg:V.blue3,  color:V.blue,   border:'#bfdbfe' },
    sold:   { bg:V.purple3,color:V.purple, border:'#ddd6fe' },
    on:     { bg:V.green3, color:V.green2, border:V.green4 },
    off:    { bg:V.red3,   color:V.red,    border:'#fecaca' },
  }[type] || { bg:V.green3, color:V.green2, border:V.green4 };
  return <span style={{ display:'inline-block', fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:500, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{children}</span>;
}

// repo-র .card/.card-head/.card-body হুবহু
function Card({ title, sub, children, style={} }) {
  return (
    <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, marginBottom:14, overflow:'hidden', boxShadow:V.shadow, ...style }}>
      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${V.border}`, fontSize:16, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', background:V.card2 }}>
        <span>{title}</span>
        {sub && <span style={{ fontSize:13, color:V.muted, fontWeight:400 }}>{sub}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// repo-র .kpi grid হুবহু
function KPI({ label, value, sub, color }) {
  return (
    <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, padding:18, boxShadow:V.shadow, borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:18, color:V.muted, marginBottom:8, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, lineHeight:1, color }}>{value}</div>
      {sub && <div style={{ fontSize:14, color:V.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// repo-র .tw table হুবহু
function TW({ heads, rows }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>{heads.map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:13, color:V.muted, fontWeight:600, background:V.card2, whiteSpace:'nowrap', borderBottom:`1px solid ${V.border}` }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=V.green3} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {row.map((cell, j) => <td key={j} style={{ padding:'12px 14px', fontSize:14, color:V.text, borderBottom:`1px solid ${V.border}`, whiteSpace:'nowrap' }}>{cell}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={heads.length} style={{ textAlign:'center', color:V.muted, padding:20, fontSize:14 }}>Data নেই</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// repo-র .bar-row হুবহু
function BarRow({ label, pct, color, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
      <div style={{ fontSize:13, color:V.muted, width:90, textAlign:'right', flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, background:V.bg, borderRadius:4, height:24, overflow:'hidden', border:`1px solid ${V.border}` }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color, borderRadius:4, display:'flex', alignItems:'center', padding:'0 8px', fontSize:12, fontWeight:600, color:'#fff', minWidth:24, transition:'.5s' }}/>
      </div>
      <div style={{ fontSize:13, color:V.text, fontWeight:600, width:80, flexShrink:0 }}>{right}</div>
    </div>
  );
}

// ── ট্যাব: বিক্রয় ──
function TabSales({ d, userRole }) {
  const s = d.sales;
  const maxRev = Math.max(...(s.monthly||[]).map(m=>parseFloat(m.revenue)), 1);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট রাজস্ব"    value={`৳${fmt(s.summary?.total_revenue)}`}  sub={`${toBn(s.summary?.total_invoices||0)} চালান`} color={V.green}  />
        <KPI label="আজকের বিক্রয়" value={`৳${fmt(s.today?.today_revenue)}`}     sub={`${toBn(s.today?.today_invoices||0)} চালান`}   color={V.blue}   />
        <KPI label="পরিশোধিত"      value={`৳${fmt(s.summary?.paid_amount)}`}     sub=""                                               color={V.teal}   />
        <KPI label="বকেয়া"         value={`৳${fmt(s.summary?.due_amount)}`}      sub=""                                               color={V.red}    />
      </div>
      <Card title="📅 মাসিক বিক্রয়">
        <div style={{ padding:16 }}>
          {(s.monthly||[]).length ? s.monthly.map((m,i)=>(
            <BarRow key={i} label={m.label} pct={(parseFloat(m.revenue)/maxRev)*100} color={COLORS[i%COLORS.length]} right={`৳${fmtK(m.revenue)}`}/>
          )) : <div style={{ textAlign:'center', color:V.muted, padding:16 }}>Data নেই</div>}
        </div>
      </Card>
      <Card title="🏆 সর্বাধিক বিক্রিত" sub="Top 8">
        <TW heads={['চারা','জাত','বিক্রিত','রাজস্ব','স্টক']}
          rows={(d.top_seedlings||[]).map(s=>[
            <strong>{s.name_bn}</strong>,
            <span style={{color:V.muted}}>{s.variety||'—'}</span>,
            <span style={{color:V.purple,fontWeight:600}}>{fmtN(s.total_sold)}</span>,
            <span style={{color:V.green,fontWeight:600}}>৳{fmt(s.revenue)}</span>,
            fmtN(s.current_stock),
          ])}/>
      </Card>
      {userRole !== 'director' && (
        <Card title="🧾 সাম্প্রতিক চালান">
          <TW heads={['চালান #','গ্রাহক','তারিখ','পরিমাণ','অবস্থা']}
            rows={(s.recent||[]).map(r=>[
              <span style={{fontFamily:'monospace'}}>{r.invoice_no}</span>,
              r.customer_name||'—',
              (r.sale_date||'').toString().slice(0,10),
              <span style={{color:V.green,fontWeight:600}}>৳{fmt(r.total_amount)}</span>,
              <Pill type={r.payment_status==='paid'?'paid':'due'}>{r.payment_status==='paid'?'পরিশোধিত':'বকেয়া'}</Pill>,
            ])}/>
        </Card>
      )}
    </div>
  );
}

// ── ট্যাব: উৎপাদন ──
function TabProd({ d }) {
  const p = d.production;
  const maxProd = Math.max(...(p.by_type||[]).map(t=>parseInt(t.total_qty)), 1);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট উৎপাদিত"   value={fmtN(p.summary?.total_produced)}  sub={`${toBn(p.summary?.total_batches||0)} ব্যাচ`}          color={V.purple} />
        <KPI label="সফল"            value={fmtN(p.summary?.total_success)}   sub={`গড় ${toBn(parseFloat(p.summary?.avg_success||0).toFixed(1))}%`} color={V.green}  />
        <KPI label="ব্যর্থ"          value={fmtN(p.summary?.total_failed)}   sub=""                                                         color={V.red}    />
        <KPI label="পাওয়া যাচ্ছে"  value={fmtN(p.summary?.total_available)} sub=""                                                         color={V.amber}  />
      </div>
      <Card title="🌱 পদ্ধতি অনুযায়ী">
        <div style={{ padding:16 }}>
          {(p.by_type||[]).length ? p.by_type.map((t,i)=>(
            <BarRow key={i} label={typeLabel(t.production_type)} pct={(parseInt(t.total_qty)/maxProd)*100} color={COLORS[i%COLORS.length]} right={fmtN(t.total_qty)}/>
          )) : <div style={{ textAlign:'center', color:V.muted, padding:16 }}>Data নেই</div>}
        </div>
      </Card>
      <Card title="📦 সাম্প্রতিক ব্যাচ">
        <TW heads={['ব্যাচ ID','চারা','পদ্ধতি','উৎপাদিত','পাওয়া যাচ্ছে','অবস্থা']}
          rows={(p.recent||[]).map(r=>[
            <span style={{fontFamily:'monospace'}}>{r.batch_code}</span>,
            r.seedling||'—', typeLabel(r.production_type),
            <span style={{color:V.purple,fontWeight:600}}>{fmtN(r.produced_quantity)}</span>,
            <span style={{color:V.green}}>{fmtN(r.available_quantity)}</span>,
            <Pill type={r.status==='active'?'active':'sold'}>{r.status==='active'?'সক্রিয়':'শেষ'}</Pill>,
          ])}/>
      </Card>
    </div>
  );
}

// ── ট্যাব: স্টক ──
function TabStock({ d }) {
  const st = d.stock;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট স্টক"  value={fmtN(st.summary?.total_stock)}  sub={`${toBn(st.summary?.total_species||0)} প্রজাতি`} color={V.amber} />
        <KPI label="স্টক মূল্য" value={`৳${fmt(st.summary?.stock_value)}`} sub=""                                            color={V.green} />
        <KPI label="কম স্টক"   value={toBn(st.summary?.low_stock_count||0)} sub=""                                           color={V.red}   />
      </div>
      {(st.low_stock||[]).length > 0 && (
        <Card title="⚠️ কম স্টক সতর্কতা">
          <TW heads={['চারা','কোড','বর্তমান স্টক','সর্বনিম্ন সীমা']}
            rows={st.low_stock.map(s=>[
              <strong style={{color:V.red}}>{s.name_bn}</strong>,
              <span style={{fontFamily:'monospace',color:V.muted}}>{s.seedling_code}</span>,
              <span style={{color:V.red,fontWeight:600}}>{fmtN(s.current_stock)}</span>,
              fmtN(s.min_stock_alert),
            ])}/>
        </Card>
      )}
      <Card title="📂 ক্যাটাগরি অনুযায়ী">
        <TW heads={['ক্যাটাগরি','প্রজাতি','স্টক']}
          rows={(st.categories||[]).map(c=>[
            c.name_bn, toBn(c.seedling_count),
            <span style={{color:V.amber,fontWeight:600}}>{fmtN(c.total_stock)}</span>,
          ])}/>
      </Card>
    </div>
  );
}

// ── ট্যাব: ব্যবহারকারী ──
function TabUsers({ d }) {
  const users = d.users || [];
  const active = users.filter(u=>u.is_active).length;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট ব্যবহারকারী" value={toBn(users.length)} sub="" color={V.blue}  />
        <KPI label="সক্রিয়"           value={toBn(active)}       sub="" color={V.green} />
        <KPI label="নিষ্ক্রিয়"        value={toBn(users.length-active)} sub="" color={V.red} />
      </div>
      <Card title="👥 ব্যবহারকারী তালিকা">
        <div style={{ padding:16, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
          {users.map(u => (
            <div key={u.id} style={{ background:V.bg, border:`1px solid ${V.border}`, borderRadius:10, padding:14, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:roleColor(u.role), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:15, flexShrink:0 }}>{(u.name||'U')[0].toUpperCase()}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:V.text }}>{u.name}</div>
                <div style={{ fontSize:12, color:V.muted }}>{u.email}</div>
                <div style={{ marginTop:4, display:'flex', gap:4 }}>
                  <Pill type="active">{roleLabel(u.role)}</Pill>
                  <Pill type={u.is_active?'on':'off'}>{u.is_active?'সক্রিয়':'বন্ধ'}</Pill>
                </div>
              </div>
            </div>
          ))}
          {!users.length && <div style={{ color:V.muted, fontSize:14 }}>কেউ নেই</div>}
        </div>
      </Card>
    </div>
  );
}

// ── ট্যাব: লক্ষ্যমাত্রা (repo-র dTarget হুবহু) ──
function TabTarget({ d, slug }) {
  const curFY = new Date().getMonth()>=6 ? new Date().getFullYear() : new Date().getFullYear()-1;
  const [fy, setFy] = useState(curFY);
  const [targets, setTargets] = useState(d.fy_data?.targets || []);
  const [prodA, setProdA] = useState(d.fy_data?.prod_achieved || 0);
  const [salesA, setSalesA] = useState(d.fy_data?.sales_achieved || 0);
  const [loading, setLoading] = useState(!d.fy_data?.targets);

  useEffect(() => { if (!d.fy_data?.targets) loadFY(curFY); }, []);

  async function loadFY(y) {
    setFy(y); setLoading(true);
    try {
      const r = await saApi.get(`/center/${slug}/targets?fy=${y}&_t=${Date.now()}`);
      if (r.data?.success) { setTargets(r.data.targets||[]); setProdA(r.data.prod_achieved||0); setSalesA(r.data.sales_achieved||0); }
    } catch {} finally { setLoading(false); }
  }

  const prodT  = targets.filter(t=>t.target_type==='production');
  const salesT = targets.filter(t=>t.target_type==='sales');
  const annProd  = prodT.find(t=>parseInt(t.target_month||0)===0);
  const annSales = salesT.find(t=>parseInt(t.target_month||0)===0);
  const tProd  = annProd  ? parseInt(annProd.target_quantity||0)  : prodT.reduce((s,t)=>parseInt(t.target_month)>0?s+parseInt(t.target_quantity||0):s,0);
  const tSales = annSales ? parseFloat(annSales.target_amount||0) : salesT.reduce((s,t)=>parseInt(t.target_month)>0?s+parseFloat(t.target_amount||0):s,0);
  const pp = tProd>0  ? Math.min(Math.round((prodA/tProd)*100),100)   : 0;
  const sp = tSales>0 ? Math.min(Math.round((salesA/tSales)*100),100) : 0;
  const pc = p => p>=70?V.green:p>=40?V.amber:V.red;

  return (
    <Card title="🎯 লক্ষ্যমাত্রা বনাম অর্জন"
      sub={
        <select value={fy} onChange={e=>loadFY(parseInt(e.target.value))}
          style={{ background:V.bg, border:`1px solid ${V.border}`, color:V.text, padding:'6px 12px', borderRadius:7, fontSize:12, fontFamily:FONT, cursor:'pointer' }}>
          {[curFY,curFY-1,curFY-2].map(y=><option key={y} value={y}>FY {toBn(y)}-{toBn(y+1)}</option>)}
        </select>
      }>
      {loading ? <div style={{ padding:20, textAlign:'center', color:V.muted }}>লোড হচ্ছে...</div> : (
        <div style={{ padding:'14px 18px' }}>
          {/* progress cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[{l:'🌱 উৎপাদন',t:tProd,a:prodA,p:pp,col:V.purple,vfn:fmtN,unit:'টি'},{l:'💰 বিক্রয়',t:tSales,a:salesA,p:sp,col:V.green,vfn:fmt,unit:'৳'}].map(it=>(
              <div key={it.l} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:14, borderLeft:`3px solid ${it.col}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:it.col }}>{it.l}</div>
                    <div style={{ fontSize:12, color:V.muted, marginTop:4 }}>
                      লক্ষ্য: <b style={{color:V.text}}>{it.unit==='৳'?'৳':''}{it.vfn(it.t)}{it.unit==='টি'?'টি':''}</b>
                      &nbsp;|&nbsp; অর্জন: <b style={{color:V.green}}>{it.unit==='৳'?'৳':''}{it.vfn(it.a)}{it.unit==='টি'?'টি':''}</b>
                    </div>
                  </div>
                  <div style={{ fontSize:28, fontWeight:700, color:pc(it.p), lineHeight:1 }}>{toBn(it.p)}%</div>
                </div>
                <div style={{ height:6, background:V.bg, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:6, width:`${it.p}%`, background:pc(it.p), borderRadius:3, transition:'.5s' }}/>
                </div>
              </div>
            ))}
          </div>
          {/* targets table */}
          {targets.length ? (
            <TW heads={['সময়কাল','ধরন','লক্ষ্য (পরিমাণ)','লক্ষ্য (৳)','মন্তব্য']}
              rows={targets.map(t=>[
                parseInt(t.target_month||0)===0 ? `অর্থবছর ${t.target_year}-${parseInt(t.target_year)+1}` : `${MONTHS[t.target_month]} ${t.target_year}`,
                <Pill type={t.target_type==='production'?'active':'paid'}>{t.target_type==='production'?'উৎপাদন':'বিক্রয়'}</Pill>,
                <span style={{color:V.purple,fontWeight:600}}>{fmtN(t.target_quantity)}টি</span>,
                <span style={{color:V.green,fontWeight:600}}>৳{fmt(t.target_amount)}</span>,
                <span style={{color:V.muted}}>{t.remarks||'—'}</span>,
              ])}/>
          ) : <div style={{ textAlign:'center', color:V.muted, padding:20 }}>এই অর্থবছরে কোনো লক্ষ্যমাত্রা নেই</div>}
        </div>
      )}
    </Card>
  );
}

// ── ট্যাব: ক্ষতি/নষ্ট ──
function TabDamage({ d }) {
  const dm = d.damages || {};
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট ক্ষতিগ্রস্ত" value={fmtN(dm.total_damaged)} sub="" color={V.red}   />
        <KPI label="মোট রিপোর্ট"     value={toBn(dm.total_reports||0)} sub="" color={V.amber} />
      </div>
      {(dm.by_reason||[]).length ? (
        <Card title="📋 কারণ অনুযায়ী ক্ষতির বিবরণ">
          <TW heads={['কারণ','মোট ক্ষতিগ্রস্ত','রিপোর্ট সংখ্যা']}
            rows={dm.by_reason.map(r=>[
              r.reason||'অজানা',
              <span style={{color:V.red,fontWeight:600}}>{fmtN(r.total_damaged)}</span>,
              <span style={{color:V.amber}}>{toBn(r.count)}</span>,
            ])}/>
        </Card>
      ) : <div style={{ textAlign:'center', padding:'40px 0', color:V.muted, fontSize:15 }}>
        <i className="ti ti-plant-off" style={{ fontSize:40, display:'block', marginBottom:12 }}/>
        কোনো ক্ষতির তথ্য নেই
      </div>}
    </div>
  );
}

// ── ট্যাব: অন্যান্য আয় ──
function TabIncome({ d }) {
  const oi = d.other_income || {};
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মোট অন্যান্য আয়" value={`৳${fmt(oi.total)}`}           sub="" color={V.teal} />
        <KPI label="আয়ের ধরন"        value={toBn((oi.breakdown||[]).length)} sub="" color={V.blue} />
      </div>
      {(oi.breakdown||[]).length ? (
        <Card title="💰 আয়ের বিবরণ">
          <TW heads={['আয়ের ধরন','মোট আয়','সংখ্যা']}
            rows={oi.breakdown.map(r=>[
              r.income_type||'অজানা',
              <span style={{color:V.teal,fontWeight:600}}>৳{fmt(r.total)}</span>,
              <span style={{color:V.muted}}>{toBn(r.count)}</span>,
            ])}/>
        </Card>
      ) : <div style={{ textAlign:'center', padding:'40px 0', color:V.muted, fontSize:15 }}>
        <i className="ti ti-cash-off" style={{ fontSize:40, display:'block', marginBottom:12 }}/>
        কোনো অন্যান্য আয় নেই
      </div>}
    </div>
  );
}

// ── ট্যাব: জনবল (repo-র renderEmployeeTab হুবহু) ──
function TabEmployee({ slug, category }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    saApi.get(`/center/${slug}/employees`)
      .then(r => { if (r.data?.success) setData(r.data); else setErr(r.data?.error||'সমস্যা'); })
      .catch(e => setErr(e?.response?.data?.message||'ডেটা আনা যায়নি'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:V.muted }}>লোড হচ্ছে…</div>;
  if (err) return <div style={{ padding:20, color:V.red }}>{err}</div>;
  if (!data) return null;

  const cat = data.category || category || 'B';
  const sanc = SANCTIONED[cat] || SANCTIONED['B'];
  const totalSanc = Object.values(sanc).reduce((s,v)=>s+v,0);
  const filledPerm = (data.permanent||[]).filter(e=>e.status==='active').length;
  const vacant = Math.max(0, totalSanc-filledPerm);
  const desigMap = {};
  (data.permanent||[]).forEach(e=>{ if(e.status==='active') desigMap[e.designation]=(desigMap[e.designation]||0)+1; });

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
        <KPI label="মঞ্জুরিকৃত পদ"    value={fmtN(totalSanc)} sub={`ক্যাটাগরী-${cat}`} color={V.purple} />
        <KPI label="কর্মরত (স্থায়ী)"   value={fmtN(filledPerm)} sub=""                  color={V.green}  />
        <KPI label="শূন্য পদ"          value={fmtN(vacant)}     sub=""                  color={V.red}    />
        <KPI label="সাময়িক শ্রমিক"    value={fmtN((data.temporary||[]).filter(e=>e.status==='active').length)} sub="" color={V.amber} />
      </div>
      <Card title={`📋 পদভিত্তিক অবস্থান`} sub={`ক্যাটাগরী-${cat}`}>
        <TW heads={['পদ','মঞ্জুরিকৃত','কর্মরত','শূন্য','অবস্থা']}
          rows={Object.entries(sanc).map(([post,sanctAmt])=>{
            const filled=desigMap[post]||0; const vac=Math.max(0,sanctAmt-filled);
            return [post,toBn(sanctAmt),<span style={{color:V.green,fontWeight:600}}>{toBn(filled)}</span>,<span style={{color:vac>0?V.red:V.green,fontWeight:600}}>{toBn(vac)}</span>,vac===0?'✅':filled===0?'🔴':'⚠️'];
          })}/>
      </Card>
      {(data.permanent||[]).length > 0 && (
        <Card title="👔 স্থায়ী জনবল" sub={`${toBn(data.permanent.length)} জন`}>
          <TW heads={['নাম','পদ','কর্মী আইডি','মোবাইল','অবস্থা']}
            rows={data.permanent.map(e=>[
              <strong>{e.name_bn}</strong>, e.designation,
              <span style={{fontFamily:'monospace',color:V.muted}}>{e.employee_id||'—'}</span>,
              <span style={{color:V.muted}}>{e.mobile||'—'}</span>,
              <Pill type={e.status==='active'?'on':'off'}>{e.status==='active'?'কর্মরত':'নিষ্ক্রিয়'}</Pill>,
            ])}/>
        </Card>
      )}
      {(data.temporary||[]).length > 0 && (
        <Card title="👷 সাময়িক শ্রমিক" sub={`${toBn(data.temporary.length)} জন`}>
          <TW heads={['নাম','পদ','ধরন','মোবাইল','অবস্থা']}
            rows={data.temporary.map(e=>[
              <strong>{e.name_bn}</strong>, e.designation||'—',
              <Pill type="sold">{e.worker_type||'—'}</Pill>,
              <span style={{color:V.muted}}>{e.mobile||'—'}</span>,
              <Pill type={e.status==='active'?'on':'off'}>{e.status==='active'?'কর্মরত':'নিষ্ক্রিয়'}</Pill>,
            ])}/>
        </Card>
      )}
    </div>
  );
}

// ── Main ──
const TABS = [
  { id:'dSales',    icon:'ti-coin',          label:'বিক্রয়' },
  { id:'dProd',     icon:'ti-plant',         label:'উৎপাদন' },
  { id:'dStock',    icon:'ti-stack-2',       label:'স্টক' },
  { id:'dUsers',    icon:'ti-users',         label:'ব্যবহারকারী' },
  { id:'dTarget',   icon:'ti-target',        label:'লক্ষ্যমাত্রা' },
  { id:'dDamage',   icon:'ti-alert-triangle',label:'ক্ষতি/নষ্ট' },
  { id:'dIncome',   icon:'ti-cash',          label:'অন্যান্য আয়' },
  { id:'dEmployee', icon:'ti-users',         label:'জনবল' },
];

export default function SaCenterDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { sa } = useSa();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('dSales');

  useEffect(() => {
    saApi.get(`/center/${slug}`)
      .then(r => { if (r.data?.success) setD(r.data); else setErr(r.data?.message||r.data?.error||'সমস্যা'); })
      .catch(e => setErr(e?.response?.data?.message||'ডেটা আনা যায়নি'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}><div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/></div>;
  if (err) return <div style={{ padding:20, color:V.red, fontFamily:FONT }}><i className="ti ti-alert-circle"/> {err}</div>;
  if (!d) return null;

  return (
    <div style={{ fontFamily:FONT }}>
      {/* back-btn */}
      <button onClick={() => navigate(-1)}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=V.green;e.currentTarget.style.color=V.green;e.currentTarget.style.background=V.green3;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=V.border;e.currentTarget.style.color=V.muted;e.currentTarget.style.background=V.card;}}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:V.card, border:`1px solid ${V.border}`, borderRadius:8, color:V.muted, cursor:'pointer', fontSize:14, fontFamily:FONT, marginBottom:14, transition:'.15s' }}>
        <i className="ti ti-arrow-left"/> ফিরে যান
      </button>

      {/* center name */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:700, color:V.text }}>{d.center?.name_bn} — বিস্তারিত</div>
        <div style={{ fontSize:13, color:V.muted, marginTop:2 }}>📍 {d.center?.location} • ক্যাটাগরি {d.center?.category}</div>
      </div>

      {/* detail-tabs */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding:'9px 18px', borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT,
              background: tab===t.id ? V.green3 : V.card,
              color:      tab===t.id ? V.green2  : V.muted,
              border:     `1px solid ${tab===t.id ? V.green4 : V.border}`,
              fontWeight: tab===t.id ? 600 : 400,
              transition:'.15s',
              display:'flex', alignItems:'center', gap:6,
            }}>
            <i className={`ti ${t.icon}`}/> {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div>
        {tab==='dSales'    && <TabSales    d={d} userRole={sa?.role}/>}
        {tab==='dProd'     && <TabProd     d={d}/>}
        {tab==='dStock'    && <TabStock    d={d}/>}
        {tab==='dUsers'    && <TabUsers    d={d}/>}
        {tab==='dTarget'   && <TabTarget   d={d} slug={slug}/>}
        {tab==='dDamage'   && <TabDamage   d={d}/>}
        {tab==='dIncome'   && <TabIncome   d={d}/>}
        {tab==='dEmployee' && <TabEmployee slug={slug} category={d.center?.category}/>}
      </div>
    </div>
  );
}
