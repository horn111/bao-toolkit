import Link from "next/link";
import { ArrowIcon } from "./site-icons";
import { FooterBuilder } from "./footer-builder";
import { SpaceBackdrop } from "./space-backdrop";
import "./site.css";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <SpaceBackdrop count={8} />
      <div className="footer-main">
        <div className="footer-copy">
          <h2>Build the next thing.</h2>
          <p>
            Bao Toolkit brings attribution, source audits, and inspectable transaction evidence into
            your development workflow.
          </p>
          <Link className="primary-action" href="/docs/quickstart">
            Start building <ArrowIcon />
          </Link>
          <a className="text-action" href="https://github.com/horn111/base-attribution-os">
            Explore the source <ArrowIcon />
          </a>
        </div>
        <FooterBuilder />
      </div>
      <div className="footer-links">
        <Link href="/docs">Documentation</Link>
        <Link href="/doctor">Doctor</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/observatory">Observatory</Link>
        <Link href="/b20">B20 candidate</Link>
        <Link href="/smart-wallets">Smart Wallet Kit</Link>
        <a href="https://x.com/BaseAttribution" target="_blank" rel="noopener noreferrer">
          Updates on X
        </a>
      </div>
      <div className="footer-fineprint">
        <span>Bao Toolkit · Open source · MIT</span>
        <span>Independent toolkit. Not affiliated with Base or Coinbase.</span>
        <a href="https://github.com/horn111/base-attribution-os/blob/main/LICENSE">License</a>
      </div>
    </footer>
  );
}
