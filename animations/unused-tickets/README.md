# unused-tickets

Иллюстрация «Unused Tickets» (Figma `761:9124`): неиспользованные билеты превращаются в деньги. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0036](../../docs/decisions/0036-unused-tickets-scenario.md).

**Статус:** движение собрано, стенд — `preview/unused-tickets.html`; ждёт ревью команды (✋).

```
node tools/prepare-svg.mjs animations/unused-tickets
node qa/check-package.mjs animations/unused-tickets
node tools/build-webflow.mjs
```
