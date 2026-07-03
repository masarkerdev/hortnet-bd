import { useEffect, useState, useCallback as useCb } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, money } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcSearch, IcUsers, IcEdit, IcTrash } from '../components/icons';

const EMPTY = { id:'', name:'', phone:'', address:'', email:'' };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCb(() => {
    setLoading(true);
    api.get('/customers' + (search ? '?search=' + encodeURIComponent(search) : ''))
      .then((r)=>setRows(r.data?.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const totalSpent = rows.reduce((s,x)=>s+(+x.total_spent||0),0);

  function openNew() { setForm(EMPTY); setMsg(''); setOpen(true); }
  function openEdit(c) { setForm({ id:c.id, name:c.name||'', phone:c.phone||'', address:c.address||'', email:c.email||'' }); setMsg(''); setOpen(true); }

  async function save() {
    if (!form.name) { setMsg('নাম দিন'); return; }
    setSaving(true); setMsg('');
    const body = { name:form.name, phone:form.phone, address:form.address, email:form.email };
    try { if (form.id) await api.put('/customers/'+form.id, body); else await api.post('/customers', body); setOpen(false); load(); }
    catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(c) { if (!(await confirm({ title: `"${c.name}" ডিলেট করবেন?` }))) return; try { await api.delete('/customers/'+c.id); load(); } catch (e) { alert(e?.response?.data?.message || 'ডিলেট সমস্যা'); } }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="sc" style={{ minWidth: 200 }}>
          <div className="si" style={{ background:'var(--g50)' }}><IcUsers className="h-[18px] w-[18px]" style={{ color:'var(--g600)' }} /></div>
          <div className="sl">মোট গ্রাহক</div><div className="sv" style={{ color:'var(--g600)' }}>{toBn(rows.length)}</div>
        </div>
        <div className="sc" style={{ minWidth: 200 }}>
          <div className="si" style={{ background:'var(--b50)' }}><IcUsers className="h-[18px] w-[18px]" style={{ color:'var(--b600)' }} /></div>
          <div className="sl">মোট বিক্রয় (গ্রাহক)</div><div className="sv" style={{ color:'var(--b600)' }}>{money(totalSpent)}</div>
        </div>
        <button onClick={openNew} className="btn-primary ml-auto"><IcPlus className="h-4 w-4"/> নতুন গ্রাহক</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="গ্রাহক খুঁজুন..." className="field-input pl-9" style={{ width: 260 }} />
        </div>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>নাম</th><th>ফোন</th><th>ঠিকানা</th><th>মোট অর্ডার</th><th>মোট খরচ</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="lt">লোড হচ্ছে…</td></tr> :
             rows.length ? rows.map((c)=>(
               <tr key={c.id}>
                 <td><strong>{c.name}</strong>{c.email && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{c.email}</div>}</td>
                 <td>{c.phone || '-'}</td>
                 <td>{c.address || '-'}</td>
                 <td>{toBn(c.total_orders || 0)}টি</td>
                 <td><strong>{money(c.total_spent || 0)}</strong></td>
                 <td><div className="flex gap-1.5">
                   <button className="act-btn act-edit" onClick={()=>openEdit(c)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                   <button className="act-btn act-del" onClick={()=>del(c)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                 </div></td>
               </tr>
             )) : <tr><td colSpan={6} className="lt">কোনো গ্রাহক নেই</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'গ্রাহক এডিট':'নতুন গ্রাহক'}>
        <div className="space-y-3">
          <div><label className="field-label">নাম*</label><input className="field-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">ফোন</label><input className="field-input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div>
            <div><label className="field-label">ইমেইল</label><input className="field-input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></div>
          </div>
          <div><label className="field-label">ঠিকানা</label><textarea rows={2} className="field-input" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/></div>
          {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
