import { useEffect, useState } from 'react';
import { useSa } from './SaAuth';
import saApi from './saApi';
import { confirm } from '../lib/confirm';
import { toBn, V, FONT, fmtDate } from './saUtils';

const PRI_COLOR = { urgent: V.red, important: V.amber, normal: V.blue };
const PRI_LABEL = { urgent: '🔴 জরুরি', important: '🟡 গুরুত্বপূর্ণ', normal: '🔵 সাধারণ' };
const PRI_BD    = { urgent: '#5a1a14', important: '#5a3a00', normal: '#1a3a5a' };

function fmtNoticeDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    const day   = String(dt.getDate()).padStart(2,'0');
    const month = String(dt.getMonth()+1).padStart(2,'0');
    const year  = dt.getFullYear();
    return toBn(`${day}/${month}/${year}`);
  } catch { return d; }
}

const EMPTY = { title:'', content:'', priority:'normal', expires_at:'' };

export default function SaNotices() {
  const { sa } = useSa();
  const isDir = sa?.role === 'director';
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await saApi.get('/notices');
      setNotices(r.data?.data||[]);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title.trim() || !form.content.trim() || !form.expires_at) { setMsg('শিরোনাম, বিষয়বস্তু ও মেয়াদ শেষ তারিখ দিন।'); return; }
    setSaving(true); setMsg('');
    try {
      const r = await saApi.post('/notices', { ...form, expires_at: form.expires_at||null });
      if (r.data?.success) { setModal(false); setForm(EMPTY); load(); }
      else setMsg(r.data?.message||'সমস্যা হয়েছে।');
    } catch { setMsg('সংযোগ সমস্যা।'); } finally { setSaving(false); }
  }

  async function del(id) {
    if (!(await confirm({ title:'এই নোটিশ মুছে ফেলবেন?' }))) return;
    try {
      await saApi.delete(`/notices/${id}`);
      load();
    } catch { alert('সমস্যা হয়েছে।'); }
  }

  return (
    <div style={{ fontFamily:FONT }}>
      {/* header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:17, fontWeight:700, color:V.text }}>📢 নোটিশ বোর্ড</div>
        {isDir && (
          <button onClick={()=>{ setForm(EMPTY); setMsg(''); setModal(true); }}
            style={{ background:V.green, color:'#fff', border:'none', padding:'9px 18px', borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT, display:'flex', alignItems:'center', gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.background=V.green2}
            onMouseLeave={e=>e.currentTarget.style.background=V.green}>
            <i className="ti ti-plus"/> নতুন নোটিশ
          </button>
        )}
      </div>

      {/* notice list */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <div style={{ width:36, height:36, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : !notices.length ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:V.muted }}>
          <i className="ti ti-speakerphone" style={{ fontSize:40, display:'block', marginBottom:12 }}/>
          কোনো নোটিশ নেই
        </div>
      ) : notices.map(n=>(
        <div key={n.id} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:12, marginBottom:12, overflow:'hidden', boxShadow:V.shadow, borderLeft:`4px solid ${PRI_COLOR[n.priority]||V.blue}` }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${V.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:V.card2 }}>
            <div>
              <div style={{ fontSize:12, color:V.muted, marginBottom:4 }}>{PRI_LABEL[n.priority]||PRI_LABEL.normal}</div>
              <div style={{ fontSize:17, fontWeight:700, color:V.text }}>{n.title}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <span style={{ fontSize:12, color:V.muted }}>{fmtNoticeDate(n.created_at)}</span>
              {isDir && (
                <button onClick={()=>del(n.id)}
                  style={{ background:'none', border:`1px solid ${V.border}`, color:V.red, padding:'6px 10px', borderRadius:7, cursor:'pointer', fontSize:13 }}
                  onMouseEnter={e=>{e.currentTarget.style.background=V.red3;e.currentTarget.style.borderColor=V.red;}}
                  onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.borderColor=V.border;}}>
                  <i className="ti ti-trash"/>
                </button>
              )}
            </div>
          </div>
          <div style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:15, lineHeight:1.8, color:V.text, whiteSpace:'pre-line' }}>{n.content}</div>
            {n.expires_at && (
              <div style={{ marginTop:12, fontSize:12, color:V.muted, display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-calendar" style={{ fontSize:13 }}/> মেয়াদ: {fmtNoticeDate(n.expires_at)}
              </div>
            )}
            <div style={{ marginTop:6, fontSize:12, color:V.muted }}>
              <i className="ti ti-user" style={{ fontSize:12 }}/> প্রকাশক: {n.created_by||'—'}
            </div>
          </div>
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:V.card, borderRadius:14, padding:24, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', fontFamily:FONT }}>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:20, color:V.text }}>📢 নতুন নোটিশ</div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, color:V.muted, display:'block', marginBottom:6 }}>শিরোনাম *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="নোটিশের শিরোনাম"
                style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:V.text, background:V.bg, boxSizing:'border-box' }}/>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, color:V.muted, display:'block', marginBottom:6 }}>বিষয়বস্তু *</label>
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}
                placeholder="নোটিশের বিস্তারিত..."
                rows={5}
                style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:V.text, background:V.bg, resize:'vertical', boxSizing:'border-box' }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:V.muted, display:'block', marginBottom:6 }}>অগ্রাধিকার</label>
                <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}
                  style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:V.text, background:V.bg }}>
                  <option value="normal">🔵 সাধারণ</option>
                  <option value="important">🟡 গুরুত্বপূর্ণ</option>
                  <option value="urgent">🔴 জরুরি</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:V.muted, display:'block', marginBottom:6 }}>মেয়াদ শেষ *</label>
                <input type="datetime-local" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))}
                  style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${V.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:V.text, background:V.bg, boxSizing:'border-box' }}/>
              </div>
            </div>

            {msg && <div style={{ color:V.red, fontSize:13, marginBottom:12 }}>{msg}</div>}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setModal(false)}
                style={{ padding:'10px 20px', borderRadius:8, border:`1px solid ${V.border}`, background:V.card, color:V.muted, cursor:'pointer', fontSize:14, fontFamily:FONT }}>
                বাতিল
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding:'10px 20px', borderRadius:8, border:'none', background:V.green, color:'#fff', cursor:'pointer', fontSize:14, fontFamily:FONT, opacity:saving?0.7:1 }}>
                {saving ? 'প্রকাশ হচ্ছে...' : 'প্রকাশ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
