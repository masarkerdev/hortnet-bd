import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { IcPlus, IcTrash } from '../components/icons';

const THEMES = [
  { k:'green', label:'🌿 সবুজ', bg:'#eaf3de', fg:'#3b6d11', dot:'#3b6d11' },
  { k:'blue', label:'🔵 নীল', bg:'#ebf5fb', fg:'#1a5276', dot:'#1a5276' },
  { k:'purple', label:'🟣 বেগুনি', bg:'#f4ecf7', fg:'#6c3483', dot:'#6c3483' },
];
const CFG_DEFAULT = { name_bn:'', name_en:'', low_stock:20, currency:'BDT', language:'bn', center_category:'B' };

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [theme, setThemeState] = useState(localStorage.getItem('hc_theme') || 'green');
  const [cfg, setCfg] = useState(() => { try { return { ...CFG_DEFAULT, ...JSON.parse(localStorage.getItem('hc_cfg') || '{}') }; } catch { return CFG_DEFAULT; } });
  const [savedMsg, setSavedMsg] = useState('');

  function setTheme(t) { setThemeState(t); document.documentElement.setAttribute('data-theme', t); localStorage.setItem('hc_theme', t); }
  function saveCfg() { localStorage.setItem('hc_cfg', JSON.stringify(cfg)); setSavedMsg('সেটিংস সংরক্ষণ হয়েছে ✅'); setTimeout(()=>setSavedMsg(''), 2500); }

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

      {/* সিস্টেম সেটিংস — শুধু Admin */}
      {isAdmin && (
        <div className="cd">
          <div className="cdt">সিস্টেম সেটিংস / System Settings</div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">নার্সারির নাম (বাংলা)</label><input className="field-input" value={cfg.name_bn} onChange={(e)=>setCfg({...cfg,name_bn:e.target.value})}/></div>
              <div><label className="field-label">Nursery Name (English)</label><input className="field-input" value={cfg.name_en} onChange={(e)=>setCfg({...cfg,name_en:e.target.value})}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">কম স্টক সীমা</label><input type="text" inputMode="decimal" className="field-input" value={cfg.low_stock} onChange={(e)=>setCfg({...cfg,low_stock:e.target.value})}/></div>
              <div><label className="field-label">মুদ্রা / Currency</label>
                <select className="field-input" value={cfg.currency} onChange={(e)=>setCfg({...cfg,currency:e.target.value})}>
                  <option value="BDT">BDT (৳)</option><option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">ভাষা / Language</label>
                <select className="field-input" value={cfg.language} onChange={(e)=>setCfg({...cfg,language:e.target.value})}>
                  <option value="bn">বাংলা</option><option value="en">English</option><option value="both">বাংলা + English</option>
                </select>
              </div>
              <div><label className="field-label">সেন্টার ক্যাটাগরি</label>
                <select className="field-input" value={cfg.center_category} onChange={(e)=>setCfg({...cfg,center_category:e.target.value})}>
                  <option value="A">ক্যাটাগরি-এ (উপপরিচালক)</option>
                  <option value="B">ক্যাটাগরি-বি (উদ্যানতত্ত্ববিদ)</option>
                  <option value="C">ক্যাটাগরি-সি (নার্সারি তত্ত্বাবধায়ক)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={saveCfg} className="btn-primary">✓ সেটিংস সংরক্ষণ</button>
              {savedMsg && <span className="text-[13px]" style={{ color:'var(--g600)' }}>{savedMsg}</span>}
            </div>
          </div>
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
