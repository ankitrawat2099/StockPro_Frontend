import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { PUBLIC_SIGNUP_ROLES, ROLE_LABELS } from "../lib/constants";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: "STAFF",
  department: "",
};

const SignupPage = () => {
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await register(form);
      toast.success("Account created. You can login now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (submitError) {
      toast.error(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
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
              <input name="fullName" required value={form.fullName} onChange={handleChange} />
            </div>
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
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700">Department</label>
              <input name="department" value={form.department} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink-700">Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
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
};

export default SignupPage;
