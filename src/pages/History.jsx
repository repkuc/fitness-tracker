// src/pages/History.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listWorkouts, repeatWorkout } from "../data/workouts.js";
import { formatShort } from "../lib/dates.js";

export default function History() {
  const [items, setItems] = useState([]); // список завершённых тренировок
  const navigate = useNavigate(); // для перехода на страницу тренировки

  // Подсчёт статистики по тренировке: количество упражнений, общее кол-во повторений, общий объём (reps * weight)
  function calcStats(w) {
    const exercises = Array.isArray(w?.exercises) ? w.exercises : []; // 
    let totalReps = 0;
    let totalVolume = 0; // суммарный объём: Σ (reps * weight)
    for (const ex of exercises) {
      const sets = Array.isArray(ex?.sets) ? ex.sets : [];
      for (const s of sets) {
        const reps = Number(s?.reps || 0);
        const weight = Number(s?.weight || 0);
        totalReps += reps;
        totalVolume += reps * weight;
      }
    }
    return {
      exercisesCount: exercises.length,
      totalReps,
      totalVolume,
    };
  }

  useEffect(() => {
    // показываем только завершённые тренировки
    const data = listWorkouts({ onlyDone: true });
    const sorted = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
      const aKey = (a?.finishedAt ? String(a.finishedAt) : `${a?.date || ""}T00:00:00`);
      const bKey = (b?.finishedAt ? String(b.finishedAt) : `${b?.date || ""}T00:00:00`);
      return bKey.localeCompare(aKey); // новые сверху
    });
    setItems(sorted);
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>History</h2>
      

      {items.length === 0 ? (
        <p style={{ opacity: 0.8 }}>
          Пока нет завершённых тренировок. Заверши черновик на странице «New Workout».
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((w) => {
            // для красоты: показываем дату завершения, если есть; иначе — дату тренировки
            const displayDate = w?.finishedAt ? String(w.finishedAt).slice(0, 10) : (w?.date || "");
            return (
              <li
                key={w.id}
                style={{ borderRadius: 10, padding: 12, marginBottom: 10 }}
              >
                <div className="meta" style={{ marginBottom: 6 }}>
                  {formatShort(w.date)} —{" "}
                  <Link to={`/workout/${w.id}`} className="link">
                    {w.name || "Workout"}
                  </Link>
                  {w.sourceWorkoutId && <span className="badge">повтор</span>}
                </div>
                {(() => {
                  const displayDate = w?.finishedAt ? String(w.finishedAt).slice(0, 10) : (w?.date || "");
                  const stats = calcStats(w);
                  return (
                    <>
                      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
                        Упражнений: <strong>{stats.exercisesCount}</strong> ·
                        Повторений: <strong>{stats.totalReps}</strong> ·
                        Объём: <strong>{Math.round(stats.totalVolume).toLocaleString("ru-RU")} кг</strong>
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          onClick={() => {
                            // создаём новый черновик на основе выбранной тренировки и открываем /workout/new
                            repeatWorkout(w.id);
                            navigate("/workout/new");
                          }}

                        >
                          🔁 Повторить
                        </button>

                        <button
                          className="btn"
                          onClick={() => navigate(`/workout/${w.id}?edit=1`)}

                        >
                          ✏️ Изменить
                        </button>
                      </div>
                    </>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
