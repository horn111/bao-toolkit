"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./pixel-construction.css";

type ConstructionVariant = "workshop" | "tower";
type Input = { x: number; y: number; active: boolean; revision: number; changedAt: number };
type Painter = ReturnType<typeof createPainter>;

const PALETTE = {
  outline: "#092f33",
  shadow: "#105054",
  stone: "#24776f",
  teal: "#3e9d89",
  mint: "#80d2b5",
  light: "#c8f2db",
  window: "#b69861",
  glow: "#f4d897",
  dark: "#001b20",
};

// The backing canvas is the sprite: every mark is an integer-sized pixel cluster.
// CSS enlarges it with nearest-neighbour sampling, never a shaded cube projection.
function createPainter(context: CanvasRenderingContext2D, input: Input, time: number) {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const line = (x0: number, y0: number, x1: number, y1: number, color: string) => {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const endX = Math.round(x1);
    const endY = Math.round(y1);
    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1;
    const sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      rect(x, y, 1, 1, color);
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) {
        error += dy;
        x += sx;
      }
      if (twice <= dx) {
        error += dx;
        y += sy;
      }
    }
  };
  const texture = (x: number, y: number, w: number, h: number, seed: number) => {
    for (let py = y + 2; py < y + h - 1; py += 3) {
      for (let px = x + 1; px < x + w - 1; px += 2) {
        const hash = ((px * 19 + py * 37 + seed * 17) ^ (px * py)) % 17;
        if (hash < 3)
          rect(px, py, hash === 0 ? 2 : 1, 1, hash === 0 ? PALETTE.mint : PALETTE.shadow);
      }
    }
  };
  const window = (x: number, y: number, w = 3, h = 5, seed = 0) => {
    const nearby = input.active && Math.hypot(x - input.x, y - input.y) < 23;
    const pulse = time - input.changedAt < 900;
    const lit = nearby || (pulse && (Math.floor((time - input.changedAt) / 110) + seed) % 4 < 2);
    rect(x - 1, y - 1, w + 2, h + 2, PALETTE.outline);
    rect(x, y, w, h, lit ? PALETTE.glow : seed % 3 === 0 ? PALETTE.window : PALETTE.shadow);
    rect(x, y, 1, h, lit ? PALETTE.light : PALETTE.teal);
    rect(x - 1, y + h, w + 2, 1, PALETTE.mint);
  };
  const wall = (x: number, y: number, w: number, h: number) => {
    rect(x - 1, y - 1, w + 2, h + 2, PALETTE.outline);
    rect(x, y, w, h, PALETTE.stone);
    rect(x, y, 2, h, PALETTE.mint);
    rect(x + w - 3, y, 3, h, PALETTE.shadow);
    texture(x + 3, y + 1, w - 6, h - 2, x);
    rect(x - 2, y - 2, w + 4, 2, PALETTE.mint);
    rect(x - 2, y - 2, w + 1, 1, PALETTE.light);
  };
  return { rect, line, texture, window, wall };
}

function drawWorkshop(p: Painter, revision: number) {
  const { rect, line, window, wall } = p;
  // A front-facing construction yard, with a lattice crane and an unfinished roof.
  rect(17, 102, 152, 2, PALETTE.shadow);
  rect(26, 100, 126, 2, PALETTE.teal);
  rect(26, 103, 10, 2, PALETTE.outline);
  rect(143, 103, 12, 2, PALETTE.outline);
  const roof = 44 - revision * 9;
  wall(77, roof, 67, 57 + revision * 9);
  rect(79, roof + 2, 4, 57 + revision * 9, PALETTE.teal);
  for (let y = roof + 10; y < 87; y += 11) {
    for (let x = 87; x < 136; x += 10) window(x, y, 4, 6, (x + y) % 7);
    rect(77, y + 8, 65, 1, PALETTE.shadow);
    rect(77, y + 9, 65, 1, PALETTE.teal);
  }
  rect(102, 86, 17, 15, PALETTE.outline);
  rect(105, 87, 11, 14, PALETTE.shadow);
  rect(109, 89, 3, 12, PALETTE.window);
  rect(99, 100, 23, 2, PALETTE.mint);
  rect(97, 102, 27, 1, PALETTE.teal);
  // Tall roof ribs expose the part currently being built.
  for (let x = 80; x < 142; x += 15) {
    rect(x, roof - 9, 2, 8, PALETTE.mint);
    rect(x + 2, roof - 8, 1, 7, PALETTE.shadow);
  }
  rect(80, roof - 9, 62, 1, PALETTE.teal);
  rect(80, roof - 5, 62, 1, PALETTE.shadow);
  rect(129, roof - 8, 7, 6, PALETTE.teal);
  rect(129, roof - 8, 7, 1, PALETTE.light);
  rect(147, 54, 6, 46, PALETTE.outline);
  rect(148, 55, 2, 44, PALETTE.mint);
  for (let y = 57; y < 99; y += 5) rect(148, y, 6, 1, PALETTE.teal);
  // Crane: stepped raster diagonals remain visibly individual pixels.
  rect(40, 18, 3, 82, PALETTE.mint);
  rect(49, 18, 2, 82, PALETTE.teal);
  for (let y = 22; y < 98; y += 9) {
    rect(40, y, 11, 1, PALETTE.teal);
    line(43, y, 48, y + 8, PALETTE.stone);
    line(48, y, 43, y + 8, PALETTE.shadow);
  }
  rect(32, 98, 28, 3, PALETTE.stone);
  rect(35, 96, 22, 2, PALETTE.mint);
  rect(22, 17, 130, 3, PALETTE.teal);
  rect(22, 17, 130, 1, PALETTE.light);
  rect(40, 8, 2, 9, PALETTE.mint);
  line(42, 8, 145, 16, PALETTE.stone);
  line(39, 8, 25, 16, PALETTE.mint);
  rect(22, 21, 14, 7, PALETTE.shadow);
  rect(22, 21, 14, 1, PALETTE.teal);
  rect(34, 23, 12, 9, PALETTE.teal);
  rect(35, 24, 7, 5, PALETTE.dark);
  rect(35, 24, 2, 5, PALETTE.mint);
  rect(144, 20, 1, 18, PALETTE.mint);
  rect(142, 37, 3, 3, PALETTE.window);
  line(143, 40, 137, 43, PALETTE.teal);
  line(144, 40, 151, 43, PALETTE.teal);
  rect(134, 44, 21, 3, PALETTE.mint);
  // Spare masonry and a tiny site light read as props, not another platform.
  rect(60, 94, 11, 6, PALETTE.stone);
  rect(61, 93, 9, 2, PALETTE.mint);
  rect(65, 96, 1, 4, PALETTE.shadow);
  rect(163, 89, 1, 13, PALETTE.teal);
  rect(160, 88, 7, 2, PALETTE.mint);
  rect(161, 90, 5, 1, PALETTE.window);
}

function drawTower(p: Painter, revision: number, time: number, changedAt: number, height: number) {
  const { rect, line, wall, window } = p;
  // Add real pixel floors as the column grows; the beacon and doorway retain their proportions.
  const ground = height - 5;
  rect(15, ground, 50, 2, PALETTE.shadow);
  rect(22, ground - 3, 36, 3, PALETTE.teal);
  rect(27, ground - 8, 26, 5, PALETTE.mint);
  wall(31, 62, 18, ground - 70);
  rect(30, 72, 3, ground - 80, PALETTE.mint);
  rect(48, 72, 3, ground - 80, PALETTE.shadow);
  for (let y = 73; y < ground - 20; y += 10) {
    window(36, y, 2, 5, y + revision);
    window(43, y, 2, 5, y + 1 + revision);
    rect(30, y + 7, 20, 1, PALETTE.teal);
    rect(33, y + 8, 14, 1, PALETTE.outline);
  }
  rect(28, ground - 15, 24, 2, PALETTE.mint);
  rect(37, ground - 15, 7, 11, PALETTE.outline);
  rect(39, ground - 13, 3, 9, PALETTE.window);
  rect(35, ground - 4, 11, 2, PALETTE.light);
  // An inhabited observation deck and a braced antenna above the narrow shaft.
  rect(27, 55, 26, 8, PALETTE.stone);
  rect(24, 49, 32, 6, PALETTE.shadow);
  rect(24, 48, 32, 2, PALETTE.mint);
  rect(27, 56, 26, 1, PALETTE.light);
  for (let x = 28; x < 51; x += 5) window(x, 50, 2, 4, x + revision);
  rect(28, 44, 24, 3, PALETTE.teal);
  rect(32, 40, 16, 4, PALETTE.mint);
  rect(35, 35, 10, 5, PALETTE.teal);
  rect(37, 19, 2, 16, PALETTE.mint);
  rect(42, 19, 1, 16, PALETTE.teal);
  line(39, 21, 41, 26, PALETTE.stone);
  line(41, 27, 39, 32, PALETTE.stone);
  rect(39, 8, 2, 12, PALETTE.light);
  rect(37, 16, 7, 1, PALETTE.teal);
  rect(38, 7, 4, 2, PALETTE.glow);
  rect(37, 19, 7, 2, PALETTE.mint);
  // Antennas are part of the architecture; no radiating lines are painted in the background.
  const leftAntenna = Math.round(ground * 0.57);
  const rightAntenna = Math.round(ground * 0.74);
  rect(20, leftAntenna, 11, 2, PALETTE.teal);
  rect(20, leftAntenna - 7, 2, 7, PALETTE.mint);
  rect(19, leftAntenna - 10, 4, 3, PALETTE.light);
  rect(49, rightAntenna, 11, 2, PALETTE.teal);
  rect(58, rightAntenna - 10, 2, 10, PALETTE.mint);
  rect(57, rightAntenna - 13, 4, 3, PALETTE.window);
  rect(54, ground - 13, 7, 11, PALETTE.shadow);
  rect(54, ground - 14, 7, 2, PALETTE.teal);
  rect(19, ground - 8, 6, 6, PALETTE.stone);
  rect(19, ground - 9, 6, 1, PALETTE.mint);
  if (time - changedAt < 900) {
    const y = ground - 20 - Math.floor(((time - changedAt) / 900) * (ground - 49));
    rect(39, Math.max(31, y), 2, 6, PALETTE.light);
  }
}

const SCENES = {
  workshop: {
    width: 184,
    height: 112,
    states: 3,
    action: "Add a floor to the pixel workshop",
  },
  tower: {
    width: 80,
    height: 256,
    states: 4,
    action: "Send a signal up the pixel tower",
  },
} as const;

export function PixelConstruction({ variant }: { variant: ConstructionVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const inputRef = useRef<Input>({
    x: -1000,
    y: -1000,
    active: false,
    revision: 0,
    changedAt: -Infinity,
  });
  const [revision, setRevision] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const scene = SCENES[variant];

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.imageSmoothingEnabled = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;
    let stopped = false;
    const draw = (time: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const input = inputRef.current;
      // Reduced motion keeps the newly selected lights, without a moving scan.
      const paintTime = motion.matches ? input.changedAt + 450 : time;
      const painter = createPainter(context, input, paintTime);
      if (variant === "workshop") drawWorkshop(painter, input.revision);
      else drawTower(painter, input.revision, paintTime, input.changedAt, canvas.height);
    };
    const animate = (time: number) => {
      frame = 0;
      draw(time);
      if (!motion.matches && time - inputRef.current.changedAt < 900) requestRender();
    };
    const requestRender = () => {
      if (!stopped && visible && !document.hidden && !frame) frame = requestAnimationFrame(animate);
    };
    const updatePlayback = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      requestRender();
    };
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        updatePlayback();
      },
      { threshold: 0.01 },
    );
    const resize = () => {
      if (variant === "tower") {
        // Three display pixels per source pixel at every viewport, with extra facade rows.
        canvas.height = Math.max(164, Math.round(canvas.clientHeight / 3));
        context.imageSmoothingEnabled = false;
      }
      draw(performance.now());
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    requestRenderRef.current = requestRender;
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", updatePlayback);
    motion.addEventListener("change", updatePlayback);
    draw(performance.now());
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      motion.removeEventListener("change", updatePlayback);
      requestRenderRef.current = () => {};
    };
  }, [variant]);

  const movePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    inputRef.current.x = ((event.clientX - bounds.left) / bounds.width) * scene.width;
    inputRef.current.y =
      ((event.clientY - bounds.top) / bounds.height) * (canvasRef.current?.height ?? scene.height);
    inputRef.current.active = true;
    requestRenderRef.current();
  };
  const activate = () => {
    const next = (inputRef.current.revision + 1) % scene.states;
    inputRef.current.revision = next;
    inputRef.current.changedAt = performance.now();
    setRevision(next);
    setAnnouncement(
      variant === "workshop"
        ? `Workshop ${next === 0 ? "rebuilt with" : "now has"} ${4 + next} floors.`
        : `Signal ${next + 1} sent to the tower beacon.`,
    );
    requestRenderRef.current();
  };

  return (
    <figure className={`pixel-construction pixel-construction--${variant}`}>
      <button
        type="button"
        className="pixel-construction-scene"
        aria-label={scene.action}
        onPointerMove={movePointer}
        onPointerLeave={() => {
          inputRef.current.active = false;
          requestRenderRef.current();
        }}
        onClick={activate}
        data-construction-step={revision}
      >
        <canvas ref={canvasRef} width={scene.width} height={scene.height} aria-hidden="true" />
      </button>
      <span className="pixel-construction-status" role="status">
        {announcement}
      </span>
    </figure>
  );
}
