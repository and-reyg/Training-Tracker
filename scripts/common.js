import { formatDateKey, getBusinessDateKey } from "./storage.js";

const NAV_ITEMS = [
  { page: "daily", href: "index.html", label: "Daily" },
  { page: "review", href: "monthly-review.html", label: "Review" },
  { page: "chart", href: "progress-chart.html", label: "Графік" },
  { page: "breathing", href: "breathing-gymnastics.html", label: "Дихання" },
  { page: "breathing-view", href: "breathing-view.html", label: "Дих View" },
  { page: "strength", href: "strength-exercises.html", label: "Сила" },
  { page: "strength-view", href: "strength-view.html", label: "Сила View" },
  { page: "settings", href: "settings.html", label: "Settings" },
];

export function initCommonPage() {
  const dateElement = document.querySelector("#business-date");
  const navElement = document.querySelector(".bottom-nav");

  if (dateElement) {
    dateElement.textContent = formatDateKey(getBusinessDateKey(), "full");
  }

  if (navElement) {
    const currentPage = document.body.dataset.page;
    navElement.innerHTML = NAV_ITEMS.map((item) => `
      <a class="nav-link ${item.page === currentPage ? "is-active" : ""}" href="${item.href}">${item.label}</a>
    `).join("");

    const activeLink = navElement.querySelector(".nav-link.is-active");
    if (activeLink) {
      requestAnimationFrame(() => {
        const navRect = navElement.getBoundingClientRect();
        const activeRect = activeLink.getBoundingClientRect();
        const isOutOfView = activeRect.left < navRect.left || activeRect.right > navRect.right;

        if (isOutOfView) {
          const targetLeft = activeLink.offsetLeft - (navElement.clientWidth - activeLink.clientWidth) / 2;
          navElement.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: "auto",
          });
        }
      });
    }
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
