export const APP_STORAGE_KEY = "trainingTracker.v1";
export const RESET_HOUR = 23;
export const HISTORY_LIMIT_DAYS = 30;

/*
  Щоб додати новий блок вправи, достатньо додати ще один об'єкт у цей масив.

  mode:
  - reps: лише повтори
  - minutes: лише хвилини
  - noteMinutes: опис + хвилини
*/
export const EXERCISES = [
  { id: "warmup", name: "Зарядка", mode: "reps", color: "#eb6a5b" },
  { id: "squats", name: "Присід", mode: "reps", color: "#1f6f78" },
  { id: "toes", name: "На носках", mode: "reps", color: "#d18b1f" },
  { id: "pushups", name: "Віджимання", mode: "reps", color: "#8e5bd9" },
  { id: "good-morning", name: "Good Morning", mode: "reps", color: "#3f9c73" },
  { id: "bridge", name: "Напівміст", mode: "reps", color: "#d85f8f" },
  { id: "abs", name: "Прес", mode: "reps", color: "#4b78ff" },
  { id: "gym-floor", name: "Gym на підлозі", mode: "reps", color: "#ac5f2d" },
  { id: "gym-shishonina", name: "Gym Шишоніна", mode: "reps", color: "#2d8a92" },
  {
    id: "gym-stick-bands",
    name: "Gym з палкою та ризинками",
    mode: "reps",
    color: "#c64a44",
  },
  { id: "fitness", name: "Фітнес", mode: "noteMinutes", color: "#0f8b70" },
  { id: "plank", name: "Планка", mode: "minutes", color: "#6957cf" },
  { id: "kegel", name: "Кегель", mode: "reps", color: "#f07b48" },
];

export function getExerciseById(exerciseId) {
  return EXERCISES.find((exercise) => exercise.id === exerciseId) ?? null;
}

export function getModeLabel(mode) {
  if (mode === "noteMinutes") {
    return "Опис + Хв";
  }

  return mode === "minutes" ? "Хв" : "Пвт";
}

export function getSummaryUnit(mode) {
  return mode === "reps" ? "Пвт" : "Хв";
}
