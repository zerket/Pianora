import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Song {
  id: string;
  name: string;
  artist?: string;
  filename: string;
  type: 'builtin' | 'imported' | 'recording';
  data?: ArrayBuffer;  // for imported/recording only
  addedAt?: number;
}

interface BuiltinManifestItem {
  filename: string;
  name: string;
  artist: string;
}

const DB_NAME = 'pianora-library';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private _builtinSongs = signal<Song[]>([]);
  private _importedSongs = signal<Song[]>([]);
  private _recordings = signal<Song[]>([]);
  private _loading = signal(true);
  private _storageUsed = signal(0);

  private db: IDBDatabase | null = null;

  // Public readonly signals
  readonly builtinSongs = this._builtinSongs.asReadonly();
  readonly importedSongs = this._importedSongs.asReadonly();
  readonly recordings = this._recordings.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly storageUsed = this._storageUsed.asReadonly();

  // Computed signals
  readonly allSongs = computed(() => [
    ...this._builtinSongs(),
    ...this._importedSongs(),
    ...this._recordings()
  ]);

  readonly totalStorage = signal(16 * 1024 * 1024); // 16 MB

  readonly storagePercent = computed(() => {
    const used = this._storageUsed();
    const total = this.totalStorage();
    return (used / total) * 100;
  });

  readonly formattedStorageUsed = computed(() => {
    return this.formatBytes(this._storageUsed());
  });

  readonly formattedTotalStorage = computed(() => {
    return this.formatBytes(this.totalStorage());
  });

  constructor(private http: HttpClient) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.openDatabase();
      await this.loadBuiltinSongs();
      await this.loadStoredSongs();
      this._loading.set(false);
    } catch (error) {
      console.error('Failed to initialize library:', error);
      this._loading.set(false);
    }
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };
    });
  }

  private async loadBuiltinSongs(): Promise<void> {
    try {
      const manifest = await this.http.get<BuiltinManifestItem[]>('/assets/midi/builtin.json').toPromise();
      if (manifest) {
        const songs: Song[] = manifest.map((item, index) => ({
          id: `builtin-${index}`,
          name: item.name,
          artist: item.artist || undefined,
          filename: item.filename,
          type: 'builtin' as const
        }));
        this._builtinSongs.set(songs);
      }
    } catch (error) {
      console.error('Failed to load builtin songs manifest:', error);
    }
  }

  private async loadStoredSongs(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const songs: Song[] = request.result;
        const imported = songs.filter(s => s.type === 'imported');
        const recordings = songs.filter(s => s.type === 'recording');

        this._importedSongs.set(imported);
        this._recordings.set(recordings);

        // Calculate storage used
        let totalSize = 0;
        songs.forEach(s => {
          if (s.data) {
            totalSize += s.data.byteLength;
          }
        });
        this._storageUsed.set(totalSize);

        resolve();
      };
    });
  }

  async importMidiFile(file: File): Promise<Song> {
    const data = await file.arrayBuffer();
    const song: Song = {
      id: `imported-${Date.now()}`,
      name: file.name.replace(/\.midi?$/i, ''),
      filename: file.name,
      type: 'imported',
      data,
      addedAt: Date.now()
    };

    await this.saveSong(song);

    this._importedSongs.update(songs => [...songs, song]);
    this._storageUsed.update(used => used + data.byteLength);

    return song;
  }

  async saveRecording(name: string, data: ArrayBuffer): Promise<Song> {
    const song: Song = {
      id: `recording-${Date.now()}`,
      name,
      filename: `${name}.mid`,
      type: 'recording',
      data,
      addedAt: Date.now()
    };

    await this.saveSong(song);

    this._recordings.update(songs => [...songs, song]);
    this._storageUsed.update(used => used + data.byteLength);

    return song;
  }

  private saveSong(song: Song): Promise<void> {
    if (!this.db) return Promise.reject('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(song);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteSong(id: string): Promise<void> {
    if (!this.db) return;

    // Find song to get its size
    const allSongs = [...this._importedSongs(), ...this._recordings()];
    const song = allSongs.find(s => s.id === id);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        // Update local state
        if (song?.type === 'imported') {
          this._importedSongs.update(songs => songs.filter(s => s.id !== id));
        } else if (song?.type === 'recording') {
          this._recordings.update(songs => songs.filter(s => s.id !== id));
        }

        // Update storage used
        if (song?.data) {
          this._storageUsed.update(used => Math.max(0, used - song.data!.byteLength));
        }

        resolve();
      };
    });
  }

  async getMidiData(song: Song): Promise<ArrayBuffer> {
    if (song.type === 'builtin') {
      // Fetch from assets
      const response = await fetch(`/assets/midi/builtin/${song.filename}`);
      return response.arrayBuffer();
    } else {
      // Return stored data
      if (song.data) {
        return song.data;
      }

      // Load from IndexedDB if not in memory
      if (!this.db) throw new Error('Database not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(song.id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as Song;
          if (result?.data) {
            resolve(result.data);
          } else {
            reject(new Error('Song data not found'));
          }
        };
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
