// src/data/workouts.js
import { STORAGE_KEYS, loadJSON, saveJSON } from "../lib/storage.js";
import { uid } from "../lib/id.js";
import { todayISODate } from "../lib/dates.js";

/**
 * ==== МОДЕЛИ (JSDoc для подсказок в VS Code) ====
 * @typedef {'draft'|'done'} WorkoutStatus - статус тренировки: черновик (редактируется) или завершена.
 * 
 * @typedef {Object} SetModel       - один подход (повторы, вес, RPE, разминка и т.п.) внутри упражнения.
 * @property {string}   id           - уникальный id подхода
 * @property {string}   exerciseId   - ссылка на упражнение-владельца (ExerciseModel.id)
 * @property {number}   reps         - количество повторений в этом подходе
 * @property {number}   weight       - рабочий вес (в кг)
 * @property {number=}  rpe          - субъективная сложность по шкале RPE (1–10), опционально
 * @property {number=}  restSec      - время отдыха после подхода, в секундах, опционально
 * @property {boolean=} isWarmup    - флаг «разминочный подход», опционально
 *
 * @typedef {Object} ExerciseModel      - одно упражнение внутри тренировки (название, целевая мышца) + список подходов.
 * @property {string}     id            - уникальный id упражнения
 * @property {string}     workoutId     - ссылка на тренировку-владельца (WorkoutModel.id)
 * @property {string}     name          - название упражнения (например, "Жим лёжа")
 * @property {string=}    targetMuscle  - целевая мышечная группа (например, "грудь"), опционально
 * @property {SetModel[]} sets          - массив подходов этого упражнения
 *
 * @typedef {Object} WorkoutModel               - одна тренировка (дата, имя, заметки) + список упражнений.
 * @property {string}          id               - уникальный id тренировки
 * @property {string}          date             - дата тренировки в формате YYYY-MM-DD
 * @property {string=}         name             - название тренировки (например, "Грудь/трицепс"), опционально
 * @property {string=}         notes            - заметки к тренировке, опционально
 * @property {string=}         sourceWorkoutId  - id «источника», если тренировка создана копированием/шаблоном, опционально
 * @property {WorkoutStatus=}  status           - статус тренировки: черновик (редактируется) или завершена
 * @property {string=}         finishedAt       - дата и время завершения тренировки в ISO-формате, опционально
 * @property {ExerciseModel[]} exercises        - список упражнений в этой тренировке
 */

/** Приватная загрузка всех тренировок из localStorage */
function _loadAll() {
  const currentId = loadJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");
  /** @type {WorkoutModel[]} */
  const raw = loadJSON(STORAGE_KEYS.WORKOUTS, []);

  let changed = false;

  const normalized = raw.map((w) => {
    // --- Дата: если пустая/битая — берём finishedAt (день) или сегодня ---
    const hasValidDate = w.date && !Number.isNaN(Date.parse(w.date));
    const safeDate = hasValidDate
      ? w.date
      : (w.finishedAt ? String(w.finishedAt).slice(0, 10) : todayISODate());

    // --- Статус: если не задан — draft для текущей, иначе done ---
    const status = w.status ?? (w.id === currentId ? "draft" : "done");
    if (safeDate !== w.date || status !== w.status) changed = true;

    // --- Упражнения и подходы: нормализация ---
    const exercises = (Array.isArray(w.exercises) ? w.exercises : []).map((ex, ei) => {
      // position: по индексу, если не было
      const pos =
        typeof ex?.position === "number" && Number.isFinite(ex.position)
          ? ex.position
          : ei;
      if (pos !== ex.position) changed = true;

      // Нормализуем наборы (sets)
      const sets = (Array.isArray(ex.sets) ? ex.sets : []).map((s) => {
        const reps = Number.isFinite(Number(s?.reps)) ? Number(s.reps) : 0;
        const weight = Number.isFinite(Number(s?.weight)) ? Number(s.weight) : 0;
        const isDone = Boolean(s?.isDone); // дефолт false
        if (reps !== s.reps || weight !== s.weight || isDone !== s.isDone) {
          changed = true;
        }
        return {
          ...s,
          reps,
          weight,
          isDone,
        };
      });

      return {
        ...ex,
        position: pos,
        sets,
      };
    });

    return {
      ...w,
      date: safeDate,
      status,
      finishedAt: w.finishedAt ?? undefined,
      exercises,
    };
  });

  // Если что-то починили — один раз перезапишем в storage
  if (changed) {
    saveJSON(STORAGE_KEYS.WORKOUTS, normalized);
  }

  // Базовая сортировка по дате (для History мы уже сортируем по finishedAt отдельно)
  return normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** Приватная сохранение всех тренировок в localStorage */
function _saveAll(list) {
  saveJSON(STORAGE_KEYS.WORKOUTS, list);
}

/** Публично: получить список тренировок */
export function listWorkouts(opts = {} ) { 
  const all = _loadAll(); // загружаем все тренировки
  if (opts.onlyDone) return all.filter((w) => w.status === "done"); // если нужно только завершённые, фильтруем
  if (opts.onlyDraft) return all.filter((w) => w.status === "draft"); // если нужно только черновики, фильтруем
  return all; // иначе возвращаем все
}

/**
 * Публично: создать пустую тренировку (без упражнений)
 * @param {{date?: string, name?: string, notes?: string}} payload
 * @returns {WorkoutModel}
 */
export function createWorkout(payload = {}) {
  const w = { // создаём новую тренировку
    id: uid(),
    date: payload.date || todayISODate(),
    name: payload.name || "",
    notes: payload.notes || "",
    sourceWorkoutId: undefined,
    status: "draft",
    finishedAt: undefined,
    exercises: [],
  };

  const all = _loadAll(); // загружаем все тренировки
  all.push(w);            // добавляем новую
  saveJSON(STORAGE_KEYS.WORKOUTS, all); // сохраняем
  return w;
}

/**
 * Добавить упражнение в тренировку
 * @param {string} workoutId
 * @param {{ name: string, targetMuscle?: string }} payload
 * @returns {boolean} true если добавили, false если тренировка не найдена/ошибка
 */
export function addExercise(workoutId, { name, targetMuscle } = {}) {
  const all = listWorkouts();
  const idx = all.findIndex((w) => w.id === workoutId);
  if (idx === -1) return false;

  const exercise = {
    id: uid(),
    workoutId,
    name: name || "Exercise",
    targetMuscle: targetMuscle || undefined,
    sets: [],
    position: (all[idx].exercises?.length ?? 0), // ← ставим позицию в конец
  };

  // добавляем упражнение
  const updated = {
    ...all[idx],
    exercises: [...(all[idx].exercises || []), exercise],
  };
  all[idx] = updated;

  // сохраняем
  saveJSON(STORAGE_KEYS.WORKOUTS, all);
  return true;
}

/**
 * Добавить подход к упражнению
 * @param {string} workoutId
 * @param {string} exerciseId
 * @param {{ reps: number, weight: number, rpe?: number, restSec?: number, isWarmup?: boolean }} payload
 * @returns {boolean} true если добавили
 */

export function addSet(workoutId, exerciseId, payload) {
  const all = listWorkouts();
  const wIdx = all.findIndex((w) => w.id === workoutId);
  if (wIdx === -1) return false;

  const exList = all[wIdx].exercises || [];
  const exIdx = exList.findIndex((e) => e.id === exerciseId);
  if (exIdx === -1) return false;

  const ex = exList[exIdx];
  const set = {
    id: uid(),
    exerciseId,
    reps: Number(payload.reps ?? 0),
    weight: Number(payload.weight ?? 0),
    rpe: payload?.rpe,
    restSec: payload?.restSec,
    isWarmup: payload?.isWarmup ?? false,
  };

  const updatedExercise = { ...ex, sets: [...(ex.sets || []), set] };
  const updatedExercises = [...exList];
  updatedExercises[exIdx] = updatedExercise;

  all[wIdx] = { ...all[wIdx], exercises: updatedExercises };
  saveJSON(STORAGE_KEYS.WORKOUTS, all);
  return true;
}

/** Вернуть тренировку по id или null */
export function getWorkout(workoutId) {
  return _loadAll().find((w) => w.id === workoutId) || null;
} 

// удалить упражнение из тренировки
export function removeExercise(workoutId, exerciseId){
  const all = listWorkouts();
  const wIdx = all.findIndex((w) => w.id === workoutId);
  if (wIdx === -1) return false;

  const exList = all[wIdx].exercises || [];
  const nextEx = exList.filter((e) => e.id !== exerciseId);

  all[wIdx] = { ...all[wIdx], exercises: nextEx };
  saveJSON(STORAGE_KEYS.WORKOUTS, all);
  return true;
}

// создать новую тренировку на основе существующей (с копией упражнений и подходов)
// результат: НОВЫЙ ЧЕРНОВИК (status: 'draft'), становится текущим (CURRENT_WORKOUT_ID)
export function repeatWorkout(sourceWorkoutId, { date, name } = {}) {
  const all = _loadAll();
  const src = all.find((w) => w.id === sourceWorkoutId);
  if (!src) return null;

  const newWorkoutId = uid();

  const exercises = (src.exercises || []).map((ex) => {
    const newExId = uid();
    return {
      id: newExId,
      workoutId: newWorkoutId,
      name: ex.name,
      targetMuscle: ex.targetMuscle,
      sets: (ex.sets || []).map((s) => ({
        id: uid(),
        exerciseId: newExId,
        reps: Number(s.reps ?? 0),
        weight: Number(s.weight ?? 0),
        rpe: s.rpe,
        restSec: s.restSec,
        isWarmup: !!s.isWarmup,
        isDone: false, // все подходы в новом черновике — не выполнены
      })),
    };
  });

  const newWorkout = {
    id: newWorkoutId,
    date: date || todayISODate(),
    name: name ?? (src.name || ""),
    notes: "",
    sourceWorkoutId: src.id,
    status: "draft",       // ← новый — это черновик
    finishedAt: undefined, // ← ещё не завершён
    exercises,
  };

  all.push(newWorkout);
  saveJSON(STORAGE_KEYS.WORKOUTS, all);

  // делаем новый черновик текущим
  saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, newWorkoutId);

  return newWorkout;
}

// удалить подход из упражнения
export function removeSet(workoutId, exerciseId, setId) {
  // Загружаем все тренировки
  const all = listWorkouts();                             // Загружаем все тренировки
  const wIdx = all.findIndex((w) => w.id === workoutId);  // Ищем нужную тренировку
  if (wIdx === -1) return false;                          // Если тренировка не найдена, возвращаем false

  // Ищем нужное упражнение внутри тренировки
  const exList = all[wIdx].exercises || [];                   // Получаем список упражнений, если его нет, используем пустой массив
  const eIdx = exList.findIndex((e) => e.id === exerciseId);  // Ищем нужное упражнение внутри тренировки
  if (eIdx === -1) return false;                              // Если упражнение не найдено, возвращаем false

  // Фильтруем подходы, удаляя тот, который нужно удалить
  const ex = exList[eIdx];                                        // Получаем упражнение
  const nextSets = (ex.sets || []).filter((s) => s.id !== setId); // Фильтруем подходы, удаляя тот, который нужно удалить

  // Обновляем упражнение с новым списком подходов
  const updatedExercise = { ...ex, sets: nextSets };    // Обновляем упражнение с новым списком подходов
  const updatedExercises = [...exList];                 // Копируем список упражнений
  updatedExercises[eIdx] = updatedExercise;             // Обновляем упражнение в списке упражнений

  // Обновляем тренировку с новым списком упражнений
  all[wIdx] = { ...all[wIdx], exercises: updatedExercises };  // Обновляем тренировку с новым списком упражнений
  saveJSON(STORAGE_KEYS.WORKOUTS, all);                       // Сохраняем обновленный список тренировок
  return true;                                                // Возвращаем true, чтобы показать, что подход успешно удален
}

// эта функция может обновить reps, weight, isDone (передаём только нужные поля в changes)
export function updateSet(workoutId, exerciseId, setId, changes = {}) {
  const all = _loadAll();                          // Загружаем все тренировки
  const wIdx = all.findIndex((w) => w.id === workoutId); // Ищем нужную тренировку
  if (wIdx === -1) return false;

  const exList = all[wIdx].exercises || [];                  // Получаем список упражнений, если его нет, используем пустой массив
  const eIdx = exList.findIndex((e) => e.id === exerciseId); // Ищем нужное упражнение внутри тренировки
  if (eIdx === -1) return false;

  const sets = exList[eIdx].sets || [];               // Получаем список подходов, если его нет, используем пустой массив
  const sIdx = sets.findIndex((s) => s.id === setId); // Ищем нужный подход внутри упражнения
  if (sIdx === -1) return false;

  const cur = sets[sIdx]; // текущий подход
  const next = { // обновлённый подход
    ...cur, // копируем текущий подход
    reps: changes.hasOwnProperty("reps") ? 
    Math.max(0, Number(changes.reps) || 0 ) : 
    cur.reps, // обновляем reps, если передано в changes

    weight: changes.hasOwnProperty("weight") ?
    Math.max(0, Number(changes.weight) || 0 ) :
    cur.weight, // обновляем weight, если передано в changes

    isDone: changes.hasOwnProperty("isDone") ?
    Boolean(changes.isDone) : 
    (cur.isDone ?? false), // обновляем isDone, если передано в changes
  };

  const nextSets = [...sets]; // копируем массив подходов
  nextSets[sIdx] = next;      // обновляем нужный подход в массиве

  const nextExList = [...exList];                         // копируем массив упражнений
  nextExList[eIdx] = { ...exList[eIdx], sets: nextSets }; // обновляем упражнение с новым массивом подходов

  all[wIdx] = { ...all[wIdx], exercises: nextExList }; // обновляем тренировку с новым массивом упражнений
  saveJSON(STORAGE_KEYS.WORKOUTS, all);                 // сохраняем обновлённый список тренировок
  return true;
}

// обновить дату/имя/заметки тренировки
export function updateWorkoutMeta(workoutId, changes = {}) {
  const all = listWorkouts();                           // Загружаем все тренировки
  const idx = all.findIndex((w) => w.id === workoutId); // Ищем нужную тренировку
  if (idx === -1) return false;                          // Если тренировка не найдена, возвращаем false

  const w = all[idx];             // Получаем тренировку
  const next = {
    ...w,                         // Копируем текущую тренировку
    date: changes.date ?? w.date, // Обновляем дату, если передана в changes
    name: changes.name ?? w.name, // Обновляем имя, если передано в changes
    notes: changes.notes ?? w.notes, // Обновляем заметки, если переданы в changes
  };

  all[idx] = next;                      // Обновляем тренировку в списке
  saveJSON(STORAGE_KEYS.WORKOUTS, all); // Сохраняем обновленный список тренировок
  return true;                          // Возвращаем true, чтобы показать, что обновление прошло успешно

}

// Завершить тренировку: становится 'done', сохраняем finishedAt и сбрасываем CURRENT_WORKOUT_ID
export function finishWorkout(workoutId, finishedAtISO) {
  const all = listWorkouts();
  const idx = all.findIndex((w) => w.id === workoutId);
  if (idx === -1) return false;

  const when = finishedAtISO || new Date().toISOString();       // если не передано, ставим текущее время
  all[idx] = { ...all[idx], status: "done", finishedAt: when }; // обновляем статус и время завершения
  saveJSON(STORAGE_KEYS.WORKOUTS, all); 

  const currentId = loadJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, ""); // текущая тренировка (черновик)
  if (currentId === workoutId) {
    saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");                  // сбрасываем текущую тренировку, если это она
  }
  return true;
}

// Удобно получить текущий черновик (если он есть и действительно draft)
export function getDraftWorkout() {
  const currentId = loadJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, ""); // текущая тренировка (черновик)
  if (!currentId) return null;                                      // если нет текущей, возвращаем null
  const w = getWorkout(currentId);                                  // получаем тренировку по id
  if (!w) return null;                                              // если не нашли, возвращаем null
  return (w.status ?? "draft") === "draft" ? w : null;              // если статус не draft, возвращаем null
}

// удалить тренировку (используем для "Отменить" черновик)
export function deleteWorkout(workoutId) {
  const all = _loadAll();                               // загружаем все тренировки
  const idx = all.findIndex((w) => w.id === workoutId); // ищем нужную
  if (idx === -1) return false;

  const next = [...all.slice(0, idx), ...all.slice(idx + 1)]; // создаём новый массив без этой тренировки
  saveJSON(STORAGE_KEYS.WORKOUTS, next);                       // сохраняем

  // если удаляем текущий черновик — очищаем указатель
  const currentId = loadJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, ""); // текущая тренировка (черновик)
  if (currentId === workoutId) {                       // если это она
    saveJSON(STORAGE_KEYS.CURRENT_WORKOUT_ID, "");     // сбрасываем текущую тренировку
  }
  return true;
}

// внутренняя: отсортировать и перенумеровать позиции 0..N-1
function _normalizePositions(exercises) { 
  const list = Array.isArray(exercises) ? exercises.slice() : []; // копия массива
  list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); // сортируем по позиции
  return list.map((ex, i) => ({ ...ex, position: i })); // перенумеровываем позиции
}

// переместить упражнение внутри тренировки (up или down)
export function moveExercise(workoutId, exerciseId, direction /* 'up' | 'down' */) {
  const all = _loadAll();
  const wIdx = all.findIndex((w) => w.id === workoutId);
  if (wIdx === -1) return false;

  const list = Array.isArray(all[wIdx].exercises) ? [...all[wIdx].exercises] : [];
  if (list.length < 2) return false;

  // 1) нормализуем текущие позиции 0..N-1
  list
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .forEach((ex, i) => { ex.position = i; });

  // 2) ищем элемент и рассчитываем цель
  const idx = list.findIndex((e) => e.id === exerciseId);
  if (idx === -1) return false;

  const delta = direction === "up" ? -1 : 1;
  const target = idx + delta;
  if (target < 0 || target >= list.length) return false;

  // 3) двигаем: вырезаем и вставляем на новую позицию
  const [moved] = list.splice(idx, 1);
  list.splice(target, 0, moved);

  // 4) снова проставим позиции последовательно
  list.forEach((ex, i) => { ex.position = i; });

  // 5) сохраним
  all[wIdx] = { ...all[wIdx], exercises: list };
  saveJSON(STORAGE_KEYS.WORKOUTS, all);
  return true;
}

// Полностью заменить содержимое тренировки (без смены id/status/finishedAt)
export function replaceWorkout(workoutId, next) {
  const all = _loadAll();                             // загружаем все тренировки
  const idx = all.findIndex((w) => w.id === workoutId); // ищем нужную
  if (idx === -1) return false;

  const orig = all[idx];

  // Санитизируем упражнения/подходы (позиции и числовые поля)
  const exercises = (Array.isArray(next?.exercises) ? next.exercises : []).map((ex, i) => {
    const position = Number.isFinite(ex?.position) ? Number(ex.position) : i;
    const sets = (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
      ...s,
      reps: Math.max(0, Number(s?.reps || 0)),
      weight: Math.max(0, Number(s?.weight || 0)),
      isDone: !!s?.isDone,
    }));
    return {...ex,  position, sets };
  });

  const updated = {
    ...orig, // сохраняем id, status, finishedAt
    date: next?.date ?? orig.date,
    name: next?.name ?? orig.name,
    notes: next?.notes ?? orig.notes,
    exercises,
    // id, status, finishedAt сохраняем как были
  };

  all[idx] = updated;
  saveJSON(STORAGE_KEYS.WORKOUTS, all);
  return true;

}