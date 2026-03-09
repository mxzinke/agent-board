import { config } from '../../config';

interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<void>;
  download(key: string): Promise<{ data: Buffer; mimeType?: string }>;
  delete(key: string): Promise<void>;
}

class InlineStorage implements StorageProvider {
  // For inline, we store in DB, so these are no-ops
  // The actual data is stored in the attachments table
  async upload() {}
  async download(): Promise<{ data: Buffer; mimeType?: string }> {
    throw new Error('Inline storage reads from DB directly');
  }
  async delete() {}
}

class S3Storage implements StorageProvider {
  private endpoint: string;
  private bucket: string;
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private clientPromise: Promise<any> | null = null;

  constructor() {
    this.endpoint = config.s3Endpoint;
    this.bucket = config.s3Bucket;
    this.accessKey = config.s3AccessKey;
    this.secretKey = config.s3SecretKey;
    this.region = config.s3Region;
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import('@aws-sdk/client-s3').then(({ S3Client }) => {
        return new S3Client({
          endpoint: this.endpoint,
          region: this.region,
          credentials: { accessKeyId: this.accessKey, secretAccessKey: this.secretKey },
          forcePathStyle: true,
        });
      });
    }
    return this.clientPromise;
  }

  async upload(key: string, data: Buffer, mimeType: string) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    await client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }));
  }

  async download(key: string) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    const result = await client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    const chunks: Uint8Array[] = [];
    // @ts-ignore
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    return { data: Buffer.concat(chunks), mimeType: result.ContentType };
  }

  async delete(key: string) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    if (config.storageBackend === 's3') {
      storageInstance = new S3Storage();
    } else {
      storageInstance = new InlineStorage();
    }
  }
  return storageInstance;
}
