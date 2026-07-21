import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const API = 'https://api.hortnet-bd.com/api/dev';
const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const V = { bg:'#0d1117', card:'#161b22', border:'#30363d', text:'#e6edf3', muted:'#8b949e', green:'#3fb950', red:'#f85149', amber:'#d29922', blue:'#58a6ff' };

function devApi(path, opts={}) {
  const token = sessionStorage.getItem('dev_token');
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type':'application/json', 'x-dev-token': token||'', 'X-Tenant-ID': 'asambasti' },
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
        headers:{'Content-Type':'application/json', 'X-Tenant-ID':'asambasti'},
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
  const [integrityData, setIntegrityData] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  async function runIntegrityCheck() {
    setIntegrityLoading(true);
    try {
      const r = await devApi('/integrity-check');
      if (r.success) setIntegrityData(r);
    } catch (e) {} finally { setIntegrityLoading(false); }
  }

  function exportCentersToExcel() {
    const rows = centerAdmins.map((c, i) => ({
      'ক্র.নং': i + 1,
      'সেন্টার নাম': c.name_bn,
      'ক্যাটাগরি': c.category,
      'জেলা': c.district,
      'URL': `https://hortnet-bd.com/${c.slug}/login`,
      'Admin নাম': c.admin?.name || '',
      'Admin Email': c.admin?.email || '',
      'অবস্থা': c.active ? 'সক্রিয়' : 'বন্ধ',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:8},{wch:30},{wch:10},{wch:15},{wch:40},{wch:20},{wch:30},{wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Centers');
    XLSX.writeFile(wb, `HortNet-BD_Centers_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  const [resetEmail, setResetEmail] = useState('');
  const [centerAdmins, setCenterAdmins] = useState([]);
  const [caModal, setCaModal] = useState(null);
  const [migrationSql, setMigrationSql] = useState('');
  const [migrationTarget, setMigrationTarget] = useState('all');
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [deployInfo, setDeployInfo] = useState(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [healthResult, setHealthResult] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  async function checkDeployInfo() {
    setDeployLoading(true);
    try {
      const r = await devApi('/deploy-info');
      if (r.success) setDeployInfo(r);
    } catch (e) {} finally { setDeployLoading(false); }
  }

  async function checkRouteHealth() {
    setHealthLoading(true);
    try {
      const r = await devApi('/route-health');
      if (r.success) setHealthResult(r);
    } catch (e) {} finally { setHealthLoading(false); }
  }

  async function runMigration() {
    if (!migrationSql.trim()) return;
    if (!window.confirm(`এই SQL "${migrationTarget}" এর সব DB-তে চালাতে চান? এটা ফেরানো যাবে না।`)) return;
    setMigrationRunning(true); setMigrationResult(null);
    try {
      const r = await devApi('/run-migration', { method: 'POST', body: JSON.stringify({ sql: migrationSql, target: migrationTarget }) });
      setMigrationResult(r);
    } catch (e) {
      setMigrationResult({ success: false, message: 'সমস্যা হয়েছে' });
    } finally { setMigrationRunning(false); }
  }
  const [slugModal, setSlugModal] = useState(null);
  const [newSlugValue, setNewSlugValue] = useState('');
  const [slugMsg, setSlugMsg] = useState('');
  const [slugSaving, setSlugSaving] = useState(false);

  async function saveSlugChange() {
    if (!slugModal || !newSlugValue.trim()) return;
    if (!window.confirm(`"${slugModal.slug}" থেকে "${newSlugValue.trim().toLowerCase()}"-এ পরিবর্তন করবেন? এতে center-এর Login URL বদলে যাবে, পুরনো URL কাজ করবে না।`)) return;
    setSlugSaving(true); setSlugMsg('');
    try {
      const r = await devApi('/change-slug', { method: 'POST', body: JSON.stringify({ oldSlug: slugModal.slug, newSlug: newSlugValue }) });
      if (r.success) {
        setSlugMsg(r.message);
        setTimeout(() => { setSlugModal(null); loadAll(); }, 2000);
      } else {
        setSlugMsg(r.message || 'সমস্যা হয়েছে');
      }
    } catch (e) {
      setSlugMsg('সমস্যা হয়েছে');
    } finally { setSlugSaving(false); }
  }
  const [caForm, setCaForm] = useState({name:'',email:'',password:''});
  const [caMsg, setCaMsg] = useState('');
  const [showPass, setShowPass] = useState({});
  const [catFilter, setCatFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, a, c, ca] = await Promise.all([
        devApi('/stats'), devApi('/super-admins'), devApi('/tenants'), devApi('/center-admins')
      ]);
      if (s.success) { setStats(s.data); setLogs(s.data.recent_logs||[]); }
      if (a.success) setAdmins(a.data);
      if (c.success) setCenters(c.data);
      if (ca.success) setCenterAdmins(ca.data);
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

  async function updateCenterAdmin() {
    if (!caForm.email) { setCaMsg('Email দিন।'); return; }
    const r = await devApi(`/center-admins/${caModal.slug}`, { method:'PUT', body: JSON.stringify(caForm) });
    setCaMsg(r.message || r.error || '');
    if (r.success) { setCaModal(null); loadAll(); }
  }

  async function toggleCenter(id) {
    const r = await devApi(`/toggle-center/${id}`, { method:'POST' });
    if (r.success) { setMsg(r.message); loadAll(); }
  }

  const inp = { padding:'9px 12px', background:'#0d1117', border:`1px solid ${V.border}`, borderRadius:8, color:V.text, fontSize:13, fontFamily:FONT, outline:'none', width:'100%', boxSizing:'border-box' };
  const TABS = [['dashboard','📊 Dashboard'],['admins','👤 Super Admins'],['centers','🏛️ Centers'],['reset','🔑 Password Reset'],['integrity','🔧 Data Integrity Check'],['migration','🗄️ Migration Runner'],['deploy','🌐 Deploy Verifier'],['health','🔍 Route Health Checker'],['logs','📋 Logs']];

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
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>🏛️ Center তালিকা</div>
                <button onClick={exportCentersToExcel}
                  style={{ padding:'8px 16px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                  📥 Excel Export
                </button>
              </div>

              {/* Filter bar */}
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                <input value={nameSearch} onChange={e=>setNameSearch(e.target.value)} placeholder="Center নাম খুঁজুন..."
                  style={{ ...inp, flex:1, minWidth:160 }}/>
                {['','A','B','C'].map(cat=>(
                  <button key={cat} onClick={()=>setCatFilter(cat)}
                    style={{ padding:'7px 14px', borderRadius:7, border:`1px solid ${V.border}`, background:catFilter===cat?V.green:V.card, color:catFilter===cat?'#fff':V.muted, cursor:'pointer', fontSize:12, fontFamily:FONT }}>
                    {cat||'সব'}
                  </button>
                ))}
              </div>

              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                    <thead>
                      <tr>{['Center','Category','জেলা','ফোন','প্রধানের নাম','Email','Password','অবস্থা','Action'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, borderBottom:`1px solid ${V.border}`, background:'#0d1117', whiteSpace:'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {centerAdmins
                        .filter(c=>(!catFilter||c.category===catFilter)&&(!nameSearch||c.name_bn.toLowerCase().includes(nameSearch.toLowerCase())))
                        .map(c=>(
                        <tr key={c.slug}>
                          <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, borderBottom:`1px solid ${V.border}`, whiteSpace:'nowrap' }}>{c.name_bn}</td>
                          <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                            <span style={{ background:'#1f2d3f', color:V.blue, padding:'2px 8px', borderRadius:6, fontSize:12 }}>{c.category}</span>
                          </td>
                          <td style={{ padding:'12px 14px', fontSize:12, color:V.muted, borderBottom:`1px solid ${V.border}` }}>{c.district}</td>
                          <td style={{ padding:'12px 14px', fontSize:12, color:V.muted, borderBottom:`1px solid ${V.border}` }}>{c.mobile||'—'}</td>
                          <td style={{ padding:'12px 14px', fontSize:13, borderBottom:`1px solid ${V.border}` }}>{c.admin?.name||'—'}</td>
                          <td style={{ padding:'12px 14px', fontSize:12, color:V.blue, borderBottom:`1px solid ${V.border}` }}>{c.admin?.email||'—'}</td>
                          <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                            {c.admin ? (
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:12, color:V.muted, letterSpacing:2 }}>{showPass[c.slug]?'[hashed]':'••••••••'}</span>
                                <button onClick={()=>setShowPass(p=>({...p,[c.slug]:!p[c.slug]}))}
                                  style={{ background:'none', border:'none', color:V.muted, cursor:'pointer', fontSize:11, fontFamily:FONT }}>
                                  {showPass[c.slug]?'🙈':'👁️'}
                                </button>
                              </div>
                            ) : <span style={{ color:V.red, fontSize:12 }}>নেই</span>}
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                            <span style={{ color:c.active?V.green:V.red, fontSize:12 }}>{c.active?'✅':'❌'}</span>
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:`1px solid ${V.border}` }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={()=>{ setCaModal(c); setCaForm({name:c.admin?.name||'',email:c.admin?.email||'',password:''}); setCaMsg(''); }}
                                style={{ background:'#1f2d3f', border:`1px solid ${V.blue}`, color:V.blue, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:FONT, whiteSpace:'nowrap' }}>
                                ✏️ এডিট
                              </button>
                              <button onClick={()=>{ setSlugModal(c); setNewSlugValue(c.slug); setSlugMsg(''); }}
                                style={{ background:'#3f2a14', border:`1px solid ${V.amber}`, color:V.amber, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:FONT, whiteSpace:'nowrap' }}>
                                🔗 Slug
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slug পরিবর্তন Modal */}
              {slugModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
                  <div style={{ background:V.card, borderRadius:14, padding:24, width:400 }}>
                    <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>🔗 Slug পরিবর্তন</div>
                    <div style={{ fontSize:13, color:V.muted, marginBottom:16 }}>{slugModal.name_bn}</div>
                    <div style={{ background:'#3f2a14', border:`1px solid ${V.amber}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:V.amber, marginBottom:14 }}>
                      ⚠️ এটা বদলালে center-এর Login URL পাল্টে যাবে। পুরনো URL আর কাজ করবে না। Center-কে নতুন URL জানিয়ে দিতে হবে।
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>বর্তমান Slug</label>
                      <input value={slugModal.slug} disabled style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:14, color:V.muted, background:'#0d1117', boxSizing:'border-box' }}/>
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>নতুন Slug (শুধু ইংরেজি ছোট হাতের অক্ষর, সংখ্যা, - _ )</label>
                      <input value={newSlugValue} onChange={e=>setNewSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))}
                        style={{ width:'100%', padding:'10px 14px', border:`1px solid ${V.border}`, borderRadius:8, fontFamily:FONT, fontSize:14, color:V.text, background:V.bg, boxSizing:'border-box' }}/>
                    </div>
                    {slugMsg && <div style={{ color: slugMsg.includes('হয়েছে ✅')?V.green:V.red, fontSize:13, marginBottom:12 }}>{slugMsg}</div>}
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                      <button onClick={()=>setSlugModal(null)} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${V.border}`, background:V.bg, cursor:'pointer', fontSize:13, fontFamily:FONT }}>বাতিল</button>
                      <button onClick={saveSlugChange} disabled={slugSaving} style={{ padding:'8px 16px', borderRadius:8, background:V.amber, color:'#000', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                        {slugSaving ? 'সংরক্ষণ হচ্ছে...' : '✓ পরিবর্তন করুন'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {caModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
                  <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:14, padding:28, width:380, maxWidth:'90vw' }}>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:20, color:V.text }}>✏️ {caModal.name_bn} — Admin Update</div>
                    {[['name','প্রধানের নাম','text','নাম'],['email','Email','email','email@dae.gov.bd'],['password','নতুন Password (খালি = change নেই)','password','••••••••']].map(([f,l,t,ph])=>(
                      <div key={f} style={{ marginBottom:14 }}>
                        <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>{l}</label>
                        <input type={t} value={caForm[f]} onChange={e=>setCaForm({...caForm,[f]:e.target.value})} placeholder={ph} style={inp}/>
                      </div>
                    ))}
                    {caMsg && <div style={{ fontSize:12, color:caMsg.includes('হয়েছে')?V.green:V.red, marginBottom:12 }}>{caMsg}</div>}
                    <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                      <button onClick={()=>setCaModal(null)} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${V.border}`, background:V.card, color:V.muted, cursor:'pointer', fontSize:13, fontFamily:FONT }}>বাতিল</button>
                      <button onClick={updateCenterAdmin} style={{ padding:'9px 18px', borderRadius:8, background:V.green, color:'#000', border:'none', cursor:'pointer', fontSize:13, fontFamily:FONT, fontWeight:700 }}>💾 Save</button>
                    </div>
                  </div>
                </div>
              )}
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

          {/* Deploy Verifier */}
          {tab==='deploy' && (
            <div style={{ maxWidth:700 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>🌐 Deploy Verifier</div>
                <button onClick={checkDeployInfo} disabled={deployLoading}
                  style={{ padding:'9px 18px', background:V.green, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>
                  {deployLoading ? 'চেক হচ্ছে...' : '▶ চেক চালান'}
                </button>
              </div>
              <div style={{ background:'#1f2d3f', border:`1px solid ${V.blue}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:V.blue, marginBottom:14 }}>
                ℹ️ VPS-এ deploy করা code এবং GitHub main branch-এর latest commit মিলছে কিনা check করে — 
                "deploy করেছি বলে মনে হচ্ছে কিন্তু কাজ করছে না" এই সমস্যা তাৎক্ষণিক ধরার জন্য।
              </div>

              {deployInfo && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{
                    background: deployInfo.in_sync ? '#0d2818' : '#3f1414',
                    border: `1px solid ${deployInfo.in_sync ? '#16a34a44' : '#dc262644'}`,
                    borderRadius:10, padding:20, textAlign:'center',
                    color: deployInfo.in_sync ? V.green : V.red, fontSize:15, fontWeight:700,
                  }}>
                    {deployInfo.in_sync ? '✅ VPS ও GitHub সিঙ্কে আছে — সর্বশেষ deploy সঠিকভাবে হয়েছে' : '⚠️ VPS ও GitHub সিঙ্কে নেই — deploy অসম্পূর্ণ হতে পারে'}
                  </div>
                  <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>VPS-এ থাকা কোড</div>
                    <div style={{ fontSize:12, color:V.muted, marginBottom:4 }}>Commit: <span style={{ fontFamily:'monospace', color:V.text }}>{deployInfo.local?.commit?.slice(0,10)}</span></div>
                    <div style={{ fontSize:12, color:V.muted, marginBottom:4 }}>Branch: {deployInfo.local?.branch}</div>
                    <div style={{ fontSize:12, color:V.muted }}>সময়: {deployInfo.local?.date}</div>
                  </div>
                  <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>GitHub main-এর সর্বশেষ কমিট</div>
                    <div style={{ fontSize:12, color:V.muted, marginBottom:4 }}>Commit: <span style={{ fontFamily:'monospace', color:V.text }}>{deployInfo.remote?.commit?.slice(0,10)}</span></div>
                    <div style={{ fontSize:12, color:V.muted }}>{deployInfo.remote?.message?.split('\n')[0]}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route Health Checker */}
          {tab==='health' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>🔍 Route Health Checker</div>
                <button onClick={checkRouteHealth} disabled={healthLoading}
                  style={{ padding:'9px 18px', background:V.green, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>
                  {healthLoading ? 'চেক হচ্ছে...' : '▶ চেক চালান'}
                </button>
              </div>
              <div style={{ background:'#1f2d3f', border:`1px solid ${V.blue}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:V.blue, marginBottom:14 }}>
                ℹ️ গুরুত্বপূর্ণ API route-গুলো সরাসরি call করে দেখে কোনগুলো error দিচ্ছে (500 error, timeout ইত্যাদি)।
              </div>

              {healthResult && (
                <>
                  <div style={{ marginBottom:14, fontSize:14 }}>
                    ফলাফল: <b style={{ color: healthResult.fail_count === 0 ? V.green : V.red }}>{healthResult.total - healthResult.fail_count}</b> / {healthResult.total} ঠিক আছে
                  </div>
                  <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden' }}>
                    {healthResult.results.map((r, i) => (
                      <div key={i} style={{ padding:'10px 14px', borderBottom:`1px solid ${V.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                        <span style={{ fontFamily:'monospace', fontSize:12 }}>{r.path}</span>
                        <span style={{ display:'flex', gap:10, alignItems:'center' }}>
                          <span style={{ fontSize:11, color:V.muted }}>{r.ms}ms</span>
                          <span style={{ color: r.ok ? V.green : V.red, fontWeight:600 }}>
                            {r.ok ? `✅ ${r.status}` : `❌ ${r.status || 'ERR'}${r.error ? ' — ' + r.error : ''}`}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Migration Runner */}
          {tab==='migration' && (
            <div style={{ maxWidth:700 }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>🗄️ Bulk Migration Runner</div>
              <div style={{ background:'#2d1a00', border:`1px solid ${V.amber}`, borderRadius:8, padding:'10px 12px', fontSize:12, color:V.amber, marginBottom:14 }}>
                ⚠️ শুধু CREATE TABLE / ALTER TABLE অনুমতি আছে (নিরাপত্তার জন্য)। এই action audit log-এ রেকর্ড হবে।
              </div>
              <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:20 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>কোথায় চালাবেন?</label>
                  <select value={migrationTarget} onChange={e=>setMigrationTarget(e.target.value)} style={inp}>
                    <option value="all">সব সেন্টার (Tenant DB)</option>
                    <option value="master">শুধু Master DB</option>
                    {centers.map(t=><option key={t.slug} value={t.slug}>শুধু {t.name_bn}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, color:V.muted, marginBottom:6 }}>SQL Statement</label>
                  <textarea value={migrationSql} onChange={e=>setMigrationSql(e.target.value)} rows={6}
                    placeholder={'CREATE TABLE IF NOT EXISTS ...\nALTER TABLE ... ADD COLUMN IF NOT EXISTS ...'}
                    style={{ ...inp, fontFamily:'monospace', fontSize:13, resize:'vertical' }}/>
                </div>
                <button onClick={runMigration} disabled={migrationRunning}
                  style={{ width:'100%', padding:'10px', background:V.red, border:'none', borderRadius:8, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                  {migrationRunning ? 'চালানো হচ্ছে...' : '▶ চালান'}
                </button>
              </div>

              {migrationResult && (
                <div style={{ marginTop:16 }}>
                  {migrationResult.success ? (
                    <>
                      <div style={{ fontSize:14, color:V.text, marginBottom:10 }}>
                        ফলাফল: <b style={{color:V.green}}>{migrationResult.success_count}</b> / {migrationResult.total} সফল
                      </div>
                      <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden', maxHeight:300, overflowY:'auto' }}>
                        {migrationResult.results.map((r,i)=>(
                          <div key={i} style={{ padding:'8px 14px', borderBottom:`1px solid ${V.border}`, display:'flex', justifyContent:'space-between', fontSize:13 }}>
                            <span>{r.target}</span>
                            <span style={{ color: r.success ? V.green : V.red }}>{r.success ? '✅ সফল' : `❌ ${r.error}`}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color:V.red, fontSize:13 }}>{migrationResult.message}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Data Integrity Check */}
          {tab==='integrity' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>🔧 Data Integrity Check</div>
                <button onClick={runIntegrityCheck} disabled={integrityLoading}
                  style={{ padding:'9px 18px', background:V.green, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>
                  {integrityLoading ? 'চেক হচ্ছে...' : '▶ চেক চালান'}
                </button>
              </div>

              {!integrityData && !integrityLoading && (
                <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:40, textAlign:'center', color:V.muted }}>
                  সব center-এ trailing space, missing table/column আছে কিনা check করতে "চেক চালান" বাটনে ক্লিক করুন
                </div>
              )}

              {integrityLoading && (
                <div style={{ textAlign:'center', padding:40, color:V.muted }}>
                  <div style={{ width:32, height:32, border:`3px solid ${V.border}`, borderTopColor:V.green, borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }}/>
                  ২৮ টা center check হচ্ছে, একটু সময় লাগবে...
                </div>
              )}

              {integrityData && !integrityLoading && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
                    <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:16, borderTop:`3px solid ${integrityData.total_issues > 0 ? V.red : V.green}` }}>
                      <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>মোট সমস্যা পাওয়া গেছে</div>
                      <div style={{ fontSize:26, fontWeight:700, color: integrityData.total_issues > 0 ? V.red : V.green }}>{integrityData.total_issues}</div>
                    </div>
                    <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, padding:16, borderTop:`3px solid ${V.blue}` }}>
                      <div style={{ fontSize:13, color:V.muted, marginBottom:6 }}>Check হয়েছে</div>
                      <div style={{ fontSize:26, fontWeight:700, color:V.blue }}>{integrityData.checked_centers} টা center</div>
                    </div>
                  </div>

                  {integrityData.total_issues === 0 ? (
                    <div style={{ background:'#0d2818', border:'1px solid #16a34a44', borderRadius:10, padding:30, textAlign:'center', color:V.green, fontSize:15 }}>
                      ✅ কোনো সমস্যা পাওয়া যায়নি — সব center-এর data সম্পূর্ণ সঠিক!
                    </div>
                  ) : (
                    <div style={{ background:V.card, border:`1px solid ${V.border}`, borderRadius:10, overflow:'hidden' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr>
                            {['সেন্টার','ধরন','গুরুত্ব','বিবরণ'].map(h=>(
                              <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:V.muted, fontWeight:600, background:V.bg, borderBottom:`1px solid ${V.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {integrityData.issues.map((issue, i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${V.border}` }}>
                              <td style={{ padding:'10px 14px', fontSize:13 }}>{issue.slug}</td>
                              <td style={{ padding:'10px 14px', fontSize:12, color:V.muted }}>{issue.type}</td>
                              <td style={{ padding:'10px 14px' }}>
                                <span style={{
                                  fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
                                  background: issue.severity === 'critical' ? '#3f1414' : issue.severity === 'high' ? '#3f2a14' : '#1f2d3f',
                                  color: issue.severity === 'critical' ? '#f87171' : issue.severity === 'high' ? V.amber : V.blue,
                                }}>
                                  {issue.severity}
                                </span>
                              </td>
                              <td style={{ padding:'10px 14px', fontSize:13, color:V.text }}>{issue.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
