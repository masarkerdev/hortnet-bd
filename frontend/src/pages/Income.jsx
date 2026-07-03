import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, money, dateBn, today } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcLeaf, IcArchive, IcDoc, IcCoin, IcEdit, IcTrash, IcPrinter } from '../components/icons';
import ProducePrices from './ProducePrices';
import RoomCategories from './RoomCategories';

const UNIT = { kg:'কেজি', piece:'পিস' };
const TYPE_LABEL = { produce:'কৃষি পণ্য', dormitory:'ডরমিটরি ভাড়া' };
const TABS = [['list','আয় তালিকা'],['produce','পণ্যের দর'],['room','রুম ক্যাটাগরি']];

export default function Income() {
  const [tab, setTab] = useState('list');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor:'var(--bd)', background:'#fff' }}>
          {TABS.map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} className="rounded-md px-4 py-1.5 text-[13px] font-medium transition"
              style={tab===k ? { background:'var(--g600)', color:'#fff' } : { color:'var(--tm)' }}>{l}</button>
          ))}
        </div>
      </div>
      {tab === 'list' && <IncomeList />}
      {tab === 'produce' && <ProducePrices />}
      {tab === 'room' && <RoomCategories />}
    </div>
  );
}

function IncomeList() {
  const ctx = useOutletContext() || {};
  const { fy, setFy } = ctx;
  const [rows, setRows] = useState([]);
  const [center, setCenter] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [produces, setProduces] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function load() { api.get('/other-income').then((r)=>setRows(r.data?.data||[])).catch(()=>{}); }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get('/produce-prices').then((r)=>setProduces(r.data?.data||[])).catch(()=>{});
    api.get('/room-categories').then((r)=>setRooms(r.data?.data||[])).catch(()=>{});
    api.get('/center-info').then((r)=>setCenter(r.data?.data||null)).catch(()=>{});
  }, []);
  const CAT_OFFICE = { A:'উপপরিচালকের কার্যালয়', B:'উদ্যানতত্ত্ববিদের কার্যালয়', C:'নার্সারি তত্ত্বাবধায়কের কার্যালয়' };
  const office = CAT_OFFICE[center?.category] || 'হর্টিকালচার সেন্টার';
  const cloc = center?.location || '';
  function fyOfDate(d) { const dt = new Date(d); return dt.getMonth() >= 6 ? dt.getFullYear() : dt.getFullYear() - 1; }

  const sums = useMemo(() => {
    const s = { produce:0, dormitory:0, other:0, total:0 };
    rows.forEach((x) => {
      const a = +x.amount || 0; s.total += a;
      if (x.income_type === 'produce') s.produce += a;
      else if (x.income_type === 'dormitory') s.dormitory += a;
      else s.other += a;
    });
    return s;
  }, [rows]);

  const days = useMemo(() => {
    if (form.mode !== 'dormitory' || !form.check_in || !form.check_out) return 0;
    const d = Math.round((new Date(form.check_out) - new Date(form.check_in)) / 86400000);
    return d < 1 ? 1 : d;
  }, [form.mode, form.check_in, form.check_out]);
  const autoAmount = useMemo(() => {
    if (form.mode === 'produce') return (Number(form.unit_price)||0) * (Number(form.quantity)||0);
    if (form.mode === 'dormitory') return (Number(form.daily_rate)||0) * days;
    return Number(form.amount)||0;
  }, [form, days]);

  function openNew() { setForm(EMPTY); setMsg(''); setOpen(true); }
  function openEdit(x) {
    const mode = x.income_type === 'produce' ? 'produce' : x.income_type === 'dormitory' ? 'dormitory' : 'general';
    setForm({ id:x.id, mode, income_type:x.income_type||'', category:x.category||'', amount:x.amount||'',
      income_date:(x.income_date||today()).slice(0,10), description:x.description||'',
      produce_price_id:x.produce_price_id||'', quantity:x.quantity||'', unit_price:x.unit_price||'', unit:'kg',
      room_category_id:x.room_category_id||'', check_in:(x.check_in||today()).slice(0,10), check_out:(x.check_out||today()).slice(0,10), daily_rate:'', guest_name:x.guest_name||'', guest_mobile:x.guest_mobile||'', guest_occupation:x.guest_occupation||'' });
    setMsg(''); setOpen(true);
  }
  function onProduce(id) { const p = produces.find((x)=>String(x.id)===String(id)); setForm((f)=>({ ...f, produce_price_id:id, unit_price:p?Number(p.price):0, unit:p?p.unit:'kg', category:p?p.name:'' })); }
  function onRoom(id) { const r = rooms.find((x)=>String(x.id)===String(id)); setForm((f)=>({ ...f, room_category_id:id, daily_rate:r?Number(r.daily_rate):0, category:r?r.name:'' })); }

  async function save() {
    setMsg(''); setSaving(true); const f = form; let body;
    if (f.mode === 'produce') {
      if (!f.produce_price_id || !f.quantity) { setMsg('পণ্য ও পরিমাণ দিন'); return; }
      body = { income_type:'produce', category:f.category, amount:autoAmount, income_date:f.income_date, description:f.description, quantity:Number(f.quantity)||0, unit_price:Number(f.unit_price)||0, produce_price_id:Number(f.produce_price_id) };
    } else if (f.mode === 'dormitory') {
      if (!f.room_category_id || !f.check_in || !f.check_out) { setMsg('রুম ও তারিখ দিন'); return; }
      if (!f.guest_name || !f.guest_mobile) { setMsg('অতিথির নাম ও মোবাইল দিন'); return; }
      body = { income_type:'dormitory', category:f.category, amount:autoAmount, income_date:f.check_in, description:f.description, room_category_id:Number(f.room_category_id), check_in:f.check_in, check_out:f.check_out, unit_price:Number(f.daily_rate)||0, guest_name:f.guest_name, guest_mobile:f.guest_mobile, guest_occupation:f.guest_occupation };
    } else {
      if (!f.income_type || !f.amount) { setMsg('খাত ও পরিমাণ দিন'); return; }
      body = { income_type:f.income_type, category:f.category, amount:Number(f.amount)||0, income_date:f.income_date, description:f.description };
    }
    setSaving(true);
    try {
      if (f.id) await api.put('/other-income/'+f.id, body); else await api.post('/other-income', body);
      setOpen(false);
      const savedFy = fyOfDate(body.income_date);
      if (setFy && fy != null && savedFy !== fy) { localStorage.setItem('hc_fy', String(savedFy)); setFy(savedFy); }
      else { load(); }
    }
    catch (e) { setMsg(e?.response?.data?.message || e?.response?.data?.error || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(x) { if (!(await confirm({ title: 'এই আয় ডিলেট করবেন?' }))) return; try { await api.delete('/other-income/'+x.id); load(); } catch { alert('ডিলেট সমস্যা'); } }
  function detail(x) {
    if (x.income_type === 'produce') return `${x.category||''} — ${toBn(x.quantity||0)} × ${money(x.unit_price||0)}`;
    if (x.income_type === 'dormitory') return `${x.category||''} — ${dateBn(x.check_in)} → ${dateBn(x.check_out)}`;
    return x.description || '-';
  }

  const CARDS = [
    { l:'কৃষি পণ্য', v:money(sums.produce), Icon:IcLeaf, bg:'var(--g50)', fg:'var(--g600)' },
    { l:'ডরমিটরি ভাড়া', v:money(sums.dormitory), Icon:IcArchive, bg:'var(--b50)', fg:'var(--b600)' },
    { l:'অন্যান্য', v:money(sums.other), Icon:IcDoc, bg:'var(--a50)', fg:'var(--a400)' },
    { l:'মোট অন্যান্য আয়', v:money(sums.total), Icon:IcCoin, bg:'var(--t50)', fg:'var(--t600)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color:'var(--tm)' }}>কৃষি পণ্য বিক্রয়, ডরমিটরি ভাড়া ও অন্যান্য আয়</p>
        <button onClick={openNew} className="btn-primary"><IcPlus className="h-4 w-4"/> আয় যোগ করুন</button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARDS.map((c) => (
          <div className="sc" key={c.l}>
            <div className="si" style={{ background: c.bg }}><c.Icon className="h-[18px] w-[18px]" style={{ color: c.fg }} /></div>
            <div className="sl">{c.l}</div>
            <div className="sv" style={{ color: c.fg }}>{c.v}</div>
            <div className="ss2">সর্বমোট</div>
          </div>
        ))}
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>তারিখ</th><th>খাত</th><th>বিস্তারিত</th><th>পরিমাণ</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((x)=>(
              <tr key={x.id}>
                <td>{dateBn(x.income_date)}</td>
                <td><span className="b bt">{TYPE_LABEL[x.income_type] || x.income_type}</span></td>
                <td>{detail(x)}</td>
                <td><strong>{money(x.amount)}</strong></td>
                <td><div className="flex gap-1.5">
                  <button className="act-btn" onClick={()=>setReceipt(x)} title="রসিদ" style={{ borderColor:'var(--bd)', color:'var(--tm)' }}><IcPrinter className="h-[15px] w-[15px]" /></button>
                  <button className="act-btn act-edit" onClick={()=>openEdit(x)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                  <button className="act-btn act-del" onClick={()=>del(x)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                </div></td>
              </tr>
            )) : <tr><td colSpan={5} className="lt">কোনো আয় নেই</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title={form.id?'আয় এডিট':'নতুন আয়'} wide>
        <div className="space-y-3">
          <div>
            <label className="field-label">আয়ের ধরন</label>
            <div className="flex gap-2">
              {[['general','সাধারণ আয়'],['produce','কৃষি পণ্য'],['dormitory','ডরমিটরি ভাড়া']].map(([v,l])=>(
                <button key={v} onClick={()=>setForm({...form,mode:v})} className="rounded-lg border px-3 py-2 text-[13px] font-medium transition"
                  style={form.mode===v?{background:'var(--g600)',color:'#fff',borderColor:'var(--g600)'}:{borderColor:'var(--bd)',color:'var(--tm)'}}>{l}</button>
              ))}
            </div>
          </div>

          {form.mode === 'produce' && (<>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">পণ্য*</label>
                <select className="field-input" value={form.produce_price_id} onChange={(e)=>onProduce(e.target.value)}>
                  <option value="">— বাছাই করুন —</option>
                  {produces.map((p)=><option key={p.id} value={p.id}>{p.name} ({money(p.price)}/{UNIT[p.unit]||p.unit})</option>)}
                </select>
              </div>
              <div><label className="field-label">পরিমাণ ({UNIT[form.unit]||form.unit})*</label><input type="text" inputMode="decimal" className="field-input" value={form.quantity} onChange={(e)=>setForm({...form,quantity:e.target.value})}/></div>
            </div>
            <div><label className="field-label">তারিখ</label><input type="date" className="field-input" value={form.income_date} onChange={(e)=>setForm({...form,income_date:e.target.value})}/></div>
          </>)}

          {form.mode === 'dormitory' && (<>
            <div><label className="field-label">রুম ক্যাটাগরি*</label>
              <select className="field-input" value={form.room_category_id} onChange={(e)=>onRoom(e.target.value)}>
                <option value="">— বাছাই করুন —</option>
                {rooms.map((r)=><option key={r.id} value={r.id}>{r.name} ({money(r.daily_rate)}/দিন)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="field-label">নাম*</label><input className="field-input" value={form.guest_name} onChange={(e)=>setForm({...form,guest_name:e.target.value})} placeholder="অতিথির নাম"/></div>
              <div><label className="field-label">মোবাইল*</label><input className="field-input" value={form.guest_mobile} onChange={(e)=>setForm({...form,guest_mobile:e.target.value})} placeholder="01X-XXXXXXXX"/></div>
              <div><label className="field-label">পেশা</label><input className="field-input" value={form.guest_occupation} onChange={(e)=>setForm({...form,guest_occupation:e.target.value})} placeholder="যেমন: কৃষক"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">চেক-ইন*</label><input type="date" className="field-input" value={form.check_in} onChange={(e)=>setForm({...form,check_in:e.target.value})}/></div>
              <div><label className="field-label">চেক-আউট*</label><input type="date" className="field-input" value={form.check_out} onChange={(e)=>setForm({...form,check_out:e.target.value})}/></div>
            </div>
            {days>0 && <div className="text-[13px]" style={{color:'var(--tm)'}}>মোট দিন: <strong>{toBn(days)}</strong></div>}
          </>)}

          {form.mode === 'general' && (<>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">খাত / উৎস*</label><input className="field-input" value={form.income_type} onChange={(e)=>setForm({...form,income_type:e.target.value})} placeholder="যেমন: মাছ বিক্রয়"/></div>
              <div><label className="field-label">পরিমাণ (৳)*</label><input type="text" inputMode="decimal" className="field-input" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/></div>
            </div>
            <div><label className="field-label">তারিখ</label><input type="date" className="field-input" value={form.income_date} onChange={(e)=>setForm({...form,income_date:e.target.value})}/></div>
            <div><label className="field-label">বিবরণ</label><textarea rows={2} className="field-input" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div>
          </>)}

          {form.mode !== 'general' && (
            <div className="rounded-lg p-3 flex justify-between items-center" style={{ background:'var(--g50)' }}>
              <span style={{color:'var(--tm)'}}>মোট আয় (auto)</span>
              <strong style={{ color:'var(--g600)', fontSize:18 }}>{money(autoAmount)}</strong>
            </div>
          )}

          {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
          </div>
        </div>
      </Modal>
      {receipt && <IncomeReceipt row={receipt} office={office} location={cloc} detail={detail} onClose={()=>setReceipt(null)} />}
    </div>
  );
}

function IncomeReceipt({ row, office, location, detail, onClose }) {
  const TYPE = { produce:'কৃষি পণ্য বিক্রয়', dormitory:'ডরমিটরি ভাড়া' };
  const typeLabel = TYPE[row.income_type] || 'সাধারণ আয়';
  return (
    <Modal open onClose={onClose} title="আয়ের রসিদ">
      <div id="print-area">
        <div style={{ borderBottom:'3px solid var(--g600)', paddingBottom:12, marginBottom:14, textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--g600)' }}>{office}</div>
          <div style={{ fontSize:13, color:'#444', marginTop:2 }}>হর্টিকালচার সেন্টার{location?`, ${location}`:''}</div>
          <div style={{ fontSize:12, color:'#666' }}>কৃষি সম্প্রসারণ অধিদপ্তর, হর্টিকালচার উইং, কৃষি মন্ত্রণালয়</div>
        </div>
        <div style={{ textAlign:'center', fontWeight:700, fontSize:15, margin:'6px 0 14px' }}>আয়ের রসিদ / Income Receipt</div>
        <div className="mb-3 flex justify-between text-[13px]">
          <div><div className="font-semibold">রসিদ নং: {toBn(String(row.id).padStart(4,'0'))}</div><div style={{ color:'#666' }}>তারিখ: {dateBn(row.income_date)}</div></div>
          <div className="text-right"><div className="font-semibold">আয়ের ধরন: {typeLabel}</div></div>
        </div>
        {(row.guest_name || row.guest_mobile) && (
          <div className="mb-3 rounded-lg p-2.5 text-[13px]" style={{ background:'var(--g50)' }}>
            <span className="font-semibold">অতিথি:</span> {row.guest_name || '-'}
            {row.guest_mobile ? ` | মোবাইল: ${row.guest_mobile}` : ''}
            {row.guest_occupation ? ` | পেশা: ${row.guest_occupation}` : ''}
          </div>
        )}
        <table className="tbl" style={{ border:'1px solid var(--bd)' }}>
          <thead><tr><th>খাত / উৎস</th><th>বিবরণ</th><th style={{ textAlign:'right' }}>পরিমাণ (৳)</th></tr></thead>
          <tbody>
            <tr>
              <td>{row.income_type === 'produce' || row.income_type === 'dormitory' ? typeLabel : (row.income_type || '-')}</td>
              <td>{detail ? detail(row) : (row.description || '-')}</td>
              <td style={{ textAlign:'right', fontWeight:600 }}>{money(row.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 ml-auto w-56 text-[14px]">
          <div className="flex justify-between border-t pt-2" style={{ borderColor:'var(--g600)' }}><strong>সর্বমোট</strong><strong style={{ color:'var(--g600)' }}>{money(row.amount)}</strong></div>
        </div>
        {row.description && <div className="mt-3 text-[12px]" style={{ color:'#666' }}>বিবরণ: {row.description}</div>}
        <div className="mt-10 flex justify-between text-[12px]" style={{ color:'#444' }}>
          <div style={{ textAlign:'center' }}>__________________<br/>গ্রহীতার স্বাক্ষর</div>
          <div style={{ textAlign:'center' }}>__________________<br/>দায়িত্বপ্রাপ্ত কর্মকর্তা</div>
        </div>
      </div>
      <div className="no-print mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{ borderColor:'var(--bd)' }}>বন্ধ</button>
        <button onClick={()=>window.print()} className="btn-primary"><IcPrinter className="h-4 w-4" /> প্রিন্ট</button>
      </div>
    </Modal>
  );
}

const EMPTY = {
  id:'', mode:'general', income_type:'', category:'', amount:'', income_date: today(), description:'',
  produce_price_id:'', quantity:'', unit_price:'', unit:'kg',
  room_category_id:'', check_in: today(), check_out: today(), daily_rate:'', guest_name:'', guest_mobile:'', guest_occupation:'',
};
