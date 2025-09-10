/** YYYY-MM-DD с учётом часового пояса пользователя */
export function todayISODate() {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Красивый вывод даты для списка (можно улучшить позже) */
export function formatShort(dateStr) {
  if (!dateStr) return "—";
  // Явно поддержим YYYY-MM-DD (без часов/зон)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dd = new Date(y, m - 1, d);
    return dd.toLocaleDateString();
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr || "—");
  try {
    return d.toLocaleDateString();
  } catch {
    return String(dateStr || "—");
  }
}
