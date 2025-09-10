// src/pages/WorkoutEditor.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createWorkout,
  getWorkout,
  addExercise,
  removeExercise,
  addSet,
  removeSet,
  updateWorkoutMeta,
  finishWorkout,
  getDraftWorkout,
  deleteWorkout
} from "../data/workouts.js";
import { todayISODate } from "../lib/dates.js";
import { loadJSON, saveJSON, STORAGE_KEYS } from "../lib/storage.js";

export default function WorkoutEditor() {
  const navigate = useNavigate();
  const { id: paramId } = useParams(); // id из URL

  // состояние
  const [currentId, setCurrentId] = useState("");
  const [workout, setWorkout] = useState(null);
  const [name, setName] = useState("");     // имя упражнения
  const [muscle, setMuscle] = useState(""); // мышца (опц.)
  const [metaName, setMetaName] = useState(""); // имя тренировки
  const [metaDate, setMetaDate] = useState(""); // дата тренировки

  // При входе: если есть :id в URL — используем его; иначе восстановим последнюю «текущую»
  useEffect(() => {
    if (paramId) {
      // Открываем конкретную тренировку из истории
      setCurrentId(paramId);
      saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, paramId);
      return;
    }
    // На /workout/new — только реальный черновик
    const draft = getDraftWorkout();
    if (draft) {
      setCurrentId(draft.id);
      saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, draft.id);
    } else {
      setCurrentId(""); // черновика нет — покажем кнопку "Начать тренировку"
      saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
    }
  }, [paramId]);

  // Когда меняется currentId — подгружаем тренировку
  useEffect(() => {
    if (!currentId) {
      setWorkout(null);
      return;
    }
    const w = getWorkout(currentId);
    if (!w) {
      // id устарел — очистим
      setCurrentId("");
      saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
      setWorkout(null);
    } else {
      if (!paramId && (w.status ?? "draft") === "done") {
        setCurrentId("");
        saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
        setWorkout(null);
        return;
      }
      setWorkout(w);
      setMetaName(w.name || "");
      setMetaDate(w.date || "");
    }
  }, [currentId]);

  // --- гарды: загрузка / не найдено (аккуратно) ---
  if (paramId && currentId !== paramId) {
    return (
      <section style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Workout</h2>
        <p style={{ opacity: 0.8 }}>Загружаю тренировку…</p>
      </section>
    );
  }
  if (paramId && currentId === paramId && !workout) {
    return (
      <section style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Workout</h2>
        <p style={{ opacity: 0.8 }}>
          Тренировка не найдена. Возможно, она была удалена. Вернуться в{" "}
          <a href="/history">History</a>.
        </p>
      </section>
    );
  }
  // --- end гарды ---

  function handleCancel() {
    if (!currentId) return;
    if (!confirm("Отменить и удалить текущий черновик?")) return;
    deleteWorkout(currentId);
    saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
    // локально очищаем состояние и уходим в историю
    setCurrentId("");
    setWorkout(null);
    navigate("/history");
  }

  function handleMetaDateBlur() {
    if (!currentId) return;
    const next = (metaDate || "").trim();
    if (!next) {
      // если поле очистили — вернём прежнюю дату (или сегодня)
      const fallback = workout?.date || todayISODate();
      setMetaDate(fallback);
      updateWorkoutMeta(currentId, { date: fallback });
      setWorkout(getWorkout(currentId));
      return;
    }
    if (workout?.date !== next) {
      updateWorkoutMeta(currentId, { date: next });
      setWorkout(getWorkout(currentId));
    }
  }

  function handleMetaNameBlur() {
    if (!currentId) return;
    const trimmed = metaName.trim();
    if ((workout?.name || "") !== trimmed) {
      updateWorkoutMeta(currentId, { name: trimmed });
      setWorkout(getWorkout(currentId));
    }
  }



  function handleFinish() {
    if (!currentId) return;
    if (!confirm("Завершить тренировку? После этого её нельзя будет отредактировать.")) return;
    finishWorkout(currentId);
    navigate("/history");
  }

  function handleStart() {
    const w = createWorkout({
      date: todayISODate(),
      name: "Workout",
      notes: "",
    });
    saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, w.id);
    setCurrentId(w.id);
  }

  function handleAddExercise(e) {
    e.preventDefault();
    if (!currentId || !name.trim()) return;
    addExercise(currentId, {
      name: name.trim(),
      targetMuscle: muscle.trim() || undefined,
    });
    setWorkout(getWorkout(currentId)); // обновим состояние
    setName("");
    setMuscle("");
  }

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>New Workout</h2>

      {!workout ? (
        <>
          <p style={{ opacity: 0.8, marginBottom: 12 }}>
            Нажми кнопку — начнём сегодняшнюю тренировку и будем добавлять упражнения.
          </p>
          <button
            onClick={handleStart}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Начать тренировку (сегодня)
          </button>
        </>
      ) : (
        <>
          {/* Мета: дата + имя (автосохранение при выходе из поля). Кнопки нет. */}
          <div
            style={{
              display: "flex",
              gap: 8,
              margin: "8px 0 12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              value={metaDate}
              onChange={(e) => setMetaDate(e.target.value)}
              onBlur={handleMetaDateBlur}
              disabled={(workout.status ?? "draft") === "done"}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
            <input
              type="text"
              placeholder="Название тренировки (опц.)"
              value={metaName}
              onChange={(e) => setMetaName(e.target.value)}
              onBlur={handleMetaNameBlur}
              disabled={(workout.status ?? "draft") === "done"}
              style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 220 }}
            />
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              Черновик сохраняется автоматически
            </span>
          </div>


          <div style={{ marginBottom: 12, opacity: 0.8 }}>
            Дата: <strong>{workout.date}</strong> · Упражнений:{" "}
            <strong>{workout.exercises?.length ?? 0}</strong>
          </div>

          {/* добавить упражнение */}
          <form
            onSubmit={handleAddExercise}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name (напр., Bench Press)"
              style={{
                padding: "8px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                flex: "1 1 220px",
              }}
            />
            <input
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              placeholder="Target muscle (опц.)"
              style={{
                padding: "8px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                flex: "1 1 180px",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ➕ Упражнение
            </button>
          </form>

          {/* список упражнений */}
          {(workout.exercises ?? []).length === 0 ? (
            <p style={{ opacity: 0.8 }}>Добавь первое упражнение.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(workout.exercises ?? []).map((ex) => (
                <li
                  key={ex.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  {/* шапка упражнения */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    <button
                      onClick={() => {
                        if (!confirm("Удалить упражнение?")) return;
                        removeExercise(currentId, ex.id);
                        setWorkout(getWorkout(currentId));
                      }}
                      title="Удалить упражнение"
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      ✖
                    </button>
                  </div>

                  {/* инфо */}
                  <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                    Мышца: {ex.targetMuscle || "—"} · Подходов:{" "}
                    {ex.sets?.length ?? 0}
                  </div>

                  {/* список подходов */}
                  {(ex.sets ?? []).length > 0 && (
                    <ul
                      style={{ listStyle: "none", padding: 0, marginTop: 8 }}
                    >
                      {(ex.sets ?? []).map((s) => (
                        <li
                          key={s.id}
                          style={{
                            padding: "4px 0",
                            fontSize: 14,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>
                            {s.reps} × {s.weight}
                          </span>
                          <button
                            onClick={() => {
                              if (!confirm("Удалить подход?")) return;
                              removeSet(currentId, ex.id, s.id);
                              setWorkout(getWorkout(currentId));
                            }}
                            title="Удалить подход"
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              padding: "2px 8px",
                              cursor: "pointer",
                            }}
                          >
                            ✖
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* форма добавления подхода */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const reps = Number(fd.get("reps") || 0);
                      const weight = Number(fd.get("weight") || 0);
                      if (!Number.isFinite(reps) || reps <= 0) return;
                      if (!Number.isFinite(weight) || weight < 0) return;
                      addSet(currentId, ex.id, { reps, weight });
                      setWorkout(getWorkout(currentId));
                      e.currentTarget.reset();
                    }}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      name="reps"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      placeholder="Повторы"
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        width: 110,
                      }}
                    />
                    <input
                      name="weight"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      placeholder="Вес"
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        width: 110,
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      ➕ Добавить подход
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* нижняя кнопка: сохранить тренировку (только для черновика) */}
          {(workout.status ?? "draft") === "draft" && (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                ↩️ Отменить
              </button>
              <button
                onClick={handleFinish}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #e5e7eb",
                  color: "#fff",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Сохранить тренировку
              </button>
            </div>
          )}


          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate("/history")}
              style={{
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Открыть History
            </button>
          </div>
        </>
      )}
    </section>
  );
}
