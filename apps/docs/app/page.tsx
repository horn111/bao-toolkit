import Image from "next/image";
import heroArt from "../assets/plates/hero-art.png";
import driftRocks from "../assets/plates/drift-rocks.png";
import Link from "next/link";
import { SiteHeader } from "./_components/site-header";
import { BrandMark } from "./_components/brand-mark";
import { CopyCommand } from "./_components/copy-command";
import { ArrowIcon, FileIcon, ModuleIcon } from "./_components/site-icons";
import { HomeSections } from "./_components/home-sections";
import { PixelField } from "./_components/pixel-field";
import "./home.css";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="product-home">
      <section className="landing-stage" aria-labelledby="home-title">
        <SiteHeader home />
        <PixelField className="planet-art" src={heroArt.src}>
          <Image alt="" fill priority sizes="60vw" src={heroArt} />
        </PixelField>
        <PixelField className="drift-art" src={driftRocks.src}>
          <Image alt="" fill priority sizes="35vw" src={driftRocks} />
        </PixelField>
        <HeroFrame />
        <h1 id="home-title" className="landing-title">
          <span className="headline-base">BUILD ON BASE.</span>
          <span className="headline-know">KNOW WHAT</span>
          <span className="headline-shipped">SHIPPED.</span>
        </h1>
        <div className="hero-caption">
          <PanelOutline kind="caption" />
          <BrandMark className="caption-mark" />
          <p className="caption-one">
            One toolkit for attribution,
            <br /> code audits, and native
            <br /> token evidence.
          </p>
          <p className="caption-two">
            Reproduce transaction checks.
            <br /> Keep your policy from source
            <br /> code to onchain evidence.
          </p>
          <p className="caption-scope">Open source. Runs in your app, locally, and in CI.</p>
        </div>
        <aside className="hero-quickstart" aria-labelledby="hero-start-title">
          <PanelOutline kind="quickstart" />
          <FileIcon />
          <h2 id="hero-start-title">Start with your stack</h2>
          <CopyCommand command="pnpm add @base-attribution-os/viem" />
          <Link href="/docs/quickstart" className="quickstart-link">
            Read the quickstart <ArrowIcon />
          </Link>
        </aside>
        <nav className="module-rail" aria-label="Product modules">
          <Link href="/#attribution">
            <ModuleIcon kind="attribution" />
            Attribution <ArrowIcon />
          </Link>
          <Link href="/#source-audits">
            <ModuleIcon kind="audit" />
            Source audits <ArrowIcon />
          </Link>
          <Link href="/#b20">
            <ModuleIcon kind="b20" />
            B20 evidence <span className="candidate-tag">Candidate</span>
            <ArrowIcon />
          </Link>
          <Link href="/#transaction-proofs">
            <ModuleIcon kind="proof" />
            Transaction proofs <ArrowIcon />
          </Link>
        </nav>
      </section>
      <HomeSections />
    </main>
  );
}

function PanelOutline({ kind }: { kind: "caption" | "quickstart" }) {
  return (
    <svg
      className="panel-outline"
      aria-hidden="true"
      viewBox={kind === "caption" ? "0 0 827 172" : "0 0 428 206"}
      preserveAspectRatio="none"
    >
      <path
        vectorEffect="non-scaling-stroke"
        d={
          kind === "caption"
            ? "M28.5 .5H826.5V171.5H.5V120.5H28.5Z"
            : "M.5 .5H400.5V22.5H427.5V205.5H.5Z"
        }
      />
    </svg>
  );
}

function HeroFrame() {
  const points = [
    [27, 162],
    [68, 162],
    [68, 138],
    [1030, 138],
    [1030, 160],
    [1280, 160],
    [1280, 116],
    [1646, 116],
    [1646, 354],
    [1626, 354],
    [1626, 596],
    [1172, 596],
    [1172, 645],
    [374, 645],
    [374, 766],
    [65, 766],
    [65, 593],
    [27, 593],
    [27, 162],
  ];
  return (
    <div className="hero-frame" aria-hidden="true">
      {points.slice(1).map(([x, y], i) => {
        const [px, py] = points[i];
        return (
          <span
            key={i}
            style={{
              left: `${(Math.min(x, px) / 1672) * 100}%`,
              top: `${(Math.min(y, py) / 941) * 100}%`,
              width: x === px ? "1px" : `${(Math.abs(x - px) / 1672) * 100}%`,
              height: y === py ? "1px" : `${(Math.abs(y - py) / 941) * 100}%`,
            }}
          />
        );
      })}
      {[
        [48, 139],
        [1620, 133],
        [83, 748],
        [1632, 627],
      ].map(([x, y]) => (
        <i
          key={x}
          className="frame-cross"
          style={{ left: `${(x / 1672) * 100}%`, top: `${(y / 941) * 100}%` }}
        />
      ))}
      <div className="frame-signal">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
