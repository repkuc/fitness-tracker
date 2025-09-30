import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import WorkoutEditor from "./pages/WorkoutEditor.jsx";
import History from "./pages/History.jsx";

const navStyle = {
  display: "flex",
  gap: 12,
  padding: "12px 16px",
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: "var(--card)",
  borderBottom: "1px solid var(--border)",
};

const linkStyle = {
  textDecoration: "none",
  color: "var(--text)",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
};

export default function App() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={navStyle}>
  <Link to="/" style={linkStyle}>Главная</Link>
  <Link to="/workout/new" style={linkStyle}>Новая тренировка</Link>
  <Link to="/history" style={linkStyle}>История</Link>
</header>

      <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/workout/new" element={<WorkoutEditor />} />
  <Route path="/workout/:id" element={<WorkoutEditor />} />
  <Route path="/history" element={<History />} />
  <Route path="*" element={<div style={{padding:16}}>Страница не найдена</div>} />
</Routes>

    </main>
  );
}
