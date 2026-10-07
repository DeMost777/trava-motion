# animations/

Библиотека анимаций: одна папка — одна иллюстрация. Стандарт — [ADR 0015](../docs/decisions/0015-animation-package-standard.md).

## Состав пакета `animations/<name>/`
`<name>` — kebab-case, он же значение `data-trava-animation` на сайте.

| Файл | Кто пишет | Язык | Когда появляется |
|---|---|---|---|
| `README.md` | Claude | RU | сразу: статус пакета и команды |
| `brief.md` | команда | RU | сразу: бриф человека |
| `storyboard.md` | Claude + команда (✋) | RU | сценарий |
| `figma.json` | Claude | EN | после экспорта: узел Figma, нужные слои `roles`, файлы экспорта и эталона с SHA-256 |
| `source/figma-export.svg` | экспорт из Figma | — | не редактируется никогда |
| `source/figma-reference@1x.png` | снимок из Figma | — | эталон для проверок, не редактируется |
| `illustration.svg` | `tools/prepare-svg.mjs` | — | генерируется, хранится в git |
| `motion.yaml` | Claude (✋) | EN | фаза 3: spec для агента |
| `animation.js` | Claude | EN | фаза 8: код анимации |

## Команды
```
node tools/prepare-svg.mjs animations/<name>   # подготовить illustration.svg (правила ADR 0014)
node qa/check-package.mjs animations/<name>     # проверить пакет
```
Новый экспорт из Figma: положить в `source/`, проверить `qa/svg-report.mjs`, обновить хэши в `figma.json`,
запустить подготовку — разница видна в git.
