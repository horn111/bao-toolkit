export type Profile = "local" | "ci" | "strict";
export type Variant = "broken" | "fixed";
export type Family = "agent" | "privy" | "rpc" | "wagmi" | "wallet" | "x402";
type Status = "protected" | "missing" | "wrong-code" | "unresolved";

interface AuditPath {
  line: number;
  family: Family;
  marker: string;
  status: Status;
  ruleId?: string;
  suggestion?: string;
}

interface AuditCandidate extends Omit<AuditPath, "status"> {
  index: number;
}

export interface AuditResult {
  ok: boolean;
  coverage: number | null;
  protected: number;
  paths: AuditPath[];
  inputIssue: "builder-code-required" | "no-paths" | null;
}

export const profiles: Record<Profile, { intent: string; unresolvedFails: boolean }> = {
  local: { intent: "report without blocking", unresolvedFails: false },
  ci: { intent: "block missing attribution", unresolvedFails: false },
  strict: { intent: "require verifiable code", unresolvedFails: true },
};

export function auditSource(
  source: string,
  family: Family,
  builderCode: string,
  profile: Profile,
): AuditResult {
  const candidates = findCandidates(source, family);
  const paths = candidates.map((candidate): AuditPath => {
    const evidenceSource = attributionEvidence(source, family, candidate);
    const discoveredCodes: string[] = evidenceSource?.match(/\bbc_[A-Za-z0-9._:-]+\b/g) ?? [];
    const hasExpectedCode = builderCode.length > 0 && discoveredCodes.includes(builderCode);
    const wrongCode = discoveredCodes.find((code) => code !== builderCode);
    const helper = evidenceSource !== undefined;
    const path = {
      family: candidate.family,
      line: candidate.line,
      marker: candidate.marker,
    };
    if (wrongCode && !hasExpectedCode)
      return {
        ...path,
        status: "wrong-code",
        ruleId: "BAO002",
        suggestion: "Use the configured Builder Code.",
      };
    if (helper && hasExpectedCode) return { ...path, status: "protected" };
    if (helper)
      return {
        ...path,
        status: "unresolved",
        ruleId: "BAO003",
        suggestion: "Expose the Builder Code to strict CI.",
      };
    if (family === "wallet")
      return {
        ...path,
        status: "missing",
        ruleId: "BAO005",
        suggestion: "Use capability-aware Smart Wallet Attribution Kit middleware.",
      };
    if (family === "x402")
      return {
        ...path,
        status: "missing",
        ruleId: "BAO006",
        suggestion: "Register the official Builder Code extension.",
      };
    return {
      ...path,
      status: "missing",
      ruleId: "BAO001",
      suggestion: "Add dataSuffix or a BAO helper.",
    };
  });
  const protectedCount = paths.filter((entry) => entry.status === "protected").length;
  const failures = paths.filter(
    (entry) =>
      entry.status === "missing" ||
      entry.status === "wrong-code" ||
      (entry.status === "unresolved" && profiles[profile].unresolvedFails),
  );
  return {
    ok:
      paths.length > 0 && builderCode.length > 0 && (profile === "local" || failures.length === 0),
    coverage:
      !builderCode || paths.length === 0 ? null : Math.round((protectedCount / paths.length) * 100),
    protected: protectedCount,
    paths,
    inputIssue: !builderCode ? "builder-code-required" : paths.length === 0 ? "no-paths" : null,
  };
}

function findCandidates(source: string, family: Family): AuditCandidate[] {
  const patterns =
    family === "x402"
      ? [{ marker: "x402Client", regex: /\bnew\s+x402Client\s*\(/g }]
      : family === "wallet"
        ? [
            { marker: "sendCalls", regex: /\bsendCalls\s*\(/g },
            { marker: "sendAttributedCalls", regex: /\bsendAttributedCalls\s*\(/g },
          ]
        : family === "rpc"
          ? [{ marker: "eth_sendTransaction", regex: /["']eth_sendTransaction["']/g }]
          : [
              { marker: "sendTransaction", regex: /\bsendTransaction\s*\(/g },
              { marker: "writeContract", regex: /\bwriteContract\s*\(/g },
            ];
  return patterns.flatMap(({ marker, regex }) =>
    Array.from(source.matchAll(regex), (match) => ({
      family,
      marker,
      line: lineNumberAtIndex(source, match.index ?? 0),
      index: match.index ?? 0,
    })),
  );
}

function attributionEvidence(
  source: string,
  family: Family,
  candidate: AuditCandidate,
): string | undefined {
  if (family === "x402") {
    const declarationStart = Math.max(0, source.lastIndexOf("const ", candidate.index));
    const declaration = source.slice(declarationStart, candidate.index + 64);
    const clientName = declaration.match(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+x402Client\s*\(/,
    )?.[1];
    if (!clientName) return undefined;
    const escapedClient = clientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const registration = source.match(
      new RegExp(
        `\\b${escapedClient}\\.registerExtension\\s*\\(\\s*new\\s+BuilderCodeClientExtension\\s*\\([^;]+`,
      ),
    )?.[0];
    return registration;
  }

  const callStart =
    family === "rpc"
      ? Math.max(0, source.lastIndexOf("request(", candidate.index))
      : candidate.index;
  const direct = callSourceAt(source, callStart);
  if (family === "wallet") {
    return /\b(?:sendAttributedCalls|withUserOperationAttribution|attributeUserOperation)\b/.test(
      direct,
    )
      ? direct
      : undefined;
  }
  if (family === "rpc") {
    return /\b(?:appendDataSuffix|DATA_SUFFIX|dataSuffix)\b/.test(direct) ? direct : undefined;
  }
  if (
    /\b(?:appendDataSuffix|createDataSuffix|useAttributionSuffix|withViemDataSuffix)\b/.test(direct)
  ) {
    return direct;
  }
  if (/\bdataSuffix\b/.test(direct)) {
    const declarations = Array.from(
      source
        .slice(0, candidate.index)
        .matchAll(
          /\bconst\s+dataSuffix\s*=\s*(?:useAttributionSuffix|createDataSuffix|builderCodeDataSuffix)\s*\([^;]+/g,
        ),
    );
    const declaration = declarations.at(-1)?.[0];
    return declaration ? `${declaration}\n${direct}` : undefined;
  }
  return undefined;
}

function callSourceAt(source: string, start: number): string {
  const open = source.indexOf("(", start);
  if (open < 0) return source.slice(start, source.indexOf("\n", start));
  let depth = 0;
  let quote: '"' | "'" | "`" | undefined;
  let escaped = false;

  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function lineNumberAtIndex(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}
