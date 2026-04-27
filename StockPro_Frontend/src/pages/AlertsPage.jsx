import { useState } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { usePersistentState } from "../hooks/usePersistentState";
import { useNotice } from "../hooks/useNotice";
import { useAuth } from "../context/AuthContext";
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

export default function AlertsPage() {
  const { token } = useAuth();
  const [loadMode, setLoadMode] = usePersistentState("draft:alerts:loadMode", "list");
  const [recipientId, setRecipientId] = usePersistentState("draft:alerts:recipientId", "");
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState("");
  const [form, setForm, clearForm] = usePersistentState("draft:alerts:form", createInitial);
  const [bulkRecipients, setBulkRecipients, clearBulkRecipients] = usePersistentState(
    "draft:alerts:bulkRecipients",
    ""
  );
  const { message, error, setNotice } = useNotice();



  async function loadAlerts(path, successMessage) {
    setNotice();

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
        setNotice(successMessage);
      }
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setNotice();

    try {
      if (!isPositiveInteger(form.recipientId)) {
        setNotice("", "Enter a valid numeric recipient ID.");
        return;
      }

      if (form.relatedProductId && !isGuid(form.relatedProductId)) {
        setNotice("", "Related product ID must be a valid GUID.");
        return;
      }

      if (form.relatedWarehouseId && !isPositiveInteger(form.relatedWarehouseId)) {
        setNotice("", "Related warehouse ID must be numeric.");
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

      setNotice("Alert created.");
      clearForm();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleBulkCreate() {
    setNotice();

    try {
      const recipients = [
        ...new Set(
          bulkRecipients
            .split(/[\s,]+/)
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0)
        ),
      ];

      if (!recipients.length) {
        setNotice("", "Enter one or more recipient IDs separated by commas or spaces.");
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

      setNotice("Bulk alerts sent.");
      clearBulkRecipients();
      clearForm();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function runAction(factory, successMessage) {
    setNotice();

    try {
      await factory();
      setNotice(successMessage);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  function handleLoadAlerts() {
    if (!isPositiveInteger(recipientId)) {
      setNotice("", "Enter a valid numeric recipient ID.");
      return;
    }

    switch (loadMode) {
      case "list":
        loadAlerts(API_ROUTES.alerts.byRecipient(recipientId), "Alerts loaded.");
        return;
      case "unread":
        loadAlerts(API_ROUTES.alerts.unread(recipientId), "Unread alert count loaded.");
        return;
      case "unacknowledged":
        loadAlerts(API_ROUTES.alerts.unacknowledged(recipientId), "Unacknowledged alerts loaded.");
        return;
      case "readAll":
        runAction(
          () => axios.post(API_ROUTES.alerts.readAll(recipientId), null, { headers: { Authorization: `Bearer ${token}` } }),
          "All recipient alerts marked as read."
        );
        return;
      default:
        setNotice("", "Choose how you want to load alerts.");
    }
  }

  const selectedLoadOption =
    ALERT_LOAD_OPTIONS.find((option) => option.value === loadMode) || ALERT_LOAD_OPTIONS[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Alerts"
        title="Alert centre"
        description="Create, send, and manage alerts through the alert microservice."
      />

      <FloatingNotice error={error} message={message} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Load Recipient Alerts</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Load mode</label>
              <select value={loadMode} onChange={(event) => setLoadMode(event.target.value)}>
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
                placeholder="Numeric recipient ID"
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
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
                required
                type="number"
                value={form.recipientId}
                onChange={(event) => setForm((current) => ({ ...current, recipientId: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Type</label>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="LOW_STOCK">LOW_STOCK</option>
                <option value="OVERSTOCK">OVERSTOCK</option>
                <option value="PO_PENDING">PO_PENDING</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Severity</label>
              <select
                value={form.severity}
                onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
              >
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Channel</label>
              <select
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="IN_APP">IN_APP</option>
                <option value="EMAIL">EMAIL</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Title</label>
              <input
                required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Message</label>
              <textarea
                rows="3"
                required
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Related product ID</label>
              <input
                placeholder="Optional GUID"
                value={form.relatedProductId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, relatedProductId: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Related warehouse ID</label>
              <input
                placeholder="Optional numeric ID"
                type="number"
                value={form.relatedWarehouseId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, relatedWarehouseId: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Bulk recipient IDs</label>
              <textarea
                placeholder="Separate recipient IDs with commas or spaces"
                rows="2"
                value={bulkRecipients}
                onChange={(event) => setBulkRecipients(event.target.value)}
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
            { label: "Created", render: (row) => formatDate(getValue(row, "createdAt", "CreatedAt")) },
            {
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="secondary-btn px-4 py-2"
                    onClick={() =>
                      runAction(
                        () => api.post(API_ROUTES.alerts.markRead(getValue(row, "alertId", "AlertId")), null, token),
                        "Alert marked as read."
                      )
                    }
                    type="button"
                  >
                    Read
                  </button>
                  <button
                    className="secondary-btn px-4 py-2"
                    onClick={() =>
                      runAction(
                        () => api.post(API_ROUTES.alerts.acknowledge(getValue(row, "alertId", "AlertId")), null, token),
                        "Alert acknowledged."
                      )
                    }
                    type="button"
                  >
                    Acknowledge
                  </button>
                  <button
                    className="danger-btn px-4 py-2"
                    onClick={() =>
                      runAction(
                        () => axios.delete(API_ROUTES.alerts.remove(getValue(row, "alertId", "AlertId")), { headers: { Authorization: `Bearer ${token}` } }),
                        "Alert deleted."
                      )
                    }
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
}
