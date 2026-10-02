# 0004. SVG + GSAP + JavaScript и официальные GSAP skills

- **Статус:** утверждено
- **Дата:** 2026-10-02
- **Кто утвердил:** команда Trava (движок — по исходному описанию проекта; skills — по запросу)
- **Задача бэклога:** 0.7

## Контекст
В описании проекта для V1 выбран стандарт SVG + GSAP + JavaScript (Lottie/Rive не исключаются на будущее).
Агенту нужны точные знания GSAP API. GreenSock публикует официальные skills для AI-агентов (MIT).

## Решение
- Движок V1: SVG + GSAP + vanilla JS.
- Установить в проект 6 официальных skills: gsap-core, gsap-timeline, gsap-scrolltrigger,
  gsap-plugins, gsap-utils, gsap-performance. Без gsap-react / gsap-frameworks (на сайте vanilla JS).
- Skills закреплены на конкретном commit и не редактируются; наши правила — в отдельных Trava skills.

## Последствия
Подробности и процедура обновления: `docs/reference/gsap.md`.
Конкретные версии GSAP, плагины и способ подключения в Webflow решаются в фазе 4.
