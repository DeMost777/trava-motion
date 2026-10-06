# qa/

Чеклисты и автоматические проверки качества. Полноценный QA — фаза 9.

| Скрипт | Что делает | Появился в задаче |
|---|---|---|
| `svg-report.mjs` | факты о сыром SVG из Figma: размер, хэши, id и роли `m-*`, фильтры, clip, градиенты, цвета против токенов. Только чтение, без зависимостей. `node qa/svg-report.mjs <file.svg> tokens/illustration.tokens.json` | 2.1 |
| `svg-compare.mjs` | рендер SVG в Chromium и попиксельное сравнение с эталоном Figma: `render.png`, `diff.png`, `report.json`. Нужен Playwright (`NODE_PATH`) | 2.2 |
| `svg-perf.mjs` | кадры/с при движении слоёв `m-*`: файл как есть, без фильтра корня, без всех фильтров. Ориентировочно (headless) | 2.2 |
