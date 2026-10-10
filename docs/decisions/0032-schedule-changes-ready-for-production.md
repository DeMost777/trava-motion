# 0032. Schedule Changes принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-10
- **Кто утвердил:** команда Trava (в чате: «Все здорово, в принципе, вариант, который отображается сейчас, мне нравится. Давай перейдем к следующей анимации.»)
- **Задача бэклога:** Schedule Changes (иллюстрация 5 по [ADR 0012](0012-illustration-audit.md))

## Решение
1. **Версия на staging = «ready to production»** (с заливкой карточки `#044F64` и тёмным глобусом, [ADR 0030](0030-schedule-changes-scenario.md), п. 10–11). Как у предыдущих четырёх ([0018](0018-queue-manager-ready-for-production.md), [0022](0022-client-interaction-ready-for-production.md), [0026](0026-quality-control-ready-for-production.md), [0029](0029-ticketing-ready-for-production.md)).
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю».

## Что остаётся открытым
- Описка в footer на staging (блок Ticketing, поведение то же): исправить при ближайшей замене footer.
- Экспорт Quality Control переснять и сверить; цвета Ticketing и Schedule Changes в Figma и в SVG расходятся (ADR 0027, 0030).
