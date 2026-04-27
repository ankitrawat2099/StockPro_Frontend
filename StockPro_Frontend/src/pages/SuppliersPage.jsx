import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { useNotice } from "../hooks/useNotice";
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

export default function SuppliersPage() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm, clearForm] = usePersistentState("draft:suppliers:form", initialForm);
  const [editingId, setEditingId, clearEditingId] = usePersistentState("draft:suppliers:editingId", "");
  const [lookupMode, setLookupMode] = usePersistentState("draft:suppliers:lookupMode", "name");
  const [lookupValue, setLookupValue] = usePersistentState("draft:suppliers:lookupValue", "");
  const [rating, setRating, clearRating] = usePersistentState("draft:suppliers:rating", initialRating);
  const { message, error, setNotice } = useNotice();

  async function loadSuppliers() {
    try {
      const response = await axios.get(API_ROUTES.suppliers.root, { headers: { Authorization: `Bearer ${token}` } });
      setSuppliers(safeArray(response.data));
      return true;
    } catch (loadError) {
      setError(extractApiMessage(loadError));
      return false;
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleLookup() {
    setNotice();

    try {
      if (!lookupValue.trim()) {
        await loadSuppliers();
        return;
      }

      if (lookupMode === "id" && !isPositiveInteger(lookupValue)) {
        setError("Enter a valid numeric supplier ID.");
        return;
      }

      const value = lookupValue.trim();
      let path = API_ROUTES.suppliers.search(value);

      if (lookupMode === "id") {
        path = API_ROUTES.suppliers.byId(value);
      } else if (lookupMode === "city") {
        path = API_ROUTES.suppliers.byCity(value);
      } else if (lookupMode === "country") {
        path = API_ROUTES.suppliers.byCountry(value);
      }

      const response = await axios.get(path, { headers: { Authorization: `Bearer ${token}` } });
      const payload = response.data;
      setSuppliers(Array.isArray(payload) ? payload : payload ? [payload] : []);
      setNotice("Supplier results loaded.");
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice();

    try {
      if (editingId) {
        await axios.put(API_ROUTES.suppliers.byId(editingId), form, { headers: { Authorization: `Bearer ${token}` } });
        setMessage("Supplier updated.");
      } else {
        await axios.post(API_ROUTES.suppliers.root, form, { headers: { Authorization: `Bearer ${token}` } });
        setMessage("Supplier created.");
      }

      clearEditingId();
      clearForm();
      await loadSuppliers();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  function handleEdit(row) {
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
  }

  async function handleDeactivate(id) {
    setNotice();

    try {
      await axios.put(API_ROUTES.suppliers.deactivate(id), null, { headers: { Authorization: `Bearer ${token}` } });
      setMessage("Supplier deactivated.");
      await loadSuppliers();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleRating(event) {
    event.preventDefault();
    setNotice();

    try {
      await axios.put(API_ROUTES.suppliers.rating(rating.supplierId, rating.value), null, token);
      setMessage("Supplier rating updated.");
      clearRating();
      await loadSuppliers();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleRefresh() {
    setNotice();

    try {
      const loaded = await loadSuppliers();
      if (loaded) {
        setNotice("Suppliers refreshed.");
      }
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

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
            Email: {getValue(row, "email", "Email") || "-"} | Phone: {getValue(row, "phone", "Phone") || "-"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Terms: {getValue(row, "paymentTerms", "PaymentTerms") || "-"} | Tax ID: {getValue(row, "taxId", "TaxId") || "-"}
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

      <FloatingNotice error={error} message={message} />

      <section className="panel-soft p-6">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto_auto]">
          <select value={lookupMode} onChange={(event) => setLookupMode(event.target.value)}>
            <option value="name">Search by name</option>
            <option value="id">Lookup by supplier ID</option>
            <option value="city">Filter by city</option>
            <option value="country">Filter by country</option>
          </select>
          <input
            placeholder={
              lookupMode === "id"
                ? "Enter supplier ID"
                : lookupMode === "city"
                  ? "Enter city"
                  : lookupMode === "country"
                    ? "Enter country"
                    : "Search suppliers by name"
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
                      required
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Contact person</label>
                    <input
                      value={form.contactPerson}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, contactPerson: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Address</label>
                    <input
                      value={form.address}
                      onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-ink-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Location and Terms</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">City</label>
                    <input
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Country</label>
                    <input
                      value={form.country}
                      onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Tax ID</label>
                    <input
                      value={form.taxId}
                      onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Payment terms</label>
                    <input
                      value={form.paymentTerms}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, paymentTerms: event.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-ink-700">Lead time days</label>
                    <input
                      type="number"
                      value={form.leadTimeDays}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, leadTimeDays: Number(event.target.value) }))
                      }
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
                  required
                  type="number"
                  value={rating.supplierId}
                  onChange={(event) =>
                    setRating((current) => ({ ...current, supplierId: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Rating</label>
                <input
                  required
                  max="5"
                  min="0"
                  step="0.5"
                  type="number"
                  value={rating.value}
                  onChange={(event) =>
                    setRating((current) => ({ ...current, value: Number(event.target.value) }))
                  }
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
}
