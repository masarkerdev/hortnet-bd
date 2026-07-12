// repo-র utility functions হুবহু
export const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
export const fmt = (n) =>
  toBn(parseInt(parseFloat(n || 0)).toLocaleString("en-IN"));
export const fmtN = (n) => toBn(parseInt(n || 0).toLocaleString("en-IN"));
export const fmtK = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 10000000) return toBn((v / 10000000).toFixed(1)) + " কোটি";
  if (v >= 100000) return toBn((v / 100000).toFixed(1)) + " লাখ";
  if (v >= 1000) return toBn((v / 1000).toFixed(1)) + " হাজার";
  return toBn(Math.round(v));
};
export const scoreColor = (s) =>
  s >= 70 ? "#4ade80" : s >= 45 ? "#fbbf24" : "#f87171";
export const tlLabel = (t) =>
  t === "green" ? "ভালো" : t === "yellow" ? "সতর্ক" : "সমস্যা";
export const typeLabel = (t) =>
  ({
    seed: "বীজ",
    cutting: "অঙ্গজ বংশবিস্তার",
    layering: "লেয়ারিং",
    grafting: "গ্রাফটিং",
    budding: "বাডিং",
    tissue_culture: "টিস্যু কালচার",
    purchase: "ক্রয়",
  })[t] || t;
export const roleLabel = (r) =>
  ({
    admin: "Admin",
    manager: "Manager",
    production_officer: "Production",
    sales_operator: "Sales",
    viewer: "Viewer",
  })[r] || r;
export const roleColor = (r) =>
  ({
    admin: "#7c3aed",
    manager: "#0ea5e9",
    production_officer: "#10b981",
    sales_operator: "#f59e0b",
    viewer: "#64748b",
  })[r] || "#64748b";
export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return toBn(
      `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`,
    );
  } catch {
    return d;
  }
};

// repo-র CSS variables (superadmin.css :root হুবহু)
export const V = {
  bg: "#f1f5f9",
  card: "#ffffff",
  card2: "#f8fafc",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text: "#1e293b",
  muted: "#64748b",
  sub: "#94a3b8",
  green: "#16a34a",
  green2: "#15803d",
  green3: "#f0fdf4",
  green4: "#dcfce7",
  blue: "#2563eb",
  blue3: "#eff6ff",
  purple: "#7c3aed",
  purple3: "#f5f3ff",
  amber: "#d97706",
  amber3: "#fffbeb",
  red: "#dc2626",
  red3: "#fef2f2",
  teal: "#0d9488",
  teal3: "#f0fdfa",
  catA: "#7c3aed",
  catAb: "#f5f3ff",
  catAbd: "#ede9fe",
  catB: "#16a34a",
  catBb: "#f0fdf4",
  catBbd: "#dcfce7",
  catC: "#d97706",
  catCb: "#fffbeb",
  catCbd: "#fef3c7",
  shadow: "0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
};

export const CAT_NAMES = {
  A: "A Category — উপপরিচালক",
  B: "B Category — উদ্যানতত্ত্ববিদ",
  C: "C Category — নার্সারী তত্ত্বাবধায়ক",
};

export const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
