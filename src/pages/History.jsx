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
                className="card mb-3"
              >
                <div className="meta mb-1">
                  {formatShort(w.date)} —{" "}
                  <Link to={`/workout/${w.id}`} className="text-[var(--text)] hover:underline">
                    {w.name || "Workout"}
                  </Link>
                  {w.sourceWorkoutId && <span className="badge ml-1">повтор</span>}
                </div>
                {(() => {
                  const displayDate = w?.finishedAt ? String(w.finishedAt).slice(0, 10) : (w?.date || "");
                  const stats = calcStats(w);
                  return (
                    <>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[var(--text)]">
                        <span className="inline-flex whitespace-nowrap">
                          Упражнений: <b className="ml-1">{stats.exercisesCount}</b>
                        </span>
                        <span className="inline-flex whitespace-nowrap">
                          Повторений: <b className="ml-1">{stats.totalReps}</b>
                        </span>
                        <span className="inline-flex whitespace-nowrap">
                          Объём: <b className="ml-1">{Math.round(stats.totalVolume).toLocaleString("ru-RU")} кг</b>
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 w-full">
                        <button
                          className="btn w-full h-10"
                          onClick={() => {
                            // создаём новый черновик на основе выбранной тренировки и открываем /workout/new
                            repeatWorkout(w.id);
                            navigate("/workout/new");
                          }}
                        >Повторить</button>
                        <button
                          className="btn w-full h-10"
                          onClick={() => navigate(`/workout/${w.id}?edit=1`)}
                        >Изменить</button>
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
