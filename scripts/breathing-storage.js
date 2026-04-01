import {
  BREATHING_EXERCISES,
  BREATHING_HISTORY_LIMIT_DAYS,
  BREATHING_STORAGE_KEY,
  getBreathingExerciseById,
} from "./breathing-config.js";
import { getBusinessDateKey, shiftDateKey } from "./storage.js";

function createEmptyEntries() {
  return Object.fromEntries(BREATHING_EXERCISES.map((exercise) => [exercise.id, []]));
}

function createDay(dateKey = "") {
  return {
    date: dateKey,
    entries: createEmptyEntries(),
  };
}

function createDefaultState() {
  return {
    version: 1,
    currentDay: createDay(getBusinessDateKey()),
    history: [],
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeReadStorage() {
  try {
    const rawValue = localStorage.getItem(BREATHING_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Не вдалося прочитати breathing localStorage:", error);
    return null;
  }
}

function safeWriteStorage(state) {
  try {
    localStorage.setItem(BREATHING_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Не вдалося записати breathing localStorage:", error);
  }
}

function createEntryId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `breathing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  return {
    id: typeof rawEntry.id === "string" ? rawEntry.id : createEntryId(),
    note: typeof rawEntry.note === "string" ? rawEntry.note.trim() : "",
    reps: Math.max(0, Number(rawEntry.reps) || 0),
    minutes: Math.max(0, Number(rawEntry.minutes) || 0),
    createdAt:
      typeof rawEntry.createdAt === "string" ? rawEntry.createdAt : new Date().toISOString(),
  };
}

function normalizeDay(rawDay) {
  const normalizedDay = createDay(
    typeof rawDay?.date === "string" ? rawDay.date : getBusinessDateKey(),
  );

  BREATHING_EXERCISES.forEach((exercise) => {
    const rawEntries = Array.isArray(rawDay?.entries?.[exercise.id]) ? rawDay.entries[exercise.id] : [];

    normalizedDay.entries[exercise.id] = rawEntries
      .map(normalizeEntry)
      .filter(Boolean);
  });

  return normalizedDay;
}

function normalizeState(rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : createDefaultState();
  const currentDay = normalizeDay(state.currentDay);
  const history = Array.isArray(state.history) ? state.history.map(normalizeDay) : [];

  history.sort((firstDay, secondDay) => firstDay.date.localeCompare(secondDay.date));

  return {
    version: 1,
    currentDay,
    history: history.slice(-BREATHING_HISTORY_LIMIT_DAYS),
  };
}

function dayHasEntries(day) {
  return Object.values(day.entries).some((items) => items.length > 0);
}

function mergeDayIntoHistory(history, day) {
  if (!day.date || !dayHasEntries(day)) {
    return history.slice(-BREATHING_HISTORY_LIMIT_DAYS);
  }

  const nextHistory = history.filter((historyDay) => historyDay.date !== day.date);
  nextHistory.push(deepClone(day));
  nextHistory.sort((firstDay, secondDay) => firstDay.date.localeCompare(secondDay.date));
  return nextHistory.slice(-BREATHING_HISTORY_LIMIT_DAYS);
}

function ensureFreshState() {
  const state = normalizeState(safeReadStorage());
  const activeDate = getBusinessDateKey();

  if (state.currentDay.date !== activeDate) {
    state.history = mergeDayIntoHistory(state.history, state.currentDay);
    state.currentDay = createDay(activeDate);
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

function buildEntry(values, existingEntry = null) {
  return {
    id: existingEntry?.id ?? createEntryId(),
    note: String(values.note ?? "").trim(),
    reps: Math.max(0, Number(values.reps) || 0),
    minutes: Math.max(0, Number(values.minutes) || 0),
    createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
  };
}

export function getBreathingStateSnapshot() {
  return ensureFreshState();
}

export function addBreathingEntry(exerciseId, values) {
  return mutateState((state) => {
    if (!getBreathingExerciseById(exerciseId)) {
      return;
    }

    state.currentDay.entries[exerciseId].push(buildEntry(values));
  });
}

export function updateBreathingEntry(exerciseId, entryId, values) {
  return mutateState((state) => {
    const entries = state.currentDay.entries[exerciseId];

    if (!entries) {
      return;
    }

    const entryIndex = entries.findIndex((entry) => entry.id === entryId);

    if (entryIndex === -1) {
      return;
    }

    entries[entryIndex] = buildEntry(values, entries[entryIndex]);
  });
}

export function deleteBreathingEntry(exerciseId, entryId) {
  return mutateState((state) => {
    const entries = state.currentDay.entries[exerciseId];

    if (!entries) {
      return;
    }

    state.currentDay.entries[exerciseId] = entries.filter((entry) => entry.id !== entryId);
  });
}

export function getBreathingEntriesForToday(state, exerciseId) {
  return state.currentDay.entries[exerciseId] ?? [];
}

function getTotals(entries = []) {
  return entries.reduce(
    (totals, entry) => ({
      reps: totals.reps + (entry.reps || 0),
      minutes: totals.minutes + (entry.minutes || 0),
      count: totals.count + 1,
    }),
    { reps: 0, minutes: 0, count: 0 },
  );
}

export function getBreathingTodayTotals(state, exerciseId) {
  return getTotals(getBreathingEntriesForToday(state, exerciseId));
}

export function getBreathingYesterdayTotals(state, exerciseId) {
  const yesterdayKey = shiftDateKey(state.currentDay.date, -1);
  const yesterday = state.history.find((day) => day.date === yesterdayKey);

  if (!yesterday) {
    return null;
  }

  return getTotals(yesterday.entries[exerciseId]);
}

export function formatBreathingTotals(totals) {
  if (totals.reps > 0) {
    return `${totals.reps} Пвт • ${totals.minutes} Хв`;
  }

  return `${totals.count} зап. • ${totals.minutes} Хв`;
}

export function formatBreathingEntryValue(entry) {
  const parts = [];

  if (entry.note) {
    parts.push(entry.note);
  }

  if (entry.reps > 0) {
    parts.push(`${entry.reps} Пвт`);
  }

  parts.push(`${entry.minutes} Хв`);

  return parts.join(" • ");
}

export function getBreathingReviewRows(state) {
  const rows = [];
  const days = [...state.history, state.currentDay];

  days.forEach((day) => {
    BREATHING_EXERCISES.forEach((exercise) => {
      const entries = day.entries[exercise.id] ?? [];

      entries.forEach((entry) => {
        const contentParts = [];

        if (entry.note) {
          contentParts.push(entry.note);
        }

        if (entry.reps > 0) {
          contentParts.push(`${entry.reps} Пвт`);
        }

        rows.push({
          id: entry.id,
          date: day.date,
          exerciseName: exercise.name,
          content: contentParts.length ? contentParts.join(" • ") : "—",
          minutes: entry.minutes,
          createdAt: entry.createdAt,
        });
      });
    });
  });

  rows.sort((firstRow, secondRow) => {
    const dateComparison = secondRow.date.localeCompare(firstRow.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return secondRow.createdAt.localeCompare(firstRow.createdAt);
  });

  return rows;
}
