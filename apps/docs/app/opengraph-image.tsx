import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const alt = "Bao Toolkit — attribution, source audits, and transaction evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
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
        padding: "56px",
      }}
    >
      <div style={{ fontSize: 28, display: "flex", color: "#27d8c9" }}>Bao Toolkit</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "Pixel",
          fontSize: 94,
          lineHeight: 1.05,
          fontWeight: 700,
        }}
      >
        <span>BUILD ON BASE.</span>
        <span>KNOW WHAT SHIPPED.</span>
      </div>
      <div style={{ display: "flex", fontSize: 22, color: "#9ec2c2" }}>
        Attribution · Source audits · B20 evidence · Transaction proofs
      </div>
    </div>,
    { ...size, fonts: [{ name: "Pixel", data: font, style: "normal", weight: 700 }] },
  );
}
