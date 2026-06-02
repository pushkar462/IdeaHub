import { StorageProvider, UploadCategory, UploadResult } from './storage.provider.interface';
import { LocalStorageProvider } from './local.storage.provider';

class StorageService {
  private provider: StorageProvider;

  constructor() {
    // In the future, this can switch based on env config:
    // this.provider = process.env.NODE_ENV === 'production' ? new S3StorageProvider() : new LocalStorageProvider();
    this.provider = new LocalStorageProvider();
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
}

// Export singleton instance
export const storageService = new StorageService();
