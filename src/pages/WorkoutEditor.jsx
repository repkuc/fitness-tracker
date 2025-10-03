// src/pages/WorkoutEditor.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  deleteWorkout,
  updateSet,
  moveExercise,
  replaceWorkout
} from "../data/workouts.js";
import { todayISODate } from "../lib/dates.js";
import { loadJSON, saveJSON, STORAGE_KEYS } from "../lib/storage.js";

const EXPAND_KEY = "wt.ui.expanded.exerciseIds";

export default function WorkoutEditor() {
  const navigate = useNavigate();
  const { id: paramId } = useParams(); // id из URL

  const bottomRef = useRef(null);
  const nameInputRef = useRef(null);

  // состояние
  const [currentId, setCurrentId] = useState("");
  const [workout, setWorkout] = useState(null);
  const [name, setName] = useState("");     // имя упражнения
  const [muscle, setMuscle] = useState(""); // мышца (опц.)
  const [metaName, setMetaName] = useState(""); // имя тренировки
  const [metaDate, setMetaDate] = useState(""); // дата тренировки
  // Рабочая копия для режима редактирования завершённой тренировки (?edit=1)
  const [editCopy, setEditCopy] = useState(null); // копия тренировки для редактирования
  const [expandedIds, setExpandedIds] = useState(() => new Set()); // какие упражнения раскрыты
  // клонирование без побочек
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  // простой генератор id для локальных сущностей
  const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)); // пример: "q1w2e3r4t5y6"

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
      // если мы редактируем завершённую — готовим локальную копию
      if (paramId && (w.status ?? "draft") === "done") {
        setEditCopy(clone(w));
      } else {
        setEditCopy(null);
      }
    }
  }, [currentId]);

  // при монтировании — восстановить
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPAND_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setExpandedIds(new Set(arr));
      }
    } catch { }
  }, []);

  // при изменении — сохранить
  useEffect(() => {
    try {
      localStorage.setItem(EXPAND_KEY, JSON.stringify(Array.from(expandedIds)));
    } catch { }
  }, [expandedIds]);


  const [searchParams] = useSearchParams(); // для опций
  const wantsEdit = searchParams.get("edit") === "1"; // редактировать завершённую тренировку (опция)

  const isDone = (workout?.status ?? "draft") === "done"; // тренировка завершена
  const isViewOnly = !!paramId && isDone && !wantsEdit; // просмотр завершённой тренировки без редактирования
  const isEditMode = !!paramId && isDone && wantsEdit; // редактирование завершённой тренировки

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
    const fallback = workout?.date || todayISODate();
    const apply = next || fallback; // итоговое значение (не даём остаться пустым)

    // Обновим UI-поле на всякий случай
    if (apply !== metaDate) setMetaDate(apply);

    if (isEditMode) {
      // Редактируем завершённую запись локально
      const copy = JSON.parse(JSON.stringify(editCopy || workout));
      if (copy.date !== apply) {
        copy.date = apply;
        setEditCopy(copy);
        setWorkout(copy);
      }
    } else {
      // Обычный черновик/новая — сохраняем сразу в storage
      if (workout?.date !== apply) {
        updateWorkoutMeta(currentId, { date: apply });
        setWorkout(getWorkout(currentId));
      }
    }
  }

  function handleMetaNameBlur() {
    if (!currentId) return;
    const trimmed = metaName.trim();
    if (isEditMode) {
      const copy = clone(editCopy || workout);
      copy.name = trimmed;
      setEditCopy(copy);
      setWorkout(copy);
    } else {
      if ((workout?.name || "") !== trimmed) {
        updateWorkoutMeta(currentId, { name: trimmed });
        setWorkout(getWorkout(currentId));
      }
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

    if (isEditMode) {
      const copy = clone(editCopy || workout);
      const ex = {
        id: newId(),
        workoutId: currentId,
        name: name.trim(),
        targetMuscle: muscle.trim() || "",
        sets: [],
        position: (copy.exercises?.length ?? 0),
      };
      copy.exercises = [...(copy.exercises || []), ex];

      // ✅ сразу раскрываем добавленное упражнение по его id
  setExpandedIds(prev => {
    const next = new Set(prev);
    next.add(ex.id);
    return next;
  });

      setEditCopy(copy);
      setWorkout(copy);
    } else {
      addExercise(currentId, { name: name.trim(), targetMuscle: muscle.trim() || undefined });
      setWorkout(getWorkout(currentId));
    }
    setName("");
    setMuscle("");

    // авто-раскрыть добавленное упражнение
    if (isEditMode) {
      const copy = editCopy || workout;
      const newEx = (copy.exercises || [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .at(-1);
      if (newEx) setExpandedIds(prev => new Set(prev).add(newEx.id));
    } else {
      const fresh = getWorkout(currentId);
      const newEx = (fresh?.exercises || [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .at(-1);
      if (newEx) setExpandedIds(prev => new Set(prev).add(newEx.id));
    }

    // Мягкая прокрутка вниз и вернуть фокус в имя
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      nameInputRef.current?.focus();
    });
  }

  function toggleExercise(exId) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  }

  function adjustSetValue(exId, setId, field, delta) {
    if (isViewOnly) return;
    if (isEditMode) {
      const copy = JSON.parse(JSON.stringify(editCopy || workout));
      const E = (copy.exercises || []).find(e => e.id === exId);
      if (!E) return;
      const S = (E.sets || []).find(x => x.id === setId);
      if (!S) return;
      const cur = Number(S[field] || 0);
      let next = cur + delta;
      if (field === "reps") next = Math.max(0, Math.round(next));
      if (field === "weight") next = Math.max(0, Math.round(next * 2) / 2); // шаг 0.5
      S[field] = next;
      setEditCopy(copy);
      setWorkout(copy);
    } else {
      // прямое обновление в storage
      const cur = Number((getWorkout(currentId)?.exercises || [])
        .find(e => e.id === exId)?.sets?.find(s => s.id === setId)?.[field] || 0);
      let next = cur + delta;
      if (field === "reps") next = Math.max(0, Math.round(next));
      if (field === "weight") next = Math.max(0, Math.round(next * 2) / 2);
      updateSet(currentId, exId, setId, { [field]: next });
      setWorkout(getWorkout(currentId));
    }
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
              
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Начать тренировку (сегодня)
          </button>
        </>
      ) : (
        <>
          {isEditMode && (
            <div
              style={{
                margin: "8px 0 12px",
                padding: "8px 10px",
                border: "1px solid #fde68a",
                background: "#fffbeb",
                color: "#92400e",
                borderRadius: 10,
              }}
            >
              Режим редактирования завершённой тренировки.
              Изменения применятся только после нажатия «Сохранить изменения».
            </div>
          )}

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
              disabled={isViewOnly}
              style={{ padding: "6px 10px",  borderRadius: 8 }}
            />
            <input
              type="text"
              placeholder="Название тренировки (опц.)"
              value={metaName}
              onChange={(e) => setMetaName(e.target.value)}
              onBlur={handleMetaNameBlur}
              disabled={isViewOnly}
              style={{ padding: "6px 10px", borderRadius: 8, minWidth: 220 }}
            />
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              Черновик сохраняется автоматически
            </span>
          </div>


          <div style={{ marginBottom: 12, opacity: 0.8 }}>
            Дата: <strong>{workout.date}</strong> · Упражнений:{" "}
            <strong>{workout.exercises?.length ?? 0}</strong>
          </div>




          {/* список упражнений */}
          {(workout.exercises ?? []).length === 0 ? (
            <p style={{ opacity: 0.8 }}>Добавь первое упражнение.</p>
          ) : (
            (() => {
              const exList = (workout.exercises ?? [])
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

              return (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {exList.map((ex, i) => (
                    <li
                      key={ex.id}
                      style={{
                        
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      {/* шапка упражнения */}
                      <div
                        className="wrap"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button onClick={() => toggleExercise(ex.id)}
                            title={expandedIds.has(ex.id) ? "Свернуть" : "Развернуть"}
                            style={{ padding: "2px 8px", borderRadius: 8, cursor: "pointer" }}
                          >
                            {expandedIds.has(ex.id) ? "▾" : "▸"}
                          </button>
                        </div>
                        <div style={{ fontWeight: 600 }}>{ex.name}</div>

                        {!isViewOnly && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => {
                                if (isEditMode) {
                                  const copy = clone(editCopy || workout);
                                  const list = (copy.exercises || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                                  const idx = list.findIndex((e) => e.id === ex.id);
                                  const delta = -1;
                                  const target = idx + delta;
                                  if (idx >= 0 && target >= 0 && target < list.length) {
                                    const [moved] = list.splice(idx, 1);
                                    list.splice(target, 0, moved);
                                    list.forEach((e, i) => e.position = i);
                                    copy.exercises = list;
                                    setEditCopy(copy);
                                    setWorkout(copy);
                                  }
                                } else {
                                  moveExercise(currentId, ex.id, "up");
                                  setWorkout(getWorkout(currentId));
                                }
                              }}
                              disabled={i === 0}
                              title="Выше"
                              style={{
                                padding: "4px 8px",
                  
                                borderRadius: 8,
                                cursor: i === 0 ? "default" : "pointer",
                                opacity: i === 0 ? 0.5 : 1,
                              }}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => {
                                if (isEditMode) {
                                  const copy = clone(editCopy || workout);
                                  const list = (copy.exercises || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                                  const idx = list.findIndex((e) => e.id === ex.id);
                                  const delta = 1;
                                  const target = idx + delta;
                                  if (idx >= 0 && target >= 0 && target < list.length) {
                                    const [moved] = list.splice(idx, 1);
                                    list.splice(target, 0, moved);
                                    list.forEach((e, i) => e.position = i);
                                    copy.exercises = list;
                                    setEditCopy(copy);
                                    setWorkout(copy);
                                  }
                                } else {
                                  moveExercise(currentId, ex.id, "down");
                                  setWorkout(getWorkout(currentId));
                                }
                              }}
                              disabled={i === exList.length - 1}
                              title="Ниже"
                              style={{
                                padding: "4px 8px",
                                
                                borderRadius: 8,
                                cursor: i === exList.length - 1 ? "default" : "pointer",
                                opacity: i === exList.length - 1 ? 0.5 : 1,
                              }}
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm("Удалить упражнение?")) return;
                                if (isEditMode) {
                                  const copy = clone(editCopy || workout);
                                  copy.exercises = (copy.exercises || []).filter((e) => e.id !== ex.id).
                                    map((e, i) => ({ ...e, position: i })); // пересчёт позиций
                                  setEditCopy(copy);
                                  setWorkout(copy);
                                } else {
                                  removeExercise(currentId, ex.id);
                                  setWorkout(getWorkout(currentId));
                                }
                              }}
                              title="Удалить упражнение"
                              style={{
                                
                                borderRadius: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                              }}
                            >
                              ✖
                            </button>
                          </div>
                        )}

                      </div>

                      {/* инфо */}
                      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                        Мышца: {ex.targetMuscle || "—"} · Подходов: {ex.sets?.length ?? 0}
                      </div>

                      {/* список подходов */}
                      {expandedIds.has(ex.id) && (
                        <>
                          {(ex.sets ?? []).length > 0 && (
                            <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
                              {(ex.sets ?? []).map((s) => (
                                <li
                                  key={s.id}
                                  className="setRow"
                                  style={{
                                    padding: "6px 0",
                                    fontSize: 14,
                                    display: "grid",
                                    gridTemplateColumns: "120px 120px 1fr auto",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  {/* reps */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <button
                                      type="button"
                                      onClick={() => adjustSetValue(ex.id, s.id, "reps", -1)}
                                      disabled={s.isDone || isViewOnly}
                                      style={{ padding: "4px 8px",  borderRadius: 8 }}
                                      aria-label="-1 повтор"
                                    >−1</button>
                                    <input
                                      key={`reps-${s.id}-${s.reps}`}
                                      type="number"
                                      inputMode="numeric"
                                      min="0"
                                      defaultValue={s.reps}
                                      disabled={s.isDone || isViewOnly}
                                      onBlur={(e) => {
                                        const v = Math.max(0, Number(e.currentTarget.value || 0));
                                        if (v === s.reps) return;
                                        if (isEditMode) {
                                          const copy = JSON.parse(JSON.stringify(editCopy || workout));
                                          const E = (copy.exercises || []).find((e) => e.id === ex.id);
                                          if (E) {
                                            const S = (E.sets || []).find((x) => x.id === s.id);
                                            if (S) S.reps = v;
                                          }
                                          setEditCopy(copy); setWorkout(copy);
                                        } else {
                                          updateSet(currentId, ex.id, s.id, { reps: v });
                                          setWorkout(getWorkout(currentId));
                                        }

                                      }}
                                      style={{
                                        padding: "6px 10px",
                                        
                                        borderRadius: 8,
                                        width: "100%",
                                        minWidth: 0,
                                      }}
                                      placeholder="Повторы"
                                      aria-label="Повторы"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => adjustSetValue(ex.id, s.id, "reps", +1)}
                                      disabled={s.isDone || isViewOnly}
                                      style={{ padding: "4px 8px", borderRadius: 8 }}
                                      aria-label="+1 повтор"
                                    >+1</button>
                                  </div>


                                  {/* weight */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <button
                                      type="button"
                                      onClick={() => adjustSetValue(ex.id, s.id, "weight", -2.5)}
                                      disabled={s.isDone || isViewOnly}
                                      style={{ padding: "4px 8px",  borderRadius: 8 }}
                                      aria-label="-2.5 кг"
                                    >−2.5</button>
                                    <input
                                      key={`weight-${s.id}-${s.weight}`}
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      min="0"
                                      defaultValue={s.weight}
                                      disabled={s.isDone || isViewOnly}
                                      onBlur={(e) => {
                                        const v = Math.max(0, Number(e.currentTarget.value || 0));
                                        if (v === s.weight) return;

                                        if (isEditMode) {
                                          const copy = JSON.parse(JSON.stringify(editCopy || workout));
                                          const E = (copy.exercises || []).find((e) => e.id === ex.id);
                                          if (E) {
                                            const S = (E.sets || []).find((x) => x.id === s.id);
                                            if (S) S.weight = v;
                                          }
                                          setEditCopy(copy); setWorkout(copy);
                                        } else {
                                          updateSet(currentId, ex.id, s.id, { weight: v });
                                          setWorkout(getWorkout(currentId));
                                        }

                                      }}
                                      style={{
                                        padding: "6px 10px",
                                        
                                        borderRadius: 8,
                                        width: "100%",
                                        minWidth: 0,
                                      }}
                                      placeholder="Вес"
                                      aria-label="Вес"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => adjustSetValue(ex.id, s.id, "weight", +2.5)}
                                      disabled={s.isDone || isViewOnly}
                                      style={{ padding: "4px 8px",  borderRadius: 8 }}
                                      aria-label="+2.5 кг"
                                    >+2.5</button>
                                  </div>


                                  {/* чекбокс "выполнен" */}
                                  <label
                                    className="doneCell"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      opacity: 0.9,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!s.isDone}
                                      disabled={isViewOnly}
                                      onChange={(e) => {
                                        const checked = e.currentTarget.checked;

                                        if (isEditMode) {
                                          const copy = JSON.parse(JSON.stringify(editCopy || workout));
                                          const E = (copy.exercises || []).find((e0) => e0.id === ex.id);
                                          if (E) {
                                            const S = (E.sets || []).find((x) => x.id === s.id);
                                            if (S) S.isDone = checked;
                                          }
                                          setEditCopy(copy);
                                          setWorkout(copy);
                                        } else {
                                          updateSet(currentId, ex.id, s.id, { isDone: checked });
                                          setWorkout(getWorkout(currentId));
                                        }
                                      }}
                                    />
                                    выполнен
                                  </label>

                                  {/* удалить подход */}
                                  {!isViewOnly && (
                                    <button
                                      className="delCell"
                                      onClick={() => {
                                        if (!confirm("Удалить подход?")) return;
                                        if (isEditMode) {
                                          const copy = clone(editCopy || workout);
                                          const E = (copy.exercises || []).find((e) => e.id === ex.id);
                                          if (E) E.sets = (E.sets || []).filter((x) => x.id !== s.id);
                                          setEditCopy(copy);
                                          setWorkout(copy);
                                        } else {
                                          removeSet(currentId, ex.id, s.id);
                                          setWorkout(getWorkout(currentId));
                                        }
                                      }}
                                      title="Удалить подход"
                                      style={{
                                        
                                        borderRadius: 8,
                                        padding: "2px 8px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      ✖
                                    </button>
                                  )}

                                </li>
                              ))}
                            </ul>
                          )}

                          {/* форма добавления подхода */}
                          {!isViewOnly && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const reps = Number(fd.get("reps") || 0);
                                const weight = Number(fd.get("weight") || 0);
                                if (!Number.isFinite(reps) || reps <= 0) return;
                                if (!Number.isFinite(weight) || weight < 0) return;

                                if (isEditMode) {
                                  const copy = clone(editCopy || workout);
                                  const E = (copy.exercises || []).find((e) => e.id === ex.id);
                                  if (E) {
                                    const set = { id: newId(), exerciseId: ex.id, reps, weight, isDone: false };
                                    E.sets = [...(E.sets || []), set];
                                  }
                                  setEditCopy(copy); setWorkout(copy);
                                } else {
                                  addSet(currentId, ex.id, { reps, weight });
                                  setWorkout(getWorkout(currentId));
                                }

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
                                  
                                  borderRadius: 8,
                                  width: "100%",
                                  minWidth: 0

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
                                  
                                  borderRadius: 8,
                                  width: "100%",
                                  minWidth: 0
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  padding: "6px 10px",
                                  
                                  borderRadius: 8,
                                  cursor: "pointer",
                                }}
                              >
                                ➕ Добавить подход
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              );
            })()  // ← ВАЖНО: вызываем IIFE!
          )}

          {/* добавить упражнение */}
          {!isViewOnly && (
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
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Exercise name (напр., Bench Press)"
                style={{
                  padding: "8px 10px",
                  
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
                  
                  borderRadius: 8,
                  flex: "1 1 180px",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "8px 12px",
                  
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ➕ Упражнение
              </button>
            </form>
          )}

          <div ref={bottomRef} />

          {/* нижняя кнопка: сохранить тренировку (только для черновика) */}
          {(workout.status ?? "draft") === "draft" && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <button
                onClick={handleCancel}
                className="btn w-full h-10"
              >
                Отменить
              </button>
              <button
                onClick={handleFinish}
                className="btn w-full h-10"
              >
              Сохранить тренировку
              </button>
            </div>
          )}

          {/* Нижние кнопки в режиме редактирования завершённой тренировки */}
          {isEditMode && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <button
                onClick={() => navigate(`/workout/${currentId}`)} // просто выходим из edit-режима
                className="btn w-full h-10"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (!editCopy) return navigate(`/workout/${currentId}`);
                  if (!confirm("Сохранить изменения в этой записи?")) return;
                  replaceWorkout(currentId, editCopy);
                  // после сохранения обновим состояние и выйдем из режима редактирования
                  const fresh = getWorkout(currentId);
                  setWorkout(fresh);
                  setEditCopy(null);
                  navigate(`/workout/${currentId}`);
                }}
                className="btn w-full h-10"
              >
                Сохранить изменения
              </button>
            </div>
          )}


          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate("/history")}
              style={{
                padding: "8px 12px",
                
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
