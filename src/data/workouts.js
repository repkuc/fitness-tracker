// src/data/workouts.js
import { STORAGE_KEYS, loadJSON, saveJSON } from "../lib/storage.js";
import { uid } from "../lib/id.js";
import { todayISODate } from "../lib/dates.js";

/**
 * ==== МОДЕЛИ (JSDoc для подсказок в VS Code) ====
 * @typedef {Object} SetModel       - один подход (повторы, вес, RPE, разминка и т.п.) внутри упражнения.
 * @property {string}  id           - уникальный id подхода
 * @property {string}  exerciseId   - ссылка на упражнение-владельца (ExerciseModel.id)
 * @property {number}  reps         - количество повторений в этом подходе
 * @property {number}  weight       - рабочий вес (в кг)
 * @property {number=} rpe          - субъективная сложность по шкале RPE (1–10), опционально
 * @property {number=} restSec      - время отдыха после подхода, в секундах, опционально
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
 * @property {ExerciseModel[]} exercises        - список упражнений в этой тренировке
 */

/** Приватная загрузка всех тренировок из localStorage */
function _loadAll() {
  /** @type {WorkoutModel[]} */
  const all = loadJSON(STORAGE_KEYS.WORKOUTS, []);
  // сортировка по дате по убыванию
  return all.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** Приватная сохранение всех тренировок в localStorage */
function _saveAll(list) {
  saveJSON(STORAGE_KEYS.WORKOUTS, list);
}

/** Публично: получить список тренировок */
export function listWorkouts() {
  return _loadAll();
}

/**
 * Публично: создать пустую тренировку (без упражнений)
 * @param {{date?: string, name?: string, notes?: string}} payload
 * @returns {WorkoutModel}
 */
export function createWorkout(payload = {}) {
  const w = {
    id: uid(),
    date: payload.date || todayISODate(),
    name: payload.name || "",
    notes: payload.notes || "",
    sourceWorkoutId: undefined,
    exercises: [],
  };

  const all = _loadAll();
  all.push(w);
  _saveAll(all);
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
    reps: Number(payload.reps || 0),
    weight: Number(payload.weight || 0),
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