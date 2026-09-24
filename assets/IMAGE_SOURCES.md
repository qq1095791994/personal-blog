# 图片来源与说明

首屏实时 CG 场景由 `assets/cg/spatial-scene.js` 程序绘制，是交互设计方向的概念演示，不代表已交付项目；其下方的 `work/concept-intelligent-space.webp` 是 WebGL 不可用时显示的 AI 概念后备图。两者均与下方真实项目作品分开标注。

网站里的项目图选自本人提供的 `作品集与简历` 目录，已压缩为 WebP 供网页展示：

- `work/audi-*`：车机 / 奥迪项目 1。
- `work/season-*`：车机 / 奥迪项目 2。
- `work/city-*`：可视化类型 / UE 可视化。
- `work/urban-*`：可视化类型 / UE5 商业。
- `work/temple-*`：游戏类型 / UE 古庙。
- `work/fantasy-*`：游戏类型 / UE 仙侠。

`auto-motion.mp4` 与 `motion-loop.mp4` 来自同一作品目录中的短片。

## AI 概念视觉

以下两张图为 AI 生成，仅用于表达智能空间方向，不代表真实客户或已交付项目。网页上均明确标注。

- `work/concept-intelligent-space.webp`：现代建筑室内，中央发光环形装置，冷青色数据光路、石材和金属材质，电影感广角构图；无文字、品牌或客户标识。
- `work/concept-digital-twin.webp`：公共空间剖切式数字孪生概念，表现多层建筑与隐形数据层，冷灰与铜色灯光；无文字、品牌或客户标识。

两张图使用内置 ImageGen 工具生成，并转换为 WebP 用于本站。

## AI 辅助后期封面

以下 4 张展示封面以对应的真实项目画面为参考，用 ImageGen 强化光影、色彩和氛围。生成过程可能重绘局部纹理或细节，因此它们明确标为「AI 辅助后期」，只作为网页展示封面，不能用于证明项目原貌、交付内容或技术实现。图集中的原始画面完整保留，可与封面直接对照。

| 展示封面 | 参考原图 | 处理方向 |
| --- | --- | --- |
| `work/graded/urban-02.png` | `work/urban-02.webp` | 城市空间的晚间暖光、立面与道路细节、天空层次 |
| `work/graded/season-02.png` | `work/season-02.webp` | 座舱主题的夜景色彩、车身反射、月亮与灯笼曝光 |
| `work/graded/temple-01.png` | `work/temple-01.webp` | 古庙石雕层次、暖光、暗部细节 |
| `work/graded/fantasy-04.png` | `work/fantasy-04.webp` | 仙侠街景的斜阳、灯笼、远处空间层次 |

后期提示词均要求保持原有机位、主体、构图和建筑/车辆/角色位置，不新增文字或水印；具体处理仅限曝光、对比度、色彩、光照与氛围。数据界面较多的 HMI 与 GIS 封面继续使用原图，以免可读信息被生成式处理误改。

### 生成提示词

`concept-intelligent-space.webp`：

> An original, premium visual concept of an intelligent interactive space. Vast contemporary architectural interior with dark basalt surfaces and brushed aluminum, a luminous circular installation at the center, thin cyan and amber data light paths, subtle volumetric mist, reflections and one small anonymous silhouette. Photorealistic architectural visualization with credible materials and physical lighting; cinematic ultra-wide composition with dark negative space on the left. No readable UI, logos, brand names, text, watermark or recognizable client project.

`concept-digital-twin.webp`：

> A speculative digital twin of a contemporary public space shown as a cutaway architectural model. Elegant multi-level transit atrium or cultural venue, physical building and invisible sensor/data layers visible together, tiny human silhouettes and subtle glowing paths. Wide landscape composition with detailed architecture on the left and open dark space on the right. Credible architectural visualization with a technical illustration feel; slate blue, concrete, steel, pearl white and copper highlights. No client identity, readable labels, holographic dashboard panels, text, logos or watermark.
