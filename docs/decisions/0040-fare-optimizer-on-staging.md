# 0040. Fare Optimizer на staging

- **Статус:** выполнено, ждёт проверки командой
- **Дата:** 2026-10-16
- **Кто утвердил:** команда Trava (в чате: «Утверждаю, выкладывай на staging»)
- **Задача бэклога:** Fare Optimizer (иллюстрация 8 по [ADR 0012](0012-illustration-audit.md))

## Решение
1. Версия по [ADR 0039](0039-fare-optimizer-scenario.md) выложена на staging (`*.webflow.io`): ассет, обе картинки, footer с восемью анимациями. Детали: [docs/audits/qm-staging.md](../audits/qm-staging.md).
2. `trava.co` и `www.trava.co` не публиковались (lastPublished 2026-09-15).

## Что проверить команде
Десктоп, планшет, телефон, Safari; переключение вкладок; консоль без `[trava-motion]`; вид «стеклянных» плашек «Saved» на фоне сайта; плашка Booking (отклонение 7,5 px от Figma).

## Дальше
После «принимаю» — ADR 0041 «ready to production». Публикация на trava.co — отдельное «утверждаю».
