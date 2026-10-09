# 0028. Ticketing выложен на staging

- **Статус:** утверждено (выкладка на staging); публикация на trava.co не выполнена
- **Дата:** 2026-10-09
- **Кто утвердил:** команда Trava (в чате: «утверждаю» после просмотра видео)
- **Задача бэклога:** Ticketing (иллюстрация 4)

## Решение
1. Ticketing ([ADR 0027](0027-ticketing-scenario.md)) выложен на staging по правилам [ADR 0018](0018-queue-manager-ready-for-production.md): только `*.webflow.io`, `customDomains: []`.
2. Версия на staging — кандидат «ready to production» после проверки командой на staging; отдельное решение (ADR) оформляется после неё.
3. Публикация на trava.co — отдельный шаг и отдельное «утверждаю».

Детали (id ассета, картинок, footer): `docs/audits/qm-staging.md`, раздел «Ticketing на staging».
