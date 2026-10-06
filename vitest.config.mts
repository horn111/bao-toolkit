import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@base-attribution-os/b20/rpc": fileURLToPath(
        new URL("./packages/b20/src/rpc/index.ts", import.meta.url),
      ),
      "@base-attribution-os/b20": fileURLToPath(
        new URL("./packages/b20/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/viem": fileURLToPath(
        new URL("./packages/viem/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/wagmi": fileURLToPath(
        new URL("./packages/wagmi/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/wallet": fileURLToPath(
        new URL("./packages/wallet/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/cli": fileURLToPath(
        new URL("./packages/cli/src/index.ts", import.meta.url),
      ),
      "@base-attribution-os/scanner": fileURLToPath(
        new URL("./packages/scanner/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "examples/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
