import { initCommonPage } from "./common.js";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuTcfF-FwOPesyXWkQlSx2jNMEnyj-oVhAfzfmXsPFSW_YWsA0Ld-M8eCgR8KINqib/exec";
const STORAGE_KEYS = {
  tracker: "trainingTracker.v1",
  breathing: "trainingTracker.breathing.v1",
  strength: "trainingTracker.Strength",
};

const exportButton = document.getElementById("settings-export-drive");
const importButton = document.getElementById("settings-import-drive");
const statusElement = document.getElementById("settings-status");

initCommonPage();

exportButton?.addEventListener("click", handleExport);
importButton?.addEventListener("click", handleImport);

function showStatus(message, isError = false) {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.classList.remove("is-hidden", "is-error", "is-success");
  statusElement.classList.add(isError ? "is-error" : "is-success");
}

function setPendingState(isPending) {
  if (exportButton) exportButton.disabled = isPending;
  if (importButton) importButton.disabled = isPending;
}

function safeParse(value) {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Invalid localStorage JSON", error);
    return {};
  }
}

function getLocalPayload() {
  return {
    tracker: safeParse(localStorage.getItem(STORAGE_KEYS.tracker)),
    breathing: safeParse(localStorage.getItem(STORAGE_KEYS.breathing)),
    strength: safeParse(localStorage.getItem(STORAGE_KEYS.strength)),
  };
}

function hasUsableData(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  return Object.keys(STORAGE_KEYS).some((field) => {
    const value = payload[field];
    return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function handleExport() {
  setPendingState(true);
  showStatus("Відправляю дані на Google Drive...");

  try {
    const localPayload = getLocalPayload();

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(localPayload),
    });

    showStatus("Перевіряю, чи файл оновився на Google Drive...");
    await delay(900);

    const remotePayload = await loadJsonpPayload();
    const isSamePayload = stableStringify(remotePayload) === stableStringify(localPayload);

    if (!isSamePayload) {
      showStatus("Запит відправлено, але збереження на Google Drive не підтвердилось. Спробуй ще раз через секунду.", true);
      return;
    }

    showStatus("JSON успішно збережено на Google Drive.");
  } catch (error) {
    console.error(error);
    showStatus("Помилка відправки на Google Drive.", true);
  } finally {
    setPendingState(false);
  }
}

async function handleImport() {
  setPendingState(true);
  showStatus("Отримую дані з Google Drive...");

  try {
    const payload = await loadJsonpPayload();

    if (!hasUsableData(payload)) {
      showStatus("Отримані дані порожні або пошкоджені.", true);
      return;
    }

    Object.entries(STORAGE_KEYS).forEach(([field, storageKey]) => {
      const value = payload[field];
      if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    });

    showStatus("localStorage успішно оновлено з Google Drive.");
  } catch (error) {
    console.error(error);
    showStatus("Імпорт не вдався. Перевір Apps Script і повтори ще раз.", true);
  } finally {
    setPendingState(false);
  }
}

function loadJsonpPayload() {
  return new Promise((resolve, reject) => {
    const callbackName = `trainingTrackerImport_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const separator = APPS_SCRIPT_URL.includes("?") ? "&" : "?";
    const scriptUrl = `${APPS_SCRIPT_URL}${separator}callback=${callbackName}&_=${Date.now()}`;
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out"));
    }, 10000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.src = scriptUrl;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP script load failed"));
    };

    document.body.appendChild(script);
  });
}
