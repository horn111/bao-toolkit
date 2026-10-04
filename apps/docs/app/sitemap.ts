import type { MetadataRoute } from "next";
import { guides } from "./docs/guides";
import { publishedB20Reports } from "./b20/registry";
import { publishedProofSets } from "./proof-data";
import { SITE_URL } from "./seo";
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/docs",
    "/doctor",
    "/dashboard",
    "/dashboard/evidence",
    "/observatory",
    "/smart-wallets",
    "/b20",
    "/b20/guide",
    ...guides.map((g) => `/docs/${g.slug}`),
    ...publishedB20Reports.map((r) => `/b20/reports/${r.id}`),
    ...publishedProofSets.map((p) => `/proof/${p.builderCode}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path || "/"}` }));
}
