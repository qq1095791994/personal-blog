import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createFantasyStreet } from './fantasy-street.js';

const hero = document.querySelector('[data-world-hero]');
const stage = document.querySelector('[data-world-stage]');

if (hero && stage) {
  const status = hero.querySelector('[data-world-status]');
  const modeButton = hero.querySelector('[data-world-mode]');
  const fullscreenButton = hero.querySelector('[data-world-fullscreen]');
  const moveButtons = [...hero.querySelectorAll('[data-world-move]')];
  const viewButtons = [...hero.querySelectorAll('[data-world-view]')];
  const sourceDialog = document.querySelector('[data-world-source-dialog]');
  const sourceButtons = document.querySelectorAll('[data-world-source]');
  const mobile = matchMedia('(max-width: 700px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      alpha: false,
      powerPreference: mobile ? 'default' : 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.append(renderer.domElement);
  } catch (error) {
    hero.classList.add('world-unavailable');
    status.textContent = '此设备暂无法显示 3D 场景，当前展示作品原图。';
    console.warn('3D scene unavailable:', error);
  }

  if (renderer) {
    const world = createFantasyStreet(THREE, { mobile });
    const scene = world.scene;
    const views = world.views;
    const viewFor = name => name === 'entry' && mobile
      ? { position: [0, 10, 43], target: [0, 2.2, -8] }
      : views[name];
    const defaultView = viewFor('entry');
    const camera = new THREE.PerspectiveCamera(49, 1, 0.08, 280);
    camera.position.fromArray(defaultView.position);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.fromArray(defaultView.target || world.target);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 80;
    controls.minPolarAngle = 0.14;
    controls.maxPolarAngle = Math.PI / 2 - 0.035;
    controls.rotateSpeed = mobile ? 0.75 : 0.64;
    controls.zoomSpeed = 0.8;
    controls.maxTargetRadius = 22;
    controls.update();

    let mode = 'orbit';
    let currentView = 'entry';
    let visible = true;
    let transition = null;
    let frame = 0;
    let lastFrame = 0;
    let lastTime = 0;
    let dragging = false;
    let dragPoint = { x: 0, y: 0 };
    let yaw = 0;
    let pitch = 0;
    const pressed = new Set();
    const fps = mobile ? 24 : 45;

    const setStatus = message => { status.textContent = message; };
    const setActiveView = name => {
      currentView = name;
      viewButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.worldView === name));
      });
    };

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      camera.aspect = width / height;
      camera.fov = width < 570 ? 61 : 49;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function lookDirection() {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      yaw = Math.atan2(-direction.x, -direction.z);
      pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    }

    function updateWalkDirection() {
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
    }

    function showView(name, animate = true) {
      const view = viewFor(name);
      if (!view) return;
      mode = 'orbit';
      pressed.clear();
      dragging = false;
      controls.enabled = true;
      hero.classList.remove('is-walking');
      modeButton.textContent = '进入街道';
      modeButton.setAttribute('aria-pressed', 'false');
      setActiveView(name);
      const toPosition = new THREE.Vector3().fromArray(view.position);
      const toTarget = new THREE.Vector3().fromArray(view.target || world.target);
      if (animate && !reducedMotion) {
        transition = {
          start: performance.now(),
          duration: 850,
          fromPosition: camera.position.clone(),
          fromTarget: controls.target.clone(),
          toPosition,
          toTarget
        };
      } else {
        transition = null;
        camera.position.copy(toPosition);
        controls.target.copy(toTarget);
        controls.update();
      }
      setStatus('拖拽可 360° 环绕；滚轮或双指可缩放，右键可平移。');
    }

    function enterStreet() {
      const view = views.street;
      if (!view) return;
      transition = null;
      mode = 'walk';
      controls.enabled = false;
      camera.position.set(0, 1.72, 13);
      camera.lookAt(0, 1.72, -6);
      lookDirection();
      updateWalkDirection();
      hero.classList.add('is-walking');
      modeButton.textContent = '退出漫游';
      modeButton.setAttribute('aria-pressed', 'true');
      setActiveView('street');
      setStatus('拖拽环视 360°；W A S D 或方向键在街道中移动。');
      stage.focus({ preventScroll: true });
    }

    function exitStreet() { showView('entry'); }

    function updateMovement(dt) {
      if (mode !== 'walk' || !pressed.size) return;
      const forward = Number(pressed.has('forward')) - Number(pressed.has('back'));
      const right = Number(pressed.has('right')) - Number(pressed.has('left'));
      const length = Math.hypot(forward, right) || 1;
      const distance = (mobile ? 3.2 : 4.2) * dt / length;
      camera.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * distance;
      camera.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * distance;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.7, 4.7);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -16, 13);
      camera.position.y = 1.72;
    }

    function loop(now) {
      frame = 0;
      if (!visible || document.hidden) return;
      frame = requestAnimationFrame(loop);
      if (now - lastFrame < 1000 / fps) return;
      const dt = Math.min((now - (lastTime || now)) / 1000, 0.06);
      lastFrame = now;
      lastTime = now;
      if (mode === 'orbit') {
        if (transition) {
          const t = Math.min((now - transition.start) / transition.duration, 1);
          const eased = t * t * (3 - 2 * t);
          camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
          controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
          if (t === 1) transition = null;
        }
        controls.update();
      } else {
        updateMovement(dt);
      }
      renderer.render(scene, camera);
    }

    function startLoop() {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
    }

    controls.addEventListener('start', () => { transition = null; });
    viewButtons.forEach(button => button.addEventListener('click', () => showView(button.dataset.worldView)));
    modeButton.addEventListener('click', () => mode === 'walk' ? exitStreet() : enterStreet());

    stage.addEventListener('pointerdown', event => {
      if (mode !== 'walk' || event.target !== renderer.domElement) return;
      dragging = true;
      dragPoint = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      if (!dragging || mode !== 'walk') return;
      yaw -= (event.clientX - dragPoint.x) * (mobile ? 0.005 : 0.0038);
      pitch = THREE.MathUtils.clamp(pitch - (event.clientY - dragPoint.y) * 0.0035, -1.15, 1.15);
      dragPoint = { x: event.clientX, y: event.clientY };
      updateWalkDirection();
    });
    const stopDrag = () => { dragging = false; };
    stage.addEventListener('pointerup', stopDrag);
    stage.addEventListener('pointercancel', stopDrag);
    stage.addEventListener('wheel', event => {
      if (mode !== 'walk') return;
      event.preventDefault();
      const step = Math.sign(event.deltaY) * 0.55;
      camera.position.x += Math.sin(yaw) * step;
      camera.position.z += Math.cos(yaw) * step;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.7, 4.7);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -16, 13);
    }, { passive: false });

    const keyMap = { w: 'forward', ArrowUp: 'forward', s: 'back', ArrowDown: 'back', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' };
    window.addEventListener('keydown', event => {
      if (mode !== 'walk' || sourceDialog?.open) return;
      if (event.key === 'Escape') { exitStreet(); return; }
      const move = keyMap[event.key];
      if (move) { event.preventDefault(); pressed.add(move); if (!event.repeat) updateMovement(0.11); }
    });
    window.addEventListener('keyup', event => { if (keyMap[event.key]) pressed.delete(keyMap[event.key]); });
    window.addEventListener('blur', () => pressed.clear());
    moveButtons.forEach(button => {
      const direction = button.dataset.worldMove;
      button.addEventListener('pointerdown', event => { event.preventDefault(); pressed.add(direction); updateMovement(0.1); button.setPointerCapture(event.pointerId); });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => pressed.delete(direction));
    });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) startLoop();
      }, { threshold: 0.02 }).observe(hero);
    }
    document.addEventListener('visibilitychange', startLoop);
    resize();
    renderer.render(scene, camera);
    hero.classList.add('world-ready');
    startLoop();
    setStatus('拖拽可 360° 环绕；滚轮或双指可缩放，右键可平移。');
  }

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === hero) await document.exitFullscreen();
      else await hero.requestFullscreen();
    } catch (error) { console.warn('Fullscreen unavailable:', error); }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement === hero ? '退出全屏' : '全屏查看';
  });

  sourceButtons.forEach(button => button.addEventListener('click', () => sourceDialog?.showModal()));
  sourceDialog?.querySelector('[data-world-source-close]')?.addEventListener('click', () => sourceDialog.close());
  sourceDialog?.addEventListener('click', event => { if (event.target === sourceDialog) sourceDialog.close(); });
}
