# ticketing

Иллюстрация «Ticketing» (Figma `761:9201`): оформление билетов. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0027](../../docs/decisions/0027-ticketing-scenario.md).

**Статус:** движение собрано, стенд — `preview/ticketing.html`; ждёт ревью команды (✋).

```
node tools/prepare-svg.mjs animations/ticketing
node qa/check-package.mjs animations/ticketing
node tools/build-webflow.mjs
```
