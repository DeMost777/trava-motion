# virtual-payments

Иллюстрация «Virtual Payments» (Figma `761:8921`): виртуальные карты и их активность. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0033](../../docs/decisions/0033-virtual-payments-scenario.md).

**Статус:** движение собрано, стенд — `preview/virtual-payments.html`; ждёт ревью команды (✋).

```
node tools/prepare-svg.mjs animations/virtual-payments
node qa/check-package.mjs animations/virtual-payments
node tools/build-webflow.mjs
```
