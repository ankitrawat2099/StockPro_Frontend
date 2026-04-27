import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useNotice } from "../hooks/useNotice";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { extractApiMessage, formatCurrency, getValue, isGuid, safeArray } from "../lib/utils";

const initialForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  unitOfMeasure: "",
  costPrice: 0,
  sellingPrice: 0,
  reorderLevel: 0,
  maxStockLevel: 0,
  leadTimeDays: 0,
  imageUrl: "",
  isActive: true,
  barcode: "",
};

export default function ProductsPage() {
  const { user, token } = useAuth();
  const canManage = user?.role === "MANAGER";
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [form, setForm, clearForm] = usePersistentState("draft:products:form", initialForm);
  const [editingId, setEditingId, clearEditingId] = usePersistentState("draft:products:editingId", "");
  const [lookupMode, setLookupMode] = usePersistentState("draft:products:lookupMode", "name");
  const [lookupValue, setLookupValue] = usePersistentState("draft:products:lookupValue", "");
  const { message, error, setNotice } = useNotice();

  async function loadProducts() {
    try {
      const response = await axios.get(API_ROUTES.products.root, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(safeArray(response.data));
      return true;
    } catch (loadError) {
      setNotice("", extractApiMessage(loadError));
      return false;
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleLookup() {
    setNotice();

    try {
      if (!lookupValue.trim()) {
        await loadProducts();
        return;
      }

      if (lookupMode === "id" && !isGuid(lookupValue)) {
        setNotice("", "Enter a valid product ID in GUID format.");
        return;
      }

      const value = lookupValue.trim();
      let path = API_ROUTES.products.search(value);

      if (lookupMode === "id") {
        path = API_ROUTES.products.byId(value);
      } else if (lookupMode === "sku") {
        path = API_ROUTES.products.bySku(value);
      } else if (lookupMode === "category") {
        path = API_ROUTES.products.byCategory(value);
      } else if (lookupMode === "brand") {
        path = API_ROUTES.products.byBrand(value);
      } else if (lookupMode === "barcode") {
        path = API_ROUTES.products.byBarcode(value);
      }

      const response = await axios.get(path, { headers: { Authorization: `Bearer ${token}` } });
      const payload = response.data;
      setProducts(Array.isArray(payload) ? payload : payload ? [payload] : []);
      setNotice("Product results loaded.");
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleLowStock() {
    setNotice();

    try {
      const response = await axios.get(API_ROUTES.products.lowStock, { headers: { Authorization: `Bearer ${token}` } });
      setLowStock(safeArray(response.data));
      setNotice("Low-stock products loaded.");
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice();

    try {
      if (editingId) {
        await axios.put(API_ROUTES.products.byId(editingId), form, { headers: { Authorization: `Bearer ${token}` } });
        setNotice("Product updated.");
      } else {
        await axios.post(API_ROUTES.products.root, form, { headers: { Authorization: `Bearer ${token}` } });
        setNotice("Product created.");
      }

      clearForm();
      clearEditingId();
      await loadProducts();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  function handleEdit(product) {
    setEditingId(getValue(product, "productId", "ProductId"));
    setForm({
      sku: getValue(product, "sku", "Sku"),
      name: getValue(product, "name", "Name"),
      description: getValue(product, "description", "Description"),
      category: getValue(product, "category", "Category"),
      brand: getValue(product, "brand", "Brand"),
      unitOfMeasure: getValue(product, "unitOfMeasure", "UnitOfMeasure"),
      costPrice: getValue(product, "costPrice", "CostPrice") || 0,
      sellingPrice: getValue(product, "sellingPrice", "SellingPrice") || 0,
      reorderLevel: getValue(product, "reorderLevel", "ReorderLevel") || 0,
      maxStockLevel: getValue(product, "maxStockLevel", "MaxStockLevel") || 0,
      leadTimeDays: getValue(product, "leadTimeDays", "LeadTimeDays") || 0,
      imageUrl: getValue(product, "imageUrl", "ImageUrl"),
      isActive: getValue(product, "isActive", "IsActive"),
      barcode: getValue(product, "barcode", "Barcode"),
    });
  }

  async function handleDeactivate(productId) {
    setNotice();

    try {
      await axios.put(API_ROUTES.products.deactivate(productId), null, { headers: { Authorization: `Bearer ${token}` } });
      setNotice("Product deactivated.");
      await loadProducts();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleDelete(productId) {
    setNotice();

    try {
      await axios.delete(API_ROUTES.products.remove(productId), { headers: { Authorization: `Bearer ${token}` } });
      setNotice("Product deleted.");
      if (editingId === productId) {
        clearEditingId();
        clearForm();
      }
      await loadProducts();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleRefresh() {
    setNotice();

    try {
      const loaded = await loadProducts();
      if (loaded) {
        setNotice("Products refreshed.");
      }
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  const columns = [
    {
      label: "Product",
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{getValue(row, "name", "Name")}</p>
          <p className="text-xs text-ink-500">
            SKU: {getValue(row, "sku", "Sku")} | Category: {getValue(row, "category", "Category") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Brand: {getValue(row, "brand", "Brand") || "-"} | Unit: {getValue(row, "unitOfMeasure", "UnitOfMeasure") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Barcode: {getValue(row, "barcode", "Barcode") || "-"} | Cost: {formatCurrency(getValue(row, "costPrice", "CostPrice"))}
          </p>
          <p className="mt-2 text-xs text-ink-600">{getValue(row, "description", "Description") || "No description added."}</p>
          <p className="mt-2 break-all font-mono text-[11px] text-ink-500">
            ID: {getValue(row, "productId", "ProductId")}
          </p>
        </div>
      ),
    },
    { label: "Sell Price", render: (row) => formatCurrency(getValue(row, "sellingPrice", "SellingPrice")) },
    {
      label: "Stock Rules",
      render: (row) => (
        <div className="text-xs text-ink-600">
          <p>Reorder: {getValue(row, "reorderLevel", "ReorderLevel") || 0}</p>
          <p>Max: {getValue(row, "maxStockLevel", "MaxStockLevel") || 0}</p>
          <p>Lead Time: {getValue(row, "leadTimeDays", "LeadTimeDays") || 0} days</p>
        </div>
      ),
    },
    {
      label: "Status",
      render: (row) => (
        <span
          className={`tag ${
            getValue(row, "isActive", "IsActive") ? "bg-mint/30 text-ink-950" : "bg-coral/10 text-coral"
          }`}
        >
          {getValue(row, "isActive", "IsActive") ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  if (canManage) {
    columns.push({
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button className="secondary-btn px-4 py-2" onClick={() => handleEdit(row)} type="button">
            Edit
          </button>
          <button
            className="danger-btn px-4 py-2"
            onClick={() => handleDeactivate(getValue(row, "productId", "ProductId"))}
            type="button"
          >
            Deactivate
          </button>
          <button
            className="secondary-btn border-coral/40 px-4 py-2 text-coral hover:border-coral hover:bg-coral/10"
            onClick={() => handleDelete(getValue(row, "productId", "ProductId"))}
            type="button"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Managers can create and maintain products, while all internal roles can browse and search the catalogue."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="secondary-btn" onClick={handleLowStock} type="button">
              Load low stock
            </button>
          </div>
        }
      />

      <FloatingNotice error={error} message={message} />

      <section className="panel-soft p-6">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
          <select value={lookupMode} onChange={(event) => setLookupMode(event.target.value)}>
            <option value="name">Search by name</option>
            <option value="id">Lookup by product ID</option>
            <option value="sku">Lookup by SKU</option>
            <option value="category">Filter by category</option>
            <option value="brand">Filter by brand</option>
            <option value="barcode">Lookup by barcode</option>
          </select>
          <input
            placeholder={
              lookupMode === "id"
                ? "Enter product ID"
                : lookupMode === "sku"
                  ? "Enter SKU"
                  : lookupMode === "category"
                    ? "Enter category"
                    : lookupMode === "brand"
                      ? "Enter brand"
                      : lookupMode === "barcode"
                        ? "Enter barcode"
                        : "Search by product name"
            }
            value={lookupValue}
            onChange={(event) => setLookupValue(event.target.value)}
          />
          <button className="primary-btn md:w-40" onClick={handleLookup} type="button">
            Run lookup
          </button>
          <button
            className="secondary-btn md:w-36"
            onClick={() => {
              setLookupMode("name");
              setLookupValue("");
              handleRefresh();
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="panel-soft min-w-0 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Product List</p>
          <div className="mt-5">
            <DataTable columns={columns} rows={products} />
          </div>
        </section>

        <section className="grid min-w-0 content-start gap-4">
          {canManage ? (
            <form className="panel-soft self-start p-6" onSubmit={handleSubmit}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                {editingId ? "Edit Product" : "Create Product"}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">SKU</label>
                  <input
                    required
                    value={form.sku}
                    onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Barcode</label>
                  <input
                    value={form.barcode}
                    onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-ink-700">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-ink-700">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Category</label>
                  <input
                    required
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Unit</label>
                  <input
                    value={form.unitOfMeasure}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, unitOfMeasure: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Cost price</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(event) => setForm((current) => ({ ...current, costPrice: Number(event.target.value) }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Selling price</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sellingPrice: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Reorder level</label>
                  <input
                    type="number"
                    value={form.reorderLevel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, reorderLevel: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Max stock</label>
                  <input
                    type="number"
                    value={form.maxStockLevel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxStockLevel: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Lead time days</label>
                  <input
                    type="number"
                    value={form.leadTimeDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, leadTimeDays: Number(event.target.value) }))
                    }
                  />
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-4 md:col-span-2 md:pt-4">
                  <input
                    checked={form.isActive}
                    className="h-5 w-5 shrink-0"
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                    type="checkbox"
                  />
                  <span className="text-sm text-ink-700">Active product</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="primary-btn" type="submit">
                  {editingId ? "Save changes" : "Create product"}
                </button>
                {editingId ? (
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setEditingId("");
                      clearForm();
                      clearEditingId();
                    }}
                    type="button"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          <section className="panel-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Low Stock Snapshot</p>
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    label: "Product",
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-ink-900">
                          {getValue(row, "name", "Name") || getValue(row, "sku", "Sku")}
                        </p>
                        <p className="mt-1 break-all font-mono text-[11px] text-ink-500">
                          ID: {getValue(row, "productId", "ProductId")}
                        </p>
                      </div>
                    ),
                  },
                  { label: "SKU", render: (row) => getValue(row, "sku", "Sku") || "-" },
                  { label: "Reorder", render: (row) => getValue(row, "reorderLevel", "ReorderLevel") || "-" },
                ]}
                emptyMessage="Use the low stock button to load products under threshold."
                rows={lowStock}
              />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
