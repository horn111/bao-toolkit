import type { ReadFailure } from "../types.js";

export const B20_RPC_METHODS = [
  "eth_chainId",
  "eth_getBlockByNumber",
  "eth_call",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
] as const;
export type B20RpcMethod = (typeof B20_RPC_METHODS)[number];
export interface B20Transport {
  request(method: B20RpcMethod, params: readonly unknown[]): Promise<unknown>;
}

/** Contains only allowlisted diagnostics, never provider messages, URLs, or error data. */
export class B20RpcError extends Error {
  constructor(
    public readonly reason: ReadFailure,
    public readonly rpcCode: number | null = null,
  ) {
    super(`B20_${reason.replaceAll("-", "_").toUpperCase()}: RPC evidence could not be acquired`);
    this.name = "B20RpcError";
  }
}

export interface HttpTransportOptions {
  url: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetch?: typeof globalThis.fetch;
}

export function createB20HttpTransport(options: HttpTransportOptions): B20Transport {
  let url: URL;
  try {
    url = new URL(options.url);
  } catch {
    throw new Error("B20_INVALID_RPC_URL: expected an HTTP(S) endpoint");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error("B20_INVALID_RPC_URL: use HTTP(S), without userinfo or fragment");
  }
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxResponseBytes = options.maxResponseBytes ?? 64 * 1024;
  if (
    !Number.isSafeInteger(maxResponseBytes) ||
    maxResponseBytes < 1 ||
    maxResponseBytes > 1024 * 1024
  )
    throw new Error("B20_INVALID_INPUT: response limit must be 1–1048576 bytes");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error("B20_INVALID_INPUT: timeout must be 1–30000 ms");
  }
  const fetcher = options.fetch ?? globalThis.fetch;
  let nextId = 0;
  return {
    async request(method, params) {
      if (!(B20_RPC_METHODS as readonly string[]).includes(method))
        throw new Error("B20_METHOD_DENIED: read-only transport");
      const controller = new globalThis.AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      const id = ++nextId;
      try {
        const response = await fetcher(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok || !response.body) throw new B20RpcError("transport-error");
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            length += chunk.value.byteLength;
            if (length > maxResponseBytes) {
              await reader.cancel();
              throw new B20RpcError("invalid-response");
            }
            chunks.push(chunk.value);
          }
        } finally {
          reader.releaseLock();
        }
        const data = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        let body: unknown;
        try {
          body = JSON.parse(new globalThis.TextDecoder("utf-8", { fatal: true }).decode(data));
        } catch {
          throw new B20RpcError("invalid-response");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new B20RpcError("invalid-response");
        const envelope = body as Record<string, unknown>;
        if (
          envelope.jsonrpc !== "2.0" ||
          envelope.id !== id ||
          Object.hasOwn(envelope, "result") === Object.hasOwn(envelope, "error")
        )
          throw new B20RpcError("invalid-response");
        if (Object.hasOwn(envelope, "error")) {
          const error = envelope.error;
          if (
            !error ||
            typeof error !== "object" ||
            Array.isArray(error) ||
            !Number.isSafeInteger((error as Record<string, unknown>).code) ||
            typeof (error as Record<string, unknown>).message !== "string"
          )
            throw new B20RpcError("invalid-response");
          const { code, message } = error as { code: number; message: string };
          const reason =
            code === -32601
              ? "unsupported-method"
              : /missing trie node|historical state.*unavailable|state.*pruned/i.test(message)
                ? "unavailable-history"
                : "rpc-error";
          throw new B20RpcError(reason, code);
        }
        return envelope.result;
      } catch (error) {
        if (error instanceof B20RpcError) throw error;
        throw new B20RpcError("transport-error");
      } finally {
        globalThis.clearTimeout(timeout);
      }
    },
  };
}
