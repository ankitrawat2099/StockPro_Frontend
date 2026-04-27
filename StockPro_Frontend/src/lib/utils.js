export function getValue(record, ...keys) {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return "";
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isGuid(value) {
  const str = String(value || "").trim();
  // Simple check: 36 characters with 4 hyphens at expected positions
  if (str.length !== 36) return false;
  const parts = str.split("-");
  return parts.length === 5 && parts.every(p => p.length > 0);
}

export function titleCase(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
export function extractApiMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.errors) {
    return Object.entries(data.errors)
      .flatMap(([field, messages]) =>
        messages.map((message) => (field && field !== "$" ? `${field}: ${message}` : message))
      )
      .join(", ");
  }

  if (data?.title) {
    return data.title;
  }

  return error?.message || "Something went wrong. Please try again.";
}

export function downloadBlob(data, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function isPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

export function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
