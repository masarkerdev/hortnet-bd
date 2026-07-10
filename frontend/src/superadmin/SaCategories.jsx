import { useState, useEffect } from "react";
import saApi from "./saApi";

const FONT = "'Noto Sans Bengali','Segoe UI',sans-serif";
const toBn = (n) => String(n ?? "").replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const BASE_GROUPS = [
  "ফলদ",
  "শীতকালীন সবজি",
  "গ্রীষ্মকালীন সবজি",
  "ঔষধি",
  "মসলা",
  "শোভাবর্ধনকারী",
  "ফুল",
  "পাম জাতীয়",
  "অন্যান্য",
];

export default function SaCategories() {
  const [categories, setCategories] = useState([]);
  const [motherCats, setMotherCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name_bn: "",
    name_en: "",
    base_group: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [cr, mr] = await Promise.all([
        saApi.get("/category-master"),
        saApi.get("/mother-categories"),
      ]);
      if (cr.data?.success) setCategories(cr.data.data || []);
      if (mr.data?.success) setMotherCats(mr.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(c) {
    setEditId(c.id);
    setForm({
      name_bn: c.name_bn,
      name_en: c.name_en || "",
      base_group: c.base_group,
    });
    setMsg("");
    setModal(true);
  }

  async function remove(c) {
    if (
      !confirm(
        `"${c.name_bn}" নিষ্ক্রিয় করতে চান? সেন্টারের existing চারার তথ্য অক্ষত থাকবে।`,
      )
    )
      return;
    try {
      const r = await saApi.delete(`/category-master/${c.id}`);
      if (r.data?.success) {
        setMsg(r.data.message);
        load();
      }
    } catch (e) {
      setMsg(e?.response?.data?.message || "সমস্যা");
    }
  }

  async function save() {
    if (!form.name_bn || !form.base_group) {
      setMsg("নাম ও গ্রুপ দিন।");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = editId
        ? await saApi.put(`/category-master/${editId}`, form)
        : await saApi.post("/category-master", form);
      if (r.data?.success) {
        setModal(false);
        setEditId(null);
        setForm({ name_bn: "", name_en: "", base_group: "" });
        load();
        setMsg(r.data.message);
      } else setMsg(r.data?.message || "সমস্যা হয়েছে");
    } catch (e) {
      setMsg(e?.response?.data?.message || "সমস্যা");
    } finally {
      setSaving(false);
    }
  }

  const V = {
    card: "var(--card)",
    border: "var(--border)",
    text: "var(--text)",
    muted: "var(--muted)",
    green: "var(--green)",
    green2: "var(--green2)",
    green3: "var(--green3)",
    shadow: "var(--shadow)",
    bg: "var(--bg)",
    red: "var(--red)",
    amber: "var(--amber)",
  };

  const inp = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${V.border}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: FONT,
    color: V.text,
    background: V.bg,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            📂 Category Master
          </h2>
          <p style={{ fontSize: 13, color: V.muted }}>
            সব সেন্টারে sync হবে — চারা যোগের সময় এই categories দেখাবে
          </p>
        </div>
        <button
          onClick={() => {
            setModal(true);
            setMsg("");
            setEditId(null);
            setForm({ name_bn: "", name_en: "", base_group: "" });
          }}
          style={{
            padding: "10px 18px",
            background: "#1a6b3a",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: FONT,
            fontWeight: 600,
          }}
        >
          + নতুন Category
        </button>
      </div>

      {msg && (
        <div
          style={{
            background: msg.includes("সমস্যা") ? "#fee2e2" : "#e8f5ed",
            border: `1px solid ${msg.includes("সমস্যা") ? "#fca5a5" : "#c8e0cc"}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: msg.includes("সমস্যা") ? "#dc2626" : V.green,
            marginBottom: 16,
          }}
        >
          {msg}
        </div>
      )}

      {/* Mother Categories Reference */}
      <div
        style={{
          background: V.card,
          border: `1px solid ${V.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          📋 রিপোর্টের ১১টা ক্যাটাগরি (Fixed)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 8,
          }}
        >
          {motherCats.map((mc) => (
            <div
              key={mc.name_bn}
              style={{
                background: V.bg,
                border: `1px solid ${V.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              <span style={{ color: V.green, marginRight: 6 }}>•</span>
              {mc.name_bn}
            </div>
          ))}
        </div>
      </div>

      {/* Category Master List */}
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
            fontSize: 14,
            fontWeight: 600,
            background: V.bg,
          }}
        >
          🌱 Category Master তালিকা ({toBn(categories.length)}টি)
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: V.muted }}>
            লোড হচ্ছে...
          </div>
        ) : !categories.length ? (
          <div style={{ textAlign: "center", padding: 60, color: V.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <p>কোনো category নেই</p>
            <p style={{ fontSize: 13 }}>+ নতুন Category বাটন দিয়ে যোগ করুন</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  "নাম (বাংলা)",
                  "নাম (English)",
                  "গ্রুপ",
                  "অবস্থা",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 12,
                      color: V.muted,
                      fontWeight: 600,
                      borderBottom: `1px solid ${V.border}`,
                      background: V.bg,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr
                  key={c.id}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = V.green3)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: 14,
                      fontWeight: 600,
                      borderBottom: `1px solid ${V.border}`,
                    }}
                  >
                    {c.name_bn}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: 13,
                      color: V.muted,
                      borderBottom: `1px solid ${V.border}`,
                    }}
                  >
                    {c.name_en || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${V.border}`,
                    }}
                  >
                    <span
                      style={{
                        background: V.green3,
                        color: V.green,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {c.base_group}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${V.border}`,
                    }}
                  >
                    <span
                      style={{
                        color: c.is_active ? V.green : V.red,
                        fontSize: 12,
                      }}
                    >
                      {c.is_active ? "✅ সক্রিয়" : "❌ বন্ধ"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${V.border}`,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: `1px solid ${V.border}`,
                          background: V.bg,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: FONT,
                          color: V.text,
                        }}
                      >
                        এডিট
                      </button>
                      <button
                        onClick={() => remove(c)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: "1px solid #fca5a5",
                          background: "#fee2e2",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#dc2626",
                        }}
                      >
                        ডিলেট
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.border}`,
              borderRadius: 14,
              padding: 28,
              width: 420,
              maxWidth: "90vw",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              {editId ? "✏️ Category এডিট করুন" : "+ নতুন Category যোগ করুন"}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: V.muted,
                  marginBottom: 6,
                }}
              >
                নাম (বাংলা)*
              </label>
              <input
                value={form.name_bn}
                onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                placeholder="যেমন: আম কলম"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: V.muted,
                  marginBottom: 6,
                }}
              >
                নাম (English)
              </label>
              <input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="e.g. Mango Graft"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  color: V.muted,
                  marginBottom: 6,
                }}
              >
                গ্রুপ (Base Group)*
              </label>
              <select
                value={form.base_group}
                onChange={(e) =>
                  setForm({ ...form, base_group: e.target.value })
                }
                style={inp}
              >
                <option value="">গ্রুপ বেছে নিন</option>
                {BASE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: V.muted, marginTop: 4 }}>
                এটি দিয়ে রিপোর্টে কোন category-তে যাবে তা নির্ধারিত হবে
              </div>
            </div>
            {msg && (
              <div style={{ color: V.red, fontSize: 13, marginBottom: 12 }}>
                {msg}
              </div>
            )}
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setModal(false);
                  setEditId(null);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: `1px solid ${V.border}`,
                  background: V.bg,
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
                  padding: "10px 18px",
                  borderRadius: 8,
                  background: "#1a6b3a",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: FONT,
                  fontWeight: 600,
                }}
              >
                {saving
                  ? "সংরক্ষণ হচ্ছে..."
                  : editId
                    ? "✅ আপডেট ও Sync"
                    : "✅ সংরক্ষণ ও Sync"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
