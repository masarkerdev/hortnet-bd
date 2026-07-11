import { useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSa } from "./SaAuth";

const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const THEMES = {
  director: { accent: "#4a8c2a", sidebar: "#1a2e1a" },
  deputy_director: { accent: "#4a8c2a", sidebar: "#1a2e1a" },
  horticulturist: { accent: "#4a8c2a", sidebar: "#1a2e1a" },
  nursery_supervisor: { accent: "#4a8c2a", sidebar: "#1a2e1a" },
};
const ROLE_BN = {
  director: "পরিচালক",
  deputy_director: "উপপরিচালক",
  additional_deputy_director: "অতিরিক্ত উপপরিচালক",
  program_officer: "প্রোগ্রাম অফিসার",
  notice_officer: "নোটিশ অফিসার",
  report_officer: "রিপোর্ট অফিসার",
  viewer: "ভিউয়ার",
  horticulturist: "উদ্যানতত্ত্ববিদ",
  nursery_supervisor: "নার্সারী তত্ত্বাবধায়ক",
};

// রোল-ভিত্তিক অনুমতি — কোন role কোন menu item দেখবে
const PERMS = {
  director:          ["overview","catA","catB","catC","reports","compare","targetSummary","districtSummary","allCenters","admins","notices","categoryMgmt","hrm"],
  deputy_director:   ["overview","catA","catB","catC","reports","compare","targetSummary","districtSummary","notices"],
  additional_deputy_director: ["overview","catA","catB","catC","reports","compare","targetSummary","districtSummary","notices"],
  program_officer:   ["overview","catA","catB","catC","reports","compare","targetSummary","districtSummary","categoryMgmt"],
  notice_officer:    ["overview","notices"],
  report_officer:    ["overview","reports","compare","targetSummary","districtSummary"],
  viewer:            ["overview","catA","catB","catC","reports","compare","targetSummary","districtSummary"],
};
function can(role, key) {
  if (!role) return true; // fallback: role না থাকলে সব দেখাবে (safety)
  return (PERMS[role] || PERMS.viewer).includes(key);
}
const PAGE_TITLES = {
  "": "📊 Overview",
  "category/A": "🏛️ A Category — উপপরিচালক",
  "category/B": "🌿 B Category — উদ্যানতত্ত্ববিদ",
  "category/C": "🪴 C Category — নার্সারী তত্ত্বাবধায়ক",
  compare: "📈 তুলনামূলক রিপোর্ট",
  "target-summary": "🎯 লক্ষ্যমাত্রা সারসংক্ষেপ",
  "district-summary": "🗺️ জেলাভিত্তিক সারসংক্ষেপ",
  "all-centers": "⚙️ সব Center পরিচালনা",
  admins: "👥 Admin পরিচালনা",
  notices: "📢 নোটিশ বোর্ড",
  reports: "📊 রিপোর্ট",
  categories: "📂 Category Master",
  hrm: "👥 জনবল ব্যবস্থাপনা (HRM)",
};

const NAV_SECTIONS = [
  {
    label: "মূল মেনু",
    items: [
      { path: "", icon: "ti-layout-dashboard", text: "Overview", bkey: "overview", perm: "overview" },
    ],
  },
  {
    label: "Center Category",
    divider: true,
    items: [
      { path: "category/A", icon: "ti-building-skyscraper", text: "A — উপপরিচালক", bkey: "A", cat: "A", perm: "catA" },
      { path: "category/B", icon: "ti-plant", text: "B — উদ্যানতত্ত্ববিদ", bkey: "B", cat: "B", perm: "catB" },
      { path: "category/C", icon: "ti-leaf", text: "C — নার্সারী তত্ত্বাবধায়ক", bkey: "C", cat: "C", perm: "catC" },
    ],
  },
  {
    label: "রিপোর্ট",
    divider: true,
    items: [
      { path: "reports", icon: "ti-file-analytics", text: "রিপোর্ট", perm: "reports" },
      { path: "compare", icon: "ti-chart-bar", text: "তুলনামূলক রিপোর্ট", perm: "compare" },
      { path: "target-summary", icon: "ti-target", text: "লক্ষ্যমাত্রা সারসংক্ষেপ", perm: "targetSummary" },
      { path: "district-summary", icon: "ti-map-pin", text: "জেলাভিত্তিক সারসংক্ষেপ", perm: "districtSummary" },
    ],
  },
];
const NAV_DIR = {
  label: "পরিচালক",
  divider: true,
  items: [
    { path: "all-centers", icon: "ti-settings", text: "সব Center পরিচালনা", perm: "allCenters" },
    { path: "admins", icon: "ti-users-group", text: "Admin পরিচালনা", bkey: "admins", perm: "admins" },
    { path: "notices", icon: "ti-speakerphone", text: "নোটিশ বোর্ড", perm: "notices" },
  ],
};

export default function SaLayout() {
  const { sa, logout } = useSa();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("📊 Overview");
  const [badges, setBadges] = useState({ A: 0, B: 0, C: 0, overview: 0, admins: 0 });

  const theme = THEMES[sa?.role] || THEMES.director;

  const handleBadges = useCallback((data) => {
    const ok = data.filter((c) => c.status === "ok" || c.total_revenue != null);
    setBadges((b) => ({
      ...b,
      A: ok.filter((c) => c.category === "A").length,
      B: ok.filter((c) => c.category === "B").length,
      C: ok.filter((c) => c.category === "C").length,
      overview: ok.length,
    }));
  }, []);

  const rLabel = ROLE_BN[sa?.role] || sa?.role || "";
  const adminAv = rLabel.charAt(0).toUpperCase();
  const adminName = rLabel;
  const adminRole =
    sa?.role === "director"
      ? "হর্টিকালচার উইং, DAE"
      : ["হর্টিকালচার সেন্টার", sa?.name, sa?.district].filter(Boolean).join(", ");
  const topbarName = rLabel;
  const topbarRole = [sa?.district, sa?.division].filter(Boolean).join(", ");

  const catColors = {
    A: { text: "#7c3aed", bg: "#f5f3ff", bd: "#ede9fe" },
    B: { text: "#16a34a", bg: "#f0fdf4", bd: "#dcfce7" },
    C: { text: "#d97706", bg: "#fffbeb", bd: "#fef3c7" },
  };

  function NavItem({ item }) {
    const badge = item.bkey ? badges[item.bkey] || 0 : 0;
    const cc = item.cat ? catColors[item.cat] : null;
    return (
      <NavLink
        to={`/superadmin/${item.path}`}
        end={item.path === ""}
        onClick={() => {
          setMobileOpen(false);
          setTitle(PAGE_TITLES[item.path] || "");
        }}
        className="no-underline"
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: isActive ? 600 : 500,
          marginBottom: 1,
          transition: ".15s",
          width: "100%",
          fontFamily: "inherit",
          color: isActive ? (cc ? cc.text : "#fff") : cc ? cc.text : "#c8dbb4",
          background: isActive ? (cc ? cc.bg : "rgba(74,140,42,0.2)") : "transparent",
          border: isActive ? `1px solid ${cc ? cc.bd : "rgba(74,140,42,0.3)"}` : "1px solid transparent",
          textDecoration: "none",
        })}
      >
        <i className={`ti ${item.icon}`} style={{ fontSize: 17, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{item.text}</span>
        {badge > 0 && (
          <span
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.1)",
              color: "#c8dbb4",
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 10,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {item.bkey === "overview" ? toBn(badge) + " center" : toBn(badge)}
          </span>
        )}
      </NavLink>
    );
  }

  function Section({ sec }) {
    const visibleItems = sec.items.filter((item) => can(sa?.role, item.perm));
    if (!visibleItems.length) return null;
    return (
      <>
        {sec.divider && (
          <div style={{ height: 1, background: "rgba(200,219,180,0.15)", margin: "8px 0" }} />
        )}
        {sec.label && (
          <div
            style={{
              fontSize: 10,
              color: "#c8dbb4",
              opacity: 0.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "8px 8px 4px",
            }}
          >
            {sec.label}
          </div>
        )}
        {visibleItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </>
    );
  }

  return (
    <div className="sa-shell">
      <style>{`
        .sa-shell { display:flex; height:100vh; overflow:hidden; font-family:'Noto Sans Bengali','Segoe UI',sans-serif; background:#f1f5f9; }
        .sa-overlay { display:none; }
        .sa-sidebar { width:272px; min-width:272px; display:flex; flex-direction:column; height:100vh; overflow-y:auto; flex-shrink:0; box-shadow:0 1px 3px rgba(0,0,0,0.08); transition: transform .25s ease; z-index:100; }
        .sa-hamburger { display:none; }
        .sa-search-wrap { display:flex; }
        .sa-topbar-right-text { display:block; }
        .sa-topbar-btn-text { display:inline; }

        @media (max-width: 1023px) {
          .sa-sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            transform: translateX(-100%);
          }
          .sa-sidebar.open { transform: translateX(0); }
          .sa-hamburger { display: inline-flex !important; }
          .sa-overlay.open { display:block; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:99; }
          .sa-search-wrap { display:none; }
          .sa-topbar-right-text { display:none; }
          .sa-topbar-btn-text { display:none; }
          .sa-topbar-btn { padding:8px !important; }
          .sa-topbar { padding: 0 12px !important; gap:4px; }
          .sa-main-content { padding: 14px !important; }
          .sa-title { font-size:14px !important; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        }
        @media (max-width: 480px) {
          .sa-topbar-right { gap:4px !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      <div className={`sa-overlay ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />

      {/* ══ SIDEBAR ══ */}
      <aside className={`sa-sidebar ${mobileOpen ? "open" : ""}`} style={{ background: theme.sidebar }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 38, height: 38, background: theme.accent, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0, boxShadow: `0 2px 8px ${theme.accent}55`,
              }}
            >
              🌿
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>HortNet-BD</div>
              <div style={{ fontSize: 11, color: "#c8dbb4", marginTop: 2 }}>Super Admin</div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(74,140,42,0.2)", border: "1px solid rgba(74,140,42,0.3)",
              borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <div
              style={{
                width: 38, height: 38, background: theme.accent, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}
            >
              {adminAv}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{adminName}</div>
              <div style={{ fontSize: 12, color: "#c8dbb4", marginTop: 2 }}>{adminRole}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_SECTIONS.map((sec, i) => (
            <Section key={i} sec={sec} />
          ))}
          {sa?.role === "director" && <Section sec={NAV_DIR} />}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => { logout(); navigate("/superadmin/login"); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
              borderRadius: 8, cursor: "pointer", color: "#f87171", fontSize: 14,
              border: "1px solid transparent", background: "none", width: "100%",
              fontFamily: "inherit", transition: ".15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <i className="ti ti-logout" style={{ fontSize: 17 }} /> লগআউট
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div
          className="sa-topbar"
          style={{
            background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px",
            height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <button
              className="sa-hamburger sa-topbar-btn"
              onClick={() => setMobileOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#1e293b", padding: 4, marginRight: 8 }}
            >
              <i className="ti ti-menu-2" />
            </button>
            <span className="sa-title" style={{ fontSize: 17, fontWeight: 600, color: "#1e293b" }}>{title}</span>
            <div className="sa-search-wrap" style={{ position: "relative", alignItems: "center", marginLeft: 8 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 11, color: "#94a3b8", fontSize: 16, pointerEvents: "none" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Center খুঁজুন..."
                style={{
                  background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 9,
                  padding: "8px 14px 8px 34px", color: "#1e293b", fontSize: 14,
                  fontFamily: "inherit", outline: "none", width: 240, transition: ".2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = theme.accent; e.target.style.width = "300px"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.width = "240px"; e.target.style.background = "#f1f5f9"; }}
              />
            </div>
          </div>

          <div className="sa-topbar-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sa-topbar-right-text" style={{ textAlign: "right", marginRight: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{topbarName}</div>
              {topbarRole && <div style={{ fontSize: 10, color: "#64748b" }}>{topbarRole}</div>}
            </div>
            {can(sa?.role, "categoryMgmt") && <button
              className="sa-topbar-btn"
              onClick={() => navigate("categories")}
              style={{
                background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", transition: ".15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
            >
              <i className="ti ti-category" /> <span className="sa-topbar-btn-text">ক্যাটেগরি ম্যানেজমেন্ট</span>
            </button>}
            {can(sa?.role, "hrm") && <button
              className="sa-topbar-btn"
              onClick={() => navigate("hrm")}
              style={{
                background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", transition: ".15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
            >
              <i className="ti ti-users" /> <span className="sa-topbar-btn-text">HRM</span>
            </button>}
            <button
              className="sa-topbar-btn"
              onClick={() => window.dispatchEvent(new CustomEvent("sa:refresh"))}
              style={{
                background: "#f1f5f9", color: "#1e293b", border: "1px solid #e2e8f0",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", transition: ".15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = "#16a34a"; e.currentTarget.style.background = "#f0fdf4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; e.currentTarget.style.background = "#f1f5f9"; }}
            >
              <i className="ti ti-refresh" /> <span className="sa-topbar-btn-text">Refresh</span>
            </button>
          </div>
        </div>

        <div className="sa-main-content" style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f1f5f9" }}>
          <Outlet context={{ handleBadges, search, theme }} />
        </div>
      </div>
    </div>
  );
}
