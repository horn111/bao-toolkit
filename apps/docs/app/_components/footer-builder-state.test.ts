import { describe, expect, it } from "vitest";
import {
  BUILDER_BLOCK_WIDTH,
  BUILDER_BLOCK_HEIGHT,
  BUILDER_BUILDING_X,
  BUILDER_BUCKET_REACH,
  BUILDER_CUBE_SIZE,
  BUILDER_GROUND_Y,
  BUILDER_SUPPLY_X,
  BUILDER_TOTAL_BLOCKS,
  advanceBuilderPhysics,
  builderNeedsPhysics,
  createBuilderState,
  getBuilderBucketPosition,
  getCarriedBuilderCube,
  getNextBuilderBlock,
  liftBuilderBucket,
  moveBuilder,
  operateBuilderBucket,
  turnBuilder,
  type BuilderState,
} from "./footer-builder-state";

function settle(state: BuilderState) {
  for (let step = 0; step < 150 && builderNeedsPhysics(state); step++)
    state = advanceBuilderPhysics(state, 0.02);
  return state;
}

function scoopSource(state: BuilderState) {
  const ready = {
    ...state,
    machineX: BUILDER_SUPPLY_X - BUILDER_BUCKET_REACH,
    lift: 0,
    bucketOpen: true,
  };
  const result = operateBuilderBucket(ready);
  expect(result.outcome).toBe("scooped");
  return result.state;
}

function aimAtNextBlock(state: BuilderState) {
  const target = getNextBuilderBlock(state)!;
  return { ...state, machineX: target.x + BUILDER_BLOCK_WIDTH / 2 - BUILDER_BUCKET_REACH, lift: 1 };
}

function idsInWorkshop(state: BuilderState) {
  return [
    ...state.reserve,
    ...state.looseCubes.map(({ id }) => id),
    ...state.delivered,
    ...(state.carriedId === null ? [] : [state.carriedId]),
    ...(state.falling ? [state.falling.id] : []),
  ];
}

describe("footer excavator workshop", () => {
  it("only scoops when an open bucket physically overlaps a loose cube", () => {
    const initial = createBuilderState();
    const high = operateBuilderBucket(initial);
    expect(high.outcome).toBe("closed-empty");
    expect(high.state.carriedId).toBeNull();
    const reopened = operateBuilderBucket(high.state);
    expect(reopened.outcome).toBe("opened");
    const lowered = liftBuilderBucket(reopened.state, -1, 1);
    const farAway = operateBuilderBucket(moveBuilder(lowered, 1, 60));
    expect(farAway.outcome).toBe("closed-empty");
    const picked = operateBuilderBucket(lowered);
    expect(picked.outcome).toBe("scooped");
    expect(picked.state.carriedId).toBe(0);
    expect(picked.state.bucketOpen).toBe(false);
    expect(picked.state.looseCubes.some(({ id }) => id === 0)).toBe(false);
    expect(picked.state.sourceId).toBeNull();
    expect(advanceBuilderPhysics(picked.state, 1).sourceId).toBeNull();
    const cleared = advanceBuilderPhysics(liftBuilderBucket(picked.state, 1, 1), 0.02);
    expect(cleared.sourceId).toBe(1);
    expect(cleared.looseCubes.some(({ id }) => id === 0)).toBe(false);
    expect(initial.carriedId).toBeNull();
  });

  it("carries exactly one cube with the bucket through movement and lifting", () => {
    let state = scoopSource(createBuilderState());
    expect(getCarriedBuilderCube(state)).toMatchObject({
      id: 0,
      ...getBuilderBucketPosition(state),
    });
    state = liftBuilderBucket(moveBuilder(state, 1, 140), 1, 0.8);
    expect(getCarriedBuilderCube(state)).toEqual({ id: 0, ...getBuilderBucketPosition(state) });
    const opened = operateBuilderBucket(state);
    expect(opened.state.carriedId).toBeNull();
    expect(opened.state.falling?.id).toBe(0);
    expect(operateBuilderBucket(opened.state)).toEqual({ state: opened.state, outcome: "falling" });
    expect(new Set(idsInWorkshop(opened.state)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("drops a missed cube onto the ground and allows recovery without adding a block", () => {
    const state = liftBuilderBucket(moveBuilder(scoopSource(createBuilderState()), 1, 90), 1, 0.8);
    const release = operateBuilderBucket(state);
    expect(release.outcome).toBe("released-away");
    const landed = settle(release.state);
    expect(landed.delivered).toEqual([]);
    expect(landed.looseCubes.find(({ id }) => id === 0)?.y).toBe(BUILDER_GROUND_Y - 11);
    const recovered = operateBuilderBucket({ ...landed, lift: 0 });
    expect(recovered.outcome).toBe("scooped");
    expect(recovered.state.carriedId).toBe(0);
    expect(recovered.state.reserve).toEqual(landed.reserve);
    expect(new Set(idsInWorkshop(recovered.state)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("requires release above the receiving outline and only counts a cube after it lands", () => {
    const aimed = aimAtNextBlock(scoopSource(createBuilderState()));
    const tooLow = operateBuilderBucket({ ...aimed, lift: 0 });
    expect(tooLow.outcome).toBe("released-too-low");
    expect(settle(tooLow.state).delivered).toEqual([]);
    const released = operateBuilderBucket(aimed);
    expect(released.outcome).toBe("released-on-target");
    expect(released.state.delivered).toEqual([]);
    const falling = advanceBuilderPhysics(released.state, 0.02);
    expect(falling.falling!.y).toBeGreaterThan(released.state.falling!.y);
    expect(falling.delivered).toEqual([]);
    const landed = settle(falling);
    expect(landed.delivered).toEqual([0]);
    expect(advanceBuilderPhysics(landed, 1)).toBe(landed);
  });

  it("builds 16 unique blocks, preserves every cube, and restarts with an empty foundation", () => {
    let state = createBuilderState();
    for (let block = 0; block < BUILDER_TOTAL_BLOCKS; block++) {
      const sourceDistance = BUILDER_SUPPLY_X - getBuilderBucketPosition(state).x;
      state = moveBuilder(state, sourceDistance < 0 ? -1 : 1, Math.abs(sourceDistance));
      state = liftBuilderBucket(state, -1, 1);
      state = operateBuilderBucket(state).state;
      expect(state.carriedId).not.toBeNull();
      state = liftBuilderBucket(state, 1, 1);
      state = advanceBuilderPhysics(state, 0.02);
      const target = getNextBuilderBlock(state)!;
      const targetDistance = target.x + BUILDER_BLOCK_WIDTH / 2 - getBuilderBucketPosition(state).x;
      state = moveBuilder(state, targetDistance < 0 ? -1 : 1, Math.abs(targetDistance));
      expect(getBuilderBucketPosition(state).x).toBe(target.x + BUILDER_BLOCK_WIDTH / 2);
      const released = operateBuilderBucket(state);
      expect(released.outcome).toBe("released-on-target");
      state = settle(released.state);
      expect(state.delivered.length).toBe(block + 1);
      expect(idsInWorkshop(state)).toHaveLength(BUILDER_TOTAL_BLOCKS);
      expect(new Set(idsInWorkshop(state)).size).toBe(BUILDER_TOTAL_BLOCKS);
    }
    expect(getNextBuilderBlock(state)).toBeNull();
    expect(state.looseCubes).toEqual([]);
    expect(state.reserve).toEqual([]);
    expect(operateBuilderBucket(state)).toEqual({ state, outcome: "complete" });
    const reset = createBuilderState();
    expect(reset.delivered).toEqual([]);
    expect(reset.carriedId).toBeNull();
    expect(reset.falling).toBeNull();
    expect(reset.bucketOpen).toBe(true);
    expect(idsInWorkshop(reset)).toHaveLength(BUILDER_TOTAL_BLOCKS);
  });

  it("turns the cab and real bucket position, keeping both directions inside the world", () => {
    const initial = createBuilderState();
    const turned = turnBuilder(initial);
    expect(turned.outcome).toBe("turned");
    expect(turned.state.facing).toBe(-1);
    expect(turned.state.machineX).toBe(BUILDER_BUCKET_REACH + 24);
    expect(getBuilderBucketPosition(turned.state).x).toBe(24);
    const edge = moveBuilder(turned.state, -1, 10000);
    expect(getBuilderBucketPosition(edge).x).toBe(24);
    const reversed = turnBuilder(edge).state;
    expect(reversed.facing).toBe(1);
    expect(getBuilderBucketPosition(reversed).x).toBe(reversed.machineX + BUILDER_BUCKET_REACH);
    const rightEdge = moveBuilder(reversed, 1, 10000);
    expect(getBuilderBucketPosition(rightEdge).x).toBe(720 - 24);
  });

  it("rejects loaded turns at the edge or through cubes, then allows a clear raised turn", () => {
    const picked = scoopSource(createBuilderState());
    expect(turnBuilder(picked)).toEqual({ state: picked, outcome: "edge" });
    const moved = moveBuilder(picked, 1, 100);
    const blocked: BuilderState = {
      ...moved,
      looseCubes: [{ id: 1, x: 230, y: BUILDER_GROUND_Y - BUILDER_CUBE_SIZE / 2 }],
      sourceId: 1,
      reserve: moved.reserve.filter((id) => id !== 1),
    };
    expect(turnBuilder(blocked)).toEqual({ state: blocked, outcome: "blocked" });
    const raised = liftBuilderBucket(blocked, 1, 1);
    const turned = turnBuilder(raised);
    expect(turned.outcome).toBe("turned");
    expect(turned.state.facing).toBe(-1);
    expect(getCarriedBuilderCube(turned.state)).toMatchObject({
      id: 0,
      x: moved.machineX - BUILDER_BUCKET_REACH,
    });
    expect(new Set(idsInWorkshop(turned.state)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("drops onto another loose cube without overlap even with a late physics frame", () => {
    let state = liftBuilderBucket(scoopSource(createBuilderState()), 1, 1);
    state = advanceBuilderPhysics(state, 0.02);
    expect(state.sourceId).toBe(1);
    const release = operateBuilderBucket(state);
    expect(release.outcome).toBe("released-away");
    const stacked = advanceBuilderPhysics(release.state, 10);
    const lower = stacked.looseCubes.find(({ id }) => id === 1)!;
    const upper = stacked.looseCubes.find(({ id }) => id === 0)!;
    expect(lower.y).toBe(BUILDER_GROUND_Y - BUILDER_CUBE_SIZE / 2);
    expect(upper.y).toBe(lower.y - BUILDER_CUBE_SIZE);
    expect(stacked.delivered).toEqual([]);
    expect(stacked.falling).toBeNull();
    expect(builderNeedsPhysics(stacked)).toBe(false);
    expect(new Set(idsInWorkshop(stacked)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("lets upper cubes settle after the lower cube is scooped and slides away", () => {
    let state = advanceBuilderPhysics(
      liftBuilderBucket(scoopSource(createBuilderState()), 1, 1),
      0.02,
    );
    state = settle(operateBuilderBucket(state).state);
    const picked = operateBuilderBucket(liftBuilderBucket(state, -1, 1));
    expect(picked.outcome).toBe("scooped");
    expect(picked.state.carriedId).toBe(1);
    // The held bottom cube still supports the upper one until it moves sideways.
    expect(liftBuilderBucket(picked.state, 1, 1).lift).toBe(0);
    const moved = moveBuilder(picked.state, -1, 32);
    expect(builderNeedsPhysics(moved)).toBe(true);
    const settled = advanceBuilderPhysics(moved, 2);
    expect(settled.looseCubes.find(({ id }) => id === 0)?.y).toBe(
      BUILDER_GROUND_Y - BUILDER_CUBE_SIZE / 2,
    );
    expect(settled.sourceId).toBeNull();
    expect(new Set(idsInWorkshop(settled)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("stops a carried cube at building walls and roofs instead of tunneling", () => {
    let state = settle(
      operateBuilderBucket(aimAtNextBlock(scoopSource(createBuilderState()))).state,
    );
    state = scoopSource(state);
    const atWall = moveBuilder(state, 1, 10000);
    expect(getCarriedBuilderCube(atWall)!.x + BUILDER_CUBE_SIZE / 2).toBe(BUILDER_BUILDING_X);
    const raised = liftBuilderBucket(atWall, 1, 1);
    const above = moveBuilder(raised, 1, BUILDER_BLOCK_WIDTH / 2 + BUILDER_CUBE_SIZE / 2);
    const lowered = liftBuilderBucket(above, -1, 1);
    expect(getCarriedBuilderCube(lowered)!.y + BUILDER_CUBE_SIZE / 2).toBe(
      BUILDER_GROUND_Y - BUILDER_BLOCK_HEIGHT,
    );
    expect(liftBuilderBucket(lowered, -1, 10000)).toBe(lowered);
  });

  it("lands a missed cube on a completed building block rather than through it", () => {
    let state = settle(
      operateBuilderBucket(aimAtNextBlock(scoopSource(createBuilderState()))).state,
    );
    state = liftBuilderBucket(scoopSource(state), 1, 1);
    const distance =
      BUILDER_BUILDING_X + BUILDER_BLOCK_WIDTH / 2 - getBuilderBucketPosition(state).x;
    state = moveBuilder(state, 1, distance);
    const release = operateBuilderBucket(state);
    expect(release.outcome).toBe("released-away");
    const landed = advanceBuilderPhysics(release.state, 10);
    expect(landed.looseCubes.find(({ id }) => id === 1)?.y).toBe(
      BUILDER_GROUND_Y - BUILDER_BLOCK_HEIGHT - BUILDER_CUBE_SIZE / 2,
    );
    expect(landed.delivered).toEqual([0]);
    expect(new Set(idsInWorkshop(landed)).size).toBe(BUILDER_TOTAL_BLOCKS);
  });

  it("bounds track movement and bucket travel and ignores invalid input", () => {
    const initial = createBuilderState();
    expect(moveBuilder(initial, -1, 10000).machineX).toBe(44);
    expect(liftBuilderBucket(initial, -1, 10000).lift).toBe(0);
    expect(liftBuilderBucket(initial, 1, 10000).lift).toBe(1);
    expect(moveBuilder(initial, 1, Number.NaN)).toBe(initial);
    expect(liftBuilderBucket(initial, 1, -5)).toBe(initial);
    expect(advanceBuilderPhysics(initial, Number.NaN)).toBe(initial);
  });
});
