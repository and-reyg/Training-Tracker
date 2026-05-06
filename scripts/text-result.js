import { initCommonPage } from "./common.js";
import {
  STRENGTH_HISTORY_LIMIT_DATES,
  getStrengthDateGroups,
  getStrengthStateSnapshot,
} from "./strength-storage.js";

const INDENT_EXERCISE_SPACES = 2;
const INDENT_SET_SPACES = 4;
const LINE_GAP_BETWEEN_EXERCISES = 1;
const LINE_GAP_BETWEEN_DATES = 1;

const outputElement = document.querySelector("#tr-output");
const lastDayButton = document.querySelector("#tr-last-day");
const getButton = document.querySelector("#tr-get");
const copyButton = document.querySelector("#tr-copy");
const clearButton = document.querySelector("#tr-clear");
const daysInput = document.querySelector("#tr-days-input");

initCommonPage();
if (daysInput) {
  daysInput.max = String(STRENGTH_HISTORY_LIMIT_DATES);
}
attachEvents();

function attachEvents() {
  lastDayButton?.addEventListener("click", () => {
    renderForLastDay();
  });

  getButton?.addEventListener("click", () => {
    renderForDaysInput();
  });

  clearButton?.addEventListener("click", () => {
    setOutput("");
  });

  copyButton?.addEventListener("click", async () => {
    const text = outputElement?.textContent ?? "";
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // ignore clipboard failures silently
    }
  });
}

function renderForLastDay() {
  clearOutput();
  const groups = getStrengthDateGroups(getStrengthStateSnapshot());
  const slice = groups.length ? [groups[0]] : [];
  setOutput(buildText(slice));
}

function renderForDaysInput() {
  clearOutput();
  const requested = Number(daysInput?.value);
  const daysCount = Number.isFinite(requested)
    ? Math.max(1, Math.min(STRENGTH_HISTORY_LIMIT_DATES, Math.floor(requested)))
    : 1;

  if (daysInput) {
    daysInput.value = String(daysCount);
  }

  const groups = getStrengthDateGroups(getStrengthStateSnapshot()).slice(0, daysCount);
  setOutput(buildText(groups));
}

function buildText(groups) {
  if (!groups.length) {
    return "Немає даних для виводу.";
  }

  const exerciseIndent = " ".repeat(INDENT_EXERCISE_SPACES);
  const setIndent = " ".repeat(INDENT_SET_SPACES);
  const exerciseGap = "\n".repeat(LINE_GAP_BETWEEN_EXERCISES);
  const dateGap = "\n".repeat(LINE_GAP_BETWEEN_DATES);

  return groups
    .map((group) => {
      const dateLine = group.formattedDate;
      const rowsText = group.rows
        .map((row) => {
          const setLines = row.sets
            .map(
              (set, index) =>
                `${setIndent}Set ${index + 1}: ${set.weight} кг × ${set.reps}`,
            )
            .join("\n");

          return `${exerciseIndent}${row.exerciseName}\n${setLines}`;
        })
        .join(`${exerciseGap}\n`);

      return `${dateLine}\n${rowsText}`;
    })
    .join(`${dateGap}\n`);
}

function clearOutput() {
  setOutput("");
}

function setOutput(text) {
  if (!outputElement) {
    return;
  }

  outputElement.textContent = text;
}
