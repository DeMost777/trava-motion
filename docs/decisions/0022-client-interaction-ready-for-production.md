# 0022. Client Interaction принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-08
- **Кто утвердил:** команда Trava (в чате: «Проверил на staging, всё работает»)
- **Задачи бэклога:** Client Interaction (иллюстрация 2 по [ADR 0012](0012-illustration-audit.md))

## Контекст
Анимация Client Interaction ([ADR 0019](0019-client-interaction-scenario.md), [0020](0020-client-interaction-values.md), [0021](0021-client-interaction-hub-rarely.md))
выложена на staging (`*.webflow.io`) 2026-10-08 по правилам [ADR 0018](0018-queue-manager-ready-for-production.md) и проверена командой.

## Решение
1. **Версия на staging = «ready to production».** Как и Queue Manager.
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю» (для обеих иллюстраций сразу или по одной — решает команда).
3. Следующая иллюстрация — **Quality Control** ([ADR 0012](0012-illustration-audit.md)) — стартует только после отдельного утверждения.

## Последствия
- Footer главной на staging содержит обе анимации (Queue Manager, Client Interaction); эта же сборка пойдёт на trava.co.
- Открыт Q25 (размер сборки ≈42 KB при лимите ≈50k символов) — решить до третьей иллюстрации.
