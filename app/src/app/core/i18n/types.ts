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
  'nav.help': string;

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

  // Demo mode
  'play.demo.title': string;
  'play.demo.selectSongHint': string;
  'play.demo.chooseSong': string;
  'play.demo.changeSong': string;
  'play.demo.tempo': string;

  // Split mode settings
  'play.split.title': string;
  'play.split.splitPoint': string;
  'play.split.leftColor': string;
  'play.split.rightColor': string;

  // Effects settings
  'play.effects.title': string;
  'play.effects.background': string;
  'play.effects.bgColor': string;
  'play.effects.bgBrightness': string;
  'play.effects.hueShift': string;
  'play.effects.shiftAmount': string;

  // Recording
  'play.recording.title': string;
  'play.recording.start': string;
  'play.recording.stop': string;
  'play.recording.inProgress': string;
  'play.recording.namePrompt': string;

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
  'learn.tempo': string;
  'learn.play': string;
  'learn.pause': string;
  'learn.stop': string;
  'learn.waitingForNotes': string;
  'learn.offlineMode': string;
  'learn.offlineModeDesc': string;

  // Library page
  'library.title': string;
  'library.all': string;
  'library.imported': string;
  'library.recordings': string;
  'library.import': string;
  'library.importMidi': string;
  'library.noSongs': string;
  'library.noSongsDesc': string;
  'library.play': string;
  'library.learnSong': string;
  'library.delete': string;
  'library.confirmDelete': string;
  'library.storageUsed': string;
  'library.searchPlaceholder': string;

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
  'settings.selectNetwork': string;
  'settings.notConnected': string;
  'settings.disconnect': string;
  'settings.connect': string;
  'settings.connecting': string;
  'settings.accessVia': string;
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

  // BLE MIDI
  'settings.bleMidi': string;
  'settings.bleDevice': string;
  'settings.bleNotConnected': string;
  'settings.bleUnavailable': string;
  'settings.bleWifiInstructions': string;
  'settings.selectDevice': string;

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
  'common.loading': string;
  'common.unknown': string;
  'common.leds': string;
  'common.ms': string;
  'common.or': string;
  'common.confirmRestart': string;
  'common.confirmFactoryReset': string;
  'common.confirmFactoryResetFinal': string;
  'common.updateNotImplemented': string;

  // Onboarding
  'onboarding.welcomeTitle': string;
  'onboarding.welcomeSubtitle': string;
  'onboarding.getStarted': string;
  'onboarding.connectTitle': string;
  'onboarding.connectDesc': string;
  'onboarding.pianoConnected': string;
  'onboarding.waitingForPiano': string;
  'onboarding.continue': string;
  'onboarding.skipForNow': string;
  'onboarding.testTitle': string;
  'onboarding.testDesc': string;
  'onboarding.notePressed': string;
  'onboarding.pressAnyKey': string;
  'onboarding.looksGood': string;
  'onboarding.back': string;
  'onboarding.doneTitle': string;
  'onboarding.doneDesc': string;
  'onboarding.actionPlay': string;
  'onboarding.actionLearn': string;
  'onboarding.actionSettings': string;

  // Help page
  'help.title': string;
  'help.hotkeys.title': string;
  'help.hotkeys.activation': string;
  'help.hotkeys.modes': string;
  'help.hotkeys.pointMode': string;
  'help.hotkeys.splashMode': string;
  'help.hotkeys.cycleMode': string;
  'help.hotkeys.brightness': string;
  'help.hotkeys.brightnessUp': string;
  'help.hotkeys.brightnessDown': string;
  'help.hotkeys.toggleLed': string;
  'help.hotkeys.colors': string;
  'help.hotkeys.colorRed': string;
  'help.hotkeys.colorOrange': string;
  'help.hotkeys.colorYellow': string;
  'help.hotkeys.colorGreen': string;
  'help.hotkeys.colorCyan': string;
  'help.hotkeys.colorBlue': string;
  'help.hotkeys.colorViolet': string;
  'help.hotkeys.playback': string;
  'help.hotkeys.playPause': string;
  'help.modes.title': string;
  'help.modes.freePlayDesc': string;
  'help.modes.velocityDesc': string;
  'help.modes.splitDesc': string;
  'help.modes.randomDesc': string;
  'help.modes.visualizerDesc': string;
  'help.modes.ambientDesc': string;
  'help.learning.title': string;
  'help.learning.desc': string;
  'help.learning.colorLegend': string;
  'help.learning.guideColor': string;
  'help.learning.successColor': string;
  'help.learning.errorColor': string;
  'help.tips.title': string;
  'help.tips.tip1': string;
  'help.tips.tip2': string;
  'help.tips.tip3': string;
  'help.tips.tip4': string;
}
