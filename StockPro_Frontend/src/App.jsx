import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import AlertsPage from "./pages/AlertsPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MovementsPage from "./pages/MovementsPage";
import ProductsPage from "./pages/ProductsPage";
import ProfilePage from "./pages/ProfilePage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ReportsPage from "./pages/ReportsPage";
import SignupPage from "./pages/SignupPage";
import SuppliersPage from "./pages/SuppliersPage";
import UsersPage from "./pages/UsersPage";
import WarehousesPage from "./pages/WarehousesPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="products"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "OFFICER", "STAFF"]}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="warehouses"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "OFFICER", "STAFF"]}>
              <WarehousesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers"
          element={
            <ProtectedRoute roles={["OFFICER"]}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchase-orders"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "OFFICER", "STAFF"]}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="movements"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "OFFICER", "STAFF"]}>
              <MovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "OFFICER", "STAFF"]}>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
