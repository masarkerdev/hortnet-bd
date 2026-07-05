import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSa } from './SaAuth';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";

export default function SaLogin() {
  const { login } = useSa();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try { await login(email.trim(), password); navigate('/superadmin'); }
    catch (e) { setErr(e?.response?.data?.message || e.message || 'লগইন ব্যর্থ হয়েছে'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      fontFamily: FONT,
      background: '#0d1f13',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(1.08)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,15px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      {/* BG blobs */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, #16a34a22 0%, transparent 70%)', animation:'float1 8s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', bottom:'-15%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, #4a8c2a1a 0%, transparent 70%)', animation:'float2 10s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', top:'40%', right:'20%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, #15803d15 0%, transparent 70%)', animation:'float3 7s ease-in-out infinite' }}/>
        {/* Grid pattern */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(#16a34a08 1px, transparent 1px), linear-gradient(90deg, #16a34a08 1px, transparent 1px)', backgroundSize:'40px 40px' }}/>
      </div>

      {/* Left panel — decorative, hidden on mobile */}
      <div className="sa-left-panel" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:24, position:'relative' }}>
        <div style={{ animation:'fadeIn .8s ease forwards', textAlign:'center' }}>
          {/* Logo large */}
          <div style={{ position:'relative', display:'inline-block', marginBottom:32 }}>
            <div style={{ position:'absolute', inset:-8, borderRadius:'50%', background:'#16a34a', opacity:.15, animation:'pulse-ring 2s ease-out infinite' }}/>
            <div style={{ width:100, height:100, borderRadius:28, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 20px 60px #16a34a44', position:'relative', overflow:'hidden', padding:8, boxSizing:'border-box' }}>
              <img src="/dae-logo.png" alt="DAE" style={{ width:'80%', height:'80%', objectFit:'contain', borderRadius:12 }} onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🌿'; }}/>
            </div>
          </div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.5px' }}>HortNet-BD</h1>
          <p style={{ fontSize:15, color:'#4ade80', fontWeight:500, margin:'0 0 48px' }}>হর্টিকালচার উইং, কৃষি সম্প্রসারণ অধিদপ্তর</p>

          {/* Stats cards */}
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            {[['🏛️','৭৬+','সেন্টার'],['🌱','DAE','সরকারি'],['📊','Real-time','ডেটা']].map(([icon,val,label])=>(
              <div key={label} style={{ background:'#ffffff0d', backdropFilter:'blur(8px)', border:'1px solid #ffffff12', borderRadius:14, padding:'16px 20px', minWidth:100, textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#4ade80' }}>{val}</div>
                <div style={{ fontSize:12, color:'#86efac', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="sa-right-panel" style={{ width:440, display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>
        <div style={{
          width:'100%', maxWidth:400,
          background:'#ffffff0d',
          backdropFilter:'blur(24px)',
          border:'1px solid #ffffff18',
          borderRadius:24,
          padding:40,
          animation:'fadeIn .6s ease .2s both',
          boxShadow:'0 32px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Form header */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#16a34a22', border:'1px solid #16a34a44', borderRadius:20, padding:'4px 12px', fontSize:12, color:'#4ade80', marginBottom:16, fontWeight:600 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block' }}/>
              সুপার অ্যাডমিন পোর্টাল
            </div>
            <h2 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>স্বাগতম!</h2>
            <p style={{ fontSize:14, color:'#86efac', margin:0 }}>আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
          </div>

          {/* Email field */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#86efac', marginBottom:8 }}>ইমেইল ঠিকানা</label>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, opacity:.5 }}>✉️</div>
              <input
                value={email}
                onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submit()}
                onFocus={()=>setFocusEmail(true)}
                onBlur={()=>setFocusEmail(false)}
                placeholder="director@dae.gov.bd"
                style={{
                  width:'100%', padding:'13px 14px 13px 44px',
                  background:'#ffffff0d',
                  border:`1.5px solid ${focusEmail?'#4ade80':'#ffffff18'}`,
                  borderRadius:12, fontSize:14, color:'#fff',
                  fontFamily:FONT, outline:'none', boxSizing:'border-box',
                  transition:'.2s',
                  boxShadow: focusEmail ? '0 0 0 3px #16a34a22' : 'none',
                }}/>
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#86efac', marginBottom:8 }}>পাসওয়ার্ড</label>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, opacity:.5 }}>🔒</div>
              <input
                type={show?'text':'password'}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submit()}
                onFocus={()=>setFocusPass(true)}
                onBlur={()=>setFocusPass(false)}
                placeholder="••••••••"
                style={{
                  width:'100%', padding:'13px 44px 13px 44px',
                  background:'#ffffff0d',
                  border:`1.5px solid ${focusPass?'#4ade80':'#ffffff18'}`,
                  borderRadius:12, fontSize:14, color:'#fff',
                  fontFamily:FONT, outline:'none', boxSizing:'border-box',
                  transition:'.2s',
                  boxShadow: focusPass ? '0 0 0 3px #16a34a22' : 'none',
                }}/>
              <button onClick={()=>setShow(!show)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#86efac', cursor:'pointer', fontSize:13, fontFamily:FONT, padding:0 }}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div style={{ background:'#ef444422', border:'1px solid #ef444444', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fca5a5', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              ⚠️ {err}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={submit}
            disabled={busy}
            style={{
              width:'100%', padding:'14px',
              background: busy ? '#15803d88' : 'linear-gradient(135deg, #16a34a, #15803d)',
              border:'none', borderRadius:12,
              fontSize:15, fontWeight:700, color:'#fff',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily:FONT, transition:'.2s',
              boxShadow: busy ? 'none' : '0 8px 24px #16a34a44',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
            onMouseEnter={e=>{ if(!busy) e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; }}>
            {busy ? (
              <>
                <div style={{ width:16, height:16, border:'2px solid #fff4', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                লগইন হচ্ছে...
              </>
            ) : '🔐 লগইন করুন'}
          </button>

          {/* Footer */}
          <div style={{ marginTop:24, textAlign:'center' }}>
            <a href="/" style={{ fontSize:13, color:'#4ade80', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}
              onMouseEnter={e=>e.currentTarget.style.color='#86efac'}
              onMouseLeave={e=>e.currentTarget.style.color='#4ade80'}>
              ← সেন্টার প্যানেলে ফিরুন
            </a>
          </div>
        </div>
      </div>

      {/* Mobile: hide left panel */}
      <style>{`
        @media(max-width:768px){
          .sa-left-panel{display:none!important}
          .sa-right-panel{width:100%!important;padding:20px!important}
        }
        @media(max-width:400px){
          .sa-right-panel > div {padding:28px 20px!important}
        }
      `}</style>
    </div>
  );
}
