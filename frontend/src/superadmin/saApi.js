import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || '/api') + '/superadmin';

const saApi = axios.create({ baseURL: BASE, headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
saApi.interceptors.request.use((config) => {
  const t = sessionStorage.getItem('sa_tk');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
export default saApi;
