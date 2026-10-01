export function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}
export function ModuleIcon({ kind }: { kind: "attribution" | "audit" | "b20" | "proof" }) {
  const paths = {
    attribution:
      "M12 2 6 5v7l6 3 6-3V5l-6-3ZM6 5l6 3 6-3M12 8v7M6 12l-5 3v5l5 3 6-3v-5M18 12l5 3v5l-5 3-6-3M1 15l5 3 6-3M18 18v5M6 18v5M18 18l5-3-5-3",
    audit: "M4 2h11l5 5v15H4V2Zm11 0v5h5M8 11h8M8 15h8M8 19h5",
    b20: "M12 2 2 6v6c0 5 5 8 10 11 5-3 10-6 10-11V6L12 2ZM8 11h8m-4-4v8",
    proof: "M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10M8 7l4-2 4 2-4 2-4-2Z",
  };
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="miter"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      width="44"
      height="52"
      viewBox="0 0 44 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 1h30l11 11v39H1V1Zm30 0v11h11M11 21l7 7-7 7m12 0h10" />
    </svg>
  );
}
export function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="m4 12 5 5 11-11" />
    </svg>
  );
}
