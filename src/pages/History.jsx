import { useEffect, useState } from "react";
import { listWorkouts, addExercise } from "../data/workouts.js";
import { formatShort } from "../lib/dates.js";

export default function History() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(listWorkouts());
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>History</h2>

      {items.length === 0 ? (
        <p style={{ opacity: 0.8 }}>
          Пока нет тренировок. Создай первую на странице «New Workout».
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((w) => (
            <li
              key={w.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {formatShort(w.date)} {w.name ? `— ${w.name}` : ""}
              </div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Упражнений: {w.exercises?.length ?? 0}
              </div>
              <button
                onClick={() => {
                  addExercise(w.id, { name: "Bench Press" });
                  setItems(listWorkouts());
                }}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ➕ Добавить упражнение (тест)
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
