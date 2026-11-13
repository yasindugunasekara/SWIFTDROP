interface Storage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
interface Manifest { version: 1; id: string; count: number }

// SecureStore on this Expo SDK has small per-item limits. Publish a manifest
// only after every encrypted chunk is saved, so partial writes are never read.
export function createSecureSessionStorage(storage: Storage) {
  async function manifest(key: string): Promise<Manifest | null> {
    const raw = await storage.getItemAsync(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Manifest;
    if (value.version !== 1 || !/^[a-z0-9-]+$/.test(value.id) || !Number.isInteger(value.count) || value.count < 1 || value.count > 512) {
      throw new Error('Saved session is invalid. Please sign in again.');
    }
    return value;
  }
  const chunkKey = (key: string, value: Manifest, index: number) => `${key}.${value.id}.${index}`;
  async function cleanup(key: string, value: Manifest | null) {
    if (value) await Promise.all(Array.from({ length: value.count }, (_, index) => storage.deleteItemAsync(chunkKey(key, value, index))));
  }
  return {
    async getItem(key: string) {
      const saved = await manifest(key);
      if (!saved) return null;
      const chunks = await Promise.all(Array.from({ length: saved.count }, (_, index) => storage.getItemAsync(chunkKey(key, saved, index))));
      if (chunks.some(value => value === null)) return null;
      return chunks.join('');
    },
    async setItem(key: string, value: string) {
      const old = await manifest(key);
      const next: Manifest = { version: 1, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: Math.max(1, Math.ceil(value.length / 500)) };
      if (next.count > 512) throw new Error('Session exceeds secure storage limits.');
      try {
        for (let index = 0; index < next.count; index++) await storage.setItemAsync(chunkKey(key, next, index), value.slice(index * 500, (index + 1) * 500));
        await storage.setItemAsync(key, JSON.stringify(next));
      } catch (error) {
        await cleanup(key, next).catch(() => undefined);
        throw error;
      }
      // A cleanup failure must not roll back an already committed token rotation.
      await cleanup(key, old).catch(() => undefined);
    },
    async removeItem(key: string) {
      const old = await manifest(key);
      await storage.deleteItemAsync(key);
      await cleanup(key, old);
    },
  };
}
