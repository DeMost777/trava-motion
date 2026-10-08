# quality-control

Иллюстрация «Quality Control» (Figma `761:9334`): автоматическая проверка бронирований. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0024](../../docs/decisions/0024-quality-control-scenario.md), цвета — [ADR 0025](../../docs/decisions/0025-quality-control-colours-to-tokens.md).

**Статус:** движение собрано, стенд и видео — `preview/quality-control.html`, `preview/quality-control-final.mp4`; ждёт ревью команды (✋).

```
node tools/prepare-svg.mjs animations/quality-control
node qa/check-package.mjs animations/quality-control
node tools/build-webflow.mjs
```
