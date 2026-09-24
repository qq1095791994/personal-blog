# 空间语义概念演示

独立的 Canvas 2D 透视房间模块。入口、协作桌面、具身设备、关系连线与预设路径均为程序绘制；对象和关系由作者手工定义。组件不调用识别模型，也不表示真实感知、追踪或导航结果。

## 集成

直接从 [`embed.html`](embed.html) 复制 `<section class="semantic-scene" data-semantic-scene>…</section>` 到目标页面，并加载：

```html
<link rel="stylesheet" href="assets/semantic/semantic-room.css">
<script src="assets/semantic/semantic-room.js" defer></script>
```

`embed.html` 是可独立打开的完整预览页。里面的 `<base>` 和内联 `preview` 样式仅用于预览；复制到首页时不要带入。建议模块宽 1100–1360px，桌面高度约 570–650px。窄于 900px 时房间和说明会自动上下排列。

加载后脚本会自动增强 `data-semantic-scene`。也可手动调用 `window.mountSemanticRoom(element)`；返回对象提供 `select('entry' | 'desk' | 'robot')`、`pause()`、`resume()`、`destroy()`。重复挂载同一个元素会返回已有实例。

## 交互和回退

- 点击房间里的三个对象标签或对象圆点，右侧原生 `<details>` 会显示相应的语义关系；直接点击 `<details>` 也能切换。
- 鼠标位置产生轻微视角变化，具身设备沿预设路径运动。移动端保留点击，降低帧率和像素比。
- JavaScript 不可用或 Canvas 2D 不能初始化时，静态 SVG 和原生 `<details>` 仍完整可用。移动端使用单独绘制的静态 SVG，确保三个对象都在画面中。
- 系统偏好减少动画或开启节省流量时，Canvas 只显示静态帧；切换后台或移出视口后暂停。

性能上限为桌面 30 帧/秒、移动端 22 帧/秒；设备像素比上限分别为 1.5 和 1.15，绘制尺寸上限为 1500 × 950。无网络请求、外部库或图像贴图。

## 已验证

- Node.js 语法检查。
- Chromium 桌面渲染和 390px 真正移动视口渲染；文档横向宽度与视口同为 390px。
- 通过 DevTools 禁用脚本后的移动端 SVG + 原生详情回退。
- 三个对象逐一点击后，只有对应详情展开；减少动态效果下两次 Canvas 帧内容相同。
