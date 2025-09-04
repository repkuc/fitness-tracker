export const STORAGE_KEYS = {
  WORKOUTS: "wt.workouts.v1",
  CURRENT_WORKOUT_ID: "wt.currentWorkoutId.v1",
};

/** Безопасная загрузка JSON из localStorage */
export function loadJSON(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("[storage] JSON parse error:", e);
    return fallback;
  }
}

/** Сохранение JSON в localStorage */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[storage] JSON stringify error:", e);
  }
}
