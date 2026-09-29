export type Hex = `0x${string}`;

export function object(
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`B20_INVALID_INPUT: ${label} must be an object`);
  }
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key))) {
    throw new Error(`B20_INVALID_INPUT: unknown ${label} field`);
  }
  return result;
}

export function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`B20_INVALID_INPUT: invalid ${label}`);
  }
  return value as T;
}

export function hex(value: unknown, bytes: number | undefined, label: string): Hex {
  if (
    typeof value !== "string" ||
    !/^0x(?:[a-fA-F0-9]{2})*$/.test(value) ||
    value.length > 8194 ||
    (bytes !== undefined && value.length !== 2 + bytes * 2)
  ) {
    throw new Error(`B20_INVALID_INPUT: invalid ${label}`);
  }
  return value.toLowerCase() as Hex;
}

export function decimal(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9][0-9]{0,77})$/.test(value) ||
    BigInt(value) > (1n << 256n) - 1n
  ) {
    throw new Error(`B20_INVALID_INPUT: invalid ${label}`);
  }
  return value;
}

export function chain(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("B20_INVALID_INPUT: chainId must be a positive safe integer");
  }
  return value;
}

export function timestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error("B20_INVALID_INPUT: timestamp must be canonical UTC ISO-8601");
  }
  return value;
}

/** Stable JSON for this bounded, JSON-only schema. Object key order is not evidence. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 16) throw new Error("B20_INPUT_LIMIT: excessive nesting");
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item, depth + 1)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key], depth + 1)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
