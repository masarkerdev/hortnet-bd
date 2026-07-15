import { useEffect, useState } from "react";
import { confirm } from "../lib/confirm";
import api from "../lib/api";
import { toBn } from "../lib/format";
import Modal from "../components/Modal";
import { IcPlus, IcTrash } from "../components/icons";

const HN = { excellent: "চমৎকার", good: "ভালো", weak: "দুর্বল" };
const HBADGE = { excellent: "bg", good: "ba", weak: "br" };
const EMPTY = {
  variety: "",
  seedling_id: "",
  quantity: "1",
  age_years: "",
  location: "",
  health_status: "good",
  notes: "",
};

export default function MotherPlants() {
  const [rows, setRows] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    api
      .get("/mother-plants")
      .then((r) => setRows(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    api
      .get("/seedlings?limit=500")
      .then((r) => setSeedlings(r.data?.data || []))
      .catch(() => {});
  }, []);

  function openNew() {
    setForm(EMPTY);
    setMsg("");
    setOpen(true);
  }

  async function save() {
    if (!form.variety || !form.location) {
      setMsg("জাত ও অবস্থান দিন");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await api.post("/mother-plants", {
        variety: form.variety,
        seedling_id: Number(form.seedling_id) || null,
        quantity: Number(form.quantity) || 1,
        age_years: Number(form.age_years) || null,
        location: form.location,
        health_status: form.health_status,
        notes: form.notes,
      });
      if (r.data?.success) {
        setOpen(false);
        load();
      } else setMsg(r.data?.message || "সমস্যা হয়েছে");
    } catch (e) {
      setMsg(e?.response?.data?.message || "সার্ভার সমস্যা");
    } finally {
      setSaving(false);
    }
  }

  async function del(m) {
    if (!(await confirm({ title: `${m.mp_code} (${m.variety}) ডিলেট করবেন?` })))
      return;
    try {
      await api.delete("/mother-plants/" + m.id);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "ডিলেট করতে সমস্যা");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <button onClick={openNew} className="btn-primary ml-auto">
          <IcPlus className="h-4 w-4" /> নতুন মাদার প্ল্যান্ট
        </button>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>কোড</th>
              <th>জাত</th>
              <th>সংখ্যা</th>
              <th>বয়স</th>
              <th>অবস্থান</th>
              <th>স্বাস্থ্য</th>
              <th>অবস্থা</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="lt">
                  লোড হচ্ছে…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="lt">
                  মাদার প্ল্যান্ট নেই
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.mp_code}</strong>
                  </td>
                  <td>{m.variety}</td>
                  <td>{toBn(m.quantity || 1)}</td>
                  <td>{m.age_years ? toBn(m.age_years) + " বছর" : "-"}</td>
                  <td>{m.location || "-"}</td>
                  <td>
                    <span className={`b ${HBADGE[m.health_status] || "ba"}`}>
                      {HN[m.health_status] || m.health_status}
                    </span>
                  </td>
                  <td>
                    <span className="b bg">সক্রিয়</span>
                  </td>
                  <td>
                    <button
                      className="act-btn act-del"
                      onClick={() => del(m)}
                      title="ডিলেট"
                    >
                      <IcTrash className="h-[15px] w-[15px]" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="নতুন মাদার প্ল্যান্ট"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="জাত (variety)*">
              <input
                className="field-input"
                value={form.variety}
                onChange={(e) => setForm({ ...form, variety: e.target.value })}
              />
            </Field>
            <Field label="চারা*">
              <select
                className="field-input"
                value={form.seedling_id}
                onChange={(e) =>
                  setForm({ ...form, seedling_id: e.target.value })
                }
              >
                <option value="">— বাছাই করুন —</option>
                {seedlings.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_bn}
                    {s.variety ? ` (${s.variety})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="সংখ্যা* (মাদার প্ল্যান্টের)">
              <input
                type="text"
                inputMode="numeric"
                className="field-input"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />
            </Field>
            <Field label="বয়স (বছর)">
              <input
                type="text"
                inputMode="decimal"
                className="field-input"
                value={form.age_years}
                onChange={(e) =>
                  setForm({ ...form, age_years: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="অবস্থান*">
              <input
                className="field-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Field label="স্বাস্থ্য">
              <select
                className="field-input"
                value={form.health_status}
                onChange={(e) =>
                  setForm({ ...form, health_status: e.target.value })
                }
              >
                <option value="excellent">চমৎকার</option>
                <option value="good">ভালো</option>
                <option value="weak">দুর্বল</option>
              </select>
            </Field>
          </div>
          <Field label="মন্তব্য">
            <textarea
              rows={2}
              className="field-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          {msg && (
            <div className="text-[13px]" style={{ color: "var(--r600)" }}>
              {msg}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border px-4 py-2.5 text-[13px]"
              style={{ borderColor: "var(--bd)" }}
            >
              বাতিল
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
