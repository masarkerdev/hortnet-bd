// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const tenantMiddleware = require("./middleware/tenant");

// ★ সব জায়গার console.error() automatic master DB-তে সংরক্ষণ করে —
// প্রতিটা route আলাদা করে touch না করে centralized error logging
const _originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  _originalConsoleError(...args);
  try {
    const masterDb = require("./config/masterDb");
    const message = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ")
      .slice(0, 2000);
    masterDb
      .query(
        `CREATE TABLE IF NOT EXISTS error_logs (
          id SERIAL PRIMARY KEY,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        )`
      )
      .then(() =>
        masterDb.query("INSERT INTO error_logs (message) VALUES ($1)", [message])
      )
      .catch(() => {}); // এই logging নিজেই fail করলে silently ignore (infinite loop এড়াতে)
  } catch (e) {}
};

const app = express();
app.disable("etag");

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ★ সব API response-এ no-cache header — Nginx/browser caching bug এড়াতে (permanent fix)
app.use("/api", (req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/api/public", require("./routes/public"));

// ★ Developer routes (hidden)
app.use("/api/dev", require("./routes/developer"));
app.use("/api/hrm", require("./routes/hrm"));
app.use("/api/budget-admin", require("./routes/budgetAdmin"));

// ★ Tenant middleware
app.use(tenantMiddleware);

// ★ Super Admin routes
app.use("/api/superadmin", require("./routes/superadmin"));

//new lines are added here
app.use("/api/superadmin", require("./routes/superadminExtra"));
app.use("/api/category-requests", require("./routes/categoryRequests"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/budget", require("./routes/budget"));

//end of new lines

// ★ Super Admin HTML page
app.get("/superadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "superadmin.html"));
});

// ★ Tenant info endpoint
app.get("/api/tenant-info", async (req, res) => {
  const slug =
    req.headers["x-tenant-id"] ||
    req.query?.tenant ||
    (() => {
      if (req.headers.cookie) {
        const m = req.headers.cookie.match(/(?:^|;\s*)tenant=([^;]+)/);
        if (m) return m[1];
      }
      return null;
    })() ||
    (req.headers.host?.includes("horticulturecenterasambasti")
      ? "asambasti"
      : null);

  if (!slug) return res.json({ success: false });

  try {
    const { getTenants } = require("./lib/tenantCache");
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.json({ success: false });
    res.json({
      success: true,
      tenant: {
        slug,
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        currency: tenant.currency || "BDT",
      },
    });
  } catch {
    res.json({ success: false });
  }
});

// ★ Existing routes
app.use("/api", require("./routes/index"));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 30002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // ৭৬+ center-এ স্কেল করার জন্য — background-এ periodically সব center-এর
  // stats cache করে রাখে, Overview page instant load হওয়ার জন্য
  try {
    const { startBackgroundRefresh } = require("./lib/centerStatsCache");
    startBackgroundRefresh();
  } catch (e) {
    console.error("centerStatsCache startup error:", e.message);
  }
  try {
    const { startCatalogRefresh } = require("./lib/catalogCache");
    startCatalogRefresh();
  } catch (e) {
    console.error("catalogCache startup error:", e.message);
  }
});

module.exports = app;
