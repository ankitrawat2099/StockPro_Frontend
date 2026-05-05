import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import DataTable from "../components/DataTable";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES } from "../lib/constants";
import { extractApiMessage, getValue, isPositiveInteger, safeArray } from "../lib/utils";

const initialForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  paymentTerms: "",
  leadTimeDays: 0,
};

const initialRating = {
  supplierId: "",
  value: 4,
};

const SuppliersPage = () => {
  const { token } = useContext(AuthContext);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm, clearForm] = usePersistentState("draft:suppliers:form", initialForm);
  const [editingId, setEditingId, clearEditingId] = usePersistentState(
    "draft:suppliers:editingId",
    ""
  );
  const [lookup, setLookup] = usePersistentState("draft:suppliers:lookup", {
    mode: "name",
    value: "",
  });
  const [rating, setRating, clearRating] = usePersistentState(
    "draft:suppliers:rating",
    initialRating
  );

  const loadSuppliers = async () => {
    try {
      const response = await axios.get(API_ROUTES.suppliers.root, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(safeArray(response.data));
      return true;
    } catch (loadError) {
      toast.error(extractApiMessage(loadError));
      return false;
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleChange = (e, setter) => {
    const { type } = e.target;
    const finalValue = type === "number" ? Number(e.target.value) : e.target.value;
    setter((current) => ({ ...current, [e.target.name]: finalValue }));
  };

  const handleLookup = async () => {
    try {
      if (!lookup.value.trim()) {
        await loadSuppliers();
        return;
      }

      if (lookup.mode === "id" && !isPositiveInteger(lookup.value)) {
        toast.error("Enter a valid numeric supplier ID.");
        return;
      }

      const val = lookup.value.trim();
      let path = API_ROUTES.suppliers.search(val);

      if (lookup.mode === "id") {
        path = API_ROUTES.suppliers.byId(val);
      } else if (lookup.mode === "city") {
        path = API_ROUTES.suppliers.byCity(val);
      } else if (lookup.mode === "country") {
        path = API_ROUTES.suppliers.byCountry(val);
      }

      const response = await axios.get(path, { headers: { Authorization: `Bearer ${token}` } });
      const payload = response.data;
      setSuppliers(Array.isArray(payload) ? payload : payload ? [payload] : []);
      toast.success("Supplier results loaded.");
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingId) {
        await axios.put(API_ROUTES.suppliers.byId(editingId), form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Supplier updated.");
      } else {
        await axios.post(API_ROUTES.suppliers.root, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Supplier created.");
      }

      clearEditingId();
      clearForm();
      await loadSuppliers();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleEdit = (row) => {
    setEditingId(getValue(row, "supplierId", "SupplierId"));
    setForm({
      name: getValue(row, "name", "Name"),
      contactPerson: getValue(row, "contactPerson", "ContactPerson"),
      email: getValue(row, "email", "Email"),
      phone: getValue(row, "phone", "Phone"),
      address: getValue(row, "address", "Address"),
      city: getValue(row, "city", "City"),
      country: getValue(row, "country", "Country"),
      taxId: getValue(row, "taxId", "TaxId"),
      paymentTerms: getValue(row, "paymentTerms", "PaymentTerms"),
      leadTimeDays: getValue(row, "leadTimeDays", "LeadTimeDays") || 0,
    });
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.put(API_ROUTES.suppliers.deactivate(id), null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Supplier deactivated.");
      await loadSuppliers();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleRating = async (event) => {
    event.preventDefault();

    try {
      await axios.put(API_ROUTES.suppliers.rating(rating.supplierId, rating.value), null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Supplier rating updated.");
      clearRating();
      await loadSuppliers();
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const handleRefresh = async () => {
    try {
      const loaded = await loadSuppliers();
      if (loaded) {
        toast.success("Suppliers refreshed.");
      }
    } catch (submitError) {
      toast.error(extractApiMessage(submitError));
    }
  };

  const columns = [
    {
      label: "Supplier",
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{getValue(row, "name", "Name")}</p>
          <p className="text-xs text-ink-500">
            Contact: {getValue(row, "contactPerson", "ContactPerson") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Email: {getValue(row, "email", "Email") || "-"} | Phone:{" "}
            {getValue(row, "phone", "Phone") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Terms: {getValue(row, "paymentTerms", "PaymentTerms") || "-"} | Tax ID:{" "}
            {getValue(row, "taxId", "TaxId") || "-"}
          </p>
          <p className="mt-2 break-all font-mono text-[11px] text-ink-500">
            ID: {getValue(row, "supplierId", "SupplierId")}
          </p>
        </div>
      ),
    },
    { label: "City", render: (row) => getValue(row, "city", "City") || "-" },
    { label: "Country", render: (row) => getValue(row, "country", "Country") || "-" },
    { label: "Lead Time", render: (row) => getValue(row, "leadTimeDays", "LeadTimeDays") || "-" },
    { label: "Rating", render: (row) => getValue(row, "rating", "Rating") || "-" },
    {
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button className="secondary-btn px-4 py-2" onClick={() => handleEdit(row)} type="button">
            Edit
          </button>
          <button
            className="danger-btn px-4 py-2"
            onClick={() => handleDeactivate(getValue(row, "supplierId", "SupplierId"))}
            type="button"
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Procurement"
        title="Suppliers"
        description="Purchase officers can create, update, search, and rate supplier records."
        actions={
          <button className="secondary-btn" onClick={handleRefresh} type="button">
            Refresh
          </button>
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
            <option value="id">Lookup by supplier ID</option>
            <option value="city">Filter by city</option>
            <option value="country">Filter by country</option>
          </select>
          <input
            name="value"
            placeholder={
              lookup.mode === "id"
                ? "Enter supplier ID"
                : lookup.mode === "city"
                  ? "Enter city"
                  : lookup.mode === "country"
                    ? "Enter country"
                    : "Search suppliers by name"
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Supplier List</p>
          <div className="mt-5">
            <DataTable columns={columns} rows={suppliers} />
          </div>
        </section>

        <section className="grid min-w-0 content-start gap-4">
          <form className="panel-soft self-start p-6" onSubmit={handleSubmit}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              {editingId ? "Edit Supplier" : "Create Supplier"}
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl border border-ink-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Identity</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-ink-700">Name</label>
                    <input
                      name="name"
                      required
                      value={form.name}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">
                      Contact person
                    </label>
                    <input
                      name="contactPerson"
                      value={form.contactPerson}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
                    <input
                      name="email"
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
                    <input
                      name="phone"
                      required
                      value={form.phone}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Address</label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-ink-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                  Location and Terms
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">City</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Country</label>
                    <input
                      name="country"
                      value={form.country}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Tax ID</label>
                    <input
                      name="taxId"
                      value={form.taxId}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">
                      Payment terms
                    </label>
                    <input
                      name="paymentTerms"
                      value={form.paymentTerms}
                      onChange={(e) => handleChange(e, setForm)}
                    />
                  </div>
                  <div className="md:col-span-2">
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
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="primary-btn" type="submit">
                {editingId ? "Save supplier" : "Create supplier"}
              </button>
              {editingId ? (
                <button
                  className="secondary-btn"
                  onClick={() => {
                    clearEditingId();
                    clearForm();
                  }}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : (
                <button className="secondary-btn" onClick={clearForm} type="button">
                  Reset form
                </button>
              )}
            </div>
          </form>

          <form className="panel-soft p-6" onSubmit={handleRating}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Update Rating</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Supplier ID</label>
                <input
                  name="supplierId"
                  required
                  type="number"
                  value={rating.supplierId}
                  onChange={(e) => handleChange(e, setRating)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Rating</label>
                <input
                  name="value"
                  required
                  max="5"
                  min="0"
                  step="0.5"
                  type="number"
                  value={rating.value}
                  onChange={(e) => handleChange(e, setRating)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="primary-btn" type="submit">
                Update rating
              </button>
              <button className="secondary-btn" onClick={clearRating} type="button">
                Reset rating
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default SuppliersPage;
