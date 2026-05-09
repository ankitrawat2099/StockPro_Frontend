# StockPro — Frontend

A role-based inventory management web application built with **React 18**, **Vite**, and **Tailwind CSS**. It communicates with the StockPro microservices backend through a single API Gateway.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS v3 | Utility-first styling |
| React Toastify | Toast notifications |

---

## Project Structure

```
src/
├── components/         # Shared, reusable UI components
│   ├── AppShell.jsx    # Sidebar layout wrapper
│   ├── DataTable.jsx   # Generic table component
│   ├── PageHeader.jsx  # Page title header
│   ├── ProtectedRoute.jsx  # Auth & role guards
│   └── StatCard.jsx    # Dashboard stat card
├── context/
│   └── AuthContext.jsx # Global auth state & API calls
├── hooks/
│   └── usePersistentState.js  # localStorage-backed state
├── lib/
│   ├── constants.js    # API routes, nav items, roles
│   ├── storage.js      # Token read/write helpers
│   └── utils.js        # Shared utility functions
├── pages/              # One file per route
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ProductsPage.jsx
│   ├── WarehousesPage.jsx
│   ├── SuppliersPage.jsx
│   ├── PurchaseOrdersPage.jsx
│   ├── MovementsPage.jsx
│   ├── AlertsPage.jsx
│   ├── ReportsPage.jsx
│   ├── UsersPage.jsx
│   └── ProfilePage.jsx
├── App.jsx             # Route definitions
├── main.jsx            # App entry point
└── index.css           # Global styles
```

---

## Pages & Role Access

| Page | Path | Accessible By |
|---|---|---|
| Dashboard | `/` | All roles |
| Products | `/products` | Admin, Manager, Officer, Staff |
| Warehouses | `/warehouses` | Admin, Manager, Officer, Staff |
| Suppliers | `/suppliers` | Officer only |
| Purchase Orders | `/purchase-orders` | Admin, Manager, Officer, Staff |
| Movements | `/movements` | Admin, Manager, Officer, Staff |
| Alerts | `/alerts` | All roles |
| Reports | `/reports` | Admin, Manager |
| Users | `/users` | Admin only |
| Profile | `/profile` | All roles |

> Routes are protected by `ProtectedRoute`. Unauthorized access redirects to `/login`.

---

## User Roles

| Role | Label |
|---|---|
| `ADMIN` | Administrator |
| `MANAGER` | Inventory Manager |
| `OFFICER` | Purchase Officer |
| `STAFF` | Warehouse Staff |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- StockPro backend running (API Gateway default: `http://localhost:5000`)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd StockPro_Frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set VITE_GATEWAY_API to your API Gateway URL
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_GATEWAY_API=http://localhost:5000
```

If `VITE_GATEWAY_API` is not set, the app falls back to `http://localhost:5000`.

### Running Locally

```bash
npm run dev
```

App runs at **http://localhost:3000**.

### Build for Production

```bash
npm run build
```

Output is placed in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

---

## Authentication Flow

1. User submits credentials on `/login`.
2. `AuthContext` calls `POST /api/auth/login` via the API Gateway.
3. JWT token is stored in `localStorage`.
4. On every app load, the stored token is used to fetch the user profile.
5. If the token is invalid or expired, the session is cleared and the user is redirected to `/login`.
6. Logout calls `POST /api/auth/logout` and clears local state.

---

## API Gateway

All API calls are routed through a single gateway. The base URL is read from the `VITE_GATEWAY_API` environment variable.

| Service | Base Path |
|---|---|
| Auth | `/api/auth` |
| Products | `/api/products` |
| Warehouses | `/api/warehouses` |
| Suppliers | `/api/suppliers` |
| Purchase Orders | `/api/purchase-orders` |
| Movements | `/api/movements` |
| Alerts | `/api/alerts` |
| Reports | `/api/reports` |

---

## Related Repositories

- **Backend / API Gateway** — `StockPro` (.NET microservices solution)

---
