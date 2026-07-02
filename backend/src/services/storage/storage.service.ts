import { StorageProvider, UploadCategory, UploadResult } from './storage.provider.interface';
import { LocalStorageProvider } from './local.storage.provider';
import { SupabaseStorageProvider } from './supabase.storage.provider';
import { config } from '../../config/env.config';

class StorageService {
  private provider: StorageProvider;

  constructor() {
    this.provider =
      config.STORAGE_PROVIDER === 'supabase'
        ? new SupabaseStorageProvider()
        : new LocalStorageProvider();
  }

  public async upload(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: UploadCategory,
    isPrivate: boolean = false
  ): Promise<UploadResult> {
    return this.provider.upload(fileBuffer, originalName, mimeType, category, isPrivate);
  }

  public async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  public getUrl(key: string): string {
    return this.provider.getUrl(key);
  }

  public extractKey(url: string): string {
    return this.provider.extractKey(url);
  }
}

// Export singleton instance
export const storageService = new StorageService();
