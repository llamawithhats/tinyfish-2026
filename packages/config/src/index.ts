import { z } from "zod";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: z.string().optional().default("true"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().default("AutoIntern <noreply@autointern.local>"),
  TINYFISH_API_KEY: z.string().optional().default(""),
  TINYFISH_BASE_URL: z.string().url().default("https://agent.tinyfish.ai/v1"),
  TINYFISH_DEFAULT_COUNTRY: z.string().length(2).default("US"),
  ENCRYPTION_KEY: z.string().min(16),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_PUBLIC_ENDPOINT: z.string().url().optional().or(z.literal("")).default(""),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  LLM_ORGANIZATION: z.string().optional().default("")
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(source);
  return cachedEnv;
}

function getEncryptionKey(): Buffer {
  const env = getEnv();
  const raw = env.ENCRYPTION_KEY;

  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to hash-based derivation.
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, bodyPart] = payload.split(".");
  if (!ivPart || !tagPart || !bodyPart) {
    throw new Error("Invalid encrypted secret format.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
