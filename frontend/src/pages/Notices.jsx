import { useEffect, useState } from 'react';
import api from '../lib/api';

const PRI_COLOR = { urgent:'#ef4444', important:'#f59e0b', normal:'#3b82f6' };
const PRI_LABEL = { urgent:'🔴 জরুরি', important:'🟡 গুরুত্বপূর্ণ', normal:'🔵 সাধারণ' };
const PRI_BG    = { urgent:'#fef2f2', important:'#fffbeb', normal:'#eff6ff' };

function daysLeft(expires_at) {
  if (!expires_at) return null;
  const diff = Math.ceil((new Date(expires_at) - new Date()) / (1000*60*60*24));
  return diff;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('bn-BD', { year:'numeric', month:'long', day:'numeric' });
}

function NoticeCard({ n, expired=false }) {
  const days = daysLeft(n.expires_at);
  const urgent = days !== null && days <= 1 && !expired;
  
  return (
    <div style={{
      background: expired ? '#f8fafc' : PRI_BG[n.priority]||'#eff6ff',
      border: `1px solid ${expired ? '#e2e8f0' : PRI_COLOR[n.priority]||'#3b82f6'}33`,
      borderLeft: `4px solid ${expired ? '#cbd5e1' : PRI_COLOR[n.priority]||'#3b82f6'}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 10,
      opacity: expired ? 0.6 : 1,
      transition: '.2s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:expired?'#94a3b8':PRI_COLOR[n.priority], fontWeight:700 }}>
              {expired ? '⚫ মেয়াদ শেষ' : PRI_LABEL[n.priority]||PRI_LABEL.normal}
            </span>
            {urgent && (
              <span style={{ fontSize:11, background:'#ef4444', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600, animation:'pulse 1.5s infinite' }}>
                ⚡ আজ মেয়াদ শেষ
              </span>
            )}
            {days !== null && days > 1 && days <= 3 && !expired && (
              <span style={{ fontSize:11, background:'#f59e0b', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
                {days} দিন বাকি
              </span>
            )}
          </div>
          <div style={{ fontSize:16, fontWeight:700, color: expired?'#64748b':'#1e293b', marginBottom:6 }}>{n.title}</div>
          <div style={{ fontSize:14, color: expired?'#94a3b8':'#475569', lineHeight:1.8, whiteSpace:'pre-line' }}>{n.content}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10, paddingTop:10, borderTop:`1px solid ${expired?'#e2e8f0':'#e2e8f0'}`, fontSize:12, color:'#94a3b8' }}>
        <span>📅 প্রকাশ: {fmtDate(n.created_at)}</span>
        {n.expires_at && <span>⏰ মেয়াদ: {fmtDate(n.expires_at)}</span>}
        {n.created_by && <span>👤 {n.created_by}</span>}
      </div>
    </div>
  );
}

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [allNotices, setAllNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/notices'),
      api.get('/notices/all').catch(() => ({ data: { data:[] } }))
    ]).then(([r1, r2]) => {
      setNotices(r1.data?.data||[]);
      setAllNotices(r2.data?.data||r1.data?.data||[]);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const today = notices;
  const expiringSoon = today.filter(n => { const d=daysLeft(n.expires_at); return d!==null && d<=3 && d>=0; });
  const normal = today.filter(n => { const d=daysLeft(n.expires_at); return d===null || d>3; });
  const expired = allNotices.filter(n => { const d=daysLeft(n.expires_at); return d!==null && d<0; });

  if (loading) return <div className="lt">লোড হচ্ছে…</div>;

  return (
    <div className="space-y-6">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, background:'var(--g50)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg style={{ width:22, height:22, color:'var(--g600)' }} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--tp)' }}>নোটিশ বোর্ড</h1>
          <p style={{ fontSize:13, color:'var(--tm)' }}>হর্টিকালচার উইং, DAE</p>
        </div>
        {today.length > 0 && (
          <span style={{ marginLeft:'auto', background:'var(--g600)', color:'#fff', fontSize:13, padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
            {today.length}টি সক্রিয়
          </span>
        )}
      </div>

      {/* মেয়াদ শেষ হওয়ার কাছাকাছি */}
      {expiringSoon.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#ef4444' }}>⚡ শীঘ্রই মেয়াদ শেষ</span>
            <span style={{ background:'#fef2f2', color:'#ef4444', fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{expiringSoon.length}টি</span>
          </div>
          {expiringSoon.map(n => <NoticeCard key={n.id} n={n}/>)}
        </div>
      )}

      {/* সক্রিয় নোটিশ */}
      {normal.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--tp)' }}>📢 সক্রিয় নোটিশ</span>
            <span style={{ background:'var(--g50)', color:'var(--g600)', fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{normal.length}টি</span>
          </div>
          {normal.map(n => <NoticeCard key={n.id} n={n}/>)}
        </div>
      )}

      {/* কোনো নোটিশ নেই */}
      {today.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tm)' }}>
          <svg style={{ width:48, height:48, margin:'0 auto 16px', opacity:.3 }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p style={{ fontSize:15 }}>কোনো সক্রিয় নোটিশ নেই</p>
        </div>
      )}

      {/* মেয়াদ শেষ নোটিশ */}
      {expired.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#94a3b8' }}>⚫ মেয়াদোত্তীর্ণ নোটিশ</span>
            <span style={{ background:'#f1f5f9', color:'#94a3b8', fontSize:11, padding:'2px 8px', borderRadius:10 }}>{expired.length}টি</span>
          </div>
          {expired.map(n => <NoticeCard key={n.id} n={n} expired/>)}
        </div>
      )}
    </div>
  );
}
