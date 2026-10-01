import driftRocks from "../../assets/plates/drift-rocks.png";

// Alpha bounds verified against the existing 1880 × 837 transparent artwork.
export const ROCK_SPRITES = [
  { x: 6, y: 62, width: 360, height: 388 },
  { x: 398, y: 347, width: 213, height: 233 },
  { x: 1562, y: 245, width: 189, height: 177 },
  { x: 944, y: 301, width: 55, height: 56 },
  { x: 145, y: 601, width: 62, height: 64 },
  { x: 864, y: 678, width: 53, height: 58 },
];

export function rockSprite(index: number) {
  const sprite = ROCK_SPRITES[index % ROCK_SPRITES.length];
  return {
    backgroundImage: `url(${driftRocks.src})`,
    backgroundSize: `${(driftRocks.width / sprite.width) * 100}% ${(driftRocks.height / sprite.height) * 100}%`,
    backgroundPosition: `${(sprite.x / (driftRocks.width - sprite.width)) * 100}% ${(sprite.y / (driftRocks.height - sprite.height)) * 100}%`,
    aspect: sprite.width / sprite.height,
  };
}
