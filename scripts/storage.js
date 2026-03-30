import {
  APP_STORAGE_KEY,
  EXERCISES,
  HISTORY_LIMIT_DAYS,
  RESET_HOUR,
  getExerciseById,
  getSummaryUnit,
} from "./config.js";

function createEmptyEntries() {
  return Object.fromEntries(EXERCISES.map((exercise) => [exercise.id, []]));
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

function pad(value) {
  return String(value).padStart(2, "0");
}

function createUtcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return createUtcDate(year, month, day);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getKyivParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const rawParts = formatter.formatToParts(date);
  const parts = {};

  rawParts.forEach((part) => {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  });

  return parts;
}

export function getBusinessDateKey(date = new Date()) {
  const parts = getKyivParts(date);
  const baseDate = createUtcDate(parts.year, parts.month, parts.day);

  if (parts.hour >= RESET_HOUR) {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  }

  return toDateKey(baseDate);
}

export function shiftDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function formatDateKey(dateKey, style = "full") {
  if (!dateKey) {
    return "";
  }

  const [year, month, day] = dateKey.split("-");

  if (style === "short") {
    return `${day}.${month}`;
  }

  return `${day}.${month}.${year}`;
}

function safeReadStorage() {
  try {
    const rawValue = localStorage.getItem(APP_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Не вдалося прочитати localStorage:", error);
    return null;
  }
}

function safeWriteStorage(state) {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Не вдалося записати localStorage:", error);
  }
}

function normalizeEntry(rawEntry, mode) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  const entry = {
    id: typeof rawEntry.id === "string" ? rawEntry.id : createEntryId(),
    createdAt:
      typeof rawEntry.createdAt === "string" ? rawEntry.createdAt : new Date().toISOString(),
  };

  if (mode === "reps") {
    entry.reps = Math.max(0, Number(rawEntry.reps) || 0);
  }

  if (mode === "minutes" || mode === "noteMinutes") {
    entry.minutes = Math.max(0, Number(rawEntry.minutes) || 0);
  }

  if (mode === "noteMinutes") {
    entry.note = typeof rawEntry.note === "string" ? rawEntry.note.trim() : "";
  }

  return entry;
}

function normalizeDay(rawDay) {
  const normalizedDay = createDay(
    typeof rawDay?.date === "string" ? rawDay.date : getBusinessDateKey(),
  );

  EXERCISES.forEach((exercise) => {
    const rawEntries = Array.isArray(rawDay?.entries?.[exercise.id]) ? rawDay.entries[exercise.id] : [];

    normalizedDay.entries[exercise.id] = rawEntries
      .map((rawEntry) => normalizeEntry(rawEntry, exercise.mode))
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
    history: history.slice(-HISTORY_LIMIT_DAYS),
  };
}

function dayHasEntries(day) {
  return Object.values(day.entries).some((items) => items.length > 0);
}

function mergeDayIntoHistory(history, day) {
  if (!day.date || !dayHasEntries(day)) {
    return history.slice(-HISTORY_LIMIT_DAYS);
  }

  const nextHistory = history.filter((historyDay) => historyDay.date !== day.date);
  nextHistory.push(deepClone(day));
  nextHistory.sort((firstDay, secondDay) => firstDay.date.localeCompare(secondDay.date));
  return nextHistory.slice(-HISTORY_LIMIT_DAYS);
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

function createEntryId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mutateState(mutator) {
  const state = ensureFreshState();
  mutator(state);
  safeWriteStorage(state);
  return state;
}

export function getStateSnapshot() {
  return ensureFreshState();
}

function buildEntry(mode, values, existingEntry = null) {
  const entry = {
    id: existingEntry?.id ?? createEntryId(),
    createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
  };

  if (mode === "reps") {
    entry.reps = Math.max(0, Number(values.reps) || 0);
  }

  if (mode === "minutes" || mode === "noteMinutes") {
    entry.minutes = Math.max(0, Number(values.minutes) || 0);
  }

  if (mode === "noteMinutes") {
    entry.note = (values.note ?? "").trim();
  }

  return entry;
}

export function addEntry(exerciseId, values) {
  return mutateState((state) => {
    const exercise = getExerciseById(exerciseId);

    if (!exercise) {
      return;
    }

    state.currentDay.entries[exerciseId].push(buildEntry(exercise.mode, values));
  });
}

export function updateEntry(exerciseId, entryId, values) {
  return mutateState((state) => {
    const exercise = getExerciseById(exerciseId);
    const entries = state.currentDay.entries[exerciseId];

    if (!exercise || !entries) {
      return;
    }

    const entryIndex = entries.findIndex((entry) => entry.id === entryId);

    if (entryIndex === -1) {
      return;
    }

    entries[entryIndex] = buildEntry(exercise.mode, values, entries[entryIndex]);
  });
}

export function deleteEntry(exerciseId, entryId) {
  return mutateState((state) => {
    const entries = state.currentDay.entries[exerciseId];

    if (!entries) {
      return;
    }

    state.currentDay.entries[exerciseId] = entries.filter((entry) => entry.id !== entryId);
  });
}

export function getEntriesForToday(state, exerciseId) {
  return state.currentDay.entries[exerciseId] ?? [];
}

export function getTotalForEntries(exercise, entries = []) {
  return entries.reduce((sum, entry) => {
    if (exercise.mode === "reps") {
      return sum + (entry.reps || 0);
    }

    return sum + (entry.minutes || 0);
  }, 0);
}

export function getTodayTotal(state, exerciseId) {
  const exercise = getExerciseById(exerciseId);

  if (!exercise) {
    return 0;
  }

  return getTotalForEntries(exercise, getEntriesForToday(state, exerciseId));
}

export function getYesterdayTotal(state, exerciseId) {
  const exercise = getExerciseById(exerciseId);

  if (!exercise) {
    return null;
  }

  const yesterdayKey = shiftDateKey(state.currentDay.date, -1);
  const yesterday = state.history.find((day) => day.date === yesterdayKey);

  if (!yesterday) {
    return null;
  }

  return getTotalForEntries(exercise, yesterday.entries[exerciseId]);
}

export function getTodayEntryCount(state) {
  return Object.values(state.currentDay.entries).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
}

export function formatEntryValue(exercise, entry) {
  if (exercise.mode === "reps") {
    return `${entry.reps} Пвт`;
  }

  if (exercise.mode === "minutes") {
    return `${entry.minutes} Хв`;
  }

  return `${entry.note || "Без опису"} • ${entry.minutes} Хв`;
}

export function getReviewRows(state) {
  const rows = [];
  const days = [...state.history, state.currentDay];

  days.forEach((day) => {
    EXERCISES.forEach((exercise) => {
      const entries = day.entries[exercise.id] ?? [];

      entries.forEach((entry) => {
        rows.push({
          id: entry.id,
          date: day.date,
          exerciseName: exercise.name,
          content: exercise.mode === "reps" ? `${entry.reps} Пвт` : entry.note || "",
          minutes:
            exercise.mode === "minutes" || exercise.mode === "noteMinutes" ? entry.minutes : "",
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

export function getChartData(state) {
  const repExercises = EXERCISES.filter((exercise) => exercise.mode === "reps");
  const days = [...state.history, state.currentDay]
    .filter((day) => day.date)
    .sort((firstDay, secondDay) => firstDay.date.localeCompare(secondDay.date))
    .slice(-HISTORY_LIMIT_DAYS);

  const dates = days.map((day) => day.date);
  const series = repExercises.map((exercise) => ({
    ...exercise,
    values: days.map((day) => getTotalForEntries(exercise, day.entries[exercise.id])),
  }));

  const maxTotal = Math.max(
    0,
    ...series.flatMap((item) => item.values),
  );

  return {
    dates,
    series,
    maxValue: maxTotal + 10,
  };
}

export function formatSummaryValue(exercise, value) {
  if (!value) {
    return `0 ${getSummaryUnit(exercise.mode)}`;
  }

  return `${value} ${getSummaryUnit(exercise.mode)}`;
}
