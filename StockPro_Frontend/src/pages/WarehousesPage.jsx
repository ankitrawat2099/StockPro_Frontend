import { useEffect, useState, useContext } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { AuthContext } from "../context/AuthContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { extractApiMessage, formatDate, getValue, isGuid, isPositiveInteger, safeArray } from "../lib/utils";

const warehouseInitial = {
  name: "",
  location: "",
  address: "",
  managerId: 0,
  capacity: 0,
  phone: "",
};

const stockInitial = {
  warehouseId: "",
  productId: "",
  quantity: 0,
};

const transferInitial = {
  fromWarehouse: "",
  toWarehouse: "",
  productId: "",
  quantity: 0,
};

const WarehousesPage = () => {
  const { user, token } = useContext(AuthContext);
  const isAdmin = user?.role === "ADMIN";
  const canUpdateStock = user?.role === "STAFF";
  const canTransfer = ["STAFF", "MANAGER"].includes(user?.role);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [warehouseForm, setWarehouseForm, clearWarehouseForm] = usePersistentState(
    "draft:warehouses:warehouseForm",
    warehouseInitial
  );
  const [stockForm, setStockForm, clearStockForm] = usePersistentState(
    "draft:warehouses:stockForm",
    stockInitial
  );
  const [transferForm, setTransferForm, clearTransferForm] = usePersistentState(
    "draft:warehouses:transferForm",
    transferInitial
  );
  const [editingId, setEditingId, clearEditingId] = usePersistentState(
    "draft:warehouses:editingId",
    ""
  );
  const [lookup, setLookup] = usePersistentState("draft:warehouses:lookup", {
    warehouseId: "",
  });
  const [stockLookup, setStockLookup] = useState(null);
  const [stockActionLoading, setStockActionLoading] = useState(null);

  const loadWarehouses = async () => {
    try {
      const response = await axios.get(API_ROUTES.warehouse.warehouses, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWarehouses(safeArray(response.data));
      return true;
    } catch (loadError) {
      toast.error(extractApiMessage(loadError));
      return false;
    }
  };

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
    loadWarehouses();
    loadProducts();
  }, []);

  const handleChange = (e, setter) => {
    const { type } = e.target;
    const finalValue = type === "number" ? Number(e.target.value) : e.target.value;
    setter((current) => ({ ...current, [e.target.name]: finalValue }));
  };

  const loadLowStock = async () => {
    try {
      const response = await axios.get(API_ROUTES.warehouse.lowStock, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLowStock(safeArray(response.data));
      return true;
    } catch (loadError) {
      toast.error(extractApiMessage(loadError));
      return false;
    }
  };

  const handleWarehouseLookup = async () => {
    try {
      if (!lookup.warehouseId) {
        await loadWarehouses();
        return;
      }

      if (!isPositiveInteger(lookup.warehouseId)) {
        toast.error("Enter a valid numeric warehouse ID.");
        return;
      }

      const response = await axios.get(API_ROUTES.warehouse.byId(lookup.warehouseId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = response.data;
      setWarehouses(payload ? [payload] : []);
      toast.success("Warehouse loaded.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleWarehouseSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingId) {
        await axios.put(API_ROUTES.warehouse.byId(editingId), warehouseForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Warehouse updated.");
      } else {
        await axios.post(API_ROUTES.warehouse.warehouses, warehouseForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Warehouse created.");
      }

      clearEditingId();
      clearWarehouseForm();
      await loadWarehouses();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleEdit = (warehouse) => {
    setEditingId(getValue(warehouse, "warehouseId", "WarehouseId"));
    setWarehouseForm({
      name: getValue(warehouse, "name", "Name"),
      location: getValue(warehouse, "location", "Location"),
      address: getValue(warehouse, "address", "Address"),
      managerId: getValue(warehouse, "managerId", "ManagerId") || 0,
      capacity: getValue(warehouse, "capacity", "Capacity") || 0,
      phone: getValue(warehouse, "phone", "Phone"),
    });
  };

  const handleDeactivate = async (warehouseId) => {
    try {
      await axios.delete(API_ROUTES.warehouse.byId(warehouseId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Warehouse deactivated.");
      await loadWarehouses();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleStockAction = async (action) => {
    if (!stockForm.warehouseId || !stockForm.productId || Number(stockForm.quantity) <= 0) {
      toast.error("Select a warehouse, select a product, and enter a quantity greater than 0.");
      return;
    }

    if (!isGuid(stockForm.productId)) {
      toast.error("Enter a valid product ID in GUID format.");
      return;
    }

    setStockActionLoading(action);
    try {
      await axios.post(
        API_ROUTES.warehouse.stockAction(action),
        {
          warehouseId: Number(stockForm.warehouseId),
          productId: stockForm.productId,
          quantity: Number(stockForm.quantity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Stock ${action} completed.`);

      // Auto-refresh lookup if looking at the same stock
      if (
        stockLookup &&
        stockLookup.warehouseId === Number(stockForm.warehouseId) &&
        stockLookup.productId === stockForm.productId
      ) {
        try {
          const response = await axios.get(
            API_ROUTES.warehouse.stockLevel(Number(stockForm.warehouseId), stockForm.productId),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setStockLookup(response.data);
        } catch (e) {
          // silent fail for auto-refresh
        }
      }

      clearStockForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    } finally {
      setStockActionLoading(null);
    }
  };

  const handleTransfer = async (event) => {
    event.preventDefault();

    try {
      if (!isPositiveInteger(transferForm.fromWarehouse) || !isPositiveInteger(transferForm.toWarehouse)) {
        toast.error("Select valid source and destination warehouse IDs.");
        return;
      }

      if (Number(transferForm.fromWarehouse) === Number(transferForm.toWarehouse)) {
        toast.error("Choose two different warehouses for a transfer.");
        return;
      }

      if (Number(transferForm.quantity) <= 0) {
        toast.error("Enter a transfer quantity greater than 0.");
        return;
      }

      if (!isGuid(transferForm.productId)) {
        toast.error("Enter a valid product ID in GUID format.");
        return;
      }

      await axios.post(
        API_ROUTES.warehouse.transfer,
        {
          fromWarehouse: Number(transferForm.fromWarehouse),
          toWarehouse: Number(transferForm.toWarehouse),
          productId: transferForm.productId,
          quantity: Number(transferForm.quantity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Stock transferred.");
      clearTransferForm();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleStockLookup = async (event) => {
    event.preventDefault();

    try {
      if (!isPositiveInteger(stockForm.warehouseId)) {
        toast.error("Select a valid numeric warehouse ID.");
        return;
      }

      if (!isGuid(stockForm.productId)) {
        toast.error("Enter a valid product ID in GUID format.");
        return;
      }

      const response = await axios.get(
        API_ROUTES.warehouse.stockLevel(Number(stockForm.warehouseId), stockForm.productId),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStockLookup(response.data);
      toast.success("Stock level loaded.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleLoadLowStock = async () => {
    try {
      const loaded = await loadLowStock();
      if (loaded) {
        toast.success("Low-stock warehouse items loaded.");
      }
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const warehouseColumns = [
    {
      label: "Warehouse",
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{getValue(row, "name", "Name")}</p>
          <p className="text-xs text-ink-500">{getValue(row, "location", "Location")}</p>
          <p className="mt-1 text-xs text-ink-500">
            Address: {getValue(row, "address", "Address") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">Phone: {getValue(row, "phone", "Phone") || "-"}</p>
          <p className="mt-2 font-mono text-[11px] text-ink-500">
            ID: {getValue(row, "warehouseId", "WarehouseId")}
          </p>
        </div>
      ),
    },
    {
      label: "Capacity",
      render: (row) =>
        `${getValue(row, "usedCapacity", "UsedCapacity") || 0} / ${getValue(row, "capacity", "Capacity")}`,
    },
    { label: "Manager", render: (row) => getValue(row, "managerId", "ManagerId") || "-" },
    { label: "Created", render: (row) => formatDate(getValue(row, "createdAt", "CreatedAt")) },
  ];

  if (isAdmin) {
    warehouseColumns.push({
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button className="secondary-btn px-4 py-2" onClick={() => handleEdit(row)} type="button">
            Edit
          </button>
          <button
            className="danger-btn px-4 py-2"
            onClick={() => handleDeactivate(getValue(row, "warehouseId", "WarehouseId"))}
            type="button"
          >
            Deactivate
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Warehouse"
        title="Warehouses and stock operations"
        description="Admins manage warehouse records, staff update and reserve stock, and staff or managers can transfer inventory."
        actions={
          <button className="secondary-btn" onClick={handleLoadLowStock} type="button">
            Load low stock
          </button>
        }
      />

      <section className="panel-soft p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,220px)_auto_auto]">
          <input
            name="warehouseId"
            placeholder="Lookup warehouse by ID"
            type="number"
            value={lookup.warehouseId}
            onChange={(e) => handleChange(e, setLookup)}
          />
          <button className="secondary-btn md:w-40" onClick={handleWarehouseLookup} type="button">
            Find warehouse
          </button>
          <button
            className="secondary-btn md:w-36"
            onClick={async () => {
              setLookup({ warehouseId: "" });

              const loaded = await loadWarehouses();
              if (loaded) {
                toast.success("All warehouses loaded.");
              }
            }}
            type="button"
          >
            Show all
          </button>
        </div>
        <DataTable columns={warehouseColumns} rows={warehouses} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {isAdmin && (
          <form className="panel-soft p-6" onSubmit={handleWarehouseSubmit}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              {editingId ? "Edit Warehouse" : "Create Warehouse"}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Name</label>
                <input
                  name="name"
                  required
                  value={warehouseForm.name}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Location</label>
                <input
                  name="location"
                  value={warehouseForm.location}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Address</label>
                <input
                  name="address"
                  value={warehouseForm.address}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Manager ID</label>
                <input
                  name="managerId"
                  type="number"
                  value={warehouseForm.managerId}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Capacity</label>
                <input
                  name="capacity"
                  required
                  type="number"
                  value={warehouseForm.capacity}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
                <input
                  name="phone"
                  value={warehouseForm.phone}
                  onChange={(e) => handleChange(e, setWarehouseForm)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="primary-btn" type="submit">
                {editingId ? "Save warehouse" : "Create warehouse"}
              </button>
              {editingId ? (
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setEditingId("");
                    clearEditingId();
                    clearWarehouseForm();
                  }}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        )}

        <section className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Check Stock Level
          </p>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleStockLookup}>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Warehouse</label>
              <select
                name="warehouseId"
                required
                value={stockForm.warehouseId}
                onChange={(e) => handleChange(e, setStockForm)}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => {
                  const warehouseId = getValue(warehouse, "warehouseId", "WarehouseId");
                  return (
                    <option key={warehouseId} value={warehouseId}>
                      #{warehouseId} - {getValue(warehouse, "name", "Name")}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Product</label>
              <input
                name="productId"
                list="warehouse-product-options"
                required
                value={stockForm.productId}
                onChange={(e) => handleChange(e, setStockForm)}
                placeholder="Type or select product..."
              />
            </div>
            <div className="md:col-span-2">
              <button className="primary-btn" type="submit">
                Lookup stock
              </button>
            </div>
          </form>

          {stockLookup ? (
            <div className="mt-5 rounded-3xl bg-white p-5 border border-ink-100">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-4">
                Stock snapshot
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold">
                    Total Quantity
                  </p>
                  <p className="mt-1 text-3xl font-black text-ink-950">
                    {getValue(stockLookup, "quantity", "Quantity")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-bold">
                    Reserved
                  </p>
                  <p className="mt-1 text-3xl font-black text-ink-950">
                    {getValue(stockLookup, "reservedQuantity", "ReservedQuantity")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {canUpdateStock && (
          <section className="panel-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Staff Stock Actions
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Warehouse</label>
                <select
                  name="warehouseId"
                  value={stockForm.warehouseId}
                  onChange={(e) => handleChange(e, setStockForm)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => {
                    const warehouseId = getValue(warehouse, "warehouseId", "WarehouseId");
                    return (
                      <option key={warehouseId} value={warehouseId}>
                        #{warehouseId} - {getValue(warehouse, "name", "Name")}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Product</label>
                <input
                  name="productId"
                  list="warehouse-product-options"
                  value={stockForm.productId}
                  onChange={(e) => handleChange(e, setStockForm)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  value={stockForm.quantity}
                  onChange={(e) => handleChange(e, setStockForm)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className={stockActionLoading === "update" ? "primary-btn" : "secondary-btn"}
                onClick={() => handleStockAction("update")}
                type="button"
                disabled={stockActionLoading !== null}
              >
                {stockActionLoading === "update" ? "Updating..." : "Update stock"}
              </button>
              <button
                className={stockActionLoading === "reserve" ? "primary-btn" : "secondary-btn"}
                onClick={() => handleStockAction("reserve")}
                type="button"
                disabled={stockActionLoading !== null}
              >
                {stockActionLoading === "reserve" ? "Reserving..." : "Reserve"}
              </button>
              <button
                className={stockActionLoading === "release" ? "primary-btn" : "secondary-btn"}
                onClick={() => handleStockAction("release")}
                type="button"
                disabled={stockActionLoading !== null}
              >
                {stockActionLoading === "release" ? "Releasing..." : "Release"}
              </button>
            </div>
          </section>
        )}

        {canTransfer && (
          <form className="panel-soft p-6" onSubmit={handleTransfer}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Transfer Stock</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">From warehouse</label>
                <select
                  name="fromWarehouse"
                  required
                  value={transferForm.fromWarehouse}
                  onChange={(e) => handleChange(e, setTransferForm)}
                >
                  <option value="">Source</option>
                  {warehouses.map((warehouse) => {
                    const warehouseId = getValue(warehouse, "warehouseId", "WarehouseId");
                    return (
                      <option key={warehouseId} value={warehouseId}>
                        #{warehouseId} - {getValue(warehouse, "name", "Name")}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">To warehouse</label>
                <select
                  name="toWarehouse"
                  required
                  value={transferForm.toWarehouse}
                  onChange={(e) => handleChange(e, setTransferForm)}
                >
                  <option value="">Destination</option>
                  {warehouses.map((warehouse) => {
                    const warehouseId = getValue(warehouse, "warehouseId", "WarehouseId");
                    return (
                      <option key={warehouseId} value={warehouseId}>
                        #{warehouseId} - {getValue(warehouse, "name", "Name")}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Product</label>
                <input
                  name="productId"
                  list="warehouse-product-options"
                  required
                  value={transferForm.productId}
                  onChange={(e) => handleChange(e, setTransferForm)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Quantity</label>
                <input
                  name="quantity"
                  required
                  type="number"
                  value={transferForm.quantity}
                  onChange={(e) => handleChange(e, setTransferForm)}
                />
              </div>
            </div>

            <button className="primary-btn mt-5" type="submit">
              Transfer stock
            </button>
          </form>
        )}
      </div>

      <section className="panel-soft p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
          Low Stock by Warehouse
        </p>
        <div className="mt-5">
          <DataTable
            columns={[
              { label: "Product ID", render: (row) => getValue(row, "productId", "ProductId") },
              { label: "Warehouse", render: (row) => getValue(row, "warehouseId", "WarehouseId") },
              { label: "Quantity", render: (row) => getValue(row, "quantity", "Quantity") },
            ]}
            emptyMessage="Click 'Load low stock' to view low stock warehouse items."
            rows={lowStock}
          />
        </div>
      </section>

      <datalist id="warehouse-product-options">
        {products.map((product) => {
          const productId = getValue(product, "productId", "ProductId");
          return (
            <option key={productId} value={productId}>
              {getValue(product, "sku", "Sku")} - {getValue(product, "name", "Name")}
            </option>
          );
        })}
      </datalist>
    </div>
  );
};

export default WarehousesPage;
