import { initCommonPage } from "./common.js";
import { formatDateKey, getReviewRows, getStateSnapshot } from "./storage.js";

const tableBody = document.querySelector("#review-table-body");
const reviewCountElement = document.querySelector("#review-count");

initCommonPage();
renderReviewTable();

function renderReviewTable() {
  const rows = getReviewRows(getStateSnapshot());

  reviewCountElement.textContent = rows.length
    ? `Усього записів: ${rows.length}`
    : "Поки що немає записів у таблиці.";

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="table-note">Дані з'являться після перших записів на сторінці Daily.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows.map((row) => `
    <tr>
      <td data-label="Дата">${formatDateKey(row.date, "full")}</td>
      <td data-label="Вправа">${row.exerciseName}</td>
      <td data-label="Повтори / Опис">${row.content || "—"}</td>
      <td data-label="Хв">${row.minutes || "—"}</td>
    </tr>
  `).join("");
}
