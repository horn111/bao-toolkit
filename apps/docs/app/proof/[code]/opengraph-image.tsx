import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublishedProof } from "../../proof-data";

export const alt = "Bao Toolkit proof report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = { params: Promise<{ code: string }> };

export default async function Image({ params }: ImageProps) {
  const { code } = await params;
  const proof = getPublishedProof(code);
  const coverage = proof?.summary.coverage ?? 0;
  const font = await readFile(join(process.cwd(), "public/fonts/pixelify-sans-bold.ttf"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#001619",
        color: "#e0f8f7",
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>Bao Toolkit</div>
        <div style={{ display: "flex", color: "#9ec2c2", fontSize: 22 }}>Attribution Proof Set</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", color: "#9ec2c2", fontSize: 24 }}>
          {proof?.title ?? "BUILDER CODE"}
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, fontFamily: "Pixel" }}>
          {code}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28 }}>
          <span style={{ color: proof ? "#83e2d0" : "#f3d798" }}>
            {proof ? "VERIFIED ON BASE" : "PROOF NOT PUBLISHED"}
          </span>
          <span style={{ color: "#9ec2c2" }}>·</span>
          <span>{coverage}% coverage</span>
        </div>
        {proof ? (
          <div style={{ display: "flex", color: "#9ec2c2", fontSize: 22, gap: 20 }}>
            <span>
              {proof.summary.verified} verified{" "}
              {proof.summary.verified === 1 ? "transaction" : "transactions"}
            </span>
            <span>·</span>
            <span>
              {proof.summary.reports} replay {proof.summary.reports === 1 ? "report" : "reports"}
            </span>
            <span>·</span>
            <span>{proof.summary.networks.map((network) => network.network).join(" + ")}</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", color: "#27d8c9", fontSize: 22 }}>
        Source → CI → Base → Proof Set
      </div>
    </div>,
    { ...size, fonts: [{ name: "Pixel", data: font, style: "normal", weight: 700 }] },
  );
}
