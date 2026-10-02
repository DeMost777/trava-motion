# Архитектура среды

Целевая картина: что будет в репозитории, когда пройдём все фазы.
✅ — уже есть, ⬜ — появится в указанной фазе. Пока чего-то нет, папка пустая или её нет.

## Слои

```
 ┌─ Знания и правила ──────────────────────────────────────────────┐
 │ CLAUDE.md · docs/ (концепция, pipeline, решения) · motion/       │
 │ (принципы) · tokens/ (design из Figma + motion)                  │
 ├─ AI-слой (Claude Code, локально) ────────────────────────────────┤
 │ Orchestrator (skill-workflow) → Builder → Skills                 │
 │ Skills: GSAP (официальные) + Trava (наши)                        │
 ├─ Код ────────────────────────────────────────────────────────────┤
 │ src/primitives → src/runtime  ·  animations/<name>/              │
 ├─ Проверка ───────────────────────────────────────────────────────┤
 │ preview/ · qa/                                                   │
 ├─ Доставка ───────────────────────────────────────────────────────┤
 │ exports/webflow/ → Webflow                                       │
 └──────────────────────────────────────────────────────────────────┘
 Вход: Figma (source of truth) через экспорт или Figma MCP
```

## Целевое дерево

```
trava-motion/
├── CLAUDE.md                     ✅ правила для Claude (короткие, всегда в контексте)
├── BACKLOG.md                    ✅ фазы и задачи
├── README.md                     ✅
├── docs/
│   ├── concept.md                ✅ исходная концепция
│   ├── pipeline.md               ✅ флоу одной анимации
│   ├── architecture.md           ✅ этот файл
│   ├── ai-environment.md         ✅ принципы AI-среды (Anthropic)
│   ├── open-questions.md         ✅
│   ├── decisions/                ✅ ADR
│   ├── figma-sources.md          ✅ ссылки на Figma (заполняет команда)
│   └── reference/gsap.md         ✅ откуда GSAP skills и как обновлять
├── .claude/
│   ├── skills/
│   │   ├── gsap-*/               ✅ официальные GSAP skills (не редактируем)
│   │   ├── svg-preparation/      ⬜ фаза 12 (по опыту фазы 2)
│   │   ├── motion-specification/ ⬜ фаза 12 (по опыту фазы 3)
│   │   ├── trava-animation/      ⬜ фаза 12 (primitives, токены, правила GSAP у нас)
│   │   ├── responsive-animation/ ⬜ фаза 12
│   │   ├── webflow-integration/  ⬜ фаза 12 (по опыту фазы 10)
│   │   ├── motion-qa/            ⬜ фаза 12 (по опыту фазы 9)
│   │   └── <orchestrator>/       ⬜ фаза 12, вызывается вручную
│   ├── agents/                   ⬜ фаза 12, если нужна изоляция (Builder / reviewer)
│   └── settings.json             ⬜ permissions и hooks — когда появятся команды (фаза 4+)
├── motion/
│   └── principles.md             ✅ принципы движения (ADR 0006)
├── tokens/                       ⬜ формат — задача 1.8
│   ├── design tokens             ⬜ 1.9 (цвета, эффекты, скругления из Figma)
│   └── motion tokens             ⬜ 1.4 (длительности, easing, stagger)
├── src/
│   ├── primitives/               ⬜ фаза 5
│   └── runtime/                  ⬜ фаза 6
├── animations/<name>/            ⬜ стандарт пакета — фаза 2.5 (черновик ниже)
├── preview/                      ⬜ фаза 7
├── qa/                           ⬜ фаза 9
└── exports/webflow/              ⬜ фаза 10
```

## Пакет анимации (черновик, утверждается в задаче 2.5)

```
animations/fare-optimizer/
  brief.md        исходный бриф человека (RU)
  source.svg      подготовленная иллюстрация из Figma
  reference.png   как выглядит в Figma
  motion.yaml     Motion Specification (EN)
  animation.js    GSAP-реализация
  README.md       особенности, статус
```

## Окружение
- Claude Code запускается **локально** (ADR 0003). Облако — возможно позже, тогда добавим SessionStart hook.
- Бэклог ведётся в `BACKLOG.md` (ADR 0001).
- Figma: доступ ещё не выдан (задача 0.3).
