import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createMeteorRock } from "./meteor-rock";

const liveFragments = [
  { seed: 32, resolution: 20, faces: 6880 },
  { seed: 119, resolution: 18, faces: 5548 },
  { seed: 721, resolution: 14, faces: 3044 },
  { seed: 239, resolution: 14, faces: 3084 },
  { seed: 1411, resolution: 14, faces: 2840 },
  { seed: 61, resolution: 14, faces: 2908 },
];

function topology(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const vertices = new Map<string, number>();
  const edges = new Map<string, { count: number; orientation: number }>();
  let degenerateFaces = 0;
  let volume = 0;
  for (let face = 0; face < positions.count; face += 3) {
    const points = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(positions, face + offset),
    );
    const ids = points.map((point) => {
      const key = `${point.x},${point.y},${point.z}`;
      if (!vertices.has(key)) vertices.set(key, vertices.size);
      return vertices.get(key)!;
    });
    const cross = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .cross(new THREE.Vector3().subVectors(points[2], points[0]));
    if (cross.lengthSq() < 1e-20 || new Set(ids).size !== 3) degenerateFaces++;
    volume += points[0].dot(new THREE.Vector3().crossVectors(points[1], points[2])) / 6;
    for (let edge = 0; edge < 3; edge++) {
      const from = ids[edge];
      const to = ids[(edge + 1) % 3];
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const value = edges.get(key) ?? { count: 0, orientation: 0 };
      value.count++;
      value.orientation += from < to ? 1 : -1;
      edges.set(key, value);
    }
  }
  return {
    faces: positions.count / 3,
    unpairedEdges: [...edges.values()].filter((edge) => edge.count !== 2).length,
    reversedEdges: [...edges.values()].filter((edge) => edge.count === 2 && edge.orientation !== 0)
      .length,
    degenerateFaces,
    volume,
  };
}

describe("live meteor meshes", () => {
  it.each(liveFragments)(
    "seed $seed is closed and consistently outward without extra faces",
    ({ seed, resolution, faces }) => {
      const model = createMeteorRock(THREE, seed, resolution);
      const mesh = model.children[0] as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
      try {
        const result = topology(mesh.geometry);
        expect(result.faces).toBe(faces);
        expect(result.degenerateFaces).toBe(0);
        expect(result.unpairedEdges).toBe(0);
        expect(result.reversedEdges).toBe(0);
        expect(result.volume).toBeGreaterThan(0);
        expect(mesh.material.side).toBe(THREE.FrontSide);
        expect(mesh.material.transparent).toBe(false);
        expect(mesh.material.opacity).toBe(1);
      } finally {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  );

  it.each(liveFragments)(
    "seed $seed exposes the same first hit with front-face raycasting",
    ({ seed, resolution }) => {
      const model = createMeteorRock(THREE, seed, resolution);
      const mesh = model.children[0] as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
      mesh.updateMatrixWorld(true);
      const raycaster = new THREE.Raycaster();
      try {
        for (let ray = 0; ray < 18; ray++) {
          const z = 1 - ((ray + 0.5) / 18) * 2;
          const angle = ray * Math.PI * (3 - Math.sqrt(5));
          const radial = Math.sqrt(1 - z * z);
          const origin = new THREE.Vector3(
            Math.cos(angle) * radial,
            Math.sin(angle) * radial,
            z,
          ).multiplyScalar(3);
          raycaster.set(origin, origin.clone().negate().normalize());
          mesh.material.side = THREE.DoubleSide;
          const twoSided = raycaster.intersectObject(mesh)[0];
          mesh.material.side = THREE.FrontSide;
          const front = raycaster.intersectObject(mesh)[0];
          expect(twoSided, `reference hit for ray ${ray}`).toBeDefined();
          expect(front, `front-face hit for ray ${ray}`).toBeDefined();
          expect(front.distance).toBeCloseTo(twoSided.distance, 6);
        }
      } finally {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  );
});
