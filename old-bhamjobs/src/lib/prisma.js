import { PrismaClient } from "@prisma/client";

const globalWithPrisma = globalThis;

const prisma =
  globalWithPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.__prisma = prisma;
}

export { prisma };
