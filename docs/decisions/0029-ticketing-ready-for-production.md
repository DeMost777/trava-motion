# 0029. Ticketing принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-09
- **Кто утвердил:** команда Trava (в чате: «Проверил в Web, в Safari, на разных устройствах, разным разрешением, все работает.»)
- **Задача бэклога:** Ticketing (иллюстрация 4 по [ADR 0012](0012-illustration-audit.md))

## Решение
1. **Версия на staging = «ready to production».** Как Queue Manager ([ADR 0018](0018-queue-manager-ready-for-production.md)), Client Interaction ([ADR 0022](0022-client-interaction-ready-for-production.md)) и Quality Control ([ADR 0026](0026-quality-control-ready-for-production.md)).
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю».
3. Закрыт открытый вопрос о скорости на устройствах для Ticketing: команда проверила Web, Safari, разные устройства и разрешения, рывков нет. Для Quality Control это тоже косвенное подтверждение (те же примитивы и фильтры, на одной странице).

## Что остаётся открытым
- Один раз переснять экспорт Quality Control из Figma и сверить с файлом в репозитории (ADR 0026).
- Цвета билетов в Figma и SVG расходятся ([ADR 0027](0027-ticketing-scenario.md), п. 5).
