import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveSiteUrl } from "./siteUrl.js";

test("resolveSiteUrl uses the configured URL when set, stripping trailing slashes", () => {
  assert.equal(
    resolveSiteUrl("https://adanse.app/", "https://preview-123.vercel.app"),
    "https://adanse.app"
  );
  assert.equal(
    resolveSiteUrl("https://adanse.app///", "https://preview-123.vercel.app"),
    "https://adanse.app"
  );
  assert.equal(
    resolveSiteUrl("https://adanse.app", "https://preview-123.vercel.app"),
    "https://adanse.app"
  );
});

test("resolveSiteUrl falls back to the given origin when unset or empty", () => {
  assert.equal(
    resolveSiteUrl(undefined, "https://preview-123.vercel.app"),
    "https://preview-123.vercel.app"
  );
  assert.equal(
    resolveSiteUrl("", "http://localhost:5173"),
    "http://localhost:5173"
  );
});
