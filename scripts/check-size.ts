import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_JS_BYTES: Record<string, number> = {
  b20: 64 * 1024,
  cli: 48 * 1024,
  core: 64 * 1024,
  ethers: 10 * 1024,
  "github-action": 12 * 1024 * 1024,
  scanner: 48 * 1024,
  viem: 10 * 1024,
  wagmi: 8 * 1024,
  wallet: 40 * 1024,
};

async function main(): Promise<void> {
  const packagesDir = path.resolve("packages");
  const entries = await fs.readdir(packagesDir, { withFileTypes: true });
  const failures: string[] = [];

  for (const [packageName, budget] of Object.entries(MAX_JS_BYTES)) {
    const entry = entries.find(
      (candidate) => candidate.isDirectory() && candidate.name === packageName,
    );
    if (!entry) {
      failures.push(`${packageName}: package directory is missing`);
      continue;
    }

    const distDir = path.join(packagesDir, packageName, "dist");
    const jsFiles = await builtJavaScript(distDir);
    const sizes = await Promise.all(jsFiles.map(async (file) => (await fs.stat(file)).size));
    const total = sizes.reduce((sum, size) => sum + size, 0);

    console.log(`${packageName}: ${formatBytes(total)} / ${formatBytes(budget)}`);

    if (jsFiles.length === 0) failures.push(`${packageName}: no built JavaScript files found`);
    if (total > budget) failures.push(`${packageName}: bundle exceeds its size budget`);
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

async function builtJavaScript(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await builtJavaScript(fullPath)));
    else if (entry.isFile() && /\.(cjs|js)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
