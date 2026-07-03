import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saApi from './saApi';
import { toBn } from '../lib/format';

const FONT="'Noto Sans Bengali','Segoe UI',sans-serif";
const C={bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',red:'#dc2626',amber:'#d97706',purple:'#7c3aed',accent:'#3b6d11'};
const shadow='0 1px 3px rgba(0,0,0,0.08)';
function fmtK(n){const v=parseFloat(n||0);if(v>=10000000)return'৳'+toBn((v/10000000).toFixed(1))+' কোটি';if(v>=100000)return'৳'+toBn((v/100000).toFixed(1))+' লাখ';if(v>=1000)return'৳'+toBn((v/1000).toFixed(1))+' হাজার';return'৳'+toBn(Math.round(v));}
function fmtN(n){return toBn(parseInt(n||0).toLocaleString('en-IN'));}
function scoreColor(s){return s>=70?'#4ade80':s>=45?'#fbbf24':'#f87171';}
const CAT_BADGE={A:{bg:'#1e1b4b',col:'#a5b4fc'},B:{bg:'#052e16',col:'#4ade80'},C:{bg:'#431407',col:'#fb923c'}};
const TL_DOT={green:'#16a34a',yellow:'#ca8a04',red:'#dc2626'};

function GroupCard({name, subtitle, centers, stats, navigate}) {
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:14,overflow:'hidden',boxShadow:shadow}}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.card2,borderLeft:`3px solid ${C.accent}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16,fontWeight:700,color:C.text}}>{name}</span>
          {subtitle&&<span style={{fontSize:12,color:C.muted}}>{subtitle}</span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {['A','B','C'].map(cat=>{const n=centers.filter(c=>c.category===cat).length;return n>0?<span key={cat} style={{fontSize:11,padding:'2px 8px',borderRadius:5,fontWeight:700,...CAT_BADGE[cat]}}>{cat}×{toBn(n)}</span>:null;})}
          <span style={{fontSize:12,color:C.muted}}>{toBn(centers.length)}টি center</span>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:`1px solid ${C.border}`}}>
        {[{v:fmtK(stats.rev),l:'মোট বিক্রয়',col:C.green},{v:fmtN(stats.prod),l:'মোট উৎপাদন',col:C.purple},{v:fmtN(stats.stock),l:'মোট স্টক',col:C.amber},{v:toBn(stats.avg),l:'গড় Score',col:scoreColor(stats.avg)}].map((s,i)=>(
          <div key={i} style={{padding:14,textAlign:'center',borderRight:i<3?`1px solid ${C.border}`:'none'}}>
            <div style={{fontSize:18,fontWeight:700,color:s.col}}>{s.v}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{padding:'12px 16px'}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Center সমূহ:</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {centers.map(c=>(
            <div key={c.slug} onClick={()=>navigate(`/superadmin/center/${c.slug}`)}
              style={{cursor:'pointer',background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:'6px 10px',display:'flex',alignItems:'center',gap:6,transition:'.15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <span style={{fontSize:10,padding:'1px 5px',borderRadius:4,fontWeight:700,...(CAT_BADGE[c.category]||CAT_BADGE.B)}}>{c.category}</span>
              <span style={{fontSize:12,fontWeight:500,color:C.text}}>{c.name_bn.replace('হর্টিকালচার সেন্টার, ','')}</span>
              <div style={{width:8,height:8,borderRadius:'50%',background:TL_DOT[c.traffic_light]||TL_DOT.yellow}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SaDistrictSummary(){
  const navigate=useNavigate();
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState('district');
  useEffect(()=>{saApi.get('/stats-all').then(r=>setRows(r.data?.data||[])).finally(()=>setLoading(false));},[]);
  const ok=rows.filter(c=>c.status==='ok'||c.total_revenue!=null);

  const byDistrict={};
  const byDivision={};
  ok.forEach(c=>{
    const d=c.district||'অজানা',dv=c.division||'অজানা';
    if(!byDistrict[d])byDistrict[d]={centers:[],division:dv};
    byDistrict[d].centers.push(c);
    if(!byDivision[dv])byDivision[dv]={centers:[]};
    byDivision[dv].centers.push(c);
  });

  function calcStats(cs){return{rev:cs.reduce((s,c)=>s+(+c.total_revenue||0),0),prod:cs.reduce((s,c)=>s+(+c.total_produced||0),0),stock:cs.reduce((s,c)=>s+(+c.total_stock||0),0),avg:cs.length?Math.round(cs.reduce((s,c)=>s+(+c.perf_score||0),0)/cs.length):0};}

  if(loading) return<div style={{padding:'40px 0',textAlign:'center',color:C.muted,fontFamily:FONT}}>লোড হচ্ছে…</div>;

  return(
    <div style={{fontFamily:FONT}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{fontSize:17,fontWeight:700,color:C.text}}>🗺️ জেলাভিত্তিক সারসংক্ষেপ</div>
        <div style={{display:'flex',gap:6}}>
          {[['district','জেলা'],['division','বিভাগ']].map(([t,l])=>(
            <button key={t} onClick={()=>setView(t)} style={{padding:'7px 16px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,border:view===t?'none':`1px solid ${C.border}`,background:view===t?C.accent:'#fff',color:view===t?'#fff':C.muted,fontWeight:view===t?600:400}}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {view==='district' && Object.entries(byDistrict).sort((a,b)=>b[1].centers.length-a[1].centers.length).map(([d,data])=>(
        <GroupCard key={d} name={d} subtitle={data.division} centers={data.centers} stats={calcStats(data.centers)} navigate={navigate}/>
      ))}
      {view==='division' && Object.entries(byDivision).sort((a,b)=>b[1].centers.length-a[1].centers.length).map(([dv,data])=>(
        <GroupCard key={dv} name={dv} subtitle="" centers={data.centers} stats={calcStats(data.centers)} navigate={navigate}/>
      ))}
    </div>
  );
}
