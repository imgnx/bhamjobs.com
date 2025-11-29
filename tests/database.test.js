import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const database = process.env.PGDATABASE;
  if (!host || !user || !database) return null;

  const password = process.env.PGPASSWORD ? `:${encodeURIComponent(process.env.PGPASSWORD)}` : "";
  const port = process.env.PGPORT ? `:${process.env.PGPORT}` : "";
  const url = `postgres://${encodeURIComponent(user)}${password}@${host}${port}/${encodeURIComponent(
    database,
  )}`;
  process.env.DATABASE_URL = url;
  return url;
}

const resolvedDatabaseUrl = ensureDatabaseUrl();
let PrismaClient;

// Skip automatically when Postgres connection details are not available.
if (!resolvedDatabaseUrl) {
  test.skip(
    "database app_log roundtrip test requires DATABASE_URL or PGHOST/PGUSER/PGDATABASE env vars",
  );
} else {
  const prismaModule = await import("@prisma/client");
  PrismaClient = prismaModule?.PrismaClient ?? prismaModule?.default?.PrismaClient;
  const prisma = new PrismaClient();

  test("database app_log roundtrip", async (t) => {
    t.after(async () => {
      await prisma.$disconnect();
    });

    const message = `db-test-${randomUUID()}`;
    let createdLog;

    try {
      createdLog = await prisma.appLog.create({ data: { message } });
      assert.equal(createdLog.message, message);
      assert.ok(createdLog.id);

      const fetched = await prisma.appLog.findUnique({ where: { id: createdLog.id } });
      assert.ok(fetched);
      assert.equal(fetched.message, message);
    } finally {
      if (createdLog?.id) {
        await prisma.appLog.delete({ where: { id: createdLog.id } }).catch(() => {});
      }
    }
  });
}
