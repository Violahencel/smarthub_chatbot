import { settingsLoader } from './settingsLoader';
import { DynamicRepository } from '@/lib/repositories/DynamicRepository';
import { SettingsModel } from '@/types/settings';

type CachedSettings = {
  [key: string]: any;
};

class SettingsCache {
  private static instance: SettingsCache;
  private cache: CachedSettings | null = null;
  private lastFetchTime = 0;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private repository: DynamicRepository<SettingsModel>;

  private constructor() {
    this.repository = new DynamicRepository<SettingsModel>('settings');
  }

  static getInstance(): SettingsCache {
    if (!SettingsCache.instance) {
      SettingsCache.instance = new SettingsCache();
    }
    return SettingsCache.instance;
  }

  async getSettings(): Promise<CachedSettings> {
    const now = Date.now();
    if (!this.cache || (now - this.lastFetchTime) > this.TTL) {
      await this.refreshCache();
    }
    return this.cache!;
  }

  async refreshCache(): Promise<void> {
    const settings = await this.repository.find({});
    this.cache = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as CachedSettings);
    this.lastFetchTime = Date.now();
  }
}

export const settingsCache = SettingsCache.getInstance(); 