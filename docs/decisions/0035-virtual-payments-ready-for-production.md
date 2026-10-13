# 0035. Virtual Payments принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-13
- **Кто утвердил:** команда Trava (в чате: «Проверил на staging, все работает. Принимаю.»)
- **Задача бэклога:** Virtual Payments (иллюстрация 6 по [ADR 0012](0012-illustration-audit.md))

## Решение
1. **Версия на staging = «ready to production»** ([ADR 0033](0033-virtual-payments-scenario.md), [ADR 0034](0034-virtual-payments-on-staging.md)). Как у предыдущих пяти ([0018](0018-queue-manager-ready-for-production.md), [0022](0022-client-interaction-ready-for-production.md), [0026](0026-quality-control-ready-for-production.md), [0029](0029-ticketing-ready-for-production.md), [0032](0032-schedule-changes-ready-for-production.md)).
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю».

## Что остаётся открытым
- Footer на staging вставлен вручную, обратно не сверен: возможна описка в блоке Ticketing (поведение то же). Сверить при ближайшей замене footer.
- Экспорт Quality Control переснять и сверить; цвета Ticketing и Schedule Changes в Figma и в SVG расходятся (ADR 0027, 0030).
