import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FloatingNotice from "../components/FloatingNotice";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <FloatingNotice error={error} />
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-panel">
        <section className="px-8 py-12 sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-coral">Welcome back</p>
          <h2 className="mt-3 text-4xl">Login</h2>
          <p className="mt-2 text-sm text-ink-600">
            New to StockPro?{" "}
            <Link className="font-semibold text-coral" to="/signup">
              Create an account
            </Link>
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
            <button className="primary-btn w-full" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
