import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(form);
      navigate("/");
    } catch (submitError) {
      toast.error(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-panel">
        <section className="px-8 py-12 sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-coral">
            Welcome back
          </p>
          <h2 className="mt-3 text-4xl">Login</h2>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Email</label>
              <input
                name="email"
                required
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Password</label>
              <input
                name="password"
                required
                type="password"
                value={form.password}
                onChange={handleChange}
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
};

export default LoginPage;
