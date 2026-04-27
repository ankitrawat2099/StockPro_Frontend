import { useState } from "react";
import axios from "axios";

import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useNotice } from "../hooks/useNotice";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { extractApiMessage, formatCurrency, formatDate, getValue, isGuid, isPositiveInteger } from "../lib/utils";

const recordInitial = {
  productId: "",
  warehouseId: "",
  movementType: "STOCK_IN",
  quantity: 1,
  referenceType: "PO",
  referenceId: 0,
  unitCost: 0,
  notes: "",
};

const MOVEMENT_TYPES = ["STOCK_IN", "STOCK_OUT", "TRANSFER_IN", "TRANSFER_OUT"];
const MOVEMENT_LOAD_OPTIONS = [
  { value: "all", label: "All records", roles: ["ADMIN", "MANAGER"] },
  { value: "product", label: "Product ID", roles: ["ADMIN", "MANAGER"] },
  { value: "warehouse", label: "Warehouse ID", roles: ["ADMIN", "MANAGER"] },
  { value: "type", label: "Movement type", roles: ["ADMIN", "MANAGER"] },
  { value: "date", label: "Date range", roles: ["ADMIN", "MANAGER"] },
  { value: "reference", label: "Reference ID", roles: ["ADMIN", "MANAGER"] },
  { value: "stockin", label: "Stock-in summary", roles: ["ADMIN", "MANAGER"] },
  { value: "stockout", label: "Stock-out summary", roles: ["ADMIN", "MANAGER"] },
  { value: "history", label: "Product and warehouse history", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { value: "user", label: "User ID", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
];

export default function MovementsPage() {
  const { user, token } = useAuth();
  const [movements, setMovements] = useState([]);
  const [recordForm, setRecordForm, clearRecordForm] = usePersistentState("draft:movements:recordForm", recordInitial);
  const [activeLoadMode, setActiveLoadMode] = usePersistentState("draft:movements:activeLoadMode", "all");
  const [filters, setFilters] = usePersistentState("draft:movements:filters", {
    productId: "",
    warehouseId: "",
    type: "STOCK_IN",
    start: "",
    end: "",
    referenceId: "",
    userId: "",
  });
  const { message, error, setNotice } = useNotice();

  const canRecord = user?.role === "STAFF";
  const canAnalyse = ["ADMIN", "MANAGER"].includes(user?.role);
  const canViewOwnHistory = ["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(user?.role);
  const availableLoadModes = MOVEMENT_LOAD_OPTIONS.filter((option) => option.roles.includes(user?.role));
  const currentLoadMode = availableLoadModes.some((option) => option.value === activeLoadMode)
    ? activeLoadMode
    : availableLoadModes[0]?.value || "";

  function requireGuid(value, label) {
    if (!isGuid(value)) {
      setNotice("", `Enter a valid ${label} in GUID format.`);
      return false;
    }

    return true;
  }

  function toMovementRows(payload, mode = "") {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (typeof payload === "number" && (mode === "stockin" || mode === "stockout")) {
      return [
        {
          movementId: `${mode}-summary`,
          movementType: mode === "stockin" ? "STOCK_IN_SUMMARY" : "STOCK_OUT_SUMMARY",
          productId: filters.productId,
          warehouseId: "-",
          quantity: payload,
          unitCost: 0,
          balanceAfter: "-",
          movementDate: null,
          referenceType: "SUMMARY",
        },
      ];
    }

    return payload ? [payload] : [];
  }

  function handleLoadMovements() {
    switch (currentLoadMode) {
      case "all":
        loadWith(() => axios.get(API_ROUTES.movements.root, { headers: { Authorization: `Bearer ${token}` } }), "All movement records loaded.", "all");
        return;
      case "product":
        if (!requireGuid(filters.productId, "product ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.byProduct(filters.productId), { headers: { Authorization: `Bearer ${token}` } }),
          "Movement history for the product loaded.",
          "product"
        );
        return;
      case "warehouse":
        if (!requirePositiveIntegerValue(filters.warehouseId, "warehouse ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.byWarehouse(filters.warehouseId), { headers: { Authorization: `Bearer ${token}` } }),
          "Warehouse movement records loaded.",
          "warehouse"
        );
        return;
      case "type":
        loadWith(
          () => axios.get(API_ROUTES.movements.byType(filters.type), { headers: { Authorization: `Bearer ${token}` } }),
          "Movement type results loaded.",
          "type"
        );
        return;
      case "date":
        if (!filters.start || !filters.end) {
          setNotice("", "Select both start and end dates before running a date search.");
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.byDateRange(filters.start, { headers: { Authorization: `Bearer ${filters.end}` } }), token),
          "Movement date range loaded.",
          "date"
        );
        return;
      case "reference":
        if (!requirePositiveIntegerValue(filters.referenceId, "reference ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.byReference(filters.referenceId), { headers: { Authorization: `Bearer ${token}` } }),
          "Reference-linked movements loaded.",
          "reference"
        );
        return;
      case "stockin":
        if (!requireGuid(filters.productId, "product ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.stockIn(filters.productId), { headers: { Authorization: `Bearer ${token}` } }),
          "Stock-in movement summary loaded.",
          "stockin"
        );
        return;
      case "stockout":
        if (!requireGuid(filters.productId, "product ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.stockOut(filters.productId), { headers: { Authorization: `Bearer ${token}` } }),
          "Stock-out movement summary loaded.",
          "stockout"
        );
        return;
      case "history":
        if (!requireGuid(filters.productId, "product ID")) {
          return;
        }

        if (!requirePositiveIntegerValue(filters.warehouseId, "warehouse ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.history(filters.productId, { headers: { Authorization: `Bearer ${filters.warehouseId}` } }), token),
          "Movement history loaded.",
          "history"
        );
        return;
      case "user":
        if (!requireGuid(filters.userId, "user ID")) {
          return;
        }

        loadWith(
          () => axios.get(API_ROUTES.movements.byUser(filters.userId), { headers: { Authorization: `Bearer ${token}` } }),
          "User movement history loaded.",
          "user"
        );
        return;
      default:
        setNotice("", "Choose how you want to load movement data.");
    }
  }

  function requirePositiveIntegerValue(value, label) {
    if (!isPositiveInteger(value)) {
      setNotice("", `Enter a valid numeric ${label}.`);
      return false;
    }

    return true;
  }

  async function loadWith(factory, successMessage = "Movement data loaded.", mode = "") {
    setNotice();

    try {
      const response = await factory();
      setMovements(toMovementRows(response.data, mode));
      setNotice(successMessage);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleRecord(event) {
    event.preventDefault();
    setNotice();

    try {
      if (!requireGuid(recordForm.productId, "product ID")) {
        return;
      }

      if (!requirePositiveIntegerValue(recordForm.warehouseId, "warehouse ID")) {
        return;
      }

      await api.post(API_ROUTES.movements.root, {
        productId: recordForm.productId,
        warehouseId: Number(recordForm.warehouseId),
        movementType: recordForm.movementType,
        quantity: Number(recordForm.quantity),
        referenceType: recordForm.referenceType,
        referenceId: Number(recordForm.referenceId),
        unitCost: Number(recordForm.unitCost),
        notes: recordForm.notes,
      });

      setNotice("Movement recorded.");
      clearRecordForm();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Movement"
        title="Stock movement audit trail"
        description="Staff can record movements, managers and admins can run full movement analytics, and every signed-in role can inspect movement history allowed by the backend."
      />

      <FloatingNotice error={error} message={message} />

      <div className="grid gap-4 xl:grid-cols-2">
        {canRecord ? (
          <form className="panel-soft p-6" onSubmit={handleRecord}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Record Movement</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Product ID"
                required
                value={recordForm.productId}
                onChange={(event) => setRecordForm((current) => ({ ...current, productId: event.target.value }))}
              />
              <input
                placeholder="Warehouse ID"
                required
                type="number"
                value={recordForm.warehouseId}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, warehouseId: event.target.value }))
                }
              />
              <select
                value={recordForm.movementType}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, movementType: event.target.value }))
                }
              >
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                placeholder="Quantity"
                required
                type="number"
                value={recordForm.quantity}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                }
              />
              <input
                placeholder="Reference type"
                value={recordForm.referenceType}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, referenceType: event.target.value }))
                }
              />
              <input
                placeholder="Reference ID"
                type="number"
                value={recordForm.referenceId}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, referenceId: Number(event.target.value) }))
                }
              />
              <input
                placeholder="Unit cost"
                type="number"
                value={recordForm.unitCost}
                onChange={(event) =>
                  setRecordForm((current) => ({ ...current, unitCost: Number(event.target.value) }))
                }
              />
              <textarea
                className="md:col-span-2"
                placeholder="Notes"
                rows="3"
                value={recordForm.notes}
                onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <button className="primary-btn mt-5" type="submit">
              Record movement
            </button>
          </form>
        ) : null}

        <section className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Load Movement Data</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <select value={currentLoadMode} onChange={(event) => setActiveLoadMode(event.target.value)}>
              {availableLoadModes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {["product", "stockin", "stockout", "history"].includes(currentLoadMode) ? (
              <input
                placeholder="Product ID"
                value={filters.productId}
                onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}
              />
            ) : null}

            {["warehouse", "history"].includes(currentLoadMode) ? (
              <input
                placeholder="Warehouse ID"
                value={filters.warehouseId}
                onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
              />
            ) : null}

            {currentLoadMode === "reference" ? (
              <input
                placeholder="Reference ID"
                value={filters.referenceId}
                onChange={(event) => setFilters((current) => ({ ...current, referenceId: event.target.value }))}
              />
            ) : null}

            {currentLoadMode === "user" ? (
              <input
                placeholder="User ID"
                value={filters.userId}
                onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))}
              />
            ) : null}

            {currentLoadMode === "type" ? (
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            ) : null}

            {currentLoadMode === "date" ? (
              <>
                <input
                  type="date"
                  value={filters.start}
                  onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value }))}
                />
                <input
                  type="date"
                  value={filters.end}
                  onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value }))}
                />
              </>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="primary-btn" onClick={handleLoadMovements} type="button">
              Load movement data
            </button>
          </div>
        </section>
      </div>

      <section className="panel-soft p-6">
        <DataTable
          columns={[
            {
              label: "Movement",
              render: (row) => (
                <div>
                  <p className="font-semibold text-ink-900">
                    #{getValue(row, "movementId", "MovementId")} - {getValue(row, "movementType", "MovementType")}
                  </p>
                  <p className="text-xs text-ink-500">{getValue(row, "referenceType", "ReferenceType")}</p>
                </div>
              ),
            },
            { label: "Product", render: (row) => getValue(row, "productId", "ProductId") },
            { label: "Warehouse", render: (row) => getValue(row, "warehouseId", "WarehouseId") },
            { label: "Quantity", render: (row) => getValue(row, "quantity", "Quantity") },
            { label: "Unit Cost", render: (row) => formatCurrency(getValue(row, "unitCost", "UnitCost")) },
            { label: "Balance After", render: (row) => getValue(row, "balanceAfter", "BalanceAfter") || "-" },
            { label: "Date", render: (row) => formatDate(getValue(row, "movementDate", "MovementDate")) },
          ]}
          rows={movements}
        />
      </section>
    </div>
  );
}
