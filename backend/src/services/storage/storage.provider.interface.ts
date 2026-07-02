export type UploadCategory = 'AVATAR' | 'POST_ATTACHMENT' | 'DOCUMENT';

export type UploadResult = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
  provider: 'LOCAL' | 'S3' | 'SUPABASE';
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'PENDING_SCAN' | 'SAFE';
};

export interface StorageProvider {
  /**
   * Upload a file buffer to the storage provider
   */
  upload(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: UploadCategory,
    isPrivate?: boolean
  ): Promise<UploadResult>;

  /**
   * Delete a file from the storage provider using its key
   */
  delete(key: string): Promise<void>;

  /**
   * Get the accessible URL for a given key
   */
  getUrl(key: string): string;

  /**
   * Recover the storage key from a URL previously returned by upload()/getUrl()
   */
  extractKey(url: string): string;
}
