"use client";
import { useEffect, useRef, type ReactNode } from "react";

type Particle = {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

export function PixelField({
  src,
  word,
  className,
  children,
}: {
  src?: string;
  word?: string;
  className: string;
  children: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = surface.current,
      output = canvas.current;
    if (!root || !output) return;
    const context = output.getContext("2d");
    if (!context) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    const sample = document.createElement("canvas"),
      sampleContext = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return;
    let disposed = false,
      visible = false,
      frame = 0,
      width = 0,
      height = 0,
      image: HTMLImageElement | undefined;
    let particles: Particle[] = [];
    const pointer = { x: -1000, y: -1000, active: false };
    const enabled = () => !reduce.matches && fine.matches && !document.hidden;
    let seed = 198021;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      if (image) context.drawImage(image, 0, 0, width, height);
      const radius = Math.max(55, Math.min(130, width / 6));
      let moving = false;
      for (const p of particles) {
        const dx = p.x - pointer.x,
          dy = p.y - pointer.y,
          distance = Math.hypot(dx, dy);
        let fx = 0,
          fy = 0;
        if (pointer.active && distance < radius) {
          const force = (1 - distance / radius) * 3.4;
          fx = (dx / Math.max(distance, 1)) * force;
          fy = (dy / Math.max(distance, 1)) * force;
        }
        p.vx = (p.vx + (p.ox - p.x) * 0.065 + fx) * 0.82;
        p.vy = (p.vy + (p.oy - p.y) * 0.065 + fy) * 0.82;
        p.x += p.vx;
        p.y += p.vy;
        moving ||= Math.abs(p.vx) + Math.abs(p.vy) > 0.04;
        const displaced = Math.hypot(p.x - p.ox, p.y - p.oy) > 0.4;
        if (image && !displaced) continue;
        if (image) {
          context.fillStyle = "#001619";
          context.fillRect(p.ox - p.size / 2, p.oy - p.size / 2, p.size, p.size);
        }
        context.fillStyle = p.color;
        context.fillRect(
          Math.round(p.x - p.size / 2),
          Math.round(p.y - p.size / 2),
          p.size,
          p.size,
        );
      }
      return moving;
    }
    function tick() {
      frame = 0;
      if (disposed || !visible || !enabled()) return;
      if (draw()) frame = requestAnimationFrame(tick);
    }
    function start() {
      if (!frame && visible && enabled()) frame = requestAnimationFrame(tick);
    }
    function prepare() {
      if (disposed || !context || !sampleContext) return;
      const bounds = root!.getBoundingClientRect();
      width = Math.round(bounds.width);
      height = Math.round(bounds.height);
      if (
        width < 2 ||
        height < 2 ||
        !enabled() ||
        (src && (!image || !image.complete || !image.naturalWidth))
      ) {
        delete root!.dataset.ready;
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      output!.width = Math.round(width * ratio);
      output!.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
      sample.width = width;
      sample.height = height;
      sampleContext.imageSmoothingEnabled = false;
      sampleContext.clearRect(0, 0, width, height);
      if (image) sampleContext.drawImage(image, 0, 0, width, height);
      else {
        const fontSize = Math.min(height * 0.95, width * 0.52);
        sampleContext.font = `700 ${fontSize}px ${getComputedStyle(root!).fontFamily}`;
        sampleContext.textAlign = "center";
        sampleContext.textBaseline = "middle";
        sampleContext.fillStyle = "#27d8c9";
        sampleContext.fillText(word ?? "BAO", width / 2, height / 2);
      }
      const pixels = sampleContext.getImageData(0, 0, width, height).data;
      particles = [];
      seed = 198021;
      if (image) {
        const limit = Math.min(850, Math.round((width * height) / 700));
        for (let attempt = 0; attempt < limit * 7 && particles.length < limit; attempt++) {
          const x = Math.floor(random() * width),
            y = Math.floor(random() * height),
            offset = (y * width + x) * 4;
          if (pixels[offset + 3] < 180 || pixels[offset + 1] < 90) continue;
          const size = Math.max(3, Math.round(width / 240));
          particles.push({
            ox: x,
            oy: y,
            x,
            y,
            vx: 0,
            vy: 0,
            size,
            color: `rgb(${pixels[offset]} ${pixels[offset + 1]} ${pixels[offset + 2]})`,
          });
        }
      } else {
        const step = Math.max(5, Math.ceil(Math.sqrt((width * height) / 2400)));
        for (let y = 0; y < height; y += step)
          for (let x = 0; x < width; x += step) {
            if (pixels[(y * width + x) * 4 + 3] < 180 || random() < 0.12) continue;
            particles.push({
              ox: x,
              oy: y,
              x,
              y,
              vx: 0,
              vy: 0,
              size: Math.max(2, step - 2),
              color: random() < 0.12 ? "#e0f8f7" : random() < 0.2 ? "#107977" : "#27d8c9",
            });
          }
      }
      pointer.active = false;
      root!.dataset.ready = "true";
      draw();
    }
    const eventTarget = root.parentElement ?? root;
    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || !enabled()) return;
      const bounds = root!.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
      start();
    }
    function leave() {
      pointer.active = false;
      start();
    }
    function visibility() {
      if (!enabled()) {
        cancelAnimationFrame(frame);
        frame = 0;
        pointer.active = false;
        delete root!.dataset.ready;
      } else if (src && !image) {
        image = new window.Image();
        image.onload = prepare;
        image.src = src;
      } else prepare();
    }
    const resize = new ResizeObserver(prepare);
    resize.observe(root);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          cancelAnimationFrame(frame);
          frame = 0;
          pointer.active = false;
        } else prepare();
      },
      { threshold: 0.02 },
    );
    observer.observe(root);
    eventTarget.addEventListener("pointermove", move, { passive: true });
    eventTarget.addEventListener("pointerleave", leave);
    reduce.addEventListener("change", visibility);
    fine.addEventListener("change", visibility);
    document.addEventListener("visibilitychange", visibility);
    if (src && enabled()) {
      image = new window.Image();
      image.onload = prepare;
      image.src = src;
    }
    if (word)
      void document.fonts.ready.then(() => {
        if (!disposed) prepare();
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      eventTarget.removeEventListener("pointermove", move);
      eventTarget.removeEventListener("pointerleave", leave);
      reduce.removeEventListener("change", visibility);
      fine.removeEventListener("change", visibility);
      document.removeEventListener("visibilitychange", visibility);
      if (image) image.onload = null;
    };
  }, [src, word]);
  return (
    <div className={`pixel-surface ${className}`} ref={surface}>
      {children}
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
