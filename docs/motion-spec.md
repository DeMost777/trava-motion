# Motion Specification (`motion.yaml`)

**Статус:** черновик формата (задача 3.1, [ADR 0016](decisions/0016-motion-spec-format.md)) · пример:
[animations/queue-manager/motion.yaml](../animations/queue-manager/motion.yaml)

Spec описывает, **что** происходит в анимации, языком сцен и приёмов движения (primitives).
**Как** это сделать в GSAP — задача primitive (фаза 5). Пишется на английском (ADR 0002), человеку при
утверждении показывается пересказ на русском.

## Откуда берутся значения
1. **Токены** — `motion.ease.*`, `motion.duration.*`, `motion.trigger.*` из `tokens/motion.tokens.json`.
2. **Темп иллюстрации** — блок `tempo`: значения, утверждённые на стенде для этой иллюстрации (как у Queue Manager,
   ADR 0013). В сценах на них ссылаются как `tempo.<name>`.
3. Больше ниоткуда: чисел «из головы» в сценах нет. Исключения — геометрия (`360deg`) и логические значения.

## Поля
| Поле | Обязательно | Что | Проверка (валидатор 3.3) |
|---|---|---|---|
| `animation` | да | имя пакета | = имя папки и `data-trava-animation` |
| `story` | да | смысл одной-двумя фразами (из брифа) | не пусто |
| `layers` | да | роли и их число | = `roles` в `figma.json` |
| `tempo` | нет | значения темпа этой иллюстрации | на каждое есть ссылка из сцен |
| `trigger` | да | `when` (card-active / viewport), `threshold`, `delay`, `replay` | токены `motion.trigger.*` |
| `loop` | да | `mode` once / infinite; `basis`; `pauseWhen` | infinite → `basis` ссылается на ADR |
| `staticState` | да | что видно без анимации | `design` (принцип: анимация — enhancement) |
| `scenes[]` | да | сцены по порядку | см. ниже |
| `interrupt` | да | что при уходе | `jump-to-design` (принципы §5) |
| `reducedMotion` | да | | `static` (принципы §9) |
| `mobile` | да | `same`, `simplifyIf` | — |

### Сцена
| Поле | Что |
|---|---|
| `id` | короткое имя сцены |
| `intent` | что видит зритель, 1–3 фразы — по нему человек узнаёт бриф |
| `primitive` | приём движения из словаря (черновик — аудит 1.1, утверждение — 5.1) |
| `targets` | роль из `layers` |
| `starts` | `on-trigger`, `when <scene> reaches …`, `after <scene>` |
| `params` | параметры приёма; ease и длительности — токены или `tempo.*` |
| `approxDuration` | для людей: сколько длится сцена (`infinite` для потока) |

## Как утверждается
1. Claude пишет `motion.yaml` по брифу и утверждённому сценарию.
2. Человеку показывается пересказ на русском: что произойдёт, по сценам, с темпом.
3. «Утверждаю» → spec фиксируется; дальнейшие правки по фидбеку меняют spec, а не код (pipeline, шаг «итерации»).
