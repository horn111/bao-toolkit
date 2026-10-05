import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../_components/brand-mark";
import "./workspace.css";

const tools = [
  {
    id: "activity",
    href: "/dashboard",
    label: "Activity",
    title: "App activity",
    icon: "activity",
  },
  {
    id: "evidence",
    href: "/dashboard/evidence",
    label: "Evidence",
    title: "Attribution evidence",
    icon: "file",
  },
  { id: "doctor", href: "/doctor", label: "Doctor", title: "Attribution Doctor", icon: "scan" },
  {
    id: "proofs",
    href: "/observatory",
    label: "Proofs",
    title: "Published proofs",
    icon: "folder",
  },
  { id: "b20", href: "/b20", label: "B20", title: "B20 token evidence", icon: "blocks" },
  {
    id: "wallets",
    href: "/smart-wallets",
    label: "Wallets",
    title: "Smart Wallet Kit",
    icon: "wallet",
  },
] as const;

export function Workspace({
  children,
  active = "activity",
  className = "",
}: {
  children: ReactNode;
  active?: (typeof tools)[number]["id"];
  className?: string;
}) {
  return (
    <div className="bao-workspace">
      <header className="workspace-header">
        <Link href="/" className="workspace-brand" aria-label="BAO Toolkit home">
          <BrandMark />
          <span>BAO Toolkit</span>
        </Link>
        <span className="workspace-location">
          {tools.find((tool) => tool.id === active)?.title}
        </span>
        <nav aria-label="Workspace resources">
          <Link href="/docs">Docs</Link>
          <a
            href="https://github.com/horn111/bao-toolkit"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <PixelIcon name="external" />
          </a>
        </nav>
      </header>
      <div className="workspace-layout">
        <nav className="workspace-rail" aria-label="BAO Toolkit tools">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              aria-current={tool.id === active ? "page" : undefined}
            >
              <PixelIcon name={tool.icon} />
              <span>{tool.label}</span>
            </Link>
          ))}
        </nav>
        <main id="main-content" tabIndex={-1} className={`workspace-content ${className}`.trim()}>
          {children}
        </main>
      </div>
      <footer className="workspace-status">
        <span>
          <PixelIcon name="blocks" /> Built for builders on Base
        </span>
        <Link href="/docs/transaction-proofs">
          Data &amp; methodology <PixelIcon name="external" />
        </Link>
      </footer>
    </div>
  );
}

export function PixelIcon({
  name,
}: {
  name: "activity" | "file" | "scan" | "folder" | "blocks" | "wallet" | "external";
}) {
  const shapes = {
    activity: "M2 18h20v2H2zM4 11h3v5H4zM10 4h3v12h-3zM16 8h3v8h-3z",
    file: "M5 2h10v2H7v16h11V7h2v15H5zM15 4h3v3h-3zM9 9h7v2H9zM9 13h7v2H9zM9 17h4v2H9z",
    scan: "M2 2h7v2H4v5H2zM15 2h7v7h-2V4h-5zM2 15h2v5h5v2H2zM20 15h2v7h-7v-2h5zM7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z",
    folder: "M2 5h8v2h12v13H2zM4 9v9h16V9z",
    blocks: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    wallet: "M3 4h16v2H5v2h17v13H3zM5 10v9h15v-3h-5v-4h5v-2zM17 13v2h3v-2z",
    external: "M11 3h10v10h-2V7l-9 9-2-2 9-9h-6zM3 8h2v11h11v2H3z",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={shapes[name]} />
    </svg>
  );
}
