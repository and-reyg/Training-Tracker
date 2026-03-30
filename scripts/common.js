import { formatDateKey, getBusinessDateKey } from "./storage.js";

export function initCommonPage() {
  const dateElement = document.querySelector("#business-date");

  if (dateElement) {
    dateElement.textContent = formatDateKey(getBusinessDateKey(), "full");
  }
}

export function renderPlaceholderCard(root, title, text) {
  root.innerHTML = `
    <div>
      <p class="section-heading__eyebrow">Сторінка підготовлена</p>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
  `;
}
