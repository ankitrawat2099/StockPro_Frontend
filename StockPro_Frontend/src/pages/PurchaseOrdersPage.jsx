import { useEffect, useState } from "react";
import axios from "axios";

import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useNotice } from "../hooks/useNotice";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import {
  extractApiMessage,
  formatCurrency,
  formatDate,
  getValue,
  isGuid,
  isPositiveInteger,
  safeArray,
} from "../lib/utils";

const orderInitial = {
  supplierId: "",
  warehouseId: "",
  expectedDate: "",
  notes: "",
  referenceNumber: "",
  items: [{ productId: "", quantity: 1, unitCost: 0 }],
};

const editInitial = {
  poId: "",
  supplierId: "",
  warehouseId: "",
  expectedDate: "",
  notes: "",
  referenceNumber: "",
};

const receiveInitial = {
  poId: "",
  items: [{ lineItemId: "", receivedQty: 1 }],
};

const ORDER_LOAD_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "id", label: "Purchase order ID" },
  { value: "supplier", label: "Supplier ID" },
  { value: "warehouse", label: "Warehouse ID" },
  { value: "dateRange", label: "Date range" },
];

export default function PurchaseOrdersPage() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeLoadMode, setActiveLoadMode] = usePersistentState("draft:purchaseOrders:activeLoadMode", "status");
  const [resultLabel, setResultLabel] = useState("No purchase order query has been run yet.");
  const [filters, setFilters] = usePersistentState("draft:purchaseOrders:filters", {
    id: "",
    status: "APPROVED",
    supplierId: "",
    warehouseId: "",
    start: "",
    end: "",
  });
  const [orderForm, setOrderForm, clearOrderForm] = usePersistentState("draft:purchaseOrders:createForm", orderInitial);
  const [editForm, setEditForm, clearEditForm] = usePersistentState("draft:purchaseOrders:editForm", editInitial);
  const [receiveForm, setReceiveForm, clearReceiveForm] = usePersistentState("draft:purchaseOrders:receiveForm", receiveInitial);
  const [view, setView] = useState("list"); // "list" or "receive" or "create"
  const { message, error, setNotice } = useNotice();

  const canCreate = user?.role === "OFFICER";
  const canApprove = ["OFFICER", "MANAGER"].includes(user?.role);
  const canReceive = user?.role?.toUpperCase() === "STAFF";
  const canBrowse = ["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(user?.role?.toUpperCase());
  const currentLoadMode = activeLoadMode || "status";

  // Auto-load orders on mount using the current default mode (usually Status = APPROVED)
  useEffect(() => {
    if (canBrowse) {
      handleLoadOrders(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runLoader(promiseFactory, successMessage = "Purchase orders loaded.", mode = "", label = "", showNotice = true) {
    if (showNotice) setNotice();

    try {
      const response = await promiseFactory();
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
      setOrders(rows);
      setActiveLoadMode(mode);
      setResultLabel(label ? `${label} (${rows.length} result${rows.length === 1 ? "" : "s"})` : `${rows.length} result${rows.length === 1 ? "" : "s"} loaded.`);
      if (showNotice) setNotice(successMessage);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  function updateItem(index, key, value) {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function updateReceiveItem(index, key, value) {
    setReceiveForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function requirePositiveInteger(value, label) {
    if (!isPositiveInteger(value)) {
      setNotice("", `Enter a valid numeric ${label}.`);
      return false;
    }

    return true;
  }

  function handleLoadOrders(showNotice = true) {
    switch (currentLoadMode) {
      case "id":
        if (!requirePositiveInteger(filters.id, "purchase order ID")) {
          return;
        }

        runLoader(
          () => axios.get(API_ROUTES.purchaseOrders.byId(filters.id), { headers: { Authorization: `Bearer ${token}` } }),
          "Purchase order loaded.",
          "id",
          `Purchase order #${filters.id}`,
          showNotice
        );
        return;
      case "status":
        runLoader(
          () => axios.get(API_ROUTES.purchaseOrders.byStatus(filters.status), { headers: { Authorization: `Bearer ${token}` } }),
          "Purchase orders filtered by status.",
          "status",
          `Status: ${filters.status}`,
          showNotice
        );
        return;
      case "supplier":
        if (!requirePositiveInteger(filters.supplierId, "supplier ID")) {
          return;
        }

        runLoader(
          () => axios.get(API_ROUTES.purchaseOrders.bySupplier(filters.supplierId), { headers: { Authorization: `Bearer ${token}` } }),
          "Purchase orders filtered by supplier.",
          "supplier",
          `Supplier ID: ${filters.supplierId}`,
          showNotice
        );
        return;
      case "warehouse":
        if (!requirePositiveInteger(filters.warehouseId, "warehouse ID")) {
          return;
        }

        runLoader(
          () => axios.get(API_ROUTES.purchaseOrders.byWarehouse(filters.warehouseId), { headers: { Authorization: `Bearer ${token}` } }),
          "Purchase orders filtered by warehouse.",
          "warehouse",
          `Warehouse ID: ${filters.warehouseId}`,
          showNotice
        );
        return;
      case "dateRange":
        if (!filters.start || !filters.end) {
          if (showNotice) setNotice("", "Select both start and end dates before running a date range search.");
          return;
        }

        runLoader(
          () => axios.get(API_ROUTES.purchaseOrders.byDateRange(filters.start, filters.end), { headers: { Authorization: `Bearer ${token}` } }),
          "Purchase orders filtered by date range.",
          "dateRange",
          `Date range: ${filters.start} to ${filters.end}`,
          showNotice
        );
        return;
      default:
        setNotice("", "Choose how you want to load purchase orders.");
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setNotice();

    try {
      if (!requirePositiveInteger(orderForm.supplierId, "supplier ID")) {
        return;
      }

      if (!requirePositiveInteger(orderForm.warehouseId, "warehouse ID")) {
        return;
      }

      if (orderForm.items.some((item) => !isGuid(item.productId))) {
        setNotice("", "Each line item needs a valid product ID in GUID format.");
        return;
      }

      await axios.post(API_ROUTES.purchaseOrders.create, {
        supplierId: Number(orderForm.supplierId),
        warehouseId: Number(orderForm.warehouseId),
        expectedDate: orderForm.expectedDate || null,
        notes: orderForm.notes,
        referenceNumber: orderForm.referenceNumber,
        items: orderForm.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setNotice("Purchase order created.");
      clearOrderForm();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    setNotice();

    try {
      if (!requirePositiveInteger(editForm.poId, "purchase order ID")) {
        return;
      }

      if (!requirePositiveInteger(editForm.supplierId, "supplier ID")) {
        return;
      }

      if (!requirePositiveInteger(editForm.warehouseId, "warehouse ID")) {
        return;
      }

      await axios.put(API_ROUTES.purchaseOrders.update(editForm.poId), {
        supplierId: Number(editForm.supplierId),
        warehouseId: Number(editForm.warehouseId),
        expectedDate: editForm.expectedDate || null,
        notes: editForm.notes,
        referenceNumber: editForm.referenceNumber,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setNotice("Purchase order updated.");
      clearEditForm();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleApprove(poId) {
    setNotice();

    try {
      await axios.put(API_ROUTES.purchaseOrders.approve(poId), {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotice("Purchase order approved.");
      handleLoadOrders(false);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleSubmitForApproval(poId) {
    setNotice();

    try {
      await axios.put(API_ROUTES.purchaseOrders.submit(poId), {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotice("Purchase order submitted for approval.");
      handleLoadOrders(false);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleCancel(poId) {
    setNotice();

    try {
      await axios.put(API_ROUTES.purchaseOrders.cancel(poId), {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotice("Purchase order cancelled.");
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleReceive(event) {
    event.preventDefault();
    setNotice();

    try {
      if (!requirePositiveInteger(receiveForm.poId, "purchase order ID")) {
        return;
      }

      if (receiveForm.items.some((item) => !isPositiveInteger(item.lineItemId))) {
        setNotice("", "Each receipt line needs a valid numeric line item ID.");
        return;
      }

      await axios.post(API_ROUTES.purchaseOrders.receive(receiveForm.poId), {
        items: receiveForm.items.map((item) => ({
          lineItemId: Number(item.lineItemId),
          receivedQty: Number(item.receivedQty),
        })),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setNotice("Goods receipt recorded.");
      clearReceiveForm();
      setView("list");
      handleLoadOrders(false);
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  function loadIntoEdit(order) {
    setEditForm({
      poId: getValue(order, "poId", "PoId"),
      supplierId: getValue(order, "supplierId", "SupplierId"),
      warehouseId: getValue(order, "warehouseId", "WarehouseId"),
      expectedDate: getValue(order, "expectedDate", "ExpectedDate")?.slice?.(0, 10) || "",
      notes: getValue(order, "notes", "Notes") || "",
      referenceNumber: getValue(order, "referenceNumber", "ReferenceNumber") || "",
    });
  }

  function loadIntoReceive(order) {
    const poId = getValue(order, "poId", "PoId");
    const items = safeArray(getValue(order, "items", "Items")).map((item) => {
      const lineItemId = getValue(item, "lineItemId", "LineItemId");
      const productId = getValue(item, "productId", "ProductId");
      const quantity = getValue(item, "quantity", "Quantity");
      const receivedQty = getValue(item, "receivedQty", "ReceivedQty") || 0;
      
      return { 
        lineItemId, 
        productId, 
        quantity, 
        previouslyReceived: receivedQty, 
        receivedQty: Math.max(0, quantity - receivedQty)
      };
    });
    
    setReceiveForm({
      poId,
      items
    });
    setView("receive");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Purchase"
        title={view === "receive" ? "Receive Goods" : "Purchase orders"}
        description={view === "receive" ? `PO #${receiveForm.poId} Receipt` : "Manage and track your purchase orders."}
      />

      <FloatingNotice error={error} message={message} />

      {view === "list" && canBrowse ? (
        <>
          <section className="panel-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Load Orders</p>
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink-600">
              <span className="font-semibold text-ink-900">Current view:</span> {resultLabel}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select value={currentLoadMode} onChange={(event) => setActiveLoadMode(event.target.value)}>
                {ORDER_LOAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {currentLoadMode === "id" ? (
                <input
                  placeholder="PO ID"
                  value={filters.id}
                  onChange={(event) => setFilters((current) => ({ ...current, id: event.target.value }))}
                />
              ) : null}

              {currentLoadMode === "status" ? (
                <input
                  placeholder="Status"
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                />
              ) : null}

              {currentLoadMode === "supplier" ? (
                <input
                  placeholder="Supplier ID"
                  value={filters.supplierId}
                  onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))}
                />
              ) : null}

              {currentLoadMode === "warehouse" ? (
                <input
                  placeholder="Warehouse ID"
                  value={filters.warehouseId}
                  onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
                />
              ) : null}

              {currentLoadMode === "dateRange" ? (
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
              <button className="primary-btn" onClick={handleLoadOrders} type="button">
                Load orders
              </button>
            </div>
          </section>

          <section className="panel-soft p-6">
            <DataTable
              columns={[
                {
                  label: "PO",
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-ink-900">PO #{getValue(row, "poId", "PoId")}</p>
                      <p className="text-xs text-ink-500">{getValue(row, "status", "Status")}</p>
                    </div>
                  ),
                },
                { label: "Supplier", render: (row) => getValue(row, "supplierId", "SupplierId") },
                { label: "Warehouse", render: (row) => getValue(row, "warehouseId", "WarehouseId") },
                { label: "Total", render: (row) => formatCurrency(getValue(row, "totalAmount", "TotalAmount")) },
                { label: "Expected", render: (row) => formatDate(getValue(row, "expectedDate", "ExpectedDate")) },
                {
                  label: "Items",
                  render: (row) => (
                    <div className="space-y-1 text-xs text-ink-500">
                      {safeArray(getValue(row, "items", "Items")).map((item) => (
                        <p key={getValue(item, "lineItemId", "LineItemId") || getValue(item, "productId", "ProductId")}>
                          {getValue(item, "productId", "ProductId")} &bull; {getValue(item, "receivedQty", "ReceivedQty") || 0} / {getValue(item, "quantity", "Quantity")}
                        </p>
                      ))}
                    </div>
                  ),
                },
                {
                  label: "Actions",
                  render: (row) => {
                    const status = getValue(row, "status", "Status");
                    const poId = getValue(row, "poId", "PoId");
                    
                    return (
                      <div className="flex flex-wrap gap-2">
                        {canCreate && status === "DRAFT" ? (
                          <>
                            <button className="secondary-btn px-4 py-2" onClick={() => loadIntoEdit(row)} type="button">
                              Edit
                            </button>
                            <button
                              className="primary-btn px-4 py-2"
                              onClick={() => handleSubmitForApproval(poId)}
                              type="button"
                            >
                              Submit
                            </button>
                          </>
                        ) : null}
                        
                        {canCreate && status !== "RECEIVED" && status !== "CANCELLED" ? (
                          <button
                            className="danger-btn px-4 py-2"
                            onClick={() => handleCancel(poId)}
                            type="button"
                          >
                            Cancel
                          </button>
                        ) : null}

                        {canApprove && status === "PENDING" ? (
                          <button
                            className="primary-btn px-4 py-2"
                            onClick={() => handleApprove(poId)}
                            type="button"
                          >
                            Approve
                          </button>
                        ) : null}

                        {canReceive && (status?.toUpperCase() === "APPROVED" || status?.toUpperCase() === "PARTIALLY_RECEIVED") ? (
                          <button
                            className="secondary-btn px-4 py-2"
                            onClick={() => loadIntoReceive(row)}
                            type="button"
                          >
                            Receive
                          </button>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
              rows={orders}
            />
          </section>
        </>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {canCreate ? (
          <form className="panel-soft p-6" onSubmit={handleCreate}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Create PO</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-ink-700">
                Supplier ID
                <input
                  className="mt-1 w-full"
                  placeholder="e.g. 1"
                  required
                  type="number"
                  value={orderForm.supplierId}
                  onChange={(event) => setOrderForm((current) => ({ ...current, supplierId: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Warehouse ID
                <input
                  className="mt-1 w-full"
                  placeholder="e.g. 2"
                  required
                  type="number"
                  value={orderForm.warehouseId}
                  onChange={(event) => setOrderForm((current) => ({ ...current, warehouseId: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Expected Delivery Date
                <input
                  className="mt-1 w-full"
                  type="date"
                  value={orderForm.expectedDate}
                  onChange={(event) => setOrderForm((current) => ({ ...current, expectedDate: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Reference Number
                <input
                  className="mt-1 w-full"
                  placeholder="e.g. PO-2023-01"
                  value={orderForm.referenceNumber}
                  onChange={(event) =>
                    setOrderForm((current) => ({ ...current, referenceNumber: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium text-ink-700 md:col-span-2">
                Notes
                <textarea
                  className="mt-1 w-full"
                  placeholder="Additional instructions..."
                rows={3}
                  value={orderForm.notes}
                  onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {orderForm.items.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="grid gap-3 rounded-3xl border border-ink-100 p-4 md:grid-cols-3">
                  <label className="block text-sm font-medium text-ink-700">
                    Product ID (GUID)
                    <input
                      className="mt-1 w-full"
                      placeholder="Product GUID"
                      required
                      value={item.productId}
                      onChange={(event) => updateItem(index, "productId", event.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink-700">
                    Quantity
                    <input
                      className="mt-1 w-full"
                      placeholder="Quantity"
                      required
                      type="number"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, "quantity", Number(event.target.value))}
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink-700">
                    Unit Cost
                    <input
                      className="mt-1 w-full"
                      placeholder="Unit cost"
                      required
                      type="number"
                      value={item.unitCost}
                      onChange={(event) => updateItem(index, "unitCost", Number(event.target.value))}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="secondary-btn"
                onClick={() =>
                  setOrderForm((current) => ({
                    ...current,
                    items: [...current.items, { productId: "", quantity: 1, unitCost: 0 }],
                  }))
                }
                type="button"
              >
                Add line item
              </button>
              <button className="primary-btn" type="submit">
                Create purchase order
              </button>
            </div>
          </form>
        ) : null}

        {canCreate ? (
          <form className="panel-soft p-6" onSubmit={handleUpdate}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Update PO</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                placeholder="PO ID"
                required
                type="number"
                value={editForm.poId}
                onChange={(event) => setEditForm((current) => ({ ...current, poId: event.target.value }))}
              />
              <input
                placeholder="Supplier ID"
                required
                type="number"
                value={editForm.supplierId}
                onChange={(event) => setEditForm((current) => ({ ...current, supplierId: event.target.value }))}
              />
              <input
                placeholder="Warehouse ID"
                required
                type="number"
                value={editForm.warehouseId}
                onChange={(event) => setEditForm((current) => ({ ...current, warehouseId: event.target.value }))}
              />
              <input
                type="date"
                value={editForm.expectedDate}
                onChange={(event) => setEditForm((current) => ({ ...current, expectedDate: event.target.value }))}
              />
              <input
                className="md:col-span-2"
                placeholder="Reference number"
                value={editForm.referenceNumber}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, referenceNumber: event.target.value }))
                }
              />
              <textarea
                className="md:col-span-2"
                placeholder="Notes"
                rows={3}
                value={editForm.notes}
                onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <button className="primary-btn mt-5" type="submit">
              Save update
            </button>
          </form>
        ) : null}

        {view === "receive" && canReceive ? (
          <div className="max-w-4xl mx-auto w-full px-4 mb-20">
            <div className="panel-soft p-10">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-ink-100">
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-ink-950">PO #{receiveForm.poId}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mt-1">Recording Goods Receipt</p>
                </div>
                <button 
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-400 hover:text-coral transition-colors" 
                  onClick={() => { clearReceiveForm(); setView("list"); }}
                  type="button"
                >
                  &larr; Cancel
                </button>
              </div>

              <form onSubmit={handleReceive}>
                <div className="space-y-4">
                  {receiveForm.items.map((item, index) => (
                    <div key={`${item.lineItemId}-${index}`} className="flex flex-col gap-6 p-6 rounded-3xl bg-ink-50/30 border border-ink-100 md:flex-row md:items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-ink-900 truncate">
                          {item.productId}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          <p>Ordered: <span className="text-ink-900">{item.quantity}</span></p>
                          <p>Received: <span className="text-ink-900">{item.previouslyReceived}</span></p>
                          <p>Remaining: <span className="text-coral">{item.quantity - item.previouslyReceived}</span></p>
                        </div>
                      </div>
                      <div className="w-full md:w-32 shrink-0">
                        <input
                          className="w-full text-center text-xl font-black py-3 px-4 rounded-xl bg-white border-2 border-ink-100 focus:border-coral focus:ring-0 transition-all"
                          placeholder="0"
                          required
                          type="number"
                          value={item.receivedQty}
                          onChange={(event) => updateReceiveItem(index, "receivedQty", Number(event.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex justify-center">
                  <button className="primary-btn px-12 py-4 text-base shadow-xl active:scale-95" type="submit">
                    Confirm Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
