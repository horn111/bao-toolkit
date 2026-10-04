import { pageMetadata } from "../seo";
import Link from "next/link";
import { SiteHeader } from "../_components/site-header";
import { ArrowIcon } from "../_components/site-icons";
import { guides } from "./guides";
export const metadata = pageMetadata(
  "/docs",
  "Documentation: SDK, CLI & CI guides",
  "Install BAO Toolkit, add attribution, audit source code, enforce policy in CI, and reproduce transaction evidence.",
);
export default function DocsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="app-container documentation">
      <SiteHeader current="docs" />
      <header className="docs-intro">
        <h1>Build with BAO Toolkit.</h1>
        <p>
          Start with your transaction client. Follow the path through source audits, CI, and
          reproducible evidence.
        </p>
        <Link className="primary-action" href="/docs/quickstart">
          Start with the quickstart <ArrowIcon />
        </Link>
      </header>
      <div className="docs-index">
        {guides.map((g) => (
          <Link key={g.slug} href={`/docs/${g.slug}`}>
            <div>
              <h2>{g.title}</h2>
              <p>{g.description}</p>
            </div>
            <ArrowIcon />
          </Link>
        ))}
        <Link href="/b20/guide">
          <div>
            <h2>
              B20 candidate guide <span className="candidate-tag">Unreleased</span>
            </h2>
            <p>
              Inspect token evidence, reproduce synthetic examples, and recheck recorded
              observations.
            </p>
          </div>
          <ArrowIcon />
        </Link>
      </div>
      <section className="docs-tools">
        <h2>Explore the tools</h2>
        <nav aria-label="Interactive tools">
          <Link href="/doctor">
            Attribution Doctor <ArrowIcon />
          </Link>
          <Link href="/dashboard">
            Dashboard <ArrowIcon />
          </Link>
          <Link href="/observatory">
            Observatory <ArrowIcon />
          </Link>
          <Link href="/smart-wallets">
            Smart Wallet Kit <ArrowIcon />
          </Link>
          <Link href="/b20">
            B20 evidence <ArrowIcon />
          </Link>
        </nav>
      </section>
    </main>
  );
}
