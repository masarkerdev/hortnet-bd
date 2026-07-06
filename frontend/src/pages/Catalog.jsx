import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API =
  import.meta.env.VITE_API_URL?.replace("/api", "") || window.location.origin;
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const CAT_COLOR = { A: "#7c3aed", B: "#1a6b3a", C: "#d97706" };
const CAT_LABEL = { A: "ক্যাটাগরি-A", B: "ক্যাটাগরি-B", C: "ক্যাটাগরি-C" };
const CAT_BG = { A: "#f5f3ff", B: "#e8f5ed", C: "#fffbeb" };

export default function Catalog() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState("centers"); // centers | search
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [loadingSeedlings, setLoadingSeedlings] = useState(false);
  const [filters, setFilters] = useState({
    division: "",
    district: "",
    thana: "",
    category: "",
  });
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/public/centers`, {
      headers: { "Cache-Control": "no-store" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCenters(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const divisions = [
    ...new Set(centers.map((c) => c.division).filter(Boolean)),
  ].sort();
  const districts = [
    ...new Set(
      centers
        .filter((c) => !filters.division || c.division === filters.division)
        .map((c) => c.district)
        .filter(Boolean),
    ),
  ].sort();
  const thanas = [
    ...new Set(
      centers
        .filter(
          (c) =>
            (!filters.division || c.division === filters.division) &&
            (!filters.district || c.district === filters.district),
        )
        .map((c) => c.thana)
        .filter(Boolean),
    ),
  ].sort();

  const filtered = centers.filter(
    (c) =>
      (!filters.division || c.division === filters.division) &&
      (!filters.district || c.district === filters.district) &&
      (!filters.thana || c.thana === filters.thana) &&
      (!filters.category || c.category === filters.category),
  );

  async function doSearch(q) {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(
        `${API}/api/public/search?q=${encodeURIComponent(q)}`,
      );
      const d = await r.json();
      setSearchResults(d.data || []);
    } catch {
    } finally {
      setSearching(false);
    }
  }

  async function openCenter(c) {
    setSelectedCenter(c);
    setLoadingSeedlings(true);
    try {
      const r = await fetch(`${API}/api/public/centers/${c.slug}/seedlings`);
      const d = await r.json();
      setSeedlings(d.data || []);
    } catch {
      setSeedlings([]);
    } finally {
      setLoadingSeedlings(false);
    }
  }

  const selStyle = {
    padding: "8px 14px",
    border: "1px solid #c8e0cc",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    color: "#1a2e1a",
    background: "#fff",
    cursor: "pointer",
    minWidth: 120,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f5",
        fontFamily: "'Noto Sans Bengali','Segoe UI',sans-serif",
        color: "#1a2e1a",
      }}
    >
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .cat-card { animation: fadeIn .3s ease forwards; }
        .cat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(26,107,58,0.15)!important; }
        .seed-row:hover { background:#f0faf3!important; }
        @media(max-width:600px){ .hide-mobile{display:none!important} .mobile-menu-btn{display:block!important} }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          background: "#1a6b3a",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 44,
              height: 44,
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src="/dae-logo.png"
              alt="DAE"
              style={{ width: 36, height: 36, objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentNode.innerHTML = "🌿";
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "'Noto Serif Bengali',serif",
                lineHeight: 1.2,
              }}
            >
              হর্টিকালচার সেন্টার সমূহ
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>
              হর্টিকালচার উহং, কৃষি সম্প্রসারণ অধিদপ্তর
            </div>
          </div>
          {/* Nav links */}
          <div
            className="hide-mobile"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              onClick={() => navigate("/about")}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: ".2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              আমাদের সম্পর্কে
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "#fff",
                color: "#1a6b3a",
                border: "none",
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: ".2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8f5ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              🔐 সেন্টার লগিন
            </button>
            <button
              onClick={() => navigate("/superadmin/login")}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: ".2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              🔐 পরিচালক লগিন
            </button>
          </div>
          {/* Mobile menu */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              display: "none",
            }}
            className="mobile-menu-btn"
          >
            ☰
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenu && (
          <div
            style={{
              background: "#155c30",
              padding: "10px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <a
              href="https://horticulturewingbd.com/#services"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fff", textDecoration: "none", fontSize: 14 }}
            >
              আমাদের সম্পর্কে
            </a>
            <button
              onClick={() => navigate("/about")}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: ".2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              আমাদের সম্পর্কে
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "#fff",
                color: "#1a6b3a",
                border: "none",
                padding: "8px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              🔐 লগিন
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      {!selectedCenter && (
        <div
          style={{
            background:
              "linear-gradient(135deg, #0f4f29 0%, #1a6b3a 50%, #2d8a52 100%)",
            color: "#fff",
            padding: "48px 20px 56px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#86efac",
              fontWeight: 600,
              marginBottom: 12,
              letterSpacing: ".05em",
            }}
          >
            🌿কৃষি সম্প্রসারণ অধিদপ্তর
          </div>
          <h1
            style={{
              fontFamily: "'Noto Serif Bengali',serif",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 10,
              lineHeight: 1.3,
            }}
          >
            হর্টিকালচার সেন্টার চারা অনুসন্ধান
          </h1>
          <p
            style={{
              fontSize: 15,
              opacity: 0.85,
              marginBottom: 32,
              maxWidth: 500,
              margin: "0 auto 32px",
            }}
          >
            সারা বাংলাদেশের হর্টিকালচার সেন্টার থেকে উন্নত মানের চারা ও কলম
            সম্পর্কে জানুন
          </p>
          {/* Tabs */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: 4,
              gap: 4,
              marginBottom: 24,
            }}
          >
            {[
              ["centers", "🏛️ সেন্টার তালিকা"],
              ["search", "🔍 চারা অনুসন্ধান"],
            ].map(([t, l]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === "centers") setSelectedCenter(null);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 9,
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: ".2s",
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#1a6b3a" : "#fff",
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {/* Search input */}
          {tab === "search" && (
            <div
              style={{ maxWidth: 500, margin: "0 auto", position: "relative" }}
            >
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  doSearch(e.target.value);
                }}
                placeholder="চারার নাম লিখুন... যেমন: আম, কাঁঠাল, পেয়ারা"
                style={{
                  width: "100%",
                  padding: "14px 50px 14px 18px",
                  borderRadius: 12,
                  border: "none",
                  fontSize: 15,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 20,
                }}
              >
                🔍
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Center selected — seedling view */}
        {selectedCenter && (
          <div>
            <button
              onClick={() => setSelectedCenter(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#fff",
                border: "1px solid #c8e0cc",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 20,
                color: "#1a6b3a",
              }}
            >
              ← সব সেন্টার
            </button>
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "20px 24px",
                marginBottom: 20,
                border: "1px solid #c8e0cc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    background: CAT_BG[selectedCenter.category] || "#e8f5ed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  🌿
                </div>
                <div>
                  <h2
                    style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}
                  >
                    {selectedCenter.name_bn}
                  </h2>
                  <div style={{ fontSize: 13, color: "#5a7a5a" }}>
                    📍 {selectedCenter.location} • {selectedCenter.district} •{" "}
                    {selectedCenter.division}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      background: CAT_BG[selectedCenter.category],
                      color: CAT_COLOR[selectedCenter.category],
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontWeight: 600,
                      marginTop: 4,
                      display: "inline-block",
                    }}
                  >
                    {CAT_LABEL[selectedCenter.category]}
                  </span>
                </div>
              </div>
            </div>
            {loadingSeedlings ? (
              <div
                style={{ textAlign: "center", padding: 40, color: "#5a7a5a" }}
              >
                লোড হচ্ছে...
              </div>
            ) : !seedlings.length ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#5a7a5a" }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <p>এই সেন্টারে কোনো চারা নেই</p>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #c8e0cc",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #e8f5ed",
                    fontSize: 15,
                    fontWeight: 600,
                    background: "#f0faf3",
                  }}
                >
                  🌱 চারা তালিকা — {toBn(seedlings.length)}টি প্রজাতি
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          "চারার নাম",
                          "জাত",
                          "বিক্রয় মূল্য",
                          "বর্তমান স্টক",
                          "ক্যাটাগরি",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 16px",
                              textAlign: "left",
                              fontSize: 13,
                              color: "#5a7a5a",
                              fontWeight: 600,
                              background: "#f5f7f5",
                              borderBottom: "1px solid #e0e8e0",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seedlings.map((s) => (
                        <tr
                          key={s.id}
                          className="seed-row"
                          style={{ transition: ".15s" }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 600,
                              borderBottom: "1px solid #f0f4f0",
                            }}
                          >
                            {s.name_bn}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#5a7a5a",
                              borderBottom: "1px solid #f0f4f0",
                            }}
                          >
                            {s.variety || "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#1a6b3a",
                              fontWeight: 600,
                              borderBottom: "1px solid #f0f4f0",
                            }}
                          >
                            ৳{toBn(s.unit_price || 0)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid #f0f4f0",
                            }}
                          >
                            <span
                              style={{
                                background:
                                  s.current_stock > 0 ? "#e8f5ed" : "#fef2f2",
                                color:
                                  s.current_stock > 0 ? "#1a6b3a" : "#dc2626",
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              {s.current_stock > 0
                                ? `${toBn(s.current_stock)}টি`
                                : "স্টক নেই"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid #f0f4f0",
                              color: "#5a7a5a",
                              fontSize: 13,
                            }}
                          >
                            {s.category_bn || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Centers tab */}
        {!selectedCenter && tab === "centers" && (
          <div>
            {/* Filter bar */}
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 20,
                border: "1px solid #c8e0cc",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {[
                { id: "division", label: "বিভাগ", opts: divisions },
                { id: "district", label: "জেলা", opts: districts },
                { id: "thana", label: "থানা", opts: thanas },
              ].map((f) => (
                <select
                  key={f.id}
                  value={filters[f.id]}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      [f.id]: e.target.value,
                      ...(f.id === "division"
                        ? { district: "", thana: "" }
                        : f.id === "district"
                          ? { thana: "" }
                          : {}),
                    }))
                  }
                  style={selStyle}
                >
                  <option value="">সব {f.label}</option>
                  {f.opts.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ))}
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, category: e.target.value }))
                }
                style={selStyle}
              >
                <option value="">সব ক্যাটাগরি</option>
                <option value="A">ক্যাটাগরি-A</option>
                <option value="B">ক্যাটাগরি-B</option>
                <option value="C">ক্যাটাগরি-C</option>
              </select>
              {(filters.division ||
                filters.district ||
                filters.thana ||
                filters.category) && (
                <button
                  onClick={() =>
                    setFilters({
                      division: "",
                      district: "",
                      thana: "",
                      category: "",
                    })
                  }
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ✕ রিসেট
                </button>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  color: "#5a7a5a",
                  fontWeight: 600,
                }}
              >
                {toBn(filtered.length)}টি সেন্টার
              </span>
            </div>

            {loading ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#5a7a5a" }}
              >
                লোড হচ্ছে...
              </div>
            ) : !filtered.length ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#5a7a5a" }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
                <p>কোনো সেন্টার পাওয়া যায়নি</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                  gap: 14,
                }}
              >
                {filtered.map((c) => (
                  <div
                    key={c.slug}
                    className="cat-card"
                    onClick={() => openCenter(c)}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      padding: 20,
                      border: `1px solid ${CAT_COLOR[c.category] || "#c8e0cc"}33`,
                      cursor: "pointer",
                      transition: ".2s",
                      boxShadow: "0 2px 8px rgba(26,107,58,0.08)",
                      borderTop: `3px solid ${CAT_COLOR[c.category] || "#1a6b3a"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: CAT_BG[c.category] || "#e8f5ed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        🌿
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            marginBottom: 4,
                            lineHeight: 1.3,
                          }}
                        >
                          {c.name_bn}
                        </div>
                        <div style={{ fontSize: 13, color: "#5a7a5a" }}>
                          📍 {c.location || c.district}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              background: CAT_BG[c.category],
                              color: CAT_COLOR[c.category],
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                          >
                            {CAT_LABEL[c.category] || c.category}
                          </span>
                          {c.total_seedlings > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "#e8f5ed",
                                color: "#1a6b3a",
                                padding: "2px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {toBn(c.total_seedlings)}টি চারা
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search tab */}
        {!selectedCenter && tab === "search" && (
          <div>
            {searching ? (
              <div
                style={{ textAlign: "center", padding: 40, color: "#5a7a5a" }}
              >
                খোঁজা হচ্ছে...
              </div>
            ) : !search.trim() ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#5a7a5a" }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p>চারার নাম লিখুন</p>
                <small>সব সেন্টারে একসাথে খোঁজা হবে</small>
              </div>
            ) : !searchResults.length ? (
              <div
                style={{ textAlign: "center", padding: 60, color: "#5a7a5a" }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
                <p>"{search}" পাওয়া যায়নি</p>
              </div>
            ) : (
              <div>
                <div
                  style={{ fontSize: 14, color: "#5a7a5a", marginBottom: 14 }}
                >
                  "{search}" — {toBn(searchResults.length)}টি ফলাফল
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid #c8e0cc",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[
                            "চারার নাম",
                            "জাত",
                            "সেন্টার",
                            "জেলা",
                            "মূল্য",
                            "স্টক",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 16px",
                                textAlign: "left",
                                fontSize: 13,
                                color: "#5a7a5a",
                                fontWeight: 600,
                                background: "#f5f7f5",
                                borderBottom: "1px solid #e0e8e0",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((s, i) => (
                          <tr
                            key={i}
                            className="seed-row"
                            style={{ transition: ".15s" }}
                          >
                            <td
                              style={{
                                padding: "12px 16px",
                                fontWeight: 600,
                                borderBottom: "1px solid #f0f4f0",
                              }}
                            >
                              {s.name_bn}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: "#5a7a5a",
                                borderBottom: "1px solid #f0f4f0",
                              }}
                            >
                              {s.variety || "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid #f0f4f0",
                              }}
                            >
                              {s.center_name}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: "#5a7a5a",
                                borderBottom: "1px solid #f0f4f0",
                                fontSize: 13,
                              }}
                            >
                              {s.district || "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: "#1a6b3a",
                                fontWeight: 600,
                                borderBottom: "1px solid #f0f4f0",
                              }}
                            >
                              ৳{toBn(s.unit_price || 0)}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid #f0f4f0",
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    s.current_stock > 0 ? "#e8f5ed" : "#fef2f2",
                                  color:
                                    s.current_stock > 0 ? "#1a6b3a" : "#dc2626",
                                  padding: "3px 10px",
                                  borderRadius: 20,
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {s.current_stock > 0
                                  ? `${toBn(s.current_stock)}টি`
                                  : "স্টক নেই"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "#1a2e1a",
          color: "#86efac",
          textAlign: "center",
          padding: "24px 16px",
          marginTop: 40,
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          🌿 হর্টিকালচার উইং, কৃষি সম্প্রসারণ অধিদপ্তর, বাংলাদেশ
        </div>
        <div style={{ opacity: 0.6 }}>
          © {new Date().getFullYear()} HortNet-BD — সর্বস্বত্ব সংরক্ষিত
        </div>
      </footer>
    </div>
  );
}
