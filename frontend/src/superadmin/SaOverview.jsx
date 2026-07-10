import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import saApi from './saApi';
import { toBn, fmt, fmtN, fmtK, V, CAT_NAMES, FONT } from './saUtils';

// repo-র hCard হুবহু React-এ
function HCard({ c, onClick }) {
  const [hov, setHov] = useState(false);
  const catBorder = { A: V.catA, B: V.catB, C: V.catC }[c.category] || V.catB;
  const rankBg    = { A: V.catAb, B: V.catBb, C: V.catCb }[c.category] || V.catBb;
  const rankColor = { A: V.catA,  B: V.catB,  C: V.catC  }[c.category] || V.catB;
  const tlBg      = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' }[c.traffic_light] || '#d97706';
  const tlGlow    = { green: 'rgba(22,163,74,0.4)', yellow: 'rgba(217,119,6,0.4)', red: 'rgba(220,38,38,0.4)' }[c.traffic_light] || 'rgba(217,119,6,0.4)';

  return (
    <div
      className="h-card"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: V.card,
        border: `1px solid ${hov ? V.border2 : V.border}`,
        borderRadius: 10,
        borderLeft: `3px solid ${catBorder}`,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        transition: '.2s',
        boxShadow: hov ? V.shadowMd : V.shadow,
        transform: hov ? 'translateX(2px)' : 'none',
        fontFamily: FONT,
      }}>
      {/* h-card-rank */}
      <div style={{ width:30, height:30, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:rankBg, color:rankColor }}>
        {c.category}
      </div>
      {/* h-card-info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:16, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:V.text }}>{c.name_bn}</div>
        <div style={{ fontSize:13, color:V.muted, marginTop:2 }}>
          <i className="ti ti-map-pin" style={{ fontSize:10 }}/> {c.location || c.name_en}
        </div>
      </div>
      {/* h-card-stats */}
      <div style={{ display:'flex', gap:20, flexShrink:0 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:V.green }}>৳{fmtK(c.total_revenue)}</div>
          <div style={{ fontSize:14, color:V.muted, marginTop:2 }}>বিক্রয়</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:V.purple }}>{fmtK(c.total_produced)}</div>
          <div style={{ fontSize:14, color:V.muted, marginTop:2 }}>উৎপাদন</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:V.amber }}>{fmtK(c.total_stock)}</div>
          <div style={{ fontSize:14, color:V.muted, marginTop:2 }}>স্টক</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:15, fontWeight:700, color:V.blue }}>৳{fmtK(c.today_revenue)}</div>
          <div style={{ fontSize:14, color:V.muted, marginTop:2 }}>আজ</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:tlBg, margin:'0 auto 3px', boxShadow:`0 0 6px ${tlGlow}` }}/>
          <div style={{ fontSize:14, color:V.muted }}>{toBn(c.perf_score||0)}</div>
        </div>
      </div>
      {/* h-card-actions */}
      <div style={{ flexShrink:0 }}>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          onMouseEnter={e => e.currentTarget.style.background=V.green2}
          onMouseLeave={e => e.currentTarget.style.background=V.green}
          style={{ padding:'7px 14px', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:FONT, background:V.green, color:'#fff', border:`1px solid ${V.green}`, display:'flex', alignItems:'center', gap:4, transition:'.15s' }}>
          <i className="ti ti-eye"/> দেখুন
        </button>
      </div>
    </div>
  );
}

// KPI card — repo-র .kpi.green/blue/... হুবহু
function KpiCard({ label, value, sub, borderColor, valueColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: V.card, border:`1px solid ${V.border}`, borderRadius:12,
        padding:18, boxShadow: hov ? V.shadowMd : V.shadow,
        borderTop:`3px solid ${borderColor}`,
        transform: hov ? 'translateY(-2px)' : 'none', transition:'.2s',
        fontFamily: FONT,
      }}>
      <div style={{ fontSize:18, color:V.muted, marginBottom:8, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700, lineHeight:1, color:valueColor }}>{value}</div>
      {sub && <div style={{ fontSize:14, color:V.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

export default function SaOverview() {
  const navigate = useNavigate();
  const { handleBadges, search='' } = useOutletContext() || {};
  const [allStats, setAllStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetSummary, setTargetSummary] = useState(null);
  const curFY = new Date().getMonth()>=6 ? new Date().getFullYear() : new Date().getFullYear()-1;

  const load = async (force=false) => {
    try {
      const r = await saApi.get('/stats-all'+(force?'?force=true':''));
      const data = r.data?.data || [];
      setAllStats(data);
      if (handleBadges) handleBadges(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    saApi.get('/report/target-summary?fy='+curFY).then(r => { if (r.data?.success) setTargetSummary(r.data); }).catch(()=>{});
  }, []);
  useEffect(() => {
    const fn = () => load(true);
    window.addEventListener('sa:refresh', fn);
    return () => window.removeEventListener('sa:refresh', fn);
  }, []);

  // repo-র filterStats হুবহু
  const q = search.trim().toLowerCase();
  const ok = allStats
    .filter(c => c.status==='ok')
    .filter(c => !q || [c.name_bn,c.name_en,c.district,c.division,c.location,c.slug].some(v=>(v||'').toLowerCase().includes(q)));

  const totalRev  = ok.reduce((s,c)=>s+c.total_revenue,0);
  const todayRev  = ok.reduce((s,c)=>s+c.today_revenue,0);
  const totalProd = ok.reduce((s,c)=>s+c.total_produced,0);
  const totalStock= ok.reduce((s,c)=>s+c.total_stock,0);
  const invoices  = ok.reduce((s,c)=>s+c.total_invoices,0);

  const catGroups = { A:[], B:[], C:[] };
  ok.forEach(c => { const cat=c.category||'B'; catGroups[cat]?.push(c); });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  );

  return (
    <div style={{ fontFamily:FONT }}>
      {/* kpi-grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        <KpiCard label="মোট বিক্রয়"    value={`৳${fmt(totalRev)}`}   sub={`${toBn(invoices)} চালান`} borderColor={V.green}  valueColor={V.green}  />
        <KpiCard label="আজকের বিক্রয়"  value={`৳${fmt(todayRev)}`}   sub=""                          borderColor={V.blue}   valueColor={V.blue}   />
        <KpiCard label="মোট উৎপাদন"    value={fmtN(totalProd)}        sub="টি চারা/কলম"               borderColor={V.purple} valueColor={V.purple} />
        <KpiCard label="মোট স্টক"       value={fmtN(totalStock)}       sub="টি চারা/কলম"               borderColor={V.amber}  valueColor={V.amber}  />
        <KpiCard label="সক্রিয় Center" value={toBn(ok.length)}        sub=""                          borderColor={V.teal}   valueColor={V.teal}   />
      </div>

      {/* consolidated target vs achieved */}
      {targetSummary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, marginBottom:24 }}>
          <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:14, padding:'18px 20px', borderTop:`3px solid ${V.green}` }}>
            <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>মোট লক্ষ্যমাত্রা (সব সেন্টার)</div>
            <div style={{ fontSize:26, fontWeight:700, color:V.green }}>{toBn(targetSummary.target)}<span style={{ fontSize:14, fontWeight:500 }}> টি চারা/কলম</span></div>
            <div style={{ fontSize:12, color:V.muted, marginTop:4 }}>({toBn(targetSummary.fy.split('-')[0])}-{toBn(targetSummary.fy.split('-')[1])} অর্থবছরে)</div>
          </div>
          <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:14, padding:'18px 20px', borderTop:`3px solid ${V.amber}` }}>
            <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>অর্জিত</div>
            <div style={{ fontSize:26, fontWeight:700, color:V.amber }}>{toBn(targetSummary.achieved)}<span style={{ fontSize:14, fontWeight:500 }}> টি চারা/কলম</span></div>
            <div style={{ fontSize:12, color:V.muted, marginTop:4 }}>এখন অব্দি — <b style={{color:V.green}}>{toBn(targetSummary.percent)}%</b> অর্জিত</div>
          </div>
        </div>
      )}

      {/* cat-groups */}
      {['A','B','C'].map(cat => {
        if (!catGroups[cat]?.length) return null;
        const hdrBg  = { A:V.catAb,  B:V.catBb,  C:V.catCb  }[cat];
        const hdrBd  = { A:V.catAbd, B:V.catBbd, C:V.catCbd }[cat];
        const hdrCol = { A:V.catA,   B:V.catB,   C:V.catC   }[cat];
        return (
          <div key={cat} style={{ marginBottom:24 }}>
            {/* cat-group-header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'10px 16px', borderRadius:8, background:hdrBg, border:`1px solid ${hdrBd}`, borderLeft:`3px solid ${hdrCol}` }}>
              <span style={{ fontSize:14, fontWeight:600, color:hdrCol }}>{CAT_NAMES[cat]}</span>
              <span style={{ fontSize:12, color:V.muted, marginLeft:4 }}>({toBn(catGroups[cat].length)}টি center)</span>
            </div>
            {/* center-list */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {catGroups[cat].map(c => (
                <HCard key={c.slug} c={c} onClick={() => navigate(`/superadmin/center/${c.slug}`)}/>
              ))}
            </div>
          </div>
        );
      })}

      {ok.length===0 && !loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:V.muted, fontSize:15, fontFamily:FONT }}>
          <i className="ti ti-building-off" style={{ fontSize:40, display:'block', marginBottom:12 }}/>
          কোনো center পাওয়া যায়নি
        </div>
      )}
    </div>
  );
}
