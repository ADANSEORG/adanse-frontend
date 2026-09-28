// Test reporter that fails the run if fewer test files ran than exist.
//
// `npm test` hands node a glob. Unquoted, POSIX shells expand `**` like `*`
// (no globstar), so on Linux the pattern can silently match fewer files than
// on Windows -- and CI would stay green while skipping tests. This counts every
// *.test.js under src/ with a plain directory walk (no glob involved) and
// compares that to the files the runner actually reported on.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve('src');

function findTestFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findTestFiles(path));
    else if (entry.name.endsWith('.test.js')) found.push(resolve(path));
  }
  return found;
}

export default async function* testFileGuard(source) {
  const ran = new Set();
  for await (const event of source) {
    const file = event.data?.file;
    if (file && (event.type === 'test:pass' || event.type === 'test:fail')) {
      ran.add(resolve(file));
    }
  }

  const expected = findTestFiles(SRC);
  const missing = expected.filter((file) => !ran.has(file));
  if (missing.length > 0) {
    process.exitCode = 1;
    yield `\ntest-file-guard: FAIL - ${ran.size} of ${expected.length} test files ran. Not run:\n`;
    for (const file of missing) yield `  ${file}\n`;
  } else {
    yield `\ntest-file-guard: ok - all ${expected.length} test files ran\n`;
  }
}
