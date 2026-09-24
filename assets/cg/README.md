# Spatial Atrium

用于作品集首屏的独立实时 3D 场景。建筑门廊、地面导线、悬浮面板、响应环和粒子均由程序生成，没有图片贴图或第三方运行时依赖。这是方向表达用的视觉，不应描述为真实项目成果。

## 接入

把 CSS 放在站点样式之后，将场景容器放在后备图片之后、遮罩和文案之前。脚本使用 `defer`；加载后会自动挂载所有 `data-cg-scene` 元素。

```html
<link rel="stylesheet" href="assets/cg/spatial-scene.css">

<section class="hero">
  <img class="hero-image" src="assets/work/concept-intelligent-space.webp" alt="智能空间概念视觉">
  <div class="cg-scene" data-cg-scene aria-hidden="true"></div>
  <div class="hero-shade"></div>
  <div class="hero-copy">…</div>
</section>

<script src="assets/cg/spatial-scene.js" defer></script>
```

也可手动调用 `window.mountSpatialScene(element)`。返回对象提供 `pause()`、`resume()` 和 `destroy()`；重复挂载同一元素会返回已有实例。

## 行为与成本

- 鼠标移动让镜头缓慢偏移；滚动产生轻微景深变化；响应环和粒子持续运动。
- 桌面最高约 45 帧/秒，移动端约 26 帧/秒；设备像素比最高 1.35，渲染目标最高约 1700 × 1050。
- 每帧 3 次绘制调用，约 1.7 万个静态顶点与 105 个桌面粒子；移动端粒子降至 38 个。
- 离开可视区域或切换后台时暂停。系统启用“减少动态效果”或浏览器开启节省流量时仅渲染一帧静态画面。
- WebGL2 不可用、着色器编译失败或上下文丢失时，容器恢复透明，原首屏图片继续显示。

图像来源说明需要明确区分程序生成 CG 概念画面、AI 概念图和个人真实作品图。
