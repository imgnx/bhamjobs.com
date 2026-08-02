import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prismaSchemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const packageJsonPath = new URL("../package.json", import.meta.url);
const discussionDataPath = new URL("../src/modules/discussions/data.js", import.meta.url);
const publicChatRoutePath = new URL("../app/api/openai/public-chat/route.js", import.meta.url);

test("Prisma datasource is PostgreSQL", async () => {
  const schema = await readFile(prismaSchemaPath, "utf8");

  assert.match(schema, /datasource\s+db\s+{[\s\S]*provider\s*=\s*"postgresql"/);
  assert.match(schema, /url\s*=\s*env\("DATABASE_URL"\)/);
  assert.doesNotMatch(schema, /provider\s*=\s*"(sqlite|mysql|mongodb|sqlserver)"/);
});

test("Prisma schema matches the existing PostgreSQL bootstrap SQL", async () => {
  const schema = await readFile(prismaSchemaPath, "utf8");

  assert.match(schema, /model\s+AppLog\s+{[\s\S]*@@map\("app_log"\)/);
  assert.match(schema, /model\s+ForumBoard\s+{[\s\S]*@@map\("forum_board"\)/);
  assert.match(schema, /model\s+DiscussionThread\s+{[\s\S]*@@map\("discussion_thread"\)/);
  assert.match(schema, /model\s+DiscussionPost\s+{[\s\S]*@@map\("discussion_post"\)/);
  assert.match(schema, /enum\s+BoardKind\s+{[\s\S]*@@map\("board_kind"\)/);
  assert.match(schema, /enum\s+ThreadStatus\s+{[\s\S]*@@map\("thread_status"\)/);
});

test("runtime data access goes through the shared Prisma client", async () => {
  const discussionData = await readFile(discussionDataPath, "utf8");
  const publicChatRoute = await readFile(publicChatRoutePath, "utf8");

  assert.match(discussionData, /import\s+{\s*prisma\s*}\s+from\s+["']\.\.\/\.\.\/lib\/prisma\.js["']/);
  assert.match(publicChatRoute, /import\s+{\s*prisma\s*}\s+from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/src\/lib\/prisma\.js["']/);
  assert.doesNotMatch(discussionData, /from\s+["']pg["']|new\s+Pool|new\s+Client/);
  assert.doesNotMatch(publicChatRoute, /from\s+["']pg["']|new\s+Pool|new\s+Client/);
});

test("package scripts expose Prisma database workflows", async () => {
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));

  assert.equal(pkg.dependencies["@prisma/client"], "^5.20.0");
  assert.equal(pkg.dependencies.pg, "^8.12.0");
  assert.equal(pkg.devDependencies.prisma, "^5.20.0");
  assert.equal(pkg.scripts["db:generate"], "prisma generate");
  assert.equal(pkg.scripts["db:push"], "prisma db push");
  assert.equal(pkg.scripts["db:migrate"], "prisma migrate dev");
});
