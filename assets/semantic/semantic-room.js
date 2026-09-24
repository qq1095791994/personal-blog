/* Spatial semantics: an illustrative room with authored object relationships. */
(() => {
  'use strict';

  const instances = new WeakMap();
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const staticMode = () => motionPreference.matches || navigator.connection?.saveData === true;
  const objects = [
    { key: 'entry', label: '入口', marker: '入口' },
    { key: 'desk', label: '协作桌面', marker: '桌面' },
    { key: 'robot', label: '具身设备', marker: '设备' }
  ];
  const route = [
    [-2.43, -2.12], [-1.83, -1.28], [-1.48, 0.48], [-0.27, 1.04], [0.64, 0.35]
  ];

  function routePoint(progress) {
    const lengths = [];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const length = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
      lengths.push(length);
      total += length;
    }
    let distance = Math.max(0, Math.min(1, progress)) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        const t = distance / lengths[i];
        return [route[i][0] + (route[i + 1][0] - route[i][0]) * t, route[i][1] + (route[i + 1][1] - route[i][1]) * t];
      }
      distance -= lengths[i];
    }
    return route[route.length - 1];
  }

  function mountSemanticRoom(element) {
    if (!(element instanceof Element)) return null;
    if (instances.has(element)) return instances.get(element);
    const stage = element.querySelector('.semantic-scene__stage');
    const details = new Map(objects.map(object => [object.key, element.querySelector(`[data-semantic-detail="${object.key}"]`)]));
    if (!stage || [...details.values()].some(value => !value)) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'semantic-scene__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return null;
    stage.append(canvas);

    const state = {
      canvas, context, stage, element, details, buttons: new Map(), hotspots: new Map(),
      selected: [...details].find(([, detail]) => detail.open)?.[0] || 'entry',
      width: 0, height: 0, ratio: 1, visible: true, paused: false, destroyed: false,
      pointer: [0, 0], drift: [0, 0], start: performance.now(), lastFrame: 0, raf: 0
    };

    objects.forEach(object => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'semantic-scene__node';
      button.textContent = object.marker;
      button.setAttribute('aria-label', `查看${object.label}的语义关系`);
      button.setAttribute('aria-pressed', object.key === state.selected ? 'true' : 'false');
      button.setAttribute('aria-controls', details.get(object.key).id);
      button.addEventListener('click', () => select(object.key, true));
      stage.append(button);
      state.buttons.set(object.key, button);
    });

    function select(key, scroll = false) {
      if (!details.has(key)) return;
      state.selected = key;
      details.forEach((detail, detailKey) => { detail.open = detailKey === key; });
      state.buttons.forEach((button, buttonKey) => button.setAttribute('aria-pressed', buttonKey === key ? 'true' : 'false'));
      draw(performance.now());
      if (scroll && mobile.matches) details.get(key).scrollIntoView({ block: 'nearest', behavior: staticMode() ? 'auto' : 'smooth' });
    }

    const detailListeners = [];
    details.forEach((detail, key) => {
      const onToggle = () => {
        if (detail.open && key !== state.selected) select(key);
        if (!detail.open && key === state.selected && ![...details.values()].some(item => item.open)) {
          state.selected = null;
          state.buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
          draw(performance.now());
        }
      };
      detail.addEventListener('toggle', onToggle);
      detailListeners.push([detail, onToggle]);
    });

    function resize() {
      const bounds = stage.getBoundingClientRect();
      state.width = Math.max(1, Math.round(bounds.width));
      state.height = Math.max(1, Math.round(bounds.height));
      state.ratio = Math.min(mobile.matches ? 1.15 : 1.5, 1500 / state.width, 950 / state.height);
      const width = Math.max(1, Math.round(state.width * state.ratio));
      const height = Math.max(1, Math.round(state.height * state.ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      draw(performance.now());
    }

    function draw(now) {
      if (state.destroyed || !state.width || !state.height) return;
      const ctx = context;
      const width = state.width;
      const height = state.height;
      const time = staticMode() ? 0 : (now - state.start) * 0.001;
      const progress = staticMode() ? 0.58 : 0.50 + 0.36 * Math.sin(time * 0.38 - 0.20);
      const [robotX, robotZ] = routePoint(progress);
      const eye = [5.15 + state.drift[0] * 0.32, 4.45 - state.drift[1] * 0.16, 7.0];
      const target = [0, 1.10, 0];
      const subtract = (a, b) => a.map((value, i) => value - b[i]);
      const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const unit = vector => vector.map(value => value / (Math.hypot(...vector) || 1));
      const forward = unit(subtract(target, eye));
      const right = unit(cross(forward, [0, 1, 0]));
      const up = cross(right, forward);
      const focal = Math.min(width * (mobile.matches ? 1.20 : 1.30), height * 1.68);
      const project = point => {
        const relative = subtract(point, eye);
        const depth = dot(relative, forward);
        const scale = focal / Math.max(0.05, depth);
        return { x: width * 0.51 + dot(relative, right) * scale, y: height * 0.54 - dot(relative, up) * scale, depth };
      };

      ctx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#0b1c26');
      background.addColorStop(0.55, '#1a3742');
      background.addColorStop(1, '#0c202a');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      const atmosphere = ctx.createRadialGradient(width * 0.55, height * 0.42, 12, width * 0.55, height * 0.42, width * 0.66);
      atmosphere.addColorStop(0, '#4e879020');
      atmosphere.addColorStop(1, '#0b1c2600');
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, width, height);

      function polygon(points, fill, stroke, lineWidth = 1) {
        const screen = points.map(project);
        if (screen.some(point => point.depth <= 0)) return;
        ctx.beginPath();
        screen.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
      }

      function line(points, color, size = 1, dash = []) {
        const screen = points.map(project);
        if (screen.some(point => point.depth <= 0)) return;
        ctx.beginPath();
        screen.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.setLineDash(dash);
        ctx.lineWidth = size;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      function box(x, y, z, sx, sy, sz, palette) {
        const x0 = x - sx / 2, x1 = x + sx / 2;
        const y0 = y - sy / 2, y1 = y + sy / 2;
        const z0 = z - sz / 2, z1 = z + sz / 2;
        polygon([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], palette.front, palette.edge);
        polygon([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], palette.side, palette.edge);
        polygon([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], palette.top, palette.edge);
      }

      // Architectural shell: back and side walls, then a gridded floor.
      polygon([[-3.4, 0, -2.7], [3.4, 0, -2.7], [3.4, 3.35, -2.7], [-3.4, 3.35, -2.7]], '#1b3742', '#7698a06e');
      polygon([[-3.4, 0, 2.7], [-3.4, 0, -2.7], [-3.4, 3.35, -2.7], [-3.4, 3.35, 2.7]], '#122c37', '#7698a04d');
      for (let x = -2.5; x <= 3; x += 1.08) line([[x, 0, -2.67], [x, 3.25, -2.67]], '#8bb6bb1e');
      line([[-3.37, 2.6, -2.66], [3.37, 2.6, -2.66]], '#b3d4d12e');
      const floor = ctx.createLinearGradient(0, height * 0.42, 0, height);
      floor.addColorStop(0, '#27434b');
      floor.addColorStop(1, '#112a35');
      polygon([[-3.4, 0, -2.7], [3.4, 0, -2.7], [3.4, 0, 2.7], [-3.4, 0, 2.7]], floor, '#9ab7b45c', 1.2);
      for (let x = -3.1; x < 3.4; x += 0.68) line([[x, 0.008, -2.7], [x, 0.008, 2.7]], '#7fa6ac25');
      for (let z = -2.5; z <= 2.7; z += 0.66) line([[-3.4, 0.008, z], [3.4, 0.008, z]], '#7fa6ac25');

      // Entry is a framed threshold on the wall, authored as a traversable region.
      polygon([[-2.82, 0.02, -2.64], [-1.95, 0.02, -2.64], [-1.95, 2.33, -2.64], [-2.82, 2.33, -2.64]], '#0a212b', '#8cbcc2', 2.0);
      polygon([[-2.72, 0.08, -2.61], [-2.06, 0.08, -2.61], [-2.06, 2.22, -2.61], [-2.72, 2.22, -2.61]], '#25505a88');
      line([[-2.88, 0.018, -2.46], [-1.90, 0.018, -2.46]], '#d6a27f', 4.3);
      line([[-2.82, 2.35, -2.61], [-1.95, 2.35, -2.61]], '#a9d3d5', 2.5);

      // An unlabelled light panel makes the room legible as an interactive interior.
      polygon([[0.44, 1.35, -2.63], [2.81, 1.35, -2.63], [2.81, 2.43, -2.63], [0.44, 2.43, -2.63]], '#3d76843a', '#9cc4c277');
      for (let i = 0; i < 4; i++) line([[0.64, 1.58 + i * 0.19, -2.60], [2.35 - i * 0.22, 1.58 + i * 0.19, -2.60]], '#b2d6d46b', 1.1);

      // Planned route and abstract relationship edges; this is not model output.
      line(route.map(([x, z]) => [x, 0.035, z]), '#e2a884b8', 3.0, [9, 10]);
      line(route.map(([x, z]) => [x, 0.025, z]), '#e2a8841e', 10.0);

      const entry = [-2.39, 1.44, -2.60];
      const desk = [1.25, 1.31, -0.42];
      const robot = [robotX, 0.96, robotZ];
      const anchors = new Map([['entry', entry], ['desk', desk], ['robot', robot]]);
      const relations = [['entry', 'robot'], ['robot', 'desk'], ['entry', 'desk']];
      relations.forEach(([from, to]) => {
        const a = project(anchors.get(from));
        const b = project(anchors.get(to));
        const active = state.selected === from || state.selected === to;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 42, b.x, b.y);
        ctx.setLineDash(active ? [5, 6] : [3, 8]);
        ctx.lineWidth = active ? 1.7 : 1;
        ctx.strokeStyle = active ? '#d6ae8bbb' : '#9fc4c55d';
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Furniture and a compact mobile robot give the diagram embodied scale.
      box(0.66, 0.48, -0.79, 0.12, 0.93, 0.12, { front: '#355661', side: '#24424e', top: '#7b979b', edge: '#8bacad66' });
      box(1.84, 0.48, -0.79, 0.12, 0.93, 0.12, { front: '#355661', side: '#24424e', top: '#7b979b', edge: '#8bacad66' });
      box(0.66, 0.48, 0.02, 0.12, 0.93, 0.12, { front: '#355661', side: '#24424e', top: '#7b979b', edge: '#8bacad66' });
      box(1.84, 0.48, 0.02, 0.12, 0.93, 0.12, { front: '#355661', side: '#24424e', top: '#7b979b', edge: '#8bacad66' });
      box(1.25, 0.98, -0.39, 1.71, 0.13, 1.03, { front: '#55747b', side: '#3b5b65', top: '#afc9c8', edge: '#dce1d7a1' });
      box(1.25, 1.10, -0.69, 0.80, 0.12, 0.40, { front: '#345865', side: '#244653', top: '#6eaaaeb0', edge: '#a9d5d2a8' });
      line([[0.87, 1.18, -0.87], [1.63, 1.18, -0.87]], '#b3d6d4', 2);

      const robotShadow = project([robotX, 0.035, robotZ]);
      ctx.beginPath();
      ctx.ellipse(robotShadow.x, robotShadow.y + 5, 30 * focal / 750, 12 * focal / 750, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0619238c';
      ctx.fill();
      box(robotX, 0.13, robotZ, 0.72, 0.20, 0.66, { front: '#4a707a', side: '#294b57', top: '#8fb0b1', edge: '#b8d4d2a8' });
      box(robotX, 0.56, robotZ, 0.49, 0.68, 0.48, { front: '#3e6670', side: '#244853', top: '#93b8b9', edge: '#b5d3d18c' });
      box(robotX, 0.96, robotZ, 0.37, 0.23, 0.36, { front: '#477783', side: '#25515d', top: '#abc9c8', edge: '#cde3dfaf' });
      line([[robotX - 0.11, 0.99, robotZ + 0.19], [robotX + 0.11, 0.99, robotZ + 0.19]], '#d7a47f', 2.8);
      const halo = project([robotX, 1.12, robotZ]);
      ctx.beginPath();
      ctx.arc(halo.x, halo.y, 10 + (staticMode() ? 0 : Math.sin(time * 1.8) * 2), 0, Math.PI * 2);
      ctx.strokeStyle = '#cce0da83';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Accessible HTML buttons sit on the same projected objects.
      state.hotspots.clear();
      anchors.forEach((point, key) => {
        const screen = project(point);
        state.hotspots.set(key, screen);
        const button = state.buttons.get(key);
        const offsetX = key === 'desk' ? 51 : key === 'entry' ? -34 : 0;
        const offsetY = key === 'robot' ? 48 : -31;
        button.style.left = `${screen.x + offsetX}px`;
        button.style.top = `${screen.y + offsetY}px`;
        const radius = state.selected === key ? 15 + (staticMode() ? 0 : Math.sin(time * 1.5) * 2) : 10;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = state.selected === key ? '#e9b690' : '#b0d1d0b3';
        ctx.lineWidth = state.selected === key ? 2.3 : 1.3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = state.selected === key ? '#ecc09a' : '#b3d7d6';
        ctx.fill();
      });
    }

    function frame(now) {
      if (state.destroyed || state.paused || !state.visible || document.hidden || staticMode()) { state.raf = 0; return; }
      const interval = mobile.matches ? 1000 / 22 : 1000 / 30;
      if (now - state.lastFrame >= interval) {
        state.lastFrame = now;
        state.drift[0] += (state.pointer[0] - state.drift[0]) * 0.05;
        state.drift[1] += (state.pointer[1] - state.drift[1]) * 0.05;
        draw(now);
      }
      state.raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!state.raf && !state.destroyed && !state.paused && state.visible && !document.hidden && !staticMode()) state.raf = requestAnimationFrame(frame);
    }

    function onPointerMove(event) {
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!mobile.matches && !staticMode()) {
        state.pointer[0] = Math.max(-1, Math.min(1, x / rect.width * 2 - 1));
        state.pointer[1] = Math.max(-1, Math.min(1, y / rect.height * 2 - 1));
      }
      canvas.style.cursor = [...state.hotspots.values()].some(point => Math.hypot(point.x - x, point.y - y) < 34) ? 'pointer' : 'default';
    }

    function onCanvasClick(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = [...state.hotspots].map(([key, point]) => [key, Math.hypot(point.x - x, point.y - y)]).sort((a, b) => a[1] - b[1])[0];
      if (hit && hit[1] < (mobile.matches ? 48 : 39)) select(hit[0], true);
    }

    function onMotionChange() {
      if (staticMode()) { cancelAnimationFrame(state.raf); state.raf = 0; state.drift = [0, 0]; draw(performance.now()); }
      else start();
    }

    const onVisibility = () => document.hidden ? (cancelAnimationFrame(state.raf), state.raf = 0) : start();
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      state.visible = entries[0]?.isIntersecting ?? false;
      if (state.visible) start();
      else { cancelAnimationFrame(state.raf); state.raf = 0; }
    }, { rootMargin: '100px' }) : null;
    const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    canvas.addEventListener('click', onCanvasClick);
    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionPreference.addEventListener('change', onMotionChange);
    window.addEventListener('resize', resize, { passive: true });
    observer?.observe(element);
    resizer?.observe(stage);
    resize();
    element.classList.add('is-ready');
    start();

    const api = {
      select,
      pause() { state.paused = true; cancelAnimationFrame(state.raf); state.raf = 0; },
      resume() { state.paused = false; start(); },
      destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        cancelAnimationFrame(state.raf);
        observer?.disconnect();
        resizer?.disconnect();
        canvas.removeEventListener('click', onCanvasClick);
        stage.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('visibilitychange', onVisibility);
        motionPreference.removeEventListener('change', onMotionChange);
        window.removeEventListener('resize', resize);
        detailListeners.forEach(([detail, listener]) => detail.removeEventListener('toggle', listener));
        state.buttons.forEach(button => button.remove());
        canvas.remove();
        element.classList.remove('is-ready');
        instances.delete(element);
      }
    };
    instances.set(element, api);
    return api;
  }

  window.mountSemanticRoom = mountSemanticRoom;
  const autoMount = () => document.querySelectorAll('[data-semantic-scene]').forEach(mountSemanticRoom);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
})();
