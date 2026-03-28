import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __autointernWorkerPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__autointernWorkerPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__autointernWorkerPrisma = prisma;
}
