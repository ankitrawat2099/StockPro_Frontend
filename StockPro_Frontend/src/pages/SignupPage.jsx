import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FloatingNotice from "../components/FloatingNotice";
import { useAuth } from "../context/AuthContext";
import { PUBLIC_SIGNUP_ROLES, ROLE_LABELS } from "../lib/constants";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: "STAFF",
  department: "",
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await register(form);
      setSuccess("Account created. You can login now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <FloatingNotice error={error} message={success} />
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-panel">
        <section className="px-8 py-12 sm:px-12">
          <h2 className="text-4xl">Sign up</h2>
          <p className="mt-2 text-sm text-ink-600">
            Already have an account?{" "}
            <Link className="font-semibold text-coral" to="/login">
              Login here
            </Link>
          </p>

          <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Full name</label>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
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
              <label className="mb-2 block text-sm font-medium text-ink-700">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Department</label>
              <input
                value={form.department}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Role</label>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                {PUBLIC_SIGNUP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="primary-btn w-full" disabled={loading} type="submit">
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
