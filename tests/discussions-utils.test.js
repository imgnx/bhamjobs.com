import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDisplayDate,
  formatPreview,
  normalizeThreadStatus,
} from "../src/modules/discussions/utils.js";

test("normalizeThreadStatus handles various inputs", () => {
  assert.equal(normalizeThreadStatus("planned"), "PLANNED");
  assert.equal(normalizeThreadStatus("under review"), "UNDER_REVIEW");
  assert.equal(normalizeThreadStatus("Completed "), "COMPLETED");
  assert.equal(normalizeThreadStatus("unknown"), "OPEN");
  assert.equal(normalizeThreadStatus(undefined), "OPEN");
});

test("formatPreview collapses whitespace and truncates", () => {
  assert.equal(formatPreview("  hello  world  "), "hello world");
  const long = "a".repeat(300);
  assert.equal(formatPreview(long, 10), "aaaaaaaaaa…");
});

test("formatDisplayDate formats ISO strings", () => {
  const date = "2024-09-01T12:34:56Z";
  const formatted = formatDisplayDate(date);
  assert.ok(formatted.includes("2024"));
  assert.equal(formatDisplayDate("bad-date"), "");
  assert.equal(formatDisplayDate(null), "");
});
