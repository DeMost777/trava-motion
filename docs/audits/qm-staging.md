# Queue Manager — вставка на staging (шаг 6 плана)

**Дата:** 2026-10-07 · **План:** [qm-to-site.md](../plans/qm-to-site.md) · **Инструкция:** [exports/webflow/README.md](../../exports/webflow/README.md)
Сделано через Webflow MCP после «утверждаю» команды. Сайт: «Trava Website» (`660d6d0477abc806424c5a50`), главная (`660d6d0477abc806424c5a56`).

## Что изменено в Webflow
| Шаг | Что | Проверка |
|---|---|---|
| — | атрибут `data-trava-animation="queue-manager"` на Image карточки (`solution-visual-image`) | уже стоял (добавила команда) |
| 1 | ассет `queue-manager.svg` (id `6ac669d2f892f5bff215ff7c`) | ETag S3 = md5 файла `a25300d7…5582`; S3 отдаёт `Access-Control-Allow-Origin: *`, `image/svg+xml` |
| 2 | Image карточки: `Queue Manager.png` (`6a9868f825cf7e5220f7eeaa`) → SVG | `assetId` элемента = новый ассет; PNG остался в ассетах |
| 3 | Custom code главной, Before `</body>` = `exports/webflow/webflow-custom-code.html` | ответ API вернул записанный код |
| 4 | публикация только на `trava-website.webflow.io` | trava.co / www.trava.co: lastPublished остался 2026-09-15 |

## Замечания
- Публикация Webflow выкладывает все неопубликованные правки сайта, не только наши (на staging).
- Alt text картинки после замены ассета пуст; встроенный SVG всё равно `aria-hidden`. До выхода на trava.co — решить (перенос alt в `aria-label`).
- В Custom code head главной лежит чужой фрагмент `<html lang="en"> … </html>` — не трогали.
- staging и CDN Webflow закрыты из среды разработки: работу на странице проверяет команда.

## Откат
Custom code главной (footer) очистить; в карточке вернуть `Queue Manager.png`; опубликовать.

## Проверка на staging — ждём команду
см. раздел «Проверка на staging» в инструкции.
