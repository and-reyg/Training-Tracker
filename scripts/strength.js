import { initCommonPage } from "./common.js";
import {
  addStrengthEntry,
  addStrengthExercise,
  deleteStrengthEntry,
  deleteStrengthExercise,
  getStrengthEntriesByExercise,
  getStrengthExerciseStats,
  getStrengthStateSnapshot,
  renameStrengthExercise,
  updateStrengthEntry,
} from "./strength-storage.js";

const uiState = {
  openExerciseId: null,
  renamingExerciseId: null,
  editingEntryByExerciseId: {},
  showAddExerciseForm: false,
};

const addExerciseButton = document.querySelector("#show-add-strength-exercise");
const addExerciseForm = document.querySelector("#strength-add-form");
const cancelAddExerciseButton = document.querySelector("#cancel-add-strength-exercise");
const exerciseListRoot = document.querySelector("#strength-exercises");
const timerInput = document.querySelector("#strength-timer-input");
const timerToggleButton = document.querySelector("#strength-timer-toggle");
const timerResetButton = document.querySelector("#strength-timer-reset");

const timerState = {
  seconds: 0,
  running: false,
  intervalId: null,
};

let audioContext = null;

initCommonPage();
renderPage();
attachStaticEvents();
initTimer();
window.addEventListener("beforeunload", stopTimer);

function renderPage() {
  const state = getStrengthStateSnapshot();

  addExerciseForm.classList.toggle("is-hidden", !uiState.showAddExerciseForm);

  exerciseListRoot.innerHTML = state.exercises.length
    ? state.exercises.map((exercise) => renderExerciseCard(exercise, state)).join("")
    : '<div class="empty-inline">Силових вправ ще немає. Додай першу вправу через кнопку вище.</div>';

  attachDynamicEvents(state);
}

function renderExerciseCard(exercise, state) {
  const entries = getStrengthEntriesByExercise(state, exercise.id);
  const stats = getStrengthExerciseStats(state, exercise.id);
  const isOpen = uiState.openExerciseId === exercise.id;
  const isRenaming = uiState.renamingExerciseId === exercise.id;
  const editingEntry = uiState.editingEntryByExerciseId[exercise.id] ?? null;

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
          <span class="exercise-card__dot" style="background:#142233"></span>
          <div>
            <p class="exercise-card__name">${exercise.name}</p>
            <div class="exercise-card__mode">Вага + Пвт</div>
          </div>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Записів</span>
          <span class="exercise-card__metric-value">${stats.entryCount}</span>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Остання</span>
          <span class="exercise-card__metric-value ${entries.length ? "" : "is-muted"}">${stats.latestDate}</span>
        </div>
      </button>

      ${isOpen ? renderPanel(exercise, entries, isRenaming, editingEntry) : ""}
    </article>
  `;
}

function renderPanel(exercise, entries, isRenaming, editingEntry) {
  return `
    <div class="exercise-card__panel">
      <div class="exercise-card__panel-inner">
        ${
          isRenaming
            ? renderRenameForm(exercise)
            : `
              <div class="panel-toolbar panel-toolbar--icons">
                <div class="panel-toolbar__actions">
                  <button
                    type="button"
                    class="icon-button"
                    title="Редагувати назву"
                    data-action="show-rename-exercise"
                    data-exercise-id="${exercise.id}"
                  >
                    &#9998;
                  </button>
                  <button
                    type="button"
                    class="icon-button icon-button--danger"
                    title="Видалити вправу"
                    data-action="delete-exercise"
                    data-exercise-id="${exercise.id}"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            `
        }

        <div class="entry-list">
          ${
            entries.length
              ? entries.map((entry) => renderEntryRow(entry)).join("")
              : '<div class="empty-inline">Поки що немає записів для цієї силової вправи.</div>'
          }
        </div>

        ${renderEntryForm(exercise.id, editingEntry)}
      </div>
    </div>
  `;
}

function renderRenameForm(exercise) {
  return `
    <form class="rename-form" data-action="rename-exercise-form" data-exercise-id="${exercise.id}">
      <div class="field field--wide">
        <label for="rename-${exercise.id}">Нова назва вправи</label>
        <input id="rename-${exercise.id}" name="exerciseName" type="text" required value="${exercise.name}" />
      </div>
      <div class="rename-form__actions">
        <button class="primary-button" type="submit">Зберегти ✓</button>
        <button class="secondary-button" type="button" data-action="cancel-rename-exercise">Скасувати</button>
      </div>
    </form>
  `;
}

function renderEntryRow(entry) {
  return `
    <div class="entry-row entry-row--strength">
      <div class="entry-row__value entry-row__value--strength">
        <span class="strength-entry-pill">${entry.weight} кг</span>
        <span class="strength-entry-pill">${entry.reps} Пвт</span>
      </div>

      <div class="entry-row__actions entry-row__actions--inline">
        <button
          type="button"
          class="icon-button"
          title="Редагувати"
          data-action="edit-entry"
          data-entry-id="${entry.id}"
        >
          &#9998;
        </button>
        <button
          type="button"
          class="icon-button icon-button--danger"
          title="Видалити"
          data-action="delete-entry"
          data-entry-id="${entry.id}"
        >
          &#10005;
        </button>
      </div>
    </div>
  `;
}

function renderEntryForm(exerciseId, editingEntry) {
  const values = {
    weight: editingEntry?.weight ?? "",
    reps: editingEntry?.reps ?? "",
  };

  return `
    <form class="strength-entry-form" data-action="strength-entry-form" data-exercise-id="${exerciseId}">
      <div class="strength-entry-form__grid">
        <div class="field">
          <label for="strength-weight-${exerciseId}">Вага</label>
          <input
            id="strength-weight-${exerciseId}"
            name="weight"
            type="number"
            inputmode="decimal"
            min="0.5"
            step="0.5"
            required
            value="${values.weight}"
            placeholder="40"
          />
        </div>
        <div class="field">
          <label for="strength-reps-${exerciseId}">Пвт</label>
          <input
            id="strength-reps-${exerciseId}"
            name="reps"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            required
            value="${values.reps}"
            placeholder="10"
          />
        </div>
      </div>

      <div class="strength-entry-form__actions">
        <button class="primary-button" type="submit">${editingEntry ? "Зберегти ✓" : "Додати ✓"}</button>
        ${
          editingEntry
            ? '<button class="secondary-button" type="button" data-action="cancel-entry-edit">Скасувати</button>'
            : ""
        }
      </div>

      ${editingEntry ? `<input type="hidden" name="entryId" value="${editingEntry.id}" />` : ""}
    </form>
  `;
}

function attachStaticEvents() {
  addExerciseButton.addEventListener("click", () => {
    uiState.showAddExerciseForm = true;
    renderPage();
  });

  cancelAddExerciseButton.addEventListener("click", () => {
    uiState.showAddExerciseForm = false;
    addExerciseForm.reset();
    renderPage();
  });

  addExerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(addExerciseForm);
    const name = String(formData.get("exerciseName") ?? "").trim();

    if (!name) {
      return;
    }

    addStrengthExercise(name);
    uiState.showAddExerciseForm = false;
    addExerciseForm.reset();
    renderPage();
  });
}

function attachDynamicEvents(state) {
  exerciseListRoot.querySelectorAll('[data-action="toggle-card"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      uiState.openExerciseId = uiState.openExerciseId === exerciseId ? null : exerciseId;
      uiState.renamingExerciseId = null;
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="show-rename-exercise"]').forEach((button) => {
    button.addEventListener("click", () => {
      uiState.renamingExerciseId = button.dataset.exerciseId;
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="cancel-rename-exercise"]').forEach((button) => {
    button.addEventListener("click", () => {
      uiState.renamingExerciseId = null;
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="rename-exercise-form"]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const exerciseId = form.dataset.exerciseId;
      const formData = new FormData(form);
      const nextName = String(formData.get("exerciseName") ?? "").trim();

      if (!nextName) {
        return;
      }

      renameStrengthExercise(exerciseId, nextName);
      uiState.renamingExerciseId = null;
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="delete-exercise"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      const exercise = state.exercises.find((item) => item.id === exerciseId);

      if (!exercise) {
        return;
      }

      if (!window.confirm(`Видалити вправу "${exercise.name}" разом з усіма записами?`)) {
        return;
      }

      deleteStrengthExercise(exerciseId);
      uiState.openExerciseId = uiState.openExerciseId === exerciseId ? null : uiState.openExerciseId;
      uiState.renamingExerciseId = null;
      delete uiState.editingEntryByExerciseId[exerciseId];
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="edit-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { entryId } = button.dataset;
      const entry = state.entries.find((item) => item.id === entryId);

      if (!entry) {
        return;
      }

      uiState.editingEntryByExerciseId[entry.exerciseId] = entry;
      uiState.openExerciseId = entry.exerciseId;
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="delete-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { entryId } = button.dataset;

      deleteStrengthEntry(entryId);

      Object.keys(uiState.editingEntryByExerciseId).forEach((exerciseId) => {
        if (uiState.editingEntryByExerciseId[exerciseId]?.id === entryId) {
          delete uiState.editingEntryByExerciseId[exerciseId];
        }
      });

      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="cancel-entry-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const exerciseId = button.closest('form[data-action="strength-entry-form"]')?.dataset.exerciseId;
      delete uiState.editingEntryByExerciseId[exerciseId];
      renderPage();
    });
  });

  exerciseListRoot.querySelectorAll('[data-action="strength-entry-form"]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const exerciseId = form.dataset.exerciseId;
      const formData = new FormData(form);
      const weight = Number(formData.get("weight"));
      const reps = Number(formData.get("reps"));

      if (!weight || !reps) {
        return;
      }

      const entryId = formData.get("entryId");

      if (typeof entryId === "string" && entryId) {
        updateStrengthEntry(entryId, { weight, reps });
      } else {
        addStrengthEntry(exerciseId, { weight, reps });
      }

      delete uiState.editingEntryByExerciseId[exerciseId];
      uiState.openExerciseId = exerciseId;
      renderPage();
    });
  });
}

function initTimer() {
  if (!timerInput || !timerToggleButton || !timerResetButton) {
    return;
  }

  timerInput.addEventListener("input", handleTimerInput);
  timerInput.addEventListener("blur", syncTimerInputFromField);
  timerToggleButton.addEventListener("click", toggleTimer);
  timerResetButton.addEventListener("click", resetTimer);
  renderTimer();
}

function handleTimerInput() {
  const digits = timerInput.value.replace(/\D/g, "").slice(-4);
  const padded = digits.padStart(4, "0");
  const minutes = padded.slice(0, 2);
  const seconds = padded.slice(2, 4);

  timerInput.value = `${minutes}:${seconds}`;

  if (timerState.running) {
    stopTimer();
  }

  timerState.seconds = parseTimerValue(timerInput.value);
  renderTimer();
}

function syncTimerInputFromField() {
  timerState.seconds = parseTimerValue(timerInput.value);
  renderTimer();
}

async function toggleTimer() {
  if (timerState.running) {
    stopTimer();
    renderTimer();
    return;
  }

  timerState.seconds = parseTimerValue(timerInput.value);

  if (timerState.seconds <= 0) {
    renderTimer();
    return;
  }

  await ensureAudioContext();
  timerState.running = true;
  timerState.intervalId = window.setInterval(() => {
    timerState.seconds = Math.max(0, timerState.seconds - 1);
    renderTimer();

    if (timerState.seconds === 0) {
      stopTimer();
      renderTimer();
      playTimerAlert();
    }
  }, 1000);

  renderTimer();
}

function resetTimer() {
  stopTimer();
  timerState.seconds = 0;
  renderTimer();
}

function stopTimer() {
  if (timerState.intervalId) {
    window.clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }

  timerState.running = false;
}

function renderTimer() {
  if (timerInput) {
    timerInput.value = formatTimer(timerState.seconds);
  }

  if (timerToggleButton) {
    timerToggleButton.textContent = timerState.running ? "Пауза" : "Старт";
  }
}

function parseTimerValue(value) {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return 0;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + Math.min(seconds, 59);
}

function formatTimer(totalSeconds) {
  const safeValue = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

async function playTimerAlert() {
  const context = await ensureAudioContext();

  if (!context) {
    return;
  }

  const startAt = context.currentTime + 0.02;
  playBellTone(context, startAt, 880, 0.22);
  playBellTone(context, startAt + 0.34, 988, 0.26);
}

function playBellTone(context, startAt, frequency, duration) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.12, startAt + duration * 0.45);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}
