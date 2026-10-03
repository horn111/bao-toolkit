import Link from "next/link";
import { SiteHeader } from "./_components/site-header";
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="app-container">
      <SiteHeader />
      <section className="hero">
        <h1>Page not found.</h1>
        <p className="lede">
          This path does not have a published page. Find your next step in the documentation or
          return to BAO Toolkit.
        </p>
        <div>
          <Link className="primary-action" href="/docs">
            Open documentation
          </Link>{" "}
          <Link className="text-action" href="/">
            Back to the product
          </Link>
        </div>
      </section>
    </main>
  );
}
