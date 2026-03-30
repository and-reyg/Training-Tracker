import { EXERCISES, getExerciseById, getModeLabel, getSummaryUnit } from "./config.js";
import { initCommonPage } from "./common.js";
import {
  addEntry,
  deleteEntry,
  formatEntryValue,
  getEntriesForToday,
  getStateSnapshot,
  getTodayTotal,
  getYesterdayTotal,
  updateEntry,
} from "./storage.js";

const uiState = {
  openExerciseId: null,
  editingByExercise: {},
};

const dailyExercisesRoot = document.querySelector("#daily-exercises");

initCommonPage();
renderPage();

function renderPage() {
  const storageState = getStateSnapshot();

  dailyExercisesRoot.innerHTML = EXERCISES.map((exercise) =>
    renderExerciseCard(exercise, storageState),
  ).join("");

  attachEvents(storageState);
}

function renderExerciseCard(exercise, storageState) {
  const todayEntries = getEntriesForToday(storageState, exercise.id);
  const todayTotal = getTodayTotal(storageState, exercise.id);
  const yesterdayTotal = getYesterdayTotal(storageState, exercise.id);
  const isOpen = uiState.openExerciseId === exercise.id;
  const editingEntry = uiState.editingByExercise[exercise.id] ?? null;
  const panelContent = isOpen ? renderPanel(exercise, todayEntries, editingEntry) : "";
  const yesterdayClass = yesterdayTotal ? "" : "is-muted";
  const yesterdayText =
    yesterdayTotal === null ? "—" : `${yesterdayTotal} ${getSummaryUnit(exercise.mode)}`;

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
            <div class="exercise-card__mode">${getModeLabel(exercise.mode)}</div>
          </div>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Сьогодні</span>
          <span class="exercise-card__metric-value">${todayTotal} ${getSummaryUnit(exercise.mode)}</span>
        </div>

        <div class="exercise-card__metric">
          <span class="exercise-card__metric-label">Вчора</span>
          <span class="exercise-card__metric-value ${yesterdayClass}">${yesterdayText}</span>
        </div>
      </button>

      ${panelContent}
    </article>
  `;
}

function renderPanel(exercise, entries, editingEntry) {
  return `
    <div class="exercise-card__panel">
      <div class="exercise-card__panel-inner">
        <div class="entry-list">
          ${
            entries.length
              ? entries.map((entry) => renderEntryRow(exercise, entry)).join("")
              : '<div class="empty-inline">Сьогодні ще немає записів для цієї вправи.</div>'
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
      <div class="entry-row__value">${formatEntryValue(exercise, entry)}</div>

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
        ${renderFields(exercise, values)}
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
      ${
        isEditing
          ? `<input type="hidden" name="entryId" value="${editingEntry.id}" />`
          : ""
      }
    </form>
  `;
}

function renderFields(exercise, values) {
  if (exercise.mode === "reps") {
    return `
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
          placeholder="Наприклад 20"
        />
      </div>
    `;
  }

  if (exercise.mode === "minutes") {
    return `
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
    `;
  }

  return `
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
        placeholder="Наприклад 20"
      />
    </div>
  `;
}

function getFormValues(editingEntry) {
  if (!editingEntry) {
    return { reps: "", minutes: "", note: "" };
  }

  return {
    reps: editingEntry.reps ?? "",
    minutes: editingEntry.minutes ?? "",
    note: editingEntry.note ?? "",
  };
}

function attachEvents(storageState) {
  dailyExercisesRoot.querySelectorAll('[data-action="toggle-card"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      uiState.openExerciseId = uiState.openExerciseId === exerciseId ? null : exerciseId;
      renderPage();
    });
  });

  dailyExercisesRoot.querySelectorAll('[data-action="edit-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId, entryId } = button.dataset;
      const entry = getEntriesForToday(storageState, exerciseId).find((item) => item.id === entryId);

      uiState.openExerciseId = exerciseId;
      uiState.editingByExercise = {
        ...uiState.editingByExercise,
        [exerciseId]: entry ?? null,
      };

      renderPage();
    });
  });

  dailyExercisesRoot.querySelectorAll('[data-action="delete-entry"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId, entryId } = button.dataset;
      deleteEntry(exerciseId, entryId);

      if (uiState.editingByExercise[exerciseId]?.id === entryId) {
        uiState.editingByExercise[exerciseId] = null;
      }

      renderPage();
    });
  });

  dailyExercisesRoot.querySelectorAll('[data-action="cancel-edit"]').forEach((button) => {
    button.addEventListener("click", () => {
      const { exerciseId } = button.dataset;
      uiState.editingByExercise[exerciseId] = null;
      renderPage();
    });
  });

  dailyExercisesRoot.querySelectorAll('[data-action="exercise-form"]').forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const exerciseId = form.dataset.exerciseId;
      const exercise = getExerciseById(exerciseId);

      if (!exercise) {
        return;
      }

      const formData = new FormData(form);
      const payload = buildPayload(exercise, formData);

      if (!payload) {
        return;
      }

      const entryId = formData.get("entryId");

      if (typeof entryId === "string" && entryId) {
        updateEntry(exerciseId, entryId, payload);
      } else {
        addEntry(exerciseId, payload);
      }

      uiState.editingByExercise[exerciseId] = null;
      uiState.openExerciseId = exerciseId;
      renderPage();
    });
  });
}

function buildPayload(exercise, formData) {
  if (exercise.mode === "reps") {
    const reps = Number(formData.get("reps"));

    if (!reps) {
      return null;
    }

    return { reps };
  }

  if (exercise.mode === "minutes") {
    const minutes = Number(formData.get("minutes"));

    if (!minutes) {
      return null;
    }

    return { minutes };
  }

  const note = String(formData.get("note") ?? "").trim();
  const minutes = Number(formData.get("minutes"));

  if (!note || !minutes) {
    return null;
  }

  return { note, minutes };
}
