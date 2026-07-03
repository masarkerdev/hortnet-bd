import { useCallback, useEffect, useMemo, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, dateBn } from '../lib/format';
import { IcPlus, IcEdit, IcTrash } from '../components/icons';
import BatchModal, { MN } from '../components/BatchModal';

const TABS = [
  { k:'seed', label:'বীজ উৎপাদন', icon:'🌱' },
  { k:'asexual', label:'অঙ্গজ বংশবিস্তার', icon:'🌿' },
  { k:'purchase', label:'ক্রয়', icon:'🛒' },
];

export default function Production() {
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('seed');
  const [seedlings, setSeedlings] = useState([]);
  const [mothers, setMothers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => { api.get('/production').then((r) => setAll(r.data?.data || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/seedlings?limit=500').then((r) => setSeedlings(r.data?.data || [])).catch(() => {});
    api.get('/mother-plants').then((r) => setMothers(r.data?.data || [])).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const total = all.length;
    const active = all.filter((x) => x.status === 'active').length;
    const sold = all.filter((x) => x.status === 'sold_out').length;
    const avg = all.length ? all.reduce((s, x) => s + (+(x.success_percent || x.germination_percent || 0)), 0) / all.length : 0;
    return { total, active, sold, avg: avg.toFixed(1) };
  }, [all]);

  const seed = all.filter((x) => x.production_type === 'seed');
  const asex = all.filter((x) => x.production_type !== 'seed' && x.production_type !== 'purchase');
  const purch = all.filter((x) => x.production_type === 'purchase');

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(b) { setEditing(b); setOpen(true); }
  async function del(b) {
    if (!(await confirm({ title: `ব্যাচ ${b.batch_code} ডিলেট করবেন?` }))) return;
    try { await api.delete('/production-batches/' + b.id); load(); } catch (e) { alert(e?.response?.data?.message || 'ডিলেট করতে সমস্যা'); }
  }
  const actions = (b) => (
    <div className="flex gap-1.5">
      <button className="act-btn act-edit" onClick={()=>openEdit(b)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
      <button className="act-btn act-del" onClick={()=>del(b)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat l="মোট ব্যাচ" v={toBn(stats.total)} fg="var(--g600)" />
        <Stat l="সক্রিয়" v={toBn(stats.active)} fg="var(--t600)" />
        <Stat l="বিক্রি হয়ে গেছে" v={toBn(stats.sold)} fg="var(--a400)" />
        <Stat l="গড় সফলতা" v={toBn(stats.avg) + '%'} fg="var(--b600)" />
      </div>

      <div className="flex items-center">
        <button onClick={openNew} className="btn-primary ml-auto"><IcPlus className="h-4 w-4" /> নতুন উৎপাদন</button>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl border p-1.5" style={{ borderColor:'var(--bd)', background:'var(--g50)' }}>
        {TABS.map((t) => (
          <button key={t.k} onClick={()=>setTab(t.k)} className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold transition"
            style={tab===t.k ? { background:'var(--g600)', color:'#fff' } : { background:'#fff', color:'var(--g800)' }}>
            <span style={{ fontSize:18 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="cd !p-0 overflow-x-auto">
        {tab === 'seed' && (
          <table className="tbl">
            <thead><tr><th>ব্যাচ কোড</th><th>চারা</th><th>বীজ সংখ্যা</th><th>বপন তারিখ</th><th>উৎপাদিত</th><th>ব্যর্থ</th><th>অঙ্কুরোদগম%</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead>
            <tbody>{seed.length ? seed.map((b)=>(
              <tr key={b.id}>
                <td><strong style={{ color:'var(--g600)' }}>{b.batch_code}</strong></td>
                <td><strong>{b.seedling_bn || '-'}</strong>{b.seedling_variety && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{b.seedling_variety}</div>}</td>
                <td>{b.seed_quantity ? toBn(b.seed_quantity) : '-'}</td>
                <td>{dateBn(b.sowing_date)}</td>
                <td>{toBn(b.produced_quantity)}</td>
                <td>{toBn(Math.max(0,(b.seed_quantity||0)-(b.produced_quantity||0)))}</td>
                <td><span className={`b ${(+b.germination_percent||0)>=75?'bg':'ba'}`}>{b.germination_percent ? toBn(b.germination_percent) : '-'}%</span></td>
                <td><span className="b bg">{b.status}</span></td>
                <td>{actions(b)}</td>
              </tr>
            )) : <tr><td colSpan={9} className="lt">বীজ উৎপাদন নেই</td></tr>}</tbody>
          </table>
        )}
        {tab === 'asexual' && (
          <table className="tbl">
            <thead><tr><th>ব্যাচ কোড</th><th>চারা</th><th>ধরন</th><th>মাতৃ জাত</th><th>তারিখ</th><th>সফল</th><th>ব্যর্থ</th><th>সফলতা%</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead>
            <tbody>{asex.length ? asex.map((b)=>(
              <tr key={b.id}>
                <td><strong style={{ color:'var(--g600)' }}>{b.batch_code}</strong></td>
                <td><strong>{b.seedling_bn || '-'}</strong>{b.seedling_variety && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{b.seedling_variety}</div>}</td>
                <td><span className="b bt">{MN[b.production_type] || b.production_type}</span></td>
                <td>{b.mother_variety || '-'}</td>
                <td>{dateBn(b.propagation_date || b.created_at)}</td>
                <td>{toBn(b.success_quantity)}</td>
                <td>{toBn(b.failed_quantity)}</td>
                <td><span className={`b ${(+b.success_percent||0)>=75?'bg':'ba'}`}>{b.success_percent ? toBn(b.success_percent) : '-'}%</span></td>
                <td><span className="b bg">{b.status}</span></td>
                <td>{actions(b)}</td>
              </tr>
            )) : <tr><td colSpan={10} className="lt">অঙ্গজ উৎপাদন নেই</td></tr>}</tbody>
          </table>
        )}
        {tab === 'purchase' && (
          <table className="tbl">
            <thead><tr><th>ব্যাচ কোড</th><th>চারা</th><th>উৎস</th><th>তারিখ</th><th>পরিমাণ</th><th>ব্যর্থ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead>
            <tbody>{purch.length ? purch.map((b)=>{
              const src = (b.remarks || '').replace(/ক্রয় উৎস: /,'').split(' | ')[0];
              return (
                <tr key={b.id}>
                  <td><strong style={{ color:'var(--g600)' }}>{b.batch_code}</strong></td>
                  <td><strong>{b.seedling_bn || '-'}</strong>{b.seedling_variety && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{b.seedling_variety}</div>}</td>
                  <td>{src || '-'}</td>
                  <td>{dateBn(b.propagation_date || b.created_at)}</td>
                  <td><strong>{toBn(b.produced_quantity)}</strong></td>
                  <td>{toBn(b.failed_quantity || 0)}</td>
                  <td><span className="b bg">{b.status}</span></td>
                  <td>{actions(b)}</td>
                </tr>
              );
            }) : <tr><td colSpan={8} className="lt">ক্রয়ের রেকর্ড নেই</td></tr>}</tbody>
          </table>
        )}
      </div>

      <BatchModal open={open} onClose={()=>setOpen(false)} seedlings={seedlings} mothers={mothers} batch={editing} onSaved={load} />
    </div>
  );
}
function Stat({ l, v, fg }) { return <div className="sc"><div className="sl">{l}</div><div className="sv" style={{ color: fg }}>{v}</div></div>; }
