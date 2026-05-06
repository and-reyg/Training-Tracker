import { initCommonPage } from "./common.js";
import {
  STRENGTH_HISTORY_LIMIT_DATES,
  getStrengthStateSnapshot,
  getStrengthTableData,
} from "./strength-storage.js";

const countElement = document.querySelector("#strength-review-count");
const headElement = document.querySelector("#strength-review-head");
const bodyElement = document.querySelector("#strength-review-body");

initCommonPage();
renderStrengthTable();

function renderStrengthTable() {
  const { rows, maxSets } = getStrengthTableData(getStrengthStateSnapshot());
  const uniqueDatesCount = new Set(rows.map((row) => row.date)).size;

  countElement.textContent = rows.length
    ? `Унікальних дат: ${uniqueDatesCount} / ${STRENGTH_HISTORY_LIMIT_DATES}`
    : "Поки що немає силових записів.";

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
        <td colspan="${maxSets * 2 + 2}" class="table-note">Дані з'являться після записів на сторінці Сила.</td>
      </tr>
    `;
    return;
  }

  let currentDate = "";
  let dateBand = 0;

  bodyElement.innerHTML = rows
    .map((row) => {
      if (row.date !== currentDate) {
        currentDate = row.date;
        dateBand += 1;
      }

      const bandClass = dateBand % 2 === 0 ? "sv-band-even" : "sv-band-odd";
      const setsHtml = Array.from({ length: maxSets }, (_, index) => {
        const set = row.sets[index];
        return `<td class="sv-set-col">${set ? set.weight : "—"}</td><td class="sv-set-col">${set ? set.reps : "—"}</td>`;
      }).join("");

      return `
        <tr class="${bandClass}">
          <td class="sv-sticky-1">${row.formattedDate}</td>
          <td class="sv-sticky-2 sv-exercise-col">${row.exerciseName}</td>
          ${setsHtml}
        </tr>
      `;
    })
    .join("");
}
