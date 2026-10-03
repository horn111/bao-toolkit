import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { ArrowIcon } from "./site-icons";
import { MobileNavigation } from "./mobile-navigation";
import { ToolsMenu } from "./tools-menu";
import "./site.css";

type Current = "doctor" | "observatory" | "proof" | "smart-wallets" | "dashboard" | "b20" | "docs";

export function SiteHeader({ current, home = false }: { current?: Current; home?: boolean }) {
  return (
    <>
      <header className={`topbar site-header ${home ? "home-header" : ""}`}>
        <Link className="site-brand" href="/" aria-label="BAO Toolkit home">
          <BrandMark />
          <span>BAO Toolkit</span>
        </Link>
        <nav className="site-navigation" aria-label="Primary navigation">
          <Link href="/#product">Product</Link>
          <ToolsMenu current={current} />
          <Link href="/#evidence">Evidence</Link>
          <Link href="/docs" aria-current={current === "docs" ? "page" : undefined}>
            Docs
          </Link>
          <a
            href="https://github.com/horn111/bao-toolkit"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link className="site-start" href="/docs/quickstart">
            Start building <ArrowIcon />
          </Link>
        </nav>
        <MobileNavigation docs={current === "docs"} />
      </header>
      {!home && current !== "docs" ? (
        <>
          <ToolsMenu current={current} compact />
          <nav className="tool-navigation" aria-label="BAO Toolkit tools">
            {(
              [
                ["dashboard", "Dashboard", "/dashboard"],
                ["doctor", "Doctor", "/doctor"],
                ["observatory", "Observatory", "/observatory"],
                ["b20", "B20", "/b20"],
                ["smart-wallets", "Smart Wallet Kit", "/smart-wallets"],
              ] as const
            ).map(([id, label, href]) => (
              <Link href={href} key={id} aria-current={current === id ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </>
  );
}
