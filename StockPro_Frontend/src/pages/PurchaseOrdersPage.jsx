import { useEffect, useState, useContext } from "react";
import axios from "axios";

import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { AuthContext } from "../context/AuthContext";
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

const PurchaseOrdersPage = () => {
  const { user, token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [local, setLocal] = usePersistentState("draft:purchaseOrders:local", {
    activeLoadMode: "status",
    resultLabel: "No purchase order query has been run yet.",
  });
  const [filters, setFilters] = usePersistentState("draft:purchaseOrders:filters", {
    id: "",
    status: "APPROVED",
    supplierId: "",
    warehouseId: "",
    start: "",
    end: "",
  });
  const [orderForm, setOrderForm, clearOrderForm] = usePersistentState(
    "draft:purchaseOrders:createForm",
    orderInitial
  );
  const [editForm, setEditForm, clearEditForm] = usePersistentState(
    "draft:purchaseOrders:editForm",
    editInitial
  );
  const [receiveForm, setReceiveForm, clearReceiveForm] = usePersistentState(
    "draft:purchaseOrders:receiveForm",
    receiveInitial
  );
  const [view, setView] = useState("list"); // "list" or "receive" or "create"

  const canCreate = user?.role === "OFFICER";
  const canApprove = ["OFFICER", "MANAGER"].includes(user?.role);
  const canReceive = user?.role?.toUpperCase() === "STAFF";
  const canBrowse = ["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(user?.role?.toUpperCase());
  const currentLoadMode = local.activeLoadMode || "status";

  useEffect(() => {
    if (canBrowse) {
      handleLoadOrders(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e, setter) => {
    const { type } = e.target;
    const finalValue = type === "number" ? Number(e.target.value) : e.target.value;
    setter((current) => ({ ...current, [e.target.name]: finalValue }));
  };

  const runLoader = async (
    promiseFactory,
    successMessage = "Purchase orders loaded.",
    mode = "",
    label = "",
    showNotice = true
  ) => {
    try {
      const response = await promiseFactory();
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
      setOrders(rows);
      setLocal((c) => ({
        ...c,
        activeLoadMode: mode,
        resultLabel: label
          ? `${label} (${rows.length} result${rows.length === 1 ? "" : "s"})`
          : `${rows.length} result${rows.length === 1 ? "" : "s"} loaded.`,
      }));
      if (showNotice) toast.success(successMessage);
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const updateItem = (index, key, value) => {
    setOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const updateReceiveItem = (index, key, value) => {
    setReceiveForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const requirePositiveInteger = (value, label) => {
    if (!isPositiveInteger(value)) {
      toast.error(`Enter a valid numeric ${label}.`);
      return false;
    }
    return true;
  };

  const handleLoadOrders = (showNotice = true) => {
    switch (currentLoadMode) {
      case "id":
        if (!requirePositiveInteger(filters.id, "purchase order ID")) {
          return;
        }

        runLoader(
          () =>
            axios.get(API_ROUTES.purchaseOrders.byId(filters.id), {
              headers: { Authorization: `Bearer ${token}` },
            }),
          "Purchase order loaded.",
          "id",
          `Purchase order #${filters.id}`,
          showNotice
        );
        return;
      case "status":
        runLoader(
          () =>
            axios.get(API_ROUTES.purchaseOrders.byStatus(filters.status), {
              headers: { Authorization: `Bearer ${token}` },
            }),
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
          () =>
            axios.get(API_ROUTES.purchaseOrders.bySupplier(filters.supplierId), {
              headers: { Authorization: `Bearer ${token}` },
            }),
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
          () =>
            axios.get(API_ROUTES.purchaseOrders.byWarehouse(filters.warehouseId), {
              headers: { Authorization: `Bearer ${token}` },
            }),
          "Purchase orders filtered by warehouse.",
          "warehouse",
          `Warehouse ID: ${filters.warehouseId}`,
          showNotice
        );
        return;
      case "dateRange":
        if (!filters.start || !filters.end) {
          if (showNotice)
            toast.error("Select both start and end dates before running a date range search.");
          return;
        }

        runLoader(
          () =>
            axios.get(API_ROUTES.purchaseOrders.byDateRange(filters.start, filters.end), {
              headers: { Authorization: `Bearer ${token}` },
            }),
          "Purchase orders filtered by date range.",
          "dateRange",
          `Date range: ${filters.start} to ${filters.end}`,
          showNotice
        );
        return;
      default:
        toast.error("Choose how you want to load purchase orders.");
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    try {
      if (!requirePositiveInteger(orderForm.supplierId, "supplier ID")) {
        return;
      }

      if (!requirePositiveInteger(orderForm.warehouseId, "warehouse ID")) {
        return;
      }

      if (orderForm.items.some((item) => !isGuid(item.productId))) {
        toast.error("Each line item needs a valid product ID in GUID format.");
        return;
      }

      await axios.post(
        API_ROUTES.purchaseOrders.create,
        {
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Purchase order created.");
      clearOrderForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

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

      await axios.put(
        API_ROUTES.purchaseOrders.update(editForm.poId),
        {
          supplierId: Number(editForm.supplierId),
          warehouseId: Number(editForm.warehouseId),
          expectedDate: editForm.expectedDate || null,
          notes: editForm.notes,
          referenceNumber: editForm.referenceNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Purchase order updated.");
      clearEditForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleApprove = async (poId) => {
    try {
      await axios.put(
        API_ROUTES.purchaseOrders.approve(poId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Purchase order approved.");
      handleLoadOrders(false);
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleSubmitForApproval = async (poId) => {
    try {
      await axios.put(
        API_ROUTES.purchaseOrders.submit(poId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Purchase order submitted for approval.");
      handleLoadOrders(false);
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleCancel = async (poId) => {
    try {
      await axios.put(
        API_ROUTES.purchaseOrders.cancel(poId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Purchase order cancelled.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleReceive = async (event) => {
    event.preventDefault();

    try {
      if (!requirePositiveInteger(receiveForm.poId, "purchase order ID")) {
        return;
      }

      if (receiveForm.items.some((item) => !isPositiveInteger(item.lineItemId))) {
        toast.error("Each receipt line needs a valid numeric line item ID.");
        return;
      }

      await axios.post(
        API_ROUTES.purchaseOrders.receive(receiveForm.poId),
        {
          items: receiveForm.items.map((item) => ({
            lineItemId: Number(item.lineItemId),
            receivedQty: Number(item.receivedQty),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Goods receipt recorded.");
      clearReceiveForm();
      setView("list");
      handleLoadOrders(false);
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const loadIntoEdit = (order) => {
    setEditForm({
      poId: getValue(order, "poId", "PoId"),
      supplierId: getValue(order, "supplierId", "SupplierId"),
      warehouseId: getValue(order, "warehouseId", "WarehouseId"),
      expectedDate: getValue(order, "expectedDate", "ExpectedDate")?.slice?.(0, 10) || "",
      notes: getValue(order, "notes", "Notes") || "",
      referenceNumber: getValue(order, "referenceNumber", "ReferenceNumber") || "",
    });
  };

  const loadIntoReceive = (order) => {
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
        receivedQty: Math.max(0, quantity - receivedQty),
      };
    });

    setReceiveForm({
      poId,
      items,
    });
    setView("receive");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Purchase"
        title={view === "receive" ? "Receive Goods" : "Purchase orders"}
        description={
          view === "receive"
            ? `PO #${receiveForm.poId} Receipt`
            : "Manage and track your purchase orders."
        }
      />

      {view === "list" && canBrowse ? (
        <>
          <section className="panel-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Load Orders
            </p>
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink-600">
              <span className="font-semibold text-ink-900">Current view:</span> {local.resultLabel}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                name="activeLoadMode"
                value={currentLoadMode}
                onChange={(e) => handleChange(e, setLocal)}
              >
                {ORDER_LOAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {currentLoadMode === "id" ? (
                <input
                  name="id"
                  placeholder="PO ID"
                  value={filters.id}
                  onChange={(e) => handleChange(e, setFilters)}
                />
              ) : null}

              {currentLoadMode === "status" ? (
                <input
                  name="status"
                  placeholder="Status"
                  value={filters.status}
                  onChange={(e) => handleChange(e, setFilters)}
                />
              ) : null}

              {currentLoadMode === "supplier" ? (
                <input
                  name="supplierId"
                  placeholder="Supplier ID"
                  value={filters.supplierId}
                  onChange={(e) => handleChange(e, setFilters)}
                />
              ) : null}

              {currentLoadMode === "warehouse" ? (
                <input
                  name="warehouseId"
                  placeholder="Warehouse ID"
                  value={filters.warehouseId}
                  onChange={(e) => handleChange(e, setFilters)}
                />
              ) : null}

              {currentLoadMode === "dateRange" ? (
                <>
                  <input
                    name="start"
                    type="date"
                    value={filters.start}
                    onChange={(e) => handleChange(e, setFilters)}
                  />
                  <input
                    name="end"
                    type="date"
                    value={filters.end}
                    onChange={(e) => handleChange(e, setFilters)}
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
                {
                  label: "Total",
                  render: (row) => formatCurrency(getValue(row, "totalAmount", "TotalAmount")),
                },
                {
                  label: "Expected",
                  render: (row) => formatDate(getValue(row, "expectedDate", "ExpectedDate")),
                },
                {
                  label: "Items",
                  render: (row) => (
                    <div className="space-y-1 text-xs text-ink-500">
                      {safeArray(getValue(row, "items", "Items")).map((item) => (
                        <p
                          key={
                            getValue(item, "lineItemId", "LineItemId") ||
                            getValue(item, "productId", "ProductId")
                          }
                        >
                          {getValue(item, "productId", "ProductId")} &bull;{" "}
                          {getValue(item, "receivedQty", "ReceivedQty") || 0} /{" "}
                          {getValue(item, "quantity", "Quantity")}
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
                            <button
                              className="secondary-btn px-4 py-2"
                              onClick={() => loadIntoEdit(row)}
                              type="button"
                            >
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

                        {canReceive &&
                        (status?.toUpperCase() === "APPROVED" ||
                          status?.toUpperCase() === "PARTIALLY_RECEIVED") ? (
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
                  name="supplierId"
                  className="mt-1 w-full"
                  placeholder="e.g. 1"
                  required
                  type="number"
                  value={orderForm.supplierId}
                  onChange={(e) => handleChange(e, setOrderForm)}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Warehouse ID
                <input
                  name="warehouseId"
                  className="mt-1 w-full"
                  placeholder="e.g. 2"
                  required
                  type="number"
                  value={orderForm.warehouseId}
                  onChange={(e) => handleChange(e, setOrderForm)}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Expected Delivery Date
                <input
                  name="expectedDate"
                  className="mt-1 w-full"
                  type="date"
                  value={orderForm.expectedDate}
                  onChange={(e) => handleChange(e, setOrderForm)}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700">
                Reference Number
                <input
                  name="referenceNumber"
                  className="mt-1 w-full"
                  placeholder="e.g. PO-2023-01"
                  value={orderForm.referenceNumber}
                  onChange={(e) => handleChange(e, setOrderForm)}
                />
              </label>
              <label className="block text-sm font-medium text-ink-700 md:col-span-2">
                Notes
                <textarea
                  name="notes"
                  className="mt-1 w-full"
                  placeholder="Additional instructions..."
                  rows={3}
                  value={orderForm.notes}
                  onChange={(e) => handleChange(e, setOrderForm)}
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {orderForm.items.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="grid gap-3 rounded-3xl border border-ink-100 p-4 md:grid-cols-3"
                >
                  <label className="block text-sm font-medium text-ink-700">
                    Product ID (GUID)
                    <input
                      className="mt-1 w-full"
                      placeholder="Product GUID"
                      required
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
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
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
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
                      onChange={(e) => updateItem(index, "unitCost", Number(e.target.value))}
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
                name="poId"
                placeholder="PO ID"
                required
                type="number"
                value={editForm.poId}
                onChange={(e) => handleChange(e, setEditForm)}
              />
              <input
                name="supplierId"
                placeholder="Supplier ID"
                required
                type="number"
                value={editForm.supplierId}
                onChange={(e) => handleChange(e, setEditForm)}
              />
              <input
                name="warehouseId"
                placeholder="Warehouse ID"
                required
                type="number"
                value={editForm.warehouseId}
                onChange={(e) => handleChange(e, setEditForm)}
              />
              <input
                name="expectedDate"
                type="date"
                value={editForm.expectedDate}
                onChange={(e) => handleChange(e, setEditForm)}
              />
              <input
                name="referenceNumber"
                className="md:col-span-2"
                placeholder="Reference number"
                value={editForm.referenceNumber}
                onChange={(e) => handleChange(e, setEditForm)}
              />
              <textarea
                name="notes"
                className="md:col-span-2"
                placeholder="Notes"
                rows={3}
                value={editForm.notes}
                onChange={(e) => handleChange(e, setEditForm)}
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
                  <h3 className="text-3xl font-black tracking-tight text-ink-950">
                    PO #{receiveForm.poId}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mt-1">
                    Recording Goods Receipt
                  </p>
                </div>
                <button
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-400 hover:text-coral transition-colors"
                  onClick={() => {
                    clearReceiveForm();
                    setView("list");
                  }}
                  type="button"
                >
                  &larr; Cancel
                </button>
              </div>

              <form onSubmit={handleReceive}>
                <div className="space-y-4">
                  {receiveForm.items.map((item, index) => (
                    <div
                      key={`${item.lineItemId}-${index}`}
                      className="flex flex-col gap-6 p-6 rounded-3xl bg-ink-50/30 border border-ink-100 md:flex-row md:items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-ink-900 truncate">{item.productId}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          <p>
                            Ordered: <span className="text-ink-900">{item.quantity}</span>
                          </p>
                          <p>
                            Received: <span className="text-ink-900">{item.previouslyReceived}</span>
                          </p>
                          <p>
                            Remaining:{" "}
                            <span className="text-coral">
                              {item.quantity - item.previouslyReceived}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="w-full md:w-32 shrink-0">
                        <input
                          className="w-full text-center text-xl font-black py-3 px-4 rounded-xl bg-white border-2 border-ink-100 focus:border-coral focus:ring-0 transition-all"
                          placeholder="0"
                          required
                          type="number"
                          value={item.receivedQty}
                          onChange={(e) => updateReceiveItem(index, "receivedQty", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex justify-center">
                  <button
                    className="primary-btn px-12 py-4 text-base shadow-xl active:scale-95"
                    type="submit"
                  >
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
};

export default PurchaseOrdersPage;
