import { useEffect, useState } from 'react';
import saApi from './saApi';
import { useSa } from './SaAuth';
import { confirm } from '../lib/confirm';
import { toBn } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = { bg:'#f8f6f0',card:'#fff',border:'#e2ddd5',text:'#1a1a18',muted:'#888780',green:'#16a34a',green3:'#f0fdf4',green4:'#dcfce7',red:'#dc2626',red3:'#fef2f2',accent:'#3b6d11' };
const ROLE_LABELS = { director:'পরিচালক', deputy_director:'উপপরিচালক', horticulturist:'উদ্যানতত্ত্ববিদ', nursery_supervisor:'নার্সারী তত্ত্বাবধায়ক' };
const ROLE_COLORS = { director:'#7c3aed', deputy_director:'#059669', horticulturist:'#0284c7', nursery_supervisor:'#d97706' };
const shadow = '0 1px 3px rgba(0,0,0,0.08)';

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(26,46,26,0.45)' }}>
      <div style={{ background:C.card,borderRadius:16,padding:28,width:'100%',maxWidth:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <div style={{ fontSize:17,fontWeight:700,color:C.text }}>{title}</div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom:14 }}><label style={{ display:'block',fontSize:13,color:C.muted,marginBottom:6,fontWeight:500 }}>{label}</label>{children}</div>;
}
function Input({ ...props }) {
  return <input {...props} style={{ width:'100%',padding:'10px 14px',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',fontFamily:FONT,boxSizing:'border-box',...(props.style||{}) }} />;
}
function Select({ children, ...props }) {
  return <select {...props} style={{ width:'100%',padding:'10px 14px',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',fontFamily:FONT,boxSizing:'border-box' }}>{children}</select>;
}

export default function SaAdmins() {
  const { sa } = useSa();
  const [admins, setAdmins] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sa'); // sa | center
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'assign'
  const [editId, setEditId] = useState(null);
  const [assignId, setAssignId] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'deputy_director', district:'', division:'', phone:'', is_active:'true' });
  const [assigned, setAssigned] = useState([]);
  const [msg, setMsg] = useState('');
  const [centerUsers, setCenterUsers] = useState([]);
  const [cuModal, setCuModal] = useState(false);
  const [cuEdit, setCuEdit] = useState(null);
  const [cuForm, setCuForm] = useState({ center_slug:'', name:'', email:'', password:'', role:'admin' });
  const [cuMsg, setCuMsg] = useState('');
  const [cuSaving, setCuSaving] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [ar, cr, cur] = await Promise.all([saApi.get('/admins'), saApi.get('/tenants'), saApi.get('/center-users')]);
      if (ar.data?.success) setAdmins(ar.data.data || []);
      if (cr.data?.success) setCenters(cr.data.data || []);
      if (cur.data?.success) setCenterUsers(cur.data.data || []);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ name:'', email:'', password:'', role:'deputy_director', district:'', division:'', phone:'', is_active:'true' }); setEditId(null); setMsg(''); setModal('add'); }
  function openEdit(a) { setForm({ name: a.name, email: a.email, password:'', role: a.role, district: a.district||'', division: a.division||'', phone: a.phone||'', is_active: String(a.is_active) }); setEditId(a.id); setMsg(''); setModal('edit'); }
  function openAssign(a) { setAssignId(a.id); setAssigned(a.assigned_centers||[]); setModal('assign'); }

  async function save() {
    if (!form.name || !form.email || !form.role) { setMsg('সেন্টারের নাম, ইমেইল ও পদবী দিন।'); return; }
    if (!editId && !form.password) { setMsg('নতুন admin-এর জন্য পাসওয়ার্ড দিন।'); return; }
    setSaving(true); setMsg('');
    try {
      const body = { name: form.name, email: form.email, role: form.role, district: form.district, division: form.division, phone: form.phone, is_active: form.is_active === 'true' };
      if (form.password) body.password = form.password;
      const r = editId ? await saApi.put(`/admins/${editId}`, body) : await saApi.post('/admins', body);
      if (r.data?.success) { setModal(null); load(); } else setMsg(r.data?.message || 'সমস্যা');
    } catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); } finally { setSaving(false); }
  }

  async function doDelete(a) {
    if (!(await confirm({ title: `"${a.name}" মুছে ফেলবেন?`, message: 'এটি স্থায়ীভাবে মুছে যাবে।', confirmLabel: 'মুছুন' }))) return;
    try { const r = await saApi.delete(`/admins/${a.id}`); if (r.data?.success) load(); } catch {}
  }

  async function saveAssign() {
    setSaving(true);
    try {
      const r = await saApi.put(`/admins/${assignId}/assignments`, { assigned_centers: assigned });
      if (r.data?.success) { setModal(null); load(); } else setMsg(r.data?.message||'সমস্যা');
    } catch (e) { setMsg(e?.response?.data?.message||'সমস্যা'); } finally { setSaving(false); }
  }

  function openCuAdd() { setCuForm({ center_slug:'', name:'', email:'', password:'', role:'admin' }); setCuEdit(null); setCuMsg(''); setCuModal(true); }
  function openCuEdit(u) { setCuForm({ center_slug:u.center_slug, name:u.name, email:u.email, password:'', role:u.role }); setCuEdit(u); setCuMsg(''); setCuModal(true); }

  async function saveCu() {
    if (!cuForm.center_slug||!cuForm.name||!cuForm.email||!cuForm.role) { setCuMsg('সব তথ্য দিন।'); return; }
    if (!cuEdit && !cuForm.password) { setCuMsg('Password দিন।'); return; }
    setCuSaving(true); setCuMsg('');
    try {
      let r;
      if (cuEdit) {
        r = await saApi.put(`/center-users/${cuEdit.center_slug}/${cuEdit.id}`, cuForm);
      } else {
        r = await saApi.post('/center-users', cuForm);
      }
      if (r.data?.success) { setCuModal(false); load(); } else setCuMsg(r.data?.message||'সমস্যা');
    } catch (e) { setCuMsg(e?.response?.data?.message||'সমস্যা'); } finally { setCuSaving(false); }
  }

  async function toggleCu(u) {
    try {
      const r = await saApi.post(`/center-users/${u.center_slug}/${u.id}/toggle`);
      if (r.data?.success) load();
    } catch {}
  }

  async function resetPassword() {
    if (!newPass) return;
    try {
      const r = await saApi.post(`/center-users/${resetModal.center_slug}/${resetModal.id}/reset-password`, { new_password: newPass });
      if (r.data?.success) { setResetModal(null); setNewPass(''); }
    } catch {}
  }

  if (loading) return <div style={{ padding:'40px 0',textAlign:'center',color:C.muted,fontFamily:FONT }}>লোড হচ্ছে…</div>;

  return (
    <div style={{ fontFamily:FONT }}>
      {/* Tab navigation */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['sa','👥 Super Admin Users'],['center','🏛️ Center App Users']].map(([t,l])=>(
          <button key={t} onClick={()=>setActiveTab(t)}
            style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, cursor:'pointer', fontSize:14, fontFamily:FONT,
              background:activeTab===t?C.accent:C.card, color:activeTab===t?'#fff':C.muted, fontWeight:activeTab===t?600:400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Super Admin Users Tab */}
      {activeTab==='sa' && <>
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:16 }}>
        <button onClick={openAdd} style={{ padding:'9px 18px',background:C.accent,color:'#fff',border:`1px solid ${C.accent}`,borderRadius:8,cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>
          + নতুন Admin তৈরি
        </button>
      </div>

      {admins.length === 0 ? (
        <div style={{ textAlign:'center',padding:'60px 0',color:C.muted,fontSize:15 }}>
          <div style={{ fontSize:40,marginBottom:12 }}>👥</div>কোনো Admin নেই।
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {admins.map((a) => {
            const rc = ROLE_COLORS[a.role] || '#7c3aed';
            return (
              <div key={a.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,borderLeft:`4px solid ${rc}`,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:shadow }}>
                <div style={{ width:44,height:44,borderRadius:10,background:`${rc}22`,border:`1px solid ${rc}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:rc,flexShrink:0 }}>{(a.name||'A')[0].toUpperCase()}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:15,fontWeight:600,color:C.text }}>{ROLE_LABELS[a.role]||a.role}{a.name?', '+a.name:''}</div>
                  <div style={{ fontSize:13,color:C.muted,marginTop:2 }}>{a.email}</div>
                  <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{[a.district,a.division].filter(Boolean).join(', ')}</div>
                  {(a.assigned_centers||[]).length > 0 && (
                    <div style={{ marginTop:6,display:'flex',gap:4,flexWrap:'wrap' }}>
                      {a.assigned_centers.map(s=>(
                        <span key={s} style={{ background:'#f0fdf4',border:`1px solid ${C.green4}`,padding:'2px 8px',borderRadius:6,fontSize:10,color:C.green }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                  <span style={{ fontSize:12,padding:'3px 10px',borderRadius:20,fontWeight:500,background:a.is_active?C.green3:C.red3,color:a.is_active?'#15803d':C.red,border:`1px solid ${a.is_active?C.green4:'#fecaca'}` }}>{a.is_active?'সক্রিয়':'বন্ধ'}</span>
                  <button onClick={()=>openEdit(a)} style={{ padding:'7px 12px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,background:C.bg,border:`1px solid ${C.border}`,color:C.muted }}>সম্পাদনা</button>
                  <button onClick={()=>openAssign(a)} style={{ padding:'7px 12px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,background:C.bg,border:`1px solid ${C.border}`,color:C.accent,fontWeight:600 }}>Center Assign</button>
                  {a.role !== 'director' && <button onClick={()=>doDelete(a)} style={{ padding:'7px 12px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:FONT,background:C.bg,border:`1px solid ${C.border}`,color:C.red }}>🗑</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal==='add'||modal==='edit'} title={editId?'Admin সম্পাদনা':'নতুন Admin তৈরি'} onClose={()=>setModal(null)}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <Field label="সেন্টারের নাম*"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="হর্টিকালচার সেন্টার, পাঁচগাছিয়া"/></Field>
          <Field label="পদবী*"><Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="deputy_director">উপপরিচালক</option><option value="horticulturist">উদ্যানতত্ত্ববিদ</option><option value="nursery_supervisor">নার্সারী তত্ত্বাবধায়ক</option></Select></Field>
        </div>
        <Field label="ইমেইল*"><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="dd.feni@horticulture.bd"/></Field>
        <Field label={`পাসওয়ার্ড${editId?' (খালি রাখলে পরিবর্তন হবে না)':'*'}`}><Input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••"/></Field>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <Field label="জেলা"><Input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} placeholder="ফেনী"/></Field>
          <Field label="বিভাগ"><Input value={form.division} onChange={e=>setForm({...form,division:e.target.value})} placeholder="চট্টগ্রাম"/></Field>
        </div>
        <Field label="ফোন"><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="01700000000"/></Field>
        {editId && <Field label="অবস্থা"><Select value={form.is_active} onChange={e=>setForm({...form,is_active:e.target.value})}><option value="true">সক্রিয়</option><option value="false">বন্ধ</option></Select></Field>}
        {msg && <div style={{ color:C.red,fontSize:13,marginBottom:8 }}>{msg}</div>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:8 }}>
          <button onClick={()=>setModal(null)} style={{ padding:'10px 20px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontSize:14,fontFamily:FONT }}>বাতিল</button>
          <button onClick={save} disabled={saving} style={{ padding:'10px 20px',borderRadius:8,background:C.accent,color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal open={modal==='assign'} title="Center Assign করুন" onClose={()=>setModal(null)}>
        <p style={{ fontSize:13,color:C.muted,marginBottom:14 }}>যে center গুলো এই admin দেখবেন সেগুলো select করুন</p>
        <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto' }}>
          {centers.map(c=>(
            <label key={c.slug} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.bg,borderRadius:8,cursor:'pointer',border:`1px solid ${assigned.includes(c.slug)?'#3b6d11':C.border}` }}>
              <input type="checkbox" checked={assigned.includes(c.slug)} onChange={e=>setAssigned(e.target.checked?[...assigned,c.slug]:assigned.filter(s=>s!==c.slug))} style={{ width:16,height:16,accentColor:C.accent }}/>
              <div><div style={{ fontSize:14,fontWeight:600,color:C.text }}>{c.name_bn}</div><div style={{ fontSize:12,color:C.muted }}>{c.slug} • {c.category} Category • {c.district||''}</div></div>
            </label>
          ))}
        </div>
        {msg && <div style={{ color:C.red,fontSize:13,margin:'8px 0' }}>{msg}</div>}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:14 }}>
          <button onClick={()=>setModal(null)} style={{ padding:'10px 20px',borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,cursor:'pointer',fontSize:14,fontFamily:FONT }}>বাতিল</button>
          <button onClick={saveAssign} disabled={saving} style={{ padding:'10px 20px',borderRadius:8,background:C.accent,color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontFamily:FONT,fontWeight:600 }}>{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
        </div>
      </Modal>
      </> }

      {/* Center App Users Tab */}
      {activeTab==='center' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <button onClick={openCuAdd}
              style={{ padding:'9px 18px', background:C.accent, color:'#fff', border:`1px solid ${C.accent}`, borderRadius:8, cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>
              + নতুন Center User তৈরি
            </button>
          </div>

          {centerUsers.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>কোনো Center User নেই।</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {centerUsers.map(u=>(
                <div key={`${u.center_slug}-${u.id}`} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px', display:'flex', alignItems:'center', gap:12, boxShadow:C.shadow }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:C.accent+'22', border:`1px solid ${C.accent}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:C.accent, flexShrink:0 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{u.name}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{u.email}</div>
                    <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, background:C.accent+'22', color:C.accent, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>{u.role}</span>
                      <span style={{ fontSize:11, background:'#1e293b', color:'#94a3b8', padding:'2px 8px', borderRadius:6 }}>{u.center_name}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:u.is_active?'#e8f5ed':'#fee2e2', color:u.is_active?'#1a6b3a':'#dc2626', fontWeight:600 }}>
                        {u.is_active?'সক্রিয়':'বন্ধ'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={()=>openCuEdit(u)}
                      style={{ padding:'7px 12px', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:FONT, background:C.bg, border:`1px solid ${C.border}`, color:C.text }}>
                      এডিট
                    </button>
                    <button onClick={()=>{ setResetModal(u); setNewPass(''); }}
                      style={{ padding:'7px 12px', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:FONT, background:'#fffbeb', border:'1px solid #fbbf24', color:'#d97706' }}>
                      Password Reset
                    </button>
                    <button onClick={()=>toggleCu(u)}
                      style={{ padding:'7px 12px', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:FONT, background:u.is_active?'#fee2e2':'#e8f5ed', border:`1px solid ${u.is_active?'#fca5a5':'#86efac'}`, color:u.is_active?'#dc2626':'#1a6b3a' }}>
                      {u.is_active?'বন্ধ করুন':'চালু করুন'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Center User Modal */}
          <Modal open={cuModal} title={cuEdit?'Center User এডিট':'নতুন Center User তৈরি'} onClose={()=>setCuModal(false)}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>Center*</label>
                <select value={cuForm.center_slug} onChange={e=>setCuForm({...cuForm,center_slug:e.target.value})} disabled={!!cuEdit}
                  style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, background:C.bg, outline:'none' }}>
                  <option value="">Center বেছে নিন</option>
                  {centers.map(c=><option key={c.slug} value={c.slug}>{c.name_bn}</option>)}
                </select>
              </div>
              {[['name','নাম*','text','অফিসারের নাম'],['email','Email*','email','officer@dae.gov.bd'],['password',cuEdit?'নতুন Password (খালি রাখলে পরিবর্তন হবে না)':'Password*','password','••••••••']].map(([f,l,t,ph])=>(
                <div key={f}>
                  <label style={{ display:'block', fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>{l}</label>
                  <input type={t} value={cuForm[f]} onChange={e=>setCuForm({...cuForm,[f]:e.target.value})} placeholder={ph}
                    style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, background:C.bg, outline:'none', boxSizing:'border-box' }}/>
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>Role*</label>
                <select value={cuForm.role} onChange={e=>setCuForm({...cuForm,role:e.target.value})}
                  style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, background:C.bg, outline:'none' }}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="production_officer">Production Officer</option>
                  <option value="sales_operator">Sales Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              {cuMsg && <div style={{ color:C.red, fontSize:13 }}>{cuMsg}</div>}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
                <button onClick={()=>setCuModal(false)} style={{ padding:'10px 20px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer', fontSize:14, fontFamily:FONT }}>বাতিল</button>
                <button onClick={saveCu} disabled={cuSaving} style={{ padding:'10px 20px', borderRadius:8, background:C.accent, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>
                  {cuSaving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}
                </button>
              </div>
            </div>
          </Modal>

          {/* Password Reset Modal */}
          <Modal open={!!resetModal} title="Password Reset" onClose={()=>setResetModal(null)}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <p style={{ fontSize:13, color:C.muted }}>
                <strong>{resetModal?.name}</strong> ({resetModal?.center_name})-এর নতুন password:
              </p>
              <input type="text" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="নতুন password"
                style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, background:C.bg, outline:'none', boxSizing:'border-box' }}/>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button onClick={()=>setResetModal(null)} style={{ padding:'10px 20px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer', fontSize:14, fontFamily:FONT }}>বাতিল</button>
                <button onClick={resetPassword} style={{ padding:'10px 20px', borderRadius:8, background:'#d97706', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontFamily:FONT, fontWeight:600 }}>Reset</button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
