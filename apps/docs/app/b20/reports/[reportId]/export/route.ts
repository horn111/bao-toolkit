import { b20ArtifactResponse, publishedB20Reports } from "../../../registry";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return publishedB20Reports.map(({ id }) => ({ reportId: id }));
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  return b20ArtifactResponse((await params).reportId, "report");
}
