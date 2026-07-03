import { useEffect, useState } from 'react';
import { confirm } from '../lib/confirm';
import api from '../lib/api';
import { toBn, dateBn } from '../lib/format';
import { IcRefresh, IcTrash } from '../components/icons';

export default function RecycleBin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true); setDenied(false);
    api.get('/recycle-bin').then((r)=>setRows(r.data?.data||[]))
      .catch((e)=>{ if (e?.response?.status === 403) setDenied(true); })
      .finally(()=>setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function restore(r) {
    if (!(await confirm({ title: `"${r.item_name || 'আইটেম'}" পুনরুদ্ধার করবেন?`, message: 'আইটেমটি আবার মূল তালিকায় ফিরে যাবে।', confirmLabel: 'পুনরুদ্ধার করুন', danger: false, icon: '♻️' }))) return;
    setBusy(true);
    try { await api.post('/recycle-bin/'+r.id+'/restore'); load(); }
    catch (e) { alert(e?.response?.data?.message || 'পুনরুদ্ধার সমস্যা'); } finally { setBusy(false); }
  }
  async function permDelete(r) {
    if (!(await confirm({ title: `"${r.item_name || 'আইটেম'}" চিরতরে মুছবেন?`, message: 'এটি স্থায়ীভাবে মুছে যাবে — আর পুনরুদ্ধার করা যাবে না!', confirmLabel: 'চিরতরে মুছুন' }))) return;
    setBusy(true);
    try { await api.delete('/recycle-bin/'+r.id); load(); }
    catch (e) { alert(e?.response?.data?.message || 'সমস্যা'); } finally { setBusy(false); }
  }
  async function emptyBin() {
    if (!(await confirm({ title: 'Recycle Bin সম্পূর্ণ খালি করবেন?', message: 'সব আইটেম চিরতরে মুছে যাবে — ফেরানো যাবে না!', confirmLabel: 'সব খালি করুন' }))) return;
    setBusy(true);
    try { await api.delete('/recycle-bin'); load(); }
    catch (e) { alert(e?.response?.data?.message || 'সমস্যা'); } finally { setBusy(false); }
  }

  if (denied) return <div className="cd lt">এই পেজ শুধু অ্যাডমিন দেখতে পারেন।</div>;

  if (!loading && rows.length === 0) {
    return (
      <div className="cd" style={{ textAlign:'center', padding:'48px 20px' }}>
        <div style={{ fontSize:48, marginBottom:10 }}>🗑️</div>
        <div style={{ fontSize:15, fontWeight:600 }}>Recycle Bin খালি</div>
        <div style={{ fontSize:12, marginTop:6, color:'var(--tm)' }}>মুছে ফেলা আইটেম এখানে দেখাবে</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color:'var(--tm)' }}>মোট {toBn(rows.length)}টি আইটেম — পুনরুদ্ধার করা যাবে</p>
        <button onClick={emptyBin} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background:'var(--r50)', color:'var(--r600)' }}><IcTrash className="h-4 w-4" /> সব মুছুন</button>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>আইটেমের নাম</th><th>মডিউল</th><th>মুছেছেন</th><th>তারিখ</th><th>কার্যক্রম</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="lt">লোড হচ্ছে…</td></tr> :
             rows.map((r)=>(
               <tr key={r.id}>
                 <td><strong>{r.item_name || '—'}</strong></td>
                 <td><span className="b bg">{r.module || r.table_name}</span></td>
                 <td style={{ color:'var(--tm)' }}>{r.deleted_by_name || '—'}</td>
                 <td>{dateBn(r.deleted_at)}</td>
                 <td>
                   <div className="flex gap-1.5">
                     <button onClick={()=>restore(r)} disabled={busy} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background:'var(--g50)', color:'var(--g600)', border:'1px solid var(--g400)' }}><IcRefresh className="h-[14px] w-[14px]" /> পুনরুদ্ধার</button>
                     <button onClick={()=>permDelete(r)} disabled={busy} className="act-btn act-del" title="চিরতরে মুছুন"><IcTrash className="h-[15px] w-[15px]" /></button>
                   </div>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
