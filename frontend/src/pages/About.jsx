import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:'100vh', background:'#f5f7f5', fontFamily:"'Noto Sans Bengali','Segoe UI',sans-serif", color:'#1a2e1a' }}>

      {/* Navbar */}
      <nav style={{ background:'#1a6b3a', color:'#fff', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'10px 20px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, background:'#fff', borderRadius:10, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <img src="/dae-logo.png" alt="DAE" style={{ width:36, height:36, objectFit:'contain' }} onError={e=>{e.target.style.display='none';e.target.parentNode.innerHTML='🌿';}}/>
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Noto Serif Bengali',serif", lineHeight:1.2 }}>হর্টিকালচার সেন্টার</div>
            <div style={{ fontSize:11, opacity:.8 }}>কৃষি সম্প্রসারণ অধিদপ্তর, বাংলাদেশ</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={()=>navigate('/')}
              style={{ background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', padding:'8px 16px', borderRadius:8, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              ← হোম
            </button>
            <button onClick={()=>navigate('/login')}
              style={{ background:'#fff', color:'#1a6b3a', border:'none', padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🔐 লগিন
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg, #0f4f29 0%, #1a6b3a 50%, #2d8a52 100%)', color:'#fff', padding:'48px 20px', textAlign:'center' }}>
        <div style={{ fontSize:13, color:'#86efac', fontWeight:600, marginBottom:12 }}>🌿 হর্টিকালচার উইং, DAE</div>
        <h1 style={{ fontFamily:"'Noto Serif Bengali',serif", fontSize:28, fontWeight:700, marginBottom:10 }}>আমাদের সম্পর্কে</h1>
        <p style={{ fontSize:15, opacity:.85, maxWidth:600, margin:'0 auto' }}>হর্টিকালচার উইং, কৃষি সম্প্রসারণ অধিদপ্তর কর্তৃক পরিচালিত সেবাসমূহ</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 20px' }}>

        {/* Section 1 */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', marginBottom:20, border:'1px solid #c8e0cc', borderLeft:'4px solid #1a6b3a' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:48, height:48, background:'#e8f5ed', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>🌱</div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'#1a6b3a' }}>হর্টিকালচার সেন্টার পরিচালনা ও সেবা প্রদান</h2>
          </div>
          {[
            'হর্টিকালচার সেন্টারসমূহের অন্যতম প্রধান কাজ হলো প্রতি বছর ফল, ফুল, কন্দাল, সবজী ও ঔষধী গাছের মানসম্মত চারা ও কলম উৎপাদনের লক্ষ্যমাত্রা নির্ধারন ও তা বাস্তবায়ন করে সুলভ মূল্যে বিক্রয় করা।',
            'দেশ বিদেশের গবেষনা প্রতিষ্ঠান কর্তৃক উদ্ভাবিত ফল, ফুল, কন্দাল ও সবজীর জাত সমূহ সংগ্রহ করে এদেশের মাটি ও আবহাওয়া উপযোগীতা যাচাই করে উপযোগী জাত সমূহ দ্বারা মাতৃবাগান সৃজন করা এবং সেগুলো রক্ষণাবেক্ষণ করা।',
            'দেশের বিভিন্ন স্থানে ছড়িয়ে ছিটিয়ে থাকা বিশেষ বৈশিষ্টসম্পন্ন (আগাম, নাবী ও বারমাসি) বিভিন্ন ফলের গাছ মাতৃ বৃক্ষ হিসেবে চিহ্নিত করে সেখান থেকে সায়ন সংগ্রহ করে কলম তৈরী ও ঐসব জাতের সংরক্ষণ ও সম্প্রসারণের ব্যবস্থা করা।',
          ].map((t,i)=>(
            <div key={i} style={{ display:'flex', gap:12, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#1a6b3a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0, marginTop:2 }}>{i+1}</div>
              <p style={{ fontSize:15, lineHeight:1.9, color:'#2a4a2a', margin:0 }}>{t}</p>
            </div>
          ))}
        </div>

        {/* Section 2 */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', marginBottom:20, border:'1px solid #c8e0cc', borderLeft:'4px solid #2d8a52' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:48, height:48, background:'#e8f5ed', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>🎯</div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'#1a6b3a' }}>উদ্যান ফসলের লক্ষ্যমাত্রা ও উৎপাদন কৌশল নির্ধারণ</h2>
          </div>
          <p style={{ fontSize:15, lineHeight:1.9, color:'#2a4a2a', marginBottom:16 }}>
            অত্র উইং এর আওতায় সারা দেশের সকল জনগোষ্ঠীর খাদ্য ও পুষ্টি চাহিদা পূরণ, কর্মসংস্থান, পরিবেশের ভারসাম্য রক্ষা, জলবায়ুর প্রভাবমুক্ত রাখা, রপ্তানীর মাধ্যমে বৈদেশিক মুদ্রা অর্জনের লক্ষ্যে সারাদেশের জন্য প্রতিবছর সকল প্রকারের কৃষিজাত ফসলের উৎপাদন লক্ষ্যমাত্রা প্রণয়ন ও বাস্তবায়ন করা হয়।
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {['বাংলাদেশে ফল ও ফুলের আবাদ ও উৎপাদন বৃদ্ধি করা','শাকসব্জী, মশলা ও কন্দাল ফসলের আবাদ ও উৎপাদন বৃদ্ধি করা'].map((t,i)=>(
              <div key={i} style={{ background:'#f0faf3', border:'1px solid #c8e0cc', borderRadius:10, padding:'14px 16px', display:'flex', gap:10 }}>
                <span style={{ color:'#1a6b3a', fontSize:18 }}>✅</span>
                <span style={{ fontSize:14, lineHeight:1.7 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', marginBottom:20, border:'1px solid #c8e0cc', borderLeft:'4px solid #f59e0b' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:48, height:48, background:'#fffbeb', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>🍎</div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'#1a6b3a' }}>ফলমেলার আয়োজন ও ফলবৃক্ষ রোপন</h2>
          </div>
          <p style={{ fontSize:15, lineHeight:1.9, color:'#2a4a2a' }}>
            কৃষি সম্প্রসারণ অধিদপ্তর প্রতি বৎসর জুন মাসে এ উইং এর মাধ্যমে দেশব্যাপী ফলদ বৃক্ষ রোপন পক্ষ উদযাপন করে থাকে। এ উপলক্ষে জাতীয়, জেলা ও উপজেলা পর্যায়ে ফলমেলার আয়োজন করা হয়। ঐসব মেলায় দেশের বিভিন্ন স্থানে উৎপাদিত প্রচলিত ও অপ্রচলিত ফল প্রদর্শনের মাধ্যমে এ সব ফল চাষাবাদে জনসাধারণ ও কৃষকদের উদ্বুদ্ধ করা হয় এবং কৃষক পর্যায়ে ও শিক্ষাপ্রতিষ্ঠানে বিনামূল্যে ফলের চারা সরবরাহ করা হয়ে থাকে। ফলদ ও ঔষধি বৃক্ষ রোপনে বিশেষ অবদানের স্বীকৃতি স্বরূপ কৃষক ও শিক্ষা প্রতিষ্ঠানকে পুরস্কৃত করা হয়ে থাকে।
          </p>
        </div>

        {/* Section 4 */}
        <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', marginBottom:40, border:'1px solid #c8e0cc', borderLeft:'4px solid #7c3aed' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:48, height:48, background:'#f5f3ff', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>📋</div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'#1a6b3a' }}>বিবিধ কার্যক্রম</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
            {[
              'দেশী ফলের পরিচিতি বাড়ানো ও বার মাস ফল প্রাপ্যতার কৌশল নির্ধারণ',
              'বাণিজ্যিক নার্সারী স্থাপনে সহযোগিতা',
              'নতুন ফল বাগান সৃজন ও বাগান ব্যবস্থাপনা',
              'বাংলাদেশে উদ্যান ফসল উৎপাদনের সমস্যাবলীর সমাধান প্রদান',
            ].map((t,i)=>(
              <div key={i} style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:10, padding:'14px 16px', display:'flex', gap:10 }}>
                <span style={{ color:'#7c3aed', fontSize:16, flexShrink:0 }}>🔹</span>
                <span style={{ fontSize:14, lineHeight:1.7 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background:'#1a2e1a', color:'#86efac', textAlign:'center', padding:'24px 16px', fontSize:13 }}>
        <div style={{ marginBottom:6 }}>🌿 হর্টিকালচার উইং, কৃষি সম্প্রসারণ অধিদপ্তর, বাংলাদেশ</div>
        <div style={{ opacity:.6 }}>© {new Date().getFullYear()} HortNet-BD — সর্বস্বত্ব সংরক্ষিত</div>
      </footer>
    </div>
  );
}
