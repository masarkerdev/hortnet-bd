import { useEffect, useState } from 'react';
import saApi from './saApi';
import { useSa } from './SaAuth';
import { confirm } from '../lib/confirm';
import { toBn } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',card2:'#f8f6f0',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',green4:'#dcfce7',red:'#dc2626',red3:'#fef2f2',amber:'#d97706',blue:'#2563eb',accent:'#3b6d11' };
const shadow = '0 1px 3px rgba(0,0,0,0.08)';
const PRI = {
  urgent:  { label:'🔴 জরুরি',       color:C.red,   border:'1px solid #fecaca', bg:'#fef2f2' },
  important:{ label:'🟡 গুরুত্বপূর্ণ', color:C.amber, border:'1px solid #fde68a', bg:'#fffbeb' },
  normal:  { label:'🔵 সাধারণ',       color:C.blue,  border:'1px solid #bfdbfe', bg:'#eff6ff' },
};

function fmtDate(d) {
  if (!d) return '—';
  try { const dt=new Date(d); return toBn(`${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`); } catch { return d; }
}

export default function SaNotices() {
  const { sa } = useSa();
  const isDir = sa?.role === 'director';
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title:'', content:'', priority:'normal', expires_at:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try { const r = await saApi.get('/notices'); if (r.data?.success) setNotices(r.data.data||[]); }
    catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title || !form.content) { setMsg('শিরোনাম ও বিষয়বস্তু দিন।'); return; }
    setSaving(true); setMsg('');
    try {
      const r = await saApi.post('/notices', { ...form, expires_at: form.expires_at||null });
      if (r.data?.success) { setModal(false); setForm({ title:'',content:'',priority:'normal',expires_at:'' }); load(); }
      else setMsg(r.data?.message||'সমস্যা');
    } catch (e) { setMsg(e?.response?.data?.message||'সমস্যা'); } finally { setSaving(false); }
  }

  async function doDelete(n) {
    if (!(await confirm({ title:`"${n.title}" মুছে ফেলবেন?`, message:'এই নোটিশ চিরতরে মুছে যাবে।', confirmLabel:'মুছুন' }))) return;
    try { const r=await saApi.delete(`/notices/${n.id}`); if (r.data?.success) load(); } catch {}
  }

  const inp = { width:'100%',padding:'10px 14px',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',fontFamily:FONT,boxSizing:'border-box' };

  return (
    <div style={{ fontFamily:FONT }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
        <div style={{ fontSize:17,fontWeight:700,color:C.text }}>📢 নোটিশ বোর্ড</div>
        {isDir && <button onClick={()=>setModal(true)} style={{ padding:'9px 18px',background:C.accent,color:'#fff',border:`1px solid ${C.accent}`,borderRadius:8,cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>+ নতুন নোটিশ</button>}
      </div>

      {loading ? <div style={{ color:C.muted,fontSize:14 }}>লোড হচ্ছে…</div> : notices.length===0 ? (
        <div style={{ textAlign:'center',padding:'60px 0',color:C.muted,fontSize:15 }}><div style={{ fontSize:40,marginBottom:12 }}>📢</div>কোনো নোটিশ নেই</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {notices.map(n=>{
            const p=PRI[n.priority]||PRI.normal;
            return(
              <div key={n.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',boxShadow:shadow,borderLeft:`4px solid ${p.color}` }}>
                <div style={{ padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start',background:C.card2 }}>
                  <div>
                    <div style={{ fontSize:12,color:p.color,marginBottom:4,fontWeight:500 }}>{p.label}</div>
                    <div style={{ fontSize:17,fontWeight:700,color:C.text }}>{n.title}</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
                    <span style={{ fontSize:12,color:C.muted }}>{fmtDate(n.created_at)}</span>
                    {isDir && <button onClick={()=>doDelete(n)} style={{ padding:'6px 10px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,background:C.bg,border:`1px solid ${C.border}`,color:C.red }}>🗑</button>}
                  </div>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ fontSize:15,lineHeight:1.8,color:C.text,whiteSpace:'pre-line' }}>{n.content}</div>
                  {n.expires_at && <div style={{ marginTop:12,fontSize:12,color:C.muted }}>📅 মেয়াদ: {fmtDate(n.expires_at)}</div>}
                  <div style={{ marginTop:6,fontSize:12,color:C.muted }}>👤 প্রকাশক: {n.created_by||'—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New notice modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(26,46,26,0.45)' }}>
          <div style={{ background:C.card,borderRadius:16,padding:28,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontSize:17,fontWeight:700,color:C.text }}>নতুন নোটিশ</div>
              <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted }}>×</button>
            </div>
            <div style={{ marginBottom:14 }}><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>শিরোনাম*</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="নোটিশের শিরোনাম" style={inp}/></div>
            <div style={{ marginBottom:14 }}><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>বিষয়বস্তু*</label><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="নোটিশের বিস্তারিত…" rows={5} style={{ ...inp,resize:'vertical' }}/></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>অগ্রাধিকার</label>
                <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={inp}>
                  <option value="normal">🔵 সাধারণ</option>
                  <option value="important">🟡 গুরুত্বপূর্ণ</option>
                  <option value="urgent">🔴 জরুরি</option>
                </select>
              </div>
              <div><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>মেয়াদ উত্তীর্ণ</label><input type="date" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value})} style={inp}/></div>
            </div>
            {msg && <div style={{ color:C.red,fontSize:13,marginBottom:8 }}>{msg}</div>}
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
              <button onClick={()=>setModal(false)} style={{ padding:'10px 20px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontSize:14,fontFamily:FONT }}>বাতিল</button>
              <button onClick={save} disabled={saving} style={{ padding:'10px 20px',borderRadius:8,background:C.accent,color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>{saving?'প্রকাশ হচ্ছে…':'প্রকাশ করুন'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
