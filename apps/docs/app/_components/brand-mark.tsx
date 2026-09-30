export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 48 60"
      width="35"
      height="45"
      shapeRendering="crispEdges"
    >
      <path
        fill="currentColor"
        d="M0 0h34v12H20v12H7v12h13v12h14v12H0Z M34 12h14v12H34Z M20 24h14v12H20Z M34 36h14v12H34Z"
      />
    </svg>
  );
}
