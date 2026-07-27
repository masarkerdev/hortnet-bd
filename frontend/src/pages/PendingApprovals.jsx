import { useState, useEffect } from 'react';
import api from '../lib/api';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0));
const money = n => `৳${fmtN(n)}`;

const cardStyle = { background: '#fff', border: '1px solid #e8f5ed', borderRadius: 12, padding: 16, marginBottom: 12 };
const btnApprove = { padding: '7px 16px', borderRadius: 7, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 };

export default function PendingApprovals() {
  const [data, setData] = useState({ sales: [], production: [], income: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('sales');

  function load() {
    setLoading(true);
    api.get('/pending-approvals').then(r => {
      if (r.data?.success) setData(r.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function approve(type, id) {
    setBusyId(id);
    try {
      const url = type === 'sales' ? `/sales/${id}/approve`
        : type === 'production' ? `/production/${id}/approve`
        : `/other-income/${id}/approve`;
      await api.put(url);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || 'অনুমোদন করতে সমস্যা হয়েছে');
    } finally {
      setBusyId(null);
    }
  }

  const counts = { sales: data.sales.length, production: data.production.length, income: data.income.length };

  return (
    <div style={{ fontFamily: FONT }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>✅ অনুমোদনের অপেক্ষায়</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>বিক্রয়, উৎপাদন ও আয়ের এন্ট্রি — অনুমোদন করার পরই স্টক/রাজস্বে যোগ হবে</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #e8f5ed' }}>
        {[
          ['sales', '💰 বিক্রয়'],
          ['production', '🌱 উৎপাদন'],
          ['income', '🧾 অন্যান্য আয়'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600, color: tab === key ? '#1a6b3a' : '#6b7280', borderBottom: tab === key ? '2px solid #1a6b3a' : '2px solid transparent' }}>
            {label} {counts[key] > 0 && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{toBn(counts[key])}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>লোড হচ্ছে...</div>
      ) : (
        <>
          {tab === 'sales' && (
            data.sales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>কোনো বিক্রয় অনুমোদনের অপেক্ষায় নেই</div>
            ) : data.sales.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>চালান #{s.invoice_no} — {s.customer_name || 'গ্রাহকের নাম নেই'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.sale_date} • {money(s.total_amount)}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      {(s.items || []).map((it, i) => (
                        <div key={i}>• {it.seedling_name} — {toBn(it.quantity)}টি × {money(it.unit_price)}</div>
                      ))}
                    </div>
                  </div>
                  <button style={btnApprove} disabled={busyId === s.id} onClick={() => approve('sales', s.id)}>
                    {busyId === s.id ? '...' : '✓ অনুমোদন করুন'}
                  </button>
                </div>
              </div>
            ))
          )}

          {tab === 'production' && (
            data.production.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>কোনো উৎপাদন অনুমোদনের অপেক্ষায় নেই</div>
            ) : data.production.map(p => (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.batch_code} — {p.seedling_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      ধরন: {p.production_type === 'seed' ? 'বীজ' : p.production_type} • উৎপাদিত: {toBn(p.produced_quantity)}টি
                      {p.success_quantity ? ` • সফল: ${toBn(p.success_quantity)}টি` : ''}
                    </div>
                  </div>
                  <button style={btnApprove} disabled={busyId === p.id} onClick={() => approve('production', p.id)}>
                    {busyId === p.id ? '...' : '✓ অনুমোদন করুন'}
                  </button>
                </div>
              </div>
            ))
          )}

          {tab === 'income' && (
            data.income.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>কোনো আয় অনুমোদনের অপেক্ষায় নেই</div>
            ) : data.income.map(inc => (
              <div key={inc.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.income_type || inc.category || 'আয়'} — {money(inc.amount)}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{inc.income_date} {inc.description ? `• ${inc.description}` : ''}</div>
                  </div>
                  <button style={btnApprove} disabled={busyId === inc.id} onClick={() => approve('income', inc.id)}>
                    {busyId === inc.id ? '...' : '✓ অনুমোদন করুন'}
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
