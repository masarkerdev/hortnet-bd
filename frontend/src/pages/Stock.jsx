import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { toBn, money } from '../lib/format';
import { IcSearch } from '../components/icons';

export default function Stock() {
  const [all, setAll] = useState([]);
  const [cats, setCats] = useState([]);
  const [search, setSearch] = useState('');
  const [catF, setCatF] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stock').then((r) => setAll(r.data?.data || [])).catch(() => {}).finally(() => setLoading(false));
    api.get('/categories').then((r) => setCats(r.data?.data || [])).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return all.filter((x) =>
      (!s || (x.name_bn||'').toLowerCase().includes(s) || (x.variety||'').toLowerCase().includes(s) || (x.seedling_code||'').toLowerCase().includes(s)) &&
      (!catF || String(x.category_id) === String(catF)));
  }, [all, search, catF]);

  const tot = useMemo(() => ({
    stock: rows.reduce((s,x)=>s+(+x.current_stock||0),0),
    value: rows.reduce((s,x)=>s+((+x.current_stock||0)*(+x.unit_price||0)),0),
    low: rows.filter((x)=>x.is_low_stock).length,
  }), [rows]);

  function exportCSV() {
    const hdrs = ['চারা','প্রারম্ভিক','উৎপাদিত','মোট ইন','বিক্রয়','ক্ষতি','স্টক','মূল্য'];
    const data = rows.map((x)=>{
      const inn = (x.opening_balance||0)+(x.total_produced||0);
      return [x.name_bn, x.opening_balance||0, x.total_produced||0, inn, x.total_sale||0, x.total_damage||0, x.current_stock||0, (x.current_stock||0)*(x.unit_price||0)];
    });
    const csv = [hdrs.join(','), ...data.map((r)=>r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stock_report.csv'; a.click();
  }

  return (
    <div className="space-y-4">
      {/* টুলবার */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <p className="text-[13px]" style={{ color:'var(--tm)' }}>স্বয়ংক্রিয় স্টক হিসাব</p>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium" style={{ borderColor:'var(--bd)' }}>🖨 প্রিন্ট</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium" style={{ borderColor:'var(--bd)' }}>⬇ CSV</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="চারা খুঁজুন..." className="field-input pl-9 w-full" />
        </div>
        <select value={catF} onChange={(e)=>setCatF(e.target.value)} className="field-input" style={{ width: 180 }}>
          <option value="">সব ক্যাটাগরি</option>
          {cats.map((c)=><option key={c.id} value={c.id}>{c.name_bn}</option>)}
        </select>
      </div>

      {/* legend সূত্র বার */}
      <div className="cd flex flex-wrap items-center gap-2 no-print">
        <Pill bg="var(--g50)" fg="var(--g600)">প্রারম্ভিক</Pill>
        <Op>+</Op>
        <Pill bg="var(--g50)" fg="var(--g600)">উৎপাদন</Pill>
        <Op>−</Op>
        <Pill bg="var(--c50)" fg="var(--c400)">বিক্রয়</Pill>
        <Op>−</Op>
        <Pill bg="var(--a50)" fg="var(--a400)">ক্ষতি</Pill>
        <Op>=</Op>
        <span style={{ background:'var(--g400)', color:'#fff', padding:'6px 14px', borderRadius:6, fontWeight:700, fontSize:13 }}>পাওয়া স্টক</span>
      </div>

      <div id="print-area" className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr>
            <th>চারা</th><th>প্রারম্ভিক</th><th>উৎপাদিত</th><th>মোট ইন</th><th>বিক্রয় (-)</th><th>ক্ষতি (-)</th><th>বর্তমান স্টক</th><th>মূল্য (৳)</th><th>অবস্থা</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="lt">লোড হচ্ছে…</td></tr> :
             rows.length === 0 ? <tr><td colSpan={9} className="lt">কোনো ফলাফল নেই</td></tr> :
             rows.map((s) => {
               const totalIn = (s.opening_balance || 0) + (s.total_produced || 0);
               return (
                 <tr key={s.id}>
                   <td><strong>{s.name_bn}</strong>{s.variety && <div className="text-[12px]" style={{ color:'var(--tm)' }}>{s.variety}</div>}</td>
                   <td style={{ color:'var(--b600)', fontWeight:600 }}>{s.opening_balance > 0 ? toBn(s.opening_balance) : <span style={{ color:'var(--tm)' }}>—</span>}</td>
                   <td style={{ color:'var(--g600)' }}>+{toBn(s.total_produced || 0)}</td>
                   <td style={{ color:'var(--g600)', fontWeight:600 }}>+{toBn(totalIn)}</td>
                   <td style={{ color:'var(--c400)' }}>-{toBn(s.total_sale || 0)}</td>
                   <td style={{ color:'var(--a400)' }}>-{toBn(s.total_damage || 0)}</td>
                   <td><strong style={{ color: s.is_low_stock ? 'var(--c400)' : 'var(--g600)' }}>{toBn(s.current_stock)}</strong></td>
                   <td>{money(s.current_stock * s.unit_price)}</td>
                   <td>{s.is_low_stock ? <span className="b br">সংকটজনক</span> : <span className="b bg">ভালো</span>}</td>
                 </tr>
               );
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Pill({ bg, fg, children }) { return <span style={{ background:bg, color:fg, padding:'6px 14px', borderRadius:6, fontWeight:600, fontSize:13 }}>{children}</span>; }
function Op({ children }) { return <span style={{ fontSize:18, color:'var(--tm)' }}>{children}</span>; }
