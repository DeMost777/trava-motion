# 0034. Virtual Payments выложен на staging

- **Статус:** утверждено (выкладка на staging); публикация на trava.co не выполнена
- **Дата:** 2026-10-12
- **Кто утвердил:** команда Trava (в чате: «Утверждаю, выкладывай на staging»)
- **Задача бэклога:** Virtual Payments (иллюстрация 6)

## Решение
1. Virtual Payments ([ADR 0033](0033-virtual-payments-scenario.md)) выложен на staging по правилам [ADR 0018](0018-queue-manager-ready-for-production.md): только `*.webflow.io`, `customDomains: []`.
2. Версия на staging — кандидат «ready to production» после проверки командой; отдельный ADR оформляется после неё.
3. Публикация на trava.co — отдельный шаг и отдельное «утверждаю».

Детали (id ассета, картинок, footer): `docs/audits/qm-staging.md`, раздел «Virtual Payments на staging».
