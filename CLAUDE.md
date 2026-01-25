# Pianora

Система LED-визуализации для цифровых пианино на базе ESP32-S3-WROOM1 (документация docs\esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf)

## Язык общения

Предпочтительный язык: **Русский**. Все ответы, комментарии в коде и коммиты должны быть на русском языке, если не указано иное.

## Общие сведения

- Цифровое пианино: Kawai KDP120
- Прошивка и PWA приложение заливается через OTA вручную пользователем
- После исправления ошибки или реализации фичи необходимо собрать Основную прошивку и Веб-интерфейс и положить в папку `firmware\flash_files`

Каталог `midi` содержит в себе набор файлов формата MIDI для обучения или простого воспроизведения.

## Референсы

- Приложение `/pianolux-esp32` — референс для визуализации
- Kawai KDP120 — целевое пианино
- Контроллер ESP32-S3-WROOM-1 n16r8, документация docs\esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf

### Уточнения для UI

- клавиатура в piano-visualizer должна быть всегда изображена черными клавишами вверх

## Быстрый старт

```bash
# Прошивка (PlatformIO)
cd firmware

# PWA приложение (Angular 19)
cd app

# готовые файлы для ручной прошивки должны быть помещены в firmware\flash_files
# Таблица разделов: default_16MB.csv
| Файл           | Адрес    | Описание              |
| -------------- | -------- | --------------------- |
| bootloader.bin | 0x0      | Загрузчик             |
| partitions.bin | 0x8000   | Таблица разделов      |
| boot_app0.bin  | 0xe000   | OTA boot selector     |
| firmware.bin   | 0x10000  | Основная прошивка     |
| littlefs.bin   | 0x670000| Веб-интерфейс (Angular) |
```

## Структура проекта

```
Pianora/
├── firmware/          # ESP32-S3 прошивка (C++, PlatformIO)
│   ├── src/           # Исходный код (ТОЛЬКО main.cpp и модули!)
│   ├── include/       # Заголовочные файлы
│   ├── data/          # Файлы для LittleFS (копируются из app/dist)
│   ├── flash_files/   # файлы прошивки и приложения
│   └── platformio.ini # Конфигурация сборки
├── app/               # Angular 19 PWA
│   ├── src/app/
│   │   ├── core/      # Сервисы, модели, i18n
│   │   ├── shared/    # Переиспользуемые компоненты
│   │   └── features/  # Основные экраны
│   └── package.json
├── pianolux-esp32/    # пример приложения использующего такой же контроллер esp32 для задачи визуализации игры при помощи WLED
├── docs/              # Документация
├── README.md          # Описание проекта
└── SPECIFICATION.md   # Техническое задание
```

## Архитектура

### Firmware (ESP32-S3)

- **Платформа**: ESP32-S3-WROOM-1-N16R8

  ESP32-S3-WROOM-1-N16R8
  Flash - 16 MB (Quad SPI)
  PSRAM - 8 MB (Octal SPI)
  By default, the SPI flash on the module operates at a maximum clock frequency of 80 MHz and doesnot support the auto suspend feature. If you have a requirement for a higher flash clock frequency of120 MHz

  The modules use PSRAM integrated in the chip’s package

  больше спецификации о контроллере в документе docs\esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf
- **Фреймворк**: Arduino + PlatformIO
- **Основные модули**:

  - `led_controller` — управление WS2812B лентой (FastLED)
  - `midi_handler` — USB MIDI через USB Host
  - `ble_midi` — Bluetooth MIDI (ESP32-BLE-MIDI)
  - `web_server` — HTTP + WebSocket (ESPAsyncWebServer)
  - `wifi_manager` — WiFi AP/Station режимы
  - `settings_manager` — хранение настроек (LittleFS)

    ### Данные о чипе контроллера.

    Chip is ESP32-S3 (QFN56) (revision v0.2)
    Features: Wi-Fi, BT 5 (LE), Dual Core + LP Core, 240MHz, Embedded PSRAM 8MB (AP_3v3)
    Crystal is 40MHz
    MAC: 80b54ee808e8
    Manufacturer: 46
    Device: 4018
    Status value: 0x200200
    Detected flash size: 16MB

### PWA приложение (Angular 19)

- **Фреймворк**: Angular 19 с Signals
- **Сборка**: Standalone components, ESBuild
- **Стили**: SCSS + CSS Variables для тем
- **Состояние**: Angular Signals (без NgRx)
- **i18n**: Собственная реализация (5 языков)

## Режимы LED

| Режим | Описание                                                            |
| ---------- | --------------------------------------------------------------------------- |
| Free Play  | Простая подсветка нажатых клавиш               |
| Visualizer | Эффекты: затухание, волны, градиенты          |
| Split      | Двухцветное разделение клавиатуры            |
| Velocity   | Цвет зависит от силы нажатия                        |
| Random     | Случайные цвета для каждой клавиши            |
| Ambient    | Декоративные эффекты без привязки к игре |
| Learning   | Подсказки для обучения                                  |
| Demo       | Автовоспроизведение композиций                 |

## Источники MIDI

- **USB MIDI** — прямое подключение через USB Host (GPIO19/20)
- **Bluetooth MIDI** — BLE MIDI профиль

## Важные ограничения

### Файлы в firmware/src/

> ⚠️ **ВАЖНО:** В папке `firmware/src/` должен быть только ОДИН файл с функциями `setup()` и `loop()` — это `main.cpp`.

Все остальные `.cpp` файлы должны быть модулями без этих функций. Тестовые файлы (например, `blink_test.cpp`) **нельзя** помещать в `src/`, иначе сборка завершится ошибкой:

```
multiple definition of 'setup()'; first defined in main.cpp
multiple definition of 'loop()'; first defined in main.cpp
```

**Решение:** Удалите лишние файлы или переместите их в отдельную папку (например, `firmware/tests/`).

## Сборка проекта

### Конфигурация PlatformIO

PlatformIO установлен как расширение VS Code. Путь к CLI:

```
C:\Users\m.kravchenko\.platformio\penv\Scripts\pio.exe
```

> **Примечание:** Если путь отличается, замените `m.kravchenko` на актуальное имя пользователя Windows.

**Текущий environment**: `esp32-s3-diag` (определён в platformio.ini)

### Команды сборки (выполнять из корня проекта)

```bash
# Путь к PlatformIO CLI
PIO="C:/Users/m.kravchenko/.platformio/penv/Scripts/pio.exe"

# Сборка прошивки
$PIO run -e esp32-s3-diag -d firmware

# Сборка LittleFS (веб-интерфейс)
$PIO run -e esp32-s3-diag --target buildfs -d firmware

# Сборка веб-приложения
cd app && npm run build && cd ..

# Очистка проекта
$PIO run -e esp32-s3-diag --target clean -d firmware
```

### Полная сборка и подготовка flash_files

После завершения работы над фичей или исправлением бага выполните полную сборку:

```bash
# 1. Сборка Angular приложения
cd app && npm run build && cd ..

# 2. Сборка прошивки и LittleFS
"C:/Users/m.kravchenko/.platformio/penv/Scripts/pio.exe" run -e esp32-s3-diag -d firmware
"C:/Users/m.kravchenko/.platformio/penv/Scripts/pio.exe" run -e esp32-s3-diag --target buildfs -d firmware

# 3. Копирование файлов в flash_files (PowerShell)
Copy-Item "firmware\.pio\build\esp32-s3-diag\firmware.bin" "firmware\flash_files\" -Force
Copy-Item "firmware\.pio\build\esp32-s3-diag\bootloader.bin" "firmware\flash_files\" -Force
Copy-Item "firmware\.pio\build\esp32-s3-diag\partitions.bin" "firmware\flash_files\" -Force
Copy-Item "firmware\.pio\build\esp32-s3-diag\littlefs.bin" "firmware\flash_files\" -Force
```

### Проверка успешности сборки

После сборки в `firmware\flash_files\` должны появиться файлы:

- `firmware.bin` — основная прошивка
- `bootloader.bin` — загрузчик
- `partitions.bin` — таблица разделов
- `littlefs.bin` — веб-интерфейс

  после этого выводи информацию, какие файлы мне нужно обновить.

## Флаги компиляции

В `firmware/include/config.h`:

```cpp
#define USE_ELEGANT_OTA     1   // OTA обновления
#define USE_BLE_MIDI        1   // Bluetooth MIDI
```

## WebSocket протокол

**Подключение:** `ws://{ip}/ws` (порт 80, путь /ws)

Формат сообщений (данные напрямую, без вложенного payload):

```json
{
  "type": "message_type",
  "field": "value"
}
```

**От контроллера**: `status`, `midi_note`, `hotkey`, `calibration_step`
**К контроллеру**: `set_mode`, `set_settings`, `play_note`, `set_expected_notes`, `start_calibration`

## Полезные команды

```bash
# Мониторинг Serial
pio device monitor -b 115200

# Сборка без загрузки
pio run -e esp32-s3

# Очистка
pio run -e esp32-s3 --target clean

# PWA production build
cd app && npm run build:prod
```

## Ключевые файлы

- `firmware/include/config.h` — конфигурация (пины, WiFi, флаги)
- `firmware/src/main.cpp` — точка входа, инициализация
- `firmware/src/led_controller.cpp` — все режимы LED
- `app/src/app/core/services/connection.service.ts` — WebSocket клиент
- `app/src/app/core/i18n/` — локализация (en, ru, de, es, fr)

## Аппаратное подключение

```
ESP32-S3:
  GPIO18 → WS2812B DIN (через резистор 330-470 Ом)
  GPIO19/20 → USB Host (пианино)

Питание:
  5V 10A БП → LED лента + ESP32
  Конденсатор 1000µF на входе ленты
```

## Устранение неполадок

### Ошибки сборки прошивки

| Проблема                                     | Решение                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pio: command not found`                           | Используйте полный путь к PlatformIO CLI                                                                              |
| `No such file or directory: platformio.ini`        | Убедитесь, что находитесь в директории `firmware` или используйте флаг `-d firmware` |
| Ошибка компиляции библиотек | Выполните `pio run -e esp32-s3-diag --target clean -d firmware` и повторите сборку                               |
| Недостаточно памяти (IRAM)         | Проверьте флаги в `config.h`, отключите неиспользуемые модули                                 |
| `multiple definition of 'setup()'` или `'loop()'` | В `firmware/src/` есть лишний .cpp файл с setup()/loop(). Удалите все файлы кроме main.cpp и модулей |

### Ошибки сборки Angular приложения

| Проблема                                        | Решение                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm: command not found`                              | Установите Node.js и npm                                       |
| Ошибки зависимостей                   | Выполните `cd app && npm install`                              |
| Ошибки TypeScript                                 | Проверьте типы в `app/src/app/core/i18n/types.ts`         |
| Размер бандла превышает лимит | Проверьте `angular.json` на корректность budgets |

### Ошибки LittleFS

| Проблема                                      | Решение                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `littlefs.bin` не создаётся              | Убедитесь, что `app/dist/` содержит собранное приложение                 |
| Размер LittleFS превышает раздел | Уменьшите размер приложения или увеличьте раздел в `partitions.csv` |
| `index.html does not exist` после прошивки | Проверьте адрес LittleFS в таблице разделов (см. ниже) |

### Проверка адресов разделов

Адрес LittleFS зависит от используемой таблицы разделов. Чтобы узнать актуальный адрес:

```bash
# Просмотр partitions.bin (после сборки)
xxd firmware/.pio/build/esp32-s3-diag/partitions.bin | head -20
```

Раздел `spiffs` (используется для LittleFS) находится на строке с `7370 6966 6673` (hex для "spiffs").
Адрес читается в little-endian формате из 4-6 байтов после имени.

**Текущая конфигурация (дефолтная таблица):**
- LittleFS: `0x670000` (size: 0x180000 = 1.5MB)

### Общие рекомендации

- При непонятных ошибках сначала выполните очистку: `pio run --target clean`
- Проверяйте версию Node.js: требуется v18+
- При проблемах с зависимостями: удалите `node_modules` и `package-lock.json`, затем `npm install`
