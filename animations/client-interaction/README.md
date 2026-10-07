# client-interaction

Иллюстрация «Client interaction» (Figma `761:8858`): 5 сервисов → одна система. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0019](../../docs/decisions/0019-client-interaction-scenario.md).

**Статус:** сценарий утверждён; движение готово на стенде, ждёт ревью (✋): `preview/client-interaction.mp4` (порядок A/B) и `preview/client-interaction-bounce.mp4` (размер отскока). Стенд: `preview/client-interaction.html`, видео — `tools/render-stand.mjs`. Значения со стенда приняты ([ADR 0020](../../docs/decisions/0020-client-interaction-values.md)).

```
node tools/prepare-svg.mjs animations/client-interaction   
node qa/check-package.mjs animations/client-interaction
node tools/build-webflow.mjs
```
