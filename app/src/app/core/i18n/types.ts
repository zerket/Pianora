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

export interface TranslationKeys {
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
  'play.mode.split': string;
  'play.mode.splitDesc': string;
  'play.mode.velocity': string;
  'play.mode.velocityDesc': string;
  'play.mode.random': string;
  'play.mode.randomDesc': string;

  // Split mode settings
  'play.split.title': string;
  'play.split.splitPoint': string;
  'play.split.leftColor': string;
  'play.split.rightColor': string;

  // MIDI sources
  'play.midi.title': string;
  'play.midi.usb': string;
  'play.midi.bluetooth': string;
  'play.midi.wifi': string;
  'play.midi.scanBle': string;
  'play.midi.scanning': string;
  'play.midi.notAvailable': string;

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

  // OTA Update
  'settings.otaUpdate': string;
  'settings.otaUpdateDesc': string;
  'settings.openOtaPage': string;

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
}
