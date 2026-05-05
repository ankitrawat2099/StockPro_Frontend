import { useState, useContext } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { AuthContext } from "../context/AuthContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { downloadBlob, extractApiMessage, formatCurrency, isPositiveInteger, titleCase } from "../lib/utils";

const REPORT_ACTIONS = [
  { value: "totalValue", label: "Total value", resultLabel: "Total stock value", roles: ["ADMIN", "MANAGER"] },
  { value: "byWarehouse", label: "By warehouse", resultLabel: "Stock value by warehouse", roles: ["ADMIN", "MANAGER"], requires: ["warehouseId"] },
  { value: "turnover", label: "Turnover", resultLabel: "Inventory turnover", roles: ["ADMIN", "MANAGER"], requires: ["dateRange"] },
  { value: "lowStock", label: "Low stock", resultLabel: "Low stock report", roles: ["MANAGER"] },
  { value: "topMoving", label: "Top moving", resultLabel: "Top moving products", roles: ["ADMIN", "MANAGER"] },
  { value: "slowMoving", label: "Slow moving", resultLabel: "Slow moving products", roles: ["MANAGER"] },
  { value: "deadStock", label: "Dead stock", resultLabel: "Dead stock", roles: ["ADMIN", "MANAGER"] },
  { value: "poSummary", label: "PO summary", resultLabel: "PO summary", roles: ["ADMIN", "MANAGER"] },
];

const renderObjectRows = (source) => {
  return Object.entries(source || {}).map(([key, value]) => ({
    key,
    label: titleCase(key),
    value: typeof value === "number" ? formatCurrency(value) : String(value),
  }));
};

const formatReportValue = (value, label = "") => {
  if (typeof value === "number") {
    return /value|amount|cost|summary/i.test(label) ? formatCurrency(value) : String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value ?? "-");
};

const extractReportDownloadError = async (error) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();

      if (!text) {
        return error?.message || "Something went wrong. Please try again.";
      }

      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.error || text;
    } catch {
      return error?.message || "Something went wrong. Please try again.";
    }
  }

  return extractApiMessage(error);
};

const ReportsPage = () => {
  const { user, token } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [single, setSingle] = useState([]);
  const [context, setContext] = useState("Run a report to view analytics.");
  const [activeReport, setActiveReport] = usePersistentState(
    "draft:reports:activeReport",
    "totalValue"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = usePersistentState("draft:reports:filters", {
    warehouseId: "",
    start: "",
    end: "",
  });

  const handleChange = (e) => {
    setFilters((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const runReport = async (label, factory) => {
    try {
      const response = await factory();
      const payload = response.data;
      setContext(label);

      if (Array.isArray(payload)) {
        if (payload.some((item) => item && typeof item === "object")) {
          setRows(payload);
          setSingle([]);
        } else {
          setRows(
            payload.map((item, index) => ({
              item: index + 1,
              value: formatReportValue(item, label),
            }))
          );
          setSingle([]);
        }

        toast.success(`${label} loaded.`);

        return;
      }

      setRows([]);
      setSingle(
        payload && typeof payload === "object"
          ? renderObjectRows(payload)
          : [{ label, value: formatReportValue(payload, label) }]
      );
      toast.success(`${label} loaded.`);
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const generateReportFile = async () => {
    try {
      const response = await axios.get(API_ROUTES.reports.generate, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      downloadBlob(response.data, "stockpro-report.txt", "application/octet-stream");
      toast.success("Inventory report downloaded.");
    } catch (submitError) {
      toast.error(await extractReportDownloadError(submitError));
    }
  };

  const dynamicColumns =
    rows.length > 0
      ? Object.keys(rows[0] || {}).map((key) => ({
          label: titleCase(key),
          render: (row) => {
            const value = row[key];
            return typeof value === "object" ? JSON.stringify(value) : String(value ?? "-");
          },
        }))
      : [
          { label: "Metric", render: (row) => row.label },
          { label: "Value", render: (row) => row.value },
        ];
  const isManager = user?.role === "MANAGER";
  const availableReports = REPORT_ACTIONS.filter((action) => action.roles.includes(user?.role));
  const selectedReport =
    availableReports.find((action) => action.value === activeReport) || availableReports[0];

  const handleRunReport = async () => {
    if (!selectedReport) {
      toast.error("Choose a report first.");
      return;
    }

    if (
      selectedReport.requires?.includes("warehouseId") &&
      !isPositiveInteger(filters.warehouseId)
    ) {
      toast.error("Enter a valid numeric warehouse ID before running this report.");
      return;
    }

    if (selectedReport.requires?.includes("dateRange") && (!filters.start || !filters.end)) {
      toast.error("Select both start and end dates before running the turnover report.");
      return;
    }

    const factories = {
      totalValue: () =>
        axios.get(API_ROUTES.reports.totalValue, { headers: { Authorization: `Bearer ${token}` } }),
      byWarehouse: () =>
        axios.get(API_ROUTES.reports.byWarehouse(filters.warehouseId), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      turnover: () =>
        axios.get(API_ROUTES.reports.turnover(filters.start, filters.end), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      lowStock: () =>
        axios.get(API_ROUTES.reports.lowStock, { headers: { Authorization: `Bearer ${token}` } }),
      topMoving: () =>
        axios.get(API_ROUTES.reports.topMoving, { headers: { Authorization: `Bearer ${token}` } }),
      slowMoving: () =>
        axios.get(API_ROUTES.reports.slowMoving, { headers: { Authorization: `Bearer ${token}` } }),
      deadStock: () =>
        axios.get(API_ROUTES.reports.deadStock, { headers: { Authorization: `Bearer ${token}` } }),
      poSummary: () =>
        axios.get(API_ROUTES.reports.poSummary, { headers: { Authorization: `Bearer ${token}` } }),
    };

    await runReport(selectedReport.resultLabel, factories[selectedReport.value]);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Reports and KPI exports"
        description="Managers and admins can query the reporting microservice and download the generated inventory report."
      />

      <section className="panel-soft p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Choose Report</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {availableReports.map((action) => (
            <button
              key={action.value}
              className={selectedReport?.value === action.value ? "primary-btn" : "secondary-btn"}
              onClick={() => setActiveReport(action.value)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {selectedReport?.requires?.includes("warehouseId") ? (
            <input
              name="warehouseId"
              placeholder="Warehouse ID"
              type="number"
              value={filters.warehouseId}
              onChange={handleChange}
            />
          ) : null}

          {selectedReport?.requires?.includes("dateRange") ? (
            <>
              <input name="start" type="date" value={filters.start} onChange={handleChange} />
              <input name="end" type="date" value={filters.end} onChange={handleChange} />
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="primary-btn" onClick={handleRunReport} type="button">
            Run report
          </button>
          <button className="danger-btn" onClick={generateReportFile} type="button">
            Download report
          </button>
        </div>
      </section>

      <section className="panel-soft p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Current Result</p>
        <h3 className="mt-3 text-2xl">{context}</h3>
        <div className="mt-5">
          <DataTable
            columns={dynamicColumns}
            rows={rows.length ? rows : single}
            emptyMessage="No report data loaded yet."
          />
        </div>
      </section>
    </div>
  );
};

export default ReportsPage;
