import { getEnv } from "@autointern/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export function getStorageClient(): S3Client {
  if (client) {
    return client;
  }

  const env = getEnv();
  client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY
    }
  });
  return client;
}

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
  const env = getEnv();
  const storage = getStorageClient();

  await storage.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );

  return key;
}

export async function uploadJson(key: string, payload: unknown): Promise<string> {
  return uploadBuffer(key, Buffer.from(JSON.stringify(payload, null, 2)), "application/json");
}

export async function getSignedDownloadUrl(key: string, expiresIn = 60 * 15): Promise<string> {
  const env = getEnv();
  const storage = getStorageClient();

  return getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key
    }),
    { expiresIn }
  );
}
