"use client";

import Link from "next/link";
import { useRef } from "react";

const toolLinks = [
  ["doctor", "Doctor", "/doctor"],
  ["dashboard", "Dashboard", "/dashboard"],
  ["observatory", "Observatory", "/observatory"],
  ["b20", "B20 evidence", "/b20"],
  ["smart-wallets", "Smart Wallet Kit", "/smart-wallets"],
] as const;

export function ToolsMenu({ current, compact = false }: { current?: string; compact?: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className={`tools-menu ${compact ? "tool-switcher" : ""}`}
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        {compact ? (toolLinks.find(([id]) => id === current)?.[1] ?? "Choose a tool") : "Tools"}
        <span aria-hidden="true" className="tools-chevron" />
      </summary>
      <nav
        aria-label={compact ? "Choose a BAO Toolkit tool" : "Tools"}
        onClick={() => {
          if (menu.current) menu.current.open = false;
        }}
      >
        {toolLinks.map(([id, label, href]) => (
          <Link key={id} href={href} aria-current={id === current ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
