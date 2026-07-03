import { useEffect, useMemo, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, dateBn, today } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcAlert, IcLeaf, IcChart, IcEdit, IcTrash } from '../components/icons';

const DN = { disease:'রোগ', drought:'খরা', flood:'বন্যা', pest:'পোকামাকড়', cold:'ঠান্ডা', other:'অন্যান্য' };
const EMPTY = { id:'', seedling_id:'', batch_id:'', damage_date: today(), quantity:'', reason:'other', remarks:'' };

export default function Damages() {
  const [rows, setRows] = useState([]);
  const [prod, setProd] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    api.get('/damages').then((r)=>setRows(r.data?.data||[])).catch(()=>{});
    api.get('/production?limit=9999').then((r)=>setProd(r.data?.data||[])).catch(()=>{});
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get('/seedlings?limit=500').then((r)=>setSeedlings(r.data?.data||[])).catch(()=>{}); }, []);

  const stats = useMemo(() => {
    const dmg = rows.reduce((s,x)=>s+(+x.quantity||0),0);
    const pr = prod.reduce((s,x)=>s+(+x.produced_quantity||0),0);
    const rate = pr>0 ? ((dmg/pr)*100).toFixed(1) : 0;
    return { dmg, pr, rate };
  }, [rows, prod]);
  const rateColor = stats.rate>20 ? 'var(--r400)' : stats.rate>10 ? 'var(--a400)' : 'var(--g600)';

  function openNew() { setForm(EMPTY); setMsg(''); setOpen(true); }
  function openEdit(x) { setForm({ id:x.id, seedling_id:x.seedling_id||'', batch_id:x.batch_id||'', damage_date:(x.damage_date||today()).slice(0,10), quantity:x.quantity||'', reason:x.reason||'other', remarks:x.remarks||'' }); setMsg(''); setOpen(true); }

  async function save() {
    if (!form.seedling_id || !form.quantity || !form.damage_date) { setMsg('চারা, তারিখ ও পরিমাণ দিন'); return; }
    setSaving(true); setMsg('');
    const body = { seedling_id:Number(form.seedling_id), batch_id:Number(form.batch_id)||null, damage_date:form.damage_date, quantity:Number(form.quantity)||0, reason:form.reason, remarks:form.remarks };
    try { if (form.id) await api.put('/damages/'+form.id, body); else await api.post('/damages', body); setOpen(false); load(); }
    catch (e) { setMsg(e?.response?.data?.message || e?.response?.data?.error || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(x) { if (!(await confirm({ title: 'এই ক্ষতি রেকর্ড ডিলেট করবেন?' }))) return; try { await api.delete('/damages/'+x.id); load(); } catch { alert('ডিলেট সমস্যা'); } }

  const batchesOfSeed = form.seedling_id ? prod.filter((b)=>String(b.seedling_id)===String(form.seedling_id)) : prod;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Card l="মোট ক্ষতি" v={toBn(stats.dmg)} Icon={IcAlert} bg="var(--r50)" fg="var(--r400)" />
        <Card l="মোট উৎপাদন" v={toBn(stats.pr)} Icon={IcLeaf} bg="var(--g50)" fg="var(--g600)" />
        <Card l="ক্ষতির হার" v={toBn(stats.rate)+'%'} Icon={IcChart} bg="var(--a50)" fg={rateColor} vColor={rateColor} />
        <button onClick={openNew} className="btn-primary ml-auto"><IcPlus className="h-4 w-4"/> ক্ষতি রিপোর্ট</button>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>তারিখ</th><th>চারা</th><th>ব্যাচ</th><th>পরিমাণ</th><th>কারণ</th><th>মন্তব্য</th><th>রিপোর্টকারী</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((x)=>(
              <tr key={x.id}>
                <td>{dateBn(x.damage_date)}</td>
                <td><strong>{x.name_bn || '-'}</strong></td>
                <td style={{ color:'var(--tm)' }}>{x.batch_code || '-'}</td>
                <td><strong>{toBn(x.quantity)}</strong></td>
                <td><span className="b br">{DN[x.reason] || x.reason}</span></td>
                <td>{x.remarks || '-'}</td>
                <td style={{ color:'var(--tm)' }}>{x.reporter || '-'}</td>
                <td><div className="flex gap-1.5">
                  <button className="act-btn act-edit" onClick={()=>openEdit(x)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                  <button className="act-btn act-del" onClick={()=>del(x)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                </div></td>
              </tr>
            )) : <tr><td colSpan={8} className="lt">কোনো ক্ষতির রেকর্ড নেই</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'ক্ষতি রিপোর্ট এডিট':'নতুন ক্ষতি রিপোর্ট'}>
        <div className="space-y-3">
          <div><label className="field-label">চারা*</label>
            <select className="field-input" value={form.seedling_id} onChange={(e)=>setForm({...form,seedling_id:e.target.value,batch_id:''})}>
              <option value="">— বাছাই করুন —</option>
              {seedlings.map((s)=><option key={s.id} value={s.id}>{s.name_bn}{s.variety?` (${s.variety})`:''}</option>)}
            </select>
          </div>
          <div><label className="field-label">ব্যাচ (ঐচ্ছিক)</label>
            <select className="field-input" value={form.batch_id} onChange={(e)=>setForm({...form,batch_id:e.target.value})}>
              <option value="">— কোনোটি নয় —</option>
              {batchesOfSeed.map((b)=><option key={b.id} value={b.id}>{b.batch_code}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">তারিখ*</label><input type="date" className="field-input" value={form.damage_date} onChange={(e)=>setForm({...form,damage_date:e.target.value})}/></div>
            <div><label className="field-label">পরিমাণ*</label><input type="text" inputMode="decimal" className="field-input" value={form.quantity} onChange={(e)=>setForm({...form,quantity:e.target.value})}/></div>
          </div>
          <div><label className="field-label">কারণ</label>
            <select className="field-input" value={form.reason} onChange={(e)=>setForm({...form,reason:e.target.value})}>
              <option value="disease">রোগ</option><option value="drought">খরা</option><option value="flood">বন্যা</option>
              <option value="pest">পোকামাকড়</option><option value="cold">ঠান্ডা</option><option value="other">অন্যান্য</option>
            </select>
          </div>
          <div><label className="field-label">মন্তব্য</label><textarea rows={2} className="field-input" value={form.remarks} onChange={(e)=>setForm({...form,remarks:e.target.value})}/></div>
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
function Card({ l, v, Icon, bg, fg, vColor }) {
  return (
    <div className="sc" style={{ minWidth: 180, flex:'1 1 180px' }}>
      <div className="si" style={{ background:bg }}><Icon className="h-[18px] w-[18px]" style={{ color:fg }} /></div>
      <div className="sl">{l}</div>
      <div className="sv" style={{ color: vColor||fg }}>{v}</div>
    </div>
  );
}
