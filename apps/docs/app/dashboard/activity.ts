import {
  decodeAttributionFromCalldata,
  validateBuilderCodes,
  type Hex,
} from "@base-attribution-os/core";

export const ACTIVITY_DAYS = [7, 30, 90] as const;
export type ActivityDays = (typeof ACTIVITY_DAYS)[number];
export type ActivityNetwork = 8453 | 84532;
export type ActivitySource = "dune" | "import" | "published";
export type ActivityOperation = {
  id: string;
  hash: string;
  userOperationHash: string | null;
  kind: "transaction" | "user-operation";
  chainId: ActivityNetwork;
  timestamp: string | null;
  wallet: string | null;
  recipient: string | null;
  success: boolean | null;
  feeWei: string | null;
  codes: string[];
  attribution: "decoded" | "reported" | "missing" | "different" | "invalid";
};
export type ActivityDataset = {
  builderCode: string;
  title: string;
  source: ActivitySource;
  updatedAt: string;
  rangeStart: string | null;
  rangeEnd: string;
  complete: boolean;
  includesUserOperations: boolean;
  operations: ActivityOperation[];
};
export type ActivityDay = {
  date: string;
  operations: number;
  wallets: number;
  successful: number;
  reverted: number;
};

const DAY = 86_400_000;
const HASH = /^0x[0-9a-f]{64}$/i;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const MAX_ROWS = 20_000;

export function validBuilderCode(code: string) {
  return code.length <= 255 && validateBuilderCodes([code]).length === 0;
}

export function activityQuery(query: URLSearchParams) {
  const builderCode = (query.get("code") ?? query.get("project") ?? "").trim();
  const days = Number(query.get("days") ?? "30");
  const network = Number(query.get("network") ?? "8453");
  if (!validBuilderCode(builderCode)) {
    throw new Error("Enter a valid Builder Code, for example bc_abc123.");
  }
  if (!ACTIVITY_DAYS.includes(days as ActivityDays)) {
    throw new Error("Choose a 7, 30 or 90 day period.");
  }
  if (network !== 8453 && network !== 84532) {
    throw new Error("Choose Base mainnet or Base Sepolia.");
  }
  return { builderCode, days: days as ActivityDays, network: network as ActivityNetwork };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Each activity row must be an object.");
  }
  return value as Record<string, unknown>;
}

function field(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
}

function address(value: unknown) {
  return typeof value === "string" && ADDRESS.test(value) ? value.toLowerCase() : null;
}

function timestamp(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  let text =
    typeof value === "string"
      ? value.trim().replace(/ UTC$/, "Z").replace(" ", "T")
      : value * (value < 10_000_000_000 ? 1000 : 1);
  if (typeof text === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)) {
    text += "Z";
  }
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function bool(value: unknown): boolean | null {
  if ([true, "true", 1, "1", "0x1", "success", "successful"].includes(value as string)) return true;
  if ([false, "false", 0, "0", "0x0", "reverted", "failed"].includes(value as string)) return false;
  return null;
}

function uint(value: unknown): bigint | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint")
    return null;
  if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
  try {
    const result = BigInt(value);
    return result >= 0n ? result : null;
  } catch {
    return null;
  }
}

function codes(value: unknown): string[] {
  if (Array.isArray(value))
    return [...new Set(value.filter((item): item is string => typeof item === "string"))];
  if (typeof value !== "string") return [];
  const text = value.trim();
  if (text.startsWith("[")) {
    try {
      return codes(JSON.parse(text));
    } catch {
      return text
        .slice(1, -1)
        .split(",")
        .map((code) => code.trim().replace(/^['"]|['"]$/g, ""));
    }
  }
  return text
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

export function normalizeActivityRows(
  values: unknown[],
  builderCode: string,
  network: ActivityNetwork,
): ActivityOperation[] {
  if (!validBuilderCode(builderCode)) throw new Error("The Builder Code is invalid.");
  if (values.length > MAX_ROWS) throw new Error("Import up to 20,000 operations at a time.");
  const unique = new Map<string, ActivityOperation>();
  for (const value of values) {
    const row = record(value);
    const hash = field(row, "tx_hash", "transaction_hash", "hash");
    if (typeof hash !== "string" || !HASH.test(hash))
      throw new Error("Every row needs a valid transaction hash.");
    const rawChain = field(row, "chain_id", "chainId");
    const chainId = rawChain === undefined ? network : Number(rawChain);
    if (chainId !== 8453 && chainId !== 84532) throw new Error("Only Base networks are supported.");
    const rawUserOp = field(row, "user_op_hash", "user_operation_hash", "userOperationHash");
    if (rawUserOp !== undefined && (typeof rawUserOp !== "string" || !HASH.test(rawUserOp))) {
      throw new Error("A UserOperation hash must be a 32-byte hex value.");
    }
    const userOperationHash = typeof rawUserOp === "string" ? rawUserOp.toLowerCase() : null;
    const kind = userOperationHash ? "user-operation" : "transaction";
    const rawData = userOperationHash
      ? field(row, "user_op_calldata", "call_data", "callData")
      : field(row, "calldata", "input", "data", "tx_data");
    let parsedCodes = codes(field(row, "codes_array", "codes", "codes_readable"));
    let attribution: ActivityOperation["attribution"] = parsedCodes.includes(builderCode)
      ? "reported"
      : parsedCodes.length
        ? "different"
        : "missing";
    if (rawData !== undefined) {
      if (typeof rawData !== "string") throw new Error("Calldata must be hex text.");
      try {
        const decoded = decodeAttributionFromCalldata(rawData as Hex);
        parsedCodes = decoded?.codes ?? [];
        attribution = parsedCodes.includes(builderCode)
          ? "decoded"
          : parsedCodes.length
            ? "different"
            : "missing";
      } catch {
        parsedCodes = [];
        attribution = "invalid";
      }
    }
    // Transaction gas belongs to the bundler transaction, not to each user operation.
    const explicitFee = userOperationHash
      ? uint(field(row, "actual_gas_cost", "actualGasCost", "fee_wei", "feeWei"))
      : uint(field(row, "fee_wei", "feeWei"));
    const gasUsed = uint(field(row, "gas_used", "gasUsed"));
    const gasPrice = uint(field(row, "effective_gas_price", "effectiveGasPrice", "gas_price"));
    const l1Fee = uint(field(row, "l1_fee", "l1Fee"));
    const fee =
      explicitFee ??
      (!userOperationHash && gasUsed !== null && gasPrice !== null && l1Fee !== null
        ? gasUsed * gasPrice + l1Fee
        : null);
    const wallet = userOperationHash
      ? address(field(row, "user_op_sender", "user_operation_sender", "wallet"))
      : address(field(row, "sender", "from", "wallet"));
    const operation: ActivityOperation = {
      id: String(chainId) + ":" + (userOperationHash ?? hash.toLowerCase()),
      hash: hash.toLowerCase(),
      userOperationHash,
      kind,
      chainId,
      timestamp: timestamp(field(row, "block_time", "timestamp", "time")),
      wallet,
      recipient: address(
        userOperationHash
          ? field(row, "user_op_recipient", "recipient")
          : field(row, "recipient", "to"),
      ),
      success: bool(
        userOperationHash
          ? field(row, "user_op_success", "success", "execution_status")
          : field(row, "success", "receipt_status", "tx_success", "execution_status"),
      ),
      feeWei: fee?.toString() ?? null,
      codes: parsedCodes,
      attribution,
    };
    const previous = unique.get(operation.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(operation)) {
      throw new Error(
        "Conflicting rows describe the same operation. Export one consistent dataset.",
      );
    }
    unique.set(operation.id, operation);
  }
  // An EntryPoint transaction is a container, not one extra app action.
  const userOpTransactions = new Set(
    [...unique.values()]
      .filter((item) => item.kind === "user-operation")
      .map((item) => String(item.chainId) + ":" + item.hash),
  );
  return [...unique.values()]
    .filter(
      (item) =>
        item.kind === "user-operation" ||
        !userOpTransactions.has(String(item.chainId) + ":" + item.hash),
    )
    .sort(
      (a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "") || a.id.localeCompare(b.id),
    );
}

export function parseActivityImport(
  text: string,
  builderCode: string,
  network: ActivityNetwork,
  now = new Date().toISOString(),
): ActivityDataset {
  if (new TextEncoder().encode(text).byteLength > 10_000_000) {
    throw new Error("Choose a CSV or JSON file smaller than 10 MB.");
  }
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (!clean) throw new Error("The selected file is empty.");
  let values: unknown[];
  let inputRangeStart: string | null = null;
  let inputRangeEnd: string | null = null;
  if (clean.startsWith("{") || clean.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("The JSON could not be read. Export the query results again.");
    }
    if (Array.isArray(parsed)) values = parsed;
    else {
      const root = record(parsed);
      const result = root.result && typeof root.result === "object" ? record(root.result) : root;
      values = (result.rows ??
        root.rows ??
        root.transactions ??
        root.operations ??
        root.data) as unknown[];
      inputRangeStart = timestamp(root.rangeStart);
      inputRangeEnd = timestamp(root.rangeEnd);
    }
  } else values = parseCsv(clean);
  if (!Array.isArray(values))
    throw new Error("Use an array of rows, a Dune result, or a CSV export.");
  const operations = normalizeActivityRows(values, builderCode, network);
  return {
    builderCode,
    title: builderCode,
    source: "import",
    updatedAt: now,
    rangeStart: inputRangeStart,
    rangeEnd: inputRangeEnd ?? now,
    complete: false,
    includesUserOperations: operations.some((row) => row.kind === "user-operation"),
    operations,
  };
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell);
      rows.push(cells);
      cells = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  if (cell || cells.length) {
    cells.push(cell);
    rows.push(cells);
  }
  const header = rows.shift()?.map((key) => key.trim());
  if (!header?.length || new Set(header).size !== header.length || header.some((key) => !key)) {
    throw new Error("The CSV needs unique column names in its first row.");
  }
  return rows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      if (row.length !== header.length)
        throw new Error("A CSV row has a different number of columns.");
      return Object.fromEntries(header.map((key, i) => [key, row[i]]));
    });
}

export function summarizeActivity(
  dataset: ActivityDataset,
  days: ActivityDays,
  network: ActivityNetwork,
) {
  const end = new Date(dataset.rangeEnd);
  const lastDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const start = lastDay - (days - 1) * DAY;
  const matching = dataset.operations.filter(
    (row) => row.chainId === network && row.codes.includes(dataset.builderCode),
  );
  const rows = matching.filter(
    (row) =>
      row.timestamp === null ||
      (Date.parse(row.timestamp) >= start && Date.parse(row.timestamp) <= end.getTime()),
  );
  const daily: ActivityDay[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * DAY).toISOString().slice(0, 10),
    operations: 0,
    wallets: 0,
    successful: 0,
    reverted: 0,
  }));
  const dayWallets = new Map<string, Set<string>>();
  const wallets = new Set<string>();
  const walletCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.success === true && row.wallet) {
      wallets.add(row.wallet);
      walletCounts.set(row.wallet, (walletCounts.get(row.wallet) ?? 0) + 1);
    }
    if (!row.timestamp) continue;
    const day = row.timestamp.slice(0, 10);
    const bucket = daily[Math.floor((Date.parse(day) - start) / DAY)];
    if (!bucket) continue;
    bucket.operations++;
    if (row.success === true) bucket.successful++;
    if (row.success === false) bucket.reverted++;
    if (row.success === true && row.wallet) {
      const set = dayWallets.get(day) ?? new Set<string>();
      set.add(row.wallet);
      dayWallets.set(day, set);
      bucket.wallets = set.size;
    }
  }
  const successful = rows.filter((row) => row.success === true).length;
  const reverted = rows.filter((row) => row.success === false).length;
  const statusKnown = successful + reverted;
  const fees = rows.filter((row) => row.feeWei !== null);
  const feeWei = fees.reduce((total, row) => total + BigInt(row.feeWei!), 0n);
  const walletDataMissing = rows.some((row) => !row.wallet || row.success === null);
  const destinations = new Map<string, number>();
  for (const row of rows)
    if (row.recipient) destinations.set(row.recipient, (destinations.get(row.recipient) ?? 0) + 1);
  const contracts = [...destinations]
    .map(([address, operations]) => ({ address, operations }))
    .sort((a, b) => b.operations - a.operations || a.address.localeCompare(b.address));
  const omitted = dataset.operations.filter(
    (row) => row.chainId === network && !row.codes.includes(dataset.builderCode),
  ).length;
  return {
    rows,
    daily,
    contracts,
    successful,
    reverted,
    statusKnown,
    total: rows.length,
    transactions: new Set(rows.map((row) => row.hash)).size,
    userOperations: rows.filter((row) => row.kind === "user-operation").length,
    activeWallets: walletDataMissing && wallets.size === 0 ? null : wallets.size,
    walletDataMissing,
    repeatWallets: [...walletCounts.values()].filter((count) => count > 1).length,
    successRate: statusKnown ? (successful / statusKnown) * 100 : null,
    feeWei: fees.length ? feeWei.toString() : null,
    feeRows: fees.length,
    undated: rows.filter((row) => row.timestamp === null).length,
    omitted,
    periodStart: new Date(start).toISOString(),
    periodEnd: dataset.rangeEnd,
  };
}

export function formatEth(wei: string | null) {
  if (wei === null) return "Unavailable";
  const value = BigInt(wei);
  const whole = value / 1_000_000_000_000_000_000n;
  const fraction = (value % 1_000_000_000_000_000_000n).toString().padStart(18, "0");
  if (value > 0n && whole === 0n && fraction.slice(0, 6) === "000000") return "<0.000001";
  return whole.toString() + "." + fraction.slice(0, 6).replace(/0+$/, "").padEnd(1, "0");
}

export function explorerLink(row: ActivityOperation) {
  const origin = row.chainId === 84532 ? "https://sepolia.basescan.org" : "https://basescan.org";
  return origin + "/tx/" + row.hash;
}
