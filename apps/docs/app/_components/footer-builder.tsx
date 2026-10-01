"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  BUILDER_BLOCK_HEIGHT,
  BUILDER_BLOCK_WIDTH,
  BUILDER_BUCKET_REACH,
  BUILDER_BUILDING_X,
  BUILDER_COLUMNS,
  BUILDER_CUBE_SIZE,
  BUILDER_GROUND_Y,
  BUILDER_LIFT_STEP,
  BUILDER_ROWS,
  BUILDER_TOTAL_BLOCKS,
  BUILDER_WORLD_HEIGHT,
  BUILDER_WORLD_WIDTH,
  advanceBuilderPhysics,
  builderNeedsPhysics,
  createBuilderState,
  getBuilderBlock,
  getBuilderBucketPosition,
  getCarriedBuilderCube,
  getNextBuilderBlock,
  liftBuilderBucket,
  moveBuilder,
  operateBuilderBucket,
  turnBuilder,
  type BuilderState,
} from "./footer-builder-state";
import "./footer-builder.css";

type Motion = { axis: "drive" | "lift"; direction: -1 | 1 };
type WorkshopEngine = {
  keyDown: (key: string) => void;
  keyUp: (key: string) => void;
  hold: (motion: Motion | null) => void;
  step: (motion: Motion) => void;
  operate: () => void;
  turn: () => void;
  reset: () => void;
  release: () => void;
};
type WorkshopReadout = {
  built: number;
  bucket: "open" | "closed" | "loaded";
  falling: boolean;
  message: string;
};

const MOTIONS: Record<string, Motion> = {
  ArrowLeft: { axis: "drive", direction: -1 },
  a: { axis: "drive", direction: -1 },
  ArrowRight: { axis: "drive", direction: 1 },
  d: { axis: "drive", direction: 1 },
  ArrowUp: { axis: "lift", direction: 1 },
  w: { axis: "lift", direction: 1 },
  ArrowDown: { axis: "lift", direction: -1 },
  s: { axis: "lift", direction: -1 },
};
const INITIAL_MESSAGE = "Lower onto the front cube, then Scoop.";
const COLORS = {
  ink: "#001619",
  dark: "#053637",
  beam: "#0c5757",
  teal: "#107977",
  accent: "#27d8c9",
  soft: "#83dedb",
  white: "#e0f8f7",
  yellow: "#ffd369",
  ochre: "#bd872e",
};

function readWorkshop(state: BuilderState, message: string): WorkshopReadout {
  return {
    built: state.delivered.length,
    bucket: state.carriedId !== null ? "loaded" : state.bucketOpen ? "open" : "closed",
    falling: state.falling !== null,
    message,
  };
}

function ControlIcon({
  name,
}: {
  name: "left" | "right" | "up" | "down" | "bucket" | "turn" | "reset";
}) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      {name === "left" && <path d="M16 10H4m5-5-5 5 5 5" />}
      {name === "right" && <path d="M4 10h12m-5-5 5 5-5 5" />}
      {name === "up" && <path d="M10 16V4m-5 5 5-5 5 5" />}
      {name === "down" && <path d="M10 4v12m-5-5 5 5 5-5" />}
      {name === "bucket" && <path d="M3 3v5l3 8h10l2-5H9L6 6V3M6 16v2m5-2v2m5-2v2" />}
      {name === "turn" && <path d="M3 6h14m-4-4 4 4-4 4M17 14H3m4-4-4 4 4 4" />}
      {name === "reset" && <path d="M16 7a6 6 0 1 0 0 6M16 3v4h-4" />}
    </svg>
  );
}

export function FooterBuilder() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorkshopEngine | null>(null);
  const [readout, setReadout] = useState(() => readWorkshop(createBuilderState(), INITIAL_MESSAGE));
  const id = useId();

  useEffect(() => {
    const root = stage.current;
    const output = canvas.current;
    const context = output?.getContext("2d");
    if (!root || !output || !context) return;
    const ctx = context;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let state = createBuilderState();
    let disposed = false;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let distanceDriven = 0;
    let pointerMotion: Motion | null = null;
    let pointerPressedAt = 0;
    let bucketTurnedAt = 0;
    let completedAt = 0;
    let lastMessage = INITIAL_MESSAGE;
    const keys = new Set<string>();
    const keyPressedAt = new Map<string, number>();

    function announce(message: string) {
      lastMessage = message;
      setReadout(readWorkshop(state, message));
    }

    function rect(x: number, y: number, width: number, height: number, color: string) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }

    function polygon(points: number[][], color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(Math.round(x!), Math.round(y!));
        else ctx.lineTo(Math.round(x!), Math.round(y!));
      });
      ctx.closePath();
      ctx.fill();
    }

    function bar(ax: number, ay: number, bx: number, by: number, width: number, color: string) {
      const length = Math.max(1, Math.hypot(bx - ax, by - ay));
      const nx = ((-(by - ay) / length) * width) / 2;
      const ny = (((bx - ax) / length) * width) / 2;
      polygon(
        [
          [ax + nx, ay + ny],
          [bx + nx, by + ny],
          [bx - nx, by - ny],
          [ax - nx, ay - ny],
        ],
        color,
      );
    }

    function drawCube(x: number, y: number, size = BUILDER_CUBE_SIZE) {
      const half = size / 2;
      rect(x - half, y - half, size, size, COLORS.teal);
      rect(x - half, y - half, size - 3, size - 3, COLORS.accent);
      rect(x - half + 2, y - half + 2, size - 6, 2, COLORS.white);
      rect(x + half - 5, y - half + 5, 2, size - 10, COLORS.soft);
    }

    function drawBuilding(now: number) {
      const width = BUILDER_COLUMNS * BUILDER_BLOCK_WIDTH;
      const top = BUILDER_GROUND_Y - BUILDER_ROWS * BUILDER_BLOCK_HEIGHT;
      rect(BUILDER_BUILDING_X - 9, BUILDER_GROUND_Y, width + 18, 6, COLORS.teal);
      rect(BUILDER_BUILDING_X - 9, BUILDER_GROUND_Y, width + 18, 2, COLORS.soft);
      ctx.strokeStyle = COLORS.beam;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.strokeRect(BUILDER_BUILDING_X, top + 1, width, BUILDER_ROWS * BUILDER_BLOCK_HEIGHT - 1);
      ctx.setLineDash([]);
      for (let index = 0; index < state.delivered.length; index++) {
        const block = getBuilderBlock(index);
        const color =
          block.row === BUILDER_ROWS - 1
            ? COLORS.accent
            : block.row % 2
              ? COLORS.teal
              : COLORS.soft;
        rect(block.x + 1, block.y + 1, 30, 26, color);
        rect(block.x + 2, block.y + 2, 28, 2, COLORS.soft);
        if (block.row < 3) {
          const door = block.row === 0 && (block.column === 1 || block.column === 2);
          rect(block.x + 8, block.y + 8, 16, door ? 20 : 14, COLORS.ink);
          if (door)
            rect(block.x + (block.column === 1 ? 20 : 10), block.y + 19, 2, 2, COLORS.yellow);
          else {
            rect(block.x + 9, block.y + 9, 5, 11, COLORS.beam);
            rect(block.x + 17, block.y + 9, 5, 11, COLORS.teal);
            rect(block.x + 8, block.y + 14, 16, 1, color);
          }
        }
      }
      const target = getNextBuilderBlock(state);
      if (target) {
        for (const dx of [0, 25]) {
          rect(target.x + dx, target.y, 7, 2, COLORS.yellow);
          rect(target.x + dx, target.y + 26, 7, 2, COLORS.yellow);
        }
        for (const dx of [0, 30]) {
          rect(target.x + dx, target.y, 2, 7, COLORS.yellow);
          rect(target.x + dx, target.y + 21, 2, 7, COLORS.yellow);
        }
        const center = target.x + BUILDER_BLOCK_WIDTH / 2;
        polygon(
          [
            [center - 5, BUILDER_GROUND_Y + 17],
            [center + 5, BUILDER_GROUND_Y + 17],
            [center, BUILDER_GROUND_Y + 10],
          ],
          COLORS.yellow,
        );
      } else {
        rect(BUILDER_BUILDING_X - 3, top - 4, width + 6, 5, COLORS.soft);
        const rise = reduced.matches ? 1 : Math.min(1, (now - completedAt) / 450);
        rect(BUILDER_BUILDING_X + width - 12, top - 27, 2, 27, COLORS.soft);
        rect(BUILDER_BUILDING_X + width - 10, top - 7 - 20 * rise, 19, 10, COLORS.accent);
      }
      // The flag marks the receiving foundation, not a decorative background element.
      rect(BUILDER_BUILDING_X + width + 22, BUILDER_GROUND_Y - 51, 2, 51, COLORS.soft);
      rect(BUILDER_BUILDING_X + width + 24, BUILDER_GROUND_Y - 50, 19, 12, COLORS.yellow);
      rect(BUILDER_BUILDING_X + width + 27, BUILDER_GROUND_Y - 46, 10, 2, COLORS.ink);
    }

    function drawSupply() {
      // Reserve cubes wait on a rack; only the loose front cube can be scooped.
      for (let index = 0; index < state.reserve.length; index++) {
        const column = index % 5;
        const row = Math.floor(index / 5);
        drawCube(47 + column * 25, BUILDER_GROUND_Y - 12 - row * 25);
      }
      rect(32, BUILDER_GROUND_Y, 127, 5, COLORS.beam);
      rect(38, BUILDER_GROUND_Y + 5, 9, 4, COLORS.dark);
      rect(144, BUILDER_GROUND_Y + 5, 9, 4, COLORS.dark);
      for (const cube of state.looseCubes) drawCube(cube.x, cube.y);
    }

    function drawExcavator(now: number) {
      const x = Math.round(state.machineX);
      const floor = BUILDER_GROUND_Y;
      ctx.save();
      ctx.translate(state.facing === -1 ? x * 2 : 0, 0);
      ctx.scale(state.facing, 1);
      rect(x - 42, floor - 18, 84, 15, COLORS.dark);
      rect(x - 38, floor - 21, 76, 21, COLORS.teal);
      rect(x - 35, floor - 18, 70, 15, COLORS.ink);
      for (const wheelX of [-26, -8, 10, 27]) {
        rect(x + wheelX - 5, floor - 14, 10, 10, COLORS.beam);
        rect(x + wheelX - 2, floor - 11, 4, 4, COLORS.soft);
      }
      const treadShift = Math.floor(distanceDriven / 5) % 8;
      for (let treadX = -35; treadX < 34; treadX += 8) {
        rect(x + treadX + (treadShift % 4), floor - 21, 4, 3, COLORS.soft);
        rect(x + treadX - (treadShift % 4), floor - 3, 4, 3, COLORS.soft);
      }
      rect(x - 13, floor - 30, 31, 9, COLORS.beam);
      rect(x - 37, floor - 50, 78, 23, COLORS.ochre);
      rect(x - 36, floor - 51, 75, 20, COLORS.yellow);
      rect(x - 35, floor - 51, 21, 6, COLORS.white);
      rect(x - 31, floor - 42, 16, 2, COLORS.ochre);
      rect(x - 31, floor - 37, 16, 2, COLORS.ochre);
      rect(x - 6, floor - 84, 40, 37, COLORS.ochre);
      rect(x - 6, floor - 86, 41, 5, COLORS.yellow);
      rect(x - 2, floor - 79, 31, 26, COLORS.ink);
      rect(x + 1, floor - 77, 22, 20, COLORS.teal);
      rect(x + 3, floor - 76, 18, 3, COLORS.soft);
      rect(x + 24, floor - 80, 4, 28, COLORS.yellow);
      rect(x + 2, floor - 52, 28, 5, COLORS.yellow);
      rect(x + 6, floor - 67, 5, 6, COLORS.soft);
      rect(x + 5, floor - 60, 8, 9, COLORS.beam);
      bar(x + 16, floor - 56, x + 24, floor - 64, 2, COLORS.soft);
      rect(x - 26, floor - 64, 5, 13, COLORS.beam);
      rect(x - 28, floor - 66, 8, 3, COLORS.teal);

      const bucket = { x: x + BUILDER_BUCKET_REACH, y: getBuilderBucketPosition(state).y };
      const pivot = { x: x + 34, y: floor - 59 };
      const wrist = { x: bucket.x - 11, y: bucket.y - 13 };
      const dx = wrist.x - pivot.x;
      const dy = wrist.y - pivot.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const along = (78 ** 2 - 73 ** 2 + length ** 2) / (2 * length);
      const height = Math.sqrt(Math.max(0, 78 ** 2 - along ** 2));
      const elbow = {
        x: pivot.x + (dx * along) / length + (dy * height) / length,
        y: pivot.y + (dy * along) / length - (dx * height) / length,
      };
      bar(pivot.x, pivot.y, elbow.x, elbow.y, 16, COLORS.ochre);
      bar(pivot.x - 2, pivot.y - 2, elbow.x - 2, elbow.y - 2, 11, COLORS.yellow);
      bar(elbow.x, elbow.y, wrist.x, wrist.y, 13, COLORS.ochre);
      bar(elbow.x - 1, elbow.y - 1, wrist.x - 1, wrist.y - 1, 8, COLORS.yellow);
      bar(pivot.x - 10, pivot.y - 6, elbow.x - 10, elbow.y + 10, 5, COLORS.teal);
      bar(elbow.x + 5, elbow.y + 10, wrist.x - 7, wrist.y - 5, 3, COLORS.soft);
      for (const joint of [pivot, elbow, wrist]) {
        rect(joint.x - 5, joint.y - 5, 10, 10, COLORS.ochre);
        rect(joint.x - 2, joint.y - 2, 4, 4, COLORS.ink);
      }
      const carried = getCarriedBuilderCube(state);
      if (carried) drawCube(bucket.x, carried.y, BUILDER_CUBE_SIZE);
      const curlElapsed = Math.min(1, (now - bucketTurnedAt) / 180);
      const curl = reduced.matches ? 1 : curlElapsed;
      const rimY = state.bucketOpen ? bucket.y + 10 : bucket.y + 10 - 3 * curl;
      polygon(
        [
          [bucket.x - 16, bucket.y - 15],
          [bucket.x - 9, bucket.y - 15],
          [bucket.x - 6, rimY - 3],
          [bucket.x + 13, rimY - 3],
          [bucket.x + 20, state.bucketOpen ? bucket.y - 1 : bucket.y - 11],
          [bucket.x + 23, state.bucketOpen ? bucket.y + 2 : bucket.y - 6],
          [bucket.x + 17, rimY + 4],
          [bucket.x - 9, rimY + 4],
        ],
        COLORS.ochre,
      );
      bar(bucket.x - 13, bucket.y - 13, bucket.x - 6, rimY, 4, COLORS.yellow);
      rect(bucket.x - 8, rimY, 23, 3, COLORS.yellow);
      rect(bucket.x + 16, rimY + 2, 6, 4, COLORS.soft);
      rect(bucket.x + 7, rimY + 3, 5, 4, COLORS.soft);
      ctx.restore();
    }

    function draw(now = performance.now()) {
      ctx.clearRect(0, 0, BUILDER_WORLD_WIDTH, BUILDER_WORLD_HEIGHT);
      rect(23, BUILDER_GROUND_Y, BUILDER_WORLD_WIDTH - 46, 1, COLORS.beam);
      drawBuilding(now);
      drawSupply();
      drawExcavator(now);
      if (state.falling) drawCube(state.falling.x, state.falling.y);
    }

    function activeDirection(axis: Motion["axis"], now: number) {
      if (pointerMotion?.axis === axis && now - pointerPressedAt >= 140)
        return pointerMotion.direction;
      let positive = false;
      let negative = false;
      for (const key of keys) {
        const motion = MOTIONS[key];
        if (motion?.axis !== axis || now - (keyPressedAt.get(key) ?? now) < 140) continue;
        positive ||= motion.direction === 1;
        negative ||= motion.direction === -1;
      }
      return Number(positive) - Number(negative);
    }

    function needsFrame(now: number) {
      return (
        keys.size > 0 ||
        pointerMotion !== null ||
        builderNeedsPhysics(state) ||
        (!reduced.matches && now - bucketTurnedAt < 180) ||
        (completedAt > 0 && now - completedAt < 450)
      );
    }

    function tick(now: number) {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const elapsed = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const drive = activeDirection("drive", now);
      const lift = activeDirection("lift", now);
      if (drive) {
        const previousX = state.machineX;
        state = moveBuilder(state, drive < 0 ? -1 : 1, elapsed * 145);
        distanceDriven += Math.abs(state.machineX - previousX);
      }
      if (lift) state = liftBuilderBucket(state, lift < 0 ? -1 : 1, elapsed * 0.7);
      if (builderNeedsPhysics(state)) {
        const previousCount = state.delivered.length;
        const previousCube = state.falling;
        state = advanceBuilderPhysics(state, elapsed);
        if (previousCube && !state.falling) {
          if (state.delivered.length > previousCount) {
            const complete = state.delivered.length === BUILDER_TOTAL_BLOCKS;
            if (complete) completedAt = now;
            announce(
              complete
                ? "Workshop complete. Restart to build again."
                : "Cube delivered. Return to the supply and scoop the next one.",
            );
          } else
            announce("Cube landed on the ground or another cube. Scoop it and aim at the outline.");
        }
      }
      draw(now);
      if (needsFrame(now)) frame = requestAnimationFrame(tick);
    }

    function start() {
      if (disposed || frame || !visible || document.hidden) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function release() {
      keys.clear();
      keyPressedAt.clear();
      pointerMotion = null;
      draw();
    }

    function step(motion: Motion) {
      if (motion.axis === "drive") {
        const previousX = state.machineX;
        state = moveBuilder(state, motion.direction, BUILDER_BLOCK_WIDTH);
        distanceDriven += Math.abs(state.machineX - previousX);
      } else state = liftBuilderBucket(state, motion.direction, BUILDER_LIFT_STEP);
      draw();
      if (builderNeedsPhysics(state)) start();
    }

    function operate() {
      const result = operateBuilderBucket(state);
      state = result.state;
      bucketTurnedAt = performance.now();
      const messages = {
        scooped: "One cube in the bucket. Raise fully, drive to the yellow outline, then Drop.",
        "closed-empty": "Bucket empty. Open it, lower over a loose cube, then Scoop.",
        "scoop-blocked":
          "Another cube blocks the bucket. Line up with the loose cube before scooping.",
        opened: "Bucket open. Lower it onto a loose cube, then Scoop.",
        "released-on-target": "Bucket open. The cube is falling onto the foundation.",
        "released-away": "Cube released outside the yellow outline. Scoop it again after it lands.",
        "released-too-low": "Released too low. Scoop the cube again and raise above the outline.",
        falling: "Wait for the cube to land.",
        complete: "Workshop complete. Restart to build again.",
      };
      announce(messages[result.outcome]);
      draw();
      start();
    }

    engine.current = {
      keyDown(key) {
        const motion = MOTIONS[key];
        if (!motion) return;
        if (!keys.has(key)) {
          keyPressedAt.set(key, performance.now());
          step(motion);
        }
        keys.add(key);
        start();
      },
      keyUp(key) {
        keys.delete(key);
        keyPressedAt.delete(key);
        draw();
      },
      hold(motion) {
        pointerMotion = motion;
        if (motion) {
          pointerPressedAt = performance.now();
          step(motion);
          start();
        } else draw();
      },
      step,
      operate,
      turn() {
        const result = turnBuilder(state);
        state = result.state;
        announce(
          result.outcome === "turned"
            ? `Facing ${state.facing === 1 ? "right" : "left"}. The bucket follows the cab.`
            : result.outcome === "edge"
              ? "Move away from the edge before turning."
              : "Turn blocked by a cube or the building. Raise the load before turning.",
        );
        draw();
        start();
      },
      reset() {
        state = createBuilderState();
        distanceDriven = 0;
        bucketTurnedAt = 0;
        completedAt = 0;
        release();
        announce(INITIAL_MESSAGE);
      },
      release,
    };

    function resize() {
      const bounds = root!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      output!.width = Math.max(1, Math.round(bounds.width * ratio));
      output!.height = Math.max(1, Math.round(bounds.height * ratio));
      ctx.setTransform(
        output!.width / BUILDER_WORLD_WIDTH,
        0,
        0,
        output!.height / BUILDER_WORLD_HEIGHT,
        0,
        0,
      );
      ctx.imageSmoothingEnabled = false;
      draw();
    }

    function visibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        release();
      } else {
        draw();
        if (needsFrame(performance.now())) start();
      }
    }

    function motionChange() {
      draw();
      if (needsFrame(performance.now())) start();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible) {
          draw();
          if (needsFrame(performance.now())) start();
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
          release();
        }
      },
      { threshold: 0.1 },
    );
    intersectionObserver.observe(root);
    document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener("blur", release);
    reduced.addEventListener("change", motionChange);
    resize();
    // Keep the first accessible readout in sync when React remounts the effect in development.
    setReadout(readWorkshop(state, lastMessage));
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("blur", release);
      reduced.removeEventListener("change", motionChange);
      engine.current = null;
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (MOTIONS[key]) {
      event.preventDefault();
      engine.current?.keyDown(key);
    } else if (key === "f") {
      event.preventDefault();
      if (!event.repeat) engine.current?.turn();
    } else if (key === "e" || (key === " " && !(event.target instanceof HTMLButtonElement))) {
      event.preventDefault();
      if (!event.repeat) engine.current?.operate();
    }
  }

  function startMotion(event: PointerEvent<HTMLButtonElement>, motion: Motion) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.current?.hold(motion);
  }

  const actionLabel = readout.falling
    ? "Dropping"
    : readout.bucket === "loaded"
      ? "Drop"
      : readout.bucket === "closed"
        ? "Open"
        : "Scoop";
  return (
    <div
      className="footer-builder"
      role="group"
      aria-labelledby={`${id}-title`}
      onKeyDown={onKeyDown}
      onKeyUp={(event) =>
        engine.current?.keyUp(event.key.length === 1 ? event.key.toLowerCase() : event.key)
      }
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          engine.current?.release();
      }}
    >
      <div className="footer-builder-heading">
        <h3 id={`${id}-title`}>The excavator workshop.</h3>
        <span className="footer-builder-count">
          {readout.built} / {BUILDER_TOTAL_BLOCKS} blocks
        </span>
      </div>
      <div
        className="footer-builder-stage"
        ref={stage}
        tabIndex={0}
        role="group"
        aria-label="Interactive excavator workshop"
        aria-describedby={`${id}-help ${id}-status`}
        onPointerDown={(event) => {
          if (event.button === 0) event.currentTarget.focus({ preventScroll: true });
        }}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <span className="footer-builder-sr">
          Move the excavator, lower the open bucket over a loose cube, close to scoop one cube,
          raise and carry it to the yellow outline, then open to drop it onto the building.
        </span>
        <span className="footer-builder-bucket-state">
          Bucket: {readout.bucket === "loaded" ? "1 cube" : readout.bucket}
        </span>
      </div>
      <div className="footer-builder-controls">
        {(
          [
            {
              axis: "drive",
              direction: -1,
              icon: "left",
              label: "Move excavator left",
              key: "A / left arrow",
            },
            {
              axis: "drive",
              direction: 1,
              icon: "right",
              label: "Move excavator right",
              key: "D / right arrow",
            },
            { axis: "lift", direction: 1, icon: "up", label: "Raise bucket", key: "W / up arrow" },
            {
              axis: "lift",
              direction: -1,
              icon: "down",
              label: "Lower bucket",
              key: "S / down arrow",
            },
          ] as const
        ).map((control) => (
          <button
            type="button"
            key={control.label}
            aria-label={control.label}
            title={`${control.label} (${control.key})`}
            onPointerDown={(event) => startMotion(event, control)}
            onPointerUp={() => engine.current?.hold(null)}
            onPointerCancel={() => engine.current?.hold(null)}
            onLostPointerCapture={() => engine.current?.hold(null)}
            onClick={(event) => {
              if (event.detail === 0) engine.current?.step(control);
            }}
          >
            <ControlIcon name={control.icon} />
          </button>
        ))}
        <button
          type="button"
          className="footer-builder-bucket-action"
          onClick={() => engine.current?.operate()}
          disabled={readout.falling || readout.built === BUILDER_TOTAL_BLOCKS}
          title="Close or open bucket (Space / E)"
        >
          <ControlIcon name="bucket" /> {actionLabel}
        </button>
        <button
          type="button"
          className="footer-builder-turn"
          onClick={() => engine.current?.turn()}
          aria-label="Turn excavator"
          title="Turn excavator (F)"
        >
          <ControlIcon name="turn" /> Turn
        </button>
        <button
          type="button"
          className="footer-builder-restart"
          onClick={() => engine.current?.reset()}
          aria-label="Restart workshop"
          title="Restart workshop"
        >
          <ControlIcon name="reset" />
          <span className="footer-builder-utility-label">Restart</span>
        </button>
      </div>
      <p className="footer-builder-help" id={`${id}-help`}>
        Click the scene. <kbd>← → / A D</kbd> drive. <kbd>↑ ↓ / W S</kbd> bucket.{" "}
        <kbd>Space / E</kbd> scoop / drop. <kbd>F</kbd> turn.
      </p>
      <p
        className="footer-builder-status"
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {readout.message}
      </p>
    </div>
  );
}
