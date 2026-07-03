import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, money } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcEdit, IcTrash } from '../components/icons';

const UNIT = { kg:'কেজি', piece:'পিস' };
const EMPTY = { id:'', name:'', unit:'kg', price:'' };

export default function ProducePrices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function load() { setLoading(true); api.get('/produce-prices').then((r)=>setRows(r.data?.data||[])).catch(()=>{}).finally(()=>setLoading(false)); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name || !form.price) { setMsg('নাম ও দর দিন'); return; }
    setSaving(true); setMsg('');
    try {
      const body = { name: form.name, unit: form.unit, price: Number(form.price)||0 };
      if (form.id) await api.put('/produce-prices/'+form.id, body); else await api.post('/produce-prices', body);
      setOpen(false); load();
    } catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(p) { if (!(await confirm({ title: `"${p.name}" ডিলেট করবেন?` }))) return; try { await api.delete('/produce-prices/'+p.id); load(); } catch { alert('ডিলেট সমস্যা'); } }

  return (
    <div className="space-y-4">
      <div className="flex items-center"><button onClick={()=>{setForm(EMPTY);setMsg('');setOpen(true);}} className="btn-primary ml-auto"><IcPlus className="h-4 w-4"/> নতুন পণ্য</button></div>
      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>পণ্যের নাম</th><th>একক</th><th>দর</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="lt">লোড হচ্ছে…</td></tr> :
             rows.length===0 ? <tr><td colSpan={4} className="lt">কোনো পণ্য নেই</td></tr> :
             rows.map((p)=>(
               <tr key={p.id}>
                 <td><strong>{p.name}</strong></td>
                 <td>{UNIT[p.unit]||p.unit}</td>
                 <td>{money(p.price)} / {UNIT[p.unit]||p.unit}</td>
                 <td><div className="flex gap-1.5">
                   <button className="act-btn act-edit" onClick={()=>{setForm({id:p.id,name:p.name,unit:p.unit,price:p.price});setMsg('');setOpen(true);}} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                   <button className="act-btn act-del" onClick={()=>del(p)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                 </div></td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'পণ্য এডিট':'নতুন পণ্য'}>
        <div className="space-y-3">
          <div><label className="field-label">পণ্যের নাম*</label><input className="field-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="যেমন: লাল শাক"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">একক</label><select className="field-input" value={form.unit} onChange={(e)=>setForm({...form,unit:e.target.value})}><option value="kg">কেজি</option><option value="piece">পিস</option></select></div>
            <div><label className="field-label">দর (৳)*</label><input type="text" inputMode="decimal" className="field-input" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})}/></div>
          </div>
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
