import { useEffect, useState } from 'react';
import axios from 'axios';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#f8f6f0', card:'#fff', border:'#e2ddd5', text:'#1a1a18', muted:'#888780', green:'#16a34a', green3:'#f0fdf4', red:'#dc2626', red2:'#fee2e2', amber:'#d97706', shadow:'0 1px 3px rgba(0,0,0,0.08)' };
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);

export default function SaHRM() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [onlyVacant, setOnlyVacant] = useState(true);

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || '/api');
    const token = sessionStorage.getItem('sa_tk');
    axios.get(`${base}/hrm/vacancy`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.data?.success) setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return <div style={{ padding:20, color:V.muted, fontFamily:FONT }}>ডেটা আনা যায়নি।</div>;

  const list = onlyVacant ? data.by_designation.filter(d => d.total_vacant > 0) : data.by_designation;
  const cardStyle = { background:V.card, borderRadius:12, padding:'1rem', boxShadow:V.shadow };

  return (
    <div style={{ fontFamily:FONT }}>
      <div style={{ fontSize:18, fontWeight:700, color:V.text, marginBottom:16 }}>👥 জনবল ব্যবস্থাপনা (HRM) — পদবি অনুযায়ী শূন্য পদ</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>মোট মঞ্জুরীকৃত পদ</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{toBn(data.summary.total_sanctioned)}</div>
        </div>
        <div style={{ ...cardStyle, background:V.red2 }}>
          <div style={{ fontSize:13, color:V.red, marginBottom:6 }}>মোট শূন্য পদ</div>
          <div style={{ fontSize:24, fontWeight:700, color:V.red }}>{toBn(data.summary.total_vacant)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>প্রেষণে</div>
          <div style={{ fontSize:24, fontWeight:700, color:V.amber }}>{toBn(data.summary.deputation)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>সাময়িক শ্রমিক</div>
          <div style={{ fontSize:24, fontWeight:700 }}>{toBn(data.summary.temporary)}</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, color:V.text }}>
          <input type="checkbox" checked={onlyVacant} onChange={e=>setOnlyVacant(e.target.checked)} />
          শুধু শূন্য পদ দেখাও
        </label>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {list.map(d => (
          <div key={d.designation} style={{ background:V.card, borderRadius:12, boxShadow:V.shadow, overflow:'hidden' }}>
            <div
              onClick={() => setExpanded(p => ({ ...p, [d.designation]: !p[d.designation] }))}
              style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor: d.centers.length ? 'pointer' : 'default' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {d.centers.length > 0 && (
                  <span style={{ fontSize:12, color:V.muted, transform: expanded[d.designation] ? 'rotate(90deg)' : 'none', transition:'.15s', display:'inline-block' }}>▶</span>
                )}
                <span style={{ fontSize:15, fontWeight:600 }}>{d.designation}</span>
              </div>
              <div style={{ display:'flex', gap:16, alignItems:'center', fontSize:13, color:V.muted }}>
                <span>মঞ্জুরীকৃত: <b style={{color:V.text}}>{toBn(d.total_sanctioned)}</b></span>
                <span>কর্মরত: <b style={{color:V.text}}>{toBn(d.total_actual)}</b></span>
                <span style={{
                  background: d.total_vacant > 0 ? V.red2 : V.green3,
                  color: d.total_vacant > 0 ? V.red : V.green,
                  padding:'3px 12px', borderRadius:8, fontWeight:700, fontSize:14
                }}>শূন্য: {toBn(d.total_vacant)}</span>
              </div>
            </div>

            {expanded[d.designation] && d.centers.length > 0 && (
              <div style={{ borderTop:`1px solid ${V.border}` }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:V.bg }}>
                      {['সেন্টার','মঞ্জুরীকৃত','কর্মরত','শূন্য'].map(h => (
                        <th key={h} style={{ textAlign: h==='সেন্টার' ? 'left' : 'center', padding:'6px 16px', fontSize:12, color:V.muted, fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.centers.map((c,i) => (
                      <tr key={i} style={{ borderTop:`1px solid ${V.border}` }}>
                        <td style={{ padding:'6px 16px', fontSize:13 }}>{c.center_name}</td>
                        <td style={{ padding:'6px 16px', fontSize:13, textAlign:'center' }}>{toBn(c.sanctioned)}</td>
                        <td style={{ padding:'6px 16px', fontSize:13, textAlign:'center' }}>{toBn(c.actual)}</td>
                        <td style={{ padding:'6px 16px', fontSize:13, textAlign:'center', color:V.red, fontWeight:600 }}>{toBn(c.vacant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {!list.length && (
          <div style={{ ...cardStyle, textAlign:'center', color:V.muted, padding:30 }}>কোনো শূন্য পদ নেই</div>
        )}
      </div>
    </div>
  );
}
