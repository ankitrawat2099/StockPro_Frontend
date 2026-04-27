import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_ITEMS, ROLE_LABELS } from "../lib/constants";

export default function AppShell() {
  const { user, logout } = useAuth();
  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="panel p-6">


          <div className="mt-6 rounded-3xl bg-cream px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Signed in as</p>
            <h2 className="mt-2 text-xl">{user?.fullName || "StockPro User"}</h2>
            <p className="mt-1 text-sm text-ink-600">{ROLE_LABELS[user?.role] || user?.role}</p>
            <p className="mt-1 text-sm text-ink-500">{user?.email}</p>
          </div>

          <nav className="mt-6 grid gap-2">
            {allowedItems.map((item) => (
              <NavLink 
                key={item.to} 
                className={({ isActive }) => 
                  `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? "bg-ink-950 text-cream" : "text-ink-700 hover:bg-ink-100 hover:text-ink-950"
                  }`
                } 
                to={item.to} 
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button className="danger-btn mt-6 w-full" onClick={logout} type="button">
            Sign out
          </button>
        </aside>

        <main className="space-y-4">
          <div className="panel overflow-hidden">

            <div className="p-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
