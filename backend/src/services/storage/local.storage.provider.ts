import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, UploadCategory, UploadResult } from './storage.provider.interface';

export class LocalStorageProvider implements StorageProvider {
  private baseUploadDir: string;

  constructor() {
    this.baseUploadDir = path.resolve(__dirname, '../../../../uploads');
    this.initDirectories();
  }

  private async initDirectories() {
    const categories: UploadCategory[] = ['AVATAR', 'POST_ATTACHMENT', 'DOCUMENT'];
    for (const cat of categories) {
      const dir = path.join(this.baseUploadDir, cat.toLowerCase());
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private sanitizeFilename(originalName: string): string {
    // Keep only alphanumeric, dash, dot, underscore
    return originalName.replace(/[^a-zA-Z0-9.\\-_]/g, '');
  }

  public async upload(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: UploadCategory,
    isPrivate: boolean = false
  ): Promise<UploadResult> {
    const sanitized = this.sanitizeFilename(originalName);
    const extension = path.extname(sanitized) || '';
    
    // UUID prevents path traversal and unpredictable overwrites
    const uniqueId = uuidv4();
    const finalFilename = `${uniqueId}${extension}`;
    
    const categoryFolder = category.toLowerCase();
    const relativeKey = `${categoryFolder}/${finalFilename}`;
    const absolutePath = path.join(this.baseUploadDir, relativeKey);

    // Write to disk
    await fs.writeFile(absolutePath, fileBuffer);

    return {
      key: relativeKey,
      url: `/uploads/${relativeKey}`,
      mimeType,
      size: fileBuffer.length,
      provider: 'LOCAL',
      visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
      status: 'PENDING_SCAN',
    };
  }

  public async delete(key: string): Promise<void> {
    // Prevent path traversal in delete operations
    const normalizedKey = path.normalize(key).replace(new RegExp('^(\\\\.\\\\.(\\\\/|\\\\\\\\|$))+', 'g'), '');
    const absolutePath = path.join(this.baseUploadDir, normalizedKey);
    try {
      await fs.unlink(absolutePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  public getUrl(key: string): string {
    return `/uploads/${key}`;
  }

  public extractKey(url: string): string {
    return url.replace(/^\/uploads\//, '');
  }
}
