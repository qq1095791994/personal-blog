const path = (group, count) => Array.from({length: count}, (_, i) => `assets/work/${group}-${String(i + 1).padStart(2, '0')}.webp`);

const projects = {
  audi: {
    category: '车机 HMI / 实时视觉',
    title: '把驾驶状态变成可感知的画面',
    description: '越野、竞速等驾驶模式需要各自清晰的视觉语言。图集展示了模式场景、车辆表现和信息叠加的不同方案，画面来自个人作品资料中的奥迪相关项目。',
    role: '在车机项目中负责美术需求拆解、技术路线和最终视觉效果把控。',
    images: path('audi', 4)
  },
  city: {
    category: '智慧城市 / GIS + UE',
    title: '让城市数据进入实时场景',
    description: '把地形、道路、建筑与数据界面放到同一个可交互的空间里，让区域状态和业务信息更容易被理解。图集包含城市、水利及工业场景中的可视化画面。',
    role: '参与 GIS 数据处理、UE 场景制作、模型优化，以及可视化画面落地。',
    images: path('city', 6)
  },
  urban: {
    category: '空间可视化 / UE',
    title: '可漫游的城市与建筑空间',
    description: '从整体城市形态到步行视角，实时场景让方案能够被漫游和审视。图集展示商业空间与建筑环境的不同尺度。',
    role: 'UE 场景美术、建筑空间表现与视觉效果调整。',
    images: path('urban', 6),
    enhanced: 'assets/work/graded/urban-02.webp',
    enhancedOriginalIndex: 2
  },
  season: {
    category: '座舱主题 / 氛围设计',
    title: '把节日情绪带进座舱',
    description: '中秋、圣诞和春节等主题把车辆、环境和氛围动效组合成一套座舱体验。这里展示的是作品资料中收录的车机主题画面。',
    role: '车机项目的主题视觉与场景表现。',
    images: path('season', 4),
    enhanced: 'assets/work/graded/season-02.webp',
    enhancedOriginalIndex: 2
  },
  temple: {
    category: '游戏场景 / UE',
    title: '古庙：材质、光影与叙事',
    description: '石材、植被、角色和光线共同构成可探索的场景。不同视角展示了环境细节和整体氛围。',
    role: '实时场景美术与材质、光影表现。',
    images: path('temple', 5),
    enhanced: 'assets/work/graded/temple-01.webp',
    enhancedOriginalIndex: 1
  },
  fantasy: {
    category: '实时环境 / UE',
    title: '仙侠：建立可以进入的世界',
    description: '以山体、屋檐、路径和远景组织空间层次，让东方幻想世界在实时引擎中形成连续的观看体验。',
    role: '场景搭建、资产整合与环境氛围表现。',
    images: path('fantasy', 5),
    enhanced: 'assets/work/graded/fantasy-04.webp',
    enhancedOriginalIndex: 4
  }
};

document.querySelector('#year').textContent = new Date().getFullYear();

const grid = document.querySelector('.work-grid');
const cards = document.querySelectorAll('.work-card');
document.querySelectorAll('.filters button').forEach(button => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    document.querySelectorAll('.filters button').forEach(other => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    grid.classList.toggle('filtered', selected !== 'all');
    cards.forEach(card => { card.hidden = selected !== 'all' && card.dataset.category !== selected; });
  });
});

const dialog = document.querySelector('#project-dialog');
const mainImage = document.querySelector('#dialog-image');
const count = document.querySelector('#image-count');
const imageNote = document.querySelector('#dialog-image-note');
const thumbs = document.querySelector('#dialog-thumbs');
let activeProject = null;
let activeGallery = [];
let activeIndex = 0;
let opener = null;

function showImage(index) {
  if (!activeProject) return;
  activeIndex = (index + activeGallery.length) % activeGallery.length;
  const slide = activeGallery[activeIndex];
  mainImage.src = slide.src;
  mainImage.alt = `${activeProject.title}，${slide.enhanced ? 'AI 辅助后期封面' : `原始画面第 ${slide.originalIndex} 张`}`;
  count.textContent = `${activeIndex + 1} / ${activeGallery.length}`;
  imageNote.textContent = slide.enhanced ? 'AI 辅助后期封面 · 下一张为同一作品的原始画面' : '原始项目画面 · 未经生成式后期处理';
  thumbs.querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('active', i === activeIndex);
    button.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');
  });
}

cards.forEach(card => card.addEventListener('click', () => {
  opener = card;
  activeProject = projects[card.dataset.project];
  const originals = activeProject.images.map((src, i) => ({src, originalIndex: i + 1}));
  if (activeProject.enhanced) {
    const [comparison] = originals.splice(activeProject.enhancedOriginalIndex - 1, 1);
    activeGallery = [{src: activeProject.enhanced, enhanced: true}, comparison, ...originals];
  } else activeGallery = originals;
  document.querySelector('#dialog-category').textContent = activeProject.category;
  document.querySelector('#dialog-title').textContent = activeProject.title;
  document.querySelector('#dialog-description').textContent = activeProject.description;
  document.querySelector('#dialog-role').textContent = activeProject.role;
  document.querySelector('#dialog-gallery-size').textContent = activeProject.enhanced ? `${activeProject.images.length} 张原始画面 + 1 张 AI 辅助后期封面` : `${activeProject.images.length} 张原始画面`;
  thumbs.replaceChildren(...activeGallery.map((slide, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', slide.enhanced ? '查看 AI 辅助后期封面' : `查看第 ${slide.originalIndex} 张原始画面`);
    if (slide.enhanced) button.dataset.enhanced = 'true';
    const img = document.createElement('img');
    img.src = slide.src;
    img.alt = '';
    button.append(img);
    button.addEventListener('click', () => showImage(i));
    return button;
  }));
  showImage(0);
  dialog.showModal();
  document.querySelector('.dialog-close').focus();
}));

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#prev-image').addEventListener('click', () => showImage(activeIndex - 1));
document.querySelector('#next-image').addEventListener('click', () => showImage(activeIndex + 1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => opener?.focus());
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showImage(activeIndex - 1);
  if (event.key === 'ArrowRight') showImage(activeIndex + 1);
});

const canTilt = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
if (canTilt.matches) {
  cards.forEach(card => {
    card.addEventListener('pointermove', event => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 3).toFixed(2)}deg`);
      card.style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--shine-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--shine-x');
      card.style.removeProperty('--shine-y');
    });
  });
}
