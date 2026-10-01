import { proofArtifactResponse, publishedProofSets } from "../../../proof-data";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return publishedProofSets.map((proof) => ({ code: proof.builderCode }));
}
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return proofArtifactResponse((await params).code);
}
