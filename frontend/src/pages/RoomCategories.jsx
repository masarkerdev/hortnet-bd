import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { money } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcEdit, IcTrash } from '../components/icons';

const EMPTY = { id:'', name:'', daily_rate:'' };

export default function RoomCategories() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function load() { setLoading(true); api.get('/room-categories').then((r)=>setRows(r.data?.data||[])).catch(()=>{}).finally(()=>setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name || !form.daily_rate) { setMsg('নাম ও ভাড়া দিন'); return; }
    setSaving(true); setMsg('');
    try {
      const body = { name: form.name, daily_rate: Number(form.daily_rate)||0 };
      if (form.id) await api.put('/room-categories/'+form.id, body); else await api.post('/room-categories', body);
      setOpen(false); load();
    } catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(r) { if (!(await confirm({ title: `"${r.name}" ডিলেট করবেন?` }))) return; try { await api.delete('/room-categories/'+r.id); load(); } catch { alert('ডিলেট সমস্যা'); } }

  return (
    <div className="space-y-4">
      <div className="flex items-center"><button onClick={()=>{setForm(EMPTY);setMsg('');setOpen(true);}} className="btn-primary ml-auto"><IcPlus className="h-4 w-4"/> নতুন রুম ক্যাটাগরি</button></div>
      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>রুম ক্যাটাগরি</th><th>দৈনিক ভাড়া</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="lt">লোড হচ্ছে…</td></tr> :
             rows.length===0 ? <tr><td colSpan={3} className="lt">কোনো ক্যাটাগরি নেই</td></tr> :
             rows.map((r)=>(
               <tr key={r.id}>
                 <td><strong>{r.name}</strong></td>
                 <td>{money(r.daily_rate)} / দিন</td>
                 <td><div className="flex gap-1.5">
                   <button className="act-btn act-edit" onClick={()=>{setForm({id:r.id,name:r.name,daily_rate:r.daily_rate});setMsg('');setOpen(true);}} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                   <button className="act-btn act-del" onClick={()=>del(r)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                 </div></td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'রুম ক্যাটাগরি এডিট':'নতুন রুম ক্যাটাগরি'}>
        <div className="space-y-3">
          <div><label className="field-label">ক্যাটাগরির নাম*</label><input className="field-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="যেমন: এসি / নন-এসি"/></div>
          <div><label className="field-label">দৈনিক ভাড়া (৳)*</label><input type="text" inputMode="decimal" className="field-input" value={form.daily_rate} onChange={(e)=>setForm({...form,daily_rate:e.target.value})}/></div>
          {msg && <div className="text-[13px]" style={{color:'var(--r600)'}}>{msg}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
