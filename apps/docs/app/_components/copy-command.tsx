"use client";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./site-icons";
export function CopyCommand({ command, className = "" }: { command: string; className?: string }) {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setStatus("Copied");
    } catch {
      setStatus("Select the command to copy it manually");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 3000);
  }
  return (
    <div
      className={`command-copy ${command.includes("\n") ? "command-multiline" : ""} ${className}`}
    >
      <code>{command}</code>
      <button
        type="button"
        aria-label="Copy command"
        title="Copy command"
        onClick={() => void copy()}
      >
        {status === "Copied" ? (
          <CheckIcon />
        ) : (
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M8 8h12v13H8V8ZM4 16H2V2h13v2M12 12h4m-4 4h4" />
          </svg>
        )}
      </button>
      <span className="copy-feedback" role="status">
        {status}
      </span>
    </div>
  );
}
