// ---------------------------------------------------------------------------
// StorageService — typed AsyncStorage wrapper
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

const StorageService = {
  /** Persist a string value. */
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  /** Persist an object (JSON-serialised). */
  async setJson<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  /** Retrieve a string value; returns null if not found. */
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  /** Retrieve and deserialise a JSON value; returns null if not found or on error. */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /** Remove a single key. */
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  /** Remove multiple keys atomically. */
  async removeMany(keys: string[]): Promise<void> {
    await AsyncStorage.multiRemove(keys);
  },

  /** Wipe everything — use with caution. */
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};

export default StorageService;
