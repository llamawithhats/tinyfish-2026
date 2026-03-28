import { getEnv } from "@autointern/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
let publicClient: S3Client | null = null;

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

function getPublicStorageClient(): S3Client {
  if (publicClient) {
    return publicClient;
  }

  const env = getEnv();
  publicClient = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_PUBLIC_ENDPOINT || env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY
    }
  });
  return publicClient;
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
  const storage = getPublicStorageClient();

  return getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key
    }),
    { expiresIn }
  );
}

export async function downloadObject(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
  contentLength: number | null;
}> {
  const env = getEnv();
  const storage = getStorageClient();
  const response = await storage.send(
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key
    })
  );

  if (!response.Body) {
    throw new Error("Stored object body was empty.");
  }

  return {
    body: await response.Body.transformToByteArray(),
    contentType: response.ContentType ?? "application/octet-stream",
    contentLength: response.ContentLength ?? null
  };
}

export function isPubliclyReachableUrl(value: string): boolean {
  let hostname = "";

  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (["localhost", "127.0.0.1", "0.0.0.0", "::1", "host.docker.internal"].includes(hostname)) {
    return false;
  }

  if (hostname.endsWith(".local")) {
    return false;
  }

  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
    return false;
  }

  return true;
}
