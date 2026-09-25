/**
 * Hand-built, navigable interpretation of the artist's UE xianxia street.
 * Reference: UE仙侠 (4) street, (5) side lane, (6) plan view. No source mesh
 * or photogrammetry was available, so this is a new procedural construction.
 *
 * createFantasyStreet(THREE, { mobile }) -> { scene, target, views }
 * View positions and targets are plain [x, y, z] arrays.
 */
export function createFantasyStreet(THREE, { mobile = false } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdde5df);
  scene.fog = new THREE.Fog(0xdde5df, 100, 235);

  const rand = mulberry32(20260925);
  const warm = new THREE.Color(0xffe0b2);
  scene.add(new THREE.HemisphereLight(0xdce7ec, 0x615345, 2.25));
  const sunlight = new THREE.DirectionalLight(warm, 2.9);
  sunlight.position.set(-27, 42, 24);
  sunlight.target.position.set(0, 0, -4);
  sunlight.castShadow = !mobile;
  sunlight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sunlight.shadow.camera.left = -52;
  sunlight.shadow.camera.right = 52;
  sunlight.shadow.camera.top = 52;
  sunlight.shadow.camera.bottom = -52;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 115;
  sunlight.shadow.bias = -0.0005;
  scene.add(sunlight, sunlight.target);
  const fill = new THREE.DirectionalLight(0xadc5d4, 0.8);
  fill.position.set(23, 18, -30);
  scene.add(fill);

  const tex = makeTextures(THREE, rand);
  const mat = {
    plaster: new THREE.MeshStandardMaterial({ color: 0xf4eee0, map: tex.plaster, roughness: 1 }),
    plasterLight: new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.plaster, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xe2dfd8, map: tex.stone, roughness: 0.98 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0xadb0a9, map: tex.stone, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xd2b69b, map: tex.wood, roughness: 0.93 }),
    woodWarm: new THREE.MeshStandardMaterial({ color: 0xf4c49b, map: tex.wood, roughness: 0.91 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x786258, map: tex.wood, roughness: 0.95 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe4ccb0, emissive: 0x7d4a1f, emissiveIntensity: 0.15, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xd3d9d9, map: tex.roof, roughness: 0.94, side: THREE.DoubleSide }),
    ridge: new THREE.MeshStandardMaterial({ color: 0x687279, roughness: 0.89 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc77667, map: tex.red, roughness: 0.92, side: THREE.DoubleSide }),
    redBright: new THREE.MeshStandardMaterial({ color: 0xe28f76, map: tex.red, roughness: 0.9, side: THREE.DoubleSide }),
    ochre: new THREE.MeshStandardMaterial({ color: 0xb89955, roughness: 0.88, side: THREE.DoubleSide }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x738b62, roughness: 1, flatShading: true }),
    foliageLight: new THREE.MeshStandardMaterial({ color: 0x96a77a, roughness: 1, flatShading: true }),
    blossom: new THREE.MeshStandardMaterial({ color: 0xb38269, roughness: 1, flatShading: true }),
    lantern: new THREE.MeshStandardMaterial({ color: 0xe9a745, emissive: 0xff8b25, emissiveIntensity: 1.25, roughness: 0.72 }),
  };

  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 9),
    lantern: new THREE.SphereGeometry(1, 10, 8),
    leaf: new THREE.IcosahedronGeometry(1, 1),
    cone: new THREE.ConeGeometry(1, 1, 14),
  };
  const batches = new Map();
  const up = new THREE.Vector3(0, 1, 0);
  const ident = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const vector = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const localMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();

  function instance(shape, key, x, y, z, sx, sy, sz, angle = 0, parent = null) {
    const id = `${shape}:${key}`;
    if (!batches.has(id)) batches.set(id, { shape, key, matrices: [] });
    vector.set(x, y, z);
    quaternion.setFromAxisAngle(up, angle);
    scale.set(sx, sy, sz);
    localMatrix.compose(vector, quaternion, scale);
    if (parent) worldMatrix.multiplyMatrices(parent, localMatrix);
    else worldMatrix.copy(localMatrix);
    batches.get(id).matrices.push(worldMatrix.clone());
  }
  function box(key, x, y, z, w, h, d, parent = null, angle = 0) {
    instance('box', key, x, y, z, w, h, d, angle, parent);
  }
  function cylinder(key, x, y, z, radius, height, parent = null) {
    instance('cylinder', key, x, y, z, radius, height, radius, 0, parent);
  }
  function between(key, a, b, radius, parent = null) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const mid = start.add(end).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(up, delta.clone().normalize());
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(radius, delta.length(), radius));
    if (parent) m.premultiply(parent);
    const id = `cylinder:${key}`;
    if (!batches.has(id)) batches.set(id, { shape: 'cylinder', key, matrices: [] });
    batches.get(id).matrices.push(m);
  }
  function transformedMesh(mesh, parent) {
    mesh.applyMatrix4(parent);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Low ground and stone street are built all the way round. The houses have
  // finished back and side elevations; rotation reveals geometry, not a card.
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(290, 290), new THREE.MeshStandardMaterial({ color: 0xb3b9a4, map: tex.earth, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = -0.24;
  soil.receiveShadow = true;
  scene.add(soil);
  const pavement = new THREE.Mesh(new THREE.PlaneGeometry(12.7, 90), new THREE.MeshStandardMaterial({ color: 0xe3e0d5, map: tex.paving, roughness: 0.96 }));
  pavement.rotation.x = -Math.PI / 2;
  pavement.position.y = 0.008;
  pavement.receiveShadow = true;
  scene.add(pavement);
  for (const side of [-1, 1]) {
    box('stoneDark', side * 6.35, 0.13, 0, 0.13, 0.25, 72);
    box('stone', side * 6.86, 0.08, 0, 0.9, 0.14, 72);
    for (let z = -33; z <= 33; z += 2.1) {
      box('stoneDark', side * 6.9, 0.17, z, 0.86, 0.025, 0.045);
    }
  }
  // Longitudinal route lines and groups of deliberately uneven slabs add
  // parallax when the camera flies close to the road.
  for (const x of [-4.85, 4.85]) box('stoneDark', x, 0.027, 0, 0.065, 0.025, 72);
  for (let z = -34; z < 34; z += 4.1) {
    box('stoneDark', 0, 0.024, z, 12, 0.022, 0.055);
  }
  const stoneCount = mobile ? 65 : 175;
  for (let i = 0; i < stoneCount; i++) {
    const x = (rand() - 0.5) * 11.1;
    const z = (rand() - 0.5) * 67;
    if (Math.abs(z + 5) < 3.4 && Math.abs(x) < 3.3) continue;
    box(i % 4 === 0 ? 'stoneDark' : 'stone', x, 0.026, z, 0.5 + rand() * 0.65, 0.02 + rand() * 0.022, 0.3 + rand() * 0.75, null, (rand() - 0.5) * 0.12);
  }

  function houseTransform(side, z) {
    // Local +z is the street-facing facade for either side.
    const m = new THREE.Matrix4().makeRotationY(side === 1 ? -Math.PI / 2 : Math.PI / 2);
    m.setPosition(side * 10.55, 0, z);
    return m;
  }
  function roof(parent, width, depth, eaveY, ridgeRise, offsetZ = 0, roofMaterial = mat.roof) {
    const stepsX = 12, stepsZ = 14;
    const positions = [], uv = [], indices = [];
    for (let iz = 0; iz <= stepsZ; iz++) {
      const z01 = iz / stepsZ;
      const zz = (z01 - 0.5) * depth + offsetZ;
      for (let ix = 0; ix <= stepsX; ix++) {
        const x01 = ix / stepsX;
        const xx = (x01 - 0.5) * width;
        const fromRidge = Math.abs(2 * z01 - 1);
        const turnedEave = 0.18 * Math.pow(fromRidge, 8);
        const liftedCorner = 0.21 * Math.pow(Math.abs(2 * x01 - 1), 7) * Math.pow(fromRidge, 3);
        positions.push(xx, eaveY + ridgeRise * (1 - fromRidge) + turnedEave + liftedCorner, zz);
        uv.push(x01 * width * 0.12, z01 * depth * 0.075);
      }
    }
    for (let iz = 0; iz < stepsZ; iz++) for (let ix = 0; ix < stepsX; ix++) {
      const a = iz * (stepsX + 1) + ix;
      const b = a + 1;
      const c = a + stepsX + 1;
      indices.push(a, c, b, b, c, c + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    transformedMesh(new THREE.Mesh(g, roofMaterial), parent);
    // Dark ridge and the continuous curved cornice keep the silhouette crisp.
    box('ridge', 0, eaveY + ridgeRise + 0.045, offsetZ, width + 0.17, 0.13, 0.17, parent);
    for (const dir of [-1, 1]) {
      box('ridge', 0, eaveY + 0.12, offsetZ + dir * depth / 2, width + 0.1, 0.14, 0.12, parent);
      for (let x = -width / 2 + 0.42; x < width / 2; x += 0.66) {
        box('woodDark', x, eaveY - 0.12, offsetZ + dir * (depth / 2 - 0.16), 0.095, 0.3, 0.36, parent);
      }
    }
    for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) {
      cylinder('ridge', x, eaveY + ridgeRise + 0.12, offsetZ, 0.09, 0.34, parent);
      instance('cone', 'ridge', x, eaveY + ridgeRise + 0.41, offsetZ, 0.2, 0.48, 0.2, 0, parent);
    }
  }
  function lattice(parent, x, cy, z, width, height, withPaper = true) {
    box('woodDark', x, cy, z, width + 0.2, height + 0.17, 0.11, parent);
    if (withPaper) box('paper', x, cy, z + 0.066, width, height, 0.024, parent);
    const strips = Math.max(3, Math.round(width / 0.34));
    for (let i = 0; i <= strips; i++) {
      const xx = x - width / 2 + i * width / strips;
      box(i % 3 === 0 ? 'wood' : 'woodDark', xx, cy, z + 0.092, 0.04, height, 0.045, parent);
    }
    for (let i = 0; i <= 4; i++) {
      box('woodDark', x, cy - height / 2 + i * height / 4, z + 0.101, width + 0.04, 0.04, 0.045, parent);
    }
    box('woodWarm', x, cy, z + 0.14, 0.075, height, 0.06, parent);
  }
  function rearLattice(parent, x, cy, z, width, height) {
    // Mirrored back window; framed on both sides of the solid wall.
    box('woodDark', x, cy, z, width + 0.17, height + 0.15, 0.1, parent);
    box('paper', x, cy, z - 0.064, width, height, 0.025, parent);
    for (let i = -2; i <= 2; i++) box('woodDark', x + i * width / 5, cy, z - 0.098, 0.04, height, 0.035, parent);
    for (let i = -2; i <= 2; i++) box('woodDark', x, cy + i * height / 5, z - 0.101, width, 0.04, 0.035, parent);
  }
  function lantern(x, y, z, radius = 0.23, parent = null) {
    instance('lantern', 'lantern', x, y, z, radius, radius * 1.47, radius, 0, parent);
    box('woodDark', x, y + radius * 1.53, z, radius * 1.04, 0.06, radius * 1.04, parent);
    box('woodDark', x, y - radius * 1.53, z, radius * 0.93, 0.06, radius * 0.93, parent);
    box('red', x, y - radius * 1.95, z, 0.026, radius * 0.8, 0.026, parent);
    between('woodDark', [x, y + radius * 1.56, z], [x, y + radius * 1.56 + 0.28, z], 0.017, parent);
  }
  function building(side, z, n) {
    const M = houseTransform(side, z);
    const width = 7.95 + (n % 3) * 0.15;
    const depth = 6.05 + (n % 2) * 0.36;
    const high = 6.35 + ((n * 3) % 5) * 0.035;
    const first = n % 5 === 2 ? 'plasterLight' : 'plaster';
    const upper = n % 4 === 0 ? 'woodWarm' : first;
    const front = depth / 2 + 0.021;
    const back = -depth / 2 - 0.021;
    const half = width / 2;
    // The volume has actual depth, colored elevations, rear windows, and
    // carved roof eaves, so all four viewpoints have intentional content.
    box('stoneDark', 0, 0.18, 0, width + 0.12, 0.35, depth + 0.12, M);
    box(first, 0, 1.73, 0, width, 2.85, depth, M);
    box(upper, 0, 4.85, 0, width - 0.1, 3.0, depth - 0.14, M);
    box('wood', 0, 3.16, front + 0.03, width + 0.12, 0.22, 0.28, M);
    box('wood', 0, 6.31, front + 0.03, width + 0.12, 0.19, 0.26, M);
    box('wood', 0, 3.16, back - 0.03, width + 0.12, 0.19, 0.25, M);
    for (const x of [-half + 0.24, -half + 2.55, 0, half - 2.55, half - 0.24]) {
      box('woodDark', x, 3.16, front + 0.035, 0.14, 6.3, 0.21, M);
      box('wood', x, 3.16, back - 0.035, 0.13, 6.3, 0.19, M);
    }
    for (const x of [-half + 0.13, half - 0.13]) {
      box('wood', x, 3.16, 0, 0.16, 6.3, depth + 0.15, M);
      // side wall cross-bracing remains readable from orbit back views.
      for (const yy of [1.0, 3.2, 5.3]) box('woodDark', x, yy, 0, 0.17, 0.12, depth, M);
    }
    for (const x of [-2.53, 2.53]) {
      lattice(M, x, 1.92, front + 0.09, 1.69, 1.51);
      rearLattice(M, x, 1.95, back - 0.09, 1.5, 1.35);
    }
    for (const x of [-2.57, 0, 2.57]) {
      lattice(M, x, 4.84, front + 0.09, 1.72, 1.64);
      rearLattice(M, x, 4.82, back - 0.09, 1.52, 1.5);
    }
    // Deep ground-floor portal, split doors and visible brass handles.
    box('woodDark', 0, 1.28, front + 0.12, 2.04, 2.48, 0.24, M);
    box('woodWarm', -0.49, 1.26, front + 0.24, 0.91, 2.26, 0.05, M);
    box('woodWarm', 0.49, 1.26, front + 0.24, 0.91, 2.26, 0.05, M);
    for (const x of [-0.49, 0.49]) {
      for (const yy of [0.52, 1.02, 1.52, 2.02]) box('woodDark', x, yy, front + 0.28, 0.76, 0.045, 0.04, M);
      cylinder('ochre', x + (x < 0 ? 0.26 : -0.26), 1.12, front + 0.32, 0.045, 0.08, M);
    }
    // Upper gallery: overhanging deck, timber balustrade and lantern pairs.
    const galleryZ = front + 0.64;
    box('woodDark', 0, 3.28, front + 0.52, width + 0.15, 0.17, 1.35, M);
    for (let x = -half + 0.18; x <= half - 0.1; x += 0.96) {
      box('woodWarm', x, 3.73, galleryZ + 0.56, 0.105, 0.81, 0.13, M);
    }
    box('woodWarm', 0, 4.13, galleryZ + 0.56, width + 0.1, 0.12, 0.13, M);
    box('woodWarm', 0, 3.61, galleryZ + 0.56, width + 0.1, 0.095, 0.13, M);
    roof(M, width + 1.0, depth + 1.05, high + 0.05, 0.84 + (n % 3) * 0.085);
    if (n % 2 === 0) roof(M, width + 0.45, 2.3, 3.42, 0.29, front + 0.51);
    else {
      box('woodDark', 0, 3.47, front + 0.83, width + 0.3, 0.18, 1.85, M);
      for (let x = -half + 0.45; x < half; x += 0.64) box('ridge', x, 3.5, front + 1.68, 0.09, 0.2, 0.14, M);
    }
    for (const x of [-half + 0.95, half - 0.95]) lantern(x, 2.78, front + 1.08, 0.21, M);
    // Rear loading steps and shed make the exterior silhouette convincing.
    box('woodDark', 0, 0.26, back - 0.72, 2.6, 0.36, 1.42, M);
    box('stone', 0, 0.07, back - 1.7, 2.32, 0.13, 0.58, M);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) building(side, -29 + i * 8.25, i + (side === 1 ? 2 : 0));
  }

  // Gate: two red columns, layered roof, timber lintel, suspended sign and
  // lanterns. Viewers can also look back through its finished rear elevation.
  function gate(z) {
    for (const x of [-6.15, 6.15]) {
      cylinder('stoneDark', x, 0.4, z, 0.58, 0.8);
      cylinder('red', x, 3.33, z, 0.41, 5.15);
      cylinder('woodDark', x, 5.93, z, 0.48, 0.18);
    }
    box('woodDark', 0, 5.76, z, 13.1, 0.47, 1.05);
    box('woodWarm', 0, 5.31, z, 9.1, 0.65, 0.28);
    box('woodDark', 0, 5.31, z + 0.17, 4.15, 0.89, 0.1);
    box('woodDark', 0, 5.31, z - 0.17, 4.15, 0.89, 0.1);
    roof(ident, 14.4, 2.8, 6.2, 0.62, z);
    for (const x of [-4.5, -3.2, 3.2, 4.5]) lantern(x, 4.65, z, 0.27);
  }
  gate(34.4);
  gate(-36.2);

  // A distant hall closes the street vista beyond the second gate. It keeps
  // the street view spatially legible without pretending to reproduce unseen
  // parts of the UE source scene.
  box('stoneDark', 0, 0.38, -49, 18.5, 0.72, 10.5);
  box('plasterLight', 0, 3.65, -49, 17.5, 5.9, 8.8);
  box('woodDark', 0, 2.5, -44.52, 6.2, 4.2, 0.28);
  box('woodWarm', 0, 1.45, -44.32, 3.8, 2.8, 0.1);
  for (const x of [-7.6, -5.6, 5.6, 7.6]) {
    cylinder('red', x, 3.2, -44.32, 0.35, 5.5);
    lantern(x, 4.9, -43.7, 0.28);
  }
  roof(ident, 19.8, 10.5, 6.75, 1.1, -49);
  for (let step = 0; step < 3; step++) box('stone', 0, 0.16 + step * 0.12, -42.9 - step * 0.7, 9.6 - step * 0.3, 0.25, 0.72);

  // Stone-bordered square and asymmetric planter based on the aerial
  // composition of the source artwork, without pretending to recover it.
  for (const zz of [-16, -4, 10]) {
    box('stoneDark', 0, 0.035, zz, 8.6, 0.04, 0.055);
  }
  const medallion = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.49, 32), mat.stoneDark);
  medallion.rotation.x = -Math.PI / 2;
  medallion.position.set(0, 0.046, -16);
  scene.add(medallion);
  const island = new THREE.Group();
  island.rotation.y = Math.PI / 4;
  island.position.set(3.65, 0, -4);
  // Group has its own transform for the flowerbed's diamond plan.
  island.updateMatrix();
  const islandM = island.matrix;
  box('stoneDark', 0, 0.24, 0, 3.65, 0.45, 3.65, islandM);
  box('stone', 0, 0.49, 0, 3.3, 0.09, 3.3, islandM);
  box('foliage', 0, 0.62, 0, 2.95, 0.2, 2.95, islandM);
  for (let i = 0; i < 19; i++) {
    const xx = (rand() - 0.5) * 2.5, zz = (rand() - 0.5) * 2.5;
    instance('leaf', i % 4 === 0 ? 'foliageLight' : 'foliage', xx, 0.88 + rand() * 0.13, zz, 0.23 + rand() * 0.17, 0.15 + rand() * 0.18, 0.21 + rand() * 0.13, 0, islandM);
    if (i % 3 === 0) instance('leaf', 'blossom', xx, 1.02, zz, 0.075, 0.08, 0.075, 0, islandM);
  }

  function stoneLantern(x, z) {
    box('stoneDark', x, 0.28, z, 0.65, 0.5, 0.65);
    box('stone', x, 0.65, z, 0.35, 0.35, 0.35);
    box('stoneDark', x, 1.0, z, 0.63, 0.13, 0.63);
    box('stone', x, 1.21, z, 0.45, 0.34, 0.45);
    box('paper', x, 1.22, z + 0.24, 0.22, 0.23, 0.018);
    box('paper', x, 1.22, z - 0.24, 0.22, 0.23, 0.018);
    instance('cone', 'stoneDark', x, 1.5, z, 0.47, 0.26, 0.47);
  }
  for (const z of [-21, -7, 7, 21]) {
    for (const side of [-1, 1]) stoneLantern(side * 5.95, z);
  }

  function planter(x, z, r = 0.85) {
    box('stoneDark', x, 0.34, z, r * 1.8, 0.63, r * 1.5);
    box('foliage', x, 0.68, z, r * 1.54, 0.11, r * 1.25);
    for (let i = 0; i < 5; i++) {
      const xx = x + (rand() - 0.5) * r * 1.2;
      const zz = z + (rand() - 0.5) * r;
      instance('leaf', i % 2 ? 'foliageLight' : 'foliage', xx, 0.91, zz, r * 0.38, r * 0.3, r * 0.35);
    }
  }
  for (const z of [-27, -13, 1, 15, 28]) {
    planter(-6.1, z, 0.65);
    planter(6.1, z + 3, 0.65);
  }

  function parasol(x, z, color, height = 3.05) {
    cylinder('woodDark', x, height / 2, z, 0.045, height);
    instance('cone', color, x, height + 0.07, z, 1.48, 0.4, 1.48);
    cylinder('ochre', x, height + 0.3, z, 0.05, 0.13);
    for (let a = 0; a < 8; a++) {
      const theta = a * Math.PI / 4;
      between('woodWarm', [x, height + 0.25, z], [x + Math.cos(theta) * 1.4, height - 0.12, z + Math.sin(theta) * 1.4], 0.019);
    }
  }
  const stalls = [
    [-5.35, -26, 'red'], [5.35, -22, 'redBright'],
    [-5.45, -10, 'ochre'], [5.4, -2, 'red'],
    [-5.35, 12, 'redBright'], [5.45, 20, 'ochre'],
  ];
  for (let i = 0; i < stalls.length; i++) {
    const [x, z, cloth] = stalls[i];
    parasol(x, z, cloth, 2.85 + (i % 2) * 0.16);
    box('woodWarm', x, 0.93, z + 0.18, 1.4, 0.12, 0.85);
    for (const dx of [-0.58, 0.58]) for (const dz of [-0.2, 0.55]) box('woodDark', x + dx, 0.48, z + dz, 0.09, 0.85, 0.09);
    for (let j = 0; j < 4; j++) box(j % 2 ? 'ochre' : 'wood', x - 0.42 + j * 0.28, 1.07, z + (j % 2) * 0.14, 0.22, 0.17, 0.3);
    box('wood', x - 1.12, 0.24, z + 0.6, 0.58, 0.45, 0.61);
  }

  // A lateral lane at one end alludes to the source's intimate side passage.
  // It is three-dimensional: walls, stair, shrine, sign and ground cobbles.
  for (const x of [-9.6, 9.6]) {
    for (let z = -40; z <= 39; z += 10.5) {
      if (rand() < 0.26) continue;
      box('stoneDark', x, 0.16, z, 0.09, 0.3, 6.5);
    }
  }

  // Suspended lantern strings are actual spatial arcs. Their paths remain
  // plausible when viewed from a high orbit angle.
  for (const z of [-28, -18, -8, 4, 16, 27]) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const x = -7.5 + i * 1.25;
      const yy = 6.2 - 0.63 * (1 - Math.pow(x / 7.5, 2));
      points.push(new THREE.Vector3(x, yy, z + (i % 2) * 0.07));
      if (i > 0 && i < 12 && i % 2 === 0) lantern(x, yy - 0.52, z, 0.16);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x43372e }));
    scene.add(line);
  }

  // Trees provide scale, shaded irregularity, and a more complete 360-degree
  // horizon. Leaves are pooled into just two InstancedMesh draw calls.
  function tree(x, z, height, bare = false) {
    const crownY = height * 0.76;
    between('woodDark', [x, 0.1, z], [x + 0.15, crownY, z], 0.1);
    for (let b = 0; b < 5; b++) {
      const a = b * Math.PI * 2 / 5 + rand() * 0.4;
      const tip = [x + Math.cos(a) * height * 0.27, crownY + (rand() - 0.3) * 1.25, z + Math.sin(a) * height * 0.27];
      between('woodDark', [x + 0.15, crownY * 0.62, z], tip, 0.043);
      if (bare) continue;
      for (let j = 0; j < 3; j++) {
        instance('leaf', (b + j) % 3 === 0 ? 'foliageLight' : 'foliage', tip[0] + (rand() - 0.5) * 1.25, tip[1] + (rand() - 0.5) * 1.1, tip[2] + (rand() - 0.5) * 1.25, 0.64 + rand() * 0.38, 0.5 + rand() * 0.33, 0.65 + rand() * 0.38);
      }
    }
  }
  for (let i = 0; i < (mobile ? 20 : 34); i++) {
    const z = -42 + rand() * 83;
    const side = i % 2 ? 1 : -1;
    const x = side * (16.5 + rand() * 16);
    tree(x, z, 3.4 + rand() * 3.3, i % 10 === 0);
  }
  tree(-6.4, -1, 4.7, true);
  tree(6.5, 11, 5.2, false);

  // Low closed landscape ring prevents an empty void when orbiting behind the
  // buildings. Irregular peaks wrap the site rather than existing as a flat
  // backdrop visible from a single front-facing camera.
  mountainRing(THREE, scene, rand, 105, 151, 18, 0xadbdb3);
  mountainRing(THREE, scene, rand, 147, 187, 28, 0xcbd8d0);

  for (const { shape, key, matrices } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometry[shape], mat[key], matrices.length);
    for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shape !== 'leaf' && shape !== 'lantern' && key !== 'paper';
    mesh.receiveShadow = shape === 'box' || shape === 'cone';
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  return {
    scene,
    target: [0, 3.25, -2],
    views: {
      entry: { position: [0, 8.4, 29], target: [0, 2.2, -8], fov: 51 },
      street: { position: [0, 2.4, 1.8], target: [0, 2.2, -2.3], fov: 58 },
      aerial: { position: [28, 35, 31], target: [0, 0.6, -3], fov: 48 },
    },
  };
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeTextures(THREE, rand) {
  function canvas(size, draw, repeat = [1, 1]) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    draw(ctx, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace || t.colorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = 4;
    return t;
  }
  const plaster = canvas(256, (g, s) => {
    g.fillStyle = '#e7e0cd'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 5200; i++) {
      const v = Math.round(110 + rand() * 105);
      g.fillStyle = `rgba(${v},${v - 7},${v - 17},${0.025 + rand() * 0.12})`;
      g.fillRect(rand() * s, rand() * s, 0.4 + rand() * 2.5, 0.4 + rand() * 2.5);
    }
    for (let i = 0; i < 65; i++) {
      g.strokeStyle = `rgba(83,70,59,${0.02 + rand() * 0.055})`;
      g.beginPath();
      const x = rand() * s, y = rand() * s;
      g.moveTo(x, y); g.lineTo(x + 4 + rand() * 25, y + (rand() - 0.5) * 2);
      g.stroke();
    }
  });
  const wood = canvas(256, (g, s) => {
    g.fillStyle = '#a5876d'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 950; i++) {
      const x = rand() * s;
      g.strokeStyle = `rgba(${40 + Math.round(rand() * 55)},30,21,${0.035 + rand() * 0.16})`;
      g.lineWidth = 0.3 + rand() * 2.1;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rand() - 0.5) * 8, 65, x + (rand() - 0.5) * 7, 170, x + (rand() - 0.5) * 5, s); g.stroke();
    }
  });
  const roof = canvas(512, (g, s) => {
    g.fillStyle = '#849095'; g.fillRect(0, 0, s, s);
    const w = 21, h = 16;
    for (let row = -1; row < s / h + 1; row++) {
      for (let col = -1; col < s / w + 1; col++) {
        const x = col * w + (row % 2) * w / 2, y = row * h;
        const v = Math.round(91 + rand() * 48);
        g.fillStyle = `rgb(${v},${v + 8},${v + 11})`;
        g.fillRect(x + 1.3, y + 1.1, w - 2.1, h - 2.1);
        g.fillStyle = 'rgba(209,215,209,.25)'; g.fillRect(x + 2, y + 1.3, w - 4, 1.4);
        g.fillStyle = 'rgba(33,42,45,.3)'; g.fillRect(x + 1.6, y + h - 2.8, w - 2.4, 1.4);
      }
    }
    for (let i = 0; i < 2700; i++) {
      g.fillStyle = rand() < .5 ? 'rgba(225,228,220,.14)' : 'rgba(30,43,45,.1)';
      g.fillRect(rand() * s, rand() * s, 1 + rand() * 2.5, 1);
    }
  });
  const paving = canvas(512, (g, s) => {
    g.fillStyle = '#888c89'; g.fillRect(0, 0, s, s);
    const rowH = 35;
    for (let row = 0; row < s / rowH; row++) {
      let x = row % 2 ? -42 : -9;
      while (x < s) {
        const w = 46 + rand() * 43;
        const y = row * rowH + (rand() - .5) * 3;
        const v = Math.round(133 + rand() * 38);
        g.fillStyle = `rgb(${v},${v + 1},${v - 5})`;
        g.fillRect(x + 2, y + 2, w - 3.5, rowH - 4.5);
        g.fillStyle = 'rgba(239,234,216,.23)'; g.fillRect(x + 3, y + 3, w - 7, 1.6);
        g.strokeStyle = 'rgba(52,57,58,.27)'; g.strokeRect(x + 1.5, y + 1.5, w - 2, rowH - 3);
        x += w;
      }
    }
    for (let i = 0; i < 3300; i++) {
      g.fillStyle = rand() < .4 ? 'rgba(54,58,58,.12)' : 'rgba(231,224,201,.12)';
      g.fillRect(rand() * s, rand() * s, 1 + rand() * 3, 1 + rand() * 2);
    }
  }, [2, 11]);
  const stone = canvas(256, (g, s) => {
    g.fillStyle = '#a7a69d'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 3500; i++) {
      g.fillStyle = rand() < .5 ? 'rgba(39,47,46,.08)' : 'rgba(235,231,216,.1)';
      const x = rand() * s, y = rand() * s, r = rand() * 3 + .5;
      g.fillRect(x, y, r, r);
    }
  });
  const red = canvas(256, (g, s) => {
    g.fillStyle = '#bf5945'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1200; i++) {
      g.fillStyle = rand() < .56 ? 'rgba(68,22,24,.08)' : 'rgba(240,168,125,.09)';
      g.fillRect(rand() * s, rand() * s, rand() * 4 + .5, rand() * 10 + 1);
    }
  });
  const earth = canvas(256, (g, s) => {
    g.fillStyle = '#858a75'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4700; i++) {
      g.fillStyle = rand() < .5 ? 'rgba(36,60,42,.14)' : 'rgba(193,176,135,.1)';
      g.fillRect(rand() * s, rand() * s, rand() * 4 + 1, rand() * 4 + 1);
    }
  }, [18, 18]);
  return { plaster, wood, roof, paving, stone, red, earth };
}

function mountainRing(THREE, scene, rand, inner, outer, lift, color) {
  const segments = 80;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2;
    const variation = 0.55 + rand() * 1.12 + 0.23 * Math.sin(i * 1.7);
    const peak = lift * variation;
    positions.push(Math.cos(a) * inner, -1, Math.sin(a) * inner);
    positions.push(Math.cos(a) * (inner + outer) * 0.5, peak, Math.sin(a) * (inner + outer) * 0.5);
    positions.push(Math.cos(a) * outer, -5, Math.sin(a) * outer);
    if (i) {
      const k = (i - 1) * 3;
      indices.push(k, k + 3, k + 1, k + 1, k + 3, k + 4);
      indices.push(k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}
