# 0038. Unused Tickets принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-15
- **Кто утвердил:** команда Trava (в чате: «Проверил на staging, все работает. Принимаю.»)
- **Задача бэклога:** Unused Tickets (иллюстрация 7 по [ADR 0012](0012-illustration-audit.md))

## Решение
1. **Версия на staging = «ready to production»** ([ADR 0036](0036-unused-tickets-scenario.md), [ADR 0037](0037-unused-tickets-on-staging.md)). Как у предыдущих шести ([0018](0018-queue-manager-ready-for-production.md), [0022](0022-client-interaction-ready-for-production.md), [0026](0026-quality-control-ready-for-production.md), [0029](0029-ticketing-ready-for-production.md), [0032](0032-schedule-changes-ready-for-production.md), [0035](0035-virtual-payments-ready-for-production.md)).
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю».

## Что остаётся открытым
- Вес `unused-tickets.svg` 805 КБ (остальные до 264 КБ): сильнее уменьшить можно только с потерей качества шумовых картинок.
- Экспорт Quality Control переснять и сверить; цвета Ticketing и Schedule Changes в Figma и в SVG расходятся (ADR 0027, 0030).
- Правка `qa/svg-report.mjs` (ложное предупреждение про внутреннюю тень, ADR 0036) ждёт взгляда команды.
