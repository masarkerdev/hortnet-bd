import { useState, useEffect } from 'react';
import api from '../lib/api';
import { today as todayStr } from '../lib/format';

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = n => String(n ?? 0).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const fmtN = n => toBn(Math.round(n || 0));
const MON_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const BN_DATE = (iso) => {
  const d = new Date(iso);
  return `${toBn(d.getDate())} ${MON_BN[d.getMonth()]}`;
};

const inp = { padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontFamily: FONT, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const th = { padding: '8px 10px', textAlign: 'left', fontSize: 11.5, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e8f5ed', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid #f5f7f5' };

export default function WorkRegister() {
  const [tab, setTab] = useState('register');
  const [workTypes, setWorkTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [plans, setPlans] = useState([]);
  const [entryModal, setEntryModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [monthDays, setMonthDays] = useState([]);
  const [monthLoading, setMonthLoading] = useState(true);

  const EMPTY_ENTRY = { entry_date: todayStr(), work_type_name: '', employee_names: [], reference_no: '', materials_used: '', quantity_progress: '', wage_rate: '', wage_cost: '', material_cost: '', subofficer_signature: '', controller_note: '' };
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const EMPTY_PLAN = { planned_date: todayStr(), work_type_name: '', employee_name: '', notes: '' };
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  function loadMeta() {
    api.get('/work-types').then(r => setWorkTypes(r.data?.data || [])).catch(() => {});
    api.get('/employees-info').then(r => setEmployees(r.data?.data || [])).catch(() => {});
  }
  function loadHolidays() {
    api.get('/work-holidays').then(r => setHolidays(r.data?.data || [])).catch(() => {});
  }
  function loadMonth() {
    setMonthLoading(true);
    api.get(`/work-register/month?year=${viewYear}&month=${viewMonth}`)
      .then(r => setMonthDays(r.data?.data || []))
      .catch(() => {})
      .finally(() => setMonthLoading(false));
  }
  function loadPlans() {
    api.get('/work-plans').then(r => setPlans(r.data?.data || [])).catch(() => {});
  }

  useEffect(() => { loadMeta(); loadPlans(); loadHolidays(); }, []);
  useEffect(() => { loadMonth(); }, [viewYear, viewMonth]);

  async function saveEntry() {
    if (!entryForm.work_type_name || !entryForm.entry_date) return;
    try {
      const { employee_names, entry_date, ...rest } = entryForm;
      await api.post('/work-register', { entry_date, ...rest, employee_name: (employee_names || []).join(', ') });
      setEntryModal(false);
      setEntryForm({ ...EMPTY_ENTRY, entry_date });
      loadMonth();
    } catch (e) {}
  }
  async function deleteEntry(id) {
    if (!window.confirm('এই এন্ট্রি মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-register/${id}`); loadMonth(); } catch (e) {}
  }
  async function approveEntry(id) {
    try { await api.put(`/work-register/${id}/approve`); loadMonth(); } catch (e) {}
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
    try { await api.post(`/work-plans/${id}/convert`); loadPlans(); loadMonth(); } catch (e) {}
  }
  async function addWorkType() {
    if (!newTypeName.trim()) return;
    try { await api.post('/work-types', { name: newTypeName }); setNewTypeName(''); loadMeta(); } catch (e) {}
  }
  async function deleteWorkType(id) {
    if (!window.confirm('এই কাজের ধরণ মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-types/${id}`); loadMeta(); } catch (e) {}
  }
  async function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    try {
      await api.post('/work-holidays', { holiday_date: newHolidayDate, name: newHolidayName });
      setNewHolidayDate(''); setNewHolidayName('');
      loadHolidays(); loadMonth();
    } catch (e) {}
  }
  async function deleteHoliday(id) {
    if (!window.confirm('এই ছুটি মুছে ফেলবেন?')) return;
    try { await api.delete(`/work-holidays/${id}`); loadHolidays(); loadMonth(); } catch (e) {}
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📋 কাজের বিবরণ রেজিস্টার</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>ওভারশিয়ার/ক্ষেত্র সহকারীর দৈনিক কার্যক্রম</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setHolidayModal(true)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>
            🗓️ ছুটির তালিকা
          </button>
          <button onClick={() => setTypeModal(true)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>
            ⚙️ কাজের তালিকা পরিচালনা
          </button>
        </div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))} style={{ ...inp, width: 150 }}>
                {MON_BN.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))} style={{ ...inp, width: 100 }}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{toBn(y)}</option>)}
              </select>
            </div>
            <button onClick={() => { setEntryForm({ ...EMPTY_ENTRY, entry_date: todayStr() }); setEntryModal(true); }}
              style={{ padding: '9px 18px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
              + নতুন এন্ট্রি
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e8f5ed', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>তারিখ ও বার</th>
                  <th style={th}>কাজের বিবরণ</th>
                </tr>
              </thead>
              <tbody>
                {monthLoading ? (
                  <tr><td colSpan={2} style={{ ...td, textAlign: 'center', padding: 30 }}>লোড হচ্ছে...</td></tr>
                ) : (
                  monthDays.map(day => {
                    const isOff = day.is_weekend || day.holiday_name;
                    return (
                      <tr key={day.date} style={{ background: isOff ? '#fef8f0' : 'transparent', verticalAlign: 'top' }}>
                        <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {BN_DATE(day.date)}<br />
                          <span style={{ fontSize: 11, color: isOff ? '#b45309' : '#9ca3af', fontWeight: 500 }}>
                            {day.holiday_name ? `${day.holiday_name} (ছুটি)` : day.is_weekend ? `${day.weekday} (অফ ডে)` : day.weekday}
                          </span>
                        </td>
                        <td style={td}>
                          {isOff ? (
                            <span style={{ color: '#b45309' }}>— সরকারি বন্ধ —</span>
                          ) : day.entries.length === 0 ? (
                            <span style={{ color: '#9ca3af' }}>কোনো কাজ নেই</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {day.entries.map(e => (
                                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '6px 10px', background: e.is_approved ? '#f7fdf9' : '#fffdf5', borderRadius: 6, border: `1px solid ${e.is_approved ? '#c8e0cc' : '#fde68a'}` }}>
                                  <div>
                                    <b>{e.work_type_name}</b> — {e.employee_name || 'কর্মচারী উল্লেখ নেই'}
                                    {e.quantity_progress && <span style={{ color: '#6b7280' }}> ({e.quantity_progress})</span>}
                                    {(Number(e.wage_cost) > 0 || Number(e.material_cost) > 0) && (
                                      <span style={{ color: '#6b7280', fontSize: 11.5 }}> — মজুরী ৳{fmtN(e.wage_cost)} + মালামাল ৳{fmtN(e.material_cost)}</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {e.is_approved ? (
                                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ অনুমোদিত</span>
                                    ) : (
                                      <button onClick={() => approveEntry(e.id)}
                                        style={{ padding: '3px 8px', borderRadius: 5, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer', fontSize: 11, fontFamily: FONT, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        ✓ অনুমোদন
                                      </button>
                                    )}
                                    <button onClick={() => deleteEntry(e.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>নতুন এন্ট্রি</div>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>তারিখ*</label>
            <input type="date" value={entryForm.entry_date} onChange={e => setEntryForm({ ...entryForm, entry_date: e.target.value })} style={{ ...inp, marginBottom: 10 }} />

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কাজের বিবরণ*</label>
            <select value={entryForm.work_type_name} onChange={e => setEntryForm({ ...entryForm, work_type_name: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
              <option value="">— নির্বাচন করুন —</option>
              {workTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>

            <label style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>কর্মচারীর নাম (একাধিক নির্বাচন করা যাবে)</label>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', marginBottom: 10, maxHeight: 130, overflowY: 'auto' }}>
              {employees.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>কোনো কর্মচারী পাওয়া যায়নি</div>
              ) : (
                employees.map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={entryForm.employee_names.includes(emp.name_bn)}
                      onChange={(e) => {
                        const list = entryForm.employee_names;
                        setEntryForm({
                          ...entryForm,
                          employee_names: e.target.checked ? [...list, emp.name_bn] : list.filter(n => n !== emp.name_bn),
                        });
                      }}
                    />
                    {emp.name_bn} ({emp.designation})
                  </label>
                ))
              )}
            </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
              <button onClick={() => setEntryModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বাতিল</button>
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
              <button onClick={() => setPlanModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বাতিল</button>
              <button onClick={savePlan} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>✓ সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}

      {/* ছুটির তালিকা Modal */}
      {holidayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🗓️ ছুটির তালিকা পরিচালনা</div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>শুক্র/শনিবার automatic "অফ ডে" ধরা হয় — এখানে শুধু বিশেষ সরকারি ছুটি (ঈদ, জাতীয় দিবস ইত্যাদি) যোগ করবেন।</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ ...inp, flex: '0 0 140px' }} />
              <input value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="ছুটির নাম" style={inp} />
              <button onClick={addHoliday} style={{ padding: '8px 16px', borderRadius: 8, background: '#1a6b3a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT, fontWeight: 600, whiteSpace: 'nowrap' }}>+ যোগ</button>
            </div>
            <div style={{ border: '1px solid #e8f5ed', borderRadius: 8, overflow: 'hidden' }}>
              {holidays.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>কোনো ছুটি যোগ করা হয়নি</div>
              ) : (
                holidays.map(h => (
                  <div key={h.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f5f7f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{BN_DATE(h.holiday_date)} — {h.name}</span>
                    <button onClick={() => deleteHoliday(h.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setHolidayModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: FONT }}>বন্ধ করুন</button>
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
