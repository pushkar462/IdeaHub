import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { config } from '../../config/env.config';
import { StorageProvider, UploadCategory, UploadResult } from './storage.provider.interface';

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set'
      );
    }
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
    this.bucket = config.SUPABASE_STORAGE_BUCKET;
  }

  private sanitizeFilename(originalName: string): string {
    return originalName.replace(/[^a-zA-Z0-9.\-_]/g, '');
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

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(relativeKey, fileBuffer, { contentType: mimeType, upsert: false });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return {
      key: relativeKey,
      url: this.getUrl(relativeKey),
      mimeType,
      size: fileBuffer.length,
      provider: 'SUPABASE',
      visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
      status: 'PENDING_SCAN',
    };
  }

  public async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase storage delete failed: ${error.message}`);
    }
  }

  public getUrl(key: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  public extractKey(url: string): string {
    const marker = `/object/public/${this.bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) {
      throw new Error(`Cannot extract storage key from URL: ${url}`);
    }
    return url.slice(idx + marker.length);
  }
}
