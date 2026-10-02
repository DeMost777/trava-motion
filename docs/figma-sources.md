# Источники в Figma

Ссылки на макеты, которые являются source of truth. Заполняется командой.

| Что | Ссылка на файл / фрейм | Комментарий |
|---|---|---|
| Файл с продуктовыми карточками | [Landing page, node 271-17280](https://www.figma.com/design/9EMDUpk6j30cPIIzRENFQh/Landing-page?node-id=271-17280) | все карточки и иллюстрации |
| Стили: цвета, эффекты, типографика | | Variables или Color Styles? (Q20) |
| Queue Manager — иллюстрация | [node 732-12579](https://www.figma.com/design/9EMDUpk6j30cPIIzRENFQh/Landing-page?node-id=732-12579) | POC 1, фрейм 480×459, прозрачный фон; в gear есть keyframe-анимация (цикл 2 с) |
| Fare Optimizer — иллюстрация | | POC 2 |
| Ticketing | | |
| Quality Control | | |
| Schedule Changes | | |
| Client Interaction | | |
| Virtual Payments | | |
| Unused Tickets | | |

Доступ: Figma подключается к Claude Code через Figma MCP (задача 0.3). Через него Claude читает
структуру фреймов, переменные (Variables) и делает скриншоты для сверки.

## Найдено при первом чтении (для аудита 1.7)
Queue Manager: переменные `Primary/700 = #075a70`, `Neutral/700 secondary = #454545`;
стили `lINEAR`, `Icon gradient`, `Icon dark`. Слои названы автоматически (`Vector 137`,
`Rectangle 2180`) — потребуется соглашение об именовании (1.6).
