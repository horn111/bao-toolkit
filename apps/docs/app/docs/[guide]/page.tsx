import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../_components/site-header";
import { CopyCommand } from "../../_components/copy-command";
import { ArrowIcon } from "../../_components/site-icons";
import { getGuide, guides } from "../guides";
type Props = { params: Promise<{ guide: string }> };
export function generateStaticParams() {
  return guides.map((g) => ({ guide: g.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGuide((await params).guide);
  return { title: g?.title ?? "Guide not found", description: g?.description };
}
export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).guide);
  if (!guide) notFound();
  return (
    <main id="main-content" tabIndex={-1} className="app-container documentation">
      <SiteHeader current="docs" />
      <Link className="docs-back" href="/docs">
        All documentation <ArrowIcon />
      </Link>
      <div className="guide-layout">
        <article>
          <header className="guide-intro">
            <h1>{guide.title}</h1>
            <p>{guide.description}</p>
            <details className="guide-jump">
              <summary>In this guide</summary>
              <nav aria-label="On this page">
                {guide.sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`}>
                    {section.title}
                  </a>
                ))}
              </nav>
            </details>
          </header>
          {guide.sections.map((section) => (
            <section id={section.id} className="guide-section" key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.code ? (
                <div className="guide-code">
                  <CopyCommand command={section.code} />
                </div>
              ) : null}
              {section.links ? (
                <div className="guide-links">
                  {section.links.map((l) => (
                    <Link className="text-action" key={l.href} href={l.href}>
                      {l.label}
                      <ArrowIcon />
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
          <a
            className="guide-source"
            href={`https://github.com/horn111/bao-toolkit/blob/main/${guide.source}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the maintained source reference <ArrowIcon />
          </a>
        </article>
        <aside className="guide-toc">
          <nav aria-label="On this page">
            <h2>On this page</h2>
            {guide.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
          </nav>
          <nav aria-label="Other guides">
            <h2>Guides</h2>
            {guides.map((g) => (
              <Link
                key={g.slug}
                href={`/docs/${g.slug}`}
                aria-current={g.slug === guide.slug ? "page" : undefined}
              >
                {g.title}
              </Link>
            ))}
            <Link href="/b20/guide">B20 candidate guide</Link>
          </nav>
        </aside>
      </div>
    </main>
  );
}
