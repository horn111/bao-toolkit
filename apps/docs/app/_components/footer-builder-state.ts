export const BUILDER_WORLD_WIDTH = 720;
export const BUILDER_WORLD_HEIGHT = 300;
export const BUILDER_GROUND_Y = 252;
export const BUILDER_COLUMNS = 4;
export const BUILDER_ROWS = 4;
export const BUILDER_BLOCK_WIDTH = 32;
export const BUILDER_BLOCK_HEIGHT = 28;
export const BUILDER_BUILDING_X = 448;
export const BUILDER_TOTAL_BLOCKS = BUILDER_COLUMNS * BUILDER_ROWS;
export const BUILDER_CUBE_SIZE = 22;
export const BUILDER_SUPPLY_X = 207;
export const BUILDER_BUCKET_REACH = 98;
export const BUILDER_BUCKET_TRAVEL = 118;
export const BUILDER_LIFT_STEP = 0.18;
export const BUILDER_DELIVERY_TOLERANCE = 17;

export type BuilderCube = { id: number; x: number; y: number; velocityY?: number };
export type BuilderBlock = {
  index: number;
  column: number;
  row: number;
  x: number;
  y: number;
};
export type FallingBuilderCube = BuilderCube & {
  velocityY: number;
  target: BuilderBlock | null;
};
export type BuilderState = {
  machineX: number;
  facing: -1 | 1;
  lift: number;
  bucketOpen: boolean;
  carriedId: number | null;
  looseCubes: BuilderCube[];
  sourceId: number | null;
  reserve: number[];
  delivered: number[];
  falling: FallingBuilderCube | null;
};

export function createBuilderState(): BuilderState {
  return {
    machineX: BUILDER_SUPPLY_X - BUILDER_BUCKET_REACH,
    facing: 1,
    lift: 0.72,
    bucketOpen: true,
    carriedId: null,
    looseCubes: [{ id: 0, x: BUILDER_SUPPLY_X, y: BUILDER_GROUND_Y - BUILDER_CUBE_SIZE / 2 }],
    sourceId: 0,
    reserve: Array.from({ length: BUILDER_TOTAL_BLOCKS - 1 }, (_, index) => index + 1),
    delivered: [],
    falling: null,
  };
}

export function getBuilderBlock(index: number): BuilderBlock {
  const row = Math.floor(index / BUILDER_COLUMNS);
  const offset = index % BUILDER_COLUMNS;
  const column = row % 2 === 0 ? offset : BUILDER_COLUMNS - 1 - offset;
  return {
    index,
    column,
    row,
    x: BUILDER_BUILDING_X + column * BUILDER_BLOCK_WIDTH,
    y: BUILDER_GROUND_Y - (row + 1) * BUILDER_BLOCK_HEIGHT,
  };
}

export function getNextBuilderBlock(state: BuilderState): BuilderBlock | null {
  return state.delivered.length < BUILDER_TOTAL_BLOCKS
    ? getBuilderBlock(state.delivered.length)
    : null;
}

export function getBuilderBucketPosition(state: BuilderState): { x: number; y: number } {
  return {
    x: state.machineX + state.facing * BUILDER_BUCKET_REACH,
    y: BUILDER_GROUND_Y - BUILDER_CUBE_SIZE / 2 - state.lift * BUILDER_BUCKET_TRAVEL,
  };
}

export function getCarriedBuilderCube(state: BuilderState): BuilderCube | null {
  return state.carriedId === null
    ? null
    : { id: state.carriedId, ...getBuilderBucketPosition(state) };
}

type Collider = { left: number; right: number; top: number; bottom: number };
const HALF_CUBE = BUILDER_CUBE_SIZE / 2;
const CONTACT_EPSILON = 0.001;

function cubeCollider(cube: { x: number; y: number }): Collider {
  return {
    left: cube.x - HALF_CUBE,
    right: cube.x + HALF_CUBE,
    top: cube.y - HALF_CUBE,
    bottom: cube.y + HALF_CUBE,
  };
}

function overlaps(a: Collider, b: Collider) {
  return (
    a.left < b.right - CONTACT_EPSILON &&
    a.right > b.left + CONTACT_EPSILON &&
    a.top < b.bottom - CONTACT_EPSILON &&
    a.bottom > b.top + CONTACT_EPSILON
  );
}

function colliders(state: BuilderState, excludeId?: number, includeCarried = false): Collider[] {
  const output = state.looseCubes.filter(({ id }) => id !== excludeId).map(cubeCollider);
  for (let index = 0; index < state.delivered.length; index++) {
    const block = getBuilderBlock(index);
    output.push({
      left: block.x,
      right: block.x + BUILDER_BLOCK_WIDTH,
      top: block.y,
      bottom: block.y + BUILDER_BLOCK_HEIGHT,
    });
  }
  if (state.falling && state.falling.id !== excludeId) output.push(cubeCollider(state.falling));
  const carried = includeCarried ? getCarriedBuilderCube(state) : null;
  if (carried && carried.id !== excludeId) output.push(cubeCollider(carried));
  return output;
}

function sweepCarried(state: BuilderState, axis: "x" | "y", desired: number): number {
  const carried = getCarriedBuilderCube(state);
  if (!carried) return desired;
  const box = cubeCollider(carried);
  const increasing = desired > carried[axis];
  let safe = desired;
  for (const obstacle of colliders(state)) {
    if (axis === "x") {
      if (
        box.top >= obstacle.bottom - CONTACT_EPSILON ||
        box.bottom <= obstacle.top + CONTACT_EPSILON
      )
        continue;
      if (
        increasing &&
        box.right <= obstacle.left + CONTACT_EPSILON &&
        desired + HALF_CUBE > obstacle.left
      )
        safe = Math.min(safe, obstacle.left - HALF_CUBE);
      else if (
        !increasing &&
        box.left >= obstacle.right - CONTACT_EPSILON &&
        desired - HALF_CUBE < obstacle.right
      )
        safe = Math.max(safe, obstacle.right + HALF_CUBE);
    } else {
      if (
        box.left >= obstacle.right - CONTACT_EPSILON ||
        box.right <= obstacle.left + CONTACT_EPSILON
      )
        continue;
      if (
        increasing &&
        box.bottom <= obstacle.top + CONTACT_EPSILON &&
        desired + HALF_CUBE > obstacle.top
      )
        safe = Math.min(safe, obstacle.top - HALF_CUBE);
      else if (
        !increasing &&
        box.top >= obstacle.bottom - CONTACT_EPSILON &&
        desired - HALF_CUBE < obstacle.bottom
      )
        safe = Math.max(safe, obstacle.bottom + HALF_CUBE);
    }
  }
  return axis === "y" ? Math.min(safe, BUILDER_GROUND_Y - HALF_CUBE) : safe;
}

function movementBounds(facing: -1 | 1) {
  return {
    min: facing === -1 ? BUILDER_BUCKET_REACH + 24 : 44,
    max: facing === 1 ? BUILDER_WORLD_WIDTH - BUILDER_BUCKET_REACH - 24 : BUILDER_WORLD_WIDTH - 44,
  };
}

export function moveBuilder(
  state: BuilderState,
  direction: -1 | 1,
  distance: number,
): BuilderState {
  if (!Number.isFinite(distance) || distance <= 0) return state;
  const bounds = movementBounds(state.facing);
  const desiredX = Math.max(
    bounds.min,
    Math.min(bounds.max, state.machineX + direction * distance),
  );
  const bucketX = sweepCarried(state, "x", desiredX + state.facing * BUILDER_BUCKET_REACH);
  const machineX = bucketX - state.facing * BUILDER_BUCKET_REACH;
  return machineX === state.machineX ? state : { ...state, machineX };
}

export function liftBuilderBucket(
  state: BuilderState,
  direction: -1 | 1,
  distance: number,
): BuilderState {
  if (!Number.isFinite(distance) || distance <= 0) return state;
  const desiredLift = Math.max(0, Math.min(1, state.lift + direction * distance));
  const bucketY = sweepCarried(
    state,
    "y",
    BUILDER_GROUND_Y - HALF_CUBE - desiredLift * BUILDER_BUCKET_TRAVEL,
  );
  const lift = Math.max(
    0,
    Math.min(1, (BUILDER_GROUND_Y - HALF_CUBE - bucketY) / BUILDER_BUCKET_TRAVEL),
  );
  return Math.abs(lift - state.lift) < CONTACT_EPSILON ? state : { ...state, lift };
}

export function turnBuilder(state: BuilderState): {
  state: BuilderState;
  outcome: "turned" | "edge" | "blocked";
} {
  const facing = state.facing === 1 ? -1 : 1;
  const bounds = movementBounds(facing);
  if (state.machineX < bounds.min || state.machineX > bounds.max) {
    if (state.carriedId !== null) return { state, outcome: "edge" };
    return {
      state: {
        ...state,
        facing,
        machineX: Math.max(bounds.min, Math.min(bounds.max, state.machineX)),
      },
      outcome: "turned",
    };
  }
  const destinationX = state.machineX + facing * BUILDER_BUCKET_REACH;
  if (Math.abs(sweepCarried(state, "x", destinationX) - destinationX) > CONTACT_EPSILON)
    return { state, outcome: "blocked" };
  return { state: { ...state, facing }, outcome: "turned" };
}

export type BuilderBucketOutcome =
  | "scooped"
  | "closed-empty"
  | "scoop-blocked"
  | "opened"
  | "released-on-target"
  | "released-away"
  | "released-too-low"
  | "falling"
  | "complete";

export function operateBuilderBucket(state: BuilderState): {
  state: BuilderState;
  outcome: BuilderBucketOutcome;
} {
  if (state.delivered.length === BUILDER_TOTAL_BLOCKS) return { state, outcome: "complete" };
  if (state.falling) return { state, outcome: "falling" };
  const bucket = getBuilderBucketPosition(state);
  if (state.carriedId !== null) {
    const target = getNextBuilderBlock(state);
    const aimed =
      target !== null &&
      Math.abs(bucket.x - (target.x + BUILDER_BLOCK_WIDTH / 2)) <= BUILDER_DELIVERY_TOLERANCE;
    const highEnough =
      target !== null &&
      bucket.y <= target.y + BUILDER_BLOCK_HEIGHT / 2 - BUILDER_CUBE_SIZE / 2 - 5;
    const receiving = aimed && highEnough ? target : null;
    return {
      state: {
        ...state,
        bucketOpen: true,
        carriedId: null,
        falling: { id: state.carriedId, ...bucket, velocityY: 0, target: receiving },
      },
      outcome: !aimed ? "released-away" : !highEnough ? "released-too-low" : "released-on-target",
    };
  }
  if (!state.bucketOpen) return { state: { ...state, bucketOpen: true }, outcome: "opened" };

  // The mouth must cover part of the loose cube before the bucket can curl around it.
  const cube = state.looseCubes.find(
    ({ x, y }) => Math.abs(x - bucket.x) <= 21 && Math.abs(y - bucket.y) <= 19,
  );
  if (!cube) return { state: { ...state, bucketOpen: false }, outcome: "closed-empty" };
  const looseCubes = state.looseCubes.filter(({ id }) => id !== cube.id);
  const lift = Math.max(
    0,
    Math.min(1, (BUILDER_GROUND_Y - HALF_CUBE - cube.y) / BUILDER_BUCKET_TRAVEL),
  );
  const centered = { ...state, lift };
  if (
    colliders(state, cube.id).some((obstacle) =>
      overlaps(cubeCollider(getBuilderBucketPosition(centered)), obstacle),
    )
  )
    return { state, outcome: "scoop-blocked" };
  return {
    state: {
      ...state,
      lift,
      bucketOpen: false,
      carriedId: cube.id,
      looseCubes,
      sourceId: cube.id === state.sourceId ? null : state.sourceId,
    },
    outcome: "scooped",
  };
}

function supported(state: BuilderState, cube: BuilderCube) {
  const box = cubeCollider(cube);
  if (Math.abs(box.bottom - BUILDER_GROUND_Y) < CONTACT_EPSILON) return true;
  return colliders(state, cube.id, true).some(
    (surface) =>
      Math.abs(box.bottom - surface.top) < CONTACT_EPSILON &&
      box.left < surface.right - CONTACT_EPSILON &&
      box.right > surface.left + CONTACT_EPSILON,
  );
}

function canDispense(state: BuilderState) {
  if (state.sourceId !== null || state.reserve.length === 0) return false;
  const slot = cubeCollider({ x: BUILDER_SUPPLY_X, y: BUILDER_GROUND_Y - HALF_CUBE });
  if (state.looseCubes.some((cube) => Math.abs(cube.x - BUILDER_SUPPLY_X) < BUILDER_CUBE_SIZE))
    return false;
  if (state.falling && Math.abs(state.falling.x - BUILDER_SUPPLY_X) < BUILDER_CUBE_SIZE)
    return false;
  const carried = getCarriedBuilderCube(state);
  return !carried || !overlaps(slot, cubeCollider(carried));
}

export function builderNeedsPhysics(state: BuilderState) {
  return (
    state.falling !== null ||
    canDispense(state) ||
    state.looseCubes.some((cube) => (cube.velocityY ?? 0) > 0 || !supported(state, cube))
  );
}

export function advanceBuilderPhysics(state: BuilderState, seconds: number): BuilderState {
  if (!Number.isFinite(seconds) || seconds <= 0 || !builderNeedsPhysics(state)) return state;
  // Swept vertical contacts remain safe even when a frame arrives late.
  const elapsed = Math.min(seconds, 2);
  const steps = Math.max(1, Math.ceil(elapsed / 0.025));
  const delta = elapsed / steps;
  let next = state;
  for (let step = 0; step < steps; step++) {
    const bodies = [
      ...next.looseCubes.map((cube) => ({ cube, released: false })),
      ...(next.falling ? [{ cube: next.falling, released: true }] : []),
    ].sort((a, b) => b.cube.y - a.cube.y);
    for (const body of bodies) {
      const cube = body.released
        ? next.falling
        : next.looseCubes.find(({ id }) => id === body.cube.id);
      if (!cube) continue;
      const velocityY = (cube.velocityY ?? 0) + 620 * delta;
      const desiredY = cube.y + velocityY * delta;
      const box = cubeCollider(cube);
      let landingY = BUILDER_GROUND_Y - HALF_CUBE;
      for (const surface of colliders(next, cube.id, true)) {
        if (
          box.left >= surface.right - CONTACT_EPSILON ||
          box.right <= surface.left + CONTACT_EPSILON
        )
          continue;
        if (box.bottom <= surface.top + CONTACT_EPSILON)
          landingY = Math.min(landingY, surface.top - HALF_CUBE);
      }
      const landed = desiredY >= landingY - CONTACT_EPSILON;
      const y = landed ? landingY : desiredY;
      if (body.released) {
        const target = next.falling!.target;
        const expectedY = target ? target.y + BUILDER_BLOCK_HEIGHT - HALF_CUBE : Number.NaN;
        if (
          landed &&
          target &&
          Math.abs(y - expectedY) < CONTACT_EPSILON &&
          !next.delivered.includes(cube.id)
        )
          next = { ...next, falling: null, delivered: [...next.delivered, cube.id] };
        else if (landed)
          next = {
            ...next,
            falling: null,
            looseCubes: [...next.looseCubes, { id: cube.id, x: cube.x, y, velocityY: 0 }],
          };
        else next = { ...next, falling: { ...next.falling!, y, velocityY } };
      } else {
        next = {
          ...next,
          looseCubes: next.looseCubes.map((item) =>
            item.id === cube.id ? { ...item, y, velocityY: landed ? 0 : velocityY } : item,
          ),
        };
      }
    }
    if (canDispense(next)) {
      const sourceId = next.reserve[0]!;
      next = {
        ...next,
        sourceId,
        reserve: next.reserve.slice(1),
        looseCubes: [
          ...next.looseCubes,
          { id: sourceId, x: BUILDER_SUPPLY_X, y: BUILDER_GROUND_Y - HALF_CUBE },
        ],
      };
    }
  }
  return next;
}
