import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  assertUploadSize,
  uploadSizeError,
} from "./uploadLimits.js";

test("the default dataset limit matches the backend's 10 MB default", () => {
  assert.equal(MAX_UPLOAD_MB, 10);
  assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 * 1024);
});

test("a file at the limit is accepted and one byte over is rejected", () => {
  assert.equal(uploadSizeError({ size: MAX_UPLOAD_BYTES }), "");
  assert.match(
    uploadSizeError({ size: MAX_UPLOAD_BYTES + 1 }),
    /File is too large\. Maximum upload size is 10 MB\./
  );
});

test("the API rejects an oversized file before building the request", () => {
  const error = new Error("file");
  error.size = MAX_UPLOAD_BYTES + 1;

  assert.throws(
    () => assertUploadSize(error),
    (caught) =>
      caught.status === 413 && caught.message.includes("Maximum upload size")
  );
});

test("every upload path is guarded and the UI states the real limit", () => {
  const api = readFileSync(new URL("./api.js", import.meta.url), "utf8");
  const hook = readFileSync(
    new URL("./hooks/useThesisWorkflow.js", import.meta.url),
    "utf8"
  );
  const zone = readFileSync(
    new URL("./components/UploadZone.jsx", import.meta.url),
    "utf8"
  );

  assert.equal((api.match(/assertUploadSize\(file\);/g) || []).length, 3);
  assert.match(
    hook,
    /const sizeError = uploadSizeError\(f\);[\s\S]*?if \(sizeError\) \{[\s\S]*?return;[\s\S]*?\}[\s\S]*?await runAction/
  );
  assert.match(zone, /Up to \$\{MAX_UPLOAD_MB\} MB/);
  assert.doesNotMatch(zone, /25 MB/);
});
