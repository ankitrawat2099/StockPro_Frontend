import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { API_ROUTES, DASHBOARD_COPY, NAV_ITEMS, ROLE_LABELS } from "../lib/constants";
import { formatCurrency, getValue, safeArray } from "../lib/utils";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState({
    products: 0,
    warehouses: 0,
    users: 0,
    suppliers: 0,
    approvedPos: 0,
    lowStock: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const nextSummary = {
        products: 0,
        warehouses: 0,
        users: 0,
        suppliers: 0,
        approvedPos: 0,
        lowStock: 0,
        totalValue: 0,
      };

      try {
        if (["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(user?.role)) {
          const prodRes = await axios.get(API_ROUTES.products.root, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.products = safeArray(prodRes.data).length;

          const whRes = await axios.get(API_ROUTES.warehouse.warehouses, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.warehouses = safeArray(whRes.data).length;

          const lowStockRes = await axios.get(API_ROUTES.warehouse.lowStock, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.lowStock = safeArray(lowStockRes.data).length;
        }

        if (user?.role === "ADMIN") {
          const userRes = await axios.get(API_ROUTES.auth.users, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.users = safeArray(userRes.data).length;
        }

        if (user?.role === "OFFICER") {
          const supRes = await axios.get(API_ROUTES.suppliers.root, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.suppliers = safeArray(supRes.data).length;
        }

        if (["ADMIN", "MANAGER", "OFFICER"].includes(user?.role)) {
          const poRes = await axios.get(API_ROUTES.purchaseOrders.byStatus("APPROVED"), { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.approvedPos = safeArray(poRes.data).length;
        }

        if (["ADMIN", "MANAGER"].includes(user?.role)) {
          const valRes = await axios.get(API_ROUTES.reports.totalValue, { headers: { Authorization: `Bearer ${token}` } });
          nextSummary.totalValue = getValue(valRes.data, "totalValue", "TotalValue") || valRes.data || 0;
        }
      } catch (error) {
        console.error("Failed to load some dashboard data:", error);
      } finally {
        setSummary(nextSummary);
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user?.role]);

  const quickLinks = NAV_ITEMS.filter(
    (item) => item.to !== "/" && item.to !== "/profile" && item.roles.includes(user?.role)
  );
  const heroCopy = DASHBOARD_COPY[user?.role] || DASHBOARD_COPY.STAFF;
  const canViewInventoryValue = ["ADMIN", "MANAGER"].includes(user?.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={ROLE_LABELS[user?.role] || "Dashboard"}
        title={`Hi ${user?.fullName?.split(" ")[0] || "there"}, here's your StockPro view`}
        description="The summary cards below are wired to your microservices and adapt based on the signed-in role."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={loading ? "..." : summary.products} />
        <StatCard label="Warehouses" value={loading ? "..." : summary.warehouses} tone="mint" />
        <StatCard label="Low Stock" value={loading ? "..." : summary.lowStock} />
        {canViewInventoryValue ? (
          <StatCard
            label="Total Inventory Value"
            value={loading ? "..." : formatCurrency(summary.totalValue)}
            tone="mint"
          />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {user?.role === "ADMIN" ? (
          <StatCard label="Users" value={loading ? "..." : summary.users} tone="coral" />
        ) : null}
        {user?.role === "OFFICER" ? (
          <StatCard label="Suppliers" value={loading ? "..." : summary.suppliers} tone="coral" />
        ) : null}
        {["ADMIN", "MANAGER", "OFFICER"].includes(user?.role) ? (
          <StatCard label="Approved POs" value={loading ? "..." : summary.approvedPos} tone="coral" />
        ) : null}
      </div>

      <section>
        <div className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Quick Access</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                className="rounded-3xl border border-ink-100 bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-coral/30"
                to={item.to}
              >
                <h3 className="text-xl">{item.label}</h3>
                <p className="mt-2 text-sm text-ink-600">Open the {item.label.toLowerCase()} workspace.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
