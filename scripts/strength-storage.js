import { formatDateKey } from "./storage.js";

export const STRENGTH_STORAGE_KEY = "trainingTracker.Strength";

function getKyivTodayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = {};
  formatter.formatToParts(new Date()).forEach((part) => {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  });

  return `${parts.year}-${parts.month}-${parts.day}`;
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

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function normalizeEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  const weight = Number(rawEntry.weight);
  const reps = Number(rawEntry.reps);

  if (!weight || !reps) {
    return null;
  }

  return {
    id: typeof rawEntry.id === "string" ? rawEntry.id : createId("strength-entry"),
    exerciseId: typeof rawEntry.exerciseId === "string" ? rawEntry.exerciseId : "",
    exerciseName: String(rawEntry.exerciseName ?? "").trim(),
    date: typeof rawEntry.date === "string" ? rawEntry.date : getKyivTodayKey(),
    weight,
    reps,
    createdAt:
      typeof rawEntry.createdAt === "string" ? rawEntry.createdAt : new Date().toISOString(),
  };
}

function flattenLegacySessions(rawSessions = []) {
  return rawSessions.flatMap((session) => {
    if (!session || typeof session !== "object" || !Array.isArray(session.sets)) {
      return [];
    }

    return session.sets
      .map((set, index) =>
        normalizeEntry({
          id: `${session.id ?? createId("legacy-session")}-${index + 1}`,
          exerciseId: session.exerciseId,
          exerciseName: session.exerciseName,
          date: session.date,
          weight: set?.weight,
          reps: set?.reps,
          createdAt: session.createdAt,
        }),
      )
      .filter(Boolean);
  });
}

function createDefaultState() {
  return {
    version: 1,
    exercises: [],
    entries: [],
  };
}

function sortEntries(firstEntry, secondEntry) {
  const dateComparison = secondEntry.date.localeCompare(firstEntry.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return secondEntry.createdAt.localeCompare(firstEntry.createdAt);
}

function normalizeState(rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : createDefaultState();
  const exercises = Array.isArray(state.exercises)
    ? state.exercises.map(normalizeExercise).filter(Boolean)
    : [];
  const directEntries = Array.isArray(state.entries)
    ? state.entries.map(normalizeEntry).filter(Boolean)
    : [];
  const legacyEntries = Array.isArray(state.sessions) ? flattenLegacySessions(state.sessions) : [];
  const entries = [...directEntries, ...legacyEntries];

  exercises.sort((firstExercise, secondExercise) =>
    firstExercise.createdAt.localeCompare(secondExercise.createdAt),
  );
  entries.sort(sortEntries);

  return {
    version: 1,
    exercises,
    entries,
  };
}

function getState() {
  const state = normalizeState(safeReadStorage());
  safeWriteStorage(state);
  return state;
}

function mutateState(mutator) {
  const state = getState();
  mutator(state);
  state.entries.sort(sortEntries);
  safeWriteStorage(state);
  return state;
}

export function getStrengthStateSnapshot() {
  return getState();
}

export function addStrengthExercise(name) {
  return mutateState((state) => {
    state.exercises.push({
      id: createId("strength-exercise"),
      name: String(name).trim(),
      createdAt: new Date().toISOString(),
    });
  });
}

export function renameStrengthExercise(exerciseId, nextName) {
  return mutateState((state) => {
    const exercise = state.exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      return;
    }

    exercise.name = String(nextName).trim();

    state.entries.forEach((entry) => {
      if (entry.exerciseId === exerciseId) {
        entry.exerciseName = exercise.name;
      }
    });
  });
}

export function deleteStrengthExercise(exerciseId) {
  return mutateState((state) => {
    state.exercises = state.exercises.filter((exercise) => exercise.id !== exerciseId);
    state.entries = state.entries.filter((entry) => entry.exerciseId !== exerciseId);
  });
}

function buildEntry(exerciseId, exerciseName, values, existingEntry = null) {
  return {
    id: existingEntry?.id ?? createId("strength-entry"),
    exerciseId,
    exerciseName,
    date: existingEntry?.date ?? getKyivTodayKey(),
    weight: Number(values.weight),
    reps: Number(values.reps),
    createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
  };
}

export function addStrengthEntry(exerciseId, values) {
  return mutateState((state) => {
    const exercise = state.exercises.find((item) => item.id === exerciseId);

    if (!exercise) {
      return;
    }

    state.entries.push(buildEntry(exerciseId, exercise.name, values));
  });
}

export function updateStrengthEntry(entryId, values) {
  return mutateState((state) => {
    const entryIndex = state.entries.findIndex((entry) => entry.id === entryId);

    if (entryIndex === -1) {
      return;
    }

    const currentEntry = state.entries[entryIndex];
    state.entries[entryIndex] = buildEntry(
      currentEntry.exerciseId,
      currentEntry.exerciseName,
      values,
      currentEntry,
    );
  });
}

export function deleteStrengthEntry(entryId) {
  return mutateState((state) => {
    state.entries = state.entries.filter((entry) => entry.id !== entryId);
  });
}

export function getStrengthEntriesByExercise(state, exerciseId) {
  return state.entries.filter((entry) => entry.exerciseId === exerciseId);
}

export function getStrengthExerciseStats(state, exerciseId) {
  const entries = getStrengthEntriesByExercise(state, exerciseId);

  return {
    entryCount: entries.length,
    latestDate: entries.length ? formatDateKey(entries[0].date, "full") : "—",
  };
}

export function formatStrengthEntry(entry) {
  return `${entry.weight} кг • ${entry.reps} Пвт`;
}

export function getStrengthTableData(state) {
  const grouped = new Map();

  state.entries.forEach((entry) => {
    const key = `${entry.date}__${entry.exerciseId}`;
    const currentRow = grouped.get(key);

    if (currentRow) {
      currentRow.sets.push({
        weight: entry.weight,
        reps: entry.reps,
        createdAt: entry.createdAt,
      });
      if (entry.createdAt > currentRow.createdAt) {
        currentRow.createdAt = entry.createdAt;
      }
      return;
    }

    grouped.set(key, {
      date: entry.date,
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      createdAt: entry.createdAt,
      sets: [
        {
          weight: entry.weight,
          reps: entry.reps,
          createdAt: entry.createdAt,
        },
      ],
    });
  });

  const rows = [...grouped.values()]
    .map((row) => ({
      ...row,
      formattedDate: formatDateKey(row.date, "short"),
      sets: row.sets
        .sort((firstSet, secondSet) => firstSet.createdAt.localeCompare(secondSet.createdAt))
        .map(({ weight, reps }) => ({ weight, reps })),
    }))
    .sort((firstRow, secondRow) => {
      const dateComparison = secondRow.date.localeCompare(firstRow.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return secondRow.createdAt.localeCompare(firstRow.createdAt);
    });

  const maxSets = Math.max(1, ...rows.map((row) => row.sets.length));

  return {
    rows,
    maxSets,
  };
}
