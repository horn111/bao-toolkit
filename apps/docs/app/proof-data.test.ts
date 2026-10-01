import { describe, expect, it } from "vitest";
import { createAttributionProofSet } from "@base-attribution-os/core";
import proofSetSnapshot from "../../../proofs/sets/bc_vwmzy653.json";
import {
  getPublishedProof,
  getPublishedProofTransactions,
  observatorySummary,
  publishedProofSets,
  proofArtifactResponse,
  getProofReportDownloads,
} from "./proof-data.js";

describe("published proof registry", () => {
  it("returns only explicitly published Builder Codes", () => {
    expect(getPublishedProof("bc_vwmzy653")?.builderCode).toBe("bc_vwmzy653");
    expect(getPublishedProof("__proto__")).toBeUndefined();
    expect(getPublishedProof("constructor")).toBeUndefined();
  });

  it("loads both explicit static manifests", () => {
    expect(publishedProofSets.map((proofSet) => proofSet.builderCode).sort()).toEqual([
      "bc_4pe6m33m",
      "bc_vwmzy653",
    ]);
    expect(observatorySummary).toMatchObject({
      proofSets: 2,
      reports: 3,
      transactions: 3,
      attributed: 3,
      verified: 3,
      verifiedAttributed: 3,
      coverage: 100,
    });
  });

  it("derives the public transaction from the canonical proof set", () => {
    const proof = getPublishedProof(proofSetSnapshot.builderCode);
    const transactions = proof ? getPublishedProofTransactions(proof) : [];

    expect(transactions[0]?.transaction).toMatchObject({
      hash: proofSetSnapshot.reports[0].transactions[0].hash,
      codes: proofSetSnapshot.reports[0].transactions[0].codes,
      explorerUrl: proofSetSnapshot.reports[0].transactions[0].explorerUrl,
    });
  });

  it("keeps the Stack direct and nested wallet evidence public", () => {
    const proof = getPublishedProof("bc_4pe6m33m");
    expect(proof?.summary).toMatchObject({ reports: 2, total: 2, verified: 2 });
    expect(
      proof ? getPublishedProofTransactions(proof).map((entry) => entry.transaction.source) : [],
    ).toEqual([
      "Stack the Bag · Coinbase Smart Wallet/ERC-4337 mint",
      "Stack the Bag · direct batch mint",
    ]);
  });

  it.each(["bc_vwmzy653", "bc_4pe6m33m"])(
    "rebuilds the exact published manifest from its downloadable inputs: %s",
    async (code) => {
      const proof = getPublishedProof(code)!;
      const reports = await Promise.all(
        getProofReportDownloads(proof).map(async (download, index) => {
          const response = proofArtifactResponse(code, String(index + 1));
          expect(response.headers.get("Content-Disposition")).toContain(download.name);
          return response.json();
        }),
      );
      const rebuilt = createAttributionProofSet(reports, { builderCode: code, title: proof.title });
      expect(rebuilt).toEqual(proof);
      expect(await proofArtifactResponse(code).json()).toEqual(proof);
    },
  );

  it.each(["0", "-1", "1e0", "1.0", "999", "__proto__"])(
    "rejects an unpublished report index: %s",
    (index) => {
      expect(proofArtifactResponse("bc_vwmzy653", index).status).toBe(404);
    },
  );

  it("does not export unpublished Builder Codes", () => {
    expect(proofArtifactResponse("bc_unknown").status).toBe(404);
  });
});
