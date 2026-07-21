import { useEffect, useState, useMemo } from "react";
import saApi from "./saApi";
import { toBn, fmt, fmtN, V, FONT } from "./saUtils";

const curFY = () => {
  const n = new Date();
  return n.getMonth() >= 6 ? n.getFullYear() : n.getFullYear() - 1;
};

function exportCSV(rows, filename) {
  const csv = rows
    .map((r) =>
      r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(title, tableHTML) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali&display=swap" rel="stylesheet">
    <style>body{font-family:'Noto Sans Bengali',sans-serif;font-size:11px;padding:20px}
    h1{font-size:16px;color:#1a4731;margin-bottom:4px}.sub{color:#666;font-size:10px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}th{background:#1a4731;color:#fff;padding:7px;font-size:10px;text-align:left}
    td{padding:6px 7px;border-bottom:1px solid #e5e7eb;font-size:10px}
    tr:nth-child(even)td{background:#f9fafb}</style></head><body>
    <h1>🌿 ${title}</h1>
    <div class="sub">তৈরির তারিখ: ${new Date().toLocaleDateString("bn-BD")}</div>
    ${tableHTML}</body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ── STOCK REPORT ──
// সেন্টারের নাম ছোট করে দেখায় — "হর্টিকালচার সেন্টার, বনরূপা" → "বনরূপা"
function shortName(name) {
  return (name || "")
    .replace("হর্টিকালচার সেন্টার,", "")
    .replace("হর্টিকালচার সেন্টার", "")
    .trim();
}

function StockReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [varietyFilter, setVarietyFilter] = useState("");
  const [viewMode, setViewMode] = useState("category"); // category | center | variety

  async function load() {
    setLoading(true);
    try {
      const r = await saApi.get(
        `/report/stock-summary${catFilter ? `?category=${encodeURIComponent(catFilter)}` : ""}`,
      );
      if (r.data?.success) setData(r.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [catFilter]);

  // সব categories
  const allCats = useMemo(
    () =>
      [
        ...new Set(
          data
            .flatMap((c) => c.seedlings.map((s) => s.category_bn))
            .filter(Boolean),
        ),
      ].sort(),
    [data],
  );
  const allCenters = useMemo(
    () => data.filter((c) => !centerFilter || c.slug === centerFilter),
    [data, centerFilter],
  );

  // Category-wise aggregation — সব center একসাথে
  const catSummary = useMemo(() => {
    const map = {};
    data.forEach((center) => {
      center.seedlings.forEach((s) => {
        const cat = s.category_bn || "অন্যান্য";
        const name = s.name_bn || "—";
        const variety = s.variety || "সাধারণ";
        if (!map[cat]) map[cat] = {};
        if (!map[cat][name]) map[cat][name] = {};
        if (!map[cat][name][variety])
          map[cat][name][variety] = { total: 0, centers: {} };
        map[cat][name][variety].total += parseInt(s.current_stock) || 0;
        map[cat][name][variety].centers[center.slug] =
          (map[cat][name][variety].centers[center.slug] || 0) +
          (parseInt(s.current_stock) || 0);
      });
    });
    return map;
  }, [data]);

  // Export CSV — category view
  function exportCatCSV() {
    const rows = [
      ["ক্যাটাগরি", "চারার নাম", "জাত", ...data.map((c) => c.name_bn), "মোট"],
    ];
    Object.entries(catSummary).forEach(([cat, names]) => {
      Object.entries(names).forEach(([name, varieties]) => {
        Object.entries(varieties).forEach(([variety, v]) => {
          rows.push([
            cat,
            name,
            variety,
            ...data.map((c) => v.centers[c.slug] || 0),
            v.total,
          ]);
        });
      });
    });
    exportCSV(
      rows,
      `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  function exportCatPDF() {
    let html = `<table><thead><tr><th>ক্যাটাগরি</th><th>চারার নাম</th><th>জাত</th>${data.map((c) => `<th>${c.name_bn}</th>`).join("")}<th>মোট</th></tr></thead><tbody>`;
    Object.entries(catSummary).forEach(([cat, names]) => {
      Object.entries(names).forEach(([name, varieties]) => {
        Object.entries(varieties).forEach(([variety, v]) => {
          html += `<tr><td>${cat}</td><td>${name}</td><td>${variety}</td>${data.map((c) => `<td>${v.centers[c.slug] || 0}</td>`).join("")}<td><b>${v.total}</b></td></tr>`;
        });
      });
    });
    html += `</tbody></table>`;
    exportPDF("স্টক রিপোর্ট", html);
  }

  const inp = {
    padding: "8px 12px",
    border: `1px solid ${V.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: FONT,
    color: V.text,
    background: V.bg,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          background: V.card,
          border: `1px solid ${V.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          boxShadow: V.shadow,
        }}
      >
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={inp}
        >
          <option value="">সব ক্যাটাগরি</option>
          {allCats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
          style={inp}
        >
          <option value="">সব সেন্টার</option>
          {data.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name_bn}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {[
            ["category", "ক্যাটাগরি ভিউ"],
            ["center", "সেন্টার ভিউ"],
          ].map(([m, l]) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${V.border}`,
                background: viewMode === m ? V.green : V.card,
                color: viewMode === m ? "#fff" : V.muted,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FONT,
              }}
            >
              {l}
            </button>
          ))}
          <button
            onClick={exportCatCSV}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${V.border}`,
              background: V.green,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-file-spreadsheet" /> Excel
          </button>
          <button
            onClick={exportCatPDF}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid #c084fc44",
              background: "#c084fc22",
              color: "#c084fc",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-file-type-pdf" /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: V.muted }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${V.border}`,
              borderTopColor: V.green,
              borderRadius: "50%",
              animation: "spin .8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          লোড হচ্ছে...
        </div>
      ) : (
        <>
          {/* Category View */}
          {viewMode === "category" && (
            <div
              style={{
                background: V.card,
                border: `1px solid ${V.border}`,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: V.shadow,
              }}
            >
              <div
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  color: V.muted,
                  borderBottom: `1px solid ${V.border}`,
                  background: V.card2,
                }}
              >
                ↔ প্রথম ৩টি কলাম (ক্যাটাগরি/নাম/জাত) স্থির থাকবে, সেন্টার কলামগুলো স্ক্রল করুন
              </div>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          padding: "6px 8px",
                          textAlign: "left",
                          fontSize: 12,
                          color: V.muted,
                          fontWeight: 600,
                          background: V.card2,
                          borderBottom: `1px solid ${V.border}`,
                          borderRight: `1px solid ${V.border}`,
                          whiteSpace: "nowrap",
                          minWidth: 126,
                          maxWidth: 126,
                        }}
                      >
                        ক্যাটাগরি
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          left: 126,
                          zIndex: 2,
                          padding: "6px 8px",
                          textAlign: "left",
                          fontSize: 12,
                          color: V.muted,
                          fontWeight: 600,
                          background: V.card2,
                          borderBottom: `1px solid ${V.border}`,
                          whiteSpace: "nowrap",
                          minWidth: 90,
                          maxWidth: 90,
                        }}
                      >
                        চারার নাম
                      </th>
                      <th
                        style={{
                          position: "sticky",
                          left: 216,
                          zIndex: 2,
                          padding: "6px 8px",
                          textAlign: "left",
                          fontSize: 12,
                          color: V.muted,
                          fontWeight: 600,
                          background: V.card2,
                          borderBottom: `1px solid ${V.border}`,
                          borderRight: `2px solid ${V.border}`,
                          whiteSpace: "nowrap",
                          minWidth: 100,
                          maxWidth: 100,
                        }}
                      >
                        জাত
                      </th>
                      {(centerFilter
                        ? data.filter((c) => c.slug === centerFilter)
                        : data
                      ).map((c) => (
                        <th
                          key={c.slug}
                          style={{
                            padding: "6px 10px",
                            textAlign: "right",
                            fontSize: 12,
                            color: V.green2,
                            fontWeight: 600,
                            background: V.card2,
                            borderBottom: `1px solid ${V.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shortName(c.name_bn)}
                        </th>
                      ))}
                      <th
                        style={{
                          padding: "6px 10px",
                          textAlign: "right",
                          fontSize: 12,
                          color: V.amber,
                          fontWeight: 700,
                          background: V.card2,
                          borderBottom: `1px solid ${V.border}`,
                        }}
                      >
                        মোট
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(catSummary).map(([cat, names]) =>
                      Object.entries(names).map(([name, varieties], ni) =>
                        Object.entries(varieties).map(([variety, v], vi) => (
                          <tr
                            key={`${cat}-${name}-${variety}`}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = V.green3)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td
                              style={{
                                position: "sticky",
                                left: 0,
                                zIndex: 1,
                                padding: "6px 8px",
                                fontSize: 12,
                                borderBottom: `1px solid ${V.border}`,
                                borderRight: `1px solid ${V.border}`,
                                color: V.muted,
                                whiteSpace: "nowrap",
                                background: V.card,
                                minWidth: 126,
                                maxWidth: 126,
                              }}
                            >
                              {ni === 0 && vi === 0 ? cat : ""}
                            </td>
                            <td
                              style={{
                                position: "sticky",
                                left: 126,
                                zIndex: 1,
                                padding: "6px 8px",
                                fontSize: 13,
                                borderBottom: `1px solid ${V.border}`,
                                fontWeight: vi === 0 ? 600 : 400,
                                background: V.card,
                                minWidth: 90,
                                maxWidth: 90,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {vi === 0 ? name : ""}
                            </td>
                            <td
                              style={{
                                position: "sticky",
                                left: 216,
                                zIndex: 1,
                                padding: "6px 8px",
                                fontSize: 12,
                                borderBottom: `1px solid ${V.border}`,
                                borderRight: `2px solid ${V.border}`,
                                color: V.muted,
                                background: V.card,
                                minWidth: 100,
                                maxWidth: 100,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {variety}
                            </td>
                            {(centerFilter
                              ? data.filter((c) => c.slug === centerFilter)
                              : data
                            ).map((c) => (
                              <td
                                key={c.slug}
                                style={{
                                  padding: "6px 10px",
                                  textAlign: "right",
                                  fontSize: 13,
                                  borderBottom: `1px solid ${V.border}`,
                                  color:
                                    v.centers[c.slug] > 0 ? V.text : V.muted,
                                }}
                              >
                                {v.centers[c.slug] > 0
                                  ? fmtN(v.centers[c.slug])
                                  : "—"}
                              </td>
                            ))}
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "right",
                                fontSize: 13,
                                fontWeight: 700,
                                borderBottom: `1px solid ${V.border}`,
                                color: V.amber,
                              }}
                            >
                              {fmtN(v.total)}
                            </td>
                          </tr>
                        )),
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Center View */}
          {viewMode === "center" && (
            <div style={{ display: "grid", gap: 14 }}>
              {allCenters.map((center) => (
                <div
                  key={center.slug}
                  style={{
                    background: V.card,
                    border: `1px solid ${V.border}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: V.shadow,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${V.border}`,
                      background: V.card2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {center.name_bn}
                    </span>
                    <span style={{ fontSize: 12, color: V.muted }}>
                      {center.district} • মোট:{" "}
                      {fmtN(
                        center.seedlings.reduce(
                          (s, i) => s + (+i.current_stock || 0),
                          0,
                        ),
                      )}
                      টি
                    </span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[
                            "ক্যাটাগরি",
                            "চারার নাম",
                            "জাত",
                            "স্টক",
                            "মূল্য",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 14px",
                                textAlign: "left",
                                fontSize: 12,
                                color: V.muted,
                                fontWeight: 600,
                                background: V.card2,
                                borderBottom: `1px solid ${V.border}`,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {center.seedlings.map((s, i) => (
                          <tr
                            key={i}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = V.green3)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td
                              style={{
                                padding: "8px 14px",
                                fontSize: 12,
                                borderBottom: `1px solid ${V.border}`,
                                color: V.muted,
                              }}
                            >
                              {s.category_bn || "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 14px",
                                fontSize: 13,
                                borderBottom: `1px solid ${V.border}`,
                                fontWeight: 600,
                              }}
                            >
                              {s.name_bn}
                            </td>
                            <td
                              style={{
                                padding: "8px 14px",
                                fontSize: 12,
                                borderBottom: `1px solid ${V.border}`,
                                color: V.muted,
                              }}
                            >
                              {s.variety || "সাধারণ"}
                            </td>
                            <td
                              style={{
                                padding: "8px 14px",
                                fontSize: 13,
                                borderBottom: `1px solid ${V.border}`,
                                fontWeight: 600,
                                color: V.amber,
                              }}
                            >
                              {fmtN(s.current_stock)}টি
                            </td>
                            <td
                              style={{
                                padding: "8px 14px",
                                fontSize: 12,
                                borderBottom: `1px solid ${V.border}`,
                                color: V.green,
                              }}
                            >
                              ৳{fmtN(s.unit_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── PRODUCTION REPORT ──
// ── রাজস্ব ট্রেন্ড (৪ অর্থবছর, trend line সহ, SVG — কোনো external library ছাড়াই) ──
function RevenueTrendReport() {
  const [data, setData] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState(null);

  useEffect(() => {
    saApi.get('/report/yearly-revenue').then(r => {
      if (r.data?.success) { setData(r.data.data || []); setCenters(r.data.centers || []); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: V.muted }}>লোড হচ্ছে...</div>;
  if (!data.length) return <div style={{ padding: 20, color: V.muted }}>কোনো তথ্য পাওয়া যায়নি।</div>;

  const fmtMoney = (n) => {
    if (n >= 100000) return toBn((n / 100000).toFixed(2)) + 'ল';
    if (n >= 1000) return toBn((n / 1000).toFixed(1)) + 'হা';
    return toBn(n);
  };

  function BarChartSVG({ chartData, small }) {
    const maxVal = Math.max(...chartData.map((d) => d.total), 1);
    const W = 700, H = small ? 220 : 320, PAD_TOP = 30, PAD_BOTTOM = small ? 45 : 65, PAD_SIDE = 50;
    const chartH = H - PAD_TOP - PAD_BOTTOM;
    const barGap = 30;
    const barWidth = (W - PAD_SIDE * 2 - barGap * (chartData.length - 1)) / chartData.length;
    const points = chartData.map((d, i) => {
      const barH = maxVal > 0 ? (d.total / maxVal) * chartH : 0;
      const x = PAD_SIDE + i * (barWidth + barGap) + barWidth / 2;
      const y = H - PAD_BOTTOM - barH;
      return { x, y, barH, ...d };
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: small ? 240 : 340 }}>
        {[0, 0.33, 0.66, 1].map((f, i) => (
          <line key={i} x1={PAD_SIDE} y1={H - PAD_BOTTOM - f * chartH} x2={W - PAD_SIDE} y2={H - PAD_BOTTOM - f * chartH} stroke={V.border} strokeWidth="1" />
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <rect x={p.x - barWidth / 2} y={p.y} width={barWidth} height={p.barH} rx="8" fill={p.is_manual ? '#c8d8cc' : (i === points.length - 1 ? V.green : '#7fb896')} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={small ? 12 : 15} fontWeight="700" fill={V.green}>৳{fmtMoney(p.total)}</text>
            <text x={p.x} y={H - PAD_BOTTOM + 20} textAnchor="middle" fontSize={small ? 11 : 13} fill={V.muted}>{toBn(p.fy || p.fy_year)}</text>
          </g>
        ))}
        <path d={linePath} fill="none" stroke={V.green} strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill={V.green} />
        ))}
      </svg>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📈 অর্থবছর অনুযায়ী সব সেন্টারের মোট রাজস্ব (গত ৪ বছর)</div>
        <BarChartSVG chartData={data} />
      </div>

      <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700, background: V.card2, borderBottom: `1px solid ${V.border}` }}>
          🏢 সেন্টার-ভিত্তিক বিস্তারিত (ক্লিক করে গ্রাফ দেখুন)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: V.muted, fontWeight: 600, background: V.card2, borderBottom: `1px solid ${V.border}` }}>সেন্টার</th>
                {data.map((d) => (
                  <th key={d.fy_year} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: V.muted, fontWeight: 600, background: V.card2, borderBottom: `1px solid ${V.border}`, whiteSpace: 'nowrap' }}>{toBn(d.fy)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {centers.map((c) => (
                <>
                  <tr key={c.slug}
                    onClick={() => setExpandedSlug(expandedSlug === c.slug ? null : c.slug)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = V.green3}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontSize: 13, borderBottom: `1px solid ${V.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: V.muted, transform: expandedSlug === c.slug ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: '.15s' }}>▶</span>
                      {c.name}
                    </td>
                    {c.years.map((y) => (
                      <td key={y.fy_year} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, borderBottom: `1px solid ${V.border}`, fontWeight: 600 }}>৳{fmtMoney(y.total)}</td>
                    ))}
                  </tr>
                  {expandedSlug === c.slug && (
                    <tr>
                      <td colSpan={data.length + 1} style={{ padding: 20, background: V.bg, borderBottom: `1px solid ${V.border}` }}>
                        <BarChartSVG chartData={c.years} small />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── অর্থ প্রাপ্তি (Consolidated + center-wise) ──
function IncomeReportTab() {
  const [fy, setFy] = useState(new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCenters, setShowCenters] = useState(false);

  const MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const fmtMoney = (n) => fmtN(n || 0);

  useEffect(() => {
    setLoading(true);
    saApi.get(`/report/income-report?fy=${fy}&month=${month}`).then(r => {
      if (r.data?.success) setData(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [fy, month]);

  const selStyle = { padding: '8px 12px', border: `1px solid ${V.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: 'none', background: V.card };
  const th = { border: `1px solid ${V.border}`, padding: '6px 8px', textAlign: 'center', background: V.card2, fontWeight: 600, fontSize: 11.5, color: V.text };
  const td = { border: `1px solid ${V.border}`, padding: '6px 8px', textAlign: 'right', fontSize: 12, color: V.text };
  const tdLeft = { ...td, textAlign: 'left' };
  const tdCenter = { ...td, textAlign: 'center' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>💰 অর্থ প্রাপ্তি সংক্রান্ত প্রতিবেদন — সব সেন্টার একসাথে</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={fy} onChange={e => setFy(Number(e.target.value))} style={selStyle}>
            {[fy, fy - 1, fy - 2].map(y => <option key={y} value={y}>FY {toBn(y)}-{toBn(y + 1)}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selStyle}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: V.muted }}>লোড হচ্ছে...</div>
      ) : (
        <>
          <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* বাম টেবিল — ক্যাটাগরি-ভিত্তিক নগদ প্রাপ্তি */}
              <div style={{ flex: '1 1 500px', overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, minWidth: 140, textAlign: 'left' }}>বিবরণ</th>
                      <th style={th}>চলতি মাস</th>
                      <th style={th}>পূর্বমাস পর্যন্ত</th>
                      <th style={th}>মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows?.map((r, i) => (
                      <tr key={i}>
                        <td style={tdLeft}>{r.category}</td>
                        <td style={td}>{fmtMoney(r.current_month)}/-</td>
                        <td style={td}>{fmtMoney(r.prev_months)}/-</td>
                        <td style={{ ...td, fontWeight: 600 }}>{fmtMoney(r.total)}/-</td>
                      </tr>
                    ))}
                    {!data?.rows?.length && (
                      <tr><td colSpan={4} style={{ ...tdCenter, color: V.muted, padding: 16 }}>এই মাসে কোনো বিক্রয় নেই</td></tr>
                    )}
                    <tr style={{ background: V.green3, fontWeight: 700 }}>
                      <td style={tdLeft}>সর্বমোট</td>
                      <td style={td}>{fmtMoney(data?.total_current)}/-</td>
                      <td style={td}>{fmtMoney(data?.total_prev)}/-</td>
                      <td style={{ ...td, color: V.green }}>{fmtMoney(data?.total)}/-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ডান টেবিল — সব center-এর ব্যাংক জমার তালিকা */}
              <div style={{ flex: '1 1 420px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>টাকা জমা দেওয়ার বিবরণ (সব সেন্টার)</div>
                <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={th}>সেন্টার</th>
                        <th style={th}>মাস</th>
                        <th style={th}>চালান নং</th>
                        <th style={th}>তারিখ</th>
                        <th style={th}>টাকা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.deposits?.map((d) => (
                        <tr key={`${d.center_slug}-${d.id}`}>
                          <td style={tdLeft}>{d.center_name}</td>
                          <td style={tdCenter}>{d.month_label}</td>
                          <td style={tdCenter}>{d.challan_no || '-'}</td>
                          <td style={tdCenter}>{new Date(d.deposit_date).toLocaleDateString('bn-BD')}</td>
                          <td style={td}>{fmtMoney(d.amount)}/-</td>
                        </tr>
                      ))}
                      {!data?.deposits?.length && (
                        <tr><td colSpan={5} style={{ ...tdCenter, color: V.muted, padding: 16 }}>কোনো জমা এন্ট্রি নেই</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div onClick={() => setShowCenters(!showCenters)}
              style={{ padding: '12px 16px', background: V.card2, fontSize: 14, fontWeight: 600, borderBottom: showCenters ? `1px solid ${V.border}` : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, transform: showCenters ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: '.15s' }}>▶</span>
              🏢 সেন্টার-ভিত্তিক বিস্তারিত
            </div>
            {showCenters && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 12, color: V.muted, fontWeight: 600 }}>সেন্টার</th>
                    <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: V.muted, fontWeight: 600 }}>চলতি মাস</th>
                    <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: V.muted, fontWeight: 600 }}>পূর্বমাস পর্যন্ত</th>
                    <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: V.muted, fontWeight: 600 }}>মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.centers?.map((c) => (
                    <tr key={c.slug} style={{ borderTop: `1px solid ${V.border}` }}>
                      <td style={{ padding: '8px 14px', fontSize: 13 }}>{c.name}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13 }}>৳{fmtMoney(c.current_total)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13 }}>৳{fmtMoney(c.prev_total)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>৳{fmtMoney(c.total)}</td>
                    </tr>
                  ))}
                  {!data?.centers?.length && (
                    <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: V.muted }}>কোনো তথ্য নেই</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProductionReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fy, setFy] = useState(curFY());
  const [centerFilter, setCenterFilter] = useState("");
  const fyOpts = [curFY(), curFY() - 1, curFY() - 2];

  async function load() {
    setLoading(true);
    try {
      const r = await saApi.get(
        `/report/production-summary?fy=${fy}${centerFilter ? `&center=${centerFilter}` : ""}`,
      );
      if (r.data?.success) setData(r.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [fy, centerFilter]);

  const inp = {
    padding: "8px 12px",
    border: `1px solid ${V.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: FONT,
    color: V.text,
    background: V.bg,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {/* Filter */}
      <div
        style={{
          background: V.card,
          border: `1px solid ${V.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={fy}
          onChange={(e) => setFy(parseInt(e.target.value))}
          style={inp}
        >
          {fyOpts.map((y) => (
            <option key={y} value={y}>
              FY {toBn(y)}-{toBn(y + 1)}
            </option>
          ))}
        </select>
        <select
          value={centerFilter}
          onChange={(e) => setCenterFilter(e.target.value)}
          style={inp}
        >
          <option value="">সব সেন্টার</option>
          {data.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name_bn}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: V.muted }}>
          লোড হচ্ছে...
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {data.map((center) => (
            <div
              key={center.slug}
              style={{
                background: V.card,
                border: `1px solid ${V.border}`,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: V.shadow,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${V.border}`,
                  background: V.card2,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  {center.name_bn}
                </span>
                <span style={{ fontSize: 12, color: V.muted }}>
                  FY {toBn(fy)}-{toBn(fy + 1)}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "ক্যাটাগরি",
                        "চারার নাম",
                        "জাত",
                        "মোট উৎপাদন",
                        "ব্যর্থ/ অসফল",
                        "বর্তমান স্টক",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 14px",
                            textAlign: "left",
                            fontSize: 12,
                            color: V.muted,
                            fontWeight: 600,
                            background: V.card2,
                            borderBottom: `1px solid ${V.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // ক্যাটাগরি > চারার নাম > জাত — Stock Report-এর মতো group করি
                      const grouped = {};
                      center.data.forEach((s) => {
                        const cat = s.category_bn || "—";
                        const name = s.name_bn;
                        if (!grouped[cat]) grouped[cat] = {};
                        if (!grouped[cat][name]) grouped[cat][name] = [];
                        grouped[cat][name].push(s);
                      });
                      const rows = [];
                      Object.entries(grouped).forEach(([cat, names]) => {
                        Object.entries(names).forEach(
                          ([name, varieties], ni) => {
                            varieties.forEach((s, vi) => {
                              rows.push(
                                <tr
                                  key={`${cat}-${name}-${vi}`}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      V.green3)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "transparent")
                                  }
                                >
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 12,
                                      borderBottom: `1px solid ${V.border}`,
                                      color: V.muted,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {ni === 0 && vi === 0 ? cat : ""}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 13,
                                      borderBottom: `1px solid ${V.border}`,
                                      fontWeight: vi === 0 ? 600 : 400,
                                    }}
                                  >
                                    {vi === 0 ? name : ""}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 12,
                                      borderBottom: `1px solid ${V.border}`,
                                      color: V.muted,
                                    }}
                                  >
                                    {s.variety || "সাধারণ"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 13,
                                      borderBottom: `1px solid ${V.border}`,
                                      color: V.purple,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {fmtN(s.total_produced)}টি
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 13,
                                      borderBottom: `1px solid ${V.border}`,
                                      color: V.red,
                                    }}
                                  >
                                    {fmtN(s.total_failed)}টি
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 14px",
                                      fontSize: 13,
                                      borderBottom: `1px solid ${V.border}`,
                                      color: V.amber,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {fmtN(s.current_stock)}টি
                                  </td>
                                </tr>,
                              );
                            });
                          },
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TOPSHEET REPORT (Consolidated / Center-wise) ──
const MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

function TopsheetReport() {
  const [fy, setFy] = useState(curFY());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [scope, setScope] = useState("consolidated");
  const [centers, setCenters] = useState([]);
  const [slug, setSlug] = useState("");
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [catDetail, setCatDetail] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  async function loadCatDetail(row) {
    setSelectedCat(row);
    setCatLoading(true);
    setCatDetail([]);
    try {
      let url = `/report/category-detail?mother_category=${encodeURIComponent(row.mother_category)}&fy=${fy}&month=${month}&scope=${scope}`;
      if (scope === "center" && slug) url += `&slug=${slug}`;
      const r = await saApi.get(url);
      if (r.data?.success) {
        setCatDetail(r.data.data || []);
        setSelectedCat({ ...row, propagation_class: r.data.propagation_class });
      }
    } catch {
    } finally {
      setCatLoading(false);
    }
  }

  useEffect(() => {
    saApi.get("/tenants").then((r) => {
      const list = r.data?.data || [];
      setCenters(list);
      if (list.length) setSlug(list[0].slug);
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      let url = `/report/topsheet?fy=${fy}&month=${month}&scope=${scope}`;
      if (scope === "center" && slug) url += `&slug=${slug}`;
      const r = await saApi.get(url);
      if (r.data?.success) {
        setData(r.data.data || []);
        setMeta({ fy: r.data.fy, month: r.data.month });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [fy, month, scope, slug]);

  const totals = data.reduce(
    (acc, r) => ({
      target: acc.target + r.divisional_target,
      prodCur: acc.prodCur + r.production.current_month,
      prodPrev: acc.prodPrev + r.production.prev_months_total,
      prodSub: acc.prodSub + r.production.subtotal,
      prodDae: acc.prodDae + r.production.dae_challan_received,
      prodJer: acc.prodJer + r.production.prev_year_balance,
      prodTotal: acc.prodTotal + r.production.grand_total,
      distTarget: acc.distTarget + r.distribution.target,
      distCur: acc.distCur + r.distribution.current_month,
      distPrev: acc.distPrev + r.distribution.prev_months_total,
      distSub: acc.distSub + r.distribution.subtotal,
      distDae: acc.distDae + r.distribution.dae_challan_sent,
      distDamaged: acc.distDamaged + r.distribution.damaged,
      distTotal: acc.distTotal + r.distribution.grand_total,
      netStock: acc.netStock + r.net_stock,
    }),
    {
      target: 0,
      prodCur: 0,
      prodPrev: 0,
      prodSub: 0,
      prodDae: 0,
      prodJer: 0,
      prodTotal: 0,
      distTarget: 0,
      distCur: 0,
      distPrev: 0,
      distSub: 0,
      distDae: 0,
      distDamaged: 0,
      distTotal: 0,
      netStock: 0,
    },
  );

  function exportTopsheetCSV() {
    const rows = [
      [
        "ক্র.নং",
        "বিবরণ",
        "বিভাগীয় লক্ষ্যমাত্রা",
        "উৎ-চলতি মাস",
        "উৎ-পূর্বমাস",
        "উৎ-মোট",
        "উৎ-ডিএই",
        "উৎ-পূর্ববছর জের",
        "উৎ-সর্বমোট",
        "বিত-লক্ষ্য",
        "বিত-চলতি",
        "বিত-পূর্বমাস",
        "বিত-মোট",
        "বিত-ডিএই",
        "বিত-মৃত",
        "বিত-সর্বমোট",
        "নীট মজুদ",
      ],
    ];
    data.forEach((r, i) =>
      rows.push([
        i + 1,
        r.mother_category,
        r.divisional_target,
        r.production.current_month,
        r.production.prev_months_total,
        r.production.subtotal,
        r.production.dae_challan_received,
        r.production.prev_year_balance,
        r.production.grand_total,
        r.distribution.target,
        r.distribution.current_month,
        r.distribution.prev_months_total,
        r.distribution.subtotal,
        r.distribution.dae_challan_sent,
        r.distribution.damaged,
        r.distribution.grand_total,
        r.net_stock,
      ]),
    );
    exportCSV(
      rows,
      `Topsheet_${scope}_${fy}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  function exportTopsheetPDF() {
    let html = `<table><thead><tr><th>ক্র.নং</th><th>বিবরণ</th><th>লক্ষ্যমাত্রা</th><th>উৎপাদন সর্বমোট</th><th>বিতরণ সর্বমোট</th><th>নীট মজুদ</th></tr></thead><tbody>`;
    data.forEach((r, i) => {
      html += `<tr><td>${i + 1}</td><td>${r.mother_category}</td><td>${r.divisional_target}</td><td>${r.production.grand_total}</td><td>${r.distribution.grand_total}</td><td><b>${r.net_stock}</b></td></tr>`;
    });
    html += `</tbody></table>`;
    exportPDF(
      `টপশিট রিপোর্ট — ${scope === "consolidated" ? "সব সেন্টার" : centers.find((c) => c.slug === slug)?.name_bn || ""}`,
      html,
    );
  }

  const inp = {
    padding: "8px 12px",
    border: `1px solid ${V.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: FONT,
    color: V.text,
    background: V.bg,
    outline: "none",
    cursor: "pointer",
  };
  const th = {
    padding: "8px 10px",
    fontSize: 11,
    color: V.muted,
    fontWeight: 600,
    borderBottom: `1px solid ${V.border}`,
    whiteSpace: "nowrap",
    textAlign: "center",
    background: V.card2,
  };
  const td = {
    padding: "8px 10px",
    fontSize: 12,
    borderBottom: `1px solid ${V.border}`,
    textAlign: "right",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          background: V.card,
          border: `1px solid ${V.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["consolidated", "সব সেন্টার একসাথে"],
            ["center", "একটি সেন্টার"],
          ].map(([m, l]) => (
            <button
              key={m}
              onClick={() => setScope(m)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${V.border}`,
                background: scope === m ? V.green : V.card,
                color: scope === m ? "#fff" : V.muted,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FONT,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        {scope === "center" && (
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={inp}
          >
            {centers.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name_bn}
              </option>
            ))}
          </select>
        )}
        <select
          value={fy}
          onChange={(e) => setFy(Number(e.target.value))}
          style={inp}
        >
          {[curFY(), curFY() - 1, curFY() - 2].map((y) => (
            <option key={y} value={y}>
              FY {toBn(y)}-{toBn(y + 1)}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={inp}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button
            onClick={exportTopsheetCSV}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${V.border}`,
              background: V.green,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-file-spreadsheet" /> Excel
          </button>
          <button
            onClick={exportTopsheetPDF}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid #c084fc44",
              background: "#c084fc22",
              color: "#c084fc",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-file-type-pdf" /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: V.muted }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${V.border}`,
              borderTopColor: V.green,
              borderRadius: "50%",
              animation: "spin .8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          লোড হচ্ছে...
        </div>
      ) : (
        <div
          style={{
            background: V.card,
            border: `1px solid ${V.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${V.border}`,
              background: V.card2,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              📋 টপশিট —{" "}
              {scope === "consolidated"
                ? "সব সেন্টার একসাথে"
                : centers.find((c) => c.slug === slug)?.name_bn}{" "}
              — {meta?.fy || `${fy}-${String(fy + 1).slice(-2)}`},{" "}
              {MONTHS[month - 1]} পর্যন্ত
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1400,
              }}
            >
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    style={{ ...th, textAlign: "left", minWidth: 60 }}
                  >
                    ক্র.নং
                  </th>
                  <th
                    rowSpan={2}
                    style={{ ...th, textAlign: "left", minWidth: 160 }}
                  >
                    বিবরণ
                  </th>
                  <th
                    rowSpan={2}
                    style={{ ...th, minWidth: 90, background: V.green3 }}
                  >
                    বিভাগীয় লক্ষ্যমাত্রা
                  </th>
                  <th colSpan={6} style={{ ...th, background: "#dcfce7" }}>
                    উৎপাদন
                  </th>
                  <th colSpan={7} style={{ ...th, background: "#fef3c7" }}>
                    বিতরণ
                  </th>
                  <th
                    rowSpan={2}
                    style={{ ...th, minWidth: 90, background: "#dbeafe" }}
                  >
                    নীট মজুদ
                  </th>
                </tr>
                <tr>
                  <th style={{ ...th, background: "#dcfce7" }}>চলতি মাস</th>
                  <th style={{ ...th, background: "#dcfce7" }}>
                    পূর্বমাস পর্যন্ত
                  </th>
                  <th style={{ ...th, background: "#dcfce7" }}>মোট</th>
                  <th style={{ ...th, background: "#dcfce7" }}>ডিএই চালান</th>
                  <th style={{ ...th, background: "#dcfce7" }}>
                    পূর্ব বছরের জের
                  </th>
                  <th style={{ ...th, background: "#dcfce7", fontWeight: 700 }}>
                    সর্বমোট
                  </th>
                  <th style={{ ...th, background: "#fef3c7" }}>লক্ষ্যমাত্রা</th>
                  <th style={{ ...th, background: "#fef3c7" }}>চলতি মাস</th>
                  <th style={{ ...th, background: "#fef3c7" }}>
                    পূর্বমাস পর্যন্ত
                  </th>
                  <th style={{ ...th, background: "#fef3c7" }}>মোট</th>
                  <th style={{ ...th, background: "#fef3c7" }}>ডিএই চালান</th>
                  <th style={{ ...th, background: "#fef3c7" }}>মৃত/বিনষ্ট</th>
                  <th style={{ ...th, background: "#fef3c7", fontWeight: 700 }}>
                    সর্বমোট
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={row.mother_category}
                    onClick={() => loadCatDetail(row)}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedCat?.mother_category === row.mother_category
                          ? V.green3
                          : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = V.green3)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        selectedCat?.mother_category === row.mother_category
                          ? V.green3
                          : "transparent")
                    }
                  >
                    <td style={{ ...td, textAlign: "left", color: V.muted }}>
                      {toBn(i + 1)}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>
                      {row.mother_category}
                    </td>
                    <td style={{ ...td, color: V.green, fontWeight: 600 }}>
                      {row.divisional_target
                        ? fmtN(row.divisional_target)
                        : "—"}
                    </td>
                    <td style={td}>{fmtN(row.production.current_month)}</td>
                    <td style={td}>{fmtN(row.production.prev_months_total)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {fmtN(row.production.subtotal)}
                    </td>
                    <td style={td}>
                      {fmtN(row.production.dae_challan_received)}
                    </td>
                    <td style={td}>{fmtN(row.production.prev_year_balance)}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#059669" }}>
                      {fmtN(row.production.grand_total)}
                    </td>
                    <td style={{ ...td, color: V.amber }}>
                      {row.distribution.target
                        ? fmtN(row.distribution.target)
                        : "—"}
                    </td>
                    <td style={td}>{fmtN(row.distribution.current_month)}</td>
                    <td style={td}>
                      {fmtN(row.distribution.prev_months_total)}
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {fmtN(row.distribution.subtotal)}
                    </td>
                    <td style={td}>
                      {fmtN(row.distribution.dae_challan_sent)}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: row.distribution.damaged > 0 ? V.red : "inherit",
                      }}
                    >
                      {fmtN(row.distribution.damaged)}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#b45309" }}>
                      {fmtN(row.distribution.grand_total)}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#1d4ed8" }}>
                      {fmtN(row.net_stock)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: V.green3 }}>
                  <td
                    colSpan={2}
                    style={{
                      ...td,
                      textAlign: "left",
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    সর্বমোট
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: V.green,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.target)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodCur)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodPrev)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodSub)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodDae)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodJer)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: "#059669",
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.prodTotal)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: V.amber,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distTarget)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distCur)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distPrev)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distSub)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distDae)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: V.red,
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distDamaged)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: "#b45309",
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.distTotal)}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: "#1d4ed8",
                      borderTop: `2px solid ${V.border}`,
                    }}
                  >
                    {fmtN(totals.netStock)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Detail */}
      {selectedCat && (
        <div
          style={{
            background: V.card,
            border: `1px solid ${V.border}`,
            borderRadius: 12,
            overflow: "hidden",
            marginTop: 16,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${V.border}`,
              background: V.card2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              🌱 {selectedCat.mother_category} — বিস্তারিত (
              {scope === "consolidated"
                ? "সব সেন্টার একসাথে"
                : centers.find((c) => c.slug === slug)?.name_bn}
              )
            </span>
            <button
              onClick={() => {
                setSelectedCat(null);
                setCatDetail([]);
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                color: V.muted,
              }}
            >
              ✕
            </button>
          </div>
          {catLoading ? (
            <div style={{ textAlign: "center", padding: 32, color: V.muted }}>
              লোড হচ্ছে...
            </div>
          ) : !catDetail.length ? (
            <div style={{ textAlign: "center", padding: 40, color: V.muted }}>
              কোনো চারা নেই
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1100,
                }}
              >
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: V.green3,
                        textAlign: "left",
                      }}
                    >
                      ক্র.নং
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: V.green3,
                        textAlign: "left",
                        minWidth: 120,
                      }}
                    >
                      নাম (বাংলা)
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: V.green3,
                        textAlign: "left",
                        minWidth: 100,
                      }}
                    >
                      জাত
                    </th>
                    <th
                      colSpan={5}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: "#dcfce7",
                        textAlign: "center",
                      }}
                    >
                      উৎপাদন
                    </th>
                    <th
                      colSpan={4}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: "#fef3c7",
                        textAlign: "center",
                      }}
                    >
                      বিতরণ
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: V.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${V.border}`,
                        background: "#dbeafe",
                        textAlign: "right",
                        minWidth: 80,
                      }}
                    >
                      নীট মজুদ
                    </th>
                  </tr>
                  <tr>
                    {[
                      "চলতি মাস",
                      "পূর্বমাস",
                      "মোট",
                      "পূর্ববছর জের",
                      "সর্বমোট",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 8px",
                          fontSize: 10,
                          color: V.muted,
                          fontWeight: 600,
                          borderBottom: `1px solid ${V.border}`,
                          background: "#dcfce7",
                          textAlign: "right",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                    {["চলতি মাস", "পূর্বমাস", "মৃত/বিনষ্ট", "সর্বমোট"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 8px",
                            fontSize: 10,
                            color: V.muted,
                            fontWeight: 600,
                            borderBottom: `1px solid ${V.border}`,
                            background: "#fef3c7",
                            textAlign: "right",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {catDetail.map((item, i) => (
                    <tr
                      key={i}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = V.green3)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          color: V.muted,
                        }}
                      >
                        {toBn(i + 1)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {item.common_name}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          color: V.muted,
                        }}
                      >
                        {item.variety || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.production.current_month)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.production.prev_months_total)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {fmtN(item.production.subtotal)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.production.prev_year_balance)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#059669",
                        }}
                      >
                        {fmtN(item.production.grand_total)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.distribution.current_month)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.distribution.prev_months_total)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                          color:
                            item.distribution.damaged > 0 ? V.red : "inherit",
                        }}
                      >
                        {fmtN(item.distribution.damaged)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#b45309",
                        }}
                      >
                        {fmtN(item.distribution.grand_total)}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1d4ed8",
                          textAlign: "right",
                        }}
                      >
                        {fmtN(item.current_stock)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN REPORT PAGE ──
export default function SaReport() {
  const [tab, setTab] = useState("stock");

  const TABS = [
    { id: "topsheet", label: "📋 টপশিট" },
    { id: "stock", label: "📦 স্টক রিপোর্ট" },
    { id: "production", label: "🌱 উৎপাদন রিপোর্ট" },
    { id: "revenue", label: "📈 রাজস্ব ট্রেন্ড" },
    { id: "income", label: "💰 অর্থ প্রাপ্তি" },
  ];

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Tab navigation */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: `1px solid ${V.border}`,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: FONT,
              background: tab === t.id ? V.green : V.card,
              color: tab === t.id ? "#fff" : V.muted,
              fontWeight: tab === t.id ? 600 : 400,
              transition: ".15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "topsheet" && <TopsheetReport />}
      {tab === "stock" && <StockReport />}
      {tab === "production" && <ProductionReport />}
      {tab === "revenue" && <RevenueTrendReport />}
      {tab === "income" && <IncomeReportTab />}
    </div>
  );
}
