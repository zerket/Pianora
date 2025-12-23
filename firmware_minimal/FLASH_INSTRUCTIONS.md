# Прошивка ESP32-S3 через Flash Download Tool

## Скачивание утилиты

Скачай Flash Download Tool с официального сайта Espressif:
https://www.espressif.com/en/support/download/other-tools

## Подготовка

1. Переведи ESP32-S3 в режим загрузки:
   - Зажми кнопку **BOOT** (GPIO0)
   - Нажми и отпусти **RESET**
   - Отпусти **BOOT**
   - Или: зажми BOOT, подключи USB, отпусти BOOT

2. Проверь, что устройство определилось как COM-порт

## Настройка Flash Download Tool

1. Запусти `flash_download_tool_X.X.X.exe`
2. Выбери:
   - **ChipType**: ESP32-S3
   - **WorkMode**: Develop
   - **LoadMode**: USB

3. Добавь файлы (все из папки `flash_files`):

| Файл | Адрес |
|------|-------|
| bootloader.bin | 0x0 |
| partitions.bin | 0x8000 |
| boot_app0.bin | 0xe000 |
| firmware.bin | 0x10000 |

4. Настройки SPI Flash:
   - **SPI SPEED**: 80MHz
   - **SPI MODE**: QIO
   - **FLASH SIZE**: 16MB (или 8MB для 8-мегабайтного чипа)

5. Выбери COM-порт
6. Baud: 921600 (можно 460800 если нестабильно)

## Прошивка

1. Нажми **START**
2. Дождись завершения (статус FINISH)
3. Нажми **RESET** на плате

## Проверка

После перезагрузки открой Serial Monitor (115200 бaud).
Должны появиться сообщения:

```
=================================
ESP32-S3 Minimal Firmware
=================================
CPU Freq: 240 MHz
Free Heap: XXXXX bytes
...
[0] LED ON  - Uptime: 0 sec
[0] LED OFF - Free heap: XXXXX bytes
```

## Альтернатива: esptool.py

Если Flash Download Tool не работает, используй esptool:

```bash
cd firmware_minimal/flash_files

python -m esptool --chip esp32s3 --port COM3 --baud 921600 \
  write_flash --flash_mode qio --flash_size 16MB \
  0x0 bootloader.bin \
  0x8000 partitions.bin \
  0xe000 boot_app0.bin \
  0x10000 firmware.bin
```

Замени `COM3` на твой порт.

## Проблемы

**Не определяется COM-порт:**
- Установи драйвер CH340/CP2102 (зависит от платы)
- Для нативного USB ESP32-S3: войди в режим загрузки (BOOT+RESET)

**Ошибка при прошивке:**
- Уменьши скорость до 115200
- Проверь, что плата в режиме загрузки
- Попробуй другой USB-кабель (нужен DATA кабель, не только питание)

**После прошивки не работает:**
- Нажми RESET
- Проверь, что все 4 файла прошиты по правильным адресам
