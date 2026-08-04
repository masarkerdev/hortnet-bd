import { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import saApi from "./saApi";
import { useSa } from "./SaAuth";

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const fmt = (n) => toBn(Number(n || 0).toLocaleString("en-IN"));
const fmtN = (n) => toBn(Number(n || 0).toLocaleString("en-IN"));
const fmtK = (n) => {
  const v = Number(n || 0);
  if (v >= 100000) return toBn((v / 100000).toFixed(1)) + "ল";
  if (v >= 1000) return toBn((v / 1000).toFixed(1)) + "হা";
  return toBn(v.toLocaleString("en-IN"));
};

const V = {
  card: "#fff",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text: "#1e293b",
  muted: "#64748b",
  sub: "#94a3b8",
  green: "#16a34a",
  green2: "#15803d",
  blue: "#2563eb",
  purple: "#7c3aed",
  amber: "#d97706",
  teal: "#0d9488",
  catA: "#7c3aed",
  catB: "#16a34a",
  catC: "#d97706",
  catAb: "#f5f3ff",
  catBb: "#f0fdf4",
  catCb: "#fffbeb",
  catAbd: "#ede9fe",
  catBbd: "#dcfce7",
  catCbd: "#fef3c7",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.1)",
};

const CAT_NAMES = {
  A: "A ক্যাটাগরি — উপপরিচালক",
  B: "B ক্যাটাগরি — উদ্যানতত্ত্ববিদ",
  C: "C ক্যাটাগরি — নার্সারী তত্ত্বাবধায়ক",
};

function HCard({ c, onClick }) {
  const [hov, setHov] = useState(false);
  const catBorder = { A: V.catA, B: V.catB, C: V.catC }[c.category] || V.catB;
  const rankBg = { A: V.catAb, B: V.catBb, C: V.catCb }[c.category] || V.catBb;
  const rankColor = { A: V.catA, B: V.catB, C: V.catC }[c.category] || V.catB;
  const tlBg =
    { green: "#16a34a", yellow: "#d97706", red: "#dc2626" }[c.traffic_light] ||
    "#d97706";
  const tlGlow =
    {
      green: "rgba(22,163,74,0.4)",
      yellow: "rgba(217,119,6,0.4)",
      red: "rgba(220,38,38,0.4)",
    }[c.traffic_light] || "rgba(217,119,6,0.4)";

  return (
    <div
      className="h-card"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: V.card,
        borderTop: `1px solid ${hov ? V.border2 : V.border}`,
        borderRight: `1px solid ${hov ? V.border2 : V.border}`,
        borderBottom: `1px solid ${hov ? V.border2 : V.border}`,
        borderRadius: 10,
        borderLeft: hov ? "3px solid transparent" : `3px solid ${catBorder}`,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transition: ".2s",
        boxShadow: hov ? V.shadowMd : V.shadow,
        transform: hov ? "translateX(2px)" : "none",
        fontFamily: FONT,
      }}
    >
      {/* h-card-header — rank ও info একসাথে (mobile-এ card column হলেও পাশাপাশি থাকবে) */}
      <div className="h-card-header" style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
      {/* h-card-rank */}
      <div
        className="h-card-rank"
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          background: rankBg,
          color: rankColor,
        }}
      >
        {c.category}
      </div>
      {/* h-card-info */}
      <div className="h-card-info" style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: V.text,
          }}
        >
          {c.name_bn}
        </div>
        <div
          style={{
            fontSize: 13,
            color: V.muted,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <i className="ti ti-map-pin" style={{ fontSize: 10 }} />{" "}
          {c.location || c.name_en}
        </div>
      </div>
      </div>
      {/* h-card-stats */}
      <div
        className="h-card-stats"
        style={{ display: "flex", gap: 20, flexShrink: 0 }}
      >
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.green }}>
            ৳{fmtK(c.total_revenue)}
          </div>
          <div style={{ fontSize: 14, color: V.muted, marginTop: 2 }}>
            বিক্রয়
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.purple }}>
            {fmtK(c.total_produced)}
          </div>
          <div style={{ fontSize: 14, color: V.muted, marginTop: 2 }}>
            উৎপাদন
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.amber }}>
            {fmtK(c.total_stock)}
          </div>
          <div style={{ fontSize: 14, color: V.muted, marginTop: 2 }}>স্টক</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: V.blue }}>
            ৳{fmtK(c.today_revenue)}
          </div>
          <div style={{ fontSize: 14, color: V.muted, marginTop: 2 }}>আজ</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: tlBg,
              margin: "0 auto 3px",
              boxShadow: `0 0 6px ${tlGlow}`,
            }}
          />
          <div style={{ fontSize: 14, color: V.muted }}>
            {toBn(c.perf_score || 0)}
          </div>
        </div>
      </div>
      {/* h-card-actions */}
      <div className="h-card-actions" style={{ flexShrink: 0 }}>
        <ViewButton onClick={onClick} />
      </div>
    </div>
  );
}

// দেখুন বাটন — আলাদা component হিসেবে নিজের hover state রাখে, 
// যাতে parent card-এর re-render এই বাটনের hover-কে প্রভাবিত না করে
function ViewButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 14px",
        borderRadius: 7,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: FONT,
        background: hov ? V.green2 : V.green,
        color: "#fff",
        border: `1px solid ${V.green}`,
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: ".15s",
      }}
    >
      <i className="ti ti-eye" />{" "}
      <span className="h-card-btn-text">দেখুন</span>
    </button>
  );
}

// KPI card — repo-র .kpi.green/blue/... হুবহু
function KpiCard({ label, value, sub, borderColor, valueColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: V.card,
        border: `1px solid ${V.border}`,
        borderRadius: 12,
        padding: 18,
        boxShadow: hov ? V.shadowMd : V.shadow,
        borderTop: `3px solid ${borderColor}`,
        transform: hov ? "translateY(-2px)" : "none",
        transition: ".2s",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: V.muted,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        className="kpi-value"
        style={{
          fontSize: 23,
          fontWeight: 700,
          lineHeight: 1,
          color: valueColor,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 14, color: V.sub, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

export default function SaOverview() {
  const navigate = useNavigate();
  const { sa } = useSa();
  const { handleBadges, search } = useOutletContext() || {};
  const [allStats, setAllStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetSummary, setTargetSummary] = useState(null);
  const curFY =
    new Date().getMonth() >= 6
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

  const load = useCallback(
    async (force = false) => {
      try {
        const r = await saApi.get("/stats-all" + (force ? "?force=true" : ""));
        const data = r.data?.data || [];
        setAllStats(data);
        if (handleBadges) handleBadges(data);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [handleBadges],
  );

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load(true);
    window.addEventListener("sa:refresh", h);
    return () => window.removeEventListener("sa:refresh", h);
  }, [load]);

  useEffect(() => {
    saApi
      .get("/report/target-summary?fy=" + curFY)
      .then((r) => {
        if (r.data?.success) setTargetSummary(r.data);
      })
      .catch(() => {});
  }, []);

  const ok = allStats
    .filter((c) => c.status === "ok" || c.total_revenue != null)
    .filter((c) => {
      if (!search) return true;
      const q = search.trim().toLowerCase();
      return (
        (c.name_bn || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q) ||
        (c.district || "").toLowerCase().includes(q)
      );
    });
  const totalOtherIncome = ok.reduce(
    (s, c) => s + (+c.other_income_total || 0),
    0,
  );
  const totalRev =
    ok.reduce((s, c) => s + (+c.total_revenue || 0), 0) + totalOtherIncome;
  const todayRev = ok.reduce((s, c) => s + (+c.today_revenue || 0), 0);
  const invoices = ok.reduce((s, c) => s + (+c.total_invoices || 0), 0);
  const totalProd = ok.reduce((s, c) => s + (+c.total_produced || 0), 0);
  const totalStock = ok.reduce((s, c) => s + (+c.total_stock || 0), 0);

  const catGroups = {
    A: ok.filter((c) => c.category === "A"),
    B: ok.filter((c) => c.category === "B"),
    C: ok.filter((c) => c.category === "C"),
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${V.border}`,
            borderTopColor: V.green,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        @media (max-width: 640px) {
          .kpi-value { font-size: 20px !important; }
          .h-card {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 14px !important;
            gap: 12px !important;
            flex-wrap: nowrap !important;
          }
          .h-card-header { width: 100%; }
          .h-card-rank { width: 26px !important; height: 26px !important; font-size: 10px !important; }
          .h-card-info { min-width: 0 !important; max-width: none !important; width: 100% !important; }
          .h-card-info > div:first-child { font-size: 15px !important; white-space: normal !important; }
          .h-card-info > div:last-child { font-size: 11.5px !important; }
          .h-card-stats {
            display: flex !important;
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            max-width: none !important;
            width: 100% !important;
            gap: 10px 20px !important;
            padding: 10px 0 !important;
            border-top: 1px solid ${V.border};
            border-bottom: 1px solid ${V.border};
          }
          .h-card-stats::-webkit-scrollbar { display: none; }
          .h-card-stats > div { min-width: 70px !important; }
          .h-card-actions { width: 100% !important; }
          .h-card-actions button { width: 100% !important; justify-content: center !important; padding: 9px 8px !important; font-size: 13px !important; }
          .h-card-btn-text { display: inline !important; }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="মোট উৎপাদন"
          value={fmtN(totalProd)}
          sub="টি চারা/কলম"
          borderColor={V.purple}
          valueColor={V.purple}
        />
        <KpiCard
          label="মোট স্টক"
          value={fmtN(totalStock)}
          sub="টি চারা/কলম"
          borderColor={V.amber}
          valueColor={V.amber}
        />
        <KpiCard
          label="মোট রাজস্ব আদায়"
          value={`৳${fmtN(totalRev)}`}
          sub={`${toBn(invoices)} চালান ( অন্যান্য আয় সহ)`}
          borderColor={V.green}
          valueColor={V.green}
        />
        <KpiCard
          label="আজকের বিক্রয়/ বিতরণ"
          value={`৳${fmtN(todayRev)}`}
          sub=""
          borderColor={V.blue}
          valueColor={V.blue}
        />
        <KpiCard
          label="মোট অন্যান্য আয়"
          value={`৳${fmtN(totalOtherIncome)}`}
          sub="কৃষি পণ্য + ডরমিটরি + অন্যান্য"
          borderColor={V.amber}
          valueColor={V.amber}
        />
        <KpiCard
          label="সক্রিয় Center"
          value={toBn(ok.length)}
          sub=""
          borderColor={V.teal}
          valueColor={V.teal}
        />
      </div>

      {targetSummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.border}`,
              borderRadius: 14,
              padding: "18px 20px",
              borderTop: `3px solid ${V.green}`,
            }}
          >
            <div style={{ fontSize: 13, color: V.muted, marginBottom: 6 }}>
              মোট লক্ষ্যমাত্রা {sa?.role !== "director" && sa?.assignedCenters?.length > 0 ? "(আপনার সেন্টারসমূহ)" : "(সব সেন্টার)"}
            </div>
            <div
              className="kpi-value"
              style={{ fontSize: 26, fontWeight: 700, color: V.green }}
            >
              {fmtN(targetSummary.target)}
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {" "}
                টি চারা/কলম
              </span>
            </div>
            <div style={{ fontSize: 12, color: V.muted, marginTop: 4 }}>
              ({toBn(targetSummary.fy.split("-")[0])}-
              {toBn(targetSummary.fy.split("-")[1])} অর্থবছরে)
            </div>
          </div>
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.border}`,
              borderRadius: 14,
              padding: "18px 20px",
              borderTop: `3px solid ${V.amber}`,
            }}
          >
            <div style={{ fontSize: 13, color: V.muted, marginBottom: 6 }}>
              অর্জিত
            </div>
            <div
              className="kpi-value"
              style={{ fontSize: 26, fontWeight: 700, color: V.amber }}
            >
              {fmtN(targetSummary.achieved)}
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {" "}
                টি চারা/কলম
              </span>
            </div>
            <div style={{ fontSize: 12, color: V.muted, marginTop: 4 }}>
              এখন অব্দি —{" "}
              <b style={{ color: V.green }}>{toBn(targetSummary.percent)}%</b>{" "}
              অর্জিত
            </div>
          </div>
        </div>
      )}

      {["A", "B", "C"].map((cat) => {
        if (!catGroups[cat]?.length) return null;
        const hdrBg = { A: V.catAb, B: V.catBb, C: V.catCb }[cat];
        const hdrBd = { A: V.catAbd, B: V.catBbd, C: V.catCbd }[cat];
        const hdrCol = { A: V.catA, B: V.catB, C: V.catC }[cat];
        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                padding: "10px 16px",
                borderRadius: 8,
                background: hdrBg,
                border: `1px solid ${hdrBd}`,
                borderLeft: `3px solid ${hdrCol}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: hdrCol }}>
                {CAT_NAMES[cat]}
              </span>
              <span style={{ fontSize: 12, color: V.muted, marginLeft: 4 }}>
                ({toBn(catGroups[cat].length)}টি center)
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {catGroups[cat].map((c) => (
                <HCard
                  key={c.slug}
                  c={c}
                  onClick={() => navigate(`/superadmin/center/${c.slug}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {ok.length === 0 && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: V.muted,
            fontSize: 15,
            fontFamily: FONT,
          }}
        >
          <i
            className="ti ti-building-off"
            style={{ fontSize: 40, display: "block", marginBottom: 12 }}
          />
          কোনো center পাওয়া যায়নি
        </div>
      )}
    </div>
  );
}
