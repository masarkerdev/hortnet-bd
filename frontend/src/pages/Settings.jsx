import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { IcPlus, IcTrash } from '../components/icons';

const THEMES = [
  { k:'green', label:'🌿 সবুজ', bg:'#eaf3de', fg:'#3b6d11', dot:'#3b6d11' },
  { k:'blue', label:'🔵 নীল', bg:'#ebf5fb', fg:'#1a5276', dot:'#1a5276' },
  { k:'purple', label:'🟣 বেগুনি', bg:'#f4ecf7', fg:'#6c3483', dot:'#6c3483' },
  { k:'orange', label:'🟠 কমলা', bg:'#fdf0e3', fg:'#a04000', dot:'#e67e22' },
  { k:'teal', label:'🟦 টিল', bg:'#e6f7f5', fg:'#0e6655', dot:'#17a589' },
  { k:'rose', label:'🌸 গোলাপি', bg:'#fdedf0', fg:'#a1284a', dot:'#e0567a' },
];

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [theme, setThemeState] = useState(localStorage.getItem('hc_theme') || 'green');
  const [centerCat, setCenterCat] = useState('B'); // Super Admin-এর সেট করা প্রকৃত category, backend থেকে সরাসরি

  useEffect(() => {
    api.get('/center-info').then((r) => {
      if (r.data?.success && r.data?.data?.category) setCenterCat(r.data.data.category);
    }).catch(() => {});
  }, []);

  function setTheme(t) { setThemeState(t); document.documentElement.setAttribute('data-theme', t); localStorage.setItem('hc_theme', t); }

  return (
    <div className="space-y-4" style={{ maxWidth: 720 }}>
      {/* থিম ও ডিজাইন */}
      <div className="cd">
        <div className="cdt">🎨 থিম ও ডিজাইন</div>
        <label className="field-label">রং / Color Theme</label>
        <div className="flex flex-wrap gap-2.5">
          {THEMES.map((t) => (
            <button key={t.k} onClick={()=>setTheme(t.k)}
              className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition"
              style={{ background:t.bg, color:t.fg, border:`2px solid ${theme===t.k ? t.fg : 'transparent'}` }}>
              <span className="inline-block h-4 w-4 rounded-full" style={{ background:t.dot }} />{t.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px]" style={{ color:'var(--tm)' }}>থিম বদলালে সাথে সাথে পুরো অ্যাপে প্রয়োগ হবে ও মনে রাখা হবে।</p>
      </div>

      {/* সেন্টারের তথ্য — শুধু দেখার জন্য (Super Admin থেকে নির্ধারিত) */}
      {isAdmin && (
        <div className="cd">
          <div className="cdt">🏛️ সেন্টারের তথ্য</div>
          <p className="text-[12.5px]" style={{ color:'var(--tm)' }}>
            সেন্টার ক্যাটাগরি — <strong style={{ color:'var(--g600)' }}>ক্যাটাগরি-{centerCat}</strong> ({centerCat === 'A' ? 'উপপরিচালক' : centerCat === 'C' ? 'নার্সারি তত্ত্বাবধায়ক' : 'উদ্যানতত্ত্ববিদ'})
          </p>
          <p className="mt-1 text-[11.5px]" style={{ color:'var(--tm)' }}>
            এই তথ্য কেন্দ্রীয়ভাবে (Super Admin) নির্ধারিত — এখান থেকে পরিবর্তনযোগ্য নয়। পরিবর্তন প্রয়োজন হলে কেন্দ্রীয় প্রশাসনের সাথে যোগাযোগ করুন।
          </p>
        </div>
      )}

      {/* ক্যাটাগরি ম্যানেজমেন্ট — শুধু Admin */}
      {isAdmin && <CategoryManager />}
    </div>
  );
}

function CategoryManager() {
  const [rows, setRows] = useState([]);
  const [bn, setBn] = useState('');
  const [en, setEn] = useState('');
  const [msg, setMsg] = useState('');

  function load() { api.get('/categories').then((r)=>setRows(r.data?.data||[])).catch(()=>{}); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!bn) { setMsg('বাংলা নাম দিন'); return; }
    setMsg('');
    try { await api.post('/categories', { name_bn:bn, name_en:en }); setBn(''); setEn(''); load(); }
    catch (e) { setMsg(e?.response?.data?.message || 'সমস্যা'); }
  }
  async function del(c) { if (!(await confirm({ title: `"${c.name_bn}" ক্যাটাগরি ডিলেট করবেন?` }))) return; try { await api.delete('/categories/'+c.id); load(); } catch (e) { alert(e?.response?.data?.message || 'ডিলেট সমস্যা (এই ক্যাটাগরিতে চারা থাকতে পারে)'); } }

  return (
    <div className="cd">
      <div className="cdt">📂 ক্যাটাগরি ম্যানেজমেন্ট</div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1" style={{ minWidth:160 }}><label className="field-label">বাংলা নাম*</label><input className="field-input" value={bn} onChange={(e)=>setBn(e.target.value)} placeholder="যেমন: মসলা"/></div>
        <div className="flex-1" style={{ minWidth:160 }}><label className="field-label">English Name</label><input className="field-input" value={en} onChange={(e)=>setEn(e.target.value)} placeholder="optional"/></div>
        <button onClick={add} className="btn-primary"><IcPlus className="h-4 w-4"/> যোগ</button>
      </div>
      {msg && <div className="mt-2 text-[13px]" style={{ color:'var(--r600)' }}>{msg}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.length ? rows.map((c)=>(
          <span key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px]" style={{ borderColor:'var(--bd)' }}>
            {c.name_bn}{c.name_en && <span style={{ color:'var(--tm)' }}>({c.name_en})</span>}
            <button onClick={()=>del(c)} title="ডিলেট" style={{ color:'var(--r400)' }}><IcTrash className="h-[15px] w-[15px]" /></button>
          </span>
        )) : <span className="lt">কোনো ক্যাটাগরি নেই</span>}
      </div>
    </div>
  );
}
