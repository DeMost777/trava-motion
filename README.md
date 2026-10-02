# Trava Motion

Внутренняя среда для системного производства анимаций иллюстраций сайта Trava:
утверждённая иллюстрация из Figma + текстовое описание движения → единообразная, адаптивная
GSAP-анимация → проверка → интеграция в Webflow.

```
Figma → SVG → подготовка SVG → Motion Spec → GSAP → Preview → QA → Webflow
```

## Статус

🟡 **Фаза 0: фундамент.** Есть структура репозитория, концепция и бэклог.
Утверждено: бэклог в Markdown, языки, локальный Claude Code, SVG + GSAP + JS (см. ADR).
Принципы движения утверждены (ADR 0006). Система токенов (design + motion) **ещё не создана**.

## Как мы работаем

1. Работаем маленькими шагами по [бэклогу](BACKLOG.md), фаза за фазой.
2. У каждой задачи есть критерий «готово» и способ проверки.
3. Задачи с отметкой ✋ требуют явного утверждения, без него следующий шаг не начинается.
4. Каждое утверждённое решение записывается в [журнал решений](docs/decisions/).
5. Пока решения нет, вопрос лежит в [открытых вопросах](docs/open-questions.md), и никто не выбирает «по умолчанию».

## Документы

| Документ | Что внутри |
|---|---|
| [docs/concept.md](docs/concept.md) | концепция и цели проекта (исходный бриф) |
| [docs/pipeline.md](docs/pipeline.md) | рабочий флоу одной анимации (из исходного описания) |
| [docs/architecture.md](docs/architecture.md) | слои среды и целевое дерево репозитория |
| [docs/figma-sources.md](docs/figma-sources.md) | ссылки на макеты и стили в Figma |
| [docs/figma-layer-naming.md](docs/figma-layer-naming.md) | как называть анимируемые слои в Figma |
| [docs/reference/gsap.md](docs/reference/gsap.md) | GSAP: установленные skills и документация |
| [docs/ai-environment.md](docs/ai-environment.md) | как строим AI-среду по рекомендациям Anthropic |
| [BACKLOG.md](BACKLOG.md) | фазы и задачи |
| [docs/decisions/](docs/decisions/) | журнал утверждённых решений (ADR) |
| [docs/open-questions.md](docs/open-questions.md) | вопросы, которые нужно решить |

## Структура репозитория

Папки созданы заранее. Каждая заполняется в своей фазе, а до тех пор в ней лежит только README
с описанием назначения. Расположение skills и agents задано Claude Code (`.claude/`),
см. [docs/ai-environment.md](docs/ai-environment.md).

| Папка | Назначение | Фаза |
|---|---|---|
| `docs/` | концепция, pipeline, решения, вопросы | 0 → постоянно |
| `motion/` | принципы движения | 1 ✅ |
| `tokens/` | система токенов: design (из Figma) + motion | 1 |
| `animations/` | по одному пакету на иллюстрацию | 2, 8 |
| `src/` | primitives и runtime | 5, 6 |
| `preview/` | локальная среда просмотра | 7 |
| `qa/` | проверки качества | 9 |
| `exports/webflow/` | то, что уходит в Webflow | 10 |
| `.claude/skills/` | официальные GSAP skills (уже есть) + Trava skills по проверенному опыту | 0.7, 12 |
| `.claude/agents/` | subagents, только если нужна изоляция | 12 |
