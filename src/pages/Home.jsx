import { useEffect, useState } from "react";
import { listWorkouts } from "../data/workouts.js";

export default function Home() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(listWorkouts().length);
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Home</h2>
      <p style={{ opacity: 0.8 }}>
        Всего тренировок: <strong>{count}</strong>
      </p>
      <p style={{ opacity: 0.8 }}>
        Перейди на «New Workout», чтобы создать запись, или «History», чтобы
        посмотреть список.
      </p>
    </section>
  );
}
