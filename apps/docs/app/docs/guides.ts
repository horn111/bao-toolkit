export interface GuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  code?: string;
  links?: { label: string; href: string }[];
}
export interface Guide {
  slug: string;
  title: string;
  description: string;
  source: string;
  sections: GuideSection[];
}
const repo = "https://github.com/horn111/base-attribution-os/blob/main/";
export const guides: Guide[] = [
  {
    slug: "quickstart",
    title: "Start building with BAO",
    description:
      "Install an attribution adapter, add your Builder Code, and run the first source audit.",
    source: "README.md",
    sections: [
      {
        id: "builder-code",
        title: "Get your Builder Code",
        paragraphs: [
          "Register your project on Base Dashboard (base.dev), then copy its code from Settings → Builder Code. Use that exact code throughout your app and BAO policy.",
          "bc_abc123 is a placeholder in this guide. BAO does not register a code for you. You can explore the browser examples before connecting your own project.",
        ],
        links: [
          { label: "Open Base Dashboard", href: "https://base.dev" },
          {
            label: "Official Builder Code guide",
            href: "https://docs.base.org/specifications/builder-codes/overview",
          },
        ],
      },
      {
        id: "install",
        title: "Install the adapter and CLI",
        paragraphs: [
          "Start in an existing TypeScript app with viem. Choose the wagmi or ethers adapter if that is your transaction client. These commands use the released attribution packages; B20 installation follows the separate candidate pilot kit.",
        ],
        code: "pnpm add @base-attribution-os/viem viem\npnpm add -D @base-attribution-os/cli",
        links: [
          { label: "Choose another adapter", href: "/docs/attribution" },
          { label: "B20 candidate pilot kit", href: "/b20/guide" },
        ],
      },
      {
        id: "policy",
        title: "Set your project’s policy",
        paragraphs: [
          "Replace bc_abc123 with a Builder Code registered for your own project. init creates bao.config.json; it does not rewrite your app. Commit that policy so local work and CI use the same rules.",
        ],
        code: "pnpm exec bao init --builder-code bc_abc123\npnpm exec bao doctor",
      },
      {
        id: "request",
        title: "Add attribution to the request",
        paragraphs: [
          "Use the helper where your app builds the transaction. The surrounding walletClient, account, recipient, and value come from your app.",
        ],
        code: 'import { builderCodeDataSuffix } from "@base-attribution-os/viem";\n\nawait walletClient.sendTransaction({\n  account,\n  to,\n  value,\n  data: "0x",\n  dataSuffix: builderCodeDataSuffix("bc_abc123"),\n});',
      },
      {
        id: "audit",
        title: "Check the full project",
        paragraphs: [
          "Run Doctor again and inspect every supported transaction path. Resolve missing or wrong codes. Treat unresolved configuration as a finding to investigate. The browser Doctor is an illustrative snippet preview; merge and release checks belong in the full-project CLI or Action.",
          "A passing strict audit has supported paths, the expected code on each path, and no blocking findings. If no paths are found, check the scan scope and supported integration before treating the app as covered. Source checks do not prove that a submitted transaction kept its code; verify a transaction next.",
        ],
        code: "pnpm exec bao doctor --profile strict",
        links: [
          { label: "Configure source audits", href: "/docs/source-audits" },
          { label: "Add the CI check", href: "/docs/ci" },
          { label: "Try the browser Doctor", href: "/doctor" },
          { label: "Verify a submitted transaction", href: "/docs/transaction-proofs" },
        ],
      },
    ],
  },
  {
    slug: "attribution",
    title: "Choose your attribution integration",
    description:
      "Keep a Builder Code with the client, wallet, or transaction path you already use.",
    source: "docs/integrations.md",
    sections: [
      {
        id: "viem",
        title: "viem",
        paragraphs: [
          "Add a dataSuffix when constructing a transaction. The adapter prepares the request; your app controls signing and submission. Replace the illustrative code with your own registered Builder Code.",
        ],
        code: 'import { builderCodeDataSuffix } from "@base-attribution-os/viem";\n\nconst dataSuffix = builderCodeDataSuffix("bc_abc123");\nawait walletClient.sendTransaction({ account, to, value, data: "0x", dataSuffix });',
      },
      {
        id: "wagmi",
        title: "wagmi",
        paragraphs: [
          "Use the attribution hook and pass its suffix to your transaction or contract call.",
        ],
        code: 'import { useAttributionSuffix } from "@base-attribution-os/wagmi";\n\nconst dataSuffix = useAttributionSuffix({ codes: ["bc_abc123"] });\nwriteContract({ address, abi, functionName: "mint", args: [], dataSuffix });',
      },
      {
        id: "ethers",
        title: "ethers",
        paragraphs: ["Wrap the transaction request before sending it through your signer."],
        code: 'import { withEthersAttribution } from "@base-attribution-os/ethers";\n\nawait signer.sendTransaction(\n  withEthersAttribution({ to, value, data: "0x" }, { codes: ["bc_abc123"] }),\n);',
      },
      {
        id: "smart-wallets",
        title: "Smart wallets and UserOperations",
        paragraphs: [
          "EIP-5792 batches need capability negotiation before wallet_sendCalls. ERC-4337 middleware appends one suffix to the final userOp.callData. The Smart Wallet Attribution Kit fails closed by default and defines explicit fallback behavior.",
        ],
        code: 'import { sendAttributedCalls } from "@base-attribution-os/wallet";\n\nawait sendAttributedCalls(provider, request, { codes: ["bc_abc123"] });',
        links: [{ label: "Read the smart wallet guide", href: "/smart-wallets" }],
      },
      {
        id: "other-paths",
        title: "Privy, RPC, x402, and agents",
        paragraphs: [
          "Doctor recognizes supported attribution patterns around Privy transactions, raw eth_sendTransaction calls, x402 Builder Code extensions, and agent transaction tools. Use the pattern that matches the actual send path. A helper elsewhere in the file does not establish coverage for every call.",
        ],
        links: [
          { label: "Browse maintained integration examples", href: repo + "docs/integrations.md" },
          { label: "Audit your transaction paths", href: "/docs/source-audits" },
        ],
      },
    ],
  },
  {
    slug: "source-audits",
    title: "Audit your transaction paths",
    description:
      "Find missing, wrong, or unresolved Builder Code evidence in supported TypeScript source.",
    source: "docs/attribution-doctor.md",
    sections: [
      {
        id: "run",
        title: "Run Attribution Doctor",
        paragraphs: [
          "The AST-backed analyzer identifies supported call sites and connects them to nearby or project-level attribution evidence. It reports paths, protected paths, coverage, and findings. It does not execute application code.",
        ],
        code: "pnpm exec bao init --builder-code bc_abc123\npnpm exec bao doctor",
      },
      {
        id: "profiles",
        title: "Choose a profile deliberately",
        paragraphs: [
          "The ci profile reports environment-driven evidence as an unresolved warning. strict treats unresolved evidence as an error. Keep the profile and severity rules in your project policy so your team reviews the same result.",
        ],
        code: "pnpm exec bao doctor --profile strict",
      },
      {
        id: "formats",
        title: "Use the output where you work",
        paragraphs: [
          "Human output suits local inspection. JSON provides automation data. SARIF can be uploaded to GitHub Code Scanning. Use a new output path for artifacts you intend to retain.",
        ],
        code: "pnpm exec bao doctor --format human\npnpm exec bao doctor --format json\npnpm exec bao doctor --format sarif --output bao.sarif",
      },
      {
        id: "scope",
        title: "Read the scope with the finding",
        paragraphs: [
          "Supported families include viem, wagmi, ethers, Privy, raw RPC, EIP-5792, ERC-4337, x402, and agent transaction tools. Coverage describes supported paths in the supplied source. It does not establish runtime behavior or coverage over code the analyzer did not inspect.",
        ],
        links: [
          { label: "Preview an illustrative snippet", href: "/doctor" },
          { label: "Add checks to pull requests", href: "/docs/ci" },
          { label: "Browse the dashboard’s published snapshots", href: "/dashboard" },
        ],
      },
    ],
  },
  {
    slug: "ci",
    title: "Enforce the project policy in CI",
    description:
      "Run a full-project attribution check in pull requests and inspect the resulting findings.",
    source: "docs/ci-validation.md",
    sections: [
      {
        id: "policy",
        title: "Start with a local passing policy",
        paragraphs: [
          "Run Doctor locally, fix the supported paths, and commit bao.config.json. Use your own registered Builder Code in the workflow. Keep attribution checks alongside your existing tests.",
        ],
        code: "pnpm exec bao doctor --profile strict",
      },
      {
        id: "workflow",
        title: "Add the released attribution Action",
        paragraphs: [
          "Save this workflow as .github/workflows/validate-attribution.yml. It checks the full project rather than only changed files. v0.5.0 is the repository’s documented released Action reference; B20 is a separate unreleased candidate workflow.",
        ],
        code: 'name: Validate Attribution\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  attribution:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6\n        with:\n          fetch-depth: 0\n      - uses: horn111/base-attribution-os/packages/github-action@v0.5.0\n        with:\n          builder-code: bc_abc123\n          profile: strict\n          changed-only: "false"\n          fail-on-missing: "true"',
      },
      {
        id: "review",
        title: "Review paths, not just a percentage",
        paragraphs: [
          "The Action produces annotations, a job summary, outputs, and optional SARIF. Inspect missing, wrong-code, and unresolved findings. Changed-only checks and baselines are available, but their scope must remain explicit when making a merge decision.",
        ],
        links: [
          {
            label: "Action inputs and SARIF setup",
            href: repo + "packages/github-action/README.md",
          },
          { label: "Source-audit guide", href: "/docs/source-audits" },
        ],
      },
    ],
  },
  {
    slug: "transaction-proofs",
    title: "Verify and retain transaction evidence",
    description:
      "Replay a supplied transaction sample and combine results into an inspectable Proof Set.",
    source: "docs/attribution-proof-loop.md",
    sections: [
      {
        id: "sample",
        title: "Define what you are checking",
        paragraphs: [
          "Coverage uses every supplied transaction as the denominator. Include transactions expected to carry the code, including omissions. Filtering a dataset only by the expected Builder Code hides the gaps. The site’s public registry contains selected snapshots, with no hosted ingestion or runtime RPC requests.",
        ],
        links: [{ label: "Browse the published Observatory", href: "/observatory" }],
      },
      {
        id: "replay",
        title: "Replay the published BAO example",
        paragraphs: [
          "This command reads a public Base mainnet transaction for BAO’s own code. It requires network access to the public RPC. Use it as a reproducible example; do not use BAO’s Builder Code for your own app.",
        ],
        code: "pnpm exec bao replay \\\n  --builder-code bc_vwmzy653 \\\n  --hashes 0x6573344cfb346c886806804fb8f8b6cc510c30d7974a1a69c11452a5f8fe4926 \\\n  --chain-id 8453 \\\n  --rpc-url https://mainnet.base.org \\\n  --format json \\\n  --output bao-replay.json",
        links: [{ label: "Inspect the registered BAO Proof Set", href: "/proof/bc_vwmzy653" }],
      },
      {
        id: "combine",
        title: "Combine reports into a Proof Set",
        paragraphs: [
          "Use reports for the same Builder Code. BAO re-decodes calldata and recalculates statuses and counters. Conflicting evidence fails validation. A passing set requires every unique transaction to be RPC verified and attributed to the expected code.",
        ],
        code: 'pnpm exec bao proof-set \\\n  --builder-code bc_vwmzy653 \\\n  --title "BAO example" \\\n  --input bao-replay.json \\\n  --output bao-proof-set.json',
      },
      {
        id: "publish",
        title: "Choose the public evidence",
        paragraphs: [
          "Share only artifacts you intend to make public. Public reports can include transaction hashes, public calldata, decoded codes, timestamps, network metadata, and explorer links. Retain acquisition context and scope. Keep RPC credentials, private keys, and private application data out of reports.",
        ],
        links: [
          {
            label: "Full replay input and status reference",
            href: repo + "docs/attribution-proof-loop.md",
          },
          { label: "B20 evidence and candidate reproduction", href: "/b20/guide" },
        ],
      },
    ],
  },
];
export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}
