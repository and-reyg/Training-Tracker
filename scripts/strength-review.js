import { initCommonPage } from "./common.js";
import { getStrengthStateSnapshot, getStrengthTableData } from "./strength-storage.js";

const countElement = document.querySelector("#strength-review-count");
const headElement = document.querySelector("#strength-review-head");
const bodyElement = document.querySelector("#strength-review-body");

initCommonPage();
renderStrengthTable();

function renderStrengthTable() {
  const { rows, maxSets } = getStrengthTableData(getStrengthStateSnapshot());

  countElement.textContent = rows.length
    ? `Усього рядків: ${rows.length}`
    : "Поки що немає силових записів у таблиці.";

  headElement.innerHTML = `
    <tr>
      <th class="sv-sticky-1" rowspan="2">Дата</th>
      <th class="sv-sticky-2" rowspan="2">Вправа</th>
      ${Array.from({ length: maxSets }, (_, index) => `<th class="sv-set-group" colspan="2">Сет ${index + 1}</th>`).join("")}
    </tr>
    <tr>
      ${Array.from({ length: maxSets }, () => '<th class="sv-set-col">Кг</th><th class="sv-set-col">Пвт</th>').join("")}
    </tr>
  `;

  if (!rows.length) {
    bodyElement.innerHTML = `
      <tr>
        <td colspan="${maxSets * 2 + 2}" class="table-note">Дані з'являться після перших записів на сторінці Силові вправи.</td>
      </tr>
    `;
    return;
  }

  bodyElement.innerHTML = rows.map((row) => `
    <tr>
      <td class="sv-sticky-1">${row.formattedDate}</td>
      <td class="sv-sticky-2">${row.exerciseName}</td>
      ${Array.from({ length: maxSets }, (_, index) => {
        const set = row.sets[index];
        return `<td class="sv-set-col">${set ? set.weight : "—"}</td><td class="sv-set-col">${set ? set.reps : "—"}</td>`;
      }).join("")}
    </tr>
  `).join("");
}
