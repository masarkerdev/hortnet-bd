import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { toBn } from '../lib/format';
import { IcArchive, IcRefresh, IcLeaf, IcBox, IcSearch, IcEdit } from '../components/icons';

export default function OpeningStock() {
  const [stats, setStats] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [vals, setVals] = useState({});
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);

  function load() {
    api.get('/stock/opening-balance/stats').then((r)=>setStats(r.data?.data||null)).catch(()=>{});
    api.get('/seedlings?limit=500').then((r)=>setSeedlings(r.data?.data||[])).catch(()=>{});
  }
  useEffect(() => { load(); }, []);

  const ob = stats?.ob_map || {};
  const fyParts = (stats?.fy || '').split('-');
  const curLabel = fyParts.length===2 ? `${toBn(fyParts[0])}-${toBn(fyParts[1])}` : '';
  const prevLabel = fyParts.length===2 ? `${toBn(+fyParts[0]-1)}-${toBn(fyParts[0])}` : '';

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return seedlings.filter((x)=> !s || (x.name_bn||'').toLowerCase().includes(s) || (x.variety||'').toLowerCase().includes(s));
  }, [seedlings, search]);

  async function saveRow(id) {
    const v = vals[id];
    if (v === undefined || v === '') return;
    setSavingId(id);
    try { await api.put('/stock/opening-balance/'+id, { new_qty: Number(v)||0 }); setVals((m)=>({...m,[id]:''})); load(); }
    catch (e) { alert(e?.response?.data?.message || 'সেইভ সমস্যা'); } finally { setSavingId(null); }
  }

  const CARDS = stats ? [
    { l:'মোট প্রারম্ভিক স্টক', v:toBn(stats.total_opening)+'টি', s:'App চালু পূর্বের এন্ট্রি', Icon:IcArchive, bg:'var(--b50)', fg:'var(--b600)' },
    { l:'পূর্ববর্তী অর্থবছর', v:toBn(stats.prev_fy_stock)+'টি', s:'FY '+prevLabel, Icon:IcRefresh, bg:'var(--a50)', fg:'var(--a400)' },
    { l:'চলতি অর্থবছর', v:toBn(stats.cur_fy_stock)+'টি', s:'FY '+curLabel, Icon:IcLeaf, bg:'var(--g50)', fg:'var(--g600)' },
    { l:'মোট স্টক', v:toBn(stats.total_stock)+'টি', s:'সব মিলিয়ে বর্তমান', Icon:IcBox, bg:'var(--t50)', fg:'var(--t600)' },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARDS.map((c)=>(
          <div className="sc" key={c.l}>
            <div className="si" style={{ background:c.bg }}><c.Icon className="h-[18px] w-[18px]" style={{ color:c.fg }} /></div>
            <div className="sl">{c.l}</div>
            <div className="sv" style={{ color:c.fg }}>{c.v}</div>
            <div className="ss2">{c.s}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border px-4 py-3 text-[13px] flex gap-2" style={{ borderColor:'var(--a200)', background:'var(--a50)', color:'var(--a400)' }}>
        <span>ℹ️</span>
        <span><strong>প্রারম্ভিক স্টক এন্ট্রি</strong> — App চালু করার আগের stock এখানে যোগ করুন। প্রতিটি চারার পাশে পরিমাণ লিখে সেইভ বাটন চাপুন।</span>
      </div>

      <div className="cd !p-0">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid var(--bd)' }}>
          <strong className="text-[14px]">চারার তালিকা</strong>
          <div className="relative">
            <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="খুঁজুন..." className="field-input pl-9" style={{ width: 200 }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>চারার নাম</th><th>জাত</th><th>প্রারম্ভিক স্টক</th><th>বর্তমান স্টক</th><th>যোগ করুন</th><th>কার্যক্রম</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((s)=>{
                const cur = ob[s.id] || 0;
                return (
                  <tr key={s.id}>
                    <td><strong>{s.name_bn}</strong></td>
                    <td style={{ color:'var(--tm)' }}>{s.variety || '—'}</td>
                    <td style={{ color:'var(--b600)', fontWeight:600 }}>{cur>0 ? toBn(cur) : <span style={{ color:'var(--tm)' }}>—</span>}</td>
                    <td><strong>{toBn(s.current_stock)}টি</strong></td>
                    <td>
                      <input type="text" inputMode="decimal" className="field-input" style={{ width:110 }} placeholder="পরিমাণ"
                        value={vals[s.id] ?? ''} onChange={(e)=>setVals((m)=>({...m,[s.id]:e.target.value}))} />
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={()=>saveRow(s.id)} disabled={savingId===s.id} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white" style={{ background:'var(--g600)' }}>
                          {savingId===s.id ? '...' : '💾 সেইভ'}
                        </button>
                        <button onClick={()=>setVals((m)=>({...m,[s.id]: String(cur)}))} className="act-btn act-edit" title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className="lt">কোনো চারা নেই</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
