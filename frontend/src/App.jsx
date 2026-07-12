import Catalog from "./pages/Catalog";
import Reports from "./pages/Reports";
import Budget from "./pages/Budget";
import DevPanel from "./pages/DevPanel";
import About from "./pages/About";
import TenantLogin from "./pages/TenantLogin";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Seedlings from "./pages/Seedlings";
import Production from "./pages/Production";
import MotherPlants from "./pages/MotherPlants";
import BatchManagement from "./pages/BatchManagement";
import Stock from "./pages/Stock";
import Sales from "./pages/Sales";
import Income from "./pages/Income";
import OpeningStock from "./pages/OpeningStock";
import Damages from "./pages/Damages";
import Customers from "./pages/Customers";
import Users from "./pages/Users";
import RecycleBin from "./pages/RecycleBin";
import Notices from "./pages/Notices";
import Employees from "./pages/Employees";
import Settings from "./pages/Settings";
import { SaAuthProvider } from "./superadmin/SaAuth";
import SaProtected from "./superadmin/SaProtected";
import SaLogin from "./superadmin/SaLogin";
import SaLayout from "./superadmin/SaLayout";
import SaOverview from "./superadmin/SaOverview";
import SaPlaceholder from "./superadmin/SaPlaceholder";
import SaCategory from "./superadmin/SaCategory";
import SaAdmins from "./superadmin/SaAdmins";
import SaNotices from "./superadmin/SaNotices";
import SaReport from "./superadmin/SaReport";
import SaCategories from "./superadmin/SaCategories";
import SaHRM from "./superadmin/SaHRM";
import SaBudget from "./superadmin/SaBudget";
import SaCompare from "./superadmin/SaCompare";
import SaTargetSummary from "./superadmin/SaTargetSummary";
import SaDistrictSummary from "./superadmin/SaDistrictSummary";
import SaAllCenters from "./superadmin/SaAllCenters";
import SaCenterDetail from "./superadmin/SaCenterDetail";

const SOON = [
  ["batches", "ব্যাচ ম্যানেজমেন্ট"],
  ["stock", "স্টক রেজিস্টার"],
  ["damages", "ক্ষতি / নষ্ট"],
  ["sales", "বিক্রয় ও চালান"],
  ["customers", "গ্রাহক তালিকা"],
  ["reports", "রিপোর্ট ও বিশ্লেষণ"],
  ["employees", "জনবল তালিকা"],
  ["recycle-bin", "Recycle Bin"],
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/dev" element={<DevPanel />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/:slug/login" element={<TenantLogin />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="seedlings" element={<Seedlings />} />
        <Route path="production" element={<Production />} />
        <Route path="mother-plants" element={<MotherPlants />} />
        <Route path="batches" element={<BatchManagement />} />
        <Route path="stock" element={<Stock />} />
        <Route path="opening-stock" element={<OpeningStock />} />
        <Route path="damages" element={<Damages />} />
        <Route path="reports" element={<Reports />} />
        <Route path="budget" element={<Budget />} />
        <Route path="customers" element={<Customers />} />
        <Route path="users" element={<Users />} />
        <Route path="employees" element={<Employees />} />
        <Route path="settings" element={<Settings />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="notices" element={<Notices />} />
        <Route path="sales" element={<Sales />} />
        <Route path="income" element={<Income />} />
        {SOON.map(([path, title]) => (
          <Route
            key={path}
            path={path}
            element={<Placeholder title={title} />}
          />
        ))}
      </Route>
      {/* ===== সুপার অ্যাডমিন ===== */}
      <Route
        path="/superadmin/login"
        element={
          <SaAuthProvider>
            <SaLogin />
          </SaAuthProvider>
        }
      />
      <Route
        path="/superadmin"
        element={
          <SaAuthProvider>
            <SaProtected>
              <SaLayout />
            </SaProtected>
          </SaAuthProvider>
        }
      >
        <Route index element={<SaOverview />} />
        <Route path="category/:cat" element={<SaCategory />} />
        <Route path="center/:slug" element={<SaCenterDetail />} />
        <Route path="compare" element={<SaCompare />} />
        <Route path="target-summary" element={<SaTargetSummary />} />
        <Route path="district-summary" element={<SaDistrictSummary />} />
        <Route path="all-centers" element={<SaAllCenters />} />
        <Route path="admins" element={<SaAdmins />} />
        <Route path="notices" element={<SaNotices />} />
        <Route path="reports" element={<SaReport />} />
        <Route path="categories" element={<SaCategories />} />
        <Route path="hrm" element={<SaHRM />} />
        <Route path="budget" element={<SaBudget />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
