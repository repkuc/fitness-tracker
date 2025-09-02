/** YYYY-MM-DD с учётом часового пояса пользователя */
export function todayISODate() {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Красивый вывод даты для списка (можно улучшить позже) */
export function formatShort(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  } catch {
    return dateStr || "";
  }
}
