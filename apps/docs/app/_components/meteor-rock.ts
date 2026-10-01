import type * as Three from "three";

type Point = [number, number, number];
type Lobe = { center: Point; radius: Point };
type ThreeModule = typeof Three;

const CUBE: Point[] = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const TETRAHEDRA = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];

/** A carved volume, rather than a displaced sphere, allows broken overhangs and deep sockets. */
export function createMeteorRock(THREE: ThreeModule, seed: number, resolution = 20) {
  let randomSeed = seed;
  const random = () => {
    randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const lobes: Lobe[] = [
    { center: [-0.29, 0.27, -0.12], radius: [0.66, 0.62, 0.61] },
    { center: [0.29, 0.18, 0.07], radius: [0.64, 0.72, 0.59] },
    { center: [0.03, -0.34, -0.08], radius: [0.64, 0.65, 0.65] },
    { center: [-0.37, -0.2, 0.2], radius: [0.55, 0.53, 0.52] },
  ].map((lobe) => ({
    center: lobe.center.map((value) => value + (random() - 0.5) * 0.2) as Point,
    radius: lobe.radius.map((value) => value * (0.88 + random() * 0.22)) as Point,
  }));
  const cavities: Lobe[] = [
    { center: [0.16, 0.12, 0.75], radius: [0.39, 0.34, 0.49] },
    { center: [-0.61, 0.39, 0.35], radius: [0.35, 0.29, 0.32] },
    { center: [0.55, -0.46, 0.29], radius: [0.28, 0.33, 0.36] },
    { center: [-0.18, -0.27, -0.69], radius: [0.37, 0.3, 0.36] },
    { center: [0.51, 0.6, -0.19], radius: [0.32, 0.25, 0.3] },
  ].map((lobe) => ({
    center: lobe.center.map((value) => value + (random() - 0.5) * 0.18) as Point,
    radius: lobe.radius.map((value) => value * (0.85 + random() * 0.3)) as Point,
  }));

  function cavityDistance(x: number, y: number, z: number) {
    let nearest = 5;
    for (const cavity of cavities) {
      const px = Math.abs((x - cavity.center[0]) / cavity.radius[0]);
      const py = Math.abs((y - cavity.center[1]) / cavity.radius[1]);
      const pz = Math.abs((z - cavity.center[2]) / cavity.radius[2]);
      const distance = (Math.pow(px ** 4 + py ** 4 + pz ** 4, 0.25) - 1) * 0.32;
      nearest = Math.min(nearest, distance);
    }
    return nearest;
  }

  function density(x: number, y: number, z: number) {
    let volume = -5;
    for (const lobe of lobes) {
      volume = Math.max(
        volume,
        (1 -
          Math.hypot(
            (x - lobe.center[0]) / lobe.radius[0],
            (y - lobe.center[1]) / lobe.radius[1],
            (z - lobe.center[2]) / lobe.radius[2],
          )) *
          0.58,
      );
    }
    const erosion =
      Math.sin(x * 8.4 + seed) *
      Math.sin(y * 9.1 - seed * 0.2) *
      Math.sin(z * 7.8 + seed * 0.13) *
      0.072;
    const chips =
      (hash(Math.floor(x * 18), Math.floor(y * 18) + Math.floor(z * 18) * 53, seed) - 0.5) * 0.027;
    volume += erosion + chips;
    return Math.min(volume, cavityDistance(x, y, z) + Math.sin(x * 22 + y * 17 - z * 13) * 0.018);
  }

  const extent = 1.24;
  const step = (extent * 2) / resolution;
  const side = resolution + 1;
  const samples = new Float32Array(side ** 3);
  const offset = (x: number, y: number, z: number) => x + y * side + z * side * side;
  for (let z = 0; z < side; z++) {
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++)
        samples[offset(x, y, z)] = density(x * step - extent, y * step - extent, z * step - extent);
    }
  }

  const vertices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const normal = (point: Point): Point => {
    const [x, y, z] = point;
    const epsilon = 0.008;
    const nx = density(x - epsilon, y, z) - density(x + epsilon, y, z);
    const ny = density(x, y - epsilon, z) - density(x, y + epsilon, z);
    const nz = density(x, y, z - epsilon) - density(x, y, z + epsilon);
    const length = Math.hypot(nx, ny, nz) || 1;
    return [nx / length, ny / length, nz / length];
  };

  function triangle(a: Point, b: Point, c: Point, outward: Point) {
    const na = normal(a);
    const ab = b.map((value, axis) => value - a[axis]);
    const ac = c.map((value, axis) => value - a[axis]);
    const cross: Point = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    // Sampled inside/outside vertices determine the isosurface's orientation.
    // Fine surface gradients remain useful for shading, but can reverse at a chipped edge.
    const ordered =
      cross[0] * outward[0] + cross[1] * outward[1] + cross[2] * outward[2] < 0
        ? [a, c, b]
        : [a, b, c];
    ordered.forEach((point) => {
      vertices.push(...point);
      normals.push(...(point === a ? na : normal(point)));
      // Occluded sockets stay almost black even when their lip catches the key light.
      const occlusion = cavityDistance(...point) < 0.045 ? 0.12 : 1;
      colors.push(occlusion, occlusion, occlusion);
    });
  }

  for (let z = 0; z < resolution; z++) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const values = CUBE.map(([cx, cy, cz]) => samples[offset(x + cx, y + cy, z + cz)]);
        if (values.every((value) => value < 0) || values.every((value) => value >= 0)) continue;
        const points: Point[] = CUBE.map(([cx, cy, cz]) => [
          (x + cx) * step - extent,
          (y + cy) * step - extent,
          (z + cz) * step - extent,
        ]);
        const edge = (inside: number, outside: number): Point => {
          const t = values[inside] / (values[inside] - values[outside]);
          return points[inside].map(
            (value, axis) => value + (points[outside][axis] - value) * t,
          ) as Point;
        };
        for (const tetrahedron of TETRAHEDRA) {
          const inside = tetrahedron.filter((index) => values[index] >= 0);
          const outside = tetrahedron.filter((index) => values[index] < 0);
          if (!inside.length || !outside.length) continue;
          const outward = [0, 1, 2].map(
            (axis) =>
              outside.reduce((sum, index) => sum + points[index][axis], 0) / outside.length -
              inside.reduce((sum, index) => sum + points[index][axis], 0) / inside.length,
          ) as Point;
          if (inside.length === 1)
            triangle(
              edge(inside[0], outside[0]),
              edge(inside[0], outside[1]),
              edge(inside[0], outside[2]),
              outward,
            );
          else if (inside.length === 3)
            triangle(
              edge(inside[0], outside[0]),
              edge(inside[1], outside[0]),
              edge(inside[2], outside[0]),
              outward,
            );
          else if (inside.length === 2) {
            const a = edge(inside[0], outside[0]);
            const b = edge(inside[0], outside[1]);
            const c = edge(inside[1], outside[0]);
            const d = edge(inside[1], outside[1]);
            triangle(a, b, c, outward);
            triangle(b, d, c, outward);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.025,
  });
  applyMineralSurface(material, seed);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  return group;
}

/** Continuous object-space fields follow every cavity without UV seams or square texels. */
function applyMineralSurface(material: Three.MeshStandardMaterial, seed: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rockSeed = { value: seed * 0.173 };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vRockPosition;\nvarying vec3 vRockObjectNormal;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRockPosition = position;\nvRockObjectNormal = normal;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float rockSeed;
        varying vec3 vRockPosition;
        varying vec3 vRockObjectNormal;
        float mineralHash(vec3 point) {
          point = fract(point * 0.1031);
          point += dot(point, point.yzx + 33.33);
          return fract((point.x + point.y) * point.z);
        }
        float mineralNoise(vec3 point) {
          vec3 cell = floor(point);
          vec3 t = fract(point);
          t = t * t * (3.0 - 2.0 * t);
          return mix(
            mix(mix(mineralHash(cell), mineralHash(cell + vec3(1.0, 0.0, 0.0)), t.x),
                mix(mineralHash(cell + vec3(0.0, 1.0, 0.0)), mineralHash(cell + vec3(1.0, 1.0, 0.0)), t.x), t.y),
            mix(mix(mineralHash(cell + vec3(0.0, 0.0, 1.0)), mineralHash(cell + vec3(1.0, 0.0, 1.0)), t.x),
                mix(mineralHash(cell + vec3(0.0, 1.0, 1.0)), mineralHash(cell + vec3(1.0, 1.0, 1.0)), t.x), t.y), t.z);
        }
      `,
      )
      .replace(
        "#include <map_fragment>",
        `
        vec3 mineralPoint = vRockPosition + vec3(rockSeed * 0.123, rockSeed * 0.311, rockSeed * 0.719);
        float weather = mineralNoise(mineralPoint * 2.1);
        vec3 warpedPoint = mineralPoint + vec3(weather - 0.5) * 0.16;
        float strata = mineralNoise(warpedPoint * 7.2);
        float smallPits = mineralNoise(warpedPoint * 23.0);
        float fineGrain = mineralNoise(warpedPoint * 58.0);
        vec3 grainFootprint = fwidth(warpedPoint * 58.0);
        float grainVisibility = 1.0 - smoothstep(0.45, 1.35, max(grainFootprint.x, max(grainFootprint.y, grainFootprint.z)));
        fineGrain = mix(0.5, fineGrain, grainVisibility);
        float outward = smoothstep(0.05, 0.8, dot(normalize(vRockObjectNormal), normalize(vRockPosition)));
        float topExposure = dot(normalize(vRockObjectNormal), normalize(vec3(-0.5, 0.85, 0.3)));
        float crustField = weather * 0.46 + strata * 0.14 + topExposure * 0.14 + vRockPosition.y * 0.1 + outward * 0.18;
        float rockCrust = smoothstep(0.41, 0.60, crustField) * outward;
        float fissureField = abs(strata - 0.47);
        float fissureWidth = max(0.012, fwidth(strata) * 1.1);
        float rockFissures = 1.0 - smoothstep(fissureWidth * 0.25, fissureWidth, fissureField);
        float pitMask = 1.0 - smoothstep(0.26, 0.43, smallPits);
        vec3 petrol = mix(vec3(0.002, 0.018, 0.024), vec3(0.005, 0.045, 0.052), strata);
        vec3 turquoiseCrust = mix(vec3(0.014, 0.33, 0.34), vec3(0.17, 0.72, 0.65), weather);
        vec3 mineralColor = mix(petrol, turquoiseCrust, rockCrust);
        mineralColor *= 0.88 + smallPits * 0.16 + fineGrain * 0.12;
        mineralColor = mix(mineralColor, vec3(0.001, 0.009, 0.013), rockFissures * 0.76);
        mineralColor *= 1.0 - pitMask * 0.29;
        diffuseColor.rgb *= mineralColor;
        float rockRelief = strata * 0.014 + smallPits * 0.006 + fineGrain * 0.0025 - rockFissures * 0.006;
      `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(mix(0.98, 0.73, rockCrust) + rockFissures * 0.08, 0.65, 1.0);
      `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 rockDx = dFdx(-vViewPosition);
        vec3 rockDy = dFdy(-vViewPosition);
        vec3 rockR1 = cross(rockDy, normal);
        vec3 rockR2 = cross(normal, rockDx);
        float rockDet = dot(rockDx, rockR1);
        vec3 rockGradient = sign(rockDet) * (dFdx(rockRelief) * rockR1 + dFdy(rockRelief) * rockR2);
        normal = normalize(abs(rockDet) * normal - rockGradient);
      `,
      );
  };
  // Uniform seed variation shares one compiled PBR program across all six fragments.
  material.customProgramCacheKey = () => "bao-continuous-mineral-v1";
}

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
