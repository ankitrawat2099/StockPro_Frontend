import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, booting, user } = useAuth();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-cream">
        <div className="panel max-w-md px-8 py-10 text-center text-ink-900">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">StockPro</p>
          <h1 className="mt-3 text-3xl">Preparing your workspace</h1>
          <p className="mt-2 text-sm text-ink-500">Loading your profile and role permissions.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const { isAuthenticated, booting } = useAuth();

  if (booting) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
