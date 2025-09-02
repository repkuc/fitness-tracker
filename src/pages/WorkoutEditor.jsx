import { useNavigate } from "react-router-dom";
import { createWorkout } from "../data/workouts.js";
import { todayISODate } from "../lib/dates.js";

export default function WorkoutEditor() {
  const navigate = useNavigate();

  function handleCreate() {
    const w = createWorkout({
      date: todayISODate(),
      name: "Workout",
      notes: "",
    });
    // Пока просто уходим в Историю, где увидим созданную запись
    navigate("/history");
  }

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>New Workout</h2>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Нажми кнопку ниже — создадим пустую тренировку на сегодня и посмотрим её
        в «History».
      </p>
      <button
        onClick={handleCreate}
        style={{
          padding: "10px 14px",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        Создать пустую тренировку (сегодня)
      </button>
    </section>
  );
}
