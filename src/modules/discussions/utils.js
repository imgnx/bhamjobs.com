const ALLOWED_STATUSES = new Set([
  "OPEN",
  "UNDER_REVIEW",
  "PLANNED",
  "COMPLETED",
  "ARCHIVED",
]);

export function normalizeThreadStatus(input) {
  if (!input) return "OPEN";
  const normalized = String(input)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return ALLOWED_STATUSES.has(normalized) ? normalized : "OPEN";
}

export function formatPreview(text, max = 220) {
  if (!text) return "";
  const collapsed = String(text).trim().replace(/\s+/g, " ");
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

export function formatDisplayDate(value) {
  if (!value) return "";
  try {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "";
  }
}

