# 0031. Schedule Changes выложен на staging; Ticketing принят

- **Статус:** утверждено (выкладка на staging); публикация на trava.co не выполнена
- **Дата:** 2026-10-09
- **Кто утвердил:** команда Trava (в чате: «Супер анимация готова. Давай его выложим на тест»)
- **Задача бэклога:** Schedule Changes (иллюстрация 5)

## Решение
1. Schedule Changes ([ADR 0030](0030-schedule-changes-scenario.md)) выложен на staging по правилам [ADR 0018](0018-queue-manager-ready-for-production.md): только `*.webflow.io`, `customDomains: []`.
2. Версия на staging — кандидат «ready to production» после проверки командой; отдельный ADR оформляется после неё.
3. Публикация на trava.co — отдельный шаг и отдельное «утверждаю» (Ticketing принят в [ADR 0029](0029-ticketing-ready-for-production.md)).

Детали (id ассета, картинок, footer): `docs/audits/qm-staging.md`, раздел «Schedule Changes на staging».
