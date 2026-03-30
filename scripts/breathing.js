import { BREATHING_EXERCISES, getBreathingExerciseById } from "./breathing-config.js";
import { initCommonPage } from "./common.js";
import {
  addBreathingEntry,
  deleteBreathingEntry,
  formatBreathingEntryValue,
  formatBreathingTotals,
  getBreathingEntriesForToday,
  getBreathingStateSnapshot,
  getBreathingTodayTotals,
  getBreathingYesterdayTotals,
  updateBreathingEntry,
} from "./breathing-storage.js";

const uiState = {
  openExerciseId: null,
  editingByExercise: {},
  timer: {
    exerciseId: null,
    seconds: 0,
    running: false,
    intervalId: null,
  },
};

const breathingRoot = document.querySelector("#breathing-exercises");

initCommonPage();
renderPage();
window.addEventListener("beforeunload", stopTimer);

function renderPage() {
  const storageState = getBreathingStateSnapshot();

  breathingRoot.innerHTML = BREATHING_EXERCISES.map((exercise) =>
    renderExerciseCard(exercise, storageState),
  ).join("");

  attachEvents(storageState);
  syncTimerUI();
}

function renderExerciseCard(exercise, storageState) {
  const todayEntries = getBreathingEntriesForToday(storageState, exercise.id);
  const todayTotals = getBreathingTodayTotals(storageState, exercise.id);
  const yesterdayTotals = getBreathingYesterdayTotals(storageState, exercise.id);
  const isOpen = uiState.openExerciseId === exercise.id;
  const editingEntry = uiState.editingByExercise[exercise.id] ?? null;
  const yesterdayText = yesterdayTotals ? formatBreathingTotals(yesterdayTotals) : "—";
  const yesterdayClass = yesterdayTotals ? "" : "is-muted";

  return `
    <article class="exercise-card">
      <button
        class="exercise-card__summary"
        type="button"
        data-action="toggle-card"
        data-exercise-id="${exercise.id}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <div class="exercise-card__title">
          <span class="exercise-card__dot" style="background:${exercise.color}"></span>
          <div>
            <p class="exercise-card__name">${exercise.name}</p>
            <div class="exercise-card__mode">Опис + Пвт + Хв</div>
          </div>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Сьогодні</span>
          <span class="exercise-card__metric-value">${formatBreathingTotals(todayTotals)}</span>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Вчора</span>
          <span class="exercise-card__metric-value ${yesterdayClass}">${yesterdayText}</span>
        </div>
      </button>

      ${isOpen ? renderPanel(exercise, todayEntries, editingEntry) : ""}
    </article>
  `;
}

function renderPanel(exercise, entries, editingEntry) {
  return `
    <div class="exercise-card__panel">
      <div class="exercise-card__panel-inner">
        <div class="stopwatch-row">
          <div class="stopwatch-row__time" id="breathing-stopwatch-display">${formatSeconds(uiState.timer.seconds)}</div>
          <div class="stopwatch-row__actions">
            <button type="button" class="secondary-button" data-action="timer-start" data-exercise-id="${exercise.id}">Старт</button>
            <button type="button" class="secondary-button" data-action="timer-pause">Пауза</button>
            <button type="button" class="secondary-button" data-action="timer-reset">Скинути</button>
          </div>
        </div>

        <div class="entry-list">
          ${
            entries.length
              ? entries.map((entry) => renderEntryRow(exercise, entry)).join("")
              : '<div class="empty-inline">Сьогодні ще немає записів для цієї дихальної вправи.</div>'
          }
        </div>

        ${renderExerciseForm(exercise, editingEntry)}
      </div>
    </div>
  `;
}

function renderEntryRow(exercise, entry) {
  return `
    <div class="entry-row">
      <div class="entry-row__value">${formatBreathingEntryValue(entry)}</div>

      <div class="entry-row__actions">
        <button
          type="button"
          class="icon-button"
          title="Редагувати"
          data-action="edit-entry"
          data-exercise-id="${exercise.id}"
          data-entry-id="${entry.id}"
        >
          &#9998;
        </button>
        <button
          type="button"
          class="icon-button icon-button--danger"
          title="Видалити"
          data-action="delete-entry"
          data-exercise-id="${exercise.id}"
          data-entry-id="${entry.id}"
        >
          &#10005;
        </button>
      </div>
    </div>
  `;
}

function renderExerciseForm(exercise, editingEntry) {
  const isEditing = Boolean(editingEntry);
  const values = getFormValues(editingEntry);

  return `
    <form class="exercise-form" data-action="exercise-form" data-exercise-id="${exercise.id}">
      <p class="exercise-form__title">
        ${isEditing ? "Редагування запису" : "Додати новий запис"}
      </p>

      <div class="exercise-form__grid">
        <div class="field field--wide">
          <label for="${exercise.id}-note">Опис</label>
          <input
            id="${exercise.id}-note"
            name="note"
            type="text"
            required
            value="${values.note}"
            placeholder="Короткий опис"
          />
        </div>
        <div class="field">
          <label for="${exercise.id}-reps">Кількість Пвт</label>
          <input
            id="${exercise.id}-reps"
            name="reps"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            required
            value="${values.reps}"
            placeholder="Наприклад 8"
          />
        </div>
        <div class="field">
          <label for="${exercise.id}-minutes">Хвилини</label>
          <input
            id="${exercise.id}-minutes"
            name="minutes"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            required
            value="${values.minutes}"
            placeholder="Наприклад 3"
          />
        </div>
      </div>

      <div class="exercise-form__actions">
        <button class="primary-button" type="submit">
          ${isEditing ? "Зберегти ✓" : "Додати ✓"}
        </button>
        ${
          isEditing
            ? `
              <button
                class="secondary-button"
                type="button"
                data-action="cancel-edit"
                data-exercise-id="${exercise.id}"
              >
                Скасувати
              </button>
            `
            : ""
        }
      </div>
      ${isEditing ? `<input type="hidden" name="entryId" value="${editingEntry.id}" />` : ""}
    </form>
  `;
}

function getFormValues(editingEntry) {
  if (!editingEntry) {
    return { note: "", reps: "", minutes: "" };
  }

  return {
    note: editingEntry.note ?? "",
    reps: editingEntry.reps ?? "",
    minutes: editingEntry.minutes ?? "",
  };
}

function attachEvents(storageState) {
  breathingRoot.querySelectorAll('[data-action="toggle-card"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      const isClosing = uiState.openExerciseId === exerciseId;

      resetTimer({ clearExercise: true, sync: false });
      uiState.openExerciseId = isClosing ? null : exerciseId;
      renderPage();
    });
  });

  breathingRoot.querySelectorAll('[data-action="edit-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId, entryId } = button.dataset;
      const entry = getBreathingEntriesForToday(storageState, exerciseId).find((item) => item.id === entryId);

      uiState.openExerciseId = exerciseId;
      uiState.editingByExercise = {
        ...uiState.editingByExercise,
        [exerciseId]: entry ?? null,
      };

      renderPage();
    });
  });

  breathingRoot.querySelectorAll('[data-action="delete-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId, entryId } = button.dataset;
      deleteBreathingEntry(exerciseId, entryId);

      if (uiState.editingByExercise[exerciseId]?.id === entryId) {
        uiState.editingByExercise[exerciseId] = null;
      }

      renderPage();
    });
  });

  breathingRoot.querySelectorAll('[data-action="cancel-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      uiState.editingByExercise[exerciseId] = null;
      renderPage();
    });
  });

  breathingRoot.querySelectorAll('[data-action="exercise-form"]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const exerciseId = form.dataset.exerciseId;
      const formData = new FormData(form);
      const payload = buildPayload(formData);

      if (!payload) {
        return;
      }

      const entryId = formData.get("entryId");

      if (typeof entryId === "string" && entryId) {
        updateBreathingEntry(exerciseId, entryId, payload);
      } else {
        addBreathingEntry(exerciseId, payload);
      }

      uiState.editingByExercise[exerciseId] = null;
      uiState.openExerciseId = exerciseId;
      renderPage();
    });
  });

  const startButton = breathingRoot.querySelector('[data-action="timer-start"]');
  const pauseButton = breathingRoot.querySelector('[data-action="timer-pause"]');
  const resetButton = breathingRoot.querySelector('[data-action="timer-reset"]');

  if (startButton) {
    startButton.addEventListener("click", () => {
      startTimer(startButton.dataset.exerciseId);
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", pauseTimer);
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetTimer({ clearExercise: false, sync: true });
    });
  }
}

function buildPayload(formData) {
  const note = String(formData.get("note") ?? "").trim();
  const reps = Number(formData.get("reps"));
  const minutes = Number(formData.get("minutes"));

  if (!note || !reps || !minutes) {
    return null;
  }

  return { note, reps, minutes };
}

function startTimer(exerciseId) {
  if (uiState.timer.exerciseId !== exerciseId) {
    resetTimer({ clearExercise: true, sync: false });
    uiState.timer.exerciseId = exerciseId;
  }

  if (uiState.timer.running) {
    return;
  }

  uiState.timer.running = true;
  uiState.timer.intervalId = window.setInterval(() => {
    uiState.timer.seconds += 1;
    syncTimerUI();
  }, 1000);

  syncTimerUI();
}

function pauseTimer() {
  stopTimer();
  syncTimerUI();
}

function stopTimer() {
  if (uiState.timer.intervalId) {
    window.clearInterval(uiState.timer.intervalId);
    uiState.timer.intervalId = null;
  }

  uiState.timer.running = false;
}

function resetTimer({ clearExercise = false, sync = true } = {}) {
  stopTimer();
  uiState.timer.seconds = 0;

  if (clearExercise) {
    uiState.timer.exerciseId = null;
  }

  if (sync) {
    syncTimerUI();
  }
}

function syncTimerUI() {
  const display = document.querySelector("#breathing-stopwatch-display");

  if (display) {
    display.textContent = formatSeconds(uiState.timer.seconds);
  }
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
