import { useCallback, useEffect, useMemo, useState } from "react";
import { confirm } from "../lib/confirm";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { toBn, money, dateBn, today } from "../lib/format";
import Modal from "../components/Modal";
import { IcPlus, IcEye, IcEdit, IcTrash, IcPrinter } from "../components/icons";

const PN = { cash: "নগদ", bkash: "বিকাশ", bank: "ব্যাংক", cheque: "চেক" };
const SN = { paid: "পরিশোধিত", pending: "বকেয়া", partial: "আংশিক" };
const OFFICE_BY_CAT = {
  A: "উপপরিচালকের কার্যালয়",
  B: "উদ্যানতত্ত্ববিদের কার্যালয়",
  C: "নার্সারি তত্ত্বাবধায়কের কার্যালয়",
};

export default function Sales() {
  const [center, setCenter] = useState(null);
  useEffect(() => {
    api
      .get("/center-info")
      .then((r) => setCenter(r.data?.data || null))
      .catch(() => {});
  }, []);
  const office = OFFICE_BY_CAT[center?.category] || OFFICE_BY_CAT.B;
  const loc = center?.location || "আসামবস্তি, রাঙ্গামাটি";
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    today_rev: 0,
    today_inv: 0,
    pending: 0,
    month_rev: 0,
  });
  const [date, setDate] = useState("");
  const [seedlings, setSeedlings] = useState([]);
  const [saleOpen, setSaleOpen] = useState(false);
  const [sp, setSp] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);

  const load = useCallback(() => {
    const q = date ? `?from_date=${date}&to_date=${date}` : "";
    Promise.all([
      api.get("/sales" + q).catch(() => ({ data: {} })),
      api.get("/sales/today").catch(() => ({ data: {} })),
      api.get("/sales/monthly").catch(() => ({ data: {} })),
    ]).then(([sl, td, mo]) => {
      setRows(sl.data?.data || []);
      const t = td.data?.data || {};
      const m = mo.data?.data?.[0] || {};
      setStats({
        today_rev: t.total_revenue || 0,
        today_inv: t.total_invoices || 0,
        pending: t.pending_amount || 0,
        month_rev: m.revenue || 0,
      });
    });
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api
      .get("/seedlings?limit=500")
      .then((r) => setSeedlings(r.data?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sp.get("new") === "1") {
      setEditing(null);
      setSaleOpen(true);
      sp.delete("new");
      setSp(sp, { replace: true });
    }
  }, []);
  function openNew() {
    setEditing(null);
    setSaleOpen(true);
  }
  async function openEdit(s) {
    try {
      const r = await api.get("/sales/" + s.id);
      setEditing(r.data?.data || s);
    } catch {
      setEditing(s);
    }
    setSaleOpen(true);
  }
  async function printInv(id) {
    try {
      const r = await api.get("/sales/" + id);
      if (r.data?.success) {
        setInvoice(r.data.data);
        setAutoPrint(true);
      }
    } catch {
      /* ignore */
    }
  }
  async function viewInv(id) {
    try {
      const r = await api.get("/sales/" + id);
      if (r.data?.success) setInvoice(r.data.data);
    } catch {
      /* ignore */
    }
  }
  async function del(s) {
    if (!(await confirm({ title: `চালান ${s.invoice_no} ডিলেট করবেন?` })))
      return;
    try {
      await api.delete("/sales/" + s.id);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "ডিলেট করতে সমস্যা");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat l="আজকের আয়" v={money(stats.today_rev)} fg="var(--g600)" />
        <Stat l="মাসিক আয়" v={money(stats.month_rev)} fg="var(--b600)" />
        <Stat l="আজকের চালান" v={toBn(stats.today_inv)} fg="var(--t600)" />
        <Stat l="বকেয়া" v={money(stats.pending)} fg="var(--c400)" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mr-2 text-[13px]" style={{ color: "var(--tm)" }}>
            তারিখ:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field-input"
            style={{ width: 170, display: "inline-block" }}
          />
          {date && (
            <button
              onClick={() => setDate("")}
              className="ml-2 text-[12px]"
              style={{ color: "var(--g600)" }}
            >
              সব দেখাও
            </button>
          )}
        </div>
        <button onClick={openNew} className="btn-primary ml-auto">
          <IcPlus className="h-4 w-4" /> নতুন বিক্রয়
        </button>
      </div>

      <div className="cd !p-0 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>চালান নং</th>
              <th>গ্রাহক</th>
              <th>তারিখ</th>
              <th>মোট</th>
              <th>পেমেন্ট</th>
              <th>অবস্থা</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.invoice_no}</strong>
                  </td>
                  <td>
                    {x.customer_name || "-"}
                    {x.customer_phone && (
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--tm)" }}
                      >
                        {x.customer_phone}
                      </div>
                    )}
                  </td>
                  <td>{dateBn(x.sale_date)}</td>
                  <td>
                    <strong>{money(x.total_amount)}</strong>
                  </td>
                  <td>
                    <span className="b bg">
                      {PN[x.payment_method] || x.payment_method}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`b ${x.payment_status === "paid" ? "bg" : "ba"}`}
                    >
                      {SN[x.payment_status] || x.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        className="ico-btn"
                        onClick={() => viewInv(x.id)}
                        title="দেখুন"
                      >
                        <IcEye className="h-4 w-4" />
                      </button>
                      <button
                        className="ico-btn"
                        onClick={() => printInv(x.id)}
                        title="প্রিন্ট"
                      >
                        <IcPrinter className="h-4 w-4" />
                      </button>
                      <button
                        className="act-btn act-edit"
                        onClick={() => openEdit(x)}
                        title="এডিট"
                      >
                        <IcEdit className="h-[15px] w-[15px]" />
                      </button>
                      <button
                        className="act-btn act-del"
                        onClick={() => del(x)}
                        title="ডিলেট"
                      >
                        <IcTrash className="h-[15px] w-[15px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="lt">
                  কোনো বিক্রয় নেই
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        seedlings={seedlings}
        sale={editing}
        onSaved={load}
      />
      <InvoiceModal
        sale={invoice}
        autoPrint={autoPrint}
        onClose={() => {
          setInvoice(null);
          setAutoPrint(false);
        }}
        office={office}
        location={loc}
        phone={center?.mobile || ""}
      />
    </div>
  );
}

export function SaleModal({ open, onClose, seedlings, sale, onSaved }) {
  const isEdit = Boolean(sale);
  const [cust, setCust] = useState({ name: "", phone: "", address: "" });
  const [pay, setPay] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([
    { seedling_id: "", quantity: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setMsg("");
    if (sale) {
      setCust({
        name: sale.customer_name || "",
        phone: sale.customer_phone || "",
        address: sale.customer_address || "",
      });
      setPay(sale.payment_method || "cash");
      setDiscount(sale.discount || 0);
      const its = (sale.items || []).map((it) => ({
        seedling_id: it.seedling_id || "",
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
      }));
      setItems(
        its.length ? its : [{ seedling_id: "", quantity: 1, unit_price: 0 }],
      );
    } else {
      setCust({ name: "", phone: "", address: "" });
      setPay("cash");
      setDiscount(0);
      setItems([{ seedling_id: "", quantity: 1, unit_price: 0 }]);
    }
  }, [open, sale]);

  const total = useMemo(
    () =>
      items.reduce(
        (s, it) =>
          s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
        0,
      ),
    [items],
  );
  const net = Math.max(0, total - (Number(discount) || 0));

  function setItem(i, patch) {
    setItems((arr) =>
      arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }
  function onSeed(i, id) {
    const sd = seedlings.find((s) => String(s.id) === String(id));
    setItem(i, {
      seedling_id: id,
      unit_price: sd ? Number(sd.unit_price) || 0 : 0,
    });
  }
  function addItem() {
    setItems((a) => [...a, { seedling_id: "", quantity: 1, unit_price: 0 }]);
  }
  function removeItem(i) {
    setItems((a) => a.filter((_, idx) => idx !== i));
  }

  async function save() {
    setMsg("");
    if (!cust.name || !cust.phone || !cust.address) {
      setMsg("গ্রাহকের নাম, ফোন ও ঠিকানা — তিনটাই দিন");
      return;
    }
    setSaving(true);
    try {
      const its = items
        .filter(
          (it) =>
            it.seedling_id && Number(it.quantity) && Number(it.unit_price),
        )
        .map((it) => ({
          seedling_id: Number(it.seedling_id),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        }));
      if (!its.length) {
        setMsg("কমপক্ষে একটি আইটেম দিন");
        setSaving(false);
        return;
      }
      if (isEdit) {
        await api.put("/sales/" + sale.id, {
          customer_name: cust.name,
          customer_phone: cust.phone,
          customer_address: cust.address,
          payment_method: pay,
          discount: Number(discount) || 0,
          items: its,
        });
      } else {
        await api.post("/sales", {
          customer_name: cust.name,
          customer_phone: cust.phone,
          customer_address: cust.address,
          discount: Number(discount) || 0,
          payment_method: pay,
          items: its,
        });
      }
      onClose();
      onSaved && onSaved();
    } catch (e) {
      setMsg(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "সমস্যা হয়েছে",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? `বিক্রয় এডিট — ${sale?.invoice_no || ""}`
          : "নতুন বিক্রয় / চালান"
      }
      wide
    >
      <div className="space-y-3">
        <div
          className="rounded-lg px-3 py-2 text-[12px]"
          style={{ background: "var(--g50)", color: "var(--g600)" }}
        >
          চালান # {isEdit ? sale?.invoice_no || "" : "স্বয়ংক্রিয় হবে"}{" "}
          &nbsp;|&nbsp; তারিখ:{" "}
          {isEdit ? dateBn(sale?.sale_date) : dateBn(today())}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="গ্রাহক নাম*">
            <input
              className="field-input"
              placeholder="পূর্ণ নাম"
              value={cust.name}
              onChange={(e) => setCust({ ...cust, name: e.target.value })}
            />
          </Field>
          <Field label="ফোন*">
            <input
              className="field-input"
              placeholder="01X-XXXXXXXX"
              value={cust.phone}
              onChange={(e) => setCust({ ...cust, phone: e.target.value })}
            />
          </Field>
        </div>
        <Field label="ঠিকানা*">
          <input
            className="field-input"
            placeholder="গ্রাহকের ঠিকানা"
            value={cust.address}
            onChange={(e) => setCust({ ...cust, address: e.target.value })}
          />
        </Field>

        {
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--bd)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold">আইটেম সমূহ</span>
              <button
                onClick={addItem}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white"
                style={{ background: "var(--g600)" }}
              >
                <IcPlus className="h-3.5 w-3.5" /> আইটেম যোগ
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label
                      className="text-[11px]"
                      style={{ color: "var(--tm)" }}
                    >
                      চারা
                    </label>
                    <select
                      className="field-input"
                      value={it.seedling_id}
                      onChange={(e) => onSeed(i, e.target.value)}
                    >
                      <option value="">— বাছাই —</option>
                      {seedlings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name_bn}
                          {s.variety ? ` (${s.variety})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 80 }}>
                    <label
                      className="text-[11px]"
                      style={{ color: "var(--tm)" }}
                    >
                      পরিমাণ
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="field-input"
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <label
                      className="text-[11px]"
                      style={{ color: "var(--tm)" }}
                    >
                      দর (৳)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="field-input"
                      value={it.unit_price}
                      onChange={(e) =>
                        setItem(i, { unit_price: e.target.value })
                      }
                    />
                  </div>
                  <button
                    className="ico-btn mb-[2px]"
                    disabled={items.length <= 1}
                    onClick={() => removeItem(i)}
                    title="বাদ"
                    style={
                      items.length <= 1
                        ? { opacity: 0.4 }
                        : { color: "var(--r400)" }
                    }
                  >
                    <IcTrash className="h-[15px] w-[15px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        }

        <div className="grid grid-cols-2 gap-3">
          <Field label="ছাড় (৳)">
            <input
              type="text"
              inputMode="decimal"
              className="field-input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field label="পরিশোধ পদ্ধতি">
            <select
              className="field-input"
              value={pay}
              onChange={(e) => setPay(e.target.value)}
            >
              <option value="cash">নগদ</option>
              <option value="bkash">বিকাশ</option>
              <option value="bank">ব্যাংক</option>
              <option value="cheque">চেক</option>
            </select>
          </Field>
        </div>

        {
          <div
            className="rounded-lg p-3 text-[14px]"
            style={{ background: "var(--gr50)" }}
          >
            <Row l="মোট" v={money(total)} />
            <Row l="ছাড়" v={"− " + money(Number(discount) || 0)} red />
            <div
              className="mt-1 flex justify-between border-t pt-1 font-semibold"
              style={{ borderColor: "var(--bd)" }}
            >
              <span>নিট মোট</span>
              <span style={{ color: "var(--g600)" }}>{money(net)}</span>
            </div>
          </div>
        }

        {msg && (
          <div className="text-[13px]" style={{ color: "var(--r600)" }}>
            {msg}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2.5 text-[13px]"
            style={{ borderColor: "var(--bd)" }}
          >
            বাতিল
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "সংরক্ষণ হচ্ছে…" : isEdit ? "আপডেট" : "✓ বিক্রয় সম্পন্ন"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceModal({ sale, onClose, office, location, phone, autoPrint }) {
  useEffect(() => {
    if (sale && autoPrint) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [sale, autoPrint]);
  if (!sale) return null;
  const its = sale.items || [];
  return (
    <Modal
      open={Boolean(sale)}
      onClose={onClose}
      title={`চালান — ${sale.invoice_no}`}
      wide
    >
      <div id="invoice-print" style={{ padding: "0 20px" }}>
        {["অফিস কপি", "গ্রাহক কপি"].map((copyLabel, copyIdx) => (
          <div
            key={copyIdx}
            style={{
              pageBreakAfter: copyIdx === 0 ? "always" : "auto",
              marginBottom: copyIdx === 0 ? 20 : 0,
            }}
          >
            <div
              style={{
                textAlign: "right",
                fontSize: 11,
                fontWeight: 600,
                color: "#888",
                marginBottom: 6,
              }}
            >
              {copyLabel}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "3px solid var(--g600)",
                paddingBottom: 12,
                marginBottom: 14,
              }}
            >
              <img
                src="/dae-logo.png"
                alt="DAE Logo"
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--g600)",
                  }}
                >
                  কৃষি সম্প্রসারণ অধিদপ্তর, <br /> হর্টিকালচার উইং
                </div>
                <div style={{ fontSize: 13, color: "#444", marginTop: 2 }}>
                  হর্টিকালচার সেন্টার, {location}
                  {phone && (
                    <>
                      <br />
                      মোবাইল নং: {phone}
                    </>
                  )}
                </div>
              </div>
              <div style={{ width: 56, flexShrink: 0 }}></div>
            </div>
            <div className="mb-3 flex justify-between text-[13px]">
              <div>
                <div className="font-semibold">চালান নং: {sale.invoice_no}</div>
                <div style={{ color: "#666" }}>
                  তারিখ: {dateBn(sale.sale_date)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  গ্রাহক: {sale.customer_name || "-"}
                </div>
                {sale.customer_phone && (
                  <div style={{ color: "#666" }}>{sale.customer_phone}</div>
                )}
                {sale.customer_address && (
                  <div style={{ color: "#666" }}>{sale.customer_address}</div>
                )}
              </div>
            </div>
            <table
              className="tbl"
              style={{ border: "1px solid var(--bd)", width: "100%" }}
            >
              <thead>
                <tr>
                  <th>নং</th>
                  <th>নাম</th>
                  <th>জাত</th>
                  <th>পরিমাণ</th>
                  <th>দর (প্রতিটি)</th>
                  <th>মোট</th>
                </tr>
              </thead>
              <tbody>
                {its.map((it, i) => (
                  <tr key={i}>
                    <td>{toBn(i + 1)}</td>
                    <td>{it.seedling_bn || it.name_bn || "-"}</td>
                    <td>{it.variety || "-"}</td>
                    <td>{toBn(it.quantity)}</td>
                    <td>{money(it.unit_price)}</td>
                    <td>
                      {money(it.total_price ?? it.quantity * it.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 ml-auto w-56 text-[13px]">
              <Row l="সাবটোটাল" v={money(sale.subtotal ?? sale.total_amount)} />
              <Row l="ছাড়" v={"− " + money(sale.discount || 0)} />
              <div
                className="mt-1 flex justify-between border-t pt-1 font-semibold"
                style={{ borderColor: "var(--bd)" }}
              >
                <span>সর্বমোট</span>
                <span style={{ color: "var(--g600)" }}>
                  {money(sale.total_amount)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span style={{ color: "#666" }}>পেমেন্ট</span>
                <span>
                  {PN[sale.payment_method] || sale.payment_method} (
                  {SN[sale.payment_status] || sale.payment_status})
                </span>
              </div>
            </div>
            <div
              className="mt-10 flex justify-between text-[12px]"
              style={{ color: "#666" }}
            >
              <div>গ্রাহকের স্বাক্ষর</div>
              <div>কর্তৃপক্ষের স্বাক্ষর</div>
            </div>
          </div>
        ))}
      </div>

      <div className="no-print mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border px-4 py-2.5 text-[13px]"
          style={{ borderColor: "var(--bd)" }}
        >
          বন্ধ
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ প্রিন্ট
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                'প্রিন্ট ডায়ালগ খুলবে। সেখানে "Destination"-এ "Save as PDF" বেছে নিন, তারপর Save চাপুন।',
              )
            ) {
              window.print();
            }
          }}
          className="rounded-lg px-4 py-2.5 text-[13px] font-medium text-white"
          style={{ background: "#dc2626" }}
        >
          📄 PDF ডাউনলোড
        </button>
      </div>
    </Modal>
  );
}

function Stat({ l, v, fg }) {
  return (
    <div className="sc">
      <div className="sl">{l}</div>
      <div className="sv" style={{ color: fg }}>
        {v}
      </div>
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
function Row({ l, v, red }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: red ? "var(--c400)" : "#666" }}>{l}</span>
      <span style={red ? { color: "var(--c400)" } : undefined}>{v}</span>
    </div>
  );
}
