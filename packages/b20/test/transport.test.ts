import { describe, expect, it, vi } from "vitest";
import { createB20HttpTransport, type B20RpcMethod } from "../src/rpc/index.js";

function withBody(body: unknown) {
  const fetcher = vi.fn<typeof fetch>(async () => new globalThis.Response(JSON.stringify(body)));
  return {
    fetcher,
    transport: createB20HttpTransport({
      url: "https://provider.example/key-secret",
      fetch: fetcher,
    }),
  };
}

describe("bounded HTTP RPC", () => {
  it("associates responses by ID", async () => {
    const { transport, fetcher } = withBody({ jsonrpc: "2.0", id: 1, result: "0x14a34" });
    expect(await transport.request("eth_chainId", [])).toBe("0x14a34");
    const request = fetcher.mock.calls[0][1]!;
    expect(JSON.parse(request.body as string)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    });
    expect(request.redirect).toBe("error");
  });
  it.each([
    { jsonrpc: "2.0", id: 2, result: "0x1" },
    { jsonrpc: "2.0", id: "1", result: "0x1" },
    { id: 1, result: "0x1" },
    { jsonrpc: "2.0", id: 1 },
    { jsonrpc: "2.0", id: 1, result: null, error: { code: -1, message: "secret" } },
    { jsonrpc: "2.0", id: 1, error: { code: "-1", message: "secret" } },
    [{ jsonrpc: "2.0", id: 1, result: "0x1" }],
  ])("rejects malformed, mismatched or batch envelopes", async (body) => {
    await expect(withBody(body).transport.request("eth_chainId", [])).rejects.toThrow(
      "B20_INVALID_RESPONSE",
    );
  });
  it("never exposes provider error messages or response data", async () => {
    const { transport } = withBody({
      jsonrpc: "2.0",
      id: 1,
      error: {
        code: -32000,
        message: "secret at https://provider.example/key-secret",
        data: "private",
      },
    });
    await expect(transport.request("eth_call", [])).rejects.toMatchObject({
      message: "B20_RPC_ERROR: RPC evidence could not be acquired",
      rpcCode: -32000,
    });
  });
  it("separates history and unsupported-method failures", async () => {
    for (const [code, message, reason] of [
      [-32000, "missing trie node secret", "unavailable-history"],
      [-32601, "no eth_call", "unsupported-method"],
    ] as const) {
      await expect(
        withBody({ jsonrpc: "2.0", id: 1, error: { code, message } }).transport.request(
          "eth_call",
          [],
        ),
      ).rejects.toMatchObject({ reason });
    }
  });
  it("rejects oversized responses", async () => {
    await expect(
      withBody({ jsonrpc: "2.0", id: 1, result: "a".repeat(65536) }).transport.request(
        "eth_call",
        [],
      ),
    ).rejects.toThrow("B20_INVALID_RESPONSE");
  });
  it("rejects malformed JSON and non-success HTTP", async () => {
    for (const response of [
      new globalThis.Response("not-json"),
      new globalThis.Response("secret", { status: 401 }),
    ]) {
      const transport = createB20HttpTransport({
        url: "https://provider.example/key-secret",
        fetch: vi.fn(async () => response),
      });
      await expect(transport.request("eth_chainId", [])).rejects.not.toThrow("secret");
    }
  });
  it("bounds the entire response including streamed body time", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener("abort", () => reject(new Error("secret URL")));
        }),
    );
    const transport = createB20HttpTransport({
      url: "https://provider.example/key-secret",
      fetch: fetcher,
      timeoutMs: 5,
    });
    await expect(transport.request("eth_chainId", [])).rejects.toThrow("B20_TRANSPORT_ERROR");
  });
  it("rejects writes even through an untyped consumer", async () => {
    const { transport, fetcher } = withBody(null);
    await expect(transport.request("eth_sendRawTransaction" as B20RpcMethod, [])).rejects.toThrow(
      "B20_METHOD_DENIED",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "file:///secret",
    "ftp://example.com",
    "https://user:secret@example.com",
    "https://example.com/#secret",
    "invalid secret",
  ])("rejects unsafe configuration without echoing it", (url) => {
    expect(() => createB20HttpTransport({ url })).toThrow("B20_INVALID_RPC_URL");
    expect(() => createB20HttpTransport({ url })).not.toThrow("secret");
  });
});
