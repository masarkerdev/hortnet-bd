import { useState } from "react";
import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import BatchModal from "./BatchModal";
import { SaleModal } from "../pages/Sales";
import Modal from "./Modal";
import { ConfirmHost } from "../lib/confirm";
import { useAuth } from "../auth/AuthContext";
import { toBn } from "../lib/format";
import {
  IcGrid,
  IcLeaf,
  IcClipboard,
  IcTree,
  IcBox,
  IcArchive,
  IcAlert,
  IcReceipt,
  IcCoin,
  IcUsers,
  IcChart,
  IcUser,
  IcRecycle,
  IcBin,
  IcSettings,
  IcMenu,
  IcLogout,
  IcSearch,
  IcPlus,
  IcCart,
  IcEye,
} from "./icons";

const ROUTE_ACC = {
  "/dashboard": "dash",
  "/dashboard/seedlings": "seed",
  "/dashboard/production": "prod",
  "/dashboard/mother-plants": "moth",
  "/dashboard/batches": "batch",
  "/dashboard/stock": "stk",
  "/dashboard/opening-stock": "stk",
  "/dashboard/damages": "dmg",
  "/dashboard/sales": "sale",
  "/dashboard/income": "income",
  "/dashboard/customers": "cust",
  "/dashboard/reports": "rep",
  "/dashboard/users": "usr",
  "/dashboard/employees": "usr",
};
const ACCESS = {
  admin: [
    "dash",
    "seed",
    "prod",
    "moth",
    "batch",
    "stk",
    "dmg",
    "sale",
    "cust",
    "income",
    "rep",
    "usr",
    "cfg",
    "bin",
  ],
  manager: [
    "dash",
    "seed",
    "prod",
    "moth",
    "batch",
    "stk",
    "dmg",
    "sale",
    "cust",
    "income",
    "rep",
    "usr",
    "cfg",
  ],
  production_officer: [
    "dash",
    "seed",
    "prod",
    "moth",
    "batch",
    "stk",
    "dmg",
    "rep",
    "cfg",
  ],
  sales_operator: ["dash", "sale", "cust", "income", "stk", "rep", "cfg"],
  viewer: ["dash", "rep", "cfg"],
};

const SECTIONS = [
  {
    en: "MAIN",
    bn: "প্রধান",
    items: [
      {
        to: "/dashboard",
        label: "ড্যাশবোর্ড",
        icon: IcGrid,
        acc: "dash",
        end: true,
      },
    ],
  },
  {
    en: "PRODUCTION",
    bn: "উৎপাদন",
    items: [
      {
        to: "/dashboard/seedlings",
        label: "চারা তালিকা",
        icon: IcLeaf,
        acc: "seed",
      },
      {
        to: "/dashboard/production",
        label: "উৎপাদন রেজিস্টার",
        icon: IcClipboard,
        acc: "prod",
      },
      {
        to: "/dashboard/mother-plants",
        label: "মাদার প্ল্যান্ট",
        icon: IcTree,
        acc: "moth",
      },
      {
        to: "/dashboard/batches",
        label: "ব্যাচ ম্যানেজমেন্ট",
        icon: IcBox,
        acc: "batch",
      },
    ],
  },
  {
    en: "INVENTORY",
    bn: "মজুদ",
    items: [
      {
        to: "/dashboard/stock",
        label: "স্টক রেজিস্টার",
        icon: IcBox,
        acc: "stk",
      },
      {
        to: "/dashboard/opening-stock",
        label: "প্রারম্ভিক স্টক",
        icon: IcArchive,
        acc: "stk",
      },
      {
        to: "/dashboard/damages",
        label: "ক্ষতি / নষ্ট",
        icon: IcAlert,
        acc: "dmg",
      },
    ],
  },
  {
    en: "SALES",
    bn: "বিক্রয়",
    items: [
      {
        to: "/dashboard/sales",
        label: "বিক্রয় ও চালান",
        icon: IcReceipt,
        acc: "sale",
      },
      {
        to: "/dashboard/income",
        label: "অন্যান্য আয়",
        icon: IcCoin,
        acc: "income",
      },
      {
        to: "/dashboard/customers",
        label: "গ্রাহক তালিকা",
        icon: IcUsers,
        acc: "cust",
      },
    ],
  },
  {
    en: "REPORTS",
    bn: "রিপোর্ট",
    items: [
      {
        to: "/dashboard/reports",
        label: "রিপোর্ট ও বিশ্লেষণ",
        icon: IcChart,
        acc: "rep",
      },
    ],
  },
  {
    en: "SYSTEM",
    bn: "সিস্টেম",
    items: [
      {
        to: "/dashboard/users",
        label: "ব্যবহারকারী",
        icon: IcUser,
        acc: "usr",
      },
      {
        to: "/dashboard/employees",
        label: "জনবল তালিকা",
        icon: IcUsers,
        acc: "usr",
      },
    ],
  },
];

const TITLES = {
  "/": "ড্যাশবোর্ড",
  "/seedlings": "চারা তালিকা",
  "/production": "উৎপাদন রেজিস্টার",
  "/mother-plants": "মাদার প্ল্যান্ট",
  "/batches": "ব্যাচ ম্যানেজমেন্ট",
  "/stock": "স্টক রেজিস্টার",
  "/opening-stock": "প্রারম্ভিক স্টক",
  "/damages": "ক্ষতি / নষ্ট",
  "/sales": "বিক্রয় ও চালান",
  "/income": "অন্যান্য আয়",
  "/customers": "গ্রাহক তালিকা",
  "/reports": "রিপোর্ট ও বিশ্লেষণ",
  "/budget": "বরাদ্দ চাহিদাপত্র",
  "/users": "ব্যবহারকারী",
  "/employees": "জনবল তালিকা",
  "/settings": "সেটিংস",
  "/recycle-bin": "Recycle Bin",
};

function fyOptions() {
  const now = new Date();
  const cur = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const arr = [];
  for (let y = cur; y >= cur - 4; y--) arr.push(y);
  return arr;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const fys = fyOptions();
  const [fy, setFy] = useState(
    () => Number(localStorage.getItem("hc_fy")) || fys[0],
  );
  useEffect(() => {
    if (!localStorage.getItem("hc_fy"))
      localStorage.setItem("hc_fy", String(fy));
  }, []);
  const allowed = ACCESS[user?.role] || ["dash"];
  const can = (k) => allowed.includes(k);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recycleCount, setRecycleCount] = useState(0);
  const [notices, setNotices] = useState([]);
  const [showNotices, setShowNotices] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  // বাংলা সংখ্যা ইনপুট: inputMode numeric/decimal ফিল্ডে ০-৯ টাইপ করলে ইংরেজিতে রূপান্তর
  useEffect(() => {
    const bn = "০১২৩৪৫৬৭৮৯";
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set;
    function bnDigitFix(e) {
      const el = e.target;
      if (!el || el.tagName !== "INPUT") return;
      const im = el.getAttribute("inputmode");
      if (im !== "numeric" && im !== "decimal") return;
      if (!/[০-৯]/.test(el.value)) return;
      const start = el.selectionStart;
      const conv = el.value.replace(/[০-৯]/g, (d) => bn.indexOf(d));
      nativeSetter.call(el, conv);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      try {
        el.setSelectionRange(start, start);
      } catch {
        /* ignore */
      }
    }
    document.addEventListener("input", bnDigitFix, true);
    return () => document.removeEventListener("input", bnDigitFix, true);
  }, []);

  useEffect(() => {
    if (!can("bin")) return;
    let alive = true;
    let timer = null;
    const fetchCount = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        api
          .get("/recycle-bin")
          .then((r) => {
            if (alive) setRecycleCount((r.data?.data || []).length);
          })
          .catch(() => {});
      }, 500);
    };
    fetchCount();
    const onChange = () => fetchCount();
    window.addEventListener("hc:recycle", onChange);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener("hc:recycle", onChange);
    };
  }, []);

  // notices load
  useEffect(() => {
    api
      .get("/notices")
      .then((r) => {
        if (r.data?.success) {
          const data = r.data.data || [];
          setNotices(data);
          // seen IDs check
          try {
            const seen = JSON.parse(
              localStorage.getItem("seen_notices") || "[]",
            );
            const unseen = data.filter((n) => !seen.includes(n.id)).length;
            setUnseenCount(unseen);
          } catch {
            setUnseenCount(data.length);
          }
        }
      })
      .catch(() => {});
  }, []);

  const [batchOpen, setBatchOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);

  useEffect(() => {
    const slug = localStorage.getItem("tenantSlug");
    if (!slug) return;
    const base = "https://api.hortnet-bd.com";
    fetch(`${base}/api/tenant-info`, {
      headers: { "x-tenant-id": slug },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.tenant) setTenantInfo(d.tenant);
      })
      .catch(() => {});
  }, [user]);
  const [seedlings, setSeedlings] = useState([]);
  const [mothers, setMothers] = useState([]);

  function changeFy(v) {
    localStorage.setItem("hc_fy", String(v));
    setFy(v);
  }

  function loadSeedlings() {
    if (!seedlings.length)
      api
        .get("/seedlings", { params: { limit: 1000 } })
        .then((r) => setSeedlings(r.data?.data || []))
        .catch(() => {});
  }
  function openBatch() {
    setBatchOpen(true);
    loadSeedlings();
    if (!mothers.length)
      api
        .get("/mother-plants")
        .then((r) => setMothers(r.data?.data || []))
        .catch(() => {});
  }
  function openSale() {
    setSaleOpen(true);
    loadSeedlings();
  }

  const title = TITLES[loc.pathname] || "";
  const initials = (user?.name || "U").trim().slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--sb)", color: "var(--st)" }}
      >
        <div className="flex items-center gap-2.5 px-5 py-4">
          <Leaf className="h-8 w-8" />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>
              হর্টিকালচার সেন্টার
            </div>
            <div style={{ fontSize: 11, color: "var(--st)" }}>
              {tenantInfo?.location || ""}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {SECTIONS.map((sec) => {
            const items = sec.items.filter((it) => can(it.acc || "dash"));
            if (!items.length) return null;
            return (
              <div key={sec.en} className="mb-3">
                <div
                  className="px-2 pb-1 text-[10px] font-semibold tracking-wider"
                  style={{ color: "var(--sa)" }}
                >
                  {sec.bn} / {sec.en}
                </div>
                <div className="space-y-0.5">
                  {items.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.end}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition hover:bg-white/5"
                      style={({ isActive }) =>
                        isActive
                          ? {
                              background: "var(--sa)",
                              color: "#fff",
                              fontWeight: 600,
                            }
                          : { color: "var(--st)" }
                      }
                    >
                      <it.icon className="h-[18px] w-[18px]" />
                      {it.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition hover:bg-white/10"
        >
          <Avatar t={initials} />
          <span className="leading-tight text-left">
            <span className="block text-white">{user?.name}</span>
            <span className="block text-[11px]" style={{ color: "var(--st)" }}>
              {user?.role}
            </span>
          </span>
          <IcLogout
            className="ml-auto h-[18px] w-[18px]"
            style={{ color: "#f3b4b4" }}
          />
        </button>
      </aside>

      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white px-4 lg:px-6"
          style={{ borderColor: "var(--bd)" }}
        >
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border p-1.5 lg:hidden"
            style={{ borderColor: "var(--bd)" }}
            aria-label="মেনু"
          >
            <IcMenu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            {can("prod") && (
              <button
                onClick={openBatch}
                className="hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium sm:flex"
                style={{ borderColor: "var(--g600)", color: "var(--g600)" }}
              >
                <IcPlus className="h-4 w-4" /> উৎপাদন
              </button>
            )}
            {can("sale") && (
              <button
                onClick={openSale}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white"
                style={{ background: "var(--g600)" }}
              >
                <IcCart className="h-4 w-4" /> বিক্রয়
              </button>
            )}
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="text-[12px]" style={{ color: "var(--tm)" }}>
                অর্থবছর:
              </span>
              <select
                value={fy}
                onChange={(e) => changeFy(Number(e.target.value))}
                className="rounded-lg border px-2 py-1.5 text-[13px]"
                style={{ borderColor: "var(--bd)" }}
              >
                {fys.map((y) => (
                  <option key={y} value={y}>
                    FY {toBn(y)}-{toBn(y + 1)}
                  </option>
                ))}
              </select>
            </div>
            {/* নোটিশ bell */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setShowNotices(true)}
              onMouseLeave={() => setShowNotices(false)}
            >
              <button
                onClick={() => {
                  navigate("/dashboard/notices");
                  // সব নোটিশ seen mark করো
                  const seenIds = notices.map((n) => n.id);
                  localStorage.setItem("seen_notices", JSON.stringify(seenIds));
                  setUnseenCount(0);
                  setShowNotices(false);
                }}
                title="নোটিশ"
                className="rounded-lg border p-2"
                style={{
                  borderColor: "var(--bd)",
                  color:
                    loc.pathname === "/notices" ? "var(--g600)" : "var(--tm)",
                }}
                aria-label="নোটিশ"
              >
                <svg
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              {unseenCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: "50%",
                    width: 17,
                    height: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    border: "1.5px solid #fff",
                  }}
                >
                  {unseenCount > 9
                    ? "৯+"
                    : String(unseenCount).replace(
                        /[0-9]/g,
                        (d) => "০১২৩৪৫৬৭৮৯"[d],
                      )}
                </span>
              )}
              {showNotices && notices.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    paddingTop: 8,
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid var(--bd)",
                      borderRadius: 12,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                      minWidth: 260,
                      maxWidth: 320,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid var(--bd)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--tm)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>📢 নোটিশ</span>
                      <span style={{ color: "var(--g600)" }}>
                        {notices.length}টি
                      </span>
                    </div>
                    {notices.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          navigate("/dashboard/notices");
                          const seenIds = notices.map((n) => n.id);
                          localStorage.setItem(
                            "seen_notices",
                            JSON.stringify(seenIds),
                          );
                          setUnseenCount(0);
                          setShowNotices(false);
                        }}
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--bd)",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "var(--tp)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--g50)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background:
                              {
                                urgent: "#ef4444",
                                important: "#f59e0b",
                                normal: "#3b82f6",
                              }[n.priority] || "#3b82f6",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.title}
                        </span>
                      </div>
                    ))}
                    <div
                      onClick={() => {
                        navigate("/dashboard/notices");
                        const seenIds = notices.map((n) => n.id);
                        localStorage.setItem(
                          "seen_notices",
                          JSON.stringify(seenIds),
                        );
                        setUnseenCount(0);
                        setShowNotices(false);
                      }}
                      style={{
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "var(--g600)",
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--g50)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      সব নোটিশ দেখুন →
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/dashboard/budget")}
              title="বরাদ্দ চাহিদাপত্র"
              className="rounded-lg border p-2"
              style={{
                borderColor: "var(--bd)",
                color: loc.pathname === "/budget" ? "var(--g600)" : "var(--tm)",
              }}
              aria-label="বরাদ্দ চাহিদাপত্র"
            >
              <svg
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h6" />
              </svg>
            </button>
            {can("cfg") && (
              <button
                onClick={() => navigate("/dashboard/settings")}
                title="সেটিংস"
                className="rounded-lg border p-2"
                style={{
                  borderColor: "var(--bd)",
                  color:
                    loc.pathname === "/settings" ? "var(--g600)" : "var(--tm)",
                }}
                aria-label="সেটিংস"
              >
                <IcSettings className="h-[18px] w-[18px]" />
              </button>
            )}
            {can("bin") && (
              <button
                onClick={() => navigate("/dashboard/recycle-bin")}
                title="রিসাইকেল বিন"
                className="relative rounded-lg border p-2"
                style={{
                  borderColor: "var(--bd)",
                  color:
                    loc.pathname === "/recycle-bin"
                      ? "var(--g600)"
                      : "var(--tm)",
                }}
                aria-label="রিসাইকেল বিন"
              >
                <IcBin className="h-[18px] w-[18px]" />
                {recycleCount > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: "var(--r400, #e23b3b)" }}
                  >
                    {recycleCount > 99 ? "99+" : toBn(recycleCount)}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setProfileOpen(true)} title="আমার প্রোফাইল">
              <Avatar t={initials} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">
          <Outlet key={fy} context={{ fy, setFy }} />
        </main>
        <BatchModal
          open={batchOpen}
          onClose={() => setBatchOpen(false)}
          seedlings={seedlings}
          mothers={mothers}
          batch={null}
          onSaved={() => {
            setBatchOpen(false);
            navigate("/dashboard/production");
          }}
        />
        <SaleModal
          open={saleOpen}
          onClose={() => setSaleOpen(false)}
          seedlings={seedlings}
          sale={null}
          onSaved={() => {
            setSaleOpen(false);
            navigate("/dashboard/sales");
          }}
        />
        <ConfirmHost />
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          logout={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        />
      </div>
    </div>
  );
}

function ProfileModal({ open, onClose, user, logout }) {
  const RN = {
    admin: "Admin",
    manager: "Manager",
    production_officer: "Production Officer",
    sales_operator: "Sales Operator",
    viewer: "Viewer",
  };
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [npw, setNpw] = useState("");
  const [con, setCon] = useState("");
  const [showN, setShowN] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setNpw("");
      setCon("");
      setOtp("");
      setOtpSent(false);
      setMsg("");
      setErr("");
    }
  }, [open, user]);

  async function saveInfo() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.put("/auth/update-profile", { name, email });
      if (r.data?.success) setMsg("নাম ও ইমেইল আপডেট হয়েছে ✅");
      else setErr(r.data?.message || "সমস্যা");
    } catch (e) {
      setErr(e?.response?.data?.message || "সমস্যা হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    if (!npw || npw.length < 6) {
      setErr("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
      return;
    }
    if (npw !== con) {
      setErr("পাসওয়ার্ড মিলছে না");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.post("/auth/password-otp");
      if (r.data?.success) {
        setOtpSent(true);
        setMsg(
          r.data.local
            ? "ইমেইলে OTP পাঠানো হয়েছে (লোকাল: 123456)"
            : "আপনার ইমেইলে OTP পাঠানো হয়েছে।",
        );
      } else setErr(r.data?.message || "OTP পাঠানো যায়নি");
    } catch (e) {
      setErr(e?.response?.data?.message || "OTP পাঠাতে সমস্যা");
    } finally {
      setBusy(false);
    }
  }

  async function confirmChange() {
    if (otp.trim().length !== 6) {
      setErr("৬ সংখ্যার OTP দিন");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.post("/auth/change-password-verified", {
        otp: otp.trim(),
        new_password: npw,
      });
      if (r.data?.success) {
        if (r.data.applied) {
          setMsg("পাসওয়ার্ড পরিবর্তন হয়েছে ✅ পুনরায় Login করুন...");
          setTimeout(() => logout(), 1600);
        } else {
          setMsg(
            "ইমেইল যাচাই সম্পন্ন ✅ Admin-এর অনুমোদনের পর পাসওয়ার্ড কার্যকর হবে।",
          );
          setOtpSent(false);
          setNpw("");
          setCon("");
          setOtp("");
        }
      } else setErr(r.data?.message || "সমস্যা");
    } catch (e) {
      setErr(e?.response?.data?.message || "সমস্যা হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`আমার প্রোফাইল — ${RN[user?.role] || user?.role || ""}`}
    >
      <div className="space-y-3">
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: "var(--g50)" }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold text-white"
            style={{ background: "var(--g600)" }}
          >
            {(name || "U").trim().slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-[12px]" style={{ color: "var(--tm)" }}>
              {RN[user?.role] || user?.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">নাম</label>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">ইমেইল</label>
            <input
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={saveInfo}
          disabled={busy}
          className="rounded-lg border px-3 py-2 text-[13px] font-medium"
          style={{ borderColor: "var(--bd)" }}
        >
          নাম/ইমেইল সংরক্ষণ
        </button>

        <div
          className="rounded-xl border p-3"
          style={{ borderColor: "var(--bd)" }}
        >
          <div className="mb-1 text-[13px] font-semibold">
            পাসওয়ার্ড পরিবর্তন
          </div>
          <div className="mb-2 text-[11px]" style={{ color: "var(--tm)" }}>
            {isAdmin
              ? "ইমেইল যাচাই (OTP) করলেই সরাসরি পরিবর্তন হবে।"
              : "ইমেইল যাচাই (OTP)-এর পর Admin-এর অনুমোদন লাগবে।"}
          </div>
          {!otpSent ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">নতুন পাসওয়ার্ড</label>
                  <div className="relative">
                    <input
                      type={showN ? "text" : "password"}
                      className="field-input pr-10"
                      value={npw}
                      onChange={(e) => setNpw(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষর"
                    />
                    <button
                      type="button"
                      onClick={() => setShowN(!showN)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--tm)" }}
                    >
                      <IcEye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">নিশ্চিত করুন</label>
                  <input
                    type={showN ? "text" : "password"}
                    className="field-input"
                    value={con}
                    onChange={(e) => setCon(e.target.value)}
                    placeholder="আবার লিখুন"
                  />
                </div>
              </div>
              <button
                onClick={sendOtp}
                disabled={busy}
                className="btn-primary mt-2.5 w-full"
              >
                {busy ? "..." : "📧 ইমেইল যাচাই করুন (OTP)"}
              </button>
            </>
          ) : (
            <>
              <label className="field-label">ইমেইলে আসা ৬ সংখ্যার OTP</label>
              <input
                className="field-input text-center text-lg tracking-[6px]"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
              />
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setMsg("");
                  }}
                  className="rounded-lg border px-4 py-2.5 text-[13px]"
                  style={{ borderColor: "var(--bd)" }}
                >
                  ← পিছনে
                </button>
                <button
                  onClick={confirmChange}
                  disabled={busy}
                  className="btn-primary flex-1"
                >
                  {busy ? "যাচাই হচ্ছে…" : "✓ নিশ্চিত করুন"}
                </button>
              </div>
            </>
          )}
        </div>

        {msg && (
          <div className="text-[13px]" style={{ color: "var(--g600)" }}>
            {msg}
          </div>
        )}
        {err && (
          <div className="text-[13px]" style={{ color: "var(--r600)" }}>
            {err}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2.5 text-[13px]"
            style={{ borderColor: "var(--bd)" }}
          >
            বন্ধ
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Avatar({ t }) {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      style={{ background: "var(--g600)" }}
    >
      {t}
    </div>
  );
}
function Leaf({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 28C9 28 5 22 5 15 5 9 9 5 16 4c7 1 11 5 11 11 0 7-4 13-11 13Z"
        fill="#4f9c68"
      />
      <path
        d="M16 24V9M16 15l5-4M16 19l-5-4"
        stroke="#15402b"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
