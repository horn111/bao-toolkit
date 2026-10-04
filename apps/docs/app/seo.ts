import type { Metadata } from "next";

export const SITE_URL = "https://www.baosys.xyz";
export const SITE_NAME = "BAO Toolkit";
export const REPOSITORY_URL = "https://github.com/horn111/bao-toolkit";
export const SITE_DESCRIPTION =
  "Open-source tools for Base: ERC-8021 Builder Code attribution, source audits, CI checks, B20 token evidence, and reproducible transaction proofs.";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
  imagePath = "/opengraph-image",
): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url,
      title: fullTitle,
      description,
      images: [{ url: `${SITE_URL}${imagePath}`, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@BAO_toolkit",
      title: fullTitle,
      description,
      images: [`${SITE_URL}${imagePath}`],
    },
  };
}

// Escaping '<' prevents content from closing the script element in HTML.
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE_NAME, path: "/" }, ...items].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export const projectData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      about: { "@id": `${SITE_URL}/#software` },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      codeRepository: REPOSITORY_URL,
      license: `${REPOSITORY_URL}/blob/main/LICENSE`,
      programmingLanguage: "TypeScript",
      sameAs: [REPOSITORY_URL, "https://x.com/BAO_toolkit"],
    },
  ],
};
