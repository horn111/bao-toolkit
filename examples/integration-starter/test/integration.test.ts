import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfig, createConnector, sendTransaction } from "@wagmi/core";
import { Transaction, Wallet } from "ethers";
import { custom, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { Attribution } from "ox/erc8021";
import { doctorCommand } from "@base-attribution-os/cli";
import { createDataSuffix, validateAttribution } from "@base-attribution-os/core";
import { withEthersAttribution } from "@base-attribution-os/ethers";
import { createAttributionConfig } from "../../../packages/wagmi/src/createAttributionConfig.js";
import { sendAttributedCalls, type Eip1193Request } from "@base-attribution-os/wallet";
import { analyzeSource } from "../../../packages/scanner/src/index.js";
import cases from "../../../fixtures/compatibility/cases.json";
import dependencies from "../package.json";
import { sendBrokenTransfer } from "../fixtures/broken.js";
import { sendFixedTransfer } from "../src/fixed.js";
import { offlineWallet, recipient } from "../src/transport.js";

const root = fileURLToPath(new URL("..", import.meta.url));
beforeEach(() =>
  vi.stubGlobal("fetch", () => {
    throw new Error("Network access is forbidden in offline integration checks");
  }),
);
afterEach(() => vi.unstubAllGlobals());

describe("version-pinned offline integration", () => {
  it("runs against the exact declared upstream versions", async () => {
    for (const name of ["viem", "ox", "@wagmi/core", "ethers"] as const) {
      const installed = JSON.parse(
        await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), "utf8"),
      );
      expect(installed.version).toBe(dependencies.dependencies[name]);
    }
  });

  it.each([
    ["broken", sendBrokenTransfer, "bao.broken.json", false],
    ["fixed", sendFixedTransfer, "bao.config.json", true],
  ] as const)(
    "%s: matches Doctor with actual outgoing viem calldata",
    async (_name, send, config, expected) => {
      const report = await doctorCommand({ path: root, config, profile: "strict" });
      const transaction = await send();
      expect(transaction.to.toLowerCase()).toBe(recipient);
      expect(report.ok).toBe(expected);
      expect(report.data).toMatchObject({ summary: { total: 1, protected: expected ? 1 : 0 } });
      expect(
        validateAttribution({ calldata: transaction.data ?? "0x", expect: "bc_abc123" }).ok,
      ).toBe(expected);
      expect(transaction.data?.startsWith("0x1234")).toBe(true);
    },
  );

  it("matches the official ox encoding, including a wrong-code negative control", () => {
    expect(Attribution.toDataSuffix({ codes: ["bc_abc123"] })).toBe(
      createDataSuffix({ codes: ["bc_abc123"] }),
    );
    expect(
      validateAttribution({
        calldata: Attribution.toDataSuffix({ codes: ["bc_other"] }),
        expect: "bc_abc123",
      }).ok,
    ).toBe(false);
  });

  it("keeps the code in a real wagmi core send action through an offline connector", async () => {
    const { wallet, sent } = offlineWallet();
    const accounts = [wallet.account.address] as const;
    const provider = { request: wallet.transport.request };
    const connector = createConnector(() => ({
      id: "bao-offline",
      name: "BAO offline",
      type: "mock",
      async connect() {
        throw new Error("This fixture uses an explicit offline connector.");
      },
      async disconnect() {},
      async getAccounts() {
        return accounts;
      },
      async getChainId() {
        return baseSepolia.id;
      },
      async getProvider() {
        return provider;
      },
      async isAuthorized() {
        return true;
      },
      onAccountsChanged() {},
      onChainChanged() {},
      onDisconnect() {},
    }));
    const config = createConfig({
      chains: [baseSepolia],
      connectors: [connector],
      storage: null,
      transports: { [baseSepolia.id]: custom(provider) },
    });
    const { dataSuffix } = createAttributionConfig({ builderCode: "bc_abc123" });
    await sendTransaction(config, {
      connector: config.connectors[0],
      to: recipient,
      value: 0n,
      data: "0x1234",
      dataSuffix,
    });
    expect(sent).toHaveLength(1);
    expect(validateAttribution({ calldata: sent[0].data ?? "0x", expect: "bc_abc123" }).ok).toBe(
      true,
    );
  });

  it("keeps attribution in an ethers serialized transaction without broadcasting", async () => {
    // Public deterministic test key; this wallet is never funded or connected.
    const wallet = new Wallet(`0x${"11".repeat(32)}`);
    const unsigned = {
      to: recipient,
      value: 0n,
      data: "0x1234" as const,
      nonce: 0,
      chainId: 84532,
      gasLimit: 100000n,
      gasPrice: 1n,
      type: 0,
    };
    const fixed = Transaction.from(
      await wallet.signTransaction(withEthersAttribution(unsigned, { codes: ["bc_abc123"] })),
    );
    const broken = Transaction.from(await wallet.signTransaction(unsigned));
    expect(validateAttribution({ calldata: fixed.data as Hex, expect: "bc_abc123" }).ok).toBe(true);
    expect(validateAttribution({ calldata: broken.data as Hex, expect: "bc_abc123" }).ok).toBe(
      false,
    );
  });

  it.each(["supported", "unsupported", "wrong-chain", "unavailable"])(
    "wallet capability %s controls whether a batch is sent",
    async (support) => {
      const requests: Eip1193Request[] = [];
      const provider = {
        async request(request: Eip1193Request) {
          requests.push(request);
          if (request.method === "wallet_getCapabilities") {
            if (support === "unavailable") throw new Error("wallet unavailable");
            return {
              [support === "wrong-chain" ? "0x2105" : "0x14a34"]: {
                dataSuffix: { supported: support !== "unsupported" },
              },
            };
          }
          return "offline-batch";
        },
      };
      const operation = sendAttributedCalls(
        provider,
        { chainId: 84532, from: recipient, calls: [{ to: recipient, data: "0x1234" }] },
        { codes: ["bc_abc123"] },
      );
      if (support === "supported") {
        await expect(operation).resolves.toMatchObject({ attribution: { delivery: "dataSuffix" } });
        expect(requests.map((request) => request.method)).toEqual([
          "wallet_getCapabilities",
          "wallet_sendCalls",
        ]);
      } else {
        await expect(operation).rejects.toThrow();
        expect(requests.map((request) => request.method)).toEqual(["wallet_getCapabilities"]);
      }
    },
  );
});

describe("labeled source corpus (pattern coverage, not real-world precision)", () => {
  it.each(cases)("$id", ({ source, expected }) => {
    expect(
      analyzeSource(source, { builderCodes: ["bc_abc123"], profile: "strict" }).map(
        (entry) => entry.status,
      ),
    ).toEqual(expected);
  });
});
