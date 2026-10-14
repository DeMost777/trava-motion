# fare-optimizer

Иллюстрация «Fare Optimizer» (Figma `761:9491`, экспорт — экземпляр «Optimization» `761:9492`): снижение цены и перебронирование. Бриф — `brief.md`, сценарий — `storyboard.md`, решения — [ADR 0039](../../docs/decisions/0039-fare-optimizer-scenario.md).

**Статус:** движение собрано, стенд — `preview/fare-optimizer.html`; ждёт ревью команды (✋).

```
node tools/prepare-svg.mjs animations/fare-optimizer
node qa/check-package.mjs animations/fare-optimizer
node tools/build-webflow.mjs
```
