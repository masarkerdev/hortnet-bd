import { useEffect, useState } from 'react';
import axios from 'axios';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#f8f6f0', card:'#fff', border:'#e2ddd5', text:'#1a1a18', muted:'#888780', green:'#16a34a', green3:'#f0fdf4', red:'#dc2626', red2:'#fee2e2', amber:'#d97706', shadow:'0 1px 3px rgba(0,0,0,0.08)' };
const toBn = n => String(n).replace(/[0-9]/g, d=>'০১২৩৪৫৬৭৮৯'[d]);

export default function SaHRM() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [centerFilter, setCenterFilter] = useState('');
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

  const centers = [...new Set(data.rows.map(r => r.center_name))];
  const filteredRows = data.rows.filter(r =>
    (!centerFilter || r.center_name === centerFilter) &&
    (!onlyVacant || r.vacant > 0)
  );

  const cardStyle = { background:V.card, borderRadius:12, padding:'1rem', boxShadow:V.shadow };

  return (
    <div style={{ fontFamily:FONT }}>
      <div style={{ fontSize:18, fontWeight:700, color:V.text, marginBottom:16 }}>👥 জনবল ব্যবস্থাপনা (HRM) — শূন্য পদের তালিকা</div>

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
        <select value={centerFilter} onChange={e=>setCenterFilter(e.target.value)} style={{ flex:1, padding:'8px 12px', border:`1.5px solid ${V.border}`, borderRadius:9, fontFamily:FONT, fontSize:14, background:V.bg, color:V.text }}>
          <option value="">সব সেন্টার</option>
          {centers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:14, color:V.text, whiteSpace:'nowrap' }}>
          <input type="checkbox" checked={onlyVacant} onChange={e=>setOnlyVacant(e.target.checked)} />
          শুধু শূন্য পদ দেখাও
        </label>
      </div>

      <div style={{ background:V.card, borderRadius:12, boxShadow:V.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:V.bg }}>
              {['সেন্টার','ক্যাটাগরি','পদবি','মঞ্জুরীকৃত','কর্মরত','শূন্য'].map(h => (
                <th key={h} style={{ textAlign: h==='মঞ্জুরীকৃত'||h==='কর্মরত'||h==='শূন্য' ? 'center' : 'left', padding:'8px 12px', fontSize:13, color:V.muted, fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r,i) => (
              <tr key={i} style={{ borderTop:`1px solid ${V.border}` }}>
                <td style={{ padding:'8px 12px', fontSize:14 }}>{r.center_name}</td>
                <td style={{ padding:'8px 12px', fontSize:13, color:V.muted }}>{r.category}</td>
                <td style={{ padding:'8px 12px', fontSize:14 }}>{r.designation}</td>
                <td style={{ padding:'8px 12px', fontSize:14, textAlign:'center' }}>{toBn(r.sanctioned)}</td>
                <td style={{ padding:'8px 12px', fontSize:14, textAlign:'center' }}>{toBn(r.actual)}</td>
                <td style={{ padding:'8px 12px', textAlign:'center' }}>
                  <span style={{
                    background: r.vacant > 0 ? V.red2 : V.green3,
                    color: r.vacant > 0 ? V.red : V.green,
                    padding:'2px 10px', borderRadius:8, fontSize:13, fontWeight:600
                  }}>{toBn(r.vacant)}</span>
                </td>
              </tr>
            ))}
            {!filteredRows.length && (
              <tr><td colSpan={6} style={{ padding:20, textAlign:'center', color:V.muted }}>কোনো শূন্য পদ নেই</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
