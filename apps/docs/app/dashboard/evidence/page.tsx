import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../_components/site-header";
import { dashboardProjects } from "../registry";
import { Dashboard } from "../view";
import "../dashboard.css";

export const metadata: Metadata = {
  title: "Attribution Evidence",
  description: "Inspect published attribution samples and source audits for Base applications.",
};
export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; network?: string }>;
}) {
  const query = await searchParams;
  const project = dashboardProjects.find((item) => item.code === query.project);
  const network = query.network === "8453" || query.network === "84532" ? query.network : "all";
  if (query.project && !project) {
    return (
      <main id="main-content" tabIndex={-1} className="app-container dashboard-page">
        <SiteHeader current="dashboard" />
        <section className="dash-empty">
          <h1>No published evidence for this code</h1>
          <p>Publish a Proof Set to add attribution evidence for this application.</p>
          <Link className="dash-button" href="/dashboard">
            Return to app activity
          </Link>
          <Link className="dash-button" href="/docs/attribution-proof-loop">
            Read the proof guide
          </Link>
        </section>
      </main>
    );
  }
  const selected =
    project ??
    dashboardProjects.find((item) => item.code === "bc_4pe6m33m") ??
    dashboardProjects[0];
  return (
    <main id="main-content" tabIndex={-1} className="app-container dashboard-page">
      <SiteHeader current="dashboard" />
      <Dashboard
        key={selected.code + ":" + network}
        projects={dashboardProjects}
        initialProject={selected.code}
        initialNetwork={network}
      />
    </main>
  );
}
