import { useCallback, useEffect, useMemo, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, dateBn } from '../lib/format';
import { IcPlus, IcSearch, IcEdit, IcTrash } from '../components/icons';
import BatchModal, { MN } from '../components/BatchModal';

const STATUS_BADGE = {
  active: { t:'সক্রিয়', c:'bg' }, partial: { t:'আংশিক', c:'ba' },
  sold_out: { t:'বিক্রি শেষ', c:'br' }, closed: { t:'বন্ধ', c:'' },
};
const STATUS_OPTS = [['','সব অবস্থা'],['active','সক্রিয়'],['partial','আংশিক'],['sold_out','বিক্রি শেষ'],['closed','বন্ধ']];

export default function BatchManagement() {
  const [all, setAll] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
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

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return all.filter((x) =>
      (!s || (x.batch_code || '').toLowerCase().includes(s) || (x.seedling_bn || '').toLowerCase().includes(s)) &&
      (!status || x.status === status));
  }, [all, search, status]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((x) => x.status === 'active').length;
    const sold = rows.filter((x) => x.status === 'sold_out').length;
    const avg = rows.length ? rows.reduce((s, x) => s + (+(x.success_percent || x.germination_percent || 0)), 0) / rows.length : 0;
    return { total, active, sold, avg: avg.toFixed(1) };
  }, [rows]);

  async function del(b) {
    if (!(await confirm({ title: `ব্যাচ ${b.batch_code} ডিলেট করবেন?` }))) return;
    try { await api.delete('/production-batches/' + b.id); load(); } catch (e) { alert(e?.response?.data?.message || 'ডিলেট করতে সমস্যা'); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat l="মোট ব্যাচ" v={toBn(stats.total)} fg="var(--g600)" />
        <Stat l="সক্রিয়" v={toBn(stats.active)} fg="var(--t600)" />
        <Stat l="বিক্রি হয়ে গেছে" v={toBn(stats.sold)} fg="var(--a400)" />
        <Stat l="গড় সফলতা" v={toBn(stats.avg) + '%'} fg="var(--b600)" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="ব্যাচ/চারা খুঁজুন..." className="field-input pl-9" style={{ width: 240 }} />
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="field-input" style={{ width: 160 }}>
          {STATUS_OPTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={()=>{ setEditing(null); setOpen(true); }} className="btn-primary ml-auto"><IcPlus className="h-4 w-4" /> নতুন ব্যাচ</button>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>ব্যাচ কোড</th><th>চারা</th><th>ধরন</th><th>তারিখ</th><th>উৎপাদিত</th><th>বর্তমান</th><th>বিক্রি</th><th>ব্যর্থ</th><th>সফলতা%</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((b) => {
              const dt = b.production_type === 'seed' ? b.sowing_date : b.propagation_date;
              const sp = b.success_percent || b.germination_percent || 0;
              const avail = b.available_quantity ?? b.produced_quantity;
              const sold = Math.max(0, b.produced_quantity - avail - (b.failed_quantity || 0));
              const sb = STATUS_BADGE[b.status] || { t:b.status, c:'' };
              return (
                <tr key={b.id}>
                  <td><strong style={{ color:'var(--g600)' }}>{b.batch_code}</strong></td>
                  <td><strong>{b.seedling_bn || '-'}</strong>{b.seedling_variety && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{b.seedling_variety}</div>}</td>
                  <td><span className="b bt">{MN[b.production_type] || b.production_type}</span></td>
                  <td>{dateBn(dt || b.created_at)}</td>
                  <td>{toBn(b.produced_quantity)}</td>
                  <td><strong style={avail <= 10 ? { color:'var(--c400)' } : undefined}>{toBn(avail)}</strong></td>
                  <td>{toBn(sold)}</td>
                  <td>{toBn(b.failed_quantity || 0)}</td>
                  <td><span className={`b ${(+sp)>=75?'bg':'ba'}`}>{sp ? toBn(sp) : '-'}%</span></td>
                  <td><span className={`b ${sb.c}`}>{sb.t}</span></td>
                  <td>
                    <div className="flex gap-1.5">
                      <button className="act-btn act-edit" onClick={()=>{ setEditing(b); setOpen(true); }} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                      <button className="act-btn act-del" onClick={()=>del(b)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                    </div>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={11} className="lt">কোনো ব্যাচ নেই</td></tr>}
          </tbody>
        </table>
      </div>

      <BatchModal open={open} onClose={()=>setOpen(false)} seedlings={seedlings} mothers={mothers} batch={editing} onSaved={load} />
    </div>
  );
}
function Stat({ l, v, fg }) { return <div className="sc"><div className="sl">{l}</div><div className="sv" style={{ color: fg }}>{v}</div></div>; }
