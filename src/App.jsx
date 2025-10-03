import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import WorkoutEditor from "./pages/WorkoutEditor.jsx";
import History from "./pages/History.jsx";


export default function App() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
  className="sticky top-0 z-10 h-12 bg-[var(--card)] border-b border-[var(--border)]
             px-3 flex items-center overflow-x-auto no-scrollbar"
>
  <nav className="flex gap-2 whitespace-nowrap">
    <Link to="/" className="no-underline text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5">
      Главная
    </Link>
    <Link to="/workout/new" className="no-underline text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5">
      Новая тренировка
    </Link>
    <Link to="/history" className="no-underline text-[var(--text)] border border-[var(--border)] rounded-lg px-3 py-1.5">
      История
    </Link>
  </nav>
</header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout/new" element={<WorkoutEditor />} />
        <Route path="/workout/:id" element={<WorkoutEditor />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<div style={{ padding: 16 }}>Страница не найдена</div>} />
      </Routes>

    </main>
  );
}
