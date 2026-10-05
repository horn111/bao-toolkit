import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "./_components/site-footer";
import { SITE_DESCRIPTION, SITE_URL } from "./seo";

const bodyFont = localFont({
  src: "../public/fonts/space-grotesk.woff2",
  variable: "--font-body",
  display: "swap",
});
const codeFont = localFont({
  src: "../public/fonts/jetbrains-mono.woff2",
  variable: "--font-code",
  display: "swap",
  preload: false,
});
const pixelFont = localFont({
  src: "../public/fonts/pixelify-sans.woff2",
  weight: "400 700",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BAO Toolkit · Build, audit, and verify on Base",
    template: "%s · BAO Toolkit",
  },
  description: SITE_DESCRIPTION,
  other: {
    "talentapp:project_verification":
      "23654c79d1303187820e11b6203dcf6c7ae24e2490cfa7e3b0fd9121ba0997a8b3eab754dc3dd72b5c4db30a8efae2bf32fb46fda460ca17f05c6b6c5c9cb0b4",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${codeFont.variable} ${pixelFont.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
