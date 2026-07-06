import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "https://api.hortnet-bd.com";

const toBn = (n) => String(n ?? "").replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const esc = (s) => String(s || "").replace(/'/g, "\\'");

const CAT_ICON = { A: "🏛️", B: "🌳", C: "🪴" };
const CAT_LABEL = {
  A: "ক্যাটাগরি-A (উপপরিচালক)",
  B: "ক্যাটাগরি-B (উদ্যানতত্ত্ববিদ)",
  C: "ক্যাটাগরি-C (নার্সারি তত্ত্বাবধায়ক)",
};
const CAT_SHORT = {
  A: "উপপরিচালক",
  B: "উদ্যানতত্ত্ববিদ",
  C: "নার্সারি তত্ত্বাবধায়ক",
};
const CAT_BADGE = { A: "ক্যাটাগরি-A", B: "ক্যাটাগরি-B", C: "ক্যাটাগরি-C" };

export default function Catalog() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("center");
  const [view, setView] = useState("centers"); // centers | seedlings | search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [loadingSeedlings, setLoadingSeedlings] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [filters, setFilters] = useState({
    division: "",
    district: "",
    thana: "",
    category: "",
  });
  const [mobileMenu, setMobileMenu] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/public/centers`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
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

  function switchTab(t) {
    setTab(t);
    if (t === "center") {
      setView("centers");
      setSelectedCenter(null);
    } else setView("search");
  }

  async function doSearch() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setView("search");
    try {
      const r = await fetch(
        `${API}/api/public/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      setSearchResults(d.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function loadSeedlings(c) {
    setSelectedCenter(c);
    setView("seedlings");
    setLocalSearch("");
    setSeedlings([]);
    setLoadingSeedlings(true);
    try {
      const r = await fetch(`${API}/api/public/centers/${c.slug}/seedlings`, {
        cache: "no-store",
      });
      const d = await r.json();
      setSeedlings(d.data || []);
    } catch {
      setSeedlings([]);
    } finally {
      setLoadingSeedlings(false);
    }
  }

  function showCenters() {
    setView("centers");
    setSelectedCenter(null);
  }

  function resetFilters() {
    setFilters({ division: "", district: "", thana: "", category: "" });
  }

  // Local seedling filter
  const filteredSeedlings = localSearch
    ? seedlings.filter(
        (s) =>
          (s.name_bn || "").toLowerCase().includes(localSearch.toLowerCase()) ||
          (s.variety || "").toLowerCase().includes(localSearch.toLowerCase()),
      )
    : seedlings;

  const byCategory = {};
  filteredSeedlings.forEach((s) => {
    const cat = s.category_bn || "অন্যান্য";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });

  const selSt = {
    border: "1.5px solid #c8e0cc",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#1a2e1a",
    background: "#fff",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f5",
        fontFamily: "'Noto Sans Bengali',sans-serif",
        color: "#1a2e1a",
      }}
    >
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        .cc:hover { transform:translateY(-2px)!important; border-color:#2d8a52!important; box-shadow:0 6px 24px rgba(26,107,58,0.15)!important; }
        .cc-btn:hover { background:#1a6b3a!important; color:#fff!important; border-color:#1a6b3a!important; }
        .cc-btn.primary:hover { background:#155a30!important; }
        .seed-row:hover { background:#f0faf3!important; }
        .back-btn:hover { border-color:#1a6b3a!important; color:#1a6b3a!important; }
        .filter-reset:hover { background:#1a6b3a!important; color:#fff!important; border-color:#1a6b3a!important; }
        .stab.active { background:#fff!important; color:#1a6b3a!important; }
        .search-btn:hover { background:#155a30!important; }
        .hdr-btn:hover { background:rgba(255,255,255,0.15)!important; }
        .login-btn:hover { background:#e8f5ed!important; }
        @media(max-width:768px){ .hide-mobile{display:none!important} .mobile-btn{display:flex!important} }
      `}</style>

      {/* ── HEADER ── */}
      <header
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
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
                fontFamily: "'Noto Serif Bengali',serif",
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              হর্টিকালচার সেন্টার
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>
              কৃষি সম্প্রসারণ অধিদপ্তর, বাংলাদেশ
            </div>
          </div>
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
              className="hdr-btn"
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
            >
              আমাদের সম্পর্কে
            </button>
            <button
              className="login-btn"
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
            >
              🔐 লগিন
            </button>
            <button
              className="hdr-btn"
              onClick={() => navigate("/superadmin/login")}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: ".2s",
              }}
            >
              সুপার অ্যাডমিন
            </button>
          </div>
          <button
            className="mobile-btn"
            onClick={() => setMobileMenu(!mobileMenu)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              display: "none",
              alignItems: "center",
            }}
          >
            ☰
          </button>
        </div>
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
            <button
              onClick={() => {
                navigate("/about");
                setMobileMenu(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 14,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              আমাদের সম্পর্কে
            </button>
            <button
              onClick={() => {
                navigate("/login");
                setMobileMenu(false);
              }}
              style={{
                background: "#fff",
                color: "#1a6b3a",
                border: "none",
                padding: 8,
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
      </header>

      {/* ── HERO ── */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0f4f29 0%, #1a6b3a 50%, #2d8a52 100%)",
          color: "#fff",
          padding: "40px 20px 56px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#86efac",
            fontWeight: 600,
            marginBottom: 10,
            letterSpacing: ".04em",
          }}
        >
          🌿কৃষি সম্প্রসারণ অধিদপ্তর (DAE)
        </div>
        <h2
          style={{
            fontFamily: "'Noto Serif Bengali',serif",
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          হর্টিকালচার সেন্টার চারা অনুসন্ধান
        </h2>
        <p
          style={{
            fontSize: 14,
            opacity: 0.9,
            marginBottom: 10,
            maxWidth: 690,
            margin: "0 auto 10px",
            lineHeight: 1.8,
          }}
        >
          সারা দেশের কৃষি সম্প্রসারণ অধিদপ্তরের হর্টিকালচার সেন্টারসমূহে উৎপাদিত
          <b> উন্নত মানের ফল, ফুল, বনজ, ঔষধি, মসলা ও শোভাবর্ধনকারী</b> গাছের
          চারা ও কলমের তথ্য সহজেই খুঁজে নিন।
        </p>
        <p
          style={{
            fontSize: 14,
            opacity: 0.8,
            marginBottom: 24,
            maxWidth: 600,
            margin: "0 auto 24px",
            lineHeight: 1.7,
          }}
        >
          আপনার নিকটস্থ হর্টিকালচার সেন্টারে কোন চারা বা কলম পাওয়া যাচ্ছে, তার
          বিস্তারিত তথ্য জানুন দ্রুত ও সহজে।
        </p>
        {/* Tabs */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 4,
            gap: 4,
            marginBottom: 16,
          }}
        >
          {[
            [
              "center",
              <>
                <i className="ti ti-building" /> <span>সেন্টার অনুযায়ী</span>
              </>,
            ],
            [
              "search",
              <>
                <i className="ti ti-search" /> <span>চারার নাম দিয়ে</span>
              </>,
            ],
          ].map(([t, l]) => (
            <button
              key={t}
              className={`stab${tab === t ? " active" : ""}`}
              onClick={() => switchTab(t)}
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
        {/* Search row */}
        {tab === "search" && (
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              borderRadius: 10,
              padding: "4px 6px 4px 14px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            <i
              className="ti ti-plant"
              style={{ color: "#1a6b3a", fontSize: 20 }}
            />
            <input
              ref={searchRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="চারার নাম লিখুন... যেমন: আম, কলা, লিচু"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 14,
                fontFamily: "inherit",
                color: "#1a2e1a",
                background: "transparent",
                padding: "10px 0",
              }}
            />
            <button
              className="search-btn"
              onClick={doSearch}
              style={{
                background: "#1a6b3a",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "inherit",
                fontWeight: 600,
                cursor: "pointer",
                transition: ".2s",
              }}
            >
              খুঁজুন
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER BAR ── */}
      {view !== "seedlings" && (
        <div
          style={{
            maxWidth: 1100,
            margin: "-28px auto 0",
            padding: "0 20px",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 4px 20px rgba(26,107,58,0.12)",
              padding: "16px 20px",
              border: "1px solid #c8e0cc",
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* বিভাগ */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                minWidth: 130,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#5a7a5a",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                <i className="ti ti-map" style={{ fontSize: 13 }} /> বিভাগ
              </label>
              <select
                value={filters.division}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    division: e.target.value,
                    district: "",
                    thana: "",
                  }))
                }
                style={selSt}
              >
                <option value="">সব বিভাগ</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {/* জেলা */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                minWidth: 130,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#5a7a5a",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                <i className="ti ti-map-pin" style={{ fontSize: 13 }} /> জেলা
              </label>
              <select
                value={filters.district}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    district: e.target.value,
                    thana: "",
                  }))
                }
                style={selSt}
              >
                <option value="">সব জেলা</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            {/* থানা */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                minWidth: 130,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#5a7a5a",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                <i className="ti ti-map-pins" style={{ fontSize: 13 }} /> থানা
              </label>
              <select
                value={filters.thana}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, thana: e.target.value }))
                }
                style={selSt}
              >
                <option value="">সব থানা</option>
                {thanas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {/* ক্যাটাগরি */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                minWidth: 130,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#5a7a5a",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                <i className="ti ti-category" style={{ fontSize: 13 }} />{" "}
                ক্যাটাগরি
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, category: e.target.value }))
                }
                style={selSt}
              >
                <option value="">সব ক্যাটাগরি</option>
                <option value="A">ক্যাটাগরি-A (উপপরিচালক)</option>
                <option value="B">ক্যাটাগরি-B (উদ্যানতত্ত্ববিদ)</option>
                <option value="C">ক্যাটাগরি-C (নার্সারি তত্ত্বাবধায়ক)</option>
              </select>
            </div>
            {/* Reset */}
            <button
              className="filter-reset"
              onClick={resetFilters}
              style={{
                background: "#e8f5ed",
                border: "1.5px solid #c8e0cc",
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 13,
                fontFamily: "inherit",
                color: "#5a7a5a",
                cursor: "pointer",
                transition: ".2s",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <i className="ti ti-refresh" style={{ fontSize: 14 }} /> রিসেট
            </button>
            <span
              style={{
                fontSize: 12,
                color: "#5a7a5a",
                marginLeft: "auto",
                whiteSpace: "nowrap",
                alignSelf: "flex-end",
                paddingBottom: 2,
              }}
            >
              {toBn(filtered.length)}টি সেন্টার
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main
        style={{ maxWidth: 1100, margin: "24px auto 48px", padding: "0 20px" }}
      >
        {/* ── CENTERS VIEW ── */}
        {view === "centers" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Noto Serif Bengali',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i
                  className="ti ti-building-community"
                  style={{ fontSize: 20, color: "#1a6b3a" }}
                />
                সেন্টার তালিকা
              </h3>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid #c8e0cc",
                    borderTopColor: "#1a6b3a",
                    borderRadius: "50%",
                    animation: "spin .8s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : !filtered.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#5a7a5a",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p>এই ফিল্টারে কোনো সেন্টার নেই</p>
                <small>অন্য ফিল্টার ব্যবহার করুন</small>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                  gap: 16,
                }}
              >
                {filtered.map((c) => (
                  <div
                    key={c.slug}
                    className="cc"
                    onClick={() => loadSeedlings(c)}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #c8e0cc",
                      borderRadius: 14,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: ".2s",
                      boxShadow: "0 2px 12px rgba(26,107,58,0.1)",
                      position: "relative",
                    }}
                  >
                    {/* Stripe */}
                    <div
                      style={{
                        height: 5,
                        width: "100%",
                        background:
                          c.category === "A"
                            ? "linear-gradient(90deg,#7c3aed,#9d72ff)"
                            : c.category === "C"
                              ? "linear-gradient(90deg,#d97706,#fbbf24)"
                              : "linear-gradient(90deg,#1a6b3a,#2d8a52)",
                      }}
                    />
                    <div style={{ padding: 18 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            flexShrink: 0,
                            background:
                              c.category === "A"
                                ? "#f3f0ff"
                                : c.category === "C"
                                  ? "#fffbeb"
                                  : "#e8f5ed",
                          }}
                        >
                          {CAT_ICON[c.category] || "🌿"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'Noto Serif Bengali',serif",
                              fontSize: 15,
                              fontWeight: 700,
                              lineHeight: 1.3,
                              marginBottom: 3,
                            }}
                          >
                            {c.name_bn}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#5a7a5a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.name_en || ""}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 20,
                            flexShrink: 0,
                            background:
                              c.category === "A"
                                ? "#f3f0ff"
                                : c.category === "C"
                                  ? "#fffbeb"
                                  : "#e8f5ed",
                            color:
                              c.category === "A"
                                ? "#7c3aed"
                                : c.category === "C"
                                  ? "#d97706"
                                  : "#1a6b3a",
                          }}
                        >
                          {c.category || "B"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 14,
                        }}
                      >
                        {c.division && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#5a7a5a",
                            }}
                          >
                            <i className="ti ti-map" style={{ fontSize: 13 }} />
                            {c.division}
                          </span>
                        )}
                        {c.district && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#5a7a5a",
                            }}
                          >
                            <i
                              className="ti ti-map-pin"
                              style={{ fontSize: 13 }}
                            />
                            {c.district}
                          </span>
                        )}
                        {c.location && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#5a7a5a",
                            }}
                          >
                            <i
                              className="ti ti-home"
                              style={{ fontSize: 13 }}
                            />
                            {c.location}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          borderTop: "1px solid #f0f0f0",
                          paddingTop: 12,
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "#5a7a5a",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <i
                            className="ti ti-category"
                            style={{ fontSize: 13, color: "#1a6b3a" }}
                          />
                          {CAT_SHORT[c.category] || "উদ্যানতত্ত্ববিদ"}
                        </span>
                        <button
                          className="cc-btn primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadSeedlings(c);
                          }}
                          style={{
                            background: "#1a6b3a",
                            color: "#fff",
                            border: "1.5px solid #1a6b3a",
                            borderRadius: 9,
                            padding: "9px 14px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            fontWeight: 600,
                            transition: ".2s",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <i className="ti ti-plant" /> চারা দেখুন
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SEEDLING VIEW ── */}
        {view === "seedlings" && selectedCenter && (
          <div>
            <button
              className="back-btn"
              onClick={showCenters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#fff",
                border: "1.5px solid #c8e0cc",
                borderRadius: 9,
                padding: "9px 16px",
                fontSize: 14,
                fontFamily: "inherit",
                color: "#1a2e1a",
                cursor: "pointer",
                fontWeight: 500,
                marginBottom: 18,
                transition: ".2s",
                boxShadow: "0 2px 8px rgba(26,107,58,0.08)",
              }}
            >
              <i className="ti ti-arrow-left" /> সব সেন্টার
            </button>

            {loadingSeedlings ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid #c8e0cc",
                    borderTopColor: "#1a6b3a",
                    borderRadius: "50%",
                    animation: "spin .8s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <p style={{ color: "#5a7a5a" }}>লোড হচ্ছে...</p>
              </div>
            ) : (
              <div id="seedlingsContent">
                {/* Banner */}
                <div
                  style={{
                    background: "linear-gradient(135deg,#0f4f29,#2d8a52)",
                    color: "#fff",
                    borderRadius: 14,
                    padding: 24,
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: "rgba(255,255,255,0.15)",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                    }}
                  >
                    {CAT_ICON[selectedCenter.category] || "🌿"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: "'Noto Serif Bengali',serif",
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {selectedCenter.name_bn}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        opacity: 0.85,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {selectedCenter.district && (
                        <span>
                          <i className="ti ti-map-pin" />{" "}
                          {selectedCenter.district}
                        </span>
                      )}
                      {selectedCenter.location && (
                        <span>• {selectedCenter.location}</span>
                      )}
                    </p>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: 10,
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {CAT_BADGE[selectedCenter.category] || "ক্যাটাগরি-B"}
                  </div>
                </div>

                {!seedlings.length ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 0",
                      color: "#5a7a5a",
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                    <p>এই সেন্টারে এখন চারা পাওয়া যাচ্ছে না</p>
                    <small>পরে আবার চেক করুন</small>
                  </div>
                ) : (
                  <>
                    {/* Local search */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #c8e0cc",
                        borderRadius: 10,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 16,
                        boxShadow: "0 2px 8px rgba(26,107,58,0.08)",
                      }}
                    >
                      <i
                        className="ti ti-search"
                        style={{ color: "#bbb", fontSize: 18 }}
                      />
                      <input
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="এই সেন্টারে খুঁজুন..."
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          fontSize: 14,
                          fontFamily: "inherit",
                          color: "#1a2e1a",
                          background: "transparent",
                        }}
                      />
                    </div>

                    {/* Seedling table */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #c8e0cc",
                        borderRadius: 14,
                        overflow: "hidden",
                        boxShadow: "0 2px 12px rgba(26,107,58,0.1)",
                      }}
                    >
                      {Object.entries(byCategory).map(([cat, items]) => (
                        <div key={cat}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "12px 18px",
                              background: "#f5f7f5",
                              borderBottom: "1px solid #e8f5ed",
                            }}
                          >
                            <i
                              className="ti ti-leaf"
                              style={{ color: "#1a6b3a", fontSize: 16 }}
                            />
                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                              {cat}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 11,
                                color: "#5a7a5a",
                                fontWeight: 400,
                              }}
                            >
                              {toBn(items.length)}টি প্রজাতি
                            </span>
                          </div>
                          {items.map((s) => (
                            <div
                              key={s.id}
                              className="seed-row"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "14px 18px",
                                borderBottom: "1px solid #f5f7f5",
                                transition: ".15s",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                  {s.name_bn}
                                </div>
                                {s.variety && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#5a7a5a",
                                      marginTop: 2,
                                    }}
                                  >
                                    {s.variety}
                                  </div>
                                )}
                                {s.seedling_code && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#bbb",
                                      marginTop: 2,
                                    }}
                                  >
                                    কোড: {s.seedling_code}
                                  </div>
                                )}
                              </div>
                              <div
                                style={{ textAlign: "center", marginRight: 24 }}
                              >
                                <div
                                  style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color:
                                      s.current_stock > 50
                                        ? "#1a6b3a"
                                        : "#f59e0b",
                                  }}
                                >
                                  {toBn(s.current_stock)}
                                </div>
                                <div style={{ fontSize: 11, color: "#5a7a5a" }}>
                                  টি আছে
                                </div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "#1a6b3a",
                                  }}
                                >
                                  ৳{toBn(s.unit_price)}
                                </div>
                                <div style={{ fontSize: 11, color: "#5a7a5a" }}>
                                  প্রতিটি
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Notice */}
                    <div
                      style={{
                        background: "#f0faf3",
                        border: "1px solid #c8e0cc",
                        borderRadius: 10,
                        padding: "12px 16px",
                        marginTop: 16,
                        display: "flex",
                        gap: 10,
                        fontSize: 13,
                        color: "#5a7a5a",
                        alignItems: "flex-start",
                      }}
                    >
                      <i
                        className="ti ti-info-circle"
                        style={{ fontSize: 16, flexShrink: 0 }}
                      />
                      <span>
                        চারা কিনতে সরাসরি সেন্টারে যোগাযোগ করুন। স্টকের পরিমাণ
                        পরিবর্তনশীল।
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SEARCH VIEW ── */}
        {view === "search" && (
          <div>
            {searching ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid #c8e0cc",
                    borderTopColor: "#1a6b3a",
                    borderRadius: "50%",
                    animation: "spin .8s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : !searchQ.trim() ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#5a7a5a",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p>চারার নাম লিখুন</p>
                <small>সব সেন্টারে একসাথে খোঁজা হবে</small>
              </div>
            ) : !searchResults.length ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#5a7a5a",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
                <p>"{searchQ}" পাওয়া যায়নি</p>
                <small>অন্য নাম দিয়ে চেষ্টা করুন</small>
              </div>
            ) : (
              <div>
                <div
                  style={{ fontSize: 14, color: "#5a7a5a", marginBottom: 14 }}
                >
                  "{searchQ}" — {toBn(searchResults.length)}টি ফলাফল
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: "1.5px solid #c8e0cc",
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(26,107,58,0.1)",
                  }}
                >
                  {searchResults.map((s, i) => (
                    <div
                      key={i}
                      className="seed-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "14px 18px",
                        borderBottom: "1px solid #f5f7f5",
                        transition: ".15s",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {s.name_bn}
                        </div>
                        {s.variety && (
                          <div style={{ fontSize: 12, color: "#5a7a5a" }}>
                            {s.variety}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 12,
                            color: "#1a6b3a",
                            marginTop: 2,
                          }}
                        >
                          {s.center_name}
                        </div>
                      </div>
                      <div style={{ textAlign: "center", marginRight: 24 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: s.current_stock > 50 ? "#1a6b3a" : "#f59e0b",
                          }}
                        >
                          {toBn(s.current_stock)}
                        </div>
                        <div style={{ fontSize: 11, color: "#5a7a5a" }}>
                          টি আছে
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1a6b3a",
                          }}
                        >
                          ৳{toBn(s.unit_price)}
                        </div>
                        <div style={{ fontSize: 11, color: "#5a7a5a" }}>
                          প্রতিটি
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: "#1a2e1a",
          color: "#86efac",
          textAlign: "center",
          padding: "24px 16px",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          🌿 হর্টিকালচার উইং, কৃষি সম্প্রসারণ অধিদপ্তর, কৃষি মন্ত্রণালয়
        </div>
        <div style={{ opacity: 0.6 }}>
          © {new Date().getFullYear()} HortNet-BD — সর্বস্বত্ব সংরক্ষিত
        </div>
      </footer>
    </div>
  );
}
