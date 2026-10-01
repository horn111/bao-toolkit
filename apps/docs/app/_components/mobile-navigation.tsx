"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowIcon } from "./site-icons";

export function MobileNavigation({ docs }: { docs: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="mobile-navigation"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        Menu <span aria-hidden="true" className="menu-icon" />
      </summary>
      <nav
        aria-label="Mobile navigation"
        onClick={() => {
          if (menu.current) menu.current.open = false;
        }}
      >
        <Link href="/#product">Product</Link>
        <Link href="/#modules">Modules</Link>
        <Link href="/#evidence">Evidence</Link>
        <Link href="/docs" aria-current={docs ? "page" : undefined}>
          Docs
        </Link>
        <a href="https://github.com/horn111/base-attribution-os">GitHub</a>
        <div className="mobile-tool-links">
          <span>Tools</span>
          <Link href="/doctor">Doctor</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/observatory">Observatory</Link>
          <Link href="/b20">B20 evidence</Link>
          <Link href="/smart-wallets">Smart Wallet Kit</Link>
        </div>
        <Link className="site-start" href="/docs/quickstart">
          Start building <ArrowIcon />
        </Link>
      </nav>
    </details>
  );
}
