# GSAP: документация и skills

## Официальные GSAP skills (установлены)
Источник: [greensock/gsap-skills](https://github.com/greensock/gsap-skills), лицензия MIT
(копия `LICENSE` лежит в каждой папке skill).
Версия: commit `aed9cfd3277740755f6bfc1155c7aa645403b760` (2026-04-21).

| Skill | Зачем нам |
|---|---|
| `gsap-core` | tweens, easing, stagger, `gsap.matchMedia()` (responsive, reduced motion) |
| `gsap-timeline` | последовательности, position parameter, labels — основа наших анимаций |
| `gsap-scrolltrigger` | запуск при появлении секции во viewport (вариант реализации, решаем в фазе 6) |
| `gsap-plugins` | DrawSVG (отрисовка линий), MotionPath (движение по path) и др. |
| `gsap-utils` | `toArray`, `mapRange` и прочие помощники |
| `gsap-performance` | transforms вместо layout, производительность |

Не установлены: `gsap-react`, `gsap-frameworks`. На сайте Webflow используется vanilla JS,
поэтому они не нужны и только занимали бы контекст.

Лежат в `.claude/skills/gsap-*/` и подхватываются Claude Code автоматически по описанию.
Проверка: в локальной сессии выполнить `/skills` — в списке должны быть `gsap-*`.

**Правило:** файлы внутри `gsap-*` не редактируем. Наши правила (токены, primitives,
«финальный кадр = дизайн») будут в собственных Trava skills, которые ссылаются на GSAP skills.

## Как обновить
```bash
git clone --depth 1 https://github.com/greensock/gsap-skills.git /tmp/gsap-skills
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-performance; do
  cp /tmp/gsap-skills/skills/$s/SKILL.md .claude/skills/$s/
  cp /tmp/gsap-skills/LICENSE .claude/skills/$s/LICENSE
done
```
После обновления: запиши новый commit в этот файл, посмотри diff, закоммить отдельно.

## Основная документация
- Документация GSAP: https://gsap.com/docs/v3/
- Индекс skills для AI: https://github.com/greensock/gsap-skills/blob/main/skills/llms.txt
