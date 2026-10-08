# 0026. Quality Control принят: готов к продакшену

- **Статус:** утверждено
- **Дата:** 2026-10-08
- **Кто утвердил:** команда Trava (в чате: «Я провел анимацию. Выглядит довольно неплохо. Продолжаем.»)
- **Задача бэклога:** Quality Control (иллюстрация 3 по [ADR 0012](0012-illustration-audit.md))

## Контекст
Quality Control ([ADR 0024](0024-quality-control-scenario.md), [0025](0025-quality-control-colours-to-tokens.md)) выложен на staging 2026-10-08 по правилам [ADR 0018](0018-queue-manager-ready-for-production.md) и просмотрен командой.

## Решение
1. **Версия на staging = «ready to production».** Как Queue Manager ([ADR 0018](0018-queue-manager-ready-for-production.md)) и Client Interaction ([ADR 0022](0022-client-interaction-ready-for-production.md)).
2. **Публикация на trava.co не выполнена** — отдельный шаг и отдельное «утверждаю» (все три сразу или по одной).
3. Следующую иллюстрацию начинаем только после отдельного утверждения.

## Что остаётся открытым
- Скорость Quality Control на реальных устройствах (особенно Safari): на реплике без видеокарты 23 кадра/с против 61 у Queue Manager, и одна проверка реплики не проходит из-за собственного скрипта сайта (подробно: `docs/audits/qm-staging.md`). Команда на staging рывков не заметила; если появятся — запасной вариант в том же файле.
- Экспорт SVG из Figma нужно один раз переснять: файл должен совпасть с `animations/quality-control/source/figma-export.svg` (в нём цвета заменены скриптом так же, как в Figma, ADR 0025).
- Footer на staging вставлен вручную по тексту, не копированием файла.
