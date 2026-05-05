import { useEffect, useState, useContext } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { AuthContext } from "../context/AuthContext";
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

const ProductsPage = () => {
  const { user, token } = useContext(AuthContext);
  const canManage = user?.role === "MANAGER";
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [form, setForm, clearForm] = usePersistentState("draft:products:form", initialForm);
  const [editingId, setEditingId, clearEditingId] = usePersistentState(
    "draft:products:editingId",
    ""
  );
  const [lookup, setLookup] = usePersistentState("draft:products:lookup", {
    mode: "name",
    value: "",
  });

  const loadProducts = async () => {
    try {
      const response = await axios.get(API_ROUTES.products.root, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(safeArray(response.data));
      return true;
    } catch (loadError) {
      toast.error(extractApiMessage(loadError));
      return false;
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (e, setter) => {
    const { type, checked } = e.target;
    const finalValue = type === "checkbox" ? checked : type === "number" ? Number(e.target.value) : e.target.value;
    setter((current) => ({ ...current, [e.target.name]: finalValue }));
  };

  const handleLookup = async () => {
    try {
      if (!lookup.value.trim()) {
        await loadProducts();
        return;
      }

      if (lookup.mode === "id" && !isGuid(lookup.value)) {
        toast.error("Enter a valid product ID in GUID format.");
        return;
      }

      const val = lookup.value.trim();
      let path = API_ROUTES.products.search(val);

      if (lookup.mode === "id") {
        path = API_ROUTES.products.byId(val);
      } else if (lookup.mode === "sku") {
        path = API_ROUTES.products.bySku(val);
      } else if (lookup.mode === "category") {
        path = API_ROUTES.products.byCategory(val);
      } else if (lookup.mode === "brand") {
        path = API_ROUTES.products.byBrand(val);
      } else if (lookup.mode === "barcode") {
        path = API_ROUTES.products.byBarcode(val);
      }

      const response = await axios.get(path, { headers: { Authorization: `Bearer ${token}` } });
      const payload = response.data;
      setProducts(Array.isArray(payload) ? payload : payload ? [payload] : []);
      toast.success("Product results loaded.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleLowStock = async () => {
    try {
      const response = await axios.get(API_ROUTES.products.lowStock, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLowStock(safeArray(response.data));
      toast.success("Low-stock products loaded.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingId) {
        await axios.put(API_ROUTES.products.byId(editingId), form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Product updated.");
      } else {
        await axios.post(API_ROUTES.products.root, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Product created.");
      }

      clearForm();
      clearEditingId();
      await loadProducts();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleEdit = (product) => {
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
  };

  const handleDeactivate = async (productId) => {
    try {
      await axios.put(API_ROUTES.products.deactivate(productId), null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Product deactivated.");
      await loadProducts();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleDelete = async (productId) => {
    try {
      await axios.delete(API_ROUTES.products.remove(productId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Product deleted.");
      if (editingId === productId) {
        clearEditingId();
        clearForm();
      }
      await loadProducts();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleRefresh = async () => {
    try {
      const loaded = await loadProducts();
      if (loaded) {
        toast.success("Products refreshed.");
      }
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

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
            Brand: {getValue(row, "brand", "Brand") || "-"} | Unit:{" "}
            {getValue(row, "unitOfMeasure", "UnitOfMeasure") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Barcode: {getValue(row, "barcode", "Barcode") || "-"} | Cost:{" "}
            {formatCurrency(getValue(row, "costPrice", "CostPrice"))}
          </p>
          <p className="mt-2 text-xs text-ink-600">
            {getValue(row, "description", "Description") || "No description added."}
          </p>
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
            getValue(row, "isActive", "IsActive")
              ? "bg-mint/30 text-ink-950"
              : "bg-coral/10 text-coral"
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

      <section className="panel-soft p-6">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
          <select
            name="mode"
            value={lookup.mode}
            onChange={(e) => handleChange(e, setLookup)}
          >
            <option value="name">Search by name</option>
            <option value="id">Lookup by product ID</option>
            <option value="sku">Lookup by SKU</option>
            <option value="category">Filter by category</option>
            <option value="brand">Filter by brand</option>
            <option value="barcode">Lookup by barcode</option>
          </select>
          <input
            name="value"
            placeholder={
              lookup.mode === "id"
                ? "Enter product ID"
                : lookup.mode === "sku"
                  ? "Enter SKU"
                  : lookup.mode === "category"
                    ? "Enter category"
                    : lookup.mode === "brand"
                      ? "Enter brand"
                      : lookup.mode === "barcode"
                        ? "Enter barcode"
                        : "Search by product name"
            }
            value={lookup.value}
            onChange={(e) => handleChange(e, setLookup)}
          />
          <button className="primary-btn md:w-40" onClick={handleLookup} type="button">
            Run lookup
          </button>
          <button
            className="secondary-btn md:w-36"
            onClick={() => {
              setLookup({ mode: "name", value: "" });
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
                    name="sku"
                    required
                    value={form.sku}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Barcode</label>
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-ink-700">Name</label>
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-ink-700">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Category</label>
                  <input
                    name="category"
                    required
                    value={form.category}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Brand</label>
                  <input
                    name="brand"
                    value={form.brand}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Unit</label>
                  <input
                    name="unitOfMeasure"
                    value={form.unitOfMeasure}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Image URL</label>
                  <input
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Cost price</label>
                  <input
                    name="costPrice"
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Selling price</label>
                  <input
                    name="sellingPrice"
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Reorder level</label>
                  <input
                    name="reorderLevel"
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Max stock</label>
                  <input
                    name="maxStockLevel"
                    type="number"
                    value={form.maxStockLevel}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">
                    Lead time days
                  </label>
                  <input
                    name="leadTimeDays"
                    type="number"
                    value={form.leadTimeDays}
                    onChange={(e) => handleChange(e, setForm)}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-4 md:col-span-2 md:pt-4">
                  <input
                    name="isActive"
                    checked={form.isActive}
                    className="h-5 w-5 shrink-0"
                    onChange={(e) => handleChange(e, setForm)}
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Low Stock Snapshot
            </p>
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
                  {
                    label: "Reorder",
                    render: (row) => getValue(row, "reorderLevel", "ReorderLevel") || "-",
                  },
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
};

export default ProductsPage;
