import { useEffect, useState } from 'react';
import api from '../lib/api';
import { today } from '../lib/format';
import Modal from './Modal';

export const TYPES = [
  { v:'seed', l:'বীজ' }, { v:'cutting', l:'কাটিং' }, { v:'layering', l:'লেয়ারিং' },
  { v:'grafting', l:'গ্রাফটিং' }, { v:'budding', l:'বাডিং' }, { v:'tissue_culture', l:'টিস্যু কালচার' },
  { v:'purchase', l:'ক্রয়' },
];
export const MN = Object.fromEntries(TYPES.map((t) => [t.v, t.l]));

const EMPTY = {
  id:'', type:'seed', seedling_id:'', seed_source:'', seed_quantity:'', sowing_date: today(),
  produced_quantity:'', success_quantity:'', mother_plant_id:'', propagation_date: today(),
  purchase_source:'', unit_price:'', remarks:'',
};

export function batchToForm(b) {
  if (!b) return { ...EMPTY };
  const isPurch = b.production_type === 'purchase';
  return {
    id: b.id, type: b.production_type, seedling_id: b.seedling_id || '',
    seed_source: b.seed_source || '', seed_quantity: b.seed_quantity || '',
    sowing_date: (b.sowing_date || today()).slice(0, 10),
    produced_quantity: b.produced_quantity || '', success_quantity: b.success_quantity || '',
    mother_plant_id: b.mother_plant_id || '',
    propagation_date: (b.propagation_date || b.created_at || today()).slice(0, 10),
    purchase_source: isPurch ? (b.remarks || '').replace(/ক্রয় উৎস: /, '').split(' | ')[0] : '',
    unit_price: '', remarks: b.production_type === 'seed' || isPurch ? '' : (b.remarks || ''),
  };
}

export default function BatchModal({ open, onClose, seedlings, mothers, batch, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (open) { setForm(batchToForm(batch)); setMsg(''); } }, [open, batch]);

  const f = form;
  const setF = (patch) => setForm((p) => ({ ...p, ...patch }));

  async function save() {
    setMsg('');
    const sid = Number(f.seedling_id);
    if (!sid) { setMsg('চারা বাছাই করুন'); return; }
    setSaving(true);
    try {
      if (f.id) {
        const upd = { produced_quantity: Number(f.produced_quantity) || 0, remarks: f.remarks };
        if (f.type === 'seed') { upd.seed_source = f.seed_source; upd.seed_quantity = Number(f.seed_quantity) || 0; upd.sowing_date = f.sowing_date; }
        else { upd.success_quantity = Number(f.success_quantity) || 0; upd.failed_quantity = (Number(f.produced_quantity) || 0) - (Number(f.success_quantity) || 0); upd.success_percent = (Number(f.produced_quantity) || 0) > 0 ? (((Number(f.success_quantity) || 0) / (Number(f.produced_quantity) || 0)) * 100).toFixed(2) : 0; upd.propagation_date = f.propagation_date; }
        await api.post('/production/' + f.id + '/update', upd);
      } else if (f.type === 'seed') {
        if (!f.sowing_date || !f.produced_quantity) { setMsg('তারিখ ও পরিমাণ দিন'); setSaving(false); return; }
        await api.post('/production/seed', {
          seedling_id: sid, seed_source: f.seed_source, seed_quantity: Number(f.seed_quantity) || 0,
          sowing_date: f.sowing_date, produced_quantity: Number(f.produced_quantity) || 0,
          failed_quantity: Math.max(0, (Number(f.seed_quantity) || 0) - (Number(f.produced_quantity) || 0)), remarks: f.remarks,
        });
      } else if (f.type === 'purchase') {
        if (!f.propagation_date || !f.produced_quantity) { setMsg('তারিখ ও পরিমাণ দিন'); setSaving(false); return; }
        if (!f.purchase_source) { setMsg('বিক্রেতার নাম দিন'); setSaving(false); return; }
        await api.post('/production/asexual', {
          seedling_id: sid, production_type: 'purchase', propagation_date: f.propagation_date,
          produced_quantity: Number(f.produced_quantity) || 0, success_quantity: Number(f.produced_quantity) || 0, failed_quantity: 0,
          remarks: `ক্রয় উৎস: ${f.purchase_source || '-'} | একক মূল্য: ৳${f.unit_price || 0}`,
        });
      } else {
        if (!f.propagation_date || !f.produced_quantity) { setMsg('তারিখ ও পরিমাণ দিন'); setSaving(false); return; }
        await api.post('/production/asexual', {
          seedling_id: sid, production_type: f.type, mother_plant_id: Number(f.mother_plant_id) || null,
          propagation_date: f.propagation_date, produced_quantity: Number(f.produced_quantity) || 0,
          success_quantity: Number(f.success_quantity) || 0,
          failed_quantity: (Number(f.produced_quantity) || 0) - (Number(f.success_quantity) || 0), remarks: f.remarks,
        });
      }
      onClose(); onSaved && onSaved();
    } catch (e) { setMsg(e?.response?.data?.message || e?.response?.data?.error || 'সার্ভার সমস্যা'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={f.id ? 'উৎপাদন ব্যাচ এডিট' : 'নতুন উৎপাদন ব্যাচ'} wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ধরন">
            <select className="field-input" value={f.type} disabled={Boolean(f.id)} onChange={(e)=>setF({ type:e.target.value })}>
              {TYPES.map((t)=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </Field>
          <Field label="চারা*">
            <select className="field-input" value={f.seedling_id} onChange={(e)=>setF({ seedling_id:e.target.value })}>
              <option value="">— বাছাই করুন —</option>
              {seedlings.map((s)=><option key={s.id} value={s.id}>{s.name_bn}{s.variety?` (${s.variety})`:''}</option>)}
            </select>
          </Field>
        </div>

        {f.type === 'seed' && (<>
          <div className="grid grid-cols-2 gap-3">
            <Field label="বীজের উৎস"><input className="field-input" value={f.seed_source} onChange={(e)=>setF({ seed_source:e.target.value })} /></Field>
            <Field label="বীজ সংখ্যা"><input type="text" inputMode="decimal" className="field-input" value={f.seed_quantity} onChange={(e)=>setF({ seed_quantity:e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="বপন তারিখ*"><input type="date" className="field-input" value={f.sowing_date} onChange={(e)=>setF({ sowing_date:e.target.value })} /></Field>
            <Field label="উৎপাদিত পরিমাণ*"><input type="text" inputMode="decimal" className="field-input" value={f.produced_quantity} onChange={(e)=>setF({ produced_quantity:e.target.value })} /></Field>
          </div>
        </>)}

        {f.type !== 'seed' && f.type !== 'purchase' && (<>
          <div className="grid grid-cols-2 gap-3">
            <Field label="মাতৃ গাছ">
              <select className="field-input" value={f.mother_plant_id} onChange={(e)=>setF({ mother_plant_id:e.target.value })}>
                <option value="">— ঐচ্ছিক —</option>
                {mothers.map((m)=><option key={m.id} value={m.id}>{m.mp_code} — {m.variety}</option>)}
              </select>
            </Field>
            <Field label="তারিখ*"><input type="date" className="field-input" value={f.propagation_date} onChange={(e)=>setF({ propagation_date:e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="উৎপাদিত পরিমাণ*"><input type="text" inputMode="decimal" className="field-input" value={f.produced_quantity} onChange={(e)=>setF({ produced_quantity:e.target.value })} /></Field>
            <Field label="সফল পরিমাণ"><input type="text" inputMode="decimal" className="field-input" value={f.success_quantity} onChange={(e)=>setF({ success_quantity:e.target.value })} /></Field>
          </div>
        </>)}

        {f.type === 'purchase' && (<>
          <div className="grid grid-cols-2 gap-3">
            <Field label="তারিখ*"><input type="date" className="field-input" value={f.propagation_date} onChange={(e)=>setF({ propagation_date:e.target.value })} /></Field>
            <Field label="পরিমাণ*"><input type="text" inputMode="decimal" className="field-input" value={f.produced_quantity} onChange={(e)=>setF({ produced_quantity:e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="বিক্রেতা / উৎস*"><input className="field-input" value={f.purchase_source} onChange={(e)=>setF({ purchase_source:e.target.value })} /></Field>
            <Field label="একক মূল্য (৳)"><input type="text" inputMode="decimal" className="field-input" value={f.unit_price} onChange={(e)=>setF({ unit_price:e.target.value })} /></Field>
          </div>
        </>)}

        {f.type !== 'purchase' && <Field label="মন্তব্য"><textarea rows={2} className="field-input" value={f.remarks} onChange={(e)=>setF({ remarks:e.target.value })} /></Field>}

        {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{ borderColor:'var(--bd)' }}>বাতিল</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}</button>
        </div>
      </div>
    </Modal>
  );
}
function Field({ label, children }) { return <div><label className="field-label">{label}</label>{children}</div>; }
