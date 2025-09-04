import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkout, getWorkout, addExercise } from "../data/workouts.js";
import { todayISODate } from "../lib/dates.js";
import { loadJSON, saveJSON, STORAGE_KEYS } from "../lib/storage.js";

export default function WorkoutEditor() {
  const navigate = useNavigate();
  const [currentId, setCurrentId] = useState("");         // id текущей тренировки
  const [workout, setWorkout] = useState(null);           // объект тренировки
  const [name, setName] = useState("");                   // имя упражнения
  const [muscle, setMuscle] = useState("");               // целевая мышца (опц.)

  // При заходе на страницу — восстановим последнюю «текущую» тренировку
  useEffect(() => {
    const savedId = loadJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
    if (savedId) setCurrentId(savedId);
  }, []);

  // Когда меняется currentId — подгружаем тренировку
  useEffect(() => {
    if (!currentId) {
      setWorkout(null);
      return;
    }
    const w = getWorkout(currentId);
    if (!w) {
      // если id устарел — очистим
      setCurrentId("");
      saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
      setWorkout(null);
    } else {
      setWorkout(w);
    }
  }, [currentId]);

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
    addExercise(currentId, { name: name.trim(), targetMuscle: muscle.trim() || undefined });
    // Обновим локальное состояние
    const w = getWorkout(currentId);
    setWorkout(w);
    // Сброс формы
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
            style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer" }}
          >
            Начать тренировку (сегодня)
          </button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 12, opacity: 0.8 }}>
            Дата: <strong>{workout.date}</strong> · Упражнений: <strong>{workout.exercises?.length ?? 0}</strong>
          </div>

          {/* маленькая форма добавления упражнения */}
          <form onSubmit={handleAddExercise} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name (напр., Bench Press)"
              style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, flex: "1 1 220px" }}
            />
            <input
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              placeholder="Target muscle (опц.)"
              style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, flex: "1 1 180px" }}
            />
            <button
              type="submit"
              style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer" }}
            >
              ➕ Упражнение
            </button>
          </form>

          {/* список упражнений (пока без редактирования) */}
          {(workout.exercises || []).length === 0 ? (
            <p style={{ opacity: 0.8 }}>Добавь первое упражнение.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {workout.exercises.map((ex) => (
                <li key={ex.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    Мышца: {ex.targetMuscle || "—"} · Подходов: {ex.sets?.length ?? 0}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate("/history")}
              style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer" }}
            >
              Открыть History
            </button>
          </div>
        </>
      )}
    </section>
  );
}