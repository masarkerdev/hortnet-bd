import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import saApi from './saApi';
import { toBn } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = {
  bg:'#f8f6f0', card:'#fff', border:'#e2ddd5', border2:'#cbd5e1',
  text:'#1a1a18', muted:'#888780', sub:'#94a3b8',
  green:'#16a34a', green2:'#15803d', green3:'#f0fdf4', green4:'#dcfce7',
  catA:'#7c3aed', catAb:'#f5f3ff', catAbd:'#ede9fe',
  catB:'#16a34a', catBb:'#f0fdf4', catBbd:'#dcfce7',
  catC:'#d97706', catCb:'#fffbeb', catCbd:'#fef3c7',
  red:'#dc2626', amber:'#d97706', blue:'#2563eb', purple:'#7c3aed', teal:'#0d9488',
};
const shadow = '0 1px 3px rgba(0,0,0,0.08)';
const shadowMd = '0 4px 16px rgba(0,0,0,0.08)';

function fmtK(n) {
  const v = parseFloat(n||0);
  if (v>=10000000) return '৳'+toBn((v/10000000).toFixed(1))+' কোটি';
  if (v>=100000) return '৳'+toBn((v/100000).toFixed(1))+' লাখ';
  if (v>=1000) return '৳'+toBn((v/1000).toFixed(1))+' হাজার';
  return '৳'+toBn(Math.round(v));
}
function fmtN(n) { return toBn(parseInt(n||0).toLocaleString('en-IN')); }
function fmt(n) { return toBn(parseInt(parseFloat(n||0)).toLocaleString('en-IN')); }

const TL_DOT = { green:'#16a34a', yellow:'#ca8a04', red:'#dc2626' };
const CAT_LABEL = { A:'A Category — উপপরিচালক', B:'B Category — উদ্যানতত্ত্ববিদ', C:'C Category — নার্সারী তত্ত্বাবধায়ক' };
const CAT_H = {
  A:{ bg:C.catAb, border:C.catA, title:C.catA },
  B:{ bg:C.catBb, border:C.catB, title:C.catB },
  C:{ bg:C.catCb, border:C.catC, title:C.catC },
};

function HCard({ c, onClick }) {
  const [hov,setHov] = useState(false);
  const cc = { A:C.catA, B:C.catB, C:C.catC }[c.category]||C.catB;
  const cb = { A:C.catAb, B:C.catBb, C:C.catCb }[c.category]||C.catBb;
  const tl = TL_DOT[c.traffic_light]||TL_DOT.yellow;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:C.card, border:`1px solid ${hov?C.border2:C.border}`, borderRadius:10,
        borderLeft:`3px solid ${cc}`, padding:'14px 18px', display:'flex', alignItems:'center',
        gap:14, cursor:'pointer', transition:'.2s', boxShadow:hov?shadowMd:shadow,
        transform:hov?'translateX(2px)':'none' }}>
      <div style={{ width:30,height:30,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,background:cb,color:cc }}>{c.category}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:16,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:C.text }}>{c.name_bn}</div>
        <div style={{ fontSize:13,color:C.muted,marginTop:2 }}>📍 {c.location||c.name_en}</div>
      </div>
      <div style={{ display:'flex',gap:20,flexShrink:0 }}>
        {[
          { v:fmtK(c.total_revenue), l:'বিক্রয়', col:C.green },
          { v:fmtN(c.total_produced), l:'উৎপাদন', col:C.purple },
          { v:fmtN(c.total_stock), l:'স্টক', col:C.amber },
          { v:fmtK(c.today_revenue), l:'আজ', col:C.blue },
        ].map(s=>(
          <div key={s.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:15,fontWeight:700,color:s.col }}>{s.v}</div>
            <div style={{ fontSize:14,color:C.muted,marginTop:2 }}>{s.l}</div>
          </div>
        ))}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:10,height:10,borderRadius:'50%',background:tl,margin:'0 auto 4px' }}/>
          <div style={{ fontSize:14,color:C.muted }}>{toBn(c.perf_score||0)}</div>
        </div>
      </div>
      <button onClick={e=>{e.stopPropagation();onClick();}}
        style={{ padding:'7px 14px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,background:'#3b6d11',color:'#fff',border:'1px solid #3b6d11',display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
        👁 দেখুন
      </button>
    </div>
  );
}

export default function SaCategory() {
  const { cat } = useParams();
  const navigate = useNavigate();
  const { handleBadges } = useOutletContext()||{};
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    saApi.get('/stats-all').then(r=>{
      const data = r.data?.data||r.data||[];
      setRows(data);
      if (handleBadges) handleBadges(data);
    }).finally(()=>setLoading(false));
  },[cat]);

  const filtered = rows.filter(c=>(c.status==='ok'||c.total_revenue!=null) && c.category===cat);
  const h = CAT_H[cat]||CAT_H.B;
  const totalRev = filtered.reduce((s,c)=>s+(+c.total_revenue||0),0);
  const totalProd = filtered.reduce((s,c)=>s+(+c.total_produced||0),0);
  const totalStock = filtered.reduce((s,c)=>s+(+c.total_stock||0),0);

  if (loading) return <div style={{ padding:'40px 0',textAlign:'center',color:C.muted,fontFamily:FONT }}>লোড হচ্ছে…</div>;

  return (
    <div style={{ fontFamily:FONT }}>
      {/* Category header */}
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'10px 16px',borderRadius:8,borderLeft:`3px solid ${h.border}`,background:h.bg }}>
        <span style={{ fontSize:15,fontWeight:600,color:h.title }}>{CAT_LABEL[cat]}</span>
        <span style={{ fontSize:13,color:C.muted,marginLeft:'auto' }}>{toBn(filtered.length)}টি center</span>
      </div>
      {/* KPI */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
        {[
          { l:'মোট বিক্রয়', v:'৳'+fmt(totalRev), top:C.green, col:C.green },
          { l:'মোট উৎপাদন', v:fmtN(totalProd), sub:'টি চারা/কলম', top:C.purple, col:C.purple },
          { l:'মোট স্টক', v:fmtN(totalStock), sub:'টি চারা/কলম', top:C.amber, col:C.amber },
          { l:'Center সংখ্যা', v:toBn(filtered.length), top:C.teal, col:C.teal },
        ].map(k=>(
          <div key={k.l} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,boxShadow:shadow,borderTop:`3px solid ${k.top}` }}>
            <div style={{ fontSize:14,color:C.muted,marginBottom:8,fontWeight:500 }}>{k.l}</div>
            <div style={{ fontSize:26,fontWeight:700,lineHeight:1,color:k.col }}>{k.v}</div>
            {k.sub&&<div style={{ fontSize:14,color:C.muted,marginTop:4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>
      {/* Center list */}
      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
        {filtered.map(c=>(
          <HCard key={c.slug} c={c} onClick={()=>navigate(`/superadmin/center/${c.slug}`)}/>
        ))}
        {!filtered.length&&(
          <div style={{ textAlign:'center',padding:'60px 0',color:C.muted,fontSize:15 }}>
            <div style={{ fontSize:40,marginBottom:12 }}>🏢</div>
            এই category-তে কোনো center নেই।
          </div>
        )}
      </div>
    </div>
  );
}
