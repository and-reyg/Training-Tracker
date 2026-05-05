import { formatDateKey, getBusinessDateKey } from "./storage.js";

export const STRENGTH_STORAGE_KEY = "trainingTracker.Strength";
const STRENGTH_HISTORY_LIMIT_DAYS = 30;

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultState() {
  return {
    version: 2,
    exercises: [],
    currentDay: {
      date: getBusinessDateKey(),
      entriesByExercise: {},
    },
    history: [],
  };
}

function safeReadStorage() {
  try {
    const rawValue = localStorage.getItem(STRENGTH_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Не вдалося прочитати strength localStorage:", error);
    return null;
  }
}

function safeWriteStorage(state) {
  try {
    localStorage.setItem(STRENGTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Не вдалося записати strength localStorage:", error);
  }
}

function normalizeExercise(rawExercise) {
  if (!rawExercise || typeof rawExercise !== "object") {
    return null;
  }

  const name = String(rawExercise.name ?? "").trim();

  if (!name) {
    return null;
  }

  return {
    id: typeof rawExercise.id === "string" ? rawExercise.id : createId("strength-exercise"),
    name,
    createdAt:
      typeof rawExercise.createdAt === "string" ? rawExercise.createdAt : new Date().toISOString(),
  };
}

function normalizeSet(rawSet) {
  if (!rawSet || typeof rawSet !== "object") {
    return null;
  }

  const weight = Number(rawSet.weight);
  const reps = Number(rawSet.reps);

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return null;
  }

  return {
    id: typeof rawSet.id === "string" ? rawSet.id : createId("strength-set"),
    weight,
    reps,
    createdAt: typeof rawSet.createdAt === "string" ? rawSet.createdAt : new Date().toISOString(),
  };
}

function normalizeCurrentDay(rawCurrentDay, exercises) {
  const currentDay = {
    date: typeof rawCurrentDay?.date === "string" ? rawCurrentDay.date : getBusinessDateKey(),
    entriesByExercise: {},
  };

  exercises.forEach((exercise) => {
    const rawSets = Array.isArray(rawCurrentDay?.entriesByExercise?.[exercise.id])
      ? rawCurrentDay.entriesByExercise[exercise.id]
      : [];

    currentDay.entriesByExercise[exercise.id] = rawSets.map(normalizeSet).filter(Boolean);
  });

  return currentDay;
}

function normalizeHistoryDay(rawDay) {
  if (!rawDay || typeof rawDay !== "object" || typeof rawDay.date !== "string") {
    return null;
  }

  const rows = Array.isArray(rawDay.rows)
    ? rawDay.rows
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }

          const exerciseId = typeof row.exerciseId === "string" ? row.exerciseId : "";
          const exerciseName = String(row.exerciseName ?? "").trim();
          const sets = Array.isArray(row.sets) ? row.sets.map(normalizeSet).filter(Boolean) : [];

          if (!exerciseId || !exerciseName || !sets.length) {
            return null;
          }

          return {
            exerciseId,
            exerciseName,
            createdAt:
              typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
            sets,
          };
        })
        .filter(Boolean)
    : [];

  if (!rows.length) {
    return null;
  }

  return {
    date: rawDay.date,
    rows,
  };
}

function migrateLegacyRows(rawEntries = []) {
  const grouped = new Map();

  rawEntries.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const date = typeof entry.date === "string" ? entry.date : "";
    const exerciseId = typeof entry.exerciseId === "string" ? entry.exerciseId : "";
    const exerciseName = String(entry.exerciseName ?? "").trim();
    const set = normalizeSet(entry);

    if (!date || !exerciseId || !exerciseName || !set) {
      return;
    }

    const dayBucket = grouped.get(date) ?? new Map();
    const rowKey = `${exerciseId}__${exerciseName}`;
    const row = dayBucket.get(rowKey) ?? {
      exerciseId,
      exerciseName,
      createdAt: set.createdAt,
      sets: [],
    };

    row.sets.push(set);
    if (set.createdAt > row.createdAt) {
      row.createdAt = set.createdAt;
    }

    dayBucket.set(rowKey, row);
    grouped.set(date, dayBucket);
  });

  const days = [...grouped.entries()]
    .map(([date, dayRows]) => ({
      date,
      rows: [...dayRows.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-STRENGTH_HISTORY_LIMIT_DAYS);

  return days;
}

function normalizeState(rawState) {
  const base = rawState && typeof rawState === "object" ? rawState : createDefaultState();
  const exercises = Array.isArray(base.exercises)
    ? base.exercises.map(normalizeExercise).filter(Boolean)
    : [];

  const currentDay = normalizeCurrentDay(base.currentDay, exercises);

  let history = [];
  if (Array.isArray(base.history)) {
    history = base.history.map(normalizeHistoryDay).filter(Boolean);
  } else if (Array.isArray(base.entries)) {
    history = migrateLegacyRows(base.entries);
  }

  history.sort((a, b) => a.date.localeCompare(b.date));
  history = history.slice(-STRENGTH_HISTORY_LIMIT_DAYS);

  return {
    version: 2,
    exercises,
    currentDay,
    history,
  };
}

function hasAnyCurrentSets(currentDay) {
  return Object.values(currentDay.entriesByExercise).some((sets) => sets.length > 0);
}

function buildHistoryDayFromCurrent(state) {
  const rows = state.exercises
    .map((exercise) => {
      const sets = state.currentDay.entriesByExercise[exercise.id] ?? [];

      if (!sets.length) {
        return null;
      }

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        createdAt: sets[sets.length - 1]?.createdAt ?? new Date().toISOString(),
        sets: sets.map((set) => ({ ...set })),
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return {
    date: state.currentDay.date,
    rows,
  };
}

function upsertHistoryDay(history, historyDay) {
  const withoutCurrentDate = history.filter((day) => day.date !== historyDay.date);
  withoutCurrentDate.push(historyDay);
  withoutCurrentDate.sort((a, b) => a.date.localeCompare(b.date));
  return withoutCurrentDate.slice(-STRENGTH_HISTORY_LIMIT_DAYS);
}

function createEmptyEntriesByExercise(exercises) {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, []]));
}

function ensureFreshState() {
  const state = normalizeState(safeReadStorage());
  const todayKey = getBusinessDateKey();

  if (state.currentDay.date !== todayKey) {
    if (hasAnyCurrentSets(state.currentDay)) {
      const historyDay = buildHistoryDayFromCurrent(state);
      if (historyDay) {
        state.history = upsertHistoryDay(state.history, historyDay);
      }
    }

    state.currentDay = {
      date: todayKey,
      entriesByExercise: createEmptyEntriesByExercise(state.exercises),
    };
  } else {
    state.exercises.forEach((exercise) => {
      if (!Array.isArray(state.currentDay.entriesByExercise[exercise.id])) {
        state.currentDay.entriesByExercise[exercise.id] = [];
      }
    });
  }

  safeWriteStorage(state);
  return state;
}

function mutateState(mutator) {
  const state = ensureFreshState();
  mutator(state);
  safeWriteStorage(state);
  return state;
}

export function getStrengthStateSnapshot() {
  return ensureFreshState();
}

export function addStrengthExercise(name) {
  return mutateState((state) => {
    const normalizedName = String(name).trim();

    if (!normalizedName) {
      return;
    }

    const id = createId("strength-exercise");
    state.exercises.push({
      id,
      name: normalizedName,
      createdAt: new Date().toISOString(),
    });
    state.currentDay.entriesByExercise[id] = [];
  });
}

export function renameStrengthExercise(exerciseId, nextName) {
  return mutateState((state) => {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    const normalizedName = String(nextName).trim();

    if (!exercise || !normalizedName) {
      return;
    }

    exercise.name = normalizedName;
  });
}

export function deleteStrengthExercise(exerciseId) {
  return mutateState((state) => {
    state.exercises = state.exercises.filter((exercise) => exercise.id !== exerciseId);
    delete state.currentDay.entriesByExercise[exerciseId];
  });
}

function buildSet(values, existingSet = null) {
  return {
    id: existingSet?.id ?? createId("strength-set"),
    weight: Number(values.weight),
    reps: Number(values.reps),
    createdAt: existingSet?.createdAt ?? new Date().toISOString(),
  };
}

export function addStrengthEntry(exerciseId, values) {
  return mutateState((state) => {
    const exercise = state.exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      return;
    }

    const weight = Number(values.weight);
    const reps = Number(values.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      return;
    }

    const list = state.currentDay.entriesByExercise[exerciseId] ?? [];
    list.push(buildSet(values));
    state.currentDay.entriesByExercise[exerciseId] = list;
  });
}

export function updateStrengthEntry(exerciseId, entryId, values) {
  return mutateState((state) => {
    const list = state.currentDay.entriesByExercise[exerciseId];

    if (!Array.isArray(list)) {
      return;
    }

    const index = list.findIndex((item) => item.id === entryId);
    if (index === -1) {
      return;
    }

    const weight = Number(values.weight);
    const reps = Number(values.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      return;
    }

    list[index] = buildSet(values, list[index]);
  });
}

export function deleteStrengthEntry(exerciseId, entryId) {
  return mutateState((state) => {
    const list = state.currentDay.entriesByExercise[exerciseId];

    if (!Array.isArray(list)) {
      return;
    }

    state.currentDay.entriesByExercise[exerciseId] = list.filter((entry) => entry.id !== entryId);
  });
}

export function getStrengthEntriesByExercise(state, exerciseId) {
  const list = state.currentDay.entriesByExercise[exerciseId];
  return Array.isArray(list) ? list : [];
}

export function getStrengthExerciseStats(state, exerciseId) {
  const entries = getStrengthEntriesByExercise(state, exerciseId);

  return {
    setCount: entries.length,
    lastSet: entries.length
      ? `${entries[entries.length - 1].weight} кг / ${entries[entries.length - 1].reps} Пвт`
      : "—",
  };
}

export function getStrengthTableData(state) {
  const todayRows = state.exercises
    .map((exercise) => {
      const sets = getStrengthEntriesByExercise(state, exercise.id);
      if (!sets.length) {
        return null;
      }

      return {
        date: state.currentDay.date,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        createdAt: sets[sets.length - 1].createdAt,
        sets: sets.map((set) => ({ ...set })),
      };
    })
    .filter(Boolean);

  const rows = [...state.history, { date: state.currentDay.date, rows: todayRows }]
    .flatMap((day) =>
      day.rows.map((row) => ({
        date: day.date,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        createdAt: row.createdAt,
        formattedDate: formatDateKey(day.date, "short"),
        sets: [...row.sets].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      })),
    )
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });

  const maxSets = Math.max(1, ...rows.map((row) => row.sets.length));

  return {
    rows,
    maxSets,
  };
}
