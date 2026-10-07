# tools/

Инструменты разработки. На сайт не попадают.

| Скрипт | Что делает | Задача |
|---|---|---|
| `prepare-svg.mjs` | сырой экспорт Figma → SVG для анимации по правилам [ADR 0014](../docs/decisions/0014-svg-preparation-rules.md); пишет файл только если все проверки прошли | 2.4 |

## prepare-svg.mjs
```
NODE_PATH=<папка с playwright>/node_modules \
node tools/prepare-svg.mjs animations/queue-manager/source/figma-export.svg animations/queue-manager/illustration.svg \
  --name queue-manager --expect impulse=24,hub=1,gear=1 \
  --reference animations/queue-manager/source/figma-reference@1x.png --tokens tokens/illustration.tokens.json
```
- `--name` — имя иллюстрации, попадает в `data-trava-animation`.
- `--expect` — какие слои `m-*` и сколько нужны по сценарию. Пропал слой в Figma — скрипт остановится.
- `--reference`, `--tokens` — сравнение с эталоном Figma и проверка цветов (по желанию, но рекомендуется).

Проверки: роли совпадают с `--expect` и с исходником; все `url(#…)` ведут на существующие id; вне `<defs>` id нет;
нет предупреждений `qa/svg-report.mjs`; повторный запуск даёт тот же файл; с Playwright — 0 изменённых пикселей
относительно сырого экспорта, роли находятся в браузере, сравнение с эталоном. Без Playwright визуальные проверки
пропускаются с пометкой в выводе. Зависимостей нет, кроме Node (Playwright — по желанию, стек решается в фазе 4).
