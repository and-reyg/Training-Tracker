# Training Tracker

## Структура проєкту

```text
codex/
|-- index.html
|-- monthly-review.html
|-- progress-chart.html
|-- breathing-gymnastics.html
|-- breathing-view.html
|-- strength-exercises.html
|-- strength-view.html
|-- settings.html
|-- manifest.json
|-- img/
|   |-- favicon.png
|   |-- web-app-manifest-192x192.png
|   `-- web-app-manifest-512x512.png
|-- styles/
|   `-- main.css
`-- scripts/
    |-- config.js
    |-- storage.js
    |-- daily.js
    |-- review.js
    |-- chart.js
    |-- breathing-config.js
    |-- breathing-storage.js
    |-- breathing.js
    |-- breathing-review.js
    |-- strength-storage.js
    |-- strength.js
    |-- strength-review.js
    |-- settings.js
    |-- common.js
    `-- placeholders.js
```

## Де що знаходиться

- `index.html` - сторінка `Daily`.
- `monthly-review.html` - загальна таблиця вправ за останні 30 днів.
- `progress-chart.html` - графік прогресу для вправ з повторами.
- `breathing-gymnastics.html` - окремий трекер дихальних вправ зі секундоміром.
- `breathing-view.html` - окрема таблиця тільки для дихальних вправ.
- `strength-exercises.html` - силовий трекер з власними вправами і сесіями сетів.
- `strength-view.html` - окрема таблиця по силових тренуваннях.
- `settings.html` - сторінка-заготовка під майбутню синхронізацію з Google Drive.
- `manifest.json` і папка `img/` - PWA-ресурси для favicon та іконок при додаванні на мобільний екран.
- `styles/main.css` - весь вигляд і адаптація для мобільного та ПК.
- `scripts/storage.js` - сховище для `Daily`, скидання дня о 23:00 за Києвом і історія 30 днів.
- `scripts/breathing-storage.js` - окреме сховище для дихальних вправ з власною історією за 30 днів.
- `scripts/strength-storage.js` - окреме сховище `trainingTracker.Strength` для силових вправ без щоденного очищення.
- `scripts/daily.js`, `scripts/review.js`, `scripts/chart.js`, `scripts/breathing.js`, `scripts/breathing-review.js`, `scripts/strength.js`, `scripts/strength-review.js` - логіка сторінок.

## Як додавати нові вправи

- Для `Daily` редагуй масив `EXERCISES` у `scripts/config.js`.
- Для дихання редагуй масив `BREATHING_EXERCISES` у `scripts/breathing-config.js`.
- Для силових вправ нові блоки додаються прямо з інтерфейсу через кнопку `Додати вправу`.

## Типи вправ для Daily

- `reps` - лише повтори (`Пвт`)
- `minutes` - лише хвилини (`Хв`)
- `noteMinutes` - текстовий опис + хвилини
