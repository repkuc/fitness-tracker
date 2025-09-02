import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import WorkoutEditor from "./pages/WorkoutEditor.jsx";
import History from "./pages/History.jsx";

const navStyle = {
  borderRadius: 4,
  display: "flex",
  gap: 12,
  padding: "12px 16px",
  borderBottom: "2px solid #e5e7eb",
  position: "sticky",
  top: 0,
  background: "#fff",
  zIndex: 10,
};

const linkStyle = {
  textDecoration: "none",
  color: "#111827",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
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
        <Link to="/" style={linkStyle}>
          Home
        </Link>
        <Link to="/workout/new" style={linkStyle}>
          New Workout
        </Link>
        <Link to="/history" style={linkStyle}>
          History
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workout/new" element={<WorkoutEditor />} />
        <Route path="/history" element={<History />} />
        {/* на будущее: <Route path="/workout/:id" element={<WorkoutEditor />} /> */}
      </Routes>
    </main>
  );
}
