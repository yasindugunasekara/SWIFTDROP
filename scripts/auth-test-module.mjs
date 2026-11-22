import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Opt-in coverage names the exact transpiled implementation executed in the VM.
// Without this, Node's report excludes anonymous VM scripts and can show an empty 100%.
export function moduleOptions(source, name) {
  const directory = process.env.SWIFTDROP_AUTH_COVERAGE_DIR;
  if (!directory) return {};
  const filename = path.resolve(directory, name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, source);
  return { filename };
}
