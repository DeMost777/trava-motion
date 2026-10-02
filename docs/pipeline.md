# Pipeline: как создаётся одна анимация

Флоу взят из исходного описания проекта (раздел «Что делает Orchestrator»).
Это целевой процесс: каждый шаг строится и проверяется в своей фазе бэклога.

## Флоу

```
 Человек: SVG/фрейм Figma + бриф словами (RU)
   │
 1. Analyze request ─────────── Orchestrator
 2. Inspect SVG ─────────────── Orchestrator
 3. SVG Preparation ─────────── skill: svg-preparation
 4. Create Motion Specification  (перевод брифа на EN) ── skill: motion-specification
 5. Validate specification ──── скрипт-валидатор
      ✋ Человек утверждает spec
 6. Request animation implementation ── Builder (EN) + GSAP skills + Trava primitives
 7. Run preview ─────────────── preview-среда
 8. Perform QA ──────────────── skill: motion-qa (+ скрипты)
      ✋ «Ready for review» → человек смотрит
      ↺ Фидбек → правится только spec/реализация → снова 5–8
      ✋ Approval
 9. Generate Webflow output ─── skill: webflow-integration
   │
 Webflow
```

## Шаги

| # | Шаг | Исполнитель | Вход | Выход | Язык | Строится в фазе |
|---|---|---|---|---|---|---|
| 1 | Analyze request | Orchestrator | бриф, ссылка на Figma | список «битов» истории, открытые вопросы к человеку | RU с человеком | 12 |
| 2 | Inspect SVG | Orchestrator | экспорт из Figma | какие элементы есть, хватает ли их для брифа | — | 2 |
| 3 | SVG Preparation | skill + скрипт | сырой SVG | `source.svg`: вид не изменился, элементы адресуемы | EN (skill) | 2 |
| 4 | Motion Specification | skill | биты + элементы SVG | `motion.yaml` | **EN** | 3 |
| 5 | Validate | скрипт | `motion.yaml` + `source.svg` | ошибки или «ок» | — | 3 |
| ✋ | Утверждение spec | человек | spec + краткий пересказ на RU | «утверждаю» / правки | RU | — |
| 6 | Implementation | Builder | spec | `animation.js` на primitives и токенах | EN | 5–6, 8 |
| 7 | Preview | Orchestrator | анимация | страница с контролами (размеры, reduced motion, replay) | — | 7 |
| 8 | QA | skill + скрипты | анимация | отчёт: финальный кадр = дизайн, тайминг, responsive, a11y, консоль | — | 9 |
| ✋ | Ready for review | человек | preview + отчёт QA | фидбек или approval | RU | — |
| 9 | Webflow output | skill + скрипт | утверждённая анимация | embed + runtime | EN (skill) | 10 |

## Итерации после ревью
Фидбек вида «график на 20% медленнее, уведомления чуть быстрее»:
1. Orchestrator переводит его в изменения **spec** (токены и позиции), а не правит код напрямую.
2. Повторяются шаги 5 → 6 (если нужно) → 7 → 8.
3. Ответ человеку: что изменилось в spec и таймлайн «до/после».

## Правила флоу
- Orchestrator **не придумывает стиль**: только токены, primitives и принципы из `motion/`.
- Шаг не закрывается без проверки, указанной в таблице.
- Spec — source of truth для движения. Реализация должна ему соответствовать.
- Языки: человек пишет бриф по-русски, spec и всё, что получает Builder, — на английском
  (ADR 0002). Исходный бриф сохраняется в пакете (`brief.md`), чтобы перевод можно было сверить.
