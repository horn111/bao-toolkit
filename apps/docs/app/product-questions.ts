export const productQuestions = [
  {
    id: "what-is-bao",
    question: "What is BAO Toolkit?",
    answer:
      "BAO Toolkit is an independent, open-source TypeScript toolkit for developers building on Base. It combines ERC-8021 Builder Code attribution, source audits, CI policy checks, B20 token evidence, app activity tools, and reproducible transaction Proof Sets. It is MIT licensed and is not affiliated with Base or Coinbase.",
    href: "/docs",
    linkLabel: "Explore the documentation",
  },
  {
    id: "add-builder-code",
    question: "How do I add a Builder Code to my Base app?",
    answer:
      "Register your project's Builder Code on Base Dashboard, then use a BAO Toolkit adapter for viem, wagmi, or ethers to append ERC-8021 attribution to transaction calldata. Smart wallet integrations also cover capability-aware EIP-5792 batches and ERC-4337 UserOperations. Keep the same code in your app and bao.config.json policy.",
    href: "/docs/quickstart",
    linkLabel: "Follow the installation and integration steps",
  },
  {
    id: "doctor-scope",
    question: "What does Attribution Doctor check?",
    answer:
      "The bao doctor CLI scans supported TypeScript transaction paths for Builder Code attribution gaps. Use the same policy in local checks and GitHub Actions to catch regressions. The browser Doctor demonstrates example snippets; a full-project scan runs locally or in CI. A source audit checks code paths, while transaction replay checks supplied onchain evidence.",
    href: "/docs/source-audits",
    linkLabel: "Read the source-audit scope and commands",
  },
  {
    id: "b20-evidence",
    question: "What can I inspect with the B20 tools?",
    answer:
      "BAO Toolkit's B20 tools inspect token initialization evidence, replay supplied transaction samples, and check Builder Code attribution. The site separates synthetic examples from recorded network observations and publishes report inputs and limitations. These checks do not establish token safety or application readiness; follow the B20 guide for the current installation and reproduction workflow.",
    href: "/b20/guide",
    linkLabel: "Read the B20 inspection and replay guide",
  },
  {
    id: "proof-set-scope",
    question: "Does a Proof Set cover every transaction from an app?",
    answer:
      "No. A published Proof Set covers only the supplied transaction sample. BAO Toolkit decodes ERC-8021 calldata, checks the expected Builder Code, and retains reproducible reports. Complete activity analysis needs an indexed dataset with a stated time range. A passing snapshot does not establish complete project coverage or future attribution correctness.",
    href: "/docs/transaction-proofs",
    linkLabel: "See how to reproduce transaction evidence",
  },
  {
    id: "attribution-vs-referrals",
    question: "Do Builder Codes identify which tweet brought a user?",
    answer:
      "No. Builder Codes identify projects in transaction calldata. They do not identify a referring tweet, ad, or visitor session. BAO Toolkit helps preserve and verify that project-level attribution; campaign attribution requires separate referral or analytics data.",
    href: "/docs/attribution",
    linkLabel: "Understand Builder Code attribution",
  },
];
