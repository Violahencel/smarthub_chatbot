import { SettingsModel } from '@/types/settings';
import { DynamicRepository } from '@/lib/repositories/DynamicRepository';

class SettingsLoader {
  private static instance: SettingsLoader;
  private settings: SettingsModel[] = [];
  private repository: DynamicRepository<SettingsModel>;
  private initialized = false;

  private constructor() {
    this.repository = new DynamicRepository<SettingsModel>('settings');
  }

  public static getInstance(): SettingsLoader {
    if (!SettingsLoader.instance) {
      SettingsLoader.instance = new SettingsLoader();
    }
    return SettingsLoader.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const settings = await this.repository.find({});
      this.settings = settings;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      throw error;
    }
  }

  public getSetting(key: string): any {
    const setting = this.settings.find(s => s.key === key);
    return setting?.value;
  }

  public async refresh(): Promise<void> {
    try {
      const settings = await this.repository.find({});
      this.settings = settings;
    } catch (error) {
      console.error('Failed to refresh settings:', error);
      throw error;
    }
  }
}

export const settingsLoader = SettingsLoader.getInstance(); 