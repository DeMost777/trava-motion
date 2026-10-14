# 0037. Unused Tickets выложен на staging

- **Статус:** утверждено (выкладка на staging); публикация на trava.co не выполнена
- **Дата:** 2026-10-14
- **Кто утвердил:** команда Trava (в чате: «Утверждаю, выкладывай на staging»)
- **Задача бэклога:** Unused Tickets (иллюстрация 7)

## Решение
1. Unused Tickets ([ADR 0036](0036-unused-tickets-scenario.md), с правкой «бесшовный путь купюр») выложен на staging по правилам [ADR 0018](0018-queue-manager-ready-for-production.md): только `*.webflow.io`, `customDomains: []`.
2. Версия на staging — кандидат «ready to production» после проверки командой.
3. Публикация на trava.co — отдельный шаг и отдельное «утверждаю».

Детали: `docs/audits/qm-staging.md`, раздел «Unused Tickets на staging».
