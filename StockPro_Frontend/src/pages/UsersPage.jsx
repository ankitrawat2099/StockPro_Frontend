import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import FloatingNotice from "../components/FloatingNotice";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useNotice } from "../hooks/useNotice";
import { usePersistentState } from "../hooks/usePersistentState";
import { API_ROUTES, ROLE_LABELS, ROLES } from "../lib/constants";
import { extractApiMessage, formatDate, getValue, safeArray } from "../lib/utils";

export default function UsersPage() {
  const { createUser, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [draftForm, setDraftForm, clearDraftForm] = usePersistentState("draft:users:createForm", {
    fullName: "",
    email: "",
    phone: "",
    role: "STAFF",
    department: "",
  });
  const [password, setPassword] = useState("");
  const { message, error, setNotice } = useNotice();

  const form = {
    ...draftForm,
    password,
  };

  async function loadUsers() {
    try {
      const response = await axios.get(API_ROUTES.auth.users, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(safeArray(response.data));
      return true;
    } catch (loadError) {
      setError(extractApiMessage(loadError));
      return false;
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setNotice();

    try {
      await createUser(form);
      clearDraftForm();
      setPassword("");
      setMessage("User created successfully.");
      await loadUsers();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleDeactivate(userId) {
    setNotice();

    try {
      await axios.put(API_ROUTES.auth.deactivate(userId), null, { headers: { Authorization: `Bearer ${token}` } });
      setMessage("User deactivated.");
      await loadUsers();
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  async function handleRefresh() {
    setNotice();

    try {
      const loaded = await loadUsers();
      if (loaded) {
        setNotice("Users refreshed.");
      }
    } catch (submitError) {
      setNotice("", extractApiMessage(submitError));
    }
  }

  const columns = [
    {
      label: "Name",
      render: (row) => (
        <div>
          <p className="font-semibold text-ink-900">{getValue(row, "fullName", "FullName")}</p>
          <p className="text-xs text-ink-500">{getValue(row, "email", "Email")}</p>
        </div>
      ),
    },
    {
      label: "Role",
      render: (row) =>
        ROLE_LABELS[getValue(row, "role", "Role")] || getValue(row, "role", "Role"),
    },
    { label: "Department", render: (row) => getValue(row, "department", "Department") || "-" },
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
    { label: "Created", render: (row) => formatDate(getValue(row, "createdAt", "CreatedAt")) },
    {
      label: "Actions",
      render: (row) => (
        <button
          className="secondary-btn px-4 py-2"
          onClick={() => handleDeactivate(getValue(row, "userId", "UserId"))}
          type="button"
        >
          Deactivate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Manage users and create internal admins"
        description="This page uses the auth microservice and keeps admin creation inside the admin-only area."
      />

      <FloatingNotice error={error} message={message} />

      <div className="grid gap-4 2xl:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
        <form className="panel-soft min-w-0 self-start p-6" onSubmit={handleCreate}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Create User</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-3xl border border-ink-100 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Identity</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-ink-700">Full name</label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(event) => setDraftForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setDraftForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Password</label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(event) => setDraftForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Department</label>
                  <input
                    value={form.department}
                    onChange={(event) => setDraftForm((current) => ({ ...current, department: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-ink-100 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Access</p>
              <div className="mt-4 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(event) => setDraftForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="primary-btn" type="submit">
                Create account
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  clearDraftForm();
                  setPassword("");
                }}
                type="button"
              >
                Reset form
              </button>
            </div>
          </div>
        </form>

        <section className="panel-soft min-w-0 p-6">
          <div className="mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">User Directory</p>
              <h3 className="mt-2 text-2xl">{users.length} users</h3>
              <p className="mt-2 text-sm text-ink-600">
                Review internal accounts, create role-based access, and deactivate users when needed.
              </p>
            </div>
          </div>

          <DataTable columns={columns} rows={users} />
        </section>
      </div>
    </div>
  );
}
