import axios from 'axios';

// কোন কেন্দ্র (tenant) — URL-এ ?tenant=... থাকলে সেটি, নাহলে আগেরটা, নাহলে asambasti
const params = new URLSearchParams(window.location.search);
const slug = params.get('tenant') || localStorage.getItem('tenantSlug') || 'asambasti';
localStorage.setItem('tenantSlug', slug);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// প্রতিটা request-এ tenant ও token যোগ হয়
api.interceptors.request.use((config) => {
  config.headers['X-Tenant-ID'] = localStorage.getItem('tenantSlug') || 'asambasti';
  const token = sessionStorage.getItem('hc_tk');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // নির্বাচিত অর্থবছর (fy) সব GET-এ ডিফল্ট query হিসেবে যায় (আগে থেকে fy থাকলে সেটাই থাকে)
  const fy = localStorage.getItem('hc_fy');
  if (fy) { config.params = { fy, ...(config.params || {}) }; }
  return config;
});

api.interceptors.response.use((res) => {
  try {
    const m = (res.config?.method || '').toLowerCase();
    const u = res.config?.url || '';
    // FIX: শুধু delete/restore-এর মতো mutation action হলেই event fire হবে।
    // আগে GET /recycle-bin (list fetch)-ও ধরে ফেলছিল, ফলে Layout.jsx-এর
    // fetchCount() -> event -> fetchCount() -> event ... করে অসীম লুপ তৈরি হচ্ছিল।
    if (m !== 'get' && (m === 'delete' || u.includes('recycle-bin'))) {
      window.dispatchEvent(new CustomEvent('hc:recycle'));
    }
  } catch { /* ignore */ }
  return res;
});

export const TENANT_SLUG = slug;
export default api;
