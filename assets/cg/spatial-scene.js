/* Spatial Atrium — a small, dependency-free WebGL2 scene for the portfolio hero. */
(() => {
  'use strict';

  const instances = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const staticMode = () => reducedMotion.matches || navigator.connection?.saveData === true;

  const backgroundVertex = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      vUv = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

  const backgroundFragment = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      vec2 uv = vUv * 0.5;
      vec3 color = mix(vec3(0.035, 0.075, 0.105), vec3(0.075, 0.145, 0.175), uv.x);
      float aperture = exp(-7.0 * length((uv - vec2(0.68, 0.49)) * vec2(1.0, 1.38)));
      float warm = exp(-19.0 * length((uv - vec2(0.79, 0.22)) * vec2(1.0, 1.7)));
      color += aperture * vec3(0.060, 0.108, 0.119);
      color += warm * vec3(0.060, 0.024, 0.013);
      color *= 1.0 - 0.23 * smoothstep(0.50, 0.92, length((uv - 0.5) * vec2(1.10, 0.85)));
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      color += (grain - 0.5) * 0.007;
      outColor = vec4(color, 1.0);
    }`;

  const sceneVertex = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 aPosition;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    layout(location = 3) in float aKind;
    layout(location = 4) in float aPhase;
    uniform mat4 uViewProjection;
    uniform float uTime;
    out vec3 vWorld;
    out vec3 vNormal;
    out vec3 vColor;
    out float vKind;
    out float vPhase;
    void main() {
      vec3 position = aPosition;
      if (aKind > 1.5 && aKind < 2.5) {
        position.y += 0.08 * sin(uTime * 0.65 + aPhase);
      } else if (aKind > 2.5) {
        vec2 p = position.xy - vec2(1.10, 2.48);
        float angle = uTime * 0.115;
        position.xy = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle)) + vec2(1.10, 2.48);
      }
      vWorld = position;
      vNormal = aNormal;
      vColor = aColor;
      vKind = aKind;
      vPhase = aPhase;
      gl_Position = uViewProjection * vec4(position, 1.0);
    }`;

  const sceneFragment = `#version 300 es
    precision highp float;
    in vec3 vWorld;
    in vec3 vNormal;
    in vec3 vColor;
    in float vKind;
    in float vPhase;
    uniform vec3 uEye;
    uniform float uTime;
    out vec4 outColor;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 view = normalize(uEye - vWorld);
      float key = max(dot(normal, normalize(vec3(-0.28, 0.78, 0.56))), 0.0);
      float fill = max(dot(normal, normalize(vec3(0.55, 0.24, -0.62))), 0.0);
      float rim = pow(1.0 - max(dot(normal, view), 0.0), 2.7);
      vec3 color = vColor * (0.35 + key * 0.61 + fill * 0.14) + rim * vec3(0.045, 0.092, 0.104);
      if ((vKind > 0.5 && vKind < 1.5) || vKind > 2.5) {
        float pulse = 0.75 + 0.25 * sin(uTime * 1.65 - vWorld.z * 1.12 + vPhase);
        color = vColor * (1.18 + pulse * 0.70);
      } else if (vKind > 1.5) {
        color = vColor * (0.39 + key * 0.57) + rim * vec3(0.16, 0.36, 0.41);
      }
      float fog = smoothstep(9.0, 23.0, length(uEye - vWorld)) * 0.45;
      color = mix(color, vec3(0.105, 0.205, 0.242), fog);
      outColor = vec4(pow(max(color, 0.0), vec3(0.92)), 1.0);
    }`;

  const particleVertex = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 aPosition;
    layout(location = 1) in float aSpeed;
    layout(location = 2) in float aSize;
    uniform mat4 uViewProjection;
    uniform float uTime;
    uniform float uPixelRatio;
    out float vWarm;
    void main() {
      vec3 p = aPosition;
      p.z = -10.0 + mod(aPosition.z + uTime * aSpeed, 12.0);
      p.y += sin(uTime * 0.52 + aPosition.x * 3.4) * 0.12;
      vec4 clip = uViewProjection * vec4(p, 1.0);
      gl_Position = clip;
      gl_PointSize = min(11.0, aSize * uPixelRatio * 20.0 / max(3.0, clip.w));
      vWarm = fract(aSpeed * 7.3);
    }`;

  const particleFragment = `#version 300 es
    precision highp float;
    in float vWarm;
    out vec4 outColor;
    void main() {
      float radius = length(gl_PointCoord - 0.5);
      float core = 1.0 - smoothstep(0.02, 0.48, radius);
      if (core < 0.02) discard;
      vec3 color = mix(vec3(0.28, 0.70, 0.76), vec3(0.94, 0.55, 0.34), step(0.74, vWarm));
      outColor = vec4(color * core, core * 0.66);
    }`;

  function shader(gl, type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(item);
      gl.deleteShader(item);
      throw new Error(reason || 'Shader compile failed');
    }
    return item;
  }

  function program(gl, vertex, fragment) {
    const item = gl.createProgram();
    const vs = shader(gl, gl.VERTEX_SHADER, vertex);
    const fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(item, vs);
    gl.attachShader(item, fs);
    gl.linkProgram(item);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(item, gl.LINK_STATUS)) {
      const reason = gl.getProgramInfoLog(item);
      gl.deleteProgram(item);
      throw new Error(reason || 'Program link failed');
    }
    return item;
  }

  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);
  }

  function lookAt(eye, target) {
    const normalize = v => {
      const length = Math.hypot(...v) || 1;
      return v.map(n => n / length);
    };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const z = normalize(eye.map((n, i) => n - target[i]));
    const x = normalize(cross([0, 1, 0], z));
    const y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -x.reduce((sum, n, i) => sum + n * eye[i], 0),
      -y.reduce((sum, n, i) => sum + n * eye[i], 0),
      -z.reduce((sum, n, i) => sum + n * eye[i], 0), 1
    ]);
  }

  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 4; k++) result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      }
    }
    return result;
  }

  function buildScene() {
    const data = [];
    const push = (position, normal, color, kind, phase) => data.push(...position, ...normal, ...color, kind, phase);
    function box(x, y, z, w, h, d, color, kind = 0, phase = 0, yaw = 0) {
      const hx = w / 2, hy = h / 2, hz = d / 2;
      const faces = [
        [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
        [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]],
        [[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]],
        [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]],
        [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
        [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]]
      ];
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const rotate = v => [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c];
      faces.forEach(([normal, corners]) => {
        const n = rotate(normal);
        [0, 1, 2, 0, 2, 3].forEach(i => {
          const p = rotate(corners[i]);
          push([p[0] + x, p[1] + y, p[2] + z], n, color, kind, phase);
        });
      });
    }

    function arc(cx, cy, cz, radius, tube, from, to, color, kind, phase) {
      const ringSteps = Math.max(8, Math.ceil((to - from) * 18));
      const tubeSteps = 7;
      function point(u, v) {
        const circle = radius + tube * Math.cos(v);
        const position = [cx + circle * Math.cos(u), cy + circle * Math.sin(u), cz + tube * Math.sin(v)];
        const normal = [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
        return [position, normal];
      }
      for (let i = 0; i < ringSteps; i++) {
        const u0 = from + (to - from) * i / ringSteps;
        const u1 = from + (to - from) * (i + 1) / ringSteps;
        for (let j = 0; j < tubeSteps; j++) {
          const v0 = Math.PI * 2 * j / tubeSteps;
          const v1 = Math.PI * 2 * (j + 1) / tubeSteps;
          const quad = [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
          [0, 1, 2, 0, 2, 3].forEach(index => push(...quad[index], color, kind, phase));
        }
      }
    }

    const steel = [0.29, 0.43, 0.48];
    const shadow = [0.10, 0.22, 0.28];
    const frost = [0.24, 0.47, 0.53];
    const copper = [0.77, 0.39, 0.26];
    const ice = [0.36, 0.66, 0.70];

    // A sequence of architectural thresholds gives the scene real depth.
    box(0, -0.08, -4.7, 6.6, 0.26, 16.2, shadow);
    box(0, -0.25, -4.7, 8.0, 0.30, 16.2, [0.065, 0.14, 0.18]);
    for (let i = 0; i < 5; i++) {
      const z = 1.35 - i * 2.5;
      const width = 5.65 - i * 0.10;
      const height = 4.5 - i * 0.06;
      const metal = i % 2 ? [0.20, 0.34, 0.40] : steel;
      box(-width / 2, height / 2, z, 0.24, height, 0.32, metal);
      box(width / 2, height / 2, z, 0.24, height, 0.32, metal);
      box(0, height, z, width + 0.24, 0.22, 0.32, metal);
      box(0, 0.08, z, width + 0.24, 0.16, 0.32, shadow);
      box(-width / 2 + 0.17, height / 2, z + 0.18, 0.024, height - 0.34, 0.025, i % 2 ? ice : copper, 1, i * 0.75);
      box(width / 2 - 0.17, height / 2, z + 0.18, 0.024, height - 0.34, 0.025, i % 2 ? ice : copper, 1, i * 0.75);
      box(0, height - 0.17, z + 0.18, width - 0.32, 0.024, 0.025, i % 2 ? ice : copper, 1, i * 0.75);
      box(0, height + 0.17, z - 0.14, width + 0.4, 0.08, 0.58, shadow);
    }

    // Survey lines and two signal paths anchor the floating structure in space.
    for (let x = -3.0; x <= 3.01; x += 0.75) box(x, 0.065, -4.7, 0.012, 0.008, 15.6, [0.15, 0.31, 0.37]);
    for (let z = -12.0; z <= 2.61; z += 0.9) box(0, 0.067, z, 6.15, 0.009, 0.012, [0.15, 0.31, 0.37]);
    [-0.64, 0.64].forEach((x, index) => {
      box(x, 0.083, -4.6, 0.035, 0.014, 14.0, index ? copper : ice, 1, index * 2.1);
      for (let z = -10.8; z < 2; z += 1.45) box(x, 0.085, z, 0.18, 0.018, 0.07, [0.80, 0.52, 0.34], 1, z);
    });

    // Offset panels imply architectural interfaces without pretending to be real project UI.
    for (let i = 0; i < 4; i++) {
      const z = 0.25 - i * 2.8;
      const side = i % 2 ? -1 : 1;
      box(side * 3.46, 2.1, z, 0.20, 3.18, 1.38, shadow);
      box(side * 3.29, 2.13, z, 0.027, 2.73, 1.08, frost, 2, i * 1.7);
      box(side * 3.25, 2.1, z + 0.53, 0.035, 2.65, 0.023, ice, 1, i);
      box(side * 3.25, 2.1, z - 0.53, 0.035, 2.65, 0.023, ice, 1, i);
    }

    // Slender moving glass volumes and warm tracking marks form the focal object.
    const columns = [
      [-1.42, 2.05, -1.36, 0.72, 1.88, 0.26, -0.15],
      [0.45, 2.42, -3.40, 1.08, 2.45, 0.24, 0.17],
      [1.50, 1.75, -5.58, 0.64, 1.54, 0.22, -0.12]
    ];
    columns.forEach(([x, y, z, w, h, d, yaw], i) => {
      box(x, y, z, w, h, d, [0.21, 0.44, 0.50], 2, i * 1.8, yaw);
      box(x, y + h / 2 + 0.035, z + 0.03, w + 0.08, 0.033, d + 0.08, copper, 1, i * 1.3, yaw);
      box(x, y - h / 2 - 0.035, z + 0.03, w + 0.08, 0.027, d + 0.08, ice, 1, i * 1.3, yaw);
    });

    // A rotating response ring reads as the central spatial instrument.
    arc(1.10, 2.48, -1.05, 0.91, 0.068, 0, Math.PI * 2, [0.23, 0.39, 0.45], 0, 0);
    arc(1.10, 2.48, -1.00, 0.91, 0.018, 0, Math.PI * 2, [0.43, 0.68, 0.70], 1, 0.4);
    for (let i = 0; i < 4; i++) {
      const from = i * Math.PI / 2 + 0.22;
      arc(1.10, 2.48, -0.96, 1.04, 0.029, from, from + 0.72, copper, 3, i * 0.8);
    }

    for (let i = 0; i < 11; i++) {
      const z = 1.5 - i * 1.13;
      box(2.12, 3.78 - i * 0.018, z, 0.075, 0.075, 0.19, i % 3 ? frost : copper, i % 3 ? 2 : 1, i);
      box(-2.10, 1.15 + i * 0.036, z, 0.055, 0.055, 0.16, i % 4 ? frost : ice, i % 4 ? 2 : 1, i * 0.5);
    }
    box(0, 2.22, -10.98, 1.28, 2.5, 0.24, [0.19, 0.42, 0.47], 2, 3.2);
    box(0, 3.50, -10.85, 1.49, 0.055, 0.07, copper, 1, 2.5);
    return new Float32Array(data);
  }

  function buildParticles(count) {
    const data = [];
    for (let i = 0; i < count; i++) {
      // A fixed sequence avoids a visually different composition on every refresh.
      const random = n => (Math.sin(n * 127.1 + i * 311.7) * 43758.5453) % 1;
      const unit = n => Math.abs(random(n));
      data.push((unit(1) - 0.5) * 5.6, 0.45 + unit(2) * 3.75, unit(3) * 12, 0.16 + unit(4) * 0.23, 1.2 + unit(5) * 2.4);
    }
    return new Float32Array(data);
  }

  function mountSpatialScene(element, options = {}) {
    if (!(element instanceof Element)) return null;
    if (instances.has(element)) return instances.get(element);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    element.append(canvas);
    const state = { element, canvas, gl: null, raf: 0, visible: true, disposed: false, paused: false, width: 0, height: 0, pointer: [0, 0], drift: [0, 0], lastFrame: 0, start: performance.now(), resources: [] };

    function dropResources() {
      if (!state.gl) return;
      const gl = state.gl;
      state.resources.forEach(([kind, resource]) => {
        if (kind === 'program') gl.deleteProgram(resource);
        if (kind === 'buffer') gl.deleteBuffer(resource);
        if (kind === 'vao') gl.deleteVertexArray(resource);
      });
      state.resources.length = 0;
    }

    function track(kind, resource) {
      state.resources.push([kind, resource]);
      return resource;
    }

    function initialize() {
      try {
        const gl = canvas.getContext('webgl2', { alpha: false, antialias: !mobile.matches, depth: true, stencil: false, powerPreference: mobile.matches ? 'low-power' : 'high-performance' });
        if (!gl) return false;
        state.gl = gl;
        state.backgroundProgram = track('program', program(gl, backgroundVertex, backgroundFragment));
        state.sceneProgram = track('program', program(gl, sceneVertex, sceneFragment));
        state.particleProgram = track('program', program(gl, particleVertex, particleFragment));
        state.sceneUniforms = {
          viewProjection: gl.getUniformLocation(state.sceneProgram, 'uViewProjection'),
          eye: gl.getUniformLocation(state.sceneProgram, 'uEye'),
          time: gl.getUniformLocation(state.sceneProgram, 'uTime')
        };
        state.particleUniforms = {
          viewProjection: gl.getUniformLocation(state.particleProgram, 'uViewProjection'),
          time: gl.getUniformLocation(state.particleProgram, 'uTime'),
          pixelRatio: gl.getUniformLocation(state.particleProgram, 'uPixelRatio')
        };
        const geometry = buildScene();
        state.sceneCount = geometry.length / 11;
        state.sceneVao = track('vao', gl.createVertexArray());
        gl.bindVertexArray(state.sceneVao);
        const sceneBuffer = track('buffer', gl.createBuffer());
        gl.bindBuffer(gl.ARRAY_BUFFER, sceneBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
        const stride = 11 * 4;
        [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 1, 9], [4, 1, 10]].forEach(([index, size, offset]) => {
          gl.enableVertexAttribArray(index);
          gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride, offset * 4);
        });
        const particles = buildParticles(mobile.matches ? 38 : 105);
        state.particleCount = particles.length / 5;
        state.particleVao = track('vao', gl.createVertexArray());
        gl.bindVertexArray(state.particleVao);
        const particleBuffer = track('buffer', gl.createBuffer());
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);
        [[0, 3, 0], [1, 1, 3], [2, 1, 4]].forEach(([index, size, offset]) => {
          gl.enableVertexAttribArray(index);
          gl.vertexAttribPointer(index, size, gl.FLOAT, false, 5 * 4, offset * 4);
        });
        gl.bindVertexArray(null);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        resize();
        draw(performance.now());
        element.classList.add('is-active');
        return true;
      } catch (error) {
        console.warn('Spatial scene unavailable:', error);
        element.classList.remove('is-active');
        dropResources();
        state.gl = null;
        return false;
      }
    }

    function resize() {
      if (!state.gl) return;
      const rect = element.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = Math.min(mobile.matches ? 1 : 1.35, 1700 / width, 1050 / height);
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      state.width = width;
      state.height = height;
      state.gl.viewport(0, 0, pixelWidth, pixelHeight);
      if (staticMode()) draw(performance.now());
    }

    function draw(now) {
      const gl = state.gl;
      if (!gl || state.disposed) return;
      const t = staticMode() ? 0 : (now - state.start) * 0.001;
      const bound = element.getBoundingClientRect();
      const scroll = staticMode() ? 0 : Math.max(-1, Math.min(1, -bound.top / Math.max(1, bound.height)));
      const point = staticMode() ? [0, 0] : state.drift;
      const eye = [(mobile.matches ? 1.35 : 0.12) + point[0] * 0.65 + Math.sin(t * 0.11) * 0.14, 2.15 - point[1] * 0.24 + Math.cos(t * 0.09) * 0.08, 9.5 - scroll * 0.62];
      const target = [(mobile.matches ? -0.88 : -2.10) + point[0] * 0.16, 2.04 - point[1] * 0.08, -3.8];
      const aspect = canvas.width / canvas.height;
      const viewProjection = multiply(perspective((mobile.matches ? 61 : 54) * Math.PI / 180, aspect, 0.1, 60), lookAt(eye, target));

      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(state.backgroundProgram);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      gl.useProgram(state.sceneProgram);
      gl.uniformMatrix4fv(state.sceneUniforms.viewProjection, false, viewProjection);
      gl.uniform3fv(state.sceneUniforms.eye, eye);
      gl.uniform1f(state.sceneUniforms.time, t);
      gl.bindVertexArray(state.sceneVao);
      gl.drawArrays(gl.TRIANGLES, 0, state.sceneCount);

      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(state.particleProgram);
      gl.uniformMatrix4fv(state.particleUniforms.viewProjection, false, viewProjection);
      gl.uniform1f(state.particleUniforms.time, t);
      gl.uniform1f(state.particleUniforms.pixelRatio, canvas.width / Math.max(1, state.width));
      gl.bindVertexArray(state.particleVao);
      gl.drawArrays(gl.POINTS, 0, state.particleCount);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    }

    function frame(now) {
      if (state.disposed || state.paused || !state.visible || document.hidden || staticMode()) { state.raf = 0; return; }
      const interval = mobile.matches ? 1000 / 26 : 1000 / 45;
      if (now - state.lastFrame >= interval) {
        state.lastFrame = now;
        state.drift[0] += (state.pointer[0] - state.drift[0]) * 0.035;
        state.drift[1] += (state.pointer[1] - state.drift[1]) * 0.035;
        draw(now);
      }
      state.raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!state.raf && !state.paused && state.visible && !document.hidden && !staticMode() && state.gl) state.raf = requestAnimationFrame(frame);
    }

    function onPointer(event) {
      if (mobile.matches || staticMode()) return;
      const rect = element.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      state.pointer[0] = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      state.pointer[1] = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    }

    function onMotionChange() {
      if (staticMode()) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
        draw(performance.now());
      } else start();
    }

    const observer = new IntersectionObserver(entries => {
      state.visible = entries[0]?.isIntersecting ?? false;
      if (state.visible) start();
      else { cancelAnimationFrame(state.raf); state.raf = 0; }
    }, { rootMargin: '100px' });
    const resizer = new ResizeObserver(resize);
    const onVisibility = () => document.hidden ? (cancelAnimationFrame(state.raf), state.raf = 0) : start();
    const onContextLost = event => {
      event.preventDefault();
      cancelAnimationFrame(state.raf);
      state.raf = 0;
      element.classList.remove('is-active');
    };
    const onContextRestored = () => {
      state.resources.length = 0;
      state.gl = null;
      if (initialize()) start();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    reducedMotion.addEventListener('change', onMotionChange);
    observer.observe(element);
    resizer.observe(element);
    initialize();
    start();

    const api = {
      pause() { state.paused = true; cancelAnimationFrame(state.raf); state.raf = 0; },
      resume() { state.paused = false; start(); },
      destroy() {
        if (state.disposed) return;
        state.disposed = true;
        cancelAnimationFrame(state.raf);
        observer.disconnect();
        resizer.disconnect();
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVisibility);
        reducedMotion.removeEventListener('change', onMotionChange);
        dropResources();
        element.classList.remove('is-active');
        canvas.remove();
        instances.delete(element);
      }
    };
    instances.set(element, api);
    return api;
  }

  window.mountSpatialScene = mountSpatialScene;
  function autoMount() { document.querySelectorAll('[data-cg-scene]').forEach(element => mountSpatialScene(element)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
})();
