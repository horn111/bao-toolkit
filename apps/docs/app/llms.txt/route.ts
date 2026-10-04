import { guides } from "../docs/guides";
import { REPOSITORY_URL, SITE_DESCRIPTION, SITE_URL } from "../seo";

export const dynamic = "force-static";

// A navigation aid for tools that consume llms.txt, not a search ranking signal.
export function GET() {
  const content = [
    "# BAO Toolkit",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Independent MIT-licensed project. Not affiliated with Base or Coinbase.",
    "Package names remain @base-attribution-os/*; the CLI command is bao.",
    "",
    "## Documentation",
    "",
    ...guides.map(
      (guide) => `- [${guide.title}](${SITE_URL}/docs/${guide.slug}): ${guide.description}`,
    ),
    `- [Smart wallet attribution](${SITE_URL}/smart-wallets): EIP-5792 batches and ERC-4337 UserOperations.`,
    `- [B20 inspection and replay](${SITE_URL}/b20/guide): Installation, report reproduction, and evidence limitations.`,
    "",
    "## Tools and evidence",
    "",
    `- [Attribution Doctor](${SITE_URL}/doctor): Browser examples; full source scans run locally or in CI.`,
    `- [App Activity Dashboard](${SITE_URL}/dashboard): Activity by Builder Code and selected dataset.`,
    `- [Attribution Evidence](${SITE_URL}/dashboard/evidence): Published attribution samples and source audits.`,
    `- [Observatory](${SITE_URL}/observatory): Published transaction Proof Sets and reproducible inputs.`,
    `- [B20 reports](${SITE_URL}/b20): Synthetic examples and recorded observations are labeled separately.`,
    "",
    "Published snapshots cover supplied samples, not complete app or network activity.",
    "B20 evidence does not establish token safety or application readiness. Check each report's scope and the guide's current package availability.",
    "Builder Codes identify projects, not referring tweets or visitor sessions.",
    "",
    "## Project",
    "",
    `- [Source repository](${REPOSITORY_URL})`,
    `- [License](${REPOSITORY_URL}/blob/main/LICENSE)`,
    "- [Updates on X](https://x.com/BAO_toolkit)",
    "",
  ].join("\n");
  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
