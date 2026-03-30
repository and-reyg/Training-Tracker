export const BREATHING_STORAGE_KEY = "trainingTracker.breathing.v1";
export const BREATHING_HISTORY_LIMIT_DAYS = 30;

/*
  Базовий список дихальних вправ.
  Можна спокійно змінювати назви, додавати нові або прибирати зайві блоки.
*/
export const BREATHING_EXERCISES = [
  { id: "diaphragm", name: "Діафрагмальне дихання", color: "#1f6f78" },
  { id: "box", name: "Квадратне дихання", color: "#e86d5b" },
  { id: "slow-exhale", name: "Повільний видих", color: "#5f78d6" },
  { id: "deep-breath", name: "Глибокий вдих", color: "#b96b32" },
  { id: "calm-rhythm", name: "Спокійний ритм", color: "#6b58b5" },
];

export function getBreathingExerciseById(exerciseId) {
  return BREATHING_EXERCISES.find((exercise) => exercise.id === exerciseId) ?? null;
}
