export type MeteorBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type MeteorBounds = { left: number; right: number; top: number; bottom: number };

const SCROLL_DRAG = 2.7;
const MAX_SCROLL_SPEED = 0.065;

/** Scroll moves the scene past a suspended rock; the rock briefly lags behind it. */
export function addMeteorScrollImpulse(velocity: number, deltaPixels: number, sceneHeight: number) {
  if (!Number.isFinite(deltaPixels) || !Number.isFinite(sceneHeight) || sceneHeight <= 0)
    return velocity;
  const impulse = Math.min(0.18, Math.max(-0.18, deltaPixels / sceneHeight)) * 0.16;
  return Math.min(MAX_SCROLL_SPEED, Math.max(-MAX_SCROLL_SPEED, velocity + impulse));
}

/** Keep scroll inertia separate from an intentional launch, with a short, smooth coast. */
export function stepMeteorScrollInertia(
  body: MeteorBody,
  bounds: MeteorBounds,
  velocity: number,
  seconds: number,
) {
  const dt = Math.min(Math.max(seconds, 0), 0.06);
  const damping = Math.exp(-SCROLL_DRAG * dt);
  body.y += (velocity * (1 - damping)) / SCROLL_DRAG;
  let nextVelocity = velocity * damping;
  if (body.y < bounds.top || body.y > bounds.bottom) {
    body.y = Math.min(bounds.bottom, Math.max(bounds.top, body.y));
    nextVelocity *= -0.28;
  }
  return Math.abs(nextVelocity) < 0.00015 ? 0 : nextVelocity;
}

/** Positions use the scene's width and height; radius uses its height. */
export function stepMeteor(body: MeteorBody, bounds: MeteorBounds, seconds: number) {
  const dt = Math.min(Math.max(seconds, 0), 0.06);
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  const damping = Math.exp(-0.72 * dt);
  body.vx *= damping;
  body.vy *= damping;
  if (body.x < bounds.left || body.x > bounds.right) {
    body.x = Math.min(bounds.right, Math.max(bounds.left, body.x));
    body.vx *= -0.78;
  }
  if (body.y < bounds.top || body.y > bounds.bottom) {
    body.y = Math.min(bounds.bottom, Math.max(bounds.top, body.y));
    body.vy *= -0.78;
  }
  if (Math.hypot(body.vx, body.vy) < 0.0005) body.vx = body.vy = 0;
}

export function launchMeteor(body: MeteorBody, dx: number, dy: number, aspect: number) {
  const length = Math.hypot(dx * aspect, dy);
  if (length < 0.001) return false;
  const speed = Math.min(0.58, Math.max(0.14, length * 2.1));
  body.vx = (dx / length) * speed;
  body.vy = (dy / length) * speed;
  return true;
}

/** Equal-mass, damped collisions keep launched fragments from passing through each other. */
export function collideMeteors(a: MeteorBody, b: MeteorBody, aspect: number) {
  const dx = (b.x - a.x) * aspect;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minimum = (a.radius + b.radius) * 0.94;
  if (distance >= minimum || distance < 0.00001) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = (minimum - distance) / 2;
  a.x -= (nx * overlap) / aspect;
  a.y -= ny * overlap;
  b.x += (nx * overlap) / aspect;
  b.y += ny * overlap;
  const closing = (a.vx - b.vx) * aspect * nx + (a.vy - b.vy) * ny;
  if (closing <= 0) return;
  const impulse = closing * 0.82;
  a.vx -= (impulse * nx) / aspect;
  a.vy -= impulse * ny;
  b.vx += (impulse * nx) / aspect;
  b.vy += impulse * ny;
}
