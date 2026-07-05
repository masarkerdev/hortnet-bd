import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://api.hortnet-bd.com/api/dev';
const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#0d1117', card:'#161b22', border:'#30363d', text:'#e6edf3', muted:'#8b949e', green:'#3fb950', red:'#f85149', amber:'#d29922', blue:'#58a6ff' };

function devApi(path, opts={}) {
  const token = sessionStorage.getItem('dev_token');
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type':'application/json', 'x-dev-token': token||'' },
    ...opts,
  }).then(r=>r.json());
}

// Login Page
function DevLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const r = await fetch(`${API}/login`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password, secret_key: secret })
      }).then(r=>r.json());
      if (r.success) { sessionStorage.setItem('dev_token', r.token); onLogin(r.dev); }
      else setErr(r.message||'Login failed');
    } catch { setErr('Connection error'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:V.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT }}>
      <div style={{ width:380, background:V.card, border:`1px solid ${V.border}`, borderRadius:14, padding:36 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔧</div>
          <div style={{ fontSize:18, fontWeight:700, color:V.text }}>Developer Panel</div>
          <div style={{ fontSize:12, color:V.muted, marginTop:4 }}>HortNet-BD — Restricted Access</div>
        </div>
        {[
          { label:'Email', value:email, set:setEmail, type:'email', ph:'dev@hortnet-bd.com' },
          { label:'Password', value:password, set:setPassword, type:showPass?'text':'password', ph:'••••••••' },
          { label:'Secret Key', value:secret, set:setSecret, type:'password', ph:'••••••••••••' },
        ].map(f=>(
          <div key={f.label} style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6, fontWeight:600 }}>{f.label}</label>
            <input type={f.type} value={f.value} onChange={e=>f.set(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submit()}
              placeholder={f.ph}
              style={{ width:'100%', padding:'10px 12px', background:'#0d1117', border:`1px solid ${V.border}`, borderRadius:8, color:V.text, fontSize:14, fontFamily:FONT, outline:'none', boxSizing:'border-box' }}/>
          </div>
        ))}
        {err && <div style={{ color:V.red, fontSize:13, marginBottom:12, background:'#2d1414', padding:'8px 12px', borderRadius:8 }}>⚠️ {err}</div>}
        <button onClick={submit} disabled={busy}
          style={{ width:'100%', padding:'11px', background:V.green, border:'none', borderRadius:8, color:'#000', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?.7:1 }}>
          {busy ? 'Authenticating...' : '🔐 Access Panel'}
        </button>
        <div style={{ textAlign:'center', marginTop:16, fontSize:12, color:V.muted }}>
          Unauthorized access is strictly prohibited
        </div>
      </div>
    </div>
  );
}

// Main Panel
function Panel({ dev, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [centers, setCenters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, a, c] = await Promise.all([
        devApi('/stats'), devApi('/super-admins'), devApi('/tenants')
      ]);
      if (s.success) { setStats(s.data); setLogs(s.data.recent_logs||[]); }
      if (a.success) setAdmins(a.data);
      if (c.success) setCenters(c.data);
    } catch {} finally { setLoading(false); }
  }

  async function resetPassword() {
    if (!resetEmail || !resetPass) { setMsg('Email ও password দিন।'); return; }
    const r = await devApi('/reset-password', { method:'POST', body: JSON.stringify({ email:resetEmail, new_password:resetPass }) });
    setMsg(r.message||r.error);
    if (r.success) { setResetEmail(''); setResetPass(''); }
  }

  async function toggleAdmin(id) {
    const r = await devApi(`/toggle-admin/${id}`, { method:'POST' });
    if (r.success) { setMsg(r.message); loadAll(); }
  }

  async function toggleCenter(id) {
    const r = await devApi(`/toggle-center/${id}`, { method:'POST' });
    if (r.success) { setMsg(r.message); loadAll(); }
  }

  const inp = { padding:'9px 12px', background:'#0d1117', border:`1px solid ${V.border}`, borderRadius:8, color:V.text, fontSize:13, fontFamily:FONT, outline:'none', width:'100%', boxSizing:'border-box' };
  const TABS = [['dashboard','📊 Dashboard'],['admins','👤 Super Admins'],['centers','🏛️ Centers'],['reset','🔑 Password Reset'],['logs','📋 Logs']];

  return (
    <div style={{ minHeight:'100vh', background:V.bg, fontFamily:FONT, color:V.text }}>
      {/* Topbar */}
      <div style={{ background:V.card, borderBottom:`1px solid ${V.border}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🔧</span>
          <span style={{ fontWeight:700, fontSize:15 }}>Developer Panel</span>
          <span style={{ fontSize:11, background:'#1f3a1f', color:V.green, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>RESTRICTED</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:V.muted }}>👤 {dev.name}</span>
          <button onClick={onLogout} style={{ background:'none', border:`1px solid ${V.border}`, color:V.red, padding:'6px 12px', borderRadius:7, cursor:'pointer', fontSize:12, fontFamily:FONT }}>Logout</button>
        </div>
      </div>

      <div style={{ display:'flex', minHeight:'calc(100vh - 53px)' }}>
        {/* Sidebar */}
        <div style={{ width:200, background:V.card, borderRight:`1px solid ${V.border}`, padding:12 }}>
          {TABS.map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'none', background:tab===t?'#1f3a1f':'transparent', color:tab===t?V.green:V.muted, cursor:'pointer', fontSize:13, fontFamily:FONT, textAlign:'left', marginBottom:4, fontWeight:tab===t?600:400 }}>
              {l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:24, overflowY:'auto' }}>
          {msg && (
            <div style={{ background:'#1a2d1a', border:`1px solid ${V.green}`, borderRadius:8, padding:'10px 16px', fontSize:13, color:V.green, marginBottom:16 }}>
              ✅ {msg} <button onClick={()=>setMsg('')} style={{ background:'none', border:'none', color:V.muted, cursor:'pointer', float:'right' }}>×</button>
            </div>
          )}

          {/* Dashboard */}
          {tab==='dashboard' && (
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📊 System Overview</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
                {[
                  ['🏛️ Centers', stats?.total_centers||0, V.blue],
                  ['👤 Admins', stats?.total_admins||0, V.green],
                  ['✅ Active Centers', centers.filter(c=>c.active).length, V.green],
                  ['❌ Inactive', centers.filter(c=>!c.active).length, V.red],
                ].map(([l,v,c])=>(
                  <div key={l} style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:'16px' }}>
                    <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>{l}</div>
                    <div style={{ fontSize:28, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:'16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:V.muted }}>📋 Recent Activity</div>
                {logs.length ? logs.map(l=>(
                  <div key={l.id} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:`1px solid ${V.border}`, fontSize:13 }}>
                    <span style={{ color:V.muted, width:140, flexShrink:0 }}>{new Date(l.created_at).toLocaleString('bn-BD')}</span>
                    <span style={{ color:V.amber, width:120, flexShrink:0 }}>{l.action}</span>
                    <span style={{ color:V.muted }}>{l.details}</span>
                  </div>
                )) : <div style={{ color:V.muted, fontSize:13 }}>কোনো activity নেই</div>}
              </div>
            </div>
          )}

          {/* Super Admins */}
          {tab==='admins' && (
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>👤 Super Admin তালিকা</div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['নাম','Email','Role','অবস্থা','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, borderBottom:`1px solid ${V.border}`, background:'#0d1117' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {admins.map(a=>(
                      <tr key={a.id}>
                        <td style={{ padding:'12px 14px', fontSize:13, borderBottom:`1px solid ${V.border}` }}>{a.name}</td>
                        <td style={{ padding:'12px 14px', fontSize:13, color:V.blue, borderBottom:`1px solid ${V.border}` }}>{a.email}</td>
                        <td style={{ padding:'12px 14px', fontSize:12, borderBottom:`1px solid ${V.border}` }}>
                          <span style={{ background:'#1f2d3f', color:V.blue, padding:'2px 8px', borderRadius:6 }}>{a.role}</span>
                        </td>
                        <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                          <span style={{ color:a.is_active?V.green:V.red, fontSize:12 }}>{a.is_active?'✅ সক্রিয়':'❌ বন্ধ'}</span>
                        </td>
                        <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                          <button onClick={()=>toggleAdmin(a.id)}
                            style={{ background:a.is_active?'#2d1414':'#1a2d1a', border:`1px solid ${a.is_active?V.red:V.green}`, color:a.is_active?V.red:V.green, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:FONT }}>
                            {a.is_active?'বন্ধ করুন':'চালু করুন'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Centers */}
          {tab==='centers' && (
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🏛️ Center তালিকা</div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Center','Slug','Category','জেলা','অবস্থা','Action'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, borderBottom:`1px solid ${V.border}`, background:'#0d1117' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {centers.map(c=>(
                      <tr key={c.id}>
                        <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, borderBottom:`1px solid ${V.border}` }}>{c.name_bn}</td>
                        <td style={{ padding:'12px 14px', fontSize:12, color:V.muted, fontFamily:'monospace', borderBottom:`1px solid ${V.border}` }}>{c.slug}</td>
                        <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                          <span style={{ background:'#1f2d3f', color:V.blue, padding:'2px 8px', borderRadius:6, fontSize:12 }}>{c.category}</span>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:13, color:V.muted, borderBottom:`1px solid ${V.border}` }}>{c.district}</td>
                        <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                          <span style={{ color:c.active?V.green:V.red, fontSize:12 }}>{c.active?'✅ সক্রিয়':'❌ বন্ধ'}</span>
                        </td>
                        <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                          <button onClick={()=>toggleCenter(c.id)}
                            style={{ background:c.active?'#2d1414':'#1a2d1a', border:`1px solid ${c.active?V.red:V.green}`, color:c.active?V.red:V.green, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:FONT }}>
                            {c.active?'বন্ধ করুন':'চালু করুন'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Password Reset */}
          {tab==='reset' && (
            <div style={{ maxWidth:400 }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🔑 Password Reset</div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:20 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>Admin Email</label>
                  <input value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="email@example.com" style={inp}/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>নতুন Password</label>
                  <input type="text" value={resetPass} onChange={e=>setResetPass(e.target.value)} placeholder="NewPass@2026" style={inp}/>
                </div>
                <div style={{ background:'#2d1a00', border:`1px solid ${V.amber}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:V.amber, marginBottom:14 }}>
                  ⚠️ এই action audit log-এ রেকর্ড হবে।
                </div>
                <button onClick={resetPassword}
                  style={{ width:'100%', padding:'10px', background:V.red, border:'none', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                  🔑 Password Reset করুন
                </button>
              </div>
            </div>
          )}

          {/* Logs */}
          {tab==='logs' && (
            <div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>📋 Activity Logs</div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:16 }}>
                {logs.length ? logs.map(l=>(
                  <div key={l.id} style={{ display:'flex', gap:16, padding:'10px 0', borderBottom:`1px solid ${V.border}`, fontSize:13 }}>
                    <span style={{ color:V.muted, width:160, flexShrink:0, fontSize:12 }}>{new Date(l.created_at).toLocaleString('bn-BD')}</span>
                    <span style={{ color:V.amber, width:120, flexShrink:0, fontWeight:600 }}>{l.action}</span>
                    <span style={{ color:V.text }}>{l.details}</span>
                  </div>
                )) : <div style={{ color:V.muted, fontSize:13, textAlign:'center', padding:20 }}>কোনো log নেই</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevPanel() {
  const [dev, setDev] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('dev_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) setDev(payload);
        else sessionStorage.removeItem('dev_token');
      } catch { sessionStorage.removeItem('dev_token'); }
    }
  }, []);

  function logout() {
    sessionStorage.removeItem('dev_token');
    setDev(null);
  }

  if (!dev) return <DevLogin onLogin={setDev}/>;
  return <Panel dev={dev} onLogout={logout}/>;
}
