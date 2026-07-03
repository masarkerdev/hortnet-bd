import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import Modal from '../components/Modal';
import { IcPlus, IcEdit, IcTrash, IcCheck, IcX, IcLock, IcUnlock, IcEye } from '../components/icons';

const RN = { admin:'Admin', manager:'Manager', production_officer:'Prod.Officer', sales_operator:'Sales Operator', viewer:'Viewer' };
const ROLE_OPTS = [
  ['production_officer','Production Officer'], ['sales_operator','Sales Operator'],
  ['viewer','Viewer'], ['manager','Manager'], ['admin','Admin'],
];
// অনুমতি ম্যাট্রিক্স: [তৈরি, সম্পাদনা, মুছুন, দেখুন, এক্সপোর্ট]
const MATRIX = [
  ['Admin',             [1,1,1,1,1]],
  ['Manager',           [1,1,0,1,1]],
  ['Production Officer', [1,1,0,1,0]],
  ['Sales Operator',    [1,0,0,1,1]],
  ['Viewer',            [0,0,0,1,0]],
];
const EMPTY = { id:'', name:'', email:'', role:'viewer', password:'' };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwdOpen, setPwdOpen] = useState(false);

  function load() {
    setLoading(true); setDenied(false);
    api.get('/users').then((r)=>setRows(r.data?.data||[]))
      .catch((e)=>{ if (e?.response?.status === 403) setDenied(true); })
      .finally(()=>setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openNew() { setForm(EMPTY); setShowPw(false); setMsg(''); setOpen(true); }
  function openEdit(u) { setForm({ id:u.id, name:u.name||'', email:u.email||'', role:u.role||'viewer', password:'' }); setShowPw(false); setMsg(''); setOpen(true); }

  async function save() {
    if (!form.name || !form.email) { setMsg('নাম ও ইমেইল দিন'); return; }
    if (!form.id && !form.password) { setMsg('নতুন ব্যবহারকারীর পাসওয়ার্ড দিন'); return; }
    setSaving(true); setMsg('');
    const body = { name:form.name, email:form.email, role:form.role, is_active:true };
    if (form.password) body.password = form.password;
    try { if (form.id) await api.put('/users/'+form.id, body); else await api.post('/users', body); setOpen(false); load(); }
    catch (e) { setMsg(e?.response?.data?.message || e?.response?.data?.error || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(u) { if (!(await confirm({ title: `"${u.name}" স্থায়ীভাবে ডিলেট করবেন?`, message: 'এটি স্থায়ীভাবে মুছে যাবে, ফেরানো যাবে না।', confirmLabel: 'স্থায়ীভাবে মুছুন' }))) return; try { await api.delete('/users/'+u.id); load(); } catch (e) { alert(e?.response?.data?.message || 'ডিলেট সমস্যা'); } }
  async function toggle(u) { try { await api.post('/users/'+u.id+'/toggle-active'); load(); } catch (e) { alert(e?.response?.data?.message || 'সমস্যা'); } }
  async function approve(u) { try { await api.post('/users/'+u.id+'/approve-password'); load(); } catch (e) { alert(e?.response?.data?.message || 'সমস্যা'); } }
  async function reject(u) { try { await api.post('/users/'+u.id+'/reject-password'); load(); } catch (e) { alert(e?.response?.data?.message || 'সমস্যা'); } }
  function initials(name) { return (name||'U').split(' ').map((n)=>n[0]).join('').slice(0,2).toUpperCase(); }

  if (denied) return <div className="cd lt">এই পেজ শুধু অ্যাডমিন দেখতে পারেন।</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color:'var(--tm)' }}>ব্যবহারকারী ও ভূমিকা</p>
        <div className="flex gap-2">
          <button onClick={()=>setPwdOpen(true)} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium" style={{ borderColor:'var(--bd)' }}>🔑 পাসওয়ার্ড পরিবর্তন</button>
          <button onClick={openNew} className="btn-primary"><IcPlus className="h-4 w-4"/> নতুন ব্যবহারকারী</button>
        </div>
      </div>

      {/* অনুমতি ম্যাট্রিক্স */}
      <div className="cd">
        <div className="cdt">অনুমতি ম্যাট্রিক্স</div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>ভূমিকা</th><th className="text-center">তৈরি</th><th className="text-center">এডিট</th><th className="text-center">ডিলেট</th><th className="text-center">দেখুন</th><th className="text-center">এক্সপোর্ট</th></tr></thead>
            <tbody>
              {MATRIX.map(([role, perms]) => (
                <tr key={role}>
                  <td><strong>{role}</strong></td>
                  {perms.map((ok, i) => (
                    <td key={i} className="text-center" style={{ color: ok ? 'var(--g600)' : 'var(--c400)', fontWeight:600 }}>{ok ? '✓' : '✗'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ব্যবহারকারী তালিকা */}
      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>ব্যবহারকারী</th><th>ইমেইল</th><th>ভূমিকা</th><th>অবস্থা</th><th>কার্যক্রম</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="lt">লোড হচ্ছে…</td></tr> :
             rows.length ? rows.map((u)=>(
               <tr key={u.id}>
                 <td>
                   <div className="flex items-center gap-2.5">
                     <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background:'var(--g600)' }}>{initials(u.name)}</div>
                     <div>
                       <strong>{u.name}</strong>
                       {u.password_request_status === 'pending' && <div className="text-[11px]" style={{ color:'var(--a400)' }}>⏳ পাসওয়ার্ড পরিবর্তনের অনুরোধ</div>}
                       {u.password_request_status === 'approved' && <div className="text-[11px]" style={{ color:'var(--g600)' }}>✅ পাসওয়ার্ড অনুমোদিত</div>}
                     </div>
                   </div>
                 </td>
                 <td>{u.email}</td>
                 <td><span className="b bg">{RN[u.role] || u.role}</span></td>
                 <td>{u.is_active ? <span className="b bg">সক্রিয়</span> : <span className="b br">নিষ্ক্রিয়</span>}</td>
                 <td>
                   <div className="flex gap-1.5">
                     {u.password_request_status === 'pending' && (<>
                       <button className="act-btn" onClick={()=>approve(u)} title="পাসওয়ার্ড অনুমোদন" style={{ background:'var(--g50)', color:'var(--g600)' }}><IcCheck className="h-[15px] w-[15px]" /></button>
                       <button className="act-btn" onClick={()=>reject(u)} title="প্রত্যাখ্যান" style={{ background:'var(--r50)', color:'var(--r400)' }}><IcX className="h-[15px] w-[15px]" /></button>
                     </>)}
                     <button className="act-btn act-edit" onClick={()=>openEdit(u)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                     <button className="act-btn" onClick={()=>toggle(u)} title={u.is_active?'নিষ্ক্রিয় করুন':'সক্রিয় করুন'} style={u.is_active?{ background:'var(--a50)', color:'var(--a400)' }:{ background:'var(--g50)', color:'var(--g600)' }}>{u.is_active ? <IcLock className="h-[15px] w-[15px]" /> : <IcUnlock className="h-[15px] w-[15px]" />}</button>
                     <button className="act-btn act-del" onClick={()=>del(u)} title="স্থায়ীভাবে ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                   </div>
                 </td>
               </tr>
             )) : <tr><td colSpan={5} className="lt">কোনো ব্যবহারকারী নেই</td></tr>}
          </tbody>
        </table>
      </div>

      {/* যোগ/এডিট modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'ব্যবহারকারী এডিট':'নতুন ব্যবহারকারী'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">নাম*</label><input className="field-input" placeholder="পূর্ণ নাম" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="field-label">ইমেইল*</label><input type="email" className="field-input" placeholder="user@horticulture.bd" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">ভূমিকা*</label>
              <select className="field-input" value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>
                {ROLE_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{form.id?'নতুন পাসওয়ার্ড (পরিবর্তনের জন্য)':'পাসওয়ার্ড*'}</label>
              <div className="relative">
                <input type={showPw?'text':'password'} className="field-input pr-9" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/>
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color:'var(--tm)' }}><IcEye className="h-[18px] w-[18px]" /></button>
              </div>
            </div>
          </div>
          {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
          </div>
        </div>
      </Modal>

      {/* পাসওয়ার্ড পরিবর্তনের অনুরোধ modal */}
      <PasswordRequestModal open={pwdOpen} onClose={()=>setPwdOpen(false)} />
    </div>
  );
}

function PasswordRequestModal({ open, onClose }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [con, setCon] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setCur(''); setNw(''); setCon(''); setMsg(''); setOk(''); } }, [open]);

  async function submit() {
    setMsg(''); setOk('');
    if (!nw || !con) { setMsg('সব তথ্য দিন'); return; }
    if (nw !== con) { setMsg('পাসওয়ার্ড মিলছে না'); return; }
    if (nw.length < 6) { setMsg('কমপক্ষে ৬ অক্ষর দিন'); return; }
    setSaving(true);
    try {
      const r = await api.post('/auth/request-password-change', { new_password: nw });
      if (r.data?.success) { setOk('অনুরোধ পাঠানো হয়েছে! Admin অনুমোদন করলে পাসওয়ার্ড পরিবর্তন হবে।'); setNw(''); setCon(''); }
      else setMsg(r.data?.message || 'সমস্যা');
    } catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="পাসওয়ার্ড পরিবর্তনের অনুরোধ">
      <div className="space-y-3">
        <div className="rounded-lg p-3 text-[13px]" style={{ background:'var(--b50)', color:'var(--b600)' }}>ℹ️ আপনার নতুন পাসওয়ার্ড Admin অনুমোদন করলে কার্যকর হবে।</div>
        <div><label className="field-label">বর্তমান পাসওয়ার্ড*</label><input type="password" className="field-input" value={cur} onChange={(e)=>setCur(e.target.value)} placeholder="বর্তমান পাসওয়ার্ড"/></div>
        <div><label className="field-label">নতুন পাসওয়ার্ড*</label><input type="password" className="field-input" value={nw} onChange={(e)=>setNw(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর"/></div>
        <div><label className="field-label">নতুন পাসওয়ার্ড নিশ্চিত করুন*</label><input type="password" className="field-input" value={con} onChange={(e)=>setCon(e.target.value)} placeholder="আবার লিখুন"/></div>
        {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
        {ok && <div className="rounded-lg p-2.5 text-[13px]" style={{ background:'var(--g50)', color:'var(--g600)' }}>✓ {ok}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
          <button onClick={submit} disabled={saving} className="btn-primary">{saving?'পাঠানো হচ্ছে…':'অনুরোধ পাঠান'}</button>
        </div>
      </div>
    </Modal>
  );
}
