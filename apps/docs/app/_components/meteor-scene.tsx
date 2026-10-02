"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Box3,
  BufferGeometry,
  Group,
  Material,
  OrthographicCamera,
  Raycaster,
  Scene,
  Texture,
  WebGLRenderer,
} from "three";
import { createMeteorRock } from "./meteor-rock";
import { rockSprite } from "./space-rock-sprites";
import {
  addMeteorScrollImpulse,
  collideMeteors,
  launchMeteor,
  stepMeteor,
  stepMeteorScrollInertia,
  type MeteorBody,
  type MeteorBounds,
} from "./meteor-physics";
import "./meteor-scene.css";

type Three = typeof import("three");
type Engine = {
  launch: (index?: number) => void;
  reset: () => void;
  select: (index: number) => void;
  aim: (x: number, y: number) => void;
};
type Fragment = MeteorBody & {
  bounds: MeteorBounds;
  spin: number;
  scrollVelocity: number;
  footprint?: { frame: number; left: number; right: number; top: number; bottom: number };
  group?: Group;
};

// Rock radii are fractions of scene height, so their shapes stay round on every screen.
const FRAGMENTS = [
  { x: 0.795, y: 0.385, radius: 0.102, seed: 32, tilt: 0.7 },
  { x: 0.909, y: 0.272, radius: 0.061, seed: 119, tilt: -0.9 },
  { x: 0.653, y: 0.507, radius: 0.037, seed: 721, tilt: 1.8 },
  { x: 0.918, y: 0.533, radius: 0.027, seed: 239, tilt: 0.4 },
  { x: 0.115, y: 0.636, radius: 0.031, seed: 1411, tilt: -0.5 },
  { x: 0.17, y: 0.689, radius: 0.017, seed: 61, tilt: 1.7 },
  { x: 0.414, y: 0.576, radius: 0.06, seed: 947, tilt: -0.35 },
];
const COMPACT_FRAGMENTS = [
  { x: 0.565, y: 0.435, radius: 0.205 },
  { x: 0.854, y: 0.452, radius: 0.1 },
  { x: 0.255, y: 0.45, radius: 0.082 },
  { x: 0.756, y: 0.75, radius: 0.063 },
  { x: 0.125, y: 0.723, radius: 0.064 },
  { x: 0.385, y: 0.753, radius: 0.04 },
  { x: 0.48, y: 0.7, radius: 0.085 },
];

export function MeteorScene() {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "fallback">("loading");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const root = surface.current;
    const output = canvas.current;
    if (!root || !output) return;
    const hits = Array.from(root.querySelectorAll<HTMLButtonElement>(".meteor-hit"));
    const aimLine = root.querySelector<SVGLineElement>(".meteor-aim line")!;
    const aimHead = root.querySelector<SVGPathElement>(".meteor-aim path")!;
    const aimSvg = root.querySelector<SVGSVGElement>(".meteor-aim")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 1200px)");
    const fragments: Fragment[] = FRAGMENTS.map((item) => ({
      ...item,
      vx: 0,
      vy: 0,
      spin: 0,
      scrollVelocity: 0,
      bounds: { left: 0, right: 1, top: 0, bottom: 1 },
    }));
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    let renderer: WebGLRenderer | undefined;
    let scene: Scene | undefined;
    let camera: OrthographicCamera | undefined;
    let raycaster: Raycaster | undefined;
    let three: Three | undefined;
    let projectedBox: Box3 | undefined;
    let measurementFrame = 0;
    let disposed = false;
    let visible = false;
    let webglReady = false;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let width = 1;
    let height = 1;
    let aspect = 1;
    let lastScrollY = window.scrollY;
    let pendingScroll = 0;
    let wasCompact: boolean | undefined;
    let selected = 0;
    let direction = { x: 0.16, y: -0.12 };
    let drag:
      | {
          index: number;
          id: number;
          sx: number;
          sy: number;
          dx: number;
          dy: number;
          target: HTMLButtonElement;
        }
      | undefined;

    function flightBounds(fragment: Fragment, index: number): MeteorBounds {
      // The canvas covers the entire stage. Only art-facing edges may cross the frame;
      // the title and quickstart retain their original exclusion zones.
      const ry = fragment.radius * 1.32;
      const rx = ry / aspect;
      const bleedY = 18 / height;
      const bleedX = 18 / width;
      const zone = compact.matches
        ? { left: 0.03, right: 0.97, top: 0.08, bottom: 0.83 }
        : index < 4
          ? {
              left: 0.61,
              right: 1626 / 1672 + bleedX,
              top: (fragment.x - rx >= 1280 / 1672 ? 116 / 941 : 160 / 941) - bleedY,
              bottom: 596 / 941 + bleedY,
            }
          : index === 6
            ? { left: 0.365, right: 0.54, top: 0.49, bottom: 645 / 941 + bleedY }
            : {
                left: 65 / 1672 - bleedX,
                right: 0.195,
                top: 0.557,
                bottom: 766 / 941 + bleedY,
              };
      let footprint = { left: rx, right: rx, top: ry, bottom: ry };
      const nearArtEdge =
        !compact.matches &&
        (fragment.y + ry >= zone.bottom - bleedY ||
          (index < 4 &&
            (fragment.x + rx >= zone.right - bleedX || fragment.y - ry <= zone.top + bleedY)) ||
          ((index === 4 || index === 5) && fragment.x - rx <= zone.left + bleedX));
      if (nearArtEdge && fragment.group && projectedBox) {
        if (fragment.footprint?.frame !== measurementFrame) {
          // Exact projection runs only near a frame edge, not throughout every idle orbit.
          // A rotated bounding box includes empty corners and would hide visible overlap.
          fragment.group.scale.setScalar(fragment.radius * 10);
          projectedBox.setFromObject(fragment.group, true);
          fragment.footprint = {
            frame: measurementFrame,
            left: (fragment.group.position.x - projectedBox.min.x) / (aspect * 10),
            right: (projectedBox.max.x - fragment.group.position.x) / (aspect * 10),
            top: (projectedBox.max.y - fragment.group.position.y) / 10,
            bottom: (fragment.group.position.y - projectedBox.min.y) / 10,
          };
        }
        footprint = fragment.footprint;
      }
      // Keep every facet inside the canvas even when the decorative frame is crossed.
      return {
        left: Math.max(rx, zone.left + (index === 4 || index === 5 ? footprint.left : rx)),
        right: Math.min(1 - rx, zone.right - (index < 4 ? footprint.right : rx)),
        top: Math.max(ry, zone.top + (index < 4 ? footprint.top : ry)),
        bottom: Math.min(1 - ry, zone.bottom - footprint.bottom),
      };
    }

    function resetScroll() {
      pendingScroll = 0;
      lastScrollY = window.scrollY;
      fragments.forEach((fragment) => {
        fragment.scrollVelocity = 0;
      });
    }

    function layout(reset = false) {
      const rect = root!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      aspect = width / height;
      measurementFrame++;
      resetScroll();
      const changed = wasCompact !== compact.matches;
      wasCompact = compact.matches;
      fragments.forEach((fragment, index) => {
        const origin = compact.matches ? COMPACT_FRAGMENTS[index] : FRAGMENTS[index];
        fragment.radius = origin.radius;
        if (reset || changed) {
          fragment.x = origin.x;
          fragment.y = origin.y;
          fragment.vx = fragment.vy = fragment.spin = 0;
        }
        fragment.bounds = flightBounds(fragment, index);
        fragment.x = Math.min(fragment.bounds.right, Math.max(fragment.bounds.left, fragment.x));
        fragment.y = Math.min(fragment.bounds.bottom, Math.max(fragment.bounds.top, fragment.y));
        hits[index].style.left = "0";
        hits[index].style.top = "0";
        hits[index].style.width = `${fragment.radius * height * 2.64}px`;
        hits[index].style.height = `${fragment.radius * height * 2.64}px`;
      });
      aimSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      if (camera && renderer) {
        camera.left = -aspect * 5;
        camera.right = aspect * 5;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
      }
      draw();
      start();
    }

    function draw() {
      fragments.forEach((fragment, index) => {
        const hit = hits[index];
        hit.style.transform = `translate3d(${fragment.x * width}px, ${fragment.y * height}px, 0) translate(-50%, -50%)`;
        if (fragment.group) {
          fragment.group.position.set((fragment.x - 0.5) * aspect * 10, (0.5 - fragment.y) * 10, 0);
          fragment.group.scale.setScalar(fragment.radius * 10);
        }
      });
      if (webglReady && renderer && scene && camera) renderer.render(scene, camera);
    }

    function tick(now: number) {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 0.06) : 1 / 60;
      last = now;
      elapsed += dt;
      const idle = !reduce.matches && webglReady;
      const scrollDelta = idle ? pendingScroll : 0;
      pendingScroll = 0;
      measurementFrame++;
      let moving = false;
      fragments.forEach((fragment, index) => {
        if (drag?.index === index) return;
        if (idle) {
          // Different mass impressions keep the field from moving like one flat layer.
          const response = 0.65 + Math.min(1, fragment.radius / 0.102) * 0.35;
          fragment.scrollVelocity = addMeteorScrollImpulse(
            fragment.scrollVelocity,
            scrollDelta * response,
            height,
          );
          fragment.x += (Math.sin(elapsed * 0.3 + index * 1.4) * 0.003 * dt) / aspect;
          fragment.y += Math.cos(elapsed * 0.26 + index * 2.1) * 0.003 * dt;
        }
        if (fragment.group && (idle || fragment.spin > 0.005)) {
          fragment.group.rotation.y += dt * (idle ? 0.095 + index * 0.009 : 0) + dt * fragment.spin;
          fragment.group.rotation.z +=
            dt * (idle ? 0.032 : 0) -
            dt * fragment.spin * 0.24 +
            dt * fragment.scrollVelocity * 0.6;
          fragment.spin *= Math.exp(-dt * 1.1);
          moving ||= fragment.spin > 0.005;
        }
        fragment.bounds = flightBounds(fragment, index);
        fragment.scrollVelocity = stepMeteorScrollInertia(
          fragment,
          fragment.bounds,
          fragment.scrollVelocity,
          dt,
        );
        stepMeteor(fragment, fragment.bounds, dt);
        moving ||= Math.hypot(fragment.vx, fragment.vy) > 0 || fragment.scrollVelocity !== 0;
      });
      for (let i = 0; i < fragments.length; i++) {
        for (let j = i + 1; j < fragments.length; j++) {
          if (drag && (drag.index === i || drag.index === j)) continue;
          collideMeteors(fragments[i], fragments[j], aspect);
        }
      }
      // Collisions may displace a fragment against an edge; clamp in the same frame.
      fragments.forEach((fragment, index) => {
        fragment.bounds = flightBounds(fragment, index);
        stepMeteor(fragment, fragment.bounds, 0);
      });
      draw();
      if (idle || moving || drag) frame = requestAnimationFrame(tick);
    }

    function start() {
      if (!frame && visible && !document.hidden && !disposed) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      resetScroll();
    }

    function scroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      if (!visible || document.hidden || reduce.matches || !webglReady) {
        pendingScroll = 0;
        return;
      }
      // Coalesce events in one animation frame and soften large page/anchor jumps.
      pendingScroll = Math.min(height * 0.18, Math.max(-height * 0.18, pendingScroll + delta));
      start();
    }

    function motionPreference() {
      resetScroll();
      start();
    }

    function select(index: number) {
      selected = index;
      hits.forEach((hit, i) => {
        hit.dataset.selected = String(i === index);
      });
    }

    function launch(index = selected, dx = direction.x, dy = direction.y) {
      const fragment = fragments[index];
      if (!launchMeteor(fragment, dx, dy, aspect)) return;
      fragment.spin = 0.7;
      select(index);
      setAnnouncement(
        `Fragment ${index + 1} launched ${Math.abs(dy) < 0.01 ? "" : dy < 0 ? "up " : "down "}${Math.abs(dx) < 0.01 ? "" : dx < 0 ? "left" : "right"}.`,
      );
      start();
    }

    engine.current = {
      launch,
      select,
      aim: (x, y) => {
        direction = { x, y };
        setAnnouncement(
          `Launch direction: ${x < 0 ? "left" : x > 0 ? "right" : y < 0 ? "up" : "down"}. Press Enter to launch.`,
        );
      },
      reset: () => {
        clearDrag();
        layout(true);
        fragments.forEach((fragment, index) =>
          fragment.group?.rotation.set(0.28, FRAGMENTS[index].tilt, -0.24),
        );
        setAnnouncement("Fragments returned to their starting positions.");
        draw();
      },
    };

    function updateAim() {
      if (!drag) return;
      const fragment = fragments[drag.index];
      const sx = fragment.x * width;
      const sy = fragment.y * height;
      const length = Math.hypot(drag.dx, drag.dy);
      const scale = Math.min(1, (Math.min(width, height) * 0.28) / Math.max(1, length));
      const ex = sx + drag.dx * scale;
      const ey = sy + drag.dy * scale;
      const angle = Math.atan2(ey - sy, ex - sx);
      aimLine.setAttribute("x1", String(sx));
      aimLine.setAttribute("y1", String(sy));
      aimLine.setAttribute("x2", String(ex));
      aimLine.setAttribute("y2", String(ey));
      aimHead.setAttribute(
        "d",
        `M${ex - Math.cos(angle - 0.48) * 11},${ey - Math.sin(angle - 0.48) * 11} L${ex},${ey} L${ex - Math.cos(angle + 0.48) * 11},${ey - Math.sin(angle + 0.48) * 11}`,
      );
      root!.dataset.aiming = String(length > 7);
    }

    function clearDrag() {
      const previous = drag;
      drag = undefined;
      if (previous) {
        previous.target.dataset.grabbed = "false";
        if (previous.target.hasPointerCapture(previous.id))
          previous.target.releasePointerCapture(previous.id);
      }
      root!.dataset.aiming = "false";
    }

    function down(event: PointerEvent) {
      if (event.button !== 0 || drag) return;
      const hit = (event.target as Element).closest<HTMLButtonElement>(".meteor-hit");
      if (!hit || hit.disabled) return;
      let index = Number(hit.dataset.fragment);
      const rect = root!.getBoundingClientRect();
      if (webglReady && three && camera && raycaster) {
        raycaster.setFromCamera(
          new three.Vector2(
            ((event.clientX - rect.left) / width) * 2 - 1,
            (-(event.clientY - rect.top) / height) * 2 + 1,
          ),
          camera,
        );
        const collision = raycaster.intersectObjects(
          fragments.flatMap((fragment) => (fragment.group ? [fragment.group] : [])),
          true,
        )[0];
        if (!collision) return;
        let object = collision.object;
        while (object.parent && object.userData.fragment === undefined) object = object.parent;
        index = Number(object.userData.fragment);
        if (!Number.isFinite(index)) return;
      }
      select(index);
      fragments[index].vx = fragments[index].vy = 0;
      fragments[index].scrollVelocity = 0;
      drag = {
        index,
        id: event.pointerId,
        sx: event.clientX,
        sy: event.clientY,
        dx: 0,
        dy: 0,
        target: hit,
      };
      hit.dataset.grabbed = "true";
      hit.setPointerCapture(event.pointerId);
      event.preventDefault();
      start();
    }

    function move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      drag.dx = event.clientX - drag.sx;
      drag.dy = event.clientY - drag.sy;
      updateAim();
    }

    function up(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const { index, dx, dy } = drag;
      clearDrag();
      if (Math.hypot(dx, dy) > 7) launch(index, dx / width, dy / height);
      else launch(index);
    }

    function visibility() {
      resetScroll();
      if (document.hidden) {
        clearDrag();
        stop();
      } else start();
    }

    function disposeScene() {
      webglReady = false;
      fragments.forEach((fragment) => {
        delete fragment.group;
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      geometries.clear();
      materials.clear();
      textures.clear();
      renderer?.dispose();
      renderer = undefined;
      scene = undefined;
      camera = undefined;
      raycaster = undefined;
    }

    function contextLost(event: Event) {
      event.preventDefault();
      webglReady = false;
      if (!disposed) setMode("fallback");
      stop();
      draw();
    }

    const resize = new ResizeObserver(() => layout());
    resize.observe(root);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          resetScroll();
          draw();
          start();
        } else {
          clearDrag();
          stop();
        }
      },
      { threshold: 0.02 },
    );
    observer.observe(root);
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", clearDrag);
    root.addEventListener("lostpointercapture", clearDrag);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", scroll, { passive: true });
    reduce.addEventListener("change", motionPreference);
    output.addEventListener("webglcontextlost", contextLost);
    layout(true);

    void import("three")
      .then((THREE) => {
        if (disposed) return;
        three = THREE;
        projectedBox = new THREE.Box3();
        renderer = new THREE.WebGLRenderer({
          canvas: output,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setClearColor(0x001619, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-aspect * 5, aspect * 5, 5, -5, 0.1, 60);
        camera.position.z = 16;
        raycaster = new THREE.Raycaster();
        scene.add(new THREE.HemisphereLight(0x57ccc6, 0x000405, 0.18));
        const key = new THREE.DirectionalLight(0xd9ffff, 3.8);
        key.position.set(-5, 8, 7);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x31ede6, 2.1);
        rim.position.set(-4, 2, -4);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0x00636c, 0.45);
        fill.position.set(5, -1, 3);
        scene.add(fill);
        fragments.forEach((fragment, index) => {
          const group = createMeteorRock(
            THREE,
            FRAGMENTS[index].seed,
            index === 0 ? 20 : index === 1 || index === 6 ? 18 : 14,
          );
          group.userData.fragment = index;
          group.rotation.set(0.28, FRAGMENTS[index].tilt, -0.24);
          group.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              geometries.add(object.geometry);
              const material = object.material;
              (Array.isArray(material) ? material : [material]).forEach((entry) => {
                materials.add(entry);
                if (entry instanceof THREE.MeshStandardMaterial) {
                  if (entry.map) textures.add(entry.map);
                  if (entry.bumpMap) textures.add(entry.bumpMap);
                }
              });
            }
          });
          fragment.group = group;
          scene!.add(group);
        });
        webglReady = true;
        setMode("ready");
        layout();
      })
      .catch(() => {
        if (disposed) return;
        disposeScene();
        setMode("fallback");
        draw();
        start();
      });

    return () => {
      disposed = true;
      clearDrag();
      stop();
      engine.current = null;
      resize.disconnect();
      observer.disconnect();
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", clearDrag);
      root.removeEventListener("lostpointercapture", clearDrag);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", scroll);
      reduce.removeEventListener("change", motionPreference);
      output.removeEventListener("webglcontextlost", contextLost);
      disposeScene();
    };
  }, []);

  function keys(event: React.KeyboardEvent, index?: number) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-0.17, 0],
      ArrowRight: [0.17, 0],
      ArrowUp: [0, -0.17],
      ArrowDown: [0, 0.17],
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      if (index !== undefined) engine.current?.select(index);
      engine.current?.aim(...direction);
    }
  }

  return (
    <div
      className="meteor-scene"
      ref={surface}
      data-mode={mode}
      aria-label="Interactive meteor fragments"
    >
      <canvas className="meteor-canvas" ref={canvas} aria-hidden="true" />
      {FRAGMENTS.map((fragment, index) => (
        <button
          key={fragment.seed}
          className="meteor-hit"
          type="button"
          data-fragment={index}
          disabled={mode === "loading"}
          style={
            {
              left: `${fragment.x * 100}%`,
              top: `${fragment.y * 100}%`,
              "--rock-radius": fragment.radius,
              "--rock-image": rockSprite(index).backgroundImage,
              "--rock-bg-size": rockSprite(index).backgroundSize,
              "--rock-bg-position": rockSprite(index).backgroundPosition,
            } as React.CSSProperties
          }
          aria-label={`Launch meteor fragment ${index + 1}`}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space"
          onFocus={() => engine.current?.select(index)}
          onKeyDown={(event) => keys(event, index)}
          onClick={(event) => {
            if (event.detail === 0) engine.current?.launch(index);
          }}
        >
          <svg className="meteor-focus-frame" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M25 10 73 4 93 36 85 75 51 95 14 81 3 44Z" />
          </svg>
        </button>
      ))}
      <svg className="meteor-aim" aria-hidden="true">
        <line />
        <path />
      </svg>
      <span className="meteor-sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
