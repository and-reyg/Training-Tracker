import { initCommonPage } from "./common.js";
import { formatDateKey } from "./storage.js";
import { getBreathingReviewRows, getBreathingStateSnapshot } from "./breathing-storage.js";

const tableBody = document.querySelector("#breathing-review-table-body");
const reviewCountElement = document.querySelector("#breathing-review-count");

initCommonPage();
renderReviewTable();

function renderReviewTable() {
  const rows = getBreathingReviewRows(getBreathingStateSnapshot());

  reviewCountElement.textContent = rows.length
    ? `Усього записів: ${rows.length}`
    : "Поки що немає записів у дихальній таблиці.";

  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="table-note">Дані з'являться після перших записів на сторінці Дихальна гімнастика.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${formatDateKey(row.date, "full")}</td>
      <td>${row.exerciseName}</td>
      <td>${row.content}</td>
      <td>${row.minutes}</td>
    </tr>
  `).join("");
}
