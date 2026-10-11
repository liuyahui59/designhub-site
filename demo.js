const $ = (id) => document.getElementById(id);

const DEMO = {
  specUrl: './assets/demo-workorder/spec.json',
  previewUrl: './assets/demo-workorder/preview.png',
  assetBase: './assets/demo-workorder/assets/',
  projectName: '工单',
  artboardLabel: '员工工单详情 · 1920×1150',
  defaultLayerId: 'EA07F084-1F14-4BF7-A8B9-4F747C51DF5E',
};

const ICON = {
  artboard: '⬒', group: '▣', symbolMaster: '◆', symbolInstance: '◇',
  text: 'T', rectangle: '▭', oval: '◯', shapeGroup: '◈', shapePath: '⌇',
  bitmap: '▤', slice: '✂', polygon: '⬟', star: '★', line: '╱', triangle: '△',
};

const sizingLabels = { fixed: '固定', fit: '随内容', fill: '填充父容器', relative: '按父容器比例' };
const alignmentLabels = {
  'flex-start': '起点', center: '居中', 'flex-end': '终点', stretch: '拉伸', inherit: '跟随父级',
  'space-between': '两端对齐', 'space-around': '环绕分布', 'space-evenly': '均匀分布',
};

const state = {
  spec: null,
  selectedId: null,
  hoverId: null,
  zoom: 1,
  fitZoom: 1,
  autoFit: true,
  showSpacing: true,
  showHots: true,
  measureMode: false,
  measurement: '',
  pin: [],
  expanded: new Set(),
  assetsByNode: new Map(),
  assetQuery: '',
  assetFormat: '',
  platform: 'css',
  activeTab: 'props',
  allExpanded: false,
};

const comments = [
  { id: 'c1', layerId: '4141E75D-1C32-4724-93B2-EEF7E077D2E6', author: '小迪', time: '10:32', body: '回复区提交中需要保留当前输入，并避免重复发送。', resolved: true },
  { id: 'c2', layerId: 'BAB8949A-85C1-4346-8917-114711615779', author: '产品', time: '14:18', body: '办结属于不可逆业务动作，正式接入前需补充确认流程。', resolved: false },
];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list.flat(Infinity)) if (child) node.append(child);
  return node;
}

function rgba(hex = '#000000', alpha = 1) {
  if (alpha == null || alpha >= 1) return hex.toUpperCase();
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map((x) => x + x).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${Math.round(alpha * 100) / 100})`;
}

function swatch(hex, alpha = 1) {
  return el('span', { class: 'swatch' }, el('i', { style: { background: rgba(hex, alpha) } }));
}

function gradientCss(gradient, width = 1, height = 1) {
  if (!gradient?.stops?.length || !gradient.from || !gradient.to) return null;
  const kind = gradient.gradientType || 'linear';
  const dx = (gradient.to.x - gradient.from.x) * width;
  const dy = (gradient.to.y - gradient.from.y) * height;
  const angle = Math.round(Math.atan2(dx, -dy) * 180 / Math.PI * 100) / 100;
  const stops = gradient.stops.map((stop) => `${rgba(stop.hex, stop.alpha)} ${Math.round(stop.position * 10000) / 100}%`).join(', ');
  const at = `${gradient.from.x * 100}% ${gradient.from.y * 100}%`;
  if (kind === 'radial') return `radial-gradient(circle at ${at}, ${stops})`;
  if (kind === 'angular') return `conic-gradient(from ${angle}deg at ${at}, ${stops})`;
  return `linear-gradient(${angle}deg, ${stops})`;
}

async function copy(value, message = '已复制') {
  try {
    await navigator.clipboard.writeText(String(value));
    showNotice(message);
  } catch {
    showNotice('浏览器未允许复制，请手动选择', true);
  }
}

let noticeTimer;
function showNotice(message, error = false) {
  const bar = $('noticeBar');
  bar.className = 'notice-bar';
  bar.replaceChildren(el('div', { class: `notice ${error ? 'danger' : 'info'}` }, [
    el('span', { class: 'n-label', text: error ? '操作未完成' : 'DesignHub' }),
    el('span', { class: 'n-body', text: message }),
  ]));
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { bar.className = 'notice-bar hidden'; }, 2200);
}

async function init() {
  try {
    const response = await fetch(DEMO.specUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.spec = await response.json();
  } catch (error) {
    showNotice(`无法读取公开体验数据：${error.message}`, true);
    document.querySelector('.workspace').classList.add('hidden');
    return;
  }

  hydrateAssets();
  $('preview').src = DEMO.previewUrl;
  $('preview').alt = '员工工单详情设计稿';
  $('crumbProject').textContent = DEMO.projectName;
  $('artboardSelect').replaceChildren(el('option', { value: state.spec.id, text: DEMO.artboardLabel }));
  $('commentCount').textContent = `${comments.length} 条批注`;
  state.expanded.add(state.spec.tree.id);
  for (const child of state.spec.tree.children || []) state.expanded.add(child.id);
  bindUI();
  renderTree();
  renderCanvas(true);
  renderProps(null);
  renderAssets();
  renderTokens();
  renderCode(null);
  renderComments();
  $('canvasMeta').textContent = `${state.spec.frame.width}×${state.spec.frame.height} · 图层 ${state.spec.counts.layers} · 切图 ${state.spec.counts.assets}`;
  document.title = `${DEMO.projectName} · ${state.spec.name} · DesignHub`;

  const layer = new URLSearchParams(location.search).get('layer');
  if (layer && findNode(layer)) selectNode(layer);
  else selectNode(DEMO.defaultLayerId);
}

function hydrateAssets() {
  for (const asset of state.spec.assets || []) {
    asset.files = Array.isArray(asset.files) ? asset.files : [];
    asset.fileFormats = [...new Set(asset.files.map((file) => file.format))];
    asset.scales = [...new Set(asset.files.map((file) => file.scale))].sort((a, b) => a - b);
    state.assetsByNode.set(asset.nodeId, asset);
  }
}

function renderCanvas(fit = false) {
  if (fit) fitCanvas();
  const { frame: specFrame } = state.spec;
  const width = specFrame.width * state.zoom;
  const height = specFrame.height * state.zoom;
  const frame = $('frame');
  const preview = $('preview');
  Object.assign(frame.style, { width: `${width}px`, height: `${height}px` });
  Object.assign(preview.style, { width: `${width}px`, height: `${height}px` });
  Object.assign($('stage').style, { width: `${width}px`, height: `${height}px` });
  $('zoomLabel').textContent = `${Math.round(state.zoom * 100)}%`;
  renderHots();
  refreshMeasurements();
  renderCommentPins();
}

function fitCanvas() {
  const wrap = $('canvasWrap');
  const availableWidth = Math.max(200, wrap.clientWidth - 90);
  const availableHeight = Math.max(300, wrap.clientHeight - 120);
  state.fitZoom = Math.max(0.25, Math.min(1, availableWidth / state.spec.frame.width, availableHeight / state.spec.frame.height));
  state.zoom = Math.round(state.fitZoom * 100) / 100;
  state.autoFit = true;
}

function renderHots() {
  const host = $('hots');
  host.replaceChildren();
  host.classList.toggle('quiet', !state.showHots);
  const z = state.zoom;
  for (const layer of state.spec.layers) {
    if (layer.id === state.spec.tree.id || layer.visible === false) continue;
    const hot = el('div', { class: 'hot', dataset: { id: layer.id }, title: `${layer.name} · ${layer.abs.width}×${layer.abs.height}` });
    Object.assign(hot.style, {
      left: `${layer.abs.x * z}px`, top: `${layer.abs.y * z}px`,
      width: `${Math.max(1, layer.abs.width * z)}px`, height: `${Math.max(1, layer.abs.height * z)}px`,
    });
    hot.classList.toggle('sel', layer.id === state.selectedId);
    hot.classList.toggle('pin', state.pin.includes(layer.id));
    hot.addEventListener('mouseenter', () => setHover(layer.id));
    hot.addEventListener('mouseleave', () => setHover(null));
    hot.addEventListener('click', (event) => { event.stopPropagation(); onLayerClick(layer.id); });
    host.append(hot);
  }
}

function onLayerClick(id) {
  if (state.measureMode) {
    if (!state.pin.length || state.pin.length === 2) state.pin = [id];
    else if (state.pin[0] !== id) state.pin.push(id);
    selectNode(state.pin[0]);
    refreshMeasurements();
    return;
  }
  selectNode(id);
}

function setHover(id) {
  state.hoverId = id;
  document.querySelectorAll('.tree-row.hovered').forEach((row) => row.classList.remove('hovered'));
  document.querySelectorAll('.hot').forEach((hot) => hot.classList.toggle('hovered', hot.dataset.id === id));
  if (id) document.querySelector(`.tree-row[data-id="${cssEscape(id)}"]`)?.classList.add('hovered');
  refreshMeasurements();
}

function renderTree(query = '') {
  const host = $('tree');
  host.replaceChildren();
  const needle = query.trim().toLowerCase();

  if (needle) {
    const matches = flattenTree().filter((node) => `${node.name} ${node.path || ''} ${node.text?.content || ''}`.toLowerCase().includes(needle));
    for (const node of matches) host.append(treeRow(node, Math.min(2, node.depth || 0), true));
    if (!matches.length) host.append(el('div', { class: 'empty', text: '没有匹配的图层或文案' }));
    return;
  }

  const walk = (node, depth) => {
    host.append(treeRow(node, depth));
    if (state.expanded.has(node.id)) for (const child of node.children || []) walk(child, depth + 1);
  };
  walk(state.spec.tree, 0);
}

function treeRow(node, depth, searchResult = false) {
  const hasKids = (node.children || []).length > 0;
  const open = state.expanded.has(node.id);
  const caret = el('span', { class: `tree-caret${hasKids ? (open ? ' open' : '') : ' leaf'}`, text: '▶' });
  if (hasKids && !searchResult) caret.addEventListener('click', (event) => {
    event.stopPropagation();
    if (open) state.expanded.delete(node.id); else state.expanded.add(node.id);
    renderTree($('layerSearch').value);
  });
  const row = el('div', {
    class: `tree-row${node.id === state.selectedId ? ' sel' : ''}${state.assetsByNode.has(node.id) ? ' has-export' : ''}${node.visible === false ? ' hidden-layer' : ''}`,
    dataset: { id: node.id }, style: { paddingLeft: `${6 + depth * 12}px` },
    role: 'button', tabindex: '0', title: `${node.name}\n${node.path || ''}`,
  }, [
    caret,
    el('span', { class: 'tree-icon', text: ICON[node.type] || '·' }),
    el('span', { class: 'tree-name', text: node.name }),
    node.text?.content ? el('span', { class: 'tree-text', text: `“${String(node.text.content).slice(0, 18)}”` }) : null,
  ]);
  row.addEventListener('click', () => selectNode(node.id));
  row.addEventListener('mouseenter', () => setHover(node.id));
  row.addEventListener('mouseleave', () => setHover(null));
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectNode(node.id); }
  });
  return row;
}

function selectNode(id) {
  const node = findNode(id);
  if (!node) return;
  state.selectedId = id;
  expandTo(id);
  renderTree($('layerSearch').value);
  renderHots();
  renderProps(node);
  renderCode(node);
  renderAssets(node);
  refreshMeasurements();
  const url = new URL(location.href);
  url.searchParams.set('layer', id);
  history.replaceState(null, '', url);
}

function expandTo(id) {
  const visit = (node, ancestors = []) => {
    if (node.id === id) { ancestors.forEach((item) => state.expanded.add(item.id)); return true; }
    return (node.children || []).some((child) => visit(child, [...ancestors, node]));
  };
  visit(state.spec.tree);
}

function findNode(id) {
  return flattenTree().find((node) => node.id === id) || null;
}

function flattenTree() {
  const result = [];
  const walk = (node, depth = 0) => { node.depth = depth; result.push(node); (node.children || []).forEach((child) => walk(child, depth + 1)); };
  walk(state.spec.tree);
  return result;
}

function parentOf(id) {
  let result = null;
  const walk = (node) => {
    for (const child of node.children || []) {
      if (child.id === id) result = node;
      else walk(child);
    }
  };
  walk(state.spec.tree);
  return result;
}

function propRow(key, value, copyValue = null, variable = null) {
  const display = Array.isArray(value) ? value : [el('span', { class: 'val', text: String(value), title: String(value) })];
  const val = el('div', { class: 'prop-val' }, display);
  const row = el('div', { class: 'prop-row' }, [el('div', { class: 'prop-key', text: key }), val]);
  if (variable?.name) {
    const details = el('div', { class: 'token-popover hidden' }, [
      el('div', { class: 'token-popover-title', text: '使用的变量' }),
      el('div', { class: 'token-popover-value', text: variable.name }),
      variable.source ? el('div', { class: 'token-popover-meta', text: `来源：${variable.source}` }) : null,
      variable.id ? el('div', { class: 'token-popover-meta', text: `ID：${variable.id}` }) : null,
    ]);
    const ref = el('button', {
      class: 'token-ref', type: 'button', text: '◇', title: `查看变量：${variable.name}`,
      'aria-label': `查看变量 ${variable.name}`, 'aria-expanded': 'false',
    });
    ref.addEventListener('click', (event) => {
      event.stopPropagation();
      const hidden = details.classList.toggle('hidden');
      row.classList.toggle('token-expanded', !hidden);
      ref.setAttribute('aria-expanded', String(!hidden));
    });
    val.append(ref);
    if (copyValue != null && copyValue !== '') row.append(el('button', { class: 'copy-btn', text: '复制', 'aria-label': `复制${key}`, onclick: () => copy(copyValue) }));
    row.append(details);
    return row;
  }
  if (copyValue != null && copyValue !== '') row.append(el('button', { class: 'copy-btn', text: '复制', 'aria-label': `复制${key}`, onclick: () => copy(copyValue) }));
  return row;
}

function colorValue(hex, alpha = 1) {
  return [swatch(hex, alpha), el('span', { class: 'val', text: rgba(hex, alpha) })];
}

function section(title, rows) {
  return el('div', { class: 'section' }, [el('div', { class: 'section-title', text: title }), rows]);
}

function renderProps(node) {
  const host = $('paneProps');
  host.replaceChildren();
  if (!node) {
    host.append(el('div', { class: 'empty' }, [el('div', { text: '选择画布上的元素查看标注' }), el('div', { text: '也可以直接点左侧图层树' })]));
    return;
  }

  const actions = el('div', { class: 'inspect-actions' }, [
    el('button', { class: 'btn sm', text: '复制 CSS', onclick: () => copy(codeFor(node, 'css'), 'CSS 已复制') }),
    el('button', { class: 'btn sm', text: '定位元素', onclick: () => revealNode(node.id) }),
    state.assetsByNode.has(node.id) ? el('button', { class: 'btn sm', text: '查看切图', onclick: () => switchTab('assets') }) : null,
  ]);
  host.append(el('div', { class: 'section' }, [el('div', { class: 'node-title', text: node.name }), el('div', { class: 'node-path', text: node.path || '' }), actions]));

  const parent = parentOf(node.id);
  const geometry = [
    propRow('尺寸', `${node.abs.width} × ${node.abs.height}`, `${node.abs.width} × ${node.abs.height}`),
    propRow('绝对坐标', `x ${node.abs.x}   y ${node.abs.y}`, `${node.abs.x}, ${node.abs.y}`),
  ];
  if (parent) {
    geometry.push(propRow('相对父级', `${node.frame.x}, ${node.frame.y}`, `${node.frame.x}, ${node.frame.y}`));
    geometry.push(propRow('父容器', parent.name));
  }
  if (node.rotation) geometry.push(propRow('旋转', `${node.rotation}°`));
  if (node.transform) geometry.push(propRow('翻转', [node.transform.flipHorizontal ? '水平' : '', node.transform.flipVertical ? '垂直' : ''].filter(Boolean).join(' / ')));
  if (node.locked) geometry.push(propRow('状态', '已锁定'));
  if (node.visible === false) geometry.push(propRow('可见性', '已隐藏'));
  host.append(section('尺寸与位置', geometry));

  if (parent && node.type !== 'artboard') {
    const p = parent.abs;
    const pad = {
      top: round(node.abs.y - p.y), right: round(p.x + p.width - node.abs.x - node.abs.width),
      bottom: round(p.y + p.height - node.abs.y - node.abs.height), left: round(node.abs.x - p.x),
    };
    host.append(section('距父容器边缘', propRow('边缘距离', `上 ${pad.top}  右 ${pad.right}  下 ${pad.bottom}  左 ${pad.left}`, `${pad.top} ${pad.right} ${pad.bottom} ${pad.left}`)));
  }

  const layout = node.layout;
  if (layout) {
    const rows = [];
    for (const [axis, label] of [['horizontal', '宽度'], ['vertical', '高度']]) {
      if (sizingLabels[layout.sizing?.[axis]]) rows.push(propRow(label, sizingLabels[layout.sizing[axis]]));
    }
    const stack = layout.stack;
    if (stack) {
      rows.push(propRow('方向', stack.direction === 'row' ? '横向 · Flex row' : '纵向 · Flex column', stack.direction));
      rows.push(propRow('子项间距', `${stack.gap}px`, `${stack.gap}px`));
      const padding = stack.padding || { top: 0, right: 0, bottom: 0, left: 0 };
      rows.push(propRow('内边距', `上 ${padding.top}  右 ${padding.right}  下 ${padding.bottom}  左 ${padding.left}`, `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`));
      rows.push(propRow('主轴对齐', alignmentLabels[stack.justifyContent] || stack.justifyContent, stack.justifyContent));
      rows.push(propRow('交叉轴对齐', alignmentLabels[stack.alignItems] || stack.alignItems, stack.alignItems));
      rows.push(propRow('换行', stack.wraps ? '允许换行' : '不换行', stack.wraps ? 'wrap' : 'nowrap'));
      if (stack.wraps) {
        rows.push(propRow('行间距', `${stack.crossAxisGap}px`, `${stack.crossAxisGap}px`));
        rows.push(propRow('多行对齐', alignmentLabels[stack.alignContent] || stack.alignContent, stack.alignContent));
      }
      if (stack.bordersAffectLayout) rows.push(propRow('描边参与布局', '是'));
    }
    if (layout.item?.alignSelf && layout.item.alignSelf !== 'inherit') rows.push(propRow('独立对齐', alignmentLabels[layout.item.alignSelf] || layout.item.alignSelf, layout.item.alignSelf));
    if (layout.item?.ignoreLayout) rows.push(propRow('子项定位', '脱离堆叠布局', 'absolute'));
    if (layout.item?.preserveSpaceWhenHidden) rows.push(propRow('隐藏时占位', '保留空间'));
    for (const [axis, label, names] of [['horizontal', '水平固定边', { 1: '左', 4: '右', 5: '左右' }], ['vertical', '垂直固定边', { 1: '上', 4: '下', 5: '上下' }]]) {
      if (names[layout.pins?.[axis]]) rows.push(propRow(label, names[layout.pins[axis]]));
    }
    if (rows.length) host.append(section(stack ? '堆叠布局' : '尺寸规则', rows));
  }

  const styleRows = [];
  for (const fill of (node.style?.fills || []).filter((item) => (item.alpha ?? 1) > 0 && (item.opacity ?? 1) > 0)) {
    if (fill.type === 'color') styleRows.push(propRow('填充', colorValue(fill.hex, fill.alpha * (fill.opacity ?? 1)), rgba(fill.hex, fill.alpha * (fill.opacity ?? 1)), fill.token));
    else if (fill.type === 'gradient') {
      const css = gradientCss(fill, node.abs.width, node.abs.height);
      styleRows.push(propRow('渐变', `${{ linear: '线性', radial: '径向', angular: '角度' }[fill.gradientType] || fill.gradientType} · ${fill.stops?.length || 0} 个色标`, css));
      for (const stop of fill.stops || []) styleRows.push(propRow(`色标 ${Math.round(stop.position * 100)}%`, colorValue(stop.hex, stop.alpha), rgba(stop.hex, stop.alpha), stop.token));
    }
    if (fill.blendMode && fill.blendMode !== 'normal') styleRows.push(propRow('填充混合', fill.blendMode));
  }
  for (const border of node.style?.borders || []) {
    const css = `${border.thickness}px solid ${rgba(border.hex, border.alpha)}`;
    styleRows.push(propRow('边框', [swatch(border.hex, border.alpha), el('span', { class: 'val', text: `${border.thickness}px ${border.position || ''} ${rgba(border.hex, border.alpha)}`.trim() })], css, border.token));
  }
  if (node.style?.borderOptions?.dashPattern?.length) styleRows.push(propRow('虚线间隔', node.style.borderOptions.dashPattern.join(' / '), node.style.borderOptions.dashPattern.join(' ')));
  const radius = node.style?.cornerRadius;
  if (radius) {
    const values = [radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft];
    const display = values.every((value) => value === values[0]) ? `${values[0]}px` : values.join(' ');
    styleRows.push(propRow('圆角', display, display));
  }
  for (const shadow of node.style?.shadows || []) {
    if (shadow.alpha <= 0) continue;
    const css = `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${rgba(shadow.hex, shadow.alpha)}`;
    styleRows.push(propRow('阴影', css, css));
  }
  for (const shadow of node.style?.innerShadows || []) {
    const css = `inset ${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${rgba(shadow.hex, shadow.alpha)}`;
    styleRows.push(propRow('内阴影', css, css));
  }
  if (node.style?.opacity != null && node.style.opacity < 1) styleRows.push(propRow('透明度', `${round(node.style.opacity * 100)}%`, node.style.opacity));
  if (node.style?.blendMode && node.style.blendMode !== 'normal') styleRows.push(propRow('混合模式', node.style.blendMode));
  for (const blur of node.style?.blurs || (node.style?.blur ? [node.style.blur] : [])) styleRows.push(propRow('模糊', `${{ gaussian: '高斯', background: '背景', motion: '动感', zoom: '缩放' }[blur.type] || blur.type} ${blur.radius}px`));
  if (styleRows.length) host.append(section('外观', styleRows));

  if (node.text) {
    const text = node.text;
    const rows = [
      propRow('内容', text.content, text.content),
      propRow('字族', text.fontFamily, text.fontFamily),
      propRow('字号', `${text.fontSize}px`, `${text.fontSize}px`),
      propRow('字重', text.fontWeight, text.fontWeight),
      propRow('行高', `${text.lineHeight}px`, `${text.lineHeight}px`),
      propRow('字距', `${text.letterSpacing || 0}px`, `${text.letterSpacing || 0}px`),
      propRow('对齐', text.alignment),
      text.color ? propRow('文字色', colorValue(text.color.hex, text.color.alpha), rgba(text.color.hex, text.color.alpha), text.color.token) : null,
      text.italic || text.underline || text.strikethrough ? propRow('文字修饰', [text.italic ? '斜体' : '', text.underline ? '下划线' : '', text.strikethrough ? '删除线' : ''].filter(Boolean).join(' / ')) : null,
      text.paragraphSpacing ? propRow('段间距', `${text.paragraphSpacing}px`, `${text.paragraphSpacing}px`) : null,
    ];
    host.append(section('文字', rows.filter(Boolean)));
  }

  if (node.sharedStyle?.name) host.append(section('共享样式', propRow('样式', node.sharedStyle.name)));

  const asset = state.assetsByNode.get(node.id);
  if (asset) host.append(section('导出标记', [
    propRow('格式', asset.fileFormats.map((item) => item.toUpperCase()).join(' / '), asset.fileFormats.join(', ')),
    propRow('倍率', asset.scales.map((item) => `${item}x`).join(' / '), asset.scales.join(', ')),
    propRow('切图尺寸', `${asset.width} × ${asset.height}`, `${asset.width}x${asset.height}`),
  ]));
}

function assetCard(asset) {
  const preferred = asset.files.find((file) => file.format === 'png' && file.scale === 2) || asset.files[0];
  const thumb = el('div', { class: 'asset-thumb' }, preferred
    ? el('img', { src: `${DEMO.assetBase}${preferred.file}`, alt: asset.name, loading: 'lazy' })
    : el('span', { text: '—' }));
  const files = el('div', { class: 'asset-files' });
  for (const file of asset.files) files.append(el('a', {
    class: 'asset-file', href: `${DEMO.assetBase}${file.file}`, download: file.file,
    text: `${file.format.toUpperCase()}${file.scale !== 1 ? ` @${file.scale}x` : ''}`,
  }));
  return el('div', { class: `asset-item${asset.nodeId === state.selectedId ? ' selected' : ''}` }, [
    thumb,
    el('div', { class: 'asset-meta' }, [
      el('div', { class: 'asset-name', text: asset.name, title: asset.layerPath }),
      el('div', { class: 'asset-sub', text: `${asset.width}×${asset.height} · 图层导出` }),
      files,
      el('div', { class: 'inspect-actions' }, el('button', { class: 'btn sm', text: '定位图层', onclick: () => { selectNode(asset.nodeId); revealNode(asset.nodeId); } })),
    ]),
  ]);
}

function renderAssets(node = null) {
  const host = $('paneAssets');
  host.replaceChildren();
  const all = state.spec.assets || [];
  const search = el('input', { type: 'search', placeholder: '搜索切图名称', value: state.assetQuery });
  const format = el('select', {}, [el('option', { value: '', text: '全部格式' })]);
  for (const item of [...new Set(all.flatMap((asset) => asset.fileFormats))].sort()) format.append(el('option', { value: item, text: item.toUpperCase() }));
  format.value = state.assetFormat;
  const list = el('div');
  const update = () => {
    list.replaceChildren();
    const query = state.assetQuery.toLowerCase();
    const filtered = all.filter((asset) => asset.name.toLowerCase().includes(query) && (!state.assetFormat || asset.fileFormats.includes(state.assetFormat)));
    const ordered = [...filtered.filter((asset) => asset.nodeId === node?.id), ...filtered.filter((asset) => asset.nodeId !== node?.id)];
    if (!ordered.length) list.append(el('div', { class: 'empty', text: '没有匹配的切图' }));
    else ordered.forEach((asset) => list.append(assetCard(asset)));
  };
  search.addEventListener('input', () => { state.assetQuery = search.value; update(); });
  format.addEventListener('change', () => { state.assetFormat = format.value; update(); });
  host.append(section(`本画板切图 · ${all.length} 个`, null), el('div', { class: 'asset-filters' }, [search, format]), list);
  update();
}

function codeFor(node, platform) {
  const style = node.style || {};
  const fill = (style.fills || []).find((item) => item.type === 'color');
  const radius = style.cornerRadius?.topLeft || 0;
  const base = {
    width: node.abs.width,
    height: node.abs.height,
    color: fill ? rgba(fill.hex, fill.alpha) : null,
  };
  if (platform === 'ios') return `let view = UIView()\nview.frame = CGRect(x: ${node.frame.x}, y: ${node.frame.y}, width: ${base.width}, height: ${base.height})${base.color ? `\nview.backgroundColor = UIColor(hex: \"${base.color}\")` : ''}${radius ? `\nview.layer.cornerRadius = ${radius}` : ''}`;
  if (platform === 'android') return `<View\n    android:layout_width=\"${base.width}dp\"\n    android:layout_height=\"${base.height}dp\"${base.color ? `\n    android:background=\"${base.color}\"` : ''} />`;
  if (platform === 'flutter') return `Container(\n  width: ${base.width},\n  height: ${base.height},${base.color ? `\n  color: const Color(0xFF${base.color.replace('#', '')}),` : ''}\n)`;
  const lines = [`width: ${base.width}px;`, `height: ${base.height}px;`];
  if (base.color) lines.push(`background: ${base.color};`);
  if (radius) lines.push(`border-radius: ${radius}px;`);
  if (node.text) {
    lines.push(`font-family: \"${node.text.fontFamily}\";`, `font-size: ${node.text.fontSize}px;`, `font-weight: ${node.text.fontWeight};`, `line-height: ${node.text.lineHeight}px;`, `color: ${rgba(node.text.color.hex, node.text.color.alpha)};`);
  }
  return `.${slugify(node.name)} {\n  ${lines.join('\n  ')}\n}`;
}

function renderCode(node) {
  const host = $('paneCode');
  host.replaceChildren();
  if (!node) { host.append(el('div', { class: 'empty', text: '选择元素后生成可用代码' })); return; }
  const platforms = [['css', 'CSS'], ['ios', 'iOS'], ['android', 'Android'], ['flutter', 'Flutter']];
  const bar = el('div', { class: 'section-title', style: { gap: '4px', flexWrap: 'wrap' } });
  for (const [id, label] of platforms) bar.append(el('button', {
    class: `btn sm${state.platform === id ? ' active' : ''}`, text: label,
    onclick: () => { state.platform = id; renderCode(node); },
  }));
  const code = codeFor(node, state.platform);
  host.append(bar, section(platforms.find(([id]) => id === state.platform)[1], [
    el('button', { class: 'btn sm', text: '复制代码', style: { marginBottom: '8px' }, onclick: () => copy(code, '代码已复制') }),
    el('div', { class: 'code-block', text: code }),
  ]));
}

function extractTokens() {
  const colors = new Map();
  const typography = new Map();
  const radii = new Map();
  for (const node of flattenTree()) {
    for (const fill of node.style?.fills || []) if (fill.type === 'color') colors.set(rgba(fill.hex, fill.alpha), (colors.get(rgba(fill.hex, fill.alpha)) || 0) + 1);
    if (node.text) {
      const key = `${node.text.fontFamily}|${node.text.fontSize}|${node.text.fontWeight}|${node.text.lineHeight}`;
      typography.set(key, (typography.get(key) || 0) + 1);
    }
    const radius = node.style?.cornerRadius?.topLeft;
    if (radius) radii.set(radius, (radii.get(radius) || 0) + 1);
  }
  return { colors, typography, radii };
}

function renderTokens() {
  const host = $('paneTokens');
  host.replaceChildren();
  const tokens = extractTokens();
  const colorGrid = el('div', { class: 'token-grid' });
  for (const [color, count] of tokens.colors) colorGrid.append(el('button', { class: 'token-cell', onclick: () => copy(color) }, [
    swatch(color), el('div', { class: 'meta' }, [el('div', { class: 'hex', text: color }), el('div', { class: 'cnt', text: `使用 ${count} 次` })]),
  ]));
  host.append(section(`颜色 · ${tokens.colors.size}`, colorGrid));

  const typeRows = [];
  for (const [key, count] of tokens.typography) {
    const [family, size, weight, lineHeight] = key.split('|');
    typeRows.push(propRow(`${size}px / ${weight}`, `${family} · 行高 ${lineHeight} · ${count} 处`, `${family}; ${size}px; ${weight}; ${lineHeight}px`));
  }
  host.append(section(`排版 · ${tokens.typography.size}`, typeRows));

  const radiusGrid = el('div', { class: 'token-grid' });
  for (const [radius, count] of tokens.radii) radiusGrid.append(el('button', { class: 'token-cell', onclick: () => copy(`${radius}px`) }, el('div', { class: 'meta' }, [el('div', { class: 'hex', text: `${radius}px` }), el('div', { class: 'cnt', text: `使用 ${count} 次` })])));
  host.append(section(`圆角 · ${tokens.radii.size}`, radiusGrid));
}

function renderComments() {
  const host = $('paneComments');
  host.replaceChildren(el('div', { class: 'section-title', text: '公开体验中的示例批注 · 只读' }));
  for (const [index, comment] of comments.entries()) {
    const node = findNode(comment.layerId);
    host.append(el('div', { class: `asset-item${comment.resolved ? '' : ' selected'}` }, [
      el('div', { class: 'asset-thumb', style: { color: comment.resolved ? 'var(--teal)' : 'var(--accent-text)', fontWeight: '600' }, text: comment.resolved ? '✓' : String(index + 1) }),
      el('div', { class: 'asset-meta' }, [
        el('div', { class: 'asset-name', text: `${comment.author} · ${comment.time}` }),
        el('div', { class: 'asset-sub', text: node?.path || '' }),
        el('div', { style: { marginTop: '6px', color: 'var(--text-dim)' }, text: comment.body }),
        el('div', { class: 'inspect-actions' }, el('button', { class: 'btn sm', text: '定位', onclick: () => { selectNode(comment.layerId); revealNode(comment.layerId); } })),
      ]),
    ]));
  }
}

function renderCommentPins() {
  const host = $('cmtPins');
  host.replaceChildren();
  for (const [index, comment] of comments.entries()) {
    const node = findNode(comment.layerId);
    if (!node) continue;
    const pin = el('button', { text: comment.resolved ? '✓' : String(index + 1), title: comment.body });
    Object.assign(pin.style, {
      position: 'absolute', left: `${(node.abs.x + node.abs.width) * state.zoom - 10}px`, top: `${node.abs.y * state.zoom - 10}px`,
      width: '20px', height: '20px', borderRadius: '50%', background: comment.resolved ? 'var(--teal)' : 'var(--red)',
      color: '#fff', fontSize: '11px', fontWeight: '700', pointerEvents: 'auto', zIndex: '4', boxShadow: '0 2px 8px rgba(0,0,0,.4)',
    });
    pin.addEventListener('click', (event) => { event.stopPropagation(); selectNode(comment.layerId); switchTab('comments'); });
    host.append(pin);
  }
}

function measurementHint(text, result = '') {
  if (result) state.measurement = result;
  $('measureHint').textContent = text;
  $('measureHint').title = text;
  $('copyMeasure').classList.toggle('hidden', !state.measurement);
  $('copyMeasure').textContent = result ? '复制距离' : '复制上次距离';
  $('copyMeasure').title = state.measurement;
}

let measurementObstacles = [];
let measurementLabels = [];

function clearOverlay() {
  const overlay = $('overlay');
  overlay.replaceChildren();
  overlay.setAttribute('width', state.spec.frame.width * state.zoom);
  overlay.setAttribute('height', state.spec.frame.height * state.zoom);
  measurementObstacles = [];
  measurementLabels = [];
}

function screenRect(rect) {
  return Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, rect[key] * state.zoom]));
}

function refreshMeasurements() {
  if (!state.spec) return;
  clearOverlay();
  if (!state.showSpacing && !state.measureMode) { measurementHint('间距标注已关闭，点击「间距」恢复'); return; }
  const anchor = state.measureMode ? state.pin[0] : state.selectedId;
  const target = state.hoverId && state.hoverId !== anchor ? state.hoverId : state.pin[1];
  if (anchor && target) { drawMeasure(anchor, target); return; }
  if (state.measureMode) {
    measurementHint(anchor ? '悬停预览距离，点击另一元素固定结果 · Esc 退出' : '点击第一个元素，再点击第二个元素固定距离 · Esc 退出');
    return;
  }
  if (state.selectedId) {
    drawSpacingFor(state.selectedId);
    measurementHint('已显示相对父容器与最近兄弟间距 · 悬停其他元素可比较');
  } else measurementHint('选中元素，悬停其他元素查看距离 · 数值单位 px');
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function mDimension(overlay, x1, y1, x2, y2, value, description = '') {
  const vertical = x1 === x2;
  const guide = svgEl('g', { class: 'm-guide' });
  guide.append(svgEl('line', { x1, y1, x2, y2 }));
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    guide.append(svgEl('line', vertical
      ? { x1: x - 3, y1: y, x2: x + 3, y2: y }
      : { x1: x, y1: y - 3, x2: x, y2: y + 3 }));
  }
  overlay.prepend(guide);

  const group = svgEl('g', { class: 'm-label-group', 'aria-label': `${description} ${value}px`.trim() });
  const title = svgEl('title');
  title.textContent = `${description} ${value}px`.trim();
  const text = svgEl('text', { class: 'm-label', x: 0, y: 0.5 });
  text.textContent = `${value}px`;
  group.append(title, text);
  overlay.append(group);
  const width = Math.ceil(text.getComputedTextLength()) + 10;
  const height = 18;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const offset = (vertical ? width : height) / 2 + 3;
  const candidates = vertical
    ? [[cx + offset, cy], [cx - offset, cy]]
    : [[cx, cy - offset], [cx, cy + offset]];
  for (const rect of measurementObstacles) {
    candidates.push(...(vertical
      ? [[rect.x + rect.width + width / 2 + 3, cy], [rect.x - width / 2 - 3, cy]]
      : [[cx, rect.y - height / 2 - 3], [cx, rect.y + rect.height + height / 2 + 3]]));
  }
  const canvasWidth = state.spec.frame.width * state.zoom;
  const canvasHeight = state.spec.frame.height * state.zoom;
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const positions = candidates.map(([candidateX, candidateY], index) => {
    const x = Math.max(width / 2 + 2, Math.min(canvasWidth - width / 2 - 2, candidateX));
    const y = Math.max(height / 2 + 2, Math.min(canvasHeight - height / 2 - 2, candidateY));
    const box = { x: x - width / 2, y: y - height / 2, width, height };
    const covered = measurementObstacles.reduce((sum, rect) => sum + overlap(box, rect), 0);
    const collision = measurementLabels.reduce((sum, rect) => sum + overlap(box, rect), 0);
    return { x, y, box, score: covered * 10 + collision * 20 + Math.hypot(x - cx, y - cy) + index * .01 };
  });
  const best = positions.sort((a, b) => a.score - b.score)[0];
  group.setAttribute('transform', `translate(${best.x},${best.y})`);
  group.insertBefore(svgEl('rect', { class: 'm-label-bg', x: -width / 2, y: -height / 2, width, height, rx: height / 2 }), text);
  measurementLabels.push(best.box);
}

function findParentRelation(id) {
  let relation = null;
  const walk = (node) => {
    for (const child of node.children || []) {
      if (child.id === id) { relation = { parent: node, siblings: node.children || [] }; return; }
      walk(child);
      if (relation) return;
    }
  };
  walk(state.spec.tree);
  return relation;
}

function spacingFor(nodeId) {
  const node = findNode(nodeId);
  if (!node) return null;
  const relation = findParentRelation(nodeId);
  const parent = relation?.parent || state.spec.tree;
  const p = parent.abs || { x: 0, y: 0, width: state.spec.frame.width, height: state.spec.frame.height };
  const n = node.abs;
  const padding = {
    top: round(n.y - p.y), right: round(p.x + p.width - n.x - n.width),
    bottom: round(p.y + p.height - n.y - n.height), left: round(n.x - p.x),
  };
  const nearest = {};
  for (const sibling of relation?.siblings || []) {
    if (sibling.id === node.id || sibling.visible === false) continue;
    const s = sibling.abs;
    const overlapX = Math.min(n.x + n.width, s.x + s.width) - Math.max(n.x, s.x);
    const overlapY = Math.min(n.y + n.height, s.y + s.height) - Math.max(n.y, s.y);
    const candidates = [];
    if (overlapX > .01 && s.y >= n.y + n.height - .01) candidates.push(['bottom', round(s.y - n.y - n.height), sibling]);
    if (overlapX > .01 && s.y + s.height <= n.y + .01) candidates.push(['top', round(n.y - s.y - s.height), sibling]);
    if (overlapY > .01 && s.x >= n.x + n.width - .01) candidates.push(['right', round(s.x - n.x - n.width), sibling]);
    if (overlapY > .01 && s.x + s.width <= n.x + .01) candidates.push(['left', round(n.x - s.x - s.width), sibling]);
    for (const [direction, distance, target] of candidates) {
      if (!nearest[direction] || distance < nearest[direction].distance) nearest[direction] = { direction, distance, target };
    }
  }
  return { node, parent, padding, gaps: Object.values(nearest) };
}

function drawSpacingFor(nodeId) {
  if (!state.showSpacing) return;
  const measurement = spacingFor(nodeId);
  if (!measurement || measurement.node.id === state.spec.tree.id) return;
  const overlay = $('overlay');
  const z = state.zoom;
  const n = measurement.node.abs;
  const p = measurement.parent.abs;
  const nx = n.x * z; const ny = n.y * z; const nw = n.width * z; const nh = n.height * z;
  const px = p.x * z; const py = p.y * z; const pw = p.width * z; const ph = p.height * z;
  const pad = measurement.padding;
  measurementObstacles = [screenRect(n), ...measurement.gaps.map((gap) => gap.target?.abs).filter(Boolean).map(screenRect)];
  if (pad.top > .5) mDimension(overlay, nx + nw / 2, py, nx + nw / 2, ny, pad.top, '上');
  if (pad.bottom > .5) mDimension(overlay, nx + nw / 2, ny + nh, nx + nw / 2, py + ph, pad.bottom, '下');
  if (pad.left > .5) mDimension(overlay, px, ny + nh / 2, nx, ny + nh / 2, pad.left, '左');
  if (pad.right > .5) mDimension(overlay, nx + nw, ny + nh / 2, px + pw, ny + nh / 2, pad.right, '右');
  for (const gap of measurement.gaps) {
    if (gap.distance <= .5) continue;
    const target = gap.target.abs;
    if (gap.direction === 'top' || gap.direction === 'bottom') {
      const x = nx + nw / 2;
      const y1 = (gap.direction === 'top' ? target.y + target.height : n.y + n.height) * z;
      const y2 = (gap.direction === 'top' ? n.y : target.y) * z;
      mDimension(overlay, x, y1, x, y2, gap.distance, gap.direction === 'top' ? '上方' : '下方');
    } else {
      const y = ny + nh / 2;
      const x1 = (gap.direction === 'left' ? target.x + target.width : n.x + n.width) * z;
      const x2 = (gap.direction === 'left' ? n.x : target.x) * z;
      mDimension(overlay, x1, y, x2, y, gap.distance, gap.direction === 'left' ? '左侧' : '右侧');
    }
  }
}

function distanceGuides(a, b) {
  const edges = (rect) => ({ ...rect, right: rect.x + rect.width, bottom: rect.y + rect.height });
  const A = edges(a); const B = edges(b);
  const contains = (outer, inner) => outer.x <= inner.x && outer.y <= inner.y && outer.right >= inner.right && outer.bottom >= inner.bottom;
  const guides = [];
  const add = (label, x1, y1, x2, y2) => guides.push({ label, from: [x1, y1], to: [x2, y2], distance: round(Math.abs(x2 - x1) + Math.abs(y2 - y1)) });
  if (contains(A, B) || contains(B, A)) {
    const outer = contains(A, B) ? A : B;
    const inner = outer === A ? B : A;
    const cx = inner.x + inner.width / 2; const cy = inner.y + inner.height / 2;
    add('上', cx, outer.y, cx, inner.y); add('右', inner.right, cy, outer.right, cy);
    add('下', cx, inner.bottom, cx, outer.bottom); add('左', outer.x, cy, inner.x, cy);
    return { kind: '包含边距', guides };
  }
  const overlapX = Math.min(A.right, B.right) - Math.max(A.x, B.x);
  const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.y, B.y);
  const x1 = B.x >= A.right ? A.right : B.right; const x2 = B.x >= A.right ? B.x : A.x;
  const y1 = B.y >= A.bottom ? A.bottom : B.bottom; const y2 = B.y >= A.bottom ? B.y : A.y;
  if (overlapX <= 0) add('水平', x1, overlapY > 0 ? (Math.max(A.y, B.y) + Math.min(A.bottom, B.bottom)) / 2 : y1, x2, overlapY > 0 ? (Math.max(A.y, B.y) + Math.min(A.bottom, B.bottom)) / 2 : y1);
  if (overlapY <= 0) add('垂直', overlapX > 0 ? (Math.max(A.x, B.x) + Math.min(A.right, B.right)) / 2 : x2, y1, overlapX > 0 ? (Math.max(A.x, B.x) + Math.min(A.right, B.right)) / 2 : x2, y2);
  if (guides.length) return { kind: '边缘间距', guides };
  const cy = (Math.max(A.y, B.y) + Math.min(A.bottom, B.bottom)) / 2;
  const cx = (Math.max(A.x, B.x) + Math.min(A.right, B.right)) / 2;
  add('左边', A.x, cy, B.x, cy); add('右边', A.right, cy + 18, B.right, cy + 18);
  add('上边', cx, A.y, cx, B.y); add('下边', cx + 18, A.bottom, cx + 18, B.bottom);
  return { kind: '重叠 · 边缘偏移', guides };
}

function drawMeasure(idA, idB) {
  const a = findNode(idA); const b = findNode(idB);
  if (!a || !b) return;
  clearOverlay();
  const measurement = distanceGuides(a.abs, b.abs);
  const contains = (outer, inner) => outer.x <= inner.x && outer.y <= inner.y
    && outer.x + outer.width >= inner.x + inner.width && outer.y + outer.height >= inner.y + inner.height;
  measurementObstacles = (contains(a.abs, b.abs) ? [b.abs] : contains(b.abs, a.abs) ? [a.abs] : [a.abs, b.abs]).map(screenRect);
  for (const guide of measurement.guides) {
    const [x1, y1] = guide.from.map((value) => value * state.zoom);
    const [x2, y2] = guide.to.map((value) => value * state.zoom);
    mDimension($('overlay'), x1, y1, x2, y2, guide.distance, guide.label);
  }
  const result = `${a.name} → ${b.name} · ${measurement.kind} · ${measurement.guides.map((guide) => `${guide.label} ${guide.distance} px`).join(' · ')}`;
  measurementHint(result, result);
}

function revealNode(id) {
  const node = findNode(id);
  const wrap = $('canvasWrap');
  const frame = $('frame');
  if (!node) return;
  wrap.scrollTo({
    left: Math.max(0, frame.offsetLeft + (node.abs.x + node.abs.width / 2) * state.zoom - wrap.clientWidth / 2),
    top: Math.max(0, frame.offsetTop + (node.abs.y + node.abs.height / 2) * state.zoom - wrap.clientHeight / 2),
    behavior: 'smooth',
  });
}

function switchTab(id) {
  state.activeTab = id;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
  document.querySelectorAll('.tabpane').forEach((pane) => pane.classList.toggle('active', pane.dataset.pane === id));
}

function bindUI() {
  $('tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (tab) switchTab(tab.dataset.tab);
  });
  $('zoomOut').addEventListener('click', () => { state.zoom = Math.max(.25, round(state.zoom - .1)); state.autoFit = false; renderCanvas(); });
  $('zoomIn').addEventListener('click', () => { state.zoom = Math.min(2, round(state.zoom + .1)); state.autoFit = false; renderCanvas(); });
  $('zoomFit').addEventListener('click', () => renderCanvas(true));
  $('zoomLabel').addEventListener('click', () => { state.zoom = 1; state.autoFit = false; renderCanvas(); });
  $('toggleSpacing').addEventListener('click', (event) => {
    state.showSpacing = !state.showSpacing;
    event.currentTarget.classList.toggle('active', state.showSpacing);
    event.currentTarget.setAttribute('aria-pressed', state.showSpacing);
    refreshMeasurements();
  });
  $('toggleHots').addEventListener('click', (event) => {
    state.showHots = !state.showHots;
    event.currentTarget.classList.toggle('active', state.showHots);
    event.currentTarget.setAttribute('aria-pressed', state.showHots);
    $('hots').classList.toggle('quiet', !state.showHots);
  });
  $('measureMode').addEventListener('click', (event) => {
    state.measureMode = !state.measureMode;
    state.pin = state.measureMode && state.selectedId ? [state.selectedId] : [];
    event.currentTarget.classList.toggle('active', state.measureMode);
    event.currentTarget.setAttribute('aria-pressed', state.measureMode);
    renderHots();
    refreshMeasurements();
  });
  $('commentMode').addEventListener('click', () => { switchTab('comments'); showNotice('公开体验为只读，批注写入功能仅在正式 DesignHub 中开放'); });
  $('commentCount').addEventListener('click', () => switchTab('comments'));
  $('copyMeasure').addEventListener('click', () => copy(state.measurement, '距离已复制'));
  $('copyLinkBtn').addEventListener('click', () => copy(location.href, '公开体验链接已复制'));
  $('expandAllBtn').addEventListener('click', () => {
    state.allExpanded = !state.allExpanded;
    state.expanded = state.allExpanded ? new Set(flattenTree().map((node) => node.id)) : new Set([state.spec.tree.id]);
    $('expandAllBtn').textContent = state.allExpanded ? '收起' : '展开';
    renderTree($('layerSearch').value);
  });
  $('layerSearch').addEventListener('input', (event) => renderTree(event.target.value));
  $('stage').addEventListener('click', () => selectNode(state.spec.tree.id));
  window.addEventListener('resize', () => { if (state.autoFit) renderCanvas(true); });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    if (event.key === 'Escape' && state.measureMode) $('measureMode').click();
    else if (event.key === '+') $('zoomIn').click();
    else if (event.key === '-') $('zoomOut').click();
    else if (event.key === '0') $('zoomFit').click();
    else if (event.key === '/') { event.preventDefault(); $('layerSearch').focus(); }
  });
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || 'layer';
}

init();
