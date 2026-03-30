import { initCommonPage, renderPlaceholderCard } from "./common.js";

const root = document.querySelector("#placeholder-root");

initCommonPage();

if (document.body.dataset.page === "breathing") {
  renderPlaceholderCard(
    root,
    "Дихальна гімнастика",
    "Тут уже є окрема сторінка з шапкою і навігацією. Пізніше сюди можна додати вправи, таймери або окремий журнал.",
  );
}

if (document.body.dataset.page === "strength") {
  renderPlaceholderCard(
    root,
    "Силові вправи",
    "Сторінка готова як база для майбутнього наповнення. За бажанням сюди можна додати власний список силових блоків і окрему статистику.",
  );
}
