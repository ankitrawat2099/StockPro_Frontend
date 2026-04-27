export const TOKEN_KEY = "stockpro_token";

export const ROLES = ["ADMIN", "MANAGER", "OFFICER", "STAFF"];
export const PUBLIC_SIGNUP_ROLES = ["STAFF", "MANAGER", "OFFICER"];

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  MANAGER: "Inventory Manager",
  OFFICER: "Purchase Officer",
  STAFF: "Warehouse Staff",
};

export const URLS = {
  auth: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/auth",
  product: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/products",
  warehouse: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api",
  supplier: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/suppliers",
  purchase: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/purchase-orders",
  movement: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/movements",
  alert: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/alerts",
  report: (import.meta.env.VITE_GATEWAY_API || "http://localhost:5000") + "/api/reports",
};




export const API_ROUTES = {
  auth: {
    login: `${URLS.auth}/login`,
    register: `${URLS.auth}/register`,
    profile: `${URLS.auth}/profile`,
    password: `${URLS.auth}/password`,
    users: `${URLS.auth}/users`,
    deactivate: (userId) => `${URLS.auth}/deactivate?userId=${userId}`,
    refresh: `${URLS.auth}/refresh`,
    logout: `${URLS.auth}/logout`,
  },
  products: {
    root: `${URLS.product}/`,
    byId: (id) => `${URLS.product}/${id}`,
    bySku: (sku) => `${URLS.product}/sku/${sku}`,
    byCategory: (category) => `${URLS.product}/category/${category}`,
    byBrand: (brand) => `${URLS.product}/brand/${brand}`,
    byBarcode: (barcode) => `${URLS.product}/barcode/${barcode}`,
    search: (name) => `${URLS.product}/search?name=${name}`,
    lowStock: `${URLS.product}/lowStock`,
    deactivate: (id) => `${URLS.product}/${id}/deactivate`,
    remove: (id) => `${URLS.product}/${id}`,
  },
  warehouse: {
    warehouses: `${URLS.warehouse}/warehouses`,
    byId: (id) => `${URLS.warehouse}/warehouses/${id}`,
    stockLevel: (warehouseId, productId) =>
      `${URLS.warehouse}/stock/${warehouseId}/${productId}`,
    stockAction: (action) => `${URLS.warehouse}/stock/${action}`,
    transfer: `${URLS.warehouse}/stock/transfer`,
    lowStock: `${URLS.warehouse}/stock/low`,
  },
  suppliers: {
    root: `${URLS.supplier}/`,
    byId: (id) => `${URLS.supplier}/${id}`,
    search: (name) => `${URLS.supplier}/search?name=${name}`,
    byCity: (city) => `${URLS.supplier}/city?city=${city}`,
    byCountry: (country) => `${URLS.supplier}/country?country=${country}`,
    deactivate: (id) => `${URLS.supplier}/${id}/deactivate`,
    rating: (id, rating) => `${URLS.supplier}/${id}/rating?rating=${rating}`,
    remove: (id) => `${URLS.supplier}/${id}`,
  },
  purchaseOrders: {
    create: `${URLS.purchase}/create`,
    byId: (id) => `${URLS.purchase}/${id}`,
    byStatus: (status) => `${URLS.purchase}/status/${status}`,
    bySupplier: (supplierId) => `${URLS.purchase}/supplier/${supplierId}`,
    byWarehouse: (warehouseId) => `${URLS.purchase}/warehouse/${warehouseId}`,
    byDateRange: (start, end) => `${URLS.purchase}/dateRange?start=${start}&end=${end}`,
    submit: (id) => `${URLS.purchase}/${id}/submit`,
    approve: (id) => `${URLS.purchase}/${id}/approve`,
    cancel: (id) => `${URLS.purchase}/${id}/cancel`,
    receive: (id) => `${URLS.purchase}/${id}/receive`,
    update: (id) => `${URLS.purchase}/${id}`,
  },
  movements: {
    root: `${URLS.movement}/`,
    byProduct: (productId) => `${URLS.movement}/product/${productId}`,
    byWarehouse: (warehouseId) => `${URLS.movement}/warehouse/${warehouseId}`,
    byType: (type) => `${URLS.movement}/type?type=${type}`,
    byDateRange: (start, end) => `${URLS.movement}/date?start=${start}&end=${end}`,
    byReference: (referenceId) => `${URLS.movement}/reference/${referenceId}`,
    stockIn: (productId) => `${URLS.movement}/stockin/${productId}`,
    stockOut: (productId) => `${URLS.movement}/stockout/${productId}`,
    history: (productId, warehouseId) =>
      `${URLS.movement}/history?productId=${productId}&warehouseId=${warehouseId}`,
    byUser: (userId) => `${URLS.movement}/user/${userId}`,
  },
  alerts: {
    root: `${URLS.alert}/`,
    bulk: `${URLS.alert}/bulk`,
    byRecipient: (recipientId) => `${URLS.alert}/${recipientId}`,
    unread: (recipientId) => `${URLS.alert}/${recipientId}/unread`,
    unacknowledged: (recipientId) => `${URLS.alert}/${recipientId}/unacknowledged`,
    readAll: (recipientId) => `${URLS.alert}/${recipientId}/read-all`,
    markRead: (alertId) => `${URLS.alert}/${alertId}/read`,
    acknowledge: (alertId) => `${URLS.alert}/${alertId}/ack`,
    remove: (alertId) => `${URLS.alert}/${alertId}`,
  },
  reports: {
    totalValue: `${URLS.report}/totalValue`,
    byWarehouse: (warehouseId) => `${URLS.report}/byWarehouse?warehouseId=${warehouseId}`,
    turnover: (start, end) => `${URLS.report}/turnover?start=${start}&end=${end}`,
    lowStock: `${URLS.report}/lowStock`,
    topMoving: `${URLS.report}/topMoving`,
    slowMoving: `${URLS.report}/slowMoving`,
    deadStock: `${URLS.report}/deadStock`,
    poSummary: `${URLS.report}/poSummary`,
    generate: `${URLS.report}/generateReport`,
  },
};

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", roles: ROLES },
  { to: "/products", label: "Products", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { to: "/warehouses", label: "Warehouses", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { to: "/suppliers", label: "Suppliers", roles: ["OFFICER"] },
  { to: "/purchase-orders", label: "Purchase Orders", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { to: "/movements", label: "Movements", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { to: "/alerts", label: "Alerts", roles: ROLES },
  { to: "/reports", label: "Reports", roles: ["ADMIN", "MANAGER"] },
  { to: "/users", label: "Users", roles: ["ADMIN"] },
  { to: "/profile", label: "Profile", roles: ROLES },
];

export const DASHBOARD_COPY = {
  ADMIN: {
    title: "Control every service from one place",
    blurb:
      "Manage users, configure warehouses, watch total stock value, and create internal admins without exposing admin signup publicly.",
  },
  MANAGER: {
    title: "Keep inventory healthy and visible",
    blurb:
      "Track products, watch low-stock signals, monitor transfers, and review analytics across every warehouse.",
  },
  OFFICER: {
    title: "Run procurement without losing context",
    blurb:
      "Create suppliers, raise purchase orders, follow approval flow, and keep receipts moving against demand.",
  },
  STAFF: {
    title: "Handle stock activity quickly",
    blurb:
      "Update stock, reserve inventory, transfer quantities, and record daily movement activity from the warehouse floor.",
  },
};
