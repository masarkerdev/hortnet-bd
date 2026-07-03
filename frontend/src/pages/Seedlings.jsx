import { useCallback, useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, money } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcSearch, IcEdit, IcTrash } from '../components/icons';

const LIMIT = 30;
const EMPTY = { id:'', name_bn:'', name_en:'', variety:'', category_id:'', unit_price:'', production_cost:'', description:'' };

export default function Seedlings() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('');
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/categories').then((r) => setCats(r.data?.data || [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    const q = `/seedlings?search=${encodeURIComponent(search)}&page=${page}&limit=${LIMIT}${catF ? '&category_id=' + catF : ''}`;
    api.get(q).then((r) => { setRows(r.data?.data || []); setTotal(r.data?.pagination?.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [search, page, catF]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, catF]);

  function openNew() { setForm(EMPTY); setOpen(true); }
  function openEdit(s) { setForm({ id:s.id, name_bn:s.name_bn||'', name_en:s.name_en||'', variety:s.variety||'', category_id:s.category_id||'', unit_price:s.unit_price||'', production_cost:s.production_cost||'', description:s.description||'' }); setOpen(true); }

  async function save() {
    if (!form.name_bn || !form.unit_price) { setMsg('নাম ও মূল্য দিন'); return; }
    setSaving(true); setMsg('');
    const body = {
      name_bn: form.name_bn, name_en: form.name_en, variety: form.variety,
      category_id: Number(form.category_id) || null, production_type: 'seed',
      unit_price: Number(form.unit_price) || 0, production_cost: Number(form.production_cost) || 0,
      description: form.description, is_active: true,
    };
    try {
      const r = form.id ? await api.put('/seedlings/' + form.id, body) : await api.post('/seedlings', body);
      if (r.data?.success) { setOpen(false); load(); }
      else setMsg(r.data?.message || 'সমস্যা হয়েছে');
    } catch (e) { setMsg(e?.response?.data?.message || 'সার্ভার সমস্যা'); }
    finally { setSaving(false); }
  }

  async function del(s) {
    if (!(await confirm({ title: `"${s.name_bn}" ডিলেট করবেন?` }))) return;
    try { await api.delete('/seedlings/' + s.id); load(); }
    catch (e) { alert(e?.response?.data?.message || 'মুছতে সমস্যা'); }
  }

  const tp = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="চারা খুঁজুন..." className="field-input pl-9" style={{ width: 240 }} />
        </div>
        <select value={catF} onChange={(e)=>setCatF(e.target.value)} className="field-input" style={{ width: 180 }}>
          <option value="">সব ক্যাটাগরি</option>
          {cats.map((c)=><option key={c.id} value={c.id}>{c.name_bn}</option>)}
        </select>
        <button onClick={openNew} className="btn-primary ml-auto"><IcPlus className="h-4 w-4" /> নতুন চারা</button>
      </div>

      <div className="cd !p-0">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>কোড</th><th>নাম</th><th>ক্যাটাগরি</th><th>মূল্য</th><th>স্টক</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="lt">লোড হচ্ছে…</td></tr> :
               rows.length === 0 ? <tr><td colSpan={7} className="lt">কোনো চারা নেই</td></tr> :
               rows.map((x) => {
                 const lowStock = x.current_stock <= x.min_stock_alert;
                 return (
                   <tr key={x.id}>
                     <td style={{ color:'var(--tm)' }}>{x.seedling_code}</td>
                     <td><strong>{x.name_bn}</strong>{x.variety && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{x.variety}</div>}</td>
                     <td><span className="b bg">{x.category_bn || '-'}</span></td>
                     <td>{money(x.unit_price)}</td>
                     <td><strong style={lowStock ? { color:'var(--c400)' } : undefined}>{toBn(x.current_stock)}</strong></td>
                     <td>{lowStock ? <span className="b br">কম স্টক</span> : <span className="b bg">সক্রিয়</span>}</td>
                     <td>
                       <div className="flex gap-1.5">
                         <button className="act-btn act-edit" onClick={()=>openEdit(x)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                         <button className="act-btn act-del" onClick={()=>del(x)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                       </div>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-3 text-[12px]" style={{ color:'var(--tm)', borderTop:'1px solid var(--bd)' }}>
            <span>{toBn(total)}টির মধ্যে {toBn((page-1)*LIMIT+1)}–{toBn(Math.min(page*LIMIT, total))} দেখানো হচ্ছে</span>
            <div className="flex gap-1">
              <button className="ico-btn" disabled={page<=1} onClick={()=>setPage(page-1)} style={page<=1?{opacity:.4}:undefined}>‹</button>
              {Array.from({length: tp}, (_,i)=>i+1).slice(Math.max(0,page-3), page+2).map((i)=>(
                <button key={i} className="ico-btn" onClick={()=>setPage(i)} style={i===page?{background:'var(--g600)',color:'#fff',borderColor:'var(--g600)'}:undefined}>{toBn(i)}</button>
              ))}
              <button className="ico-btn" disabled={page>=tp} onClick={()=>setPage(page+1)} style={page>=tp?{opacity:.4}:undefined}>›</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={form.id ? 'চারা এডিট' : 'নতুন চারা'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="নাম (বাংলা)*"><input className="field-input" value={form.name_bn} onChange={(e)=>setForm({...form,name_bn:e.target.value})} /></Field>
            <Field label="নাম (English)"><input className="field-input" value={form.name_en} onChange={(e)=>setForm({...form,name_en:e.target.value})} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="জাত (variety)"><input className="field-input" value={form.variety} onChange={(e)=>setForm({...form,variety:e.target.value})} /></Field>
            <Field label="ক্যাটাগরি">
              <select className="field-input" value={form.category_id} onChange={(e)=>setForm({...form,category_id:e.target.value})}>
                <option value="">— বাছাই করুন —</option>
                {cats.map((c)=><option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="একক মূল্য (৳)*"><input type="text" inputMode="decimal" className="field-input" value={form.unit_price} onChange={(e)=>setForm({...form,unit_price:e.target.value})} /></Field>
            <Field label="উৎপাদন খরচ (৳)"><input type="text" inputMode="decimal" className="field-input" value={form.production_cost} onChange={(e)=>setForm({...form,production_cost:e.target.value})} /></Field>
          </div>
          <Field label="বিবরণ"><textarea className="field-input" rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field>
          {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{ borderColor:'var(--bd)' }}>বাতিল</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
function Field({ label, children }) { return <div><label className="field-label">{label}</label>{children}</div>; }
