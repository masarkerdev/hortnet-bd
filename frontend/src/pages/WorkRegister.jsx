import { useState, useEffect } from 'react';
import api from '../lib/api';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0));
const todayStr = () => new Date().toISOString().slice(0, 10);
const BN_DATE = (iso) => {
  const d = new Date(iso);
  const MON = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return `${toBn(d.getDate())} ${MON[d.getMonth()]} ${toBn(d.getFullYear())}`;
};

const inp = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontFamily: FONT, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11.5, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e8f5ed', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid #f5f7f5' };

export default function WorkRegister() {
  const [tab, setTab] = useState('register');
  const [workTypes, setWorkTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryModal, setEntryModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const EMPTY_ENTRY = { work_type_name: '', reference_no: '', employee_name: '', materials_used: '', quantity_progress: '', wage_rate: '', wage_cost: '', material_cost: '', subofficer_signature: '', controller_note: '' };
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const EMPTY_PLAN = { planned_date: todayStr(), work_type_name: '', employee_name: '', notes: '' };
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  function loadMeta() {
    api.get('/work-types').then(r => setWorkTypes(r.data?.data || [])).catch(() => {});
    api.get('/employees-info').then(r => setEmployees(r.data?.data || [])).catch(() => {});
  }
  function loadEntries() {
    setLoading(true);
    api.get(`/work-register?date=${date}`).then(r => setEntries(r.data?.data || [])).catch(() => {}).finally(() => setLoading(false));
  }
  function loadPlans() {
    api.get('/work-plans').then(r => setPlans(r.data?.data || [])).catch(() => {});
  }

  useEffect(() => { loadMeta(); loadPlans(); }, []);
  useEffect(() => { if (tab === 'register') loadEntries(); }, [date, tab]);

  async function saveEntry() {
    if (!entryForm.work_type_name) return;
    try {
      await api.post('/work-register', { entry_date: date, ...entryForm });
      setEntryModal(false);
      setEntryForm(EMPTY_ENTRY);
      loadEntries();
    } catch (e) {}
  }
  async function deleteEntry(id) {
    if (!window.confirm('এই এন্ট্রি মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-register/${id}`); loadEntries(); } catch (e) {}
  }
  async function approveEntry(id) {
    try { await api.put(`/work-register/${id}/approve`); loadEntries(); } catch (e) {}
  }
  async function savePlan() {
    if (!planForm.work_type_name || !planForm.planned_date) return;
    try {
      await api.post('/work-plans', planForm);
      setPlanModal(false);
      setPlanForm(EMPTY_PLAN);
      loadPlans();
    } catch (e) {}
  }
  async function deletePlan(id) {
    if (!window.confirm('এই পরিকল্পনা মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-plans/${id}`); loadPlans(); } catch (e) {}
  }
  async function convertPlan(id) {
    try { await api.post(`/work-plans/${id}/convert`); loadPlans(); loadEntries(); } catch (e) {}
  }
  async function addWorkType() {
    if (!newTypeName.trim()) return;
    try {
      await api.post('/work-types', { name: newTypeName });
      setNewTypeName('');
      loadMeta();
    } catch (e) {}
  }
  async function deleteWorkType(id) {
    if (!window.confirm('এই কাজের ধরণ মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-types/${id}`); loadMeta(); } catch (e) {}
  }

  const totalWage = entries.reduce((s, e) => s + Number(e.wage_cost || 0), 0);
  const totalMaterial = entries.reduce((s, e) => s + Number(e.material_cost || 0), 0);

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📋 কাজের বিবরণ রেজিস্টার</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>ওভারশিয়ার/ক্ষেত্র সহকারীর দৈনিক কার্যক্রম</p>
        </div>
        <button onClick={() => setTypeModal(true)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>
          ⚙️ কাজের তালিকা পরিচালনা
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #e8f5ed' }}>
        <button onClick={() => setTab('register')}
          style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600, color: tab === 'register' ? '#1a6b3a' : '#6b7280', borderBottom: tab === 'register' ? '2px solid #1a6b3a' : '2px solid transparent' }}>
          📋 কাজের বিবরণ রেজিস্টার
        </button>
        <button onClick={() => setTab('plan')}
          style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600, color: tab === 'plan' ? '#1a6b3a' : '#6b7280', borderBottom: tab === 'plan' ? '2px solid #1a6b3a' : '2px solid transparent' }}>
          📅 সাপ্তাহিক পরিকল্পনা
        </button>
      </div>

      {tab === 'register' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: 180 }} />
            <button onClick={() => setEntryModal(true)}
              style={{ padding: '9px 18px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
              + নতুন এন্ট্রি
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
                <thead>
                  <tr>
                    <th style={th}>কাজের বিবরণ</th>
                    <th style={th}>রেফা./ব্লক</th>
                    <th style={th}>কর্মচারীর নাম</th>
                    <th style={th}>মালামাল</th>
                    <th style={th}>পরিমাণ/অগ্রগতি</th>
                    <th style={th}>মজুরী হার</th>
                    <th style={th}>মজুরী খরচ</th>
                    <th style={th}>মালামাল খরচ</th>
                    <th style={th}>উপ-সহকারীর স্বাক্ষর</th>
                    <th style={th}>স্ট্যাটাস</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} style={{ ...td, textAlign: 'center', padding: 30 }}>লোড হচ্ছে...</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={11} style={{ ...td, textAlign: 'center', padding: 30, color: '#6b7280' }}>{BN_DATE(date)} তারিখে কোনো এন্ট্রি নেই</td></tr>
                  ) : (
                    entries.map(e => (
                      <tr key={e.id} style={{ background: e.is_approved ? '#f7fdf9' : 'transparent' }}>
                        <td style={td}>{e.work_type_name}</td>
                        <td style={td}>{e.reference_no || '-'}</td>
                        <td style={td}>{e.employee_name || '-'}</td>
                        <td style={td}>{e.materials_used || '-'}</td>
                        <td style={td}>{e.quantity_progress || '-'}</td>
                        <td style={td}>৳{fmtN(e.wage_rate)}</td>
                        <td style={td}>৳{fmtN(e.wage_cost)}</td>
                        <td style={td}>৳{fmtN(e.material_cost)}</td>
                        <td style={td}>{e.subofficer_signature || '-'}</td>
                        <td style={td}>
                          {e.is_approved ? (
                            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ অনুমোদিত</span>
                          ) : (
                            <button onClick={() => approveEntry(e.id)}
                              style={{ padding: '4px 10px', borderRadius: 6, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer', fontSize: 11, fontFamily: FONT, fontWeight: 600 }}>
                              ✓ অনুমোদন করুন
                            </button>
                          )}
                        </td>
                        <td style={td}>
                          <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                  {entries.length > 0 && (
                    <tr style={{ background: '#f7f7ee', fontWeight: 700 }}>
                      <td style={td} colSpan={6}>সর্বমোট</td>
                      <td style={td}>৳{fmtN(totalWage)}</td>
                      <td style={td}>৳{fmtN(totalMaterial)}</td>
                      <td style={td} colSpan={3}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'plan' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setPlanModal(true)}
              style={{ padding: '9px 18px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
              + পরিকল্পনা যোগ করুন
            </button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden' }}>
            {plans.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>আগামী ৭ দিনে কোনো পরিকল্পনা নেই</div>
            ) : (
              plans.map(p => (
                <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f7f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.work_type_name} — {BN_DATE(p.planned_date)}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.employee_name || 'কেউ নির্ধারিত নয়'}{p.notes ? ` • ${p.notes}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => convertPlan(p.id)}
                      style={{ padding: '6px 14px', borderRadius: 7, background: '#f0faf3', color: '#1a6b3a', border: '1px solid #c8e0cc', cursor: 'pointer', fontSize: 12, fontFamily: FONT, fontWeight: 600 }}>
                      ✓ Register-এ যোগ করুন
                    </button>
                    <button onClick={() => deletePlan(p.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* নতুন এন্ট্রি Modal */}
      {entryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>নতুন এন্ট্রি — {BN_DATE(date)}</div>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কাজের বিবরণ*</label>
            <select value={entryForm.work_type_name} onChange={e => setEntryForm({ ...entryForm, work_type_name: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
              <option value="">— নির্বাচন করুন —</option>
              {workTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কর্মচারীর নাম</label>
            <select value={entryForm.employee_name} onChange={e => setEntryForm({ ...entryForm, employee_name: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
              <option value="">— নির্বাচন করুন —</option>
              {employees.map(emp => <option key={emp.id} value={emp.name_bn}>{emp.name_bn} ({emp.designation})</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>রেফারেন্স নং/ব্লক</label>
                <input value={entryForm.reference_no} onChange={e => setEntryForm({ ...entryForm, reference_no: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>মালামালের নাম</label>
                <input value={entryForm.materials_used} onChange={e => setEntryForm({ ...entryForm, materials_used: e.target.value })} style={inp} />
              </div>
            </div>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>সম্পাদিত কাজের পরিমাণ/অগ্রগতি</label>
            <input value={entryForm.quantity_progress} onChange={e => setEntryForm({ ...entryForm, quantity_progress: e.target.value })} placeholder="যেমন: ৩০টি, ৫০ গ্রাম/গাছ" style={{ ...inp, marginBottom: 10 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>মজুরী হার</label>
                <input type="text" inputMode="numeric" value={entryForm.wage_rate} onChange={e => setEntryForm({ ...entryForm, wage_rate: e.target.value.replace(/[^0-9]/g, '') })} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>মজুরী খরচ</label>
                <input type="text" inputMode="numeric" value={entryForm.wage_cost} onChange={e => setEntryForm({ ...entryForm, wage_cost: e.target.value.replace(/[^0-9]/g, '') })} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>মালামাল খরচ</label>
                <input type="text" inputMode="numeric" value={entryForm.material_cost} onChange={e => setEntryForm({ ...entryForm, material_cost: e.target.value.replace(/[^0-9]/g, '') })} style={inp} />
              </div>
            </div>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>উপ-সহকারী উদ্যান কর্মকর্তার স্বাক্ষর (নাম)</label>
            <input value={entryForm.subofficer_signature} onChange={e => setEntryForm({ ...entryForm, subofficer_signature: e.target.value })} style={{ ...inp, marginBottom: 10 }} />

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>নিয়ন্ত্রণকারী কর্মকর্তার মন্তব্য</label>
            <textarea value={entryForm.controller_note} onChange={e => setEntryForm({ ...entryForm, controller_note: e.target.value })} rows={2} style={{ ...inp, marginBottom: 16, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setEntryModal(false); setEntryForm(EMPTY_ENTRY); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বাতিল</button>
              <button onClick={saveEntry} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>✓ সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}

      {/* নতুন পরিকল্পনা Modal */}
      {planModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>নতুন পরিকল্পনা যোগ করুন</div>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>তারিখ*</label>
            <input type="date" min={todayStr()} value={planForm.planned_date} onChange={e => setPlanForm({ ...planForm, planned_date: e.target.value })} style={{ ...inp, marginBottom: 10 }} />

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কাজের বিবরণ*</label>
            <select value={planForm.work_type_name} onChange={e => setPlanForm({ ...planForm, work_type_name: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
              <option value="">— নির্বাচন করুন —</option>
              {workTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কর্মচারীর নাম</label>
            <select value={planForm.employee_name} onChange={e => setPlanForm({ ...planForm, employee_name: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
              <option value="">— নির্বাচন করুন —</option>
              {employees.map(emp => <option key={emp.id} value={emp.name_bn}>{emp.name_bn} ({emp.designation})</option>)}
            </select>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>মন্তব্য (ঐচ্ছিক)</label>
            <input value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} style={{ ...inp, marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPlanModal(false); setPlanForm(EMPTY_PLAN); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বাতিল</button>
              <button onClick={savePlan} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>✓ সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}

      {/* কাজের তালিকা পরিচালনা Modal */}
      {typeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚙️ কাজের তালিকা পরিচালনা</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="নতুন কাজের নাম" style={inp} />
              <button onClick={addWorkType} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600, whiteSpace: 'nowrap' }}>+ যোগ</button>
            </div>
            <div style={{ border: '1px solid #e8f5ed', borderRadius: 8, overflow: 'hidden' }}>
              {workTypes.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>কোনো কাজ যোগ করা হয়নি</div>
              ) : (
                workTypes.map(t => (
                  <div key={t.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f5f7f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{t.name}</span>
                    <button onClick={() => deleteWorkType(t.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setTypeModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
