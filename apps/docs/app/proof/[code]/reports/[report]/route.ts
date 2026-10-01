import { proofArtifactResponse, publishedProofSets } from "../../../../proof-data";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return publishedProofSets.flatMap((proof) =>
    proof.reports.map((_, index) => ({ code: proof.builderCode, report: String(index + 1) })),
  );
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string; report: string }> },
) {
  const { code, report } = await params;
  return proofArtifactResponse(code, report);
}
