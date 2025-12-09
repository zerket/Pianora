import { Injectable, signal, computed } from '@angular/core';

export type Language = 'ru' | 'en' | 'es' | 'fr' | 'de';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

type TranslationKeys = {
  // Navigation
  'nav.play': string;
  'nav.learn': string;
  'nav.library': string;
  'nav.settings': string;

  // Status bar
  'status.connected': string;
  'status.disconnected': string;
  'status.midi': string;
  'status.calibrationNeeded': string;

  // Play page
  'play.title': string;
  'play.selectMode': string;
  'play.quickSettings': string;
  'play.brightness': string;
  'play.color': string;
  'play.fadeTime': string;
  'play.waveEffect': string;
  'play.waveWidth': string;
  'play.activeNotes': string;
  'play.mode.freePlay': string;
  'play.mode.freePlayDesc': string;
  'play.mode.visualizer': string;
  'play.mode.visualizerDesc': string;
  'play.mode.ambient': string;
  'play.mode.ambientDesc': string;
  'play.mode.demo': string;
  'play.mode.demoDesc': string;

  // Learn page
  'learn.title': string;
  'learn.calibrationRequired': string;
  'learn.calibrationRequiredDesc': string;
  'learn.startCalibration': string;
  'learn.selectSong': string;
  'learn.selectSongDesc': string;
  'learn.browseLibrary': string;
  'learn.learningModes': string;
  'learn.waitMode': string;
  'learn.waitModeDesc': string;
  'learn.rhythmMode': string;
  'learn.rhythmModeDesc': string;
  'learn.autoScroll': string;
  'learn.autoScrollDesc': string;
  'learn.sheetMusic': string;
  'learn.sheetMusicDesc': string;

  // Library page
  'library.title': string;
  'library.all': string;
  'library.imported': string;
  'library.recordings': string;
  'library.importMidi': string;
  'library.noSongs': string;
  'library.noSongsDesc': string;
  'library.play': string;
  'library.learnSong': string;
  'library.delete': string;
  'library.storageUsed': string;

  // Settings page
  'settings.title': string;
  'settings.calibration': string;
  'settings.ledCalibration': string;
  'settings.calibrated': string;
  'settings.notCalibrated': string;
  'settings.recalibrate': string;
  'settings.start': string;
  'settings.ledSettings': string;
  'settings.ledCount': string;
  'settings.reversedDirection': string;
  'settings.defaultBrightness': string;
  'settings.wifi': string;
  'settings.wifiMode': string;
  'settings.accessPoint': string;
  'settings.connectToNetwork': string;
  'settings.both': string;
  'settings.networkSsid': string;
  'settings.password': string;
  'settings.apName': string;
  'settings.system': string;
  'settings.firmwareVersion': string;
  'settings.freeMemory': string;
  'settings.checkUpdates': string;
  'settings.restartController': string;
  'settings.factoryReset': string;
  'settings.about': string;
  'settings.appDescription': string;
  'settings.version': string;
  'settings.language': string;

  // Calibration page
  'calibration.title': string;
  'calibration.quickCalibration': string;
  'calibration.quickCalibrationDesc': string;
  'calibration.instruction1': string;
  'calibration.instruction2': string;
  'calibration.instruction3': string;
  'calibration.instruction4': string;
  'calibration.startCalibration': string;
  'calibration.cancel': string;
  'calibration.pressLeftmost': string;
  'calibration.pressLeftmostDesc': string;
  'calibration.pressThisKey': string;
  'calibration.detected': string;
  'calibration.waitingForKey': string;
  'calibration.keyDetected': string;
  'calibration.pressRightmost': string;
  'calibration.pressRightmostDesc': string;
  'calibration.complete': string;
  'calibration.completeDesc': string;
  'calibration.firstKey': string;
  'calibration.lastKey': string;
  'calibration.totalKeys': string;
  'calibration.done': string;

  // Debug panel
  'debug.title': string;
  'debug.simulateNotes': string;
  'debug.randomNote': string;
  'debug.cMajorChord': string;
  'debug.cScale': string;
  'debug.autoSimulation': string;
  'debug.start': string;
  'debug.stop': string;
  'debug.statusToggles': string;
  'debug.toggleMidi': string;
  'debug.toggleCalibrated': string;
  'debug.pianoKeys': string;

  // Common
  'common.unknown': string;
  'common.leds': string;
  'common.ms': string;
  'common.confirmRestart': string;
  'common.confirmFactoryReset': string;
  'common.confirmFactoryResetFinal': string;
  'common.updateNotImplemented': string;
};

type Translations = Record<Language, TranslationKeys>;

const translations: Translations = {
  ru: {
    // Navigation
    'nav.play': 'Игра',
    'nav.learn': 'Обучение',
    'nav.library': 'Библиотека',
    'nav.settings': 'Настройки',

    // Status bar
    'status.connected': 'Подключено',
    'status.disconnected': 'Отключено',
    'status.midi': 'MIDI',
    'status.calibrationNeeded': 'Требуется калибровка',

    // Play page
    'play.title': 'Режим игры',
    'play.selectMode': 'Выберите режим',
    'play.quickSettings': 'Быстрые настройки',
    'play.brightness': 'Яркость',
    'play.color': 'Цвет',
    'play.fadeTime': 'Время затухания (мс)',
    'play.waveEffect': 'Эффект волны',
    'play.waveWidth': 'Ширина волны',
    'play.activeNotes': 'Активные ноты',
    'play.mode.freePlay': 'Свободная игра',
    'play.mode.freePlayDesc': 'Простая подсветка клавиш',
    'play.mode.visualizer': 'Визуализатор',
    'play.mode.visualizerDesc': 'Эффекты и анимации',
    'play.mode.ambient': 'Фоновая',
    'play.mode.ambientDesc': 'Декоративная подсветка',
    'play.mode.demo': 'Демо',
    'play.mode.demoDesc': 'Автовоспроизведение',

    // Learn page
    'learn.title': 'Обучение',
    'learn.calibrationRequired': 'Требуется калибровка',
    'learn.calibrationRequiredDesc': 'Откалибруйте LED-ленту перед использованием режима обучения.',
    'learn.startCalibration': 'Начать калибровку',
    'learn.selectSong': 'Выберите композицию',
    'learn.selectSongDesc': 'Выберите композицию из библиотеки для практики.',
    'learn.browseLibrary': 'Открыть библиотеку',
    'learn.learningModes': 'Режимы обучения',
    'learn.waitMode': 'Режим ожидания',
    'learn.waitModeDesc': 'Композиция ждёт, пока вы нажмёте правильные клавиши.',
    'learn.rhythmMode': 'Режим ритма',
    'learn.rhythmModeDesc': 'Практикуйте игру в правильном ритме и темпе.',
    'learn.autoScroll': 'Автопрокрутка',
    'learn.autoScrollDesc': 'Смотрите автоматическое воспроизведение для изучения нот.',
    'learn.sheetMusic': 'Нотный стан',
    'learn.sheetMusicDesc': 'Здесь появится нотный стан при выборе композиции.',

    // Library page
    'library.title': 'Библиотека',
    'library.all': 'Все',
    'library.imported': 'Импорт',
    'library.recordings': 'Записи',
    'library.importMidi': 'Импорт MIDI файла',
    'library.noSongs': 'Нет композиций',
    'library.noSongsDesc': 'Импортируйте MIDI файлы для начала',
    'library.play': 'Воспроизвести',
    'library.learnSong': 'Учить',
    'library.delete': 'Удалить',
    'library.storageUsed': 'использовано',

    // Settings page
    'settings.title': 'Настройки',
    'settings.calibration': 'Калибровка',
    'settings.ledCalibration': 'Калибровка LED',
    'settings.calibrated': 'Откалибровано',
    'settings.notCalibrated': 'Не откалибровано',
    'settings.recalibrate': 'Перекалибровать',
    'settings.start': 'Начать',
    'settings.ledSettings': 'Настройки LED',
    'settings.ledCount': 'Количество LED',
    'settings.reversedDirection': 'Обратное направление',
    'settings.defaultBrightness': 'Яркость по умолчанию',
    'settings.wifi': 'WiFi',
    'settings.wifiMode': 'Режим',
    'settings.accessPoint': 'Точка доступа',
    'settings.connectToNetwork': 'Подключение к сети',
    'settings.both': 'Оба режима',
    'settings.networkSsid': 'Имя сети',
    'settings.password': 'Пароль',
    'settings.apName': 'Имя точки доступа',
    'settings.system': 'Система',
    'settings.firmwareVersion': 'Версия прошивки',
    'settings.freeMemory': 'Свободная память',
    'settings.checkUpdates': 'Проверить обновления',
    'settings.restartController': 'Перезагрузить контроллер',
    'settings.factoryReset': 'Сброс к заводским',
    'settings.about': 'О приложении',
    'settings.appDescription': 'LED визуализация для цифровых пианино',
    'settings.version': 'Версия',
    'settings.language': 'Язык',

    // Calibration page
    'calibration.title': 'Калибровка',
    'calibration.quickCalibration': 'Быстрая калибровка',
    'calibration.quickCalibrationDesc': 'Мы сопоставим LED-ленту с клавишами пианино. Это займёт несколько секунд.',
    'calibration.instruction1': 'Убедитесь, что пианино подключено по USB',
    'calibration.instruction2': 'Нажмите самую левую клавишу',
    'calibration.instruction3': 'Затем нажмите самую правую клавишу',
    'calibration.instruction4': 'Мы автоматически сопоставим LED со всеми клавишами',
    'calibration.startCalibration': 'Начать калибровку',
    'calibration.cancel': 'Отмена',
    'calibration.pressLeftmost': 'Нажмите самую левую клавишу',
    'calibration.pressLeftmostDesc': 'Нажмите и удерживайте самую левую клавишу на пианино (обычно A0 или самую низкую доступную ноту).',
    'calibration.pressThisKey': '← Нажмите эту клавишу',
    'calibration.detected': 'Обнаружено',
    'calibration.waitingForKey': 'Ожидание нажатия клавиши...',
    'calibration.keyDetected': '✓ Клавиша обнаружена!',
    'calibration.pressRightmost': 'Нажмите самую правую клавишу',
    'calibration.pressRightmostDesc': 'Теперь нажмите и удерживайте самую правую клавишу (обычно C8 или самую высокую доступную ноту).',
    'calibration.complete': 'Калибровка завершена!',
    'calibration.completeDesc': 'LED-лента откалибрована.',
    'calibration.firstKey': 'Первая клавиша',
    'calibration.lastKey': 'Последняя клавиша',
    'calibration.totalKeys': 'Всего клавиш',
    'calibration.done': 'Готово',

    // Debug panel
    'debug.title': 'Панель отладки',
    'debug.simulateNotes': 'Симуляция нот',
    'debug.randomNote': 'Случайная нота',
    'debug.cMajorChord': 'Аккорд До мажор',
    'debug.cScale': 'Гамма До',
    'debug.autoSimulation': 'Автосимуляция',
    'debug.start': '▶ Старт',
    'debug.stop': '⏹ Стоп',
    'debug.statusToggles': 'Переключатели статуса',
    'debug.toggleMidi': 'MIDI',
    'debug.toggleCalibrated': 'Калибровка',
    'debug.pianoKeys': 'Клавиши пианино',

    // Common
    'common.unknown': 'Неизвестно',
    'common.leds': 'LED',
    'common.ms': 'мс',
    'common.confirmRestart': 'Вы уверены, что хотите перезагрузить контроллер?',
    'common.confirmFactoryReset': 'Это удалит все настройки и данные. Вы уверены?',
    'common.confirmFactoryResetFinal': 'Это действие нельзя отменить. Продолжить?',
    'common.updateNotImplemented': 'Проверка обновлений пока не реализована',
  },

  en: {
    // Navigation
    'nav.play': 'Play',
    'nav.learn': 'Learn',
    'nav.library': 'Library',
    'nav.settings': 'Settings',

    // Status bar
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',
    'status.midi': 'MIDI',
    'status.calibrationNeeded': 'Calibration needed',

    // Play page
    'play.title': 'Play Mode',
    'play.selectMode': 'Select Mode',
    'play.quickSettings': 'Quick Settings',
    'play.brightness': 'Brightness',
    'play.color': 'Color',
    'play.fadeTime': 'Fade Time (ms)',
    'play.waveEffect': 'Wave Effect',
    'play.waveWidth': 'Wave Width',
    'play.activeNotes': 'Active Notes',
    'play.mode.freePlay': 'Free Play',
    'play.mode.freePlayDesc': 'Simple key highlighting',
    'play.mode.visualizer': 'Visualizer',
    'play.mode.visualizerDesc': 'Effects and animations',
    'play.mode.ambient': 'Ambient',
    'play.mode.ambientDesc': 'Decorative lighting',
    'play.mode.demo': 'Demo',
    'play.mode.demoDesc': 'Auto playback',

    // Learn page
    'learn.title': 'Learn',
    'learn.calibrationRequired': 'Calibration Required',
    'learn.calibrationRequiredDesc': 'Please calibrate your LED strip before using learning mode.',
    'learn.startCalibration': 'Start Calibration',
    'learn.selectSong': 'Select a Song',
    'learn.selectSongDesc': 'Choose a song from your library to practice.',
    'learn.browseLibrary': 'Browse Library',
    'learn.learningModes': 'Learning Modes',
    'learn.waitMode': 'Wait Mode',
    'learn.waitModeDesc': 'The song waits for you to press the correct keys before moving on.',
    'learn.rhythmMode': 'Rhythm Mode',
    'learn.rhythmModeDesc': 'Practice playing in the correct rhythm and timing.',
    'learn.autoScroll': 'Auto-scroll',
    'learn.autoScrollDesc': 'Watch the song play automatically to learn the notes.',
    'learn.sheetMusic': 'Sheet Music',
    'learn.sheetMusicDesc': 'Sheet music display will appear here when a song is selected.',

    // Library page
    'library.title': 'Library',
    'library.all': 'All',
    'library.imported': 'Imported',
    'library.recordings': 'Recordings',
    'library.importMidi': 'Import MIDI File',
    'library.noSongs': 'No songs yet',
    'library.noSongsDesc': 'Import MIDI files to get started',
    'library.play': 'Play',
    'library.learnSong': 'Learn',
    'library.delete': 'Delete',
    'library.storageUsed': 'used',

    // Settings page
    'settings.title': 'Settings',
    'settings.calibration': 'Calibration',
    'settings.ledCalibration': 'LED Calibration',
    'settings.calibrated': 'Calibrated',
    'settings.notCalibrated': 'Not calibrated',
    'settings.recalibrate': 'Recalibrate',
    'settings.start': 'Start',
    'settings.ledSettings': 'LED Settings',
    'settings.ledCount': 'LED Count',
    'settings.reversedDirection': 'Reversed Direction',
    'settings.defaultBrightness': 'Default Brightness',
    'settings.wifi': 'WiFi',
    'settings.wifiMode': 'Mode',
    'settings.accessPoint': 'Access Point',
    'settings.connectToNetwork': 'Connect to Network',
    'settings.both': 'Both',
    'settings.networkSsid': 'Network SSID',
    'settings.password': 'Password',
    'settings.apName': 'AP Name',
    'settings.system': 'System',
    'settings.firmwareVersion': 'Firmware Version',
    'settings.freeMemory': 'Free Memory',
    'settings.checkUpdates': 'Check for Updates',
    'settings.restartController': 'Restart Controller',
    'settings.factoryReset': 'Factory Reset',
    'settings.about': 'About',
    'settings.appDescription': 'LED visualization for digital pianos',
    'settings.version': 'Version',
    'settings.language': 'Language',

    // Calibration page
    'calibration.title': 'Calibration',
    'calibration.quickCalibration': 'Quick Calibration',
    'calibration.quickCalibrationDesc': "We'll match your LED strip to your piano keys. This only takes a few seconds.",
    'calibration.instruction1': 'Make sure your piano is connected via USB',
    'calibration.instruction2': "You'll press the leftmost key on your piano",
    'calibration.instruction3': 'Then press the rightmost key',
    'calibration.instruction4': "We'll automatically map the LEDs to all keys",
    'calibration.startCalibration': 'Start Calibration',
    'calibration.cancel': 'Cancel',
    'calibration.pressLeftmost': 'Press the Leftmost Key',
    'calibration.pressLeftmostDesc': 'Press and hold the leftmost key on your piano (usually A0 or the lowest note available).',
    'calibration.pressThisKey': '← Press this key',
    'calibration.detected': 'Detected',
    'calibration.waitingForKey': 'Waiting for key press...',
    'calibration.keyDetected': '✓ Key detected!',
    'calibration.pressRightmost': 'Press the Rightmost Key',
    'calibration.pressRightmostDesc': 'Now press and hold the rightmost key on your piano (usually C8 or the highest note available).',
    'calibration.complete': 'Calibration Complete!',
    'calibration.completeDesc': 'Your LED strip is now calibrated.',
    'calibration.firstKey': 'First key',
    'calibration.lastKey': 'Last key',
    'calibration.totalKeys': 'Total keys',
    'calibration.done': 'Done',

    // Debug panel
    'debug.title': 'Debug Panel',
    'debug.simulateNotes': 'Simulate Notes',
    'debug.randomNote': 'Random Note',
    'debug.cMajorChord': 'C Major Chord',
    'debug.cScale': 'C Scale',
    'debug.autoSimulation': 'Auto Simulation',
    'debug.start': '▶ Start',
    'debug.stop': '⏹ Stop',
    'debug.statusToggles': 'Status Toggles',
    'debug.toggleMidi': 'MIDI',
    'debug.toggleCalibrated': 'Calibrated',
    'debug.pianoKeys': 'Piano Keys',

    // Common
    'common.unknown': 'Unknown',
    'common.leds': 'LEDs',
    'common.ms': 'ms',
    'common.confirmRestart': 'Are you sure you want to restart the controller?',
    'common.confirmFactoryReset': 'This will erase all settings and data. Are you sure?',
    'common.confirmFactoryResetFinal': 'This action cannot be undone. Continue?',
    'common.updateNotImplemented': 'Update check not implemented yet',
  },

  es: {
    // Navigation
    'nav.play': 'Tocar',
    'nav.learn': 'Aprender',
    'nav.library': 'Biblioteca',
    'nav.settings': 'Ajustes',

    // Status bar
    'status.connected': 'Conectado',
    'status.disconnected': 'Desconectado',
    'status.midi': 'MIDI',
    'status.calibrationNeeded': 'Calibración necesaria',

    // Play page
    'play.title': 'Modo de juego',
    'play.selectMode': 'Seleccionar modo',
    'play.quickSettings': 'Ajustes rápidos',
    'play.brightness': 'Brillo',
    'play.color': 'Color',
    'play.fadeTime': 'Tiempo de desvanecimiento (ms)',
    'play.waveEffect': 'Efecto de onda',
    'play.waveWidth': 'Ancho de onda',
    'play.activeNotes': 'Notas activas',
    'play.mode.freePlay': 'Juego libre',
    'play.mode.freePlayDesc': 'Iluminación simple de teclas',
    'play.mode.visualizer': 'Visualizador',
    'play.mode.visualizerDesc': 'Efectos y animaciones',
    'play.mode.ambient': 'Ambiente',
    'play.mode.ambientDesc': 'Iluminación decorativa',
    'play.mode.demo': 'Demo',
    'play.mode.demoDesc': 'Reproducción automática',

    // Learn page
    'learn.title': 'Aprender',
    'learn.calibrationRequired': 'Calibración requerida',
    'learn.calibrationRequiredDesc': 'Calibre su tira LED antes de usar el modo de aprendizaje.',
    'learn.startCalibration': 'Iniciar calibración',
    'learn.selectSong': 'Seleccionar canción',
    'learn.selectSongDesc': 'Elija una canción de su biblioteca para practicar.',
    'learn.browseLibrary': 'Explorar biblioteca',
    'learn.learningModes': 'Modos de aprendizaje',
    'learn.waitMode': 'Modo espera',
    'learn.waitModeDesc': 'La canción espera a que presione las teclas correctas.',
    'learn.rhythmMode': 'Modo ritmo',
    'learn.rhythmModeDesc': 'Practique tocando con el ritmo y tiempo correctos.',
    'learn.autoScroll': 'Desplazamiento automático',
    'learn.autoScrollDesc': 'Vea la canción reproducirse automáticamente para aprender las notas.',
    'learn.sheetMusic': 'Partitura',
    'learn.sheetMusicDesc': 'La partitura aparecerá aquí cuando se seleccione una canción.',

    // Library page
    'library.title': 'Biblioteca',
    'library.all': 'Todo',
    'library.imported': 'Importado',
    'library.recordings': 'Grabaciones',
    'library.importMidi': 'Importar archivo MIDI',
    'library.noSongs': 'Sin canciones',
    'library.noSongsDesc': 'Importe archivos MIDI para comenzar',
    'library.play': 'Reproducir',
    'library.learnSong': 'Aprender',
    'library.delete': 'Eliminar',
    'library.storageUsed': 'usado',

    // Settings page
    'settings.title': 'Ajustes',
    'settings.calibration': 'Calibración',
    'settings.ledCalibration': 'Calibración LED',
    'settings.calibrated': 'Calibrado',
    'settings.notCalibrated': 'No calibrado',
    'settings.recalibrate': 'Recalibrar',
    'settings.start': 'Iniciar',
    'settings.ledSettings': 'Ajustes LED',
    'settings.ledCount': 'Cantidad de LED',
    'settings.reversedDirection': 'Dirección invertida',
    'settings.defaultBrightness': 'Brillo predeterminado',
    'settings.wifi': 'WiFi',
    'settings.wifiMode': 'Modo',
    'settings.accessPoint': 'Punto de acceso',
    'settings.connectToNetwork': 'Conectar a red',
    'settings.both': 'Ambos',
    'settings.networkSsid': 'SSID de red',
    'settings.password': 'Contraseña',
    'settings.apName': 'Nombre del AP',
    'settings.system': 'Sistema',
    'settings.firmwareVersion': 'Versión de firmware',
    'settings.freeMemory': 'Memoria libre',
    'settings.checkUpdates': 'Buscar actualizaciones',
    'settings.restartController': 'Reiniciar controlador',
    'settings.factoryReset': 'Restablecer fábrica',
    'settings.about': 'Acerca de',
    'settings.appDescription': 'Visualización LED para pianos digitales',
    'settings.version': 'Versión',
    'settings.language': 'Idioma',

    // Calibration page
    'calibration.title': 'Calibración',
    'calibration.quickCalibration': 'Calibración rápida',
    'calibration.quickCalibrationDesc': 'Emparejaremos su tira LED con las teclas del piano. Solo toma unos segundos.',
    'calibration.instruction1': 'Asegúrese de que el piano esté conectado por USB',
    'calibration.instruction2': 'Presione la tecla más a la izquierda',
    'calibration.instruction3': 'Luego presione la tecla más a la derecha',
    'calibration.instruction4': 'Mapearemos automáticamente los LED a todas las teclas',
    'calibration.startCalibration': 'Iniciar calibración',
    'calibration.cancel': 'Cancelar',
    'calibration.pressLeftmost': 'Presione la tecla izquierda',
    'calibration.pressLeftmostDesc': 'Presione y mantenga la tecla más a la izquierda (normalmente A0 o la nota más baja).',
    'calibration.pressThisKey': '← Presione esta tecla',
    'calibration.detected': 'Detectado',
    'calibration.waitingForKey': 'Esperando pulsación...',
    'calibration.keyDetected': '✓ ¡Tecla detectada!',
    'calibration.pressRightmost': 'Presione la tecla derecha',
    'calibration.pressRightmostDesc': 'Ahora presione y mantenga la tecla más a la derecha (normalmente C8 o la nota más alta).',
    'calibration.complete': '¡Calibración completa!',
    'calibration.completeDesc': 'Su tira LED está calibrada.',
    'calibration.firstKey': 'Primera tecla',
    'calibration.lastKey': 'Última tecla',
    'calibration.totalKeys': 'Total de teclas',
    'calibration.done': 'Listo',

    // Debug panel
    'debug.title': 'Panel de depuración',
    'debug.simulateNotes': 'Simular notas',
    'debug.randomNote': 'Nota aleatoria',
    'debug.cMajorChord': 'Acorde Do Mayor',
    'debug.cScale': 'Escala de Do',
    'debug.autoSimulation': 'Simulación automática',
    'debug.start': '▶ Iniciar',
    'debug.stop': '⏹ Detener',
    'debug.statusToggles': 'Interruptores de estado',
    'debug.toggleMidi': 'MIDI',
    'debug.toggleCalibrated': 'Calibrado',
    'debug.pianoKeys': 'Teclas del piano',

    // Common
    'common.unknown': 'Desconocido',
    'common.leds': 'LEDs',
    'common.ms': 'ms',
    'common.confirmRestart': '¿Está seguro de que desea reiniciar el controlador?',
    'common.confirmFactoryReset': 'Esto borrará todos los ajustes y datos. ¿Está seguro?',
    'common.confirmFactoryResetFinal': 'Esta acción no se puede deshacer. ¿Continuar?',
    'common.updateNotImplemented': 'Verificación de actualizaciones aún no implementada',
  },

  fr: {
    // Navigation
    'nav.play': 'Jouer',
    'nav.learn': 'Apprendre',
    'nav.library': 'Bibliothèque',
    'nav.settings': 'Paramètres',

    // Status bar
    'status.connected': 'Connecté',
    'status.disconnected': 'Déconnecté',
    'status.midi': 'MIDI',
    'status.calibrationNeeded': 'Calibration nécessaire',

    // Play page
    'play.title': 'Mode de jeu',
    'play.selectMode': 'Sélectionner le mode',
    'play.quickSettings': 'Paramètres rapides',
    'play.brightness': 'Luminosité',
    'play.color': 'Couleur',
    'play.fadeTime': 'Temps de fondu (ms)',
    'play.waveEffect': 'Effet de vague',
    'play.waveWidth': 'Largeur de vague',
    'play.activeNotes': 'Notes actives',
    'play.mode.freePlay': 'Jeu libre',
    'play.mode.freePlayDesc': 'Éclairage simple des touches',
    'play.mode.visualizer': 'Visualiseur',
    'play.mode.visualizerDesc': 'Effets et animations',
    'play.mode.ambient': 'Ambiance',
    'play.mode.ambientDesc': 'Éclairage décoratif',
    'play.mode.demo': 'Démo',
    'play.mode.demoDesc': 'Lecture automatique',

    // Learn page
    'learn.title': 'Apprendre',
    'learn.calibrationRequired': 'Calibration requise',
    'learn.calibrationRequiredDesc': 'Veuillez calibrer votre bande LED avant d\'utiliser le mode d\'apprentissage.',
    'learn.startCalibration': 'Démarrer la calibration',
    'learn.selectSong': 'Sélectionner un morceau',
    'learn.selectSongDesc': 'Choisissez un morceau de votre bibliothèque pour pratiquer.',
    'learn.browseLibrary': 'Parcourir la bibliothèque',
    'learn.learningModes': 'Modes d\'apprentissage',
    'learn.waitMode': 'Mode attente',
    'learn.waitModeDesc': 'Le morceau attend que vous appuyiez sur les bonnes touches.',
    'learn.rhythmMode': 'Mode rythme',
    'learn.rhythmModeDesc': 'Pratiquez en jouant avec le bon rythme et tempo.',
    'learn.autoScroll': 'Défilement automatique',
    'learn.autoScrollDesc': 'Regardez le morceau jouer automatiquement pour apprendre les notes.',
    'learn.sheetMusic': 'Partition',
    'learn.sheetMusicDesc': 'La partition apparaîtra ici lorsqu\'un morceau sera sélectionné.',

    // Library page
    'library.title': 'Bibliothèque',
    'library.all': 'Tout',
    'library.imported': 'Importé',
    'library.recordings': 'Enregistrements',
    'library.importMidi': 'Importer fichier MIDI',
    'library.noSongs': 'Pas de morceaux',
    'library.noSongsDesc': 'Importez des fichiers MIDI pour commencer',
    'library.play': 'Lire',
    'library.learnSong': 'Apprendre',
    'library.delete': 'Supprimer',
    'library.storageUsed': 'utilisé',

    // Settings page
    'settings.title': 'Paramètres',
    'settings.calibration': 'Calibration',
    'settings.ledCalibration': 'Calibration LED',
    'settings.calibrated': 'Calibré',
    'settings.notCalibrated': 'Non calibré',
    'settings.recalibrate': 'Recalibrer',
    'settings.start': 'Démarrer',
    'settings.ledSettings': 'Paramètres LED',
    'settings.ledCount': 'Nombre de LED',
    'settings.reversedDirection': 'Direction inversée',
    'settings.defaultBrightness': 'Luminosité par défaut',
    'settings.wifi': 'WiFi',
    'settings.wifiMode': 'Mode',
    'settings.accessPoint': 'Point d\'accès',
    'settings.connectToNetwork': 'Connexion au réseau',
    'settings.both': 'Les deux',
    'settings.networkSsid': 'SSID du réseau',
    'settings.password': 'Mot de passe',
    'settings.apName': 'Nom du PA',
    'settings.system': 'Système',
    'settings.firmwareVersion': 'Version du firmware',
    'settings.freeMemory': 'Mémoire libre',
    'settings.checkUpdates': 'Vérifier les mises à jour',
    'settings.restartController': 'Redémarrer le contrôleur',
    'settings.factoryReset': 'Réinitialisation usine',
    'settings.about': 'À propos',
    'settings.appDescription': 'Visualisation LED pour pianos numériques',
    'settings.version': 'Version',
    'settings.language': 'Langue',

    // Calibration page
    'calibration.title': 'Calibration',
    'calibration.quickCalibration': 'Calibration rapide',
    'calibration.quickCalibrationDesc': 'Nous allons associer votre bande LED aux touches du piano. Cela ne prend que quelques secondes.',
    'calibration.instruction1': 'Assurez-vous que le piano est connecté via USB',
    'calibration.instruction2': 'Appuyez sur la touche la plus à gauche',
    'calibration.instruction3': 'Puis appuyez sur la touche la plus à droite',
    'calibration.instruction4': 'Nous mapperons automatiquement les LED à toutes les touches',
    'calibration.startCalibration': 'Démarrer la calibration',
    'calibration.cancel': 'Annuler',
    'calibration.pressLeftmost': 'Appuyez sur la touche gauche',
    'calibration.pressLeftmostDesc': 'Appuyez et maintenez la touche la plus à gauche (généralement A0 ou la note la plus basse).',
    'calibration.pressThisKey': '← Appuyez sur cette touche',
    'calibration.detected': 'Détecté',
    'calibration.waitingForKey': 'En attente de pression...',
    'calibration.keyDetected': '✓ Touche détectée !',
    'calibration.pressRightmost': 'Appuyez sur la touche droite',
    'calibration.pressRightmostDesc': 'Maintenant appuyez et maintenez la touche la plus à droite (généralement C8 ou la note la plus haute).',
    'calibration.complete': 'Calibration terminée !',
    'calibration.completeDesc': 'Votre bande LED est maintenant calibrée.',
    'calibration.firstKey': 'Première touche',
    'calibration.lastKey': 'Dernière touche',
    'calibration.totalKeys': 'Total des touches',
    'calibration.done': 'Terminé',

    // Debug panel
    'debug.title': 'Panneau de débogage',
    'debug.simulateNotes': 'Simuler des notes',
    'debug.randomNote': 'Note aléatoire',
    'debug.cMajorChord': 'Accord Do Majeur',
    'debug.cScale': 'Gamme de Do',
    'debug.autoSimulation': 'Simulation automatique',
    'debug.start': '▶ Démarrer',
    'debug.stop': '⏹ Arrêter',
    'debug.statusToggles': 'Basculeurs d\'état',
    'debug.toggleMidi': 'MIDI',
    'debug.toggleCalibrated': 'Calibré',
    'debug.pianoKeys': 'Touches du piano',

    // Common
    'common.unknown': 'Inconnu',
    'common.leds': 'LEDs',
    'common.ms': 'ms',
    'common.confirmRestart': 'Êtes-vous sûr de vouloir redémarrer le contrôleur ?',
    'common.confirmFactoryReset': 'Cela effacera tous les paramètres et données. Êtes-vous sûr ?',
    'common.confirmFactoryResetFinal': 'Cette action est irréversible. Continuer ?',
    'common.updateNotImplemented': 'Vérification des mises à jour pas encore implémentée',
  },

  de: {
    // Navigation
    'nav.play': 'Spielen',
    'nav.learn': 'Lernen',
    'nav.library': 'Bibliothek',
    'nav.settings': 'Einstellungen',

    // Status bar
    'status.connected': 'Verbunden',
    'status.disconnected': 'Getrennt',
    'status.midi': 'MIDI',
    'status.calibrationNeeded': 'Kalibrierung erforderlich',

    // Play page
    'play.title': 'Spielmodus',
    'play.selectMode': 'Modus wählen',
    'play.quickSettings': 'Schnelleinstellungen',
    'play.brightness': 'Helligkeit',
    'play.color': 'Farbe',
    'play.fadeTime': 'Ausblendzeit (ms)',
    'play.waveEffect': 'Welleneffekt',
    'play.waveWidth': 'Wellenbreite',
    'play.activeNotes': 'Aktive Noten',
    'play.mode.freePlay': 'Freies Spiel',
    'play.mode.freePlayDesc': 'Einfache Tastenbeleuchtung',
    'play.mode.visualizer': 'Visualisierer',
    'play.mode.visualizerDesc': 'Effekte und Animationen',
    'play.mode.ambient': 'Ambiente',
    'play.mode.ambientDesc': 'Dekorative Beleuchtung',
    'play.mode.demo': 'Demo',
    'play.mode.demoDesc': 'Automatische Wiedergabe',

    // Learn page
    'learn.title': 'Lernen',
    'learn.calibrationRequired': 'Kalibrierung erforderlich',
    'learn.calibrationRequiredDesc': 'Bitte kalibrieren Sie Ihren LED-Streifen vor dem Lernmodus.',
    'learn.startCalibration': 'Kalibrierung starten',
    'learn.selectSong': 'Lied auswählen',
    'learn.selectSongDesc': 'Wählen Sie ein Lied aus Ihrer Bibliothek zum Üben.',
    'learn.browseLibrary': 'Bibliothek durchsuchen',
    'learn.learningModes': 'Lernmodi',
    'learn.waitMode': 'Wartemodus',
    'learn.waitModeDesc': 'Das Lied wartet, bis Sie die richtigen Tasten drücken.',
    'learn.rhythmMode': 'Rhythmusmodus',
    'learn.rhythmModeDesc': 'Üben Sie das Spielen im richtigen Rhythmus und Tempo.',
    'learn.autoScroll': 'Automatisches Scrollen',
    'learn.autoScrollDesc': 'Sehen Sie das Lied automatisch abspielen, um die Noten zu lernen.',
    'learn.sheetMusic': 'Notenblatt',
    'learn.sheetMusicDesc': 'Das Notenblatt erscheint hier, wenn ein Lied ausgewählt wird.',

    // Library page
    'library.title': 'Bibliothek',
    'library.all': 'Alle',
    'library.imported': 'Importiert',
    'library.recordings': 'Aufnahmen',
    'library.importMidi': 'MIDI-Datei importieren',
    'library.noSongs': 'Keine Lieder',
    'library.noSongsDesc': 'Importieren Sie MIDI-Dateien zum Starten',
    'library.play': 'Abspielen',
    'library.learnSong': 'Lernen',
    'library.delete': 'Löschen',
    'library.storageUsed': 'verwendet',

    // Settings page
    'settings.title': 'Einstellungen',
    'settings.calibration': 'Kalibrierung',
    'settings.ledCalibration': 'LED-Kalibrierung',
    'settings.calibrated': 'Kalibriert',
    'settings.notCalibrated': 'Nicht kalibriert',
    'settings.recalibrate': 'Neu kalibrieren',
    'settings.start': 'Starten',
    'settings.ledSettings': 'LED-Einstellungen',
    'settings.ledCount': 'LED-Anzahl',
    'settings.reversedDirection': 'Umgekehrte Richtung',
    'settings.defaultBrightness': 'Standardhelligkeit',
    'settings.wifi': 'WLAN',
    'settings.wifiMode': 'Modus',
    'settings.accessPoint': 'Zugangspunkt',
    'settings.connectToNetwork': 'Mit Netzwerk verbinden',
    'settings.both': 'Beide',
    'settings.networkSsid': 'Netzwerk-SSID',
    'settings.password': 'Passwort',
    'settings.apName': 'AP-Name',
    'settings.system': 'System',
    'settings.firmwareVersion': 'Firmware-Version',
    'settings.freeMemory': 'Freier Speicher',
    'settings.checkUpdates': 'Nach Updates suchen',
    'settings.restartController': 'Controller neu starten',
    'settings.factoryReset': 'Werkseinstellungen',
    'settings.about': 'Über',
    'settings.appDescription': 'LED-Visualisierung für Digitalpianos',
    'settings.version': 'Version',
    'settings.language': 'Sprache',

    // Calibration page
    'calibration.title': 'Kalibrierung',
    'calibration.quickCalibration': 'Schnellkalibrierung',
    'calibration.quickCalibrationDesc': 'Wir ordnen Ihren LED-Streifen den Klaviertasten zu. Das dauert nur wenige Sekunden.',
    'calibration.instruction1': 'Stellen Sie sicher, dass das Klavier über USB verbunden ist',
    'calibration.instruction2': 'Drücken Sie die linkeste Taste',
    'calibration.instruction3': 'Dann drücken Sie die rechteste Taste',
    'calibration.instruction4': 'Wir ordnen die LEDs automatisch allen Tasten zu',
    'calibration.startCalibration': 'Kalibrierung starten',
    'calibration.cancel': 'Abbrechen',
    'calibration.pressLeftmost': 'Drücken Sie die linke Taste',
    'calibration.pressLeftmostDesc': 'Drücken und halten Sie die linkeste Taste (normalerweise A0 oder die tiefste Note).',
    'calibration.pressThisKey': '← Drücken Sie diese Taste',
    'calibration.detected': 'Erkannt',
    'calibration.waitingForKey': 'Warte auf Tastendruck...',
    'calibration.keyDetected': '✓ Taste erkannt!',
    'calibration.pressRightmost': 'Drücken Sie die rechte Taste',
    'calibration.pressRightmostDesc': 'Drücken und halten Sie jetzt die rechteste Taste (normalerweise C8 oder die höchste Note).',
    'calibration.complete': 'Kalibrierung abgeschlossen!',
    'calibration.completeDesc': 'Ihr LED-Streifen ist jetzt kalibriert.',
    'calibration.firstKey': 'Erste Taste',
    'calibration.lastKey': 'Letzte Taste',
    'calibration.totalKeys': 'Gesamtzahl Tasten',
    'calibration.done': 'Fertig',

    // Debug panel
    'debug.title': 'Debug-Panel',
    'debug.simulateNotes': 'Noten simulieren',
    'debug.randomNote': 'Zufällige Note',
    'debug.cMajorChord': 'C-Dur-Akkord',
    'debug.cScale': 'C-Tonleiter',
    'debug.autoSimulation': 'Automatische Simulation',
    'debug.start': '▶ Start',
    'debug.stop': '⏹ Stopp',
    'debug.statusToggles': 'Status-Schalter',
    'debug.toggleMidi': 'MIDI',
    'debug.toggleCalibrated': 'Kalibriert',
    'debug.pianoKeys': 'Klaviertasten',

    // Common
    'common.unknown': 'Unbekannt',
    'common.leds': 'LEDs',
    'common.ms': 'ms',
    'common.confirmRestart': 'Sind Sie sicher, dass Sie den Controller neu starten möchten?',
    'common.confirmFactoryReset': 'Dies löscht alle Einstellungen und Daten. Sind Sie sicher?',
    'common.confirmFactoryResetFinal': 'Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?',
    'common.updateNotImplemented': 'Update-Prüfung noch nicht implementiert',
  },
};

const STORAGE_KEY = 'pianora_language';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLang = signal<Language>(this.getInitialLanguage());

  readonly language = this.currentLang.asReadonly();
  readonly languages = SUPPORTED_LANGUAGES;

  readonly currentLanguageInfo = computed(() =>
    SUPPORTED_LANGUAGES.find(l => l.code === this.currentLang()) || SUPPORTED_LANGUAGES[0]
  );

  private getInitialLanguage(): Language {
    // Try to get from localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as Language;
    if (stored && translations[stored]) {
      return stored;
    }

    // Default to Russian
    return 'ru';
  }

  setLanguage(lang: Language): void {
    if (translations[lang]) {
      this.currentLang.set(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  t(key: keyof TranslationKeys): string {
    const lang = this.currentLang();
    return translations[lang]?.[key] || translations['en'][key] || key;
  }

  // Helper for getting translation as signal for templates
  translate(key: keyof TranslationKeys) {
    return computed(() => this.t(key));
  }
}
