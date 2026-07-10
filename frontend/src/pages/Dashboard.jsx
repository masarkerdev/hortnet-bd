import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../lib/api';
import { toBn, money, dateBn } from '../lib/format';
import { IcLeaf, IcBox, IcSun, IcReceipt, IcCoin, IcAlert, IcRocket } from '../components/icons';

const MN = { seed:'বীজ', cutting:'কাটিং', layering:'লেয়ারিং', grafting:'গ্রাফটিং', budding:'বাডিং', tissue_culture:'টিস্যু কালচার', purchase:'ক্রয়' };
const BN_MON = { Jan:'জান', Feb:'ফেব', Mar:'মার্চ', Apr:'এপ্রি', May:'মে', Jun:'জুন', Jul:'জুলা', Aug:'আগ', Sep:'সেপ্ট', Oct:'অক্টো', Nov:'নভে', Dec:'ডিসে' };
const CAT_COLORS = ['var(--g400)','var(--t400)','var(--a200)','var(--c400)','var(--b400)'];


const PRI_COLOR_D = { urgent:'#ef4444', important:'#f59e0b', normal:'#3b82f6' };

function useCountdown(target) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    function update() {
      const diff = new Date(target) - new Date();
      if (diff <= 0) { setLeft('মেয়াদ শেষ'); return; }
      const d = Math.floor(diff/86400000);
      const h = Math.floor((diff%86400000)/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      const bn = n => String(n).replace(/[0-9]/g, x=>'০১২৩৪৫৬৭৮৯'[x]);
      if (d>0) setLeft(`${bn(d)}দিন ${bn(h)}ঘণ্টা ${bn(m)}মি`);
      else if (h>0) setLeft(`${bn(h)}ঘণ্টা ${bn(m)}মি ${bn(s)}সে`);
      else setLeft(`${bn(m)}মি ${bn(s)}সে`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

function NoticeTickerWidget({ notices }) {
  if (!notices || !notices.length) return null;
  // সবচেয়ে কম expire সময়ের নোটিশ
  const sorted = [...notices].filter(n=>n.expires_at).sort((a,b)=>new Date(a.expires_at)-new Date(b.expires_at));
  const top = sorted[0] || notices[0];
  const countdown = useCountdown(top?.expires_at);
  const col = PRI_COLOR_D[top?.priority]||PRI_COLOR_D.normal;

  return (
    <div style={{ background:`${col}11`, border:`1px solid ${col}33`, borderLeft:`4px solid ${col}`, borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:12, overflow:'hidden' }}>
      <i className="ti ti-speakerphone" style={{ color:col, fontSize:16, flexShrink:0 }}/>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ overflow:'hidden', whiteSpace:'nowrap' }}>
          <span style={{
            display:'inline-block',
            fontSize:14, fontWeight:600, color:'var(--tp)',
            animation:'ticker 15s linear infinite',
          }}>{top?.title}</span>
        </div>
        <style>{`@keyframes ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }`}</style>
      </div>
      {countdown && (
        <div style={{ flexShrink:0, fontSize:12, fontWeight:700, color:col, background:`${col}22`, padding:'4px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
          ⏰ {countdown}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { fy } = useOutletContext();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [monthly, setMonthly] = useState([]);
  const [cats, setCats] = useState([]);
  const [low, setLow] = useState([]);
  const [acts, setActs] = useState([]);
  const [fyData, setFyData] = useState(null);
  const [notices, setNotices] = useState([]);

  const priColor = { urgent:'#f85149', important:'#e3b341', normal:'#58a6ff' };
  const priLabel = { urgent:'🔴 জরুরি', important:'🟡 গুরুত্বপূর্ণ', normal:'🔵 সাধারণ' };

  useEffect(() => {
    api.get('/notices').then(r => { if (r.data?.success) setNotices(r.data.data||[]); }).catch(()=>{});
  }, []);

  useEffect(() => {
    let ok = true;
    api.get('/dashboard/stats').then((r) => ok && setD(r.data.data)).catch((e) => ok && setErr(e?.response?.data?.message || 'তথ্য আনা যায়নি'));
    api.get('/reports/monthly-production').then((r) => ok && setMonthly(r.data?.data || [])).catch(() => {});
    api.get('/reports/sales-by-category').then((r) => ok && setCats(r.data?.data || [])).catch(() => {});
    api.get('/seedlings/low-stock').then((r) => ok && setLow(r.data?.data || [])).catch(() => {});
    Promise.all([api.get('/sales?limit=3').catch(() => ({ data:{} })), api.get('/production?limit=3').catch(() => ({ data:{} }))])
      .then(([sa, pr]) => {
        if (!ok) return;
        const a = [];
        (sa.data?.data || []).forEach((x) => a.push({ time: dateBn(x.sale_date), txt: `চালান ${x.invoice_no} — ${x.customer_name || '-'} — ${money(x.total_amount)}`, mod: 'বিক্রয়', st: 'paid', user: x.created_by_name || '—' }));
        (pr.data?.data || []).forEach((x) => a.push({ time: dateBn(x.created_at), txt: `ব্যাচ ${x.batch_code} — ${x.seedling_bn || '-'} (${toBn(x.produced_quantity)}টি)`, mod: 'উৎপাদন', st: 'done', user: x.created_by_name || '—' }));
        setActs(a.slice(0, 5));
      });
    return () => { ok = false; };
  }, []);

  const loadFy = useCallback(() => {
    api.get('/reports/fiscal-achievement?fy=' + fy).then((r) => { if (r.data?.success) setFyData(r.data.data); }).catch(() => {});
  }, [fy]);
  useEffect(() => { loadFy(); }, [loadFy]);

  const [targetSummary, setTargetSummary] = useState(null);
  useEffect(() => {
    api.get('/reports/target-summary?fy=' + fy).then((r) => { if (r.data?.success) setTargetSummary(r.data); }).catch(() => {});
  }, [fy]);

  if (err) return <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor:'var(--r400)', background:'var(--r50)', color:'var(--r600)' }}>{err}</div>;
  if (!d) return <div className="lt">লোড হচ্ছে…</div>;

  const STAT = [
    { l:'চারার ধরন', v: toBn(d.seedling_types), s:'প্রকার নিবন্ধিত', Icon:IcLeaf, bg:'var(--g50)', fg:'var(--g600)' },
    { l:'মোট স্টক', v: toBn(d.total_stock), s:'টি চারা/কলম', Icon:IcBox, bg:'var(--t50)', fg:'var(--t600)' },
    { l:'মোট উৎপাদন', v: toBn(d.today_production), s:'টি চারা/কলম', Icon:IcSun, bg:'var(--a50)', fg:'var(--a400)' },
    { l:'আজকের বিক্রয়', v: money(d.today_revenue_all != null ? d.today_revenue_all : ((d.today_revenue||0) + (d.today_income||0))), s:`${toBn(d.today_invoices)}টি চালান + অন্যান্য আয়`, Icon:IcReceipt, bg:'var(--c50)', fg:'var(--c400)' },
    { l:'মোট রাজস্ব আদায়', v: money(d.total_revenue_all != null ? d.total_revenue_all : ((d.sales_revenue != null ? d.sales_revenue : (d.monthly_revenue||0)) + (d.other_income_total||0))), s:'চারা/কলম + অন্যান্য আয়', Icon:IcCoin, bg:'var(--b50)', fg:'var(--b600)' },
  ];

  const pd = (monthly.length ? monthly : [{ month_name:'এই মাস', seed_qty:d.today_production||0, asexual_qty:0 }])
    .map((r) => ({ m: BN_MON[r.month_name] || r.month_name, s:+r.seed_qty||0, a:+r.asexual_qty||0 }));
  const mx = Math.max(...pd.map((x) => x.s + x.a), 1);

  const activeCats = cats.filter((c) => parseFloat(c.total_sales) > 0);

  return (
    <div className="space-y-4 dash-hover">
      {/* নোটিশ — সবচেয়ে কম expire সময়ের, horizontal scroll + countdown */}
      <NoticeTickerWidget notices={notices}/>
      {/* ক্যাটাগরি লক্ষ্যমাত্রা vs অর্জিত */}
      {targetSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ borderColor:'var(--g200)', background:'#fff', borderTop:'3px solid var(--g600)' }}>
            <div className="text-xs" style={{ color:'var(--muted)' }}>মোট লক্ষ্যমাত্রা</div>
            <div className="text-2xl font-bold" style={{ color:'var(--g600)' }}>{toBn(targetSummary.target)} <span className="text-sm font-medium">টি চারা/কলম</span></div>
            <div className="text-xs mt-1" style={{ color:'var(--muted)' }}>({targetSummary.fy} অর্থবছরে)</div>
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor:'var(--a200)', background:'#fff', borderTop:'3px solid var(--a400)' }}>
            <div className="text-xs" style={{ color:'var(--muted)' }}>অর্জিত</div>
            <div className="text-2xl font-bold" style={{ color:'var(--a400)' }}>{toBn(targetSummary.achieved)} <span className="text-sm font-medium">টি চারা/কলম</span></div>
            <div className="text-xs mt-1" style={{ color:'var(--muted)' }}>এখন অব্দি</div>
          </div>
        </div>
      )}
      {/* ৫ স্ট্যাট কার্ড */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STAT.map((c) => (
          <div className="sc" key={c.l}>
            <div className="si" style={{ background: c.bg }}><c.Icon className="h-[18px] w-[18px]" style={{ color: c.fg }} /></div>
            <div className="sl">{c.l}</div>
            <div className="sv">{c.v}</div>
            <div className="ss2">{c.s}</div>
            {c.extra}
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="cd">
          <div className="cdt">🎯 অর্থবছর লক্ষ্যমাত্রা বনাম অর্জন</div>
          <FyAchievement data={fyData} />
        </div>
        <div className="cd">
          <div className="cdt">মাসিক উৎপাদন <span>বীজ ও অঙ্গজ</span></div>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {pd.map((x, i) => {
              const sh = Math.max(Math.round((x.s / mx) * 96), x.s ? 3 : 0);
              const ah = Math.max(Math.round((x.a / mx) * 96), x.a ? 3 : 0);
              return (
                <div className="bcl" key={i}>
                  <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: 96 }}>
                    <div className="flex flex-1 flex-col items-center justify-end">
                      {x.s > 0 && <div className="mb-0.5 text-[9px] font-semibold leading-none" style={{ color:'var(--g600)' }}>{toBn(x.s)}</div>}
                      <div className="bar w-full" style={{ height: sh, background:'var(--g400)' }} title={`বীজ: ${toBn(x.s)}`} />
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-end">
                      {x.a > 0 && <div className="mb-0.5 text-[9px] font-semibold leading-none" style={{ color:'var(--t600)' }}>{toBn(x.a)}</div>}
                      <div className="bar w-full" style={{ height: ah, background:'var(--t400)' }} title={`অঙ্গজ: ${toBn(x.a)}`} />
                    </div>
                  </div>
                  <div className="brlbl">{x.m}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[11px]" style={{ color:'var(--tm)' }}>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background:'var(--g400)' }} />বীজ</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background:'var(--t400)' }} />অঙ্গজ</span>
          </div>
        </div>
        <div className="cd">
          <div className="cdt">বিক্রয় - ক্যাটাগরি অনুযায়ী</div>
          {activeCats.length === 0 ? (
            <div className="flex items-center gap-4">
              <Ring segments={[]} label="বিক্রয়" />
              <div className="text-[13px]" style={{ color:'var(--tm)' }}>বিক্রয় ডেটা নেই</div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Ring segments={activeCats.map((c, i) => ({ pct: parseFloat(c.percent) || 0, color: CAT_COLORS[i % CAT_COLORS.length] }))} label="বিক্রয়" />
              <div>
                {activeCats.map((c, i) => (
                  <div className="dli" key={i}><span className="dld" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />{c.category} — {toBn(c.percent)}%</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="cd">
          <div className="cdt">⚠ কম স্টক সতর্কতা <span style={{ color:'var(--c400)' }}>{toBn(d.low_stock_count)}টি</span></div>
          {(!low.length) ? <div className="text-[12px]" style={{ color:'var(--g600)' }}>সব স্টক ঠিক আছে ✅</div> :
            low.map((s) => <div className="ai" key={s.id}><IcAlert className="mt-[1px] h-4 w-4 shrink-0" /><div><strong>{s.name_bn}</strong> — মাত্র {toBn(s.current_stock)}টি বাকি</div></div>)}
        </div>
        <div className="cd">
          <div className="cdt">উৎপাদন সাফল্যের হার</div>
          {(d.success_rates?.length) ? d.success_rates.map((r, i) => {
            const col = { seed:'var(--g400)', grafting:'var(--t400)', cutting:'var(--a200)', budding:'var(--b400)' }[r.production_type] || 'var(--g400)';
            return (
              <div key={i} className="mb-3">
                <div className="mb-1 flex justify-between text-[12px]"><span>{MN[r.production_type] || r.production_type}</span><strong>{toBn(r.avg_success_percent)}%</strong></div>
                <div className="pb"><div className="pf" style={{ width: `${r.avg_success_percent}%`, background: col }} /></div>
              </div>
            );
          }) : <div className="text-[12px]" style={{ color:'var(--tm)', padding:'10px' }}>এখনো ডেটা নেই</div>}
        </div>
        <div className="cd flex flex-col items-center justify-center text-center">
          <IcRocket className="h-10 w-10" style={{ color:'var(--a200)' }} />
          <div className="mt-2 font-semibold">নতুন ফিচার আসছে</div>
          <div className="text-[12px]" style={{ color:'var(--tm)' }}>New Feature Coming Soon</div>
        </div>
      </div>

      {/* Row 3 — সাম্প্রতিক কার্যক্রম */}
      <div className="cd">
        <div className="cdt">সাম্প্রতিক কার্যক্রম <span>সর্বশেষ ৫টি</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color:'var(--tm)' }} className="text-left">
                <th className="py-2 pr-4 font-medium">সময়</th><th className="py-2 pr-4 font-medium">কার্যক্রম</th>
                <th className="py-2 pr-4 font-medium">মডিউল</th><th className="py-2 pr-4 font-medium">ব্যবহারকারী</th><th className="py-2 font-medium">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {acts.length ? acts.map((a, i) => (
                <tr key={i} className="border-t" style={{ borderColor:'var(--bd)' }}>
                  <td className="py-2.5 pr-4" style={{ color:'var(--tm)' }}>{a.time}</td>
                  <td className="py-2.5 pr-4">{a.txt}</td>
                  <td className="py-2.5 pr-4"><span className="tag">{a.mod}</span></td>
                  <td className="py-2.5 pr-4 text-[12px]" style={{ color:'var(--tp)' }}>{a.user}</td>
                  <td className="py-2.5"><span className={`b ${a.st === 'paid' ? 'bg' : 'bt'}`}>{a.st === 'paid' ? 'পরিশোধিত' : 'সম্পন্ন'}</span></td>
                </tr>
              )) : <tr><td colSpan={5} className="lt">ডেটা নেই</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const BN_MONTHS_FULL = ['', 'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
function FyAchievement({ data }) {
  if (!data) return <div className="lt">লোড হচ্ছে…</div>;
  const p = data.production || { target:0, actual:0 };
  const cm = data.current_month || { month: new Date().getMonth()+1, target:0, actual:0 };
  const pPct = p.target > 0 ? Math.min(Math.round((p.actual / p.target) * 100), 100) : 0;
  const pColor = pPct >= 100 ? '#3B6D11' : pPct >= 70 ? '#4A9B6F' : pPct >= 40 ? '#E8A838' : '#E24B4A';
  const mPct = cm.target > 0 ? Math.min(Math.round((cm.actual / cm.target) * 100), 100) : 0;
  return (
    <div className="rounded-[10px] p-4" style={{ background:'var(--g50)' }}>
      <div className="mb-3 text-[12px] font-semibold" style={{ color:'var(--g600)' }}>🌱 উৎপাদন লক্ষ্যমাত্রা</div>
      <div className="grid items-center gap-4" style={{ gridTemplateColumns:'1fr 1px 1fr' }}>
        {/* বাম: বার্ষিক */}
        <div className="flex items-center gap-3">
          <Donut pct={pPct} color={pColor} />
          <div className="text-[12px]">
            <div className="mb-1 text-[10px] font-semibold" style={{ color:'var(--tm)' }}>বার্ষিক লক্ষ্যমাত্রা</div>
            <div style={{ color:'var(--tm)' }}><strong>{toBn(p.target)}টি</strong></div>
            <div style={{ color: pColor, fontWeight:600 }}>অর্জন: {toBn(p.actual)}টি</div>
            <div className="mt-0.5 text-[11px]" style={{ color:'var(--tm)' }}>{p.actual >= p.target && p.target > 0 ? '✅ অর্জিত!' : '⬇ বাকি: ' + toBn(Math.max(p.target - p.actual, 0)) + 'টি'}</div>
          </div>
        </div>
        {/* Divider */}
        <div style={{ background:'var(--bd)', height:80, width:1 }} />
        {/* ডান: চলতি মাস */}
        <div className="text-[12px]">
          <div className="mb-2 text-[10px] font-semibold" style={{ color:'var(--tm)' }}>চলতি মাস — {BN_MONTHS_FULL[cm.month] || ''}</div>
          {cm.target > 0 ? (
            <div>
              <div className="mb-1 flex justify-between"><span style={{ color:'var(--tm)' }}>নির্ধারিত:</span><strong>{toBn(cm.target)}টি</strong></div>
              <div className="mb-1.5 flex justify-between"><span style={{ color:'var(--tm)' }}>অর্জন:</span><strong style={{ color: cm.actual >= cm.target ? 'var(--g600)' : 'var(--c400)' }}>{toBn(cm.actual || 0)}টি</strong></div>
              <div style={{ height:8, background:'#e6e2d8', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width: mPct + '%', background: mPct >= 100 ? 'var(--g600)' : 'var(--g400)', borderRadius:4 }} />
              </div>
              <div className="mt-1 text-right text-[11px]" style={{ color:'var(--tm)' }}>{toBn(mPct)}%</div>
            </div>
          ) : (
            <div className="text-[11px]" style={{ color:'var(--tm)' }}>এই মাসের লক্ষ্যমাত্রা নির্ধারণ করা হয়নি</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Donut({ pct, color, size = 64 }) {
  const r = 15.9, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e6e2d8" strokeWidth="3.6" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 18 18)" />
      <text x="18" y="20.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{toBn(pct)}%</text>
    </svg>
  );
}

function Ring({ segments, label, size = 96 }) {
  let offset = 25;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="shrink-0">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eee8dd" strokeWidth="3.8" />
      {segments.map((sg, i) => {
        const el = <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={sg.color} strokeWidth="3.8"
          strokeDasharray={`${sg.pct} ${100 - sg.pct}`} strokeDashoffset={-offset + 25} />;
        offset += sg.pct;
        return el;
      })}
      <text x="18" y="20" textAnchor="middle" fontSize="5" fontWeight="600" fill="var(--tp)">{label}</text>
    </svg>
  );
}
