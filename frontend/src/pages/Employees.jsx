import { useEffect, useMemo, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { toBn, dateBn } from '../lib/format';
import Modal from '../components/Modal';
import { IcPlus, IcEdit, IcTrash, IcSearch, IcClipboard, IcUsers, IcCheck, IcAlert } from '../components/icons';

// প্রতি পদের নির্দিষ্ট গ্রেড (জাতীয় বেতন স্কেল ২০১৫) — official রিপোর্ট মিলিয়ে
const POST_GRADE = {
  'উপপরিচালক': ['৬ষ্ঠ', '৩৫৫০০-৬৭০১০'],
  'উদ্যানতত্ত্ববিদ': ['৯ম', '২২০০০-৫৩০৬০'],
  'নার্সারি তত্ত্বাবধায়ক': ['১০ম', '১৬০০০-৩৮৬৪০'],
  'উপসহকারী উদ্যান কর্মকর্তা': ['১০ম', '১৬০০০-৩৮৬৪০'],
  'উচ্চমান সহকারী কাম হিসাবরক্ষক': ['১৪তম', '১০২০০-২৪৬৮০'],
  'স্টোরকিপার': ['১৪তম', '১০২০০-২৪৬৮০'],
  'অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক': ['১৬তম', '৯৩০০-২২৪৯০'],
  'ড্রাইভার': ['১৬তম', '৯৩০০-২২৪৯০'],
  'ট্রাক্টর/পাওয়ার টিলার ড্রাইভার': ['১৬তম', '৯৩০০-২২৪৯০'],
  'অফিস সহায়ক': ['২০তম', '৮২৫০-২০০১০'],
  'নিরাপত্তা প্রহরী': ['২০তম', '৮২৫০-২০০১০'],
  'ফার্মলেবার': ['২০তম', '৮২৫০-২০০১০'],
  'কুক': ['২০তম', '৮২৫০-২০০১০'],
};
const GRADE_ORDER = ['১ম','২য়','৩য়','৪র্থ','৫ম','৬ষ্ঠ','৭ম','৮ম','৯ম','১০ম','১১তম','১২তম','১৩তম','১৪তম','১৫তম','১৬তম','১৭তম','১৮তম','১৯তম','২০তম'];

// সরকারি মঞ্জুরিকৃত পদ — ক্যাটাগরি অনুযায়ী (official নাম ও ক্রম)
const SANCTIONED_BY_CATEGORY = {
  A: [['উপপরিচালক',1],['উদ্যানতত্ত্ববিদ',1],['উপসহকারী উদ্যান কর্মকর্তা',4],['উচ্চমান সহকারী কাম হিসাবরক্ষক',1],['স্টোরকিপার',1],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['ড্রাইভার',1],['ট্রাক্টর/পাওয়ার টিলার ড্রাইভার',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',4],['ফার্মলেবার',16],['কুক',1]],
  B: [['উদ্যানতত্ত্ববিদ',1],['উপসহকারী উদ্যান কর্মকর্তা',3],['উচ্চমান সহকারী কাম হিসাবরক্ষক',1],['স্টোরকিপার',1],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['ড্রাইভার',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',3],['ফার্মলেবার',8],['কুক',1]],
  C: [['নার্সারি তত্ত্বাবধায়ক',1],['উপসহকারী উদ্যান কর্মকর্তা',2],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',2],['ফার্মলেবার',5]],
};
const CAT_HEAD = { A:'উপপরিচালক', B:'উদ্যানতত্ত্ববিদ', C:'নার্সারি তত্ত্বাবধায়ক' };
const CAT_OFFICE = { A:'উপপরিচালকের কার্যালয়', B:'উদ্যানতত্ত্ববিদের কার্যালয়', C:'নার্সারি তত্ত্বাবধায়কের কার্যালয়' };
const POSTING = { sanctioned:'মঞ্জুরীকৃত', deputation:'প্রেষণে' };
const CHARGE = { additional:'অতিরিক্ত দায়িত্ব', acting:'ভারপ্রাপ্ত দায়িত্ব', routine:'রুটিন দায়িত্ব', current:'চলতি দায়িত্ব' };
const EMPTY_P = { id:'', staff_type:'permanent', name_bn:'', name_en:'', designation:'', posting_type:'sanctioned', charge_type:'', charge_designation:'', employee_id:'', grade:'', prl_date:'', gender:'', join_date:'', nid:'', mobile:'', address:'', status:'active', notes:'' };
const EMPTY_T = { id:'', staff_type:'temporary', name_bn:'', name_en:'', worker_type:'নিয়মিত', gender:'', join_date:'', nid:'', mobile:'', address:'', status:'active', notes:'' };

function cfgCat() { try { return JSON.parse(localStorage.getItem('hc_cfg')||'{}').center_category; } catch { return null; } }
function gradeOf(designation) { return POST_GRADE[designation] || ['-','']; }
function fdate(d) { return d ? dateBn(d) : '-'; }

export default function Employees() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [center, setCenter] = useState(null);
  const [cat, setCat] = useState(cfgCat() || 'B');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState(()=>new Date().toISOString().slice(0,7));

  function load() { setLoading(true); api.get('/employees-info').then((r)=>setRows(r.data?.data||[])).catch(()=>{}).finally(()=>setLoading(false)); }
  useEffect(() => { load(); }, []);
  useEffect(() => { api.get('/center-info').then((r)=>{ const d=r.data?.data; if (d) { setCenter(d); if (d.category) setCat(d.category); } }).catch(()=>{}); }, []);

  const posts = SANCTIONED_BY_CATEGORY[cat] || SANCTIONED_BY_CATEGORY.B;
  const perm = useMemo(()=>rows.filter((e)=>e.staff_type!=='temporary'), [rows]);
  const temp = useMemo(()=>rows.filter((e)=>e.staff_type==='temporary'), [rows]);
  const activePerm = perm.filter((e)=>e.status==='active');
  const activeTemp = temp.filter((e)=>e.status==='active');
  const totalSanctioned = posts.reduce((s,[,n])=>s+n, 0);
  const vacancy = totalSanctioned - activePerm.length;
  const deputationCount = activePerm.filter((e)=>e.posting_type==='deputation').length;

  const summary = useMemo(() => posts.map(([designation, sanctioned]) => {
    const actual = activePerm.filter((e)=>e.designation===designation).length;
    const vac = sanctioned - actual;
    let badge, color;
    if (vac === 0) { badge='✅ পূর্ণ'; color='var(--g600)'; }
    else if (actual === 0) { badge='🔴 শূন্য পদ'; color='var(--c400)'; }
    else if (vac > 0) { badge=`⚠️ ${toBn(vac)} শূন্য`; color='var(--a400)'; }
    else { badge=`⚠️ ${toBn(Math.abs(vac))} জন প্রেষণে`; color='var(--a400)'; }
    return { designation, sanctioned, actual, vac, badge, color };
  }), [posts, activePerm]);

  const permFiltered = useMemo(() => { const s=search.toLowerCase(); return perm.filter((e)=>!s||(e.name_bn||'').toLowerCase().includes(s)||(e.designation||'').toLowerCase().includes(s)||(e.mobile||'').includes(s)); }, [perm, search]);

  function openPerm(e) { setMsg(''); setModal({ kind:'permanent', form: e ? { ...EMPTY_P, ...e, join_date:(e.join_date||'').slice(0,10), prl_date:(e.prl_date||'').slice(0,10), charge_type:e.charge_type||'' } : EMPTY_P }); }
  function openTemp(e) { setMsg(''); setModal({ kind:'temporary', form: e ? { ...EMPTY_T, ...e, join_date:(e.join_date||'').slice(0,10) } : EMPTY_T }); }

  async function save() {
    const f = modal.form;
    const req = modal.kind === 'permanent'
      ? ['name_bn','name_en','designation','gender','employee_id','join_date','mobile','nid','address']
      : ['name_bn','name_en','worker_type','gender','join_date','mobile','nid','address'];
    for (const k of req) if (!String(f[k]||'').trim()) { setMsg('সব ফিল্ড পূরণ করুন (মন্তব্য/পিআরএল ছাড়া)'); return; }
    if (modal.kind==='permanent' && f.charge_type && !f.charge_designation) { setMsg('কোন পদের দায়িত্ব তা দিন'); return; }
    setSaving(true); setMsg('');
    const grade = modal.kind==='permanent' ? gradeOf(f.designation)[0] : null;
    const body = { ...f, grade, charge_type: f.charge_type || null, charge_designation: f.charge_type ? f.charge_designation : null };
    try { if (f.id) await api.put('/employees-info/'+f.id, body); else await api.post('/employees-info', body); setModal(null); load(); }
    catch (e) { setMsg(e?.response?.data?.message || e?.response?.data?.error || 'সমস্যা'); } finally { setSaving(false); }
  }
  async function del(e) { if (!(await confirm({ title: `"${e.name_bn}" ডিলেট করবেন?` }))) return; try { await api.delete('/employees-info/'+e.id); load(); } catch (er) { alert(er?.response?.data?.message || 'ডিলেট সমস্যা'); } }

  // ============ রিপোর্ট (official ফরম্যাট হুবহু) ============
  const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  function monthLabel(ym) { const [y,m]=ym.split('-'); return `${BN_MONTHS[(+m)-1]} ${toBn(y)}`; }
  function nextMonthYM(ym) { const [y,m]=ym.split('-').map(Number); const d=new Date(y, m, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  function empOfPost(d) { return activePerm.filter((e)=>e.designation===d); }
  const officeName = `${CAT_OFFICE[cat]}\nহর্টিকালচার সেন্টার\n${center?.location||''}`;
  const signName = user?.name || '';

  // ---- ছক-০১ (দপ্তর অনুসারে — বিস্তারিত) ----
  function build01() {
    const aoa = [
      ['দপ্তর/কার্যালয় অনুসারে জনবলের তথ্য'],
      ['(সংশ্লিষ্ট কার্যালয়ে শূন্য ও কর্মরত সকল কর্মকর্তা/কর্মচারী)'],
      ['ছকপত্র-০১'],
      ['ক্র. নং','দপ্তর/কার্যালয়ের নাম','অনুমোদিত পদের নাম','শূন্য অথবা কর্মরত কর্মকর্তা/কর্মচারীর নাম\n(পরিচিতি নম্বর প্রযোজ্য ক্ষেত্রে)','গ্রেড','চাকুরিতে যোগদানের তারিখ','পিআরএল-এ গমনের তারিখ','মন্তব্য'],
      ['১','২','৩','৪','৫','৬','৭','৮'],
    ];
    const merges = [{s:{r:0,c:0},e:{r:0,c:7}},{s:{r:1,c:0},e:{r:1,c:7}},{s:{r:2,c:0},e:{r:2,c:7}}];
    let sl = 0; const firstData = aoa.length;
    const groups = [...posts.map(([d,n])=>({ d, n, emps: empOfPost(d), grade: gradeOf(d) })),
                    { d:'সাময়িক শ্রমিক', n: activeTemp.length, emps: activeTemp, grade:['-',''], temp:true }];
    groups.forEach((g) => {
      const slots = Math.max(g.n, g.emps.length, g.temp?g.emps.length:g.n);
      const start = aoa.length; let vac = 0;
      const count = g.temp ? g.emps.length : Math.max(g.n, g.emps.length);
      for (let i=0;i<count;i++){ sl++; const e=g.emps[i];
        const gradeCell = g.temp ? '-' : `${g.grade[0]}\n${g.grade[1]}`;
        if (e){ const remark = (!g.temp && i>=g.n) ? 'প্রেষণে' : (e.charge_type ? (CHARGE[e.charge_type]+(e.charge_designation?`: ${e.charge_designation}`:'')) : '');
          aoa.push([toBn(sl), '', g.d, `${e.name_bn||''}${e.employee_id?`\nপরিচিতি নম্বর: ${e.employee_id}`:''}`, gradeCell, fdate(e.join_date), g.temp?'-':fdate(e.prl_date), remark]);
        } else { vac++; aoa.push([toBn(sl), '', g.d, 'শূন্য', gradeCell, '-','-',`শূন্যপদ-${toBn(String(vac).padStart(2,'0'))}`]); }
      }
      if (aoa.length-start>1) merges.push({s:{r:start,c:2},e:{r:aoa.length-1,c:2}}); // পদ নাম merge
    });
    if (aoa.length-firstData>1) merges.push({s:{r:firstData,c:1},e:{r:aoa.length-1,c:1}}); // অফিস নাম merge
    aoa[firstData][1] = officeName;
    // স্বাক্ষর
    aoa.push([],[],['','','','','',`(${signName})`],['','','','','',CAT_HEAD[cat]],['','','','','','হর্টিকালচার সেন্টার'],['','','','','',center?.location||'']);
    return { aoa, merges, cols:[6,22,24,26,14,16,16,14].map((w)=>({wch:w})) };
  }

  // ---- ছক-০২ (পদ অনুসারে summary) ----
  function build02() {
    const nm = nextMonthYM(reportMonth);
    const aoa = [
      ['পদ অনুসারে জনবলের তথ্য'],
      ['(আউটসোর্সিং ও নিয়মিত/অনিয়মিত শ্রমিকসহ)'],
      ['ছকপত্র-০২'],
      ['ক্র. নং','পদের নাম','গ্রেড','মোট পদ সংখ্যা (অনুমোদিত/মঞ্জুরকৃত)','কর্মরত পদের সংখ্যা','','','শূন্য পদের সংখ্যা','পরবর্তী মাসে পিআরএল গমন (সংখ্যা)','মন্তব্য'],
      ['','','','','পুরুষ','মহিলা','মোট','','',''],
      ['১','২','৩','৪','৫','৬','৭','৮','৯','১০'],
    ];
    const merges = [{s:{r:0,c:0},e:{r:0,c:9}},{s:{r:1,c:0},e:{r:1,c:9}},{s:{r:2,c:0},e:{r:2,c:9}},
      {s:{r:3,c:0},e:{r:4,c:0}},{s:{r:3,c:1},e:{r:4,c:1}},{s:{r:3,c:2},e:{r:4,c:2}},{s:{r:3,c:3},e:{r:4,c:3}},
      {s:{r:3,c:4},e:{r:3,c:6}},{s:{r:3,c:7},e:{r:4,c:7}},{s:{r:3,c:8},e:{r:4,c:8}},{s:{r:3,c:9},e:{r:4,c:9}}];
    let t={sanc:0,m:0,f:0,w:0,v:0,p:0}, i=0;
    posts.forEach(([d,sanc])=>{ i++; const emps=empOfPost(d); const m=emps.filter((e)=>e.gender==='পুরুষ').length; const f=emps.filter((e)=>e.gender==='মহিলা').length; const w=emps.length; const v=Math.max(0,sanc-w); const p=emps.filter((e)=>(e.prl_date||'').slice(0,7)===nm).length;
      const [g,sc]=gradeOf(d); t.sanc+=sanc;t.m+=m;t.f+=f;t.w+=w;t.v+=v;t.p+=p;
      aoa.push([toBn(i), d, `${g} (${sc})`, toBn(sanc), toBn(m), toBn(f), toBn(w), toBn(v), toBn(p), '']);
    });
    // সাময়িক শ্রমিক
    const tm=activeTemp.filter((e)=>e.gender==='পুরুষ').length, tf=activeTemp.filter((e)=>e.gender==='মহিলা').length, tw=activeTemp.length;
    i++; aoa.push([toBn(i),'সাময়িক শ্রমিক','-',toBn(tw),toBn(tm),toBn(tf),toBn(tw),toBn(0),toBn(0),'']);
    t.sanc+=tw; t.m+=tm; t.f+=tf; t.w+=tw;
    aoa.push(['মোট=','','',toBn(t.sanc),toBn(t.m),toBn(t.f),toBn(t.w),toBn(t.v),toBn(t.p),'']);
    merges.push({s:{r:aoa.length-1,c:0},e:{r:aoa.length-1,c:2}});
    aoa.push([],[],['','','','','','','',`(${signName})`],['','','','','','','',CAT_HEAD[cat]],['','','','','','','','হর্টিকালচার সেন্টার'],['','','','','','','',center?.location||'']);
    return { aoa, merges, cols:[6,30,18,12,8,8,8,10,14,12].map((w)=>({wch:w})) };
  }

  // ---- ছক-০৩ (গ্রেড অনুসারে summary, শুধু স্থায়ী) ----
  function build03() {
    const nm = nextMonthYM(reportMonth);
    const byGrade = {};
    posts.forEach(([d,sanc])=>{ const [g,sc]=gradeOf(d); const key=`${g} (${sc})`; if(!byGrade[key]) byGrade[key]={g, sanc:0,m:0,f:0,w:0,v:0,p:0}; const emps=empOfPost(d);
      byGrade[key].sanc+=sanc; byGrade[key].m+=emps.filter((e)=>e.gender==='পুরুষ').length; byGrade[key].f+=emps.filter((e)=>e.gender==='মহিলা').length; byGrade[key].w+=emps.length; byGrade[key].v+=Math.max(0,sanc-emps.length); byGrade[key].p+=emps.filter((e)=>(e.prl_date||'').slice(0,7)===nm).length;
    });
    const keys = Object.keys(byGrade).sort((a,b)=>GRADE_ORDER.indexOf(byGrade[a].g)-GRADE_ORDER.indexOf(byGrade[b].g));
    const aoa = [
      ['গ্রেড অনুসারে জনবলের তথ্য'],
      ['(০১ গ্রেড হতে ২০তম গ্রেড)'],
      ['ছকপত্র-০৩'],
      ['ক্র. নং','গ্রেড','মোট পদ সংখ্যা (অনুমোদিত/মঞ্জুরকৃত)','কর্মরত পদের সংখ্যা','','','শূন্য পদের সংখ্যা','পরবর্তী মাসে পিআরএল গমন (সংখ্যা)','মন্তব্য'],
      ['','','','পুরুষ','মহিলা','মোট','','',''],
      ['১','২','৩','৫','৬','৭','৮','৯','১০'],
    ];
    const merges = [{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}},{s:{r:2,c:0},e:{r:2,c:8}},
      {s:{r:3,c:0},e:{r:4,c:0}},{s:{r:3,c:1},e:{r:4,c:1}},{s:{r:3,c:2},e:{r:4,c:2}},
      {s:{r:3,c:3},e:{r:3,c:5}},{s:{r:3,c:6},e:{r:4,c:6}},{s:{r:3,c:7},e:{r:4,c:7}},{s:{r:3,c:8},e:{r:4,c:8}}];
    let t={sanc:0,m:0,f:0,w:0,v:0,p:0}, i=0;
    keys.forEach((k)=>{ const r=byGrade[k]; i++; t.sanc+=r.sanc;t.m+=r.m;t.f+=r.f;t.w+=r.w;t.v+=r.v;t.p+=r.p;
      aoa.push([toBn(i), k, toBn(r.sanc), toBn(r.m), toBn(r.f), toBn(r.w), toBn(r.v), toBn(r.p), '']); });
    aoa.push(['মোট=','',toBn(t.sanc),toBn(t.m),toBn(t.f),toBn(t.w),toBn(t.v),toBn(t.p),'']);
    merges.push({s:{r:aoa.length-1,c:0},e:{r:aoa.length-1,c:1}});
    aoa.push([],[],['','','','','','',`(${signName})`],['','','','','','',CAT_HEAD[cat]],['','','','','','','হর্টিকালচার সেন্টার'],['','','','','','',center?.location||'']);
    return { aoa, merges, cols:[6,20,14,8,8,8,10,14,12].map((w)=>({wch:w})) };
  }

  function genExcel() {
    const wb = XLSX.utils.book_new();
    [['ছক-০১',build01()],['ছক-০২',build02()],['ছক-০৩',build03()]].forEach(([name,b])=>{
      const ws = XLSX.utils.aoa_to_sheet(b.aoa); ws['!merges']=b.merges; ws['!cols']=b.cols;
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, `জনবলের_তথ্য_${monthLabel(reportMonth)}.xlsx`);
    setReportOpen(false);
  }

  // PDF (HTML) — official মিলিয়ে
  function tableHTML(b, ncol) {
    const rowsHTML = b.aoa.map((row)=>{
      const tds = []; for (let c=0;c<ncol;c++){ const v=row[c]; if (v!==undefined && v!=='') tds.push(`<td>${String(v).replace(/\n/g,'<br>')}</td>`); else tds.push('<td></td>'); }
      return `<tr>${tds.join('')}</tr>`;
    }).join('');
    return `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;font-size:11px;page-break-after:always">${rowsHTML}</table>`;
  }
  function genPDF() {
    const w = window.open('', '_blank'); if (!w) { alert('পপ-আপ অনুমতি দিন'); return; }
    const body = [build01(),build02(),build03()].map((b,i)=>tableHTML(b, [8,10,9][i])).join('');
    w.document.write(`<html><head><meta charset="utf-8"><title>জনবলের তথ্য</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap" rel="stylesheet">
      <style>body{font-family:'Noto Sans Bengali',Arial,sans-serif;padding:10px}td{text-align:center;vertical-align:middle}@media print{@page{size:A4 landscape;margin:8mm}}</style></head>
      <body onload="setTimeout(function(){window.print()},500)">${body}</body></html>`);
    w.document.close(); setReportOpen(false);
  }

  const CARDS = [
    { l:'মঞ্জুরিকৃত পদ', v:toBn(totalSanctioned), s:'মোট স্থায়ী পদ', Icon:IcClipboard, bg:'var(--g50)', fg:'var(--g600)', vc:'var(--tp)' },
    { l:'কর্মরত (স্থায়ী)', v:toBn(activePerm.length), s:'জন', Icon:IcCheck, bg:'var(--t50)', fg:'var(--t600)', vc:'var(--g600)' },
    { l:'শূন্য পদ', v:toBn(vacancy), s:vacancy>0?'⚠️ পূরণ হয়নি':'✅ পূর্ণ', Icon:IcAlert, bg:'var(--c50)', fg:'var(--c400)', vc:vacancy>0?'var(--c400)':'var(--g600)' },
    { l:'সাময়িক শ্রমিক', v:toBn(activeTemp.length), s:'জন কর্মরত', Icon:IcUsers, bg:'var(--a50)', fg:'var(--a400)', vc:'var(--a400)' },
  ];
  if (deputationCount > 0) CARDS.push({ l:'প্রেষণে', v:toBn(deputationCount), s:'জন কর্মরত', Icon:IcUsers, bg:'var(--b50)', fg:'var(--b600)', vc:'var(--b600)' });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {CARDS.map((c)=>(
          <div className="sc" key={c.l}>
            <div className="si" style={{ background:c.bg }}><c.Icon className="h-[18px] w-[18px]" style={{ color:c.fg }} /></div>
            <div className="sl">{c.l}</div><div className="sv" style={{ color:c.vc }}>{c.v}</div><div className="ss2">{c.s}</div>
          </div>
        ))}
      </div>

      <div className="cd">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-bold">স্থায়ী জনবল</div>
            <div className="text-[12px]" style={{ color:'var(--tm)' }}>মঞ্জুরিকৃত পদের বিপরীতে কর্মরত</div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setReportOpen(true)} className="rounded-lg border px-3 py-2 text-[13px] font-medium" style={{ borderColor:'var(--bd)' }}>📋 রিপোর্ট</button>
            <button onClick={()=>openPerm(null)} className="btn-primary"><IcPlus className="h-4 w-4"/> স্থায়ী কর্মচারী যোগ</button>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-[12px] font-semibold mb-2" style={{ color:'var(--tm)' }}>পদভিত্তিক অবস্থান — <span style={{ color:'var(--g600)' }}>ক্যাটাগরী-{cat}</span></div>
          {summary.map((s)=>(
            <div key={s.designation} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--bd)' }}>
              <div className="text-[13px]">{s.designation}</div>
              <div className="flex items-center gap-4 text-[12px]">
                <span style={{ color:'var(--tm)' }}>মঞ্জুরি: <strong>{toBn(s.sanctioned)}</strong></span>
                <span style={{ color:'var(--g600)' }}>কর্মরত: <strong>{toBn(s.actual)}</strong></span>
                <span style={{ color:s.color, fontWeight:600, minWidth:96, textAlign:'right' }}>{s.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <IcSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color:'var(--tm)' }} />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="নাম/পদবি খুঁজুন..." className="field-input pl-9" style={{ width: 240 }} />
        </div>
      </div>
      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>#</th><th>গ্রেডেশন নং/ID</th><th>নাম</th><th>পদবি</th><th>নিয়োগের ধরন</th><th>দায়িত্বের ধরন</th><th>যোগদান</th><th>মোবাইল</th><th>NID</th><th>কার্যক্রম</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="lt">লোড হচ্ছে…</td></tr> :
             permFiltered.length ? permFiltered.map((e,i)=>(
               <tr key={e.id}>
                 <td style={{ color:'var(--tm)' }}>{toBn(i+1)}</td>
                 <td style={{ color:'var(--tm)' }}>{e.employee_id || '—'}</td>
                 <td><strong>{e.name_bn}</strong>{e.name_en && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{e.name_en}</div>}</td>
                 <td><span className="b bg" style={{ fontSize:11 }}>{e.designation}</span></td>
                 <td><span className={`b ${e.posting_type==='deputation'?'ba':'bg'}`}>{POSTING[e.posting_type]||'মঞ্জুরীকৃত'}</span></td>
                 <td>{e.charge_type ? <span className="b bb">{CHARGE[e.charge_type]}{e.charge_designation?`: ${e.charge_designation}`:''}</span> : <span style={{ color:'var(--tm)' }}>—</span>}</td>
                 <td>{e.join_date ? dateBn(e.join_date) : '—'}</td>
                 <td>{e.mobile || '—'}</td>
                 <td style={{ color:'var(--tm)' }}>{e.nid || '—'}</td>
                 <td><div className="flex gap-1.5">
                   <button className="act-btn act-edit" onClick={()=>openPerm(e)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                   <button className="act-btn act-del" onClick={()=>del(e)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                 </div></td>
               </tr>
             )) : <tr><td colSpan={10} className="lt">কোনো স্থায়ী কর্মচারী নেই</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="cd">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-bold">সাময়িক শ্রমিক</div>
            <div className="text-[12px]" style={{ color:'var(--tm)' }}>নির্ধারিত পদ নেই</div>
          </div>
          <button onClick={()=>openTemp(null)} className="btn-primary"><IcPlus className="h-4 w-4"/> শ্রমিক যোগ</button>
        </div>
      </div>
      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>#</th><th>নাম</th><th>শ্রমিকের ধরন</th><th>যোগদান</th><th>মোবাইল</th><th>NID</th><th>ঠিকানা</th><th>অবস্থা</th><th>কার্যক্রম</th></tr></thead>
          <tbody>
            {temp.length ? temp.map((e,i)=>(
              <tr key={e.id}>
                <td style={{ color:'var(--tm)' }}>{toBn(i+1)}</td>
                <td><strong>{e.name_bn}</strong>{e.name_en && <div className="text-[11px]" style={{ color:'var(--tm)' }}>{e.name_en}</div>}</td>
                <td><span className={`b ${e.worker_type==='নিয়মিত'?'bg':'ba'}`} style={{ fontSize:11 }}>{e.worker_type||'—'}</span></td>
                <td>{e.join_date ? dateBn(e.join_date) : '—'}</td>
                <td>{e.mobile || '—'}</td>
                <td style={{ color:'var(--tm)' }}>{e.nid || '—'}</td>
                <td style={{ color:'var(--tm)' }}>{e.address || '—'}</td>
                <td>{e.status==='active' ? <span className="b bg">কর্মরত</span> : <span className="b ba">ছাড়</span>}</td>
                <td><div className="flex gap-1.5">
                  <button className="act-btn act-edit" onClick={()=>openTemp(e)} title="এডিট"><IcEdit className="h-[15px] w-[15px]" /></button>
                  <button className="act-btn act-del" onClick={()=>del(e)} title="ডিলেট"><IcTrash className="h-[15px] w-[15px]" /></button>
                </div></td>
              </tr>
            )) : <tr><td colSpan={9} className="lt">কোনো সাময়িক শ্রমিক নেই</td></tr>}
          </tbody>
        </table>
      </div>

      {reportOpen && (
        <Modal open onClose={()=>setReportOpen(false)} title="জনবলের তথ্য রিপোর্ট">
          <div className="space-y-3">
            <Fld label="প্রতিবেদনের মাস"><input type="month" className="field-input" value={reportMonth} onChange={(e)=>setReportMonth(e.target.value)} /></Fld>
            <div className="rounded-lg p-3 text-[12px]" style={{ background:'var(--b50)', color:'var(--b600)' }}>
              ℹ️ এক ডকুমেন্টে ৩টি ছক: ছক-০১ (দপ্তর অনুসারে বিস্তারিত), ছক-০২ (পদ অনুসারে), ছক-০৩ (গ্রেড অনুসারে)। কর্মচারীর গ্রেড পদ অনুযায়ী স্বয়ংক্রিয়; লিঙ্গ ও পিআরএল তারিখ মোডালে ভরে রাখুন। Excel-এ প্রতিটি ছক আলাদা শিটে।
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={genExcel} className="rounded-lg border px-4 py-2.5 text-[13px] font-medium" style={{ borderColor:'var(--bd)' }}>⬇ Excel</button>
              <button onClick={genPDF} className="btn-primary">🖨 PDF</button>
            </div>
          </div>
        </Modal>
      )}

      {modal && modal.kind==='permanent' && (
        <Modal open onClose={()=>setModal(null)} title={modal.form.id?'কর্মচারী এডিট':'নতুন স্থায়ী কর্মচারী'} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="নাম (বাংলা)*"><input className="field-input" value={modal.form.name_bn} onChange={(e)=>setF('name_bn',e.target.value)}/></Fld>
              <Fld label="নাম (English)*"><input className="field-input" value={modal.form.name_en} onChange={(e)=>setF('name_en',e.target.value)}/></Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label={`পদবি* (ক্যাটাগরী-${cat})`}>
                <select className="field-input" value={modal.form.designation} onChange={(e)=>setF('designation',e.target.value)}>
                  <option value="">-- পদ নির্বাচন করুন --</option>{posts.map(([d])=><option key={d} value={d}>{d}</option>)}
                </select>
              </Fld>
              <Fld label="গ্রেড (পদ অনুযায়ী স্বয়ংক্রিয়)">
                <input className="field-input" disabled value={modal.form.designation ? `${gradeOf(modal.form.designation)[0]} (${gradeOf(modal.form.designation)[1]})` : ''} style={{ opacity:.7 }}/>
              </Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="নিয়োগের ধরন*">
                <select className="field-input" value={modal.form.posting_type} onChange={(e)=>setF('posting_type',e.target.value)}>
                  <option value="sanctioned">মঞ্জুরীকৃত পদে কর্মরত</option><option value="deputation">প্রেষণে কর্মরত</option>
                </select>
              </Fld>
              <Fld label="দায়িত্বের ধরন">
                <select className="field-input" value={modal.form.charge_type} onChange={(e)=>setF('charge_type',e.target.value)}>
                  <option value="">নাই</option><option value="additional">অতিরিক্ত দায়িত্ব</option><option value="acting">ভারপ্রাপ্ত দায়িত্ব</option><option value="routine">রুটিন দায়িত্ব</option><option value="current">চলতি দায়িত্ব</option>
                </select>
              </Fld>
            </div>
            {modal.form.charge_type && (
              <Fld label="কোন পদের দায়িত্ব*">
                <select className="field-input" value={modal.form.charge_designation} onChange={(e)=>setF('charge_designation',e.target.value)}>
                  <option value="">-- বাছাই করুন --</option><option value={CAT_HEAD[cat]}>{CAT_HEAD[cat]} (সেন্টার প্রধান)</option>
                  {posts.map(([d])=><option key={d} value={d}>{d}</option>)}
                </select>
              </Fld>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Fld label="লিঙ্গ*">
                <select className="field-input" value={modal.form.gender} onChange={(e)=>setF('gender',e.target.value)}>
                  <option value="">-- নির্বাচন --</option><option value="পুরুষ">পুরুষ</option><option value="মহিলা">মহিলা</option>
                </select>
              </Fld>
              <Fld label="গ্রেডেশন নং/ID*"><input className="field-input" value={modal.form.employee_id} onChange={(e)=>setF('employee_id',e.target.value)}/></Fld>
              <Fld label="পিআরএল/অবসরের তারিখ"><input type="date" className="field-input" value={modal.form.prl_date} onChange={(e)=>setF('prl_date',e.target.value)}/></Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="যোগদানের তারিখ*"><input type="date" className="field-input" value={modal.form.join_date} onChange={(e)=>setF('join_date',e.target.value)}/></Fld>
              <Fld label="মোবাইল*"><input className="field-input" value={modal.form.mobile} onChange={(e)=>setF('mobile',e.target.value)}/></Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="NID*"><input className="field-input" value={modal.form.nid} onChange={(e)=>setF('nid',e.target.value)}/></Fld>
              <Fld label="ঠিকানা*"><input className="field-input" value={modal.form.address} onChange={(e)=>setF('address',e.target.value)}/></Fld>
            </div>
            <Fld label="মন্তব্য (ঐচ্ছিক)"><textarea rows={2} className="field-input" value={modal.form.notes} onChange={(e)=>setF('notes',e.target.value)}/></Fld>
            {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=>setModal(null)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal && modal.kind==='temporary' && (
        <Modal open onClose={()=>setModal(null)} title={modal.form.id?'শ্রমিক এডিট':'নতুন সাময়িক শ্রমিক'} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="নাম (বাংলা)*"><input className="field-input" value={modal.form.name_bn} onChange={(e)=>setF('name_bn',e.target.value)}/></Fld>
              <Fld label="নাম (English)*"><input className="field-input" value={modal.form.name_en} onChange={(e)=>setF('name_en',e.target.value)}/></Fld>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="শ্রমিকের ধরন*">
                <select className="field-input" value={modal.form.worker_type} onChange={(e)=>setF('worker_type',e.target.value)}>
                  <option value="নিয়মিত">নিয়মিত শ্রমিক</option><option value="অনিয়মিত">অনিয়মিত শ্রমিক</option>
                </select>
              </Fld>
              <Fld label="লিঙ্গ*">
                <select className="field-input" value={modal.form.gender} onChange={(e)=>setF('gender',e.target.value)}>
                  <option value="">-- নির্বাচন --</option><option value="পুরুষ">পুরুষ</option><option value="মহিলা">মহিলা</option>
                </select>
              </Fld>
              <Fld label="যোগদানের তারিখ*"><input type="date" className="field-input" value={modal.form.join_date} onChange={(e)=>setF('join_date',e.target.value)}/></Fld>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="মোবাইল*"><input className="field-input" value={modal.form.mobile} onChange={(e)=>setF('mobile',e.target.value)}/></Fld>
              <Fld label="NID*"><input className="field-input" value={modal.form.nid} onChange={(e)=>setF('nid',e.target.value)}/></Fld>
            </div>
            <Fld label="ঠিকানা*"><input className="field-input" value={modal.form.address} onChange={(e)=>setF('address',e.target.value)}/></Fld>
            <Fld label="মন্তব্য (ঐচ্ছিক)"><textarea rows={2} className="field-input" value={modal.form.notes} onChange={(e)=>setF('notes',e.target.value)}/></Fld>
            {msg && <div className="text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=>setModal(null)} className="rounded-lg border px-4 py-2.5 text-[13px]" style={{borderColor:'var(--bd)'}}>বাতিল</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving?'সংরক্ষণ হচ্ছে…':'সংরক্ষণ'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  function setF(k,v) { setModal((m)=>({ ...m, form:{ ...m.form, [k]:v } })); }
}
function Fld({ label, children }) { return <div><label className="field-label">{label}</label>{children}</div>; }
