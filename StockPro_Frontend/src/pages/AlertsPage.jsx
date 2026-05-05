import { useState, useContext } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { usePersistentState } from "../hooks/usePersistentState";
import { AuthContext } from "../context/AuthContext";
import { API_ROUTES } from "../lib/constants";
import { extractApiMessage, formatDate, getValue, isGuid, isPositiveInteger } from "../lib/utils";

const createInitial = {
  recipientId: "",
  type: "LOW_STOCK",
  severity: "WARNING",
  title: "",
  message: "",
  relatedProductId: "",
  relatedWarehouseId: "",
  channel: "IN_APP",
};

const ALERT_LOAD_OPTIONS = [
  { value: "list", label: "All recipient alerts", actionLabel: "Load alerts" },
  { value: "unread", label: "Unread count", actionLabel: "Load unread count" },
  { value: "unacknowledged", label: "Unacknowledged alerts", actionLabel: "Load unacknowledged" },
  { value: "readAll", label: "Mark all as read", actionLabel: "Mark all read" },
];

const AlertsPage = () => {
  const { token } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState("");
  const [form, setForm, clearForm] = usePersistentState("draft:alerts:form", createInitial);
  const [local, setLocal] = usePersistentState("draft:alerts:local", {
    loadMode: "list",
    recipientId: "",
    bulkRecipients: "",
  });

  const handleChange = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleLocalChange = (e) => {
    setLocal((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const loadAlerts = async (path, successMessage) => {
    try {
      const response = await axios.get(path, { headers: { Authorization: `Bearer ${token}` } });
      if (Array.isArray(response.data)) {
        setAlerts(response.data);
        setUnreadCount("");
      } else {
        setAlerts([]);
        setUnreadCount(String(response.data));
      }

      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    try {
      if (!isPositiveInteger(form.recipientId)) {
        toast.error("Enter a valid numeric recipient ID.");
        return;
      }

      if (form.relatedProductId && !isGuid(form.relatedProductId)) {
        toast.error("Related product ID must be a valid GUID.");
        return;
      }

      if (form.relatedWarehouseId && !isPositiveInteger(form.relatedWarehouseId)) {
        toast.error("Related warehouse ID must be numeric.");
        return;
      }

      await axios.post(
        API_ROUTES.alerts.root,
        {
          recipientId: Number(form.recipientId),
          type: form.type,
          severity: form.severity,
          title: form.title,
          message: form.message,
          relatedProductId: form.relatedProductId || null,
          relatedWarehouseId: form.relatedWarehouseId ? Number(form.relatedWarehouseId) : null,
          channel: form.channel,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Alert created.");
      clearForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleBulkCreate = async () => {
    try {
      const recipients = [
        ...new Set(
          local.bulkRecipients
            .split(/[\s,]+/)
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0)
        ),
      ];

      if (!recipients.length) {
        toast.error("Enter one or more recipient IDs separated by commas or spaces.");
        return;
      }

      await axios.post(
        API_ROUTES.alerts.bulk,
        recipients.map((id) => ({
          recipientId: Number(id),
          type: form.type,
          severity: form.severity,
          title: form.title,
          message: form.message,
          relatedProductId: form.relatedProductId || null,
          relatedWarehouseId: form.relatedWarehouseId ? Number(form.relatedWarehouseId) : null,
          channel: form.channel,
        })),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Bulk alerts sent.");
      setLocal((c) => ({ ...c, bulkRecipients: "" }));
      clearForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleLoadAlerts = async () => {
    if (!isPositiveInteger(local.recipientId)) {
      toast.error("Enter a valid numeric recipient ID.");
      return;
    }

    switch (local.loadMode) {
      case "list":
        loadAlerts(API_ROUTES.alerts.byRecipient(local.recipientId), "Alerts loaded.");
        return;
      case "unread":
        loadAlerts(API_ROUTES.alerts.unread(local.recipientId), "Unread alert count loaded.");
        return;
      case "unacknowledged":
        loadAlerts(
          API_ROUTES.alerts.unacknowledged(local.recipientId),
          "Unacknowledged alerts loaded."
        );
        return;
      case "readAll":
        try {
          await axios.post(API_ROUTES.alerts.readAll(local.recipientId), null, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success("All recipient alerts marked as read.");
        } catch (submitError) {
          toast.error(extractApiMessage(submitError));
        }
        return;
      default:
        toast.error("Choose how you want to load alerts.");
    }
  };

  const selectedLoadOption =
    ALERT_LOAD_OPTIONS.find((option) => option.value === local.loadMode) || ALERT_LOAD_OPTIONS[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Alerts"
        title="Alert centre"
        description="Create, send, and manage alerts through the alert microservice."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Load Recipient Alerts
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Load mode</label>
              <select name="loadMode" value={local.loadMode} onChange={handleLocalChange}>
                {ALERT_LOAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Recipient ID</label>
              <input
                name="recipientId"
                placeholder="Numeric recipient ID"
                value={local.recipientId}
                onChange={handleLocalChange}
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="primary-btn" onClick={handleLoadAlerts} type="button">
              {selectedLoadOption.actionLabel}
            </button>
          </div>

          {unreadCount ? (
            <div className="mt-5 rounded-3xl bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Unread count</p>
              <p className="mt-2 text-4xl font-semibold">{unreadCount}</p>
            </div>
          ) : null}
        </section>

        <form className="panel-soft p-6" onSubmit={handleCreate}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Create Alert</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Recipient ID</label>
              <input
                name="recipientId"
                required
                type="number"
                value={form.recipientId}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="LOW_STOCK">LOW_STOCK</option>
                <option value="OVERSTOCK">OVERSTOCK</option>
                <option value="PO_PENDING">PO_PENDING</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Severity</label>
              <select name="severity" value={form.severity} onChange={handleChange}>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Channel</label>
              <select name="channel" value={form.channel} onChange={handleChange}>
                <option value="IN_APP">IN_APP</option>
                <option value="EMAIL">EMAIL</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Title</label>
              <input name="title" required value={form.title} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Message</label>
              <textarea
                name="message"
                rows="3"
                required
                value={form.message}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">
                Related product ID
              </label>
              <input
                name="relatedProductId"
                placeholder="Optional GUID"
                value={form.relatedProductId}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">
                Related warehouse ID
              </label>
              <input
                name="relatedWarehouseId"
                placeholder="Optional numeric ID"
                type="number"
                value={form.relatedWarehouseId}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">
                Bulk recipient IDs
              </label>
              <textarea
                name="bulkRecipients"
                placeholder="Separate recipient IDs with commas or spaces"
                rows="2"
                value={local.bulkRecipients}
                onChange={handleLocalChange}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="primary-btn" type="submit">
              Send alert
            </button>
            <button className="secondary-btn" onClick={handleBulkCreate} type="button">
              Send bulk alerts
            </button>
          </div>
        </form>
      </div>

      <section className="panel-soft p-6">
        <DataTable
          columns={[
            {
              label: "Alert",
              render: (row) => (
                <div>
                  <p className="font-semibold text-ink-900">{getValue(row, "title", "Title")}</p>
                  <p className="text-xs text-ink-500">{getValue(row, "message", "Message")}</p>
                </div>
              ),
            },
            {
              label: "Recipient",
              render: (row) => (
                <span className="font-mono text-sm text-ink-800">
                  #{getValue(row, "recipientId", "RecipientId") || "-"}
                </span>
              ),
            },
            { label: "Type", render: (row) => getValue(row, "type", "Type") },
            { label: "Severity", render: (row) => getValue(row, "severity", "Severity") },
            {
              label: "Created",
              render: (row) => formatDate(getValue(row, "createdAt", "CreatedAt")),
            },
            {
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="secondary-btn px-4 py-2"
                    onClick={async () => {
                      try {
                        await axios.post(
                          API_ROUTES.alerts.markRead(getValue(row, "alertId", "AlertId")),
                          null,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success("Alert marked as read.");
                        handleLoadAlerts();
                      } catch (submitError) {
                        toast.error(extractApiMessage(submitError));
                      }
                    }}
                    type="button"
                  >
                    Read
                  </button>
                  <button
                    className="secondary-btn px-4 py-2"
                    onClick={async () => {
                      try {
                        await axios.post(
                          API_ROUTES.alerts.acknowledge(getValue(row, "alertId", "AlertId")),
                          null,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success("Alert acknowledged.");
                        handleLoadAlerts();
                      } catch (submitError) {
                        toast.error(extractApiMessage(submitError));
                      }
                    }}
                    type="button"
                  >
                    Acknowledge
                  </button>
                  <button
                    className="danger-btn px-4 py-2"
                    onClick={async () => {
                      try {
                        await axios.delete(
                          API_ROUTES.alerts.remove(getValue(row, "alertId", "AlertId")),
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success("Alert deleted.");
                        handleLoadAlerts();
                      } catch (submitError) {
                        toast.error(extractApiMessage(submitError));
                      }
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={alerts}
        />
      </section>
    </div>
  );
};

export default AlertsPage;
