# src/

Код, который попадает на сайт.

| Папка | Что |
|---|---|
| `runtime/trava-motion.js` | находит `data-trava-animation`, встраивает SVG, запускает/сбрасывает анимацию (ADR 0017) |
| `primitives/` | приёмы движения: `impulse-flow.js`, `hub-accent.js` (черновые названия, словарь — 5.1) |

Сборка в один файл для Webflow: `node tools/build-webflow.mjs` → `exports/webflow/trava-motion.js`.
