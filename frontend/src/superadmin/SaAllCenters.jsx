import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import saApi from "./saApi";
import { useSa } from "./SaAuth";
import { confirm } from "../lib/confirm";
import { toBn } from "../lib/format";

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const C = {
  bg: "#f8f6f0",
  card: "#fff",
  card2: "#f8f6f0",
  border: "#e2ddd5",
  text: "#1a1a18",
  muted: "#888780",
  green: "#16a34a",
  green3: "#f0fdf4",
  green4: "#dcfce7",
  red: "#dc2626",
  red3: "#fef2f2",
  accent: "#3b6d11",
};
const shadow = "0 1px 3px rgba(0,0,0,0.08)";
const CAT_C = {
  A: { col: "#7c3aed", bg: "#f5f3ff" },
  B: { col: "#16a34a", bg: "#f0fdf4" },
  C: { col: "#d97706", bg: "#fffbeb" },
};
const inp = {
  width: "100%",
  padding: "10px 14px",
  background: C.bg,
  border: `1.5px solid ${C.border}`,
  borderRadius: 9,
  color: C.text,
  fontSize: 14,
  outline: "none",
  fontFamily: FONT,
  boxSizing: "border-box",
};

export default function SaAllCenters() {
  const { sa } = useSa();
  const navigate = useNavigate();
  const isDir = sa?.role === "director";
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [changeUrl, setChangeUrl] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    slug: "",
    name_bn: "",
    name_en: "",
    location: "",
    district: "",
    division: "",
    thana: "",
    dae_region: "",
    category: "B",
    db_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await saApi.get("/tenants");
      if (r.data?.success) setCenters(r.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setForm({
      slug: "",
      name_bn: "",
      name_en: "",
      location: "",
      district: "",
      division: "",
      thana: "",
      dae_region: "",
      category: "B",
      db_url: "",
      mobile: "",
    });
    setEditId(null);
    setMsg("");
    setChangeUrl(false);
    setModal(true);
  }
  function openEdit(c) {
    setForm({
      slug: c.slug,
      name_bn: c.name_bn,
      name_en: c.name_en || "",
      location: c.location || "",
      district: c.district || "",
      division: c.division || "",
      thana: c.thana || "",
      dae_region: c.dae_region || "",
      category: c.category || "B",
      db_url: "",
      mobile: c.mobile || "",
    });
    setEditId(c.id);
    setMsg("");
    setChangeUrl(false);
    setModal(true);
  }

  async function save() {
    if (!form.name_bn || !form.name_en) {
      setMsg("বাংলা ও ইংরেজি নাম দিন।");
      return;
    }
    if (!editId && (!form.db_url || !form.slug)) {
      setMsg("Slug ও Database URL দিন।");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const body = {
        name_bn: form.name_bn,
        name_en: form.name_en,
        location: form.location,
        district: form.district,
        division: form.division,
        thana: form.thana,
        dae_region: form.dae_region,
        category: form.category,
        mobile: form.mobile || "",
      };
      let r;
      if (editId) {
        const cur = centers.find((c) => c.id === editId);
        r = await saApi.put(`/tenants/${editId}`, {
          ...body,
          db_url: form.db_url || cur?.db_url || "",
          active: cur?.active ?? true,
        });
      } else {
        r = await saApi.post("/tenants", {
          slug: form.slug.toLowerCase(),
          ...body,
          db_url: form.db_url,
          currency: "BDT",
        });
      }
      if (r.data?.success) {
        setModal(false);
        load();
      } else
        setMsg(
          r.data?.message ||
            r.data?.error ||
            JSON.stringify(r.data) ||
            "অজানা সমস্যা",
        );
    } catch (e) {
      const ed = e?.response?.data;
      setMsg(ed?.message || ed?.error || e?.message || "সংযোগ সমস্যা");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c) {
    try {
      const r = await saApi.post(`/tenants/${c.id}/toggle`);
      if (r.data?.success) load();
    } catch {}
  }

  async function deleteCenter(c) {
    if (
      !confirm(
        `"${c.name_bn}" সম্পূর্ণ মুছে ফেলতে চান? Database অক্ষত থাকবে কিন্তু center-এর তালিকা থেকে সরে যাবে।`,
      )
    )
      return;
    try {
      const r = await saApi.delete(`/tenants/${c.id}`);
      if (r.data?.success) {
        setMsg(r.data.message);
        load();
      }
    } catch (e) {
      setMsg(e?.response?.data?.message || "সমস্যা");
    }
  }

  if (loading)
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: C.muted,
          fontFamily: FONT,
        }}
      >
        লোড হচ্ছে…
      </div>
    );

  return (
    <div style={{ fontFamily: FONT }}>
      {isDir && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <button
            onClick={openAdd}
            style={{
              padding: "9px 18px",
              background: C.accent,
              color: "#fff",
              border: `1px solid ${C.accent}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: FONT,
              fontWeight: 600,
            }}
          >
            + নতুন Center যোগ
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {centers.map((c) => {
          const cc = CAT_C[c.category] || CAT_C.B;
          return (
            <div
              key={c.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                borderLeft: `3px solid ${cc.col}`,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: shadow,
              }}
            >
              <div
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
                  background: cc.bg,
                  color: cc.col,
                }}
              >
                {c.category}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                  {c.name_bn}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                  /{c.slug} • {c.district || ""}
                  {c.dae_region ? " • " + c.dae_region : ""} •{" "}
                  <span
                    style={{
                      color: c.active ? C.green : C.red,
                      fontWeight: 500,
                    }}
                  >
                    {c.active ? "সক্রিয়" : "বন্ধ"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => navigate(`/superadmin/center/${c.slug}`)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: FONT,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    color: C.muted,
                  }}
                >
                  👁 দেখুন
                </button>
                {isDir && (
                  <>
                    <button
                      onClick={() => openEdit(c)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 7,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: FONT,
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        color: C.muted,
                      }}
                    >
                      সম্পাদনা
                    </button>
                    <button
                      onClick={() => toggle(c)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 7,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: FONT,
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        color: c.active ? C.red : C.green,
                        fontWeight: 600,
                      }}
                    >
                      {c.active ? "বন্ধ করুন" : "চালু করুন"}
                    </button>
                    <button
                      onClick={() => deleteCenter(c)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 7,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: FONT,
                        background: "#fee2e2",
                        border: "1px solid #fca5a5",
                        color: "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      মুছুন
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(26,46,26,0.45)",
          }}
        >
          <div
            style={{
              background: C.card,
              borderRadius: 16,
              padding: 28,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                {editId ? "Center সম্পাদনা" : "নতুন Center"}
              </div>
              <button
                onClick={() => setModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: C.muted,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Slug*
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="dhaka"
                  style={{ ...inp, opacity: editId ? 0.6 : 1 }}
                  disabled={!!editId}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Category*
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  style={inp}
                >
                  <option value="A">A — উপপরিচালক</option>
                  <option value="B">B — উদ্যানতত্ত্ববিদ</option>
                  <option value="C">C — নার্সারী তত্ত্বাবধায়ক</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                নাম (বাংলা)*
              </label>
              <input
                value={form.name_bn}
                onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                placeholder="উদ্যানতত্ত্ববিদের কার্যালয়"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Name (English)*
              </label>
              <input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="Horticulture Center, Dhaka"
                style={inp}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  District
                </label>
                <input
                  value={form.district}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                  placeholder="ঢাকা"
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Division
                </label>
                <input
                  value={form.division}
                  onChange={(e) =>
                    setForm({ ...form, division: e.target.value })
                  }
                  placeholder="ঢাকা"
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.muted,
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  থানা/উপজেলা
                </label>
                <input
                  value={form.thana}
                  onChange={(e) =>
                    setForm({ ...form, thana: e.target.value })
                  }
                  placeholder="যেমন: সদর"
                  style={inp}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                DAE অঞ্চল
              </label>
              <select
                value={form.dae_region}
                onChange={(e) =>
                  setForm({ ...form, dae_region: e.target.value })
                }
                style={inp}
              >
                <option value="">-- অঞ্চল বেছে নিন --</option>
                {[
                  "ঢাকা অঞ্চল",
                  "চট্টগ্রাম অঞ্চল",
                  "কুমিল্লা অঞ্চল",
                  "রাজশাহী অঞ্চল",
                  "রংপুর অঞ্চল",
                  "দিনাজপুর অঞ্চল",
                  "বগুড়া অঞ্চল",
                  "যশোর অঞ্চল",
                  "খুলনা অঞ্চল",
                  "বরিশাল অঞ্চল",
                  "ফরিদপুর অঞ্চল",
                  "ময়মনসিংহ অঞ্চল",
                  "সিলেট অঞ্চল",
                  "পটুয়াখালী অঞ্চল",
                  "রাঙ্গামাটি অঞ্চল",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="ঢাকা সদর"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                মোবাইল নম্বর
              </label>
              <input
                value={form.mobile || ""}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="০১XXXXXXXXX"
                style={{ ...inp }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Database URL{!editId ? "*" : ""}
              </label>
              {editId ? (
                <div>
                  {!changeUrl ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          color: C.muted,
                          fontSize: 14,
                          letterSpacing: 2,
                        }}
                      >
                        ••••••••••••••••••••••••••••••
                      </span>
                      <button
                        onClick={() => setChangeUrl(true)}
                        style={{
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                          color: C.accent,
                          fontFamily: FONT,
                        }}
                      >
                        পরিবর্তন করুন
                      </button>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={form.db_url}
                        onChange={(e) =>
                          setForm({ ...form, db_url: e.target.value })
                        }
                        placeholder="postgresql://..."
                        rows={2}
                        style={{ ...inp, resize: "vertical" }}
                      />
                      <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>
                        ⚠️ সতর্কতা: Database URL পরিবর্তন করলে center-এর সব data
                        পরিবর্তিত হবে।
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={form.db_url}
                    onChange={(e) =>
                      setForm({ ...form, db_url: e.target.value })
                    }
                    placeholder="postgresql://user:password@localhost:5432/hortnet_v1_slug"
                    rows={2}
                    style={{ ...inp, resize: "vertical" }}
                  />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    উদাহরণ:
                    postgresql://hortnet_hortnet:password@localhost:5432/hortnet_v1_kaptai
                  </div>
                </div>
              )}
            </div>
            {msg && (
              <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>
                {msg}
              </div>
            )}
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                onClick={() => setModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: FONT,
                }}
              >
                বাতিল
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: FONT,
                  fontWeight: 600,
                }}
              >
                {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
