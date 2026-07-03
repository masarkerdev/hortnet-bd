import { useEffect, useState } from 'react';
import saApi from './saApi';
import { toBn } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',green4:'#dcfce7',red:'#dc2626',amber:'#d97706',purple:'#7c3aed',blue:'#2563eb',accent:'#3b6d11' };
const shadow = '0 1px 3px rgba(0,0,0,0.08)';

function fmtK(n){const v=parseFloat(n||0);if(v>=10000000)return'৳'+toBn((v/10000000).toFixed(1))+' কোটি';if(v>=100000)return'৳'+toBn((v/100000).toFixed(1))+' লাখ';if(v>=1000)return'৳'+toBn((v/1000).toFixed(1))+' হাজার';return'৳'+toBn(Math.round(v));}
function fmtN(n){return toBn(parseInt(n||0).toLocaleString('en-IN'));}

function CatBadge({cat}){
  const s={A:{bg:'#1e1b4b',col:'#a5b4fc'},B:{bg:'#052e16',col:'#4ade80'},C:{bg:'#431407',col:'#fb923c'}}[cat]||{bg:'#1e293b',col:'#94a3b8'};
  return<span style={{fontSize:11,padding:'2px 6px',borderRadius:5,fontWeight:700,background:s.bg,color:s.col}}>{cat}</span>;
}
function TLBadge({tl}){
  const s={green:{bg:'#064e3b',col:'#4ade80',l:'ভালো'},yellow:{bg:'#451a03',col:'#fbbf24',l:'মাঝারি'},red:{bg:'#450a0a',col:'#f87171',l:'দুর্বল'}}[tl]||{bg:'#1e293b',col:'#94a3b8',l:'—'};
  return<span style={{fontSize:11,padding:'2px 7px',borderRadius:10,background:s.bg,color:s.col}}>{s.l}</span>;
}

function RankTable({sorted,type}){
  if(!sorted.length) return null;
  const best=sorted[0],worst=sorted[sorted.length-1];
  return(
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>
          {['#','Center','জেলা','Cat','বিক্রয়','উৎপাদন','স্টক','অবস্থা'].map(h=>(
            <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:13,color:C.muted,fontWeight:600,background:C.card2,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {sorted.map((c,i)=>(
            <tr key={c.slug} style={{background:c===best?'#f0fdf4':c===worst?'#fef2f2':'transparent'}}>
              <td style={{padding:'12px 14px',fontSize:14,fontWeight:700,color:i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':C.muted,borderBottom:`1px solid ${C.border}`}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':toBn(i+1)}</td>
              <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><div style={{fontWeight:600,fontSize:15,color:C.text}}>{c.name_bn}</div></td>
              <td style={{padding:'12px 14px',fontSize:13,color:C.muted,borderBottom:`1px solid ${C.border}`}}>{c.district||'—'}</td>
              <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><CatBadge cat={c.category}/></td>
              <td style={{padding:'12px 14px',fontWeight:700,color:type==='sales'?C.green:C.text,borderBottom:`1px solid ${C.border}`}}>{fmtK(c.total_revenue)}</td>
              <td style={{padding:'12px 14px',fontWeight:700,color:type==='production'?C.purple:C.text,borderBottom:`1px solid ${C.border}`}}>{fmtN(c.total_produced)}</td>
              <td style={{padding:'12px 14px',fontWeight:700,color:type==='stock'?C.amber:C.text,borderBottom:`1px solid ${C.border}`}}>{fmtN(c.total_stock)}</td>
              <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><TLBadge tl={c.traffic_light}/></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:'flex',gap:16,padding:'12px 16px',borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>
        <span>🟢 <b style={{color:C.green}}>{best?.name_bn}</b> — সর্বোচ্চ</span>
        <span>🔴 <b style={{color:C.red}}>{worst?.name_bn}</b> — সর্বনিম্ন</span>
      </div>
    </div>
  );
}

export default function SaCompare() {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sortType,setSortType]=useState('sales');

  useEffect(()=>{ saApi.get('/stats-all').then(r=>setRows(r.data?.data||[])).finally(()=>setLoading(false)); },[]);

  const ok=rows.filter(c=>c.status==='ok'||c.total_revenue!=null);
  const sorted=sortType==='sales'?[...ok].sort((a,b)=>b.total_revenue-a.total_revenue):sortType==='production'?[...ok].sort((a,b)=>b.total_produced-a.total_produced):[...ok].sort((a,b)=>b.total_stock-a.total_stock);
  const curFY=new Date().getMonth()>=6?new Date().getFullYear():new Date().getFullYear()-1;

  function exportCSV(){
    const headers=['Center','Category','জেলা','বিভাগ','মোট বিক্রয় (৳)','চলতি মাস (৳)','গত মাস (৳)','প্রবৃদ্ধি (%)','মোট উৎপাদন','মোট স্টক','লক্ষ্য অর্জন (%)','Performance Score','অবস্থা'];
    const csvRows=ok.map(c=>[c.name_bn,c.category,c.district||'',c.division||'',(+c.total_revenue||0).toFixed(0),(+c.current_month_rev||0).toFixed(0),(+c.last_month_rev||0).toFixed(0),(+c.growth_rate||0).toFixed(1),c.total_produced,c.total_stock,c.target_achieved!=null?c.target_achieved.toFixed(1):'N/A',c.perf_score,c.traffic_light==='green'?'ভালো':c.traffic_light==='yellow'?'মাঝারি':'দুর্বল']);
    const csv=[headers,...csvRows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`HortNet-BD_Report_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }

  if(loading) return<div style={{padding:'40px 0',textAlign:'center',color:C.muted,fontFamily:FONT}}>লোড হচ্ছে…</div>;

  return(
    <div style={{fontFamily:FONT}}>
      {/* লক্ষ্যমাত্রা অর্জন */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:14,overflow:'hidden',boxShadow:shadow}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,fontSize:16,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.card2}}>
          🎯 লক্ষ্যমাত্রা অর্জন <span style={{fontSize:13,color:C.muted}}>FY {toBn(curFY)}-{toBn(curFY+1)}</span>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Center','Cat','অর্থবছরের লক্ষ্যমাত্রা','চলতি মাসের লক্ষ্যমাত্রা','চলতি মাসের অর্জন','অগ্রগতি'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:13,color:C.muted,fontWeight:600,background:C.card2,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...ok].sort((a,b)=>{const ap=a.monthly_prod_target>0?a.monthly_prod_achieved/a.monthly_prod_target:0;const bp=b.monthly_prod_target>0?b.monthly_prod_achieved/b.monthly_prod_target:0;return bp-ap;}).map(c=>{
                const pct=c.monthly_prod_target>0?Math.min(Math.round((c.monthly_prod_achieved/c.monthly_prod_target)*100),200):null;
                const col=pct===null?C.muted:pct>=70?C.green:pct>=40?C.amber:C.red;
                return(
                  <tr key={c.slug}>
                    <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><div style={{fontWeight:600,fontSize:15,color:C.text}}>{c.name_bn}</div><div style={{fontSize:13,color:C.muted}}>{c.district||''}</div></td>
                    <td style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}><CatBadge cat={c.category}/></td>
                    <td style={{padding:'12px 14px',color:C.purple,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{c.annual_prod_target>0?fmtN(c.annual_prod_target)+'টি':'—'}</td>
                    <td style={{padding:'12px 14px',color:C.blue,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{c.monthly_prod_target>0?fmtN(c.monthly_prod_target)+'টি':'—'}</td>
                    <td style={{padding:'12px 14px',color:C.green,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{fmtN(c.monthly_prod_achieved)}টি</td>
                    <td style={{padding:'12px 14px',minWidth:140,borderBottom:`1px solid ${C.border}`}}>
                      {pct!==null?(
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:6,background:C.bg,borderRadius:3,border:`1px solid ${C.border}`}}><div style={{height:6,width:`${Math.min(pct,100)}%`,background:col,borderRadius:3}}/></div>
                          <span style={{fontSize:15,fontWeight:700,color:col,minWidth:36}}>{toBn(pct)}%</span>
                        </div>
                      ):<span style={{fontSize:13,color:C.muted,fontStyle:'italic'}}>লক্ষ্যমাত্রা নেই</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* র‍্যাংকিং টেবিল */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',boxShadow:shadow}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,fontSize:16,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',background:C.card2}}>
          🏅 র‍্যাংকিং টেবিল
          <div style={{display:'flex',gap:6}}>
            {[['sales','বিক্রয়'],['production','উৎপাদন'],['stock','স্টক']].map(([t,l])=>(
              <button key={t} onClick={()=>setSortType(t)} style={{padding:'4px 10px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:FONT,border:`1px solid ${C.border}`,background:sortType===t?C.accent:'#fff',color:sortType===t?'#fff':C.muted,fontWeight:sortType===t?600:400}}>{l}</button>
            ))}
            <button onClick={exportCSV} style={{padding:'4px 10px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:FONT,border:`1px solid ${C.border}`,background:'#fff',color:C.muted}}>📥 CSV</button>
          </div>
        </div>
        <RankTable sorted={sorted} type={sortType}/>
      </div>
    </div>
  );
}
