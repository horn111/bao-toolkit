"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowIcon } from "./site-icons";

const before = `await walletClient.sendTransaction({
  account,
  to,
  value,
  data: "0x",
});`;
const after = `import { builderCodeDataSuffix }
  from "@base-attribution-os/viem";

await walletClient.sendTransaction({
  account,
  to,
  value,
  data: "0x",
  dataSuffix: builderCodeDataSuffix("bc_abc123"),
});`;

export function SourceExample() {
  const [fixed, setFixed] = useState(false);
  return (
    <div className="source-example">
      <div className="example-toolbar">
        <span>Illustrative viem request</span>
        <div role="group" aria-label="Compare attribution code">
          <button type="button" aria-pressed={!fixed} onClick={() => setFixed(false)}>
            Before
          </button>
          <button type="button" aria-pressed={fixed} onClick={() => setFixed(true)}>
            After
          </button>
        </div>
      </div>
      <pre>
        <code>{fixed ? after : before}</code>
      </pre>
      <div className={`example-result ${fixed ? "is-fixed" : ""}`} aria-live="polite">
        <strong>{fixed ? "Builder Code suffix added" : "Builder Code suffix missing"}</strong>
        <p>
          {fixed
            ? "Use your own registered code. The helper adds attribution to this request."
            : "A valid transaction request can omit attribution. The transaction alone does not protect your code."}
        </p>
      </div>
      <Link className="text-action" href="/doctor">
        Try the source audit <ArrowIcon />
      </Link>
    </div>
  );
}
