import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __autointernWebPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__autointernWebPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__autointernWebPrisma = prisma;
}
