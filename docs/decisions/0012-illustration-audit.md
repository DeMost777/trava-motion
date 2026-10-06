# 0012. Итоги аудита иллюстраций: роли слоёв, keyframes Figma, порядок работы

- **Статус:** утверждено
- **Дата:** 2026-10-06
- **Кто утвердил:** команда Trava (в чате)
- **Задача бэклога:** 1.1

## Контекст
Аудит 8 иллюстраций секции «ai task» (`732:13130`) — [docs/audits/1.1-illustrations.md](../audits/1.1-illustrations.md).
Остались три вопроса: новая роль `m-pulse` в Client interaction, статус черновых keyframes в Figma,
порядок иллюстраций после POC.

## Варианты
1. `m-pulse` — отдельная роль / та же роль, что `m-impulse`.
2. Keyframes в Figma — ориентир по характеру движения / только прототип, движение задают наши принципы.
3. Следующими после POC — Client interaction и Quality Control / другой порядок.

## Решение
1. **`m-pulse` = `m-impulse`.** У штрихов одно значение, поэтому одно имя. 9 слоёв в Client interaction
   (`761:8871`–`761:8879`) переименованы в `m-impulse` в рабочей копии.
2. **Keyframes в Figma — только прототип.** Движение задают утверждённые принципы
   ([motion/principles.md](../../motion/principles.md)) и токены, без оглядки на прототип в Figma.
3. **Порядок фазы 13:** первым Client interaction, затем Quality Control, остальные — после фазы 11.

## Последствия
- В словаре ролей (`docs/figma-layer-naming.md`) `m-impulse` используется в Queue Manager и Client interaction.
- Пружины, отскоки и циклы из прототипов Figma не переносим; исключения — только через ADR (как 0007).
- Фаза 13 в `BACKLOG.md` начинается с Client interaction.
