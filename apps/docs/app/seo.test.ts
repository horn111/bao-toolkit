import { describe, expect, it } from "vitest";
import { pageMetadata, serializeJsonLd, SITE_URL } from "./seo";
import sitemap from "./sitemap";
import robots from "./robots";
import { guides } from "./docs/guides";
import { publishedB20Reports } from "./b20/registry";
import { publishedProofSets } from "./proof-data";
import { GET as llms } from "./llms.txt/route";

describe("search discovery", () => {
  it("gives each content URL its own canonical and matching social URL", () => {
    for (const { url } of sitemap()) {
      const path = new URL(url).pathname;
      const metadata = pageMetadata(path, "Example page", "Example description");
      expect(metadata.alternates?.canonical).toBe(url);
      expect(metadata.openGraph?.url).toBe(url);
      expect(metadata.openGraph?.title).toBe("Example page · BAO Toolkit");
      expect(metadata.title).toEqual({ absolute: metadata.openGraph?.title });
      expect(metadata.twitter?.title).toBe(metadata.openGraph?.title);
    }
  });

  it("does not repeat the brand when the page title already names the toolkit", () => {
    const metadata = pageMetadata("/docs/quickstart", "Start building with BAO Toolkit", "Install");
    expect(metadata.title).toEqual({ absolute: "Start building with BAO Toolkit" });
  });

  it("publishes all registered guides and evidence on one canonical origin", () => {
    const urls = sitemap().map(({ url }) => url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(new URL(url).origin).toBe(SITE_URL);
      expect(new URL(url).search).toBe("");
    }
    expect(urls).toEqual(
      expect.arrayContaining([
        `${SITE_URL}/`,
        `${SITE_URL}/dashboard/evidence`,
        ...guides.map(({ slug }) => `${SITE_URL}/docs/${slug}`),
        ...publishedB20Reports.map(({ id }) => `${SITE_URL}/b20/reports/${id}`),
        ...publishedProofSets.map(({ builderCode }) => `${SITE_URL}/proof/${builderCode}`),
      ]),
    );
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/" });
  });

  it("keeps script-closing content inert without changing JSON-LD data", () => {
    const data = { headline: '</script><script>alert("x")</script>', text: "<tag> & BAO" };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });

  it("keeps the plain-text navigation consistent with indexable pages", async () => {
    const response = llms();
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    const urls = new Set(sitemap().map(({ url }) => url));
    const internalLinks = [...text.matchAll(/\]\((https:\/\/www\.baosys\.xyz[^)]*)\)/g)];
    expect(internalLinks.length).toBeGreaterThan(0);
    for (const [, url] of internalLinks) expect(urls.has(url)).toBe(true);
    for (const { slug } of guides) expect(text).toContain(`${SITE_URL}/docs/${slug}`);
  });
});
