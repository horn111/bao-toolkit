import type { CSSProperties } from "react";
import { rockSprite } from "./space-rock-sprites";

/** Reuse the plate's actual rock surfaces; scatter crops without a repeating pattern. */
export function SpaceBackdrop({ hero = false, count }: { hero?: boolean; count?: number }) {
  const fragments = Array.from({ length: count ?? (hero ? 11 : 48) }, (_, index) => {
    const seed = index + (hero ? 91 : 211);
    const scatterX = fraction(Math.sin(seed * 127.1) * 43758.5453);
    const scatterY = fraction(Math.sin(seed * 311.7) * 19341.167);
    const lowerLeft = index % 4 === 0;
    const x = hero ? (lowerLeft ? 6 + scatterX * 11 : 65.5 + scatterX * 28.5) : scatterX * 100;
    const y = hero ? (lowerLeft ? 62 + scatterY * 9.5 : 22 + scatterY * 31.5) : scatterY * 100;
    const size = 8 + Math.round(fraction(Math.sin(seed * 73.9) * 4731.1) * 24);
    const rotation = Math.round(fraction(Math.sin(seed * 19.7) * 21133.7) * 360);
    const sprite = rockSprite(index * 5 + (hero ? 2 : 0));
    return {
      x,
      y,
      scatterX,
      scatterY,
      size,
      rotation,
      sprite,
      opacity: 0.25 + (index % 5) * 0.065,
    };
  });

  return (
    <div className={`space-backdrop ${hero ? "space-backdrop-hero" : ""}`} aria-hidden="true">
      {fragments.map((fragment, index) => {
        const { aspect, ...art } = fragment.sprite;
        return (
          <i
            key={index}
            className="space-rock"
            style={
              {
                ...art,
                left: hero ? "var(--hero-fragment-x)" : `${fragment.x}%`,
                top: hero ? "var(--hero-fragment-y)" : `${fragment.y}%`,
                ...(hero
                  ? {
                      "--fragment-desktop-x": `${fragment.x}%`,
                      "--fragment-desktop-y": `${fragment.y}%`,
                      "--fragment-mobile-x": `${8 + fragment.scatterX * 84}%`,
                      "--fragment-scatter-y": fragment.scatterY,
                    }
                  : {}),
                width: aspect < 1 ? fragment.size * aspect : fragment.size,
                height: aspect < 1 ? fragment.size : fragment.size / aspect,
                opacity: fragment.opacity,
                transform: `translate(-50%, -50%) rotate(${fragment.rotation}deg) scaleX(${index % 3 ? 1 : -1})`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function fraction(value: number) {
  return value - Math.floor(value);
}
