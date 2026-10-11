const scenarios = {
  trend: { name: '趋势', types: [
    { name: '折线图', art: 'line', shape: '分类 + 系列 + 数值', variants: ['基础单系列', '多系列对比'] },
    { name: '面积图', art: 'area', shape: '分类 + 系列 + 数值', variants: ['基础单系列', '多系列对比', '堆叠面积', '百分比堆叠'] },
    { name: '迷你图', art: 'spark', shape: '连续数值', variants: ['标准迷你图'] }
  ]},
  compare: { name: '对比', types: [
    { name: '柱状图', art: 'bars', shape: '分类 + 多系列数值', variants: ['基础单柱', '分组并列', '堆叠', '百分比堆叠'] },
    { name: '条形图', art: 'horizontalBars', shape: '分类 + 多系列数值', variants: ['基础单条', '分组并列', '堆叠', '百分比堆叠'] },
    { name: '散点图', art: 'scatter', shape: 'X 值 + Y 值 + 系列', variants: ['二维散点'] },
    { name: '气泡图', art: 'bubble', shape: 'X 值 + Y 值 + 权重', variants: ['权重气泡'] }
  ]},
  ratio: { name: '占比', types: [
    { name: '饼图', art: 'pie', shape: '分类 + 单一数值', variants: ['全圆占比', '半圆占比'] },
    { name: '环形图', art: 'ring', shape: '分类 + 单一数值', variants: ['全圆占比', '半圆占比'] },
    { name: '矩形树图', art: 'treemap', shape: '层级 + 数值', variants: ['平铺树图'] }
  ]},
  progress: { name: '进程', types: [
    { name: '仪表盘', art: 'gauge', shape: '当前值 + 目标值', variants: ['连续刻度', '半环仪表'] },
    { name: '进度条 / 环', art: 'progress', shape: '当前值 + 目标值', variants: ['连续单指标', '环形进度'] }
  ]},
  multi: { name: '多维', types: [
    { name: '雷达图', art: 'radar', shape: '维度 + 系列 + 数值', variants: ['单指标画像', '多主体对比'] },
    { name: '漏斗图', art: 'funnel', shape: '阶段 + 数值', variants: ['梯形平铺', '分段对称'] },
    { name: '组合图', art: 'combo', shape: '分类 + 多度量值', variants: ['柱线混合', '双轴柱状', '双轴折线柱'] }
  ]},
  more: { name: '其他', types: [
    { name: '流图', art: 'stream', shape: '分类 + 系列 + 数值', variants: ['标准流图'] },
    { name: '直方图', art: 'histogram', shape: '原始数值', variants: ['基础直方图', '堆叠直方图'] },
    { name: '热力图', art: 'heatmap', shape: 'X 分类 + Y 分类 + 数值', variants: ['矩阵热力'] },
    { name: 'K 线图', art: 'candlestick', shape: '日期 + 开高低收', variants: ['OHLC 蜡烛'] }
  ]}
};

const art = {
  line: '<path class="chart-line" d="M56 252C117 239 132 112 203 118S271 236 348 181 426 67 492 102 548 221 640 84"/>',
  area: '<path class="chart-area" d="M56 252C117 239 132 112 203 118S271 236 348 181 426 67 492 102 548 221 640 84V290H56Z"/><path class="chart-line" d="M56 252C117 239 132 112 203 118S271 236 348 181 426 67 492 102 548 221 640 84"/>',
  spark: '<path class="chart-line" d="M122 218C172 214 186 130 239 145S297 224 349 177 410 96 460 129 522 206 577 103"/><circle class="chart-dot" cx="577" cy="103" r="7"/>',
  bars: '<rect class="chart-bar" x="84" y="184" width="42" height="106"/><rect class="chart-bar secondary" x="132" y="132" width="42" height="158"/><rect class="chart-bar" x="230" y="88" width="42" height="202"/><rect class="chart-bar secondary" x="278" y="151" width="42" height="139"/><rect class="chart-bar" x="376" y="126" width="42" height="164"/><rect class="chart-bar secondary" x="424" y="63" width="42" height="227"/><rect class="chart-bar" x="522" y="157" width="42" height="133"/><rect class="chart-bar secondary" x="570" y="102" width="42" height="188"/>',
  horizontalBars: '<rect class="chart-bar" x="76" y="70" width="390" height="34"/><rect class="chart-bar secondary" x="76" y="112" width="510" height="34"/><rect class="chart-bar" x="76" y="154" width="278" height="34"/><rect class="chart-bar secondary" x="76" y="196" width="438" height="34"/><rect class="chart-bar" x="76" y="238" width="330" height="34"/>',
  scatter: '<circle class="chart-dot" cx="122" cy="232" r="9"/><circle cx="198" cy="160" r="9" fill="#1192e8"/><circle class="chart-dot" cx="287" cy="202" r="9"/><circle cx="382" cy="104" r="9" fill="#78a9ff"/><circle class="chart-dot" cx="478" cy="148" r="9"/><circle cx="578" cy="82" r="9" fill="#1192e8"/>',
  bubble: '<circle class="chart-dot" cx="122" cy="232" r="15"/><circle cx="198" cy="160" r="26" fill="#1192e8"/><circle class="chart-dot" cx="287" cy="202" r="11"/><circle cx="382" cy="104" r="34" fill="#78a9ff"/><circle class="chart-dot" cx="478" cy="148" r="20"/><circle cx="578" cy="82" r="13" fill="#1192e8"/>',
  pie: '<path d="M348 168V66A102 102 0 1 1 258 218Z" fill="#0f62fe"/><path d="M348 168L258 218A102 102 0 0 1 348 66Z" fill="#78a9ff"/>',
  ring: '<circle class="chart-ring-bg" cx="348" cy="168" r="96"/><circle class="chart-ring" cx="348" cy="168" r="96" transform="rotate(-90 348 168)"/><text x="348" y="176" text-anchor="middle" fill="#161616" font-size="30" font-family="Arial">72%</text>',
  treemap: '<rect x="74" y="54" width="296" height="236" fill="#0f62fe"/><rect x="378" y="54" width="224" height="138" fill="#1192e8"/><rect x="378" y="200" width="134" height="90" fill="#78a9ff"/><rect x="520" y="200" width="82" height="90" fill="#a6c8ff"/>',
  progress: '<rect x="88" y="126" width="504" height="64" rx="32" fill="#e0e0e0"/><rect x="88" y="126" width="356" height="64" rx="32" fill="#0f62fe"/><circle cx="444" cy="158" r="10" fill="#fff"/><text x="88" y="225" fill="#525252" font-size="16" font-family="Arial">当前进度 71 / 100</text>',
  gauge: '<path d="M190 225A164 164 0 0 1 518 225" fill="none" stroke="#e0e0e0" stroke-width="42"/><path d="M190 225A164 164 0 0 1 451 93" fill="none" stroke="#0f62fe" stroke-width="42"/><text x="354" y="236" text-anchor="middle" fill="#161616" font-size="34" font-family="Arial">71%</text>',
  radar: '<path d="M348 50L536 119 493 270 203 270 160 119Z" fill="none" stroke="#c6c6c6"/><path d="M348 88L476 135 447 238 250 238 220 135Z" fill="#d0e2ff" stroke="#0f62fe" stroke-width="4"/><circle class="chart-dot" cx="348" cy="88" r="6"/><circle class="chart-dot" cx="476" cy="135" r="6"/><circle class="chart-dot" cx="447" cy="238" r="6"/><circle class="chart-dot" cx="250" cy="238" r="6"/><circle class="chart-dot" cx="220" cy="135" r="6"/>',
  funnel: '<path d="M102 62H578L514 116H166Z" fill="#0f62fe"/><path d="M166 126H514L460 180H220Z" fill="#1192e8"/><path d="M220 190H460L408 244H272Z" fill="#78a9ff"/><path d="M272 254H408L382 290H298Z" fill="#a6c8ff"/>',
  combo: '<rect class="chart-bar secondary" x="105" y="170" width="52" height="120"/><rect class="chart-bar secondary" x="228" y="112" width="52" height="178"/><rect class="chart-bar secondary" x="351" y="146" width="52" height="144"/><rect class="chart-bar secondary" x="474" y="82" width="52" height="208"/><path class="chart-line" d="M131 122L254 164 377 91 500 126 604 63"/>',
  stream: '<path d="M56 170C133 90 200 118 278 151S427 235 640 104V219C470 282 367 205 278 185S119 223 56 260Z" fill="#78a9ff"/><path d="M56 146C143 57 226 99 303 131S468 176 640 75V120C472 220 383 169 292 145S124 175 56 216Z" fill="#0f62fe"/>',
  histogram: '<rect class="chart-bar" x="112" y="236" width="58" height="54"/><rect class="chart-bar" x="170" y="192" width="58" height="98"/><rect class="chart-bar" x="228" y="118" width="58" height="172"/><rect class="chart-bar" x="286" y="70" width="58" height="220"/><rect class="chart-bar" x="344" y="93" width="58" height="197"/><rect class="chart-bar" x="402" y="154" width="58" height="136"/><rect class="chart-bar" x="460" y="220" width="58" height="70"/>',
  heatmap: '<g fill="#d0e2ff"><rect x="118" y="54" width="82" height="62"/><rect x="202" y="54" width="82" height="62" fill="#78a9ff"/><rect x="286" y="54" width="82" height="62" fill="#0f62fe"/><rect x="370" y="54" width="82" height="62"/><rect x="454" y="54" width="82" height="62" fill="#1192e8"/><rect x="118" y="118" width="82" height="62" fill="#1192e8"/><rect x="202" y="118" width="82" height="62"/><rect x="286" y="118" width="82" height="62" fill="#78a9ff"/><rect x="370" y="118" width="82" height="62" fill="#0f62fe"/><rect x="454" y="118" width="82" height="62"/><rect x="118" y="182" width="82" height="62"/><rect x="202" y="182" width="82" height="62" fill="#0f62fe"/><rect x="286" y="182" width="82" height="62" fill="#1192e8"/><rect x="370" y="182" width="82" height="62"/><rect x="454" y="182" width="82" height="62" fill="#78a9ff"/></g>',
  candlestick: '<g stroke="#0f62fe" stroke-width="3"><path d="M135 72V248"/><rect x="116" y="112" width="38" height="82" fill="#d0e2ff"/><path d="M240 54V220"/><rect x="221" y="88" width="38" height="76" fill="#0f62fe"/><path d="M345 98V272"/><rect x="326" y="132" width="38" height="84" fill="#d0e2ff"/><path d="M450 44V203"/><rect x="431" y="76" width="38" height="92" fill="#0f62fe"/><path d="M555 88V258"/><rect x="536" y="128" width="38" height="72" fill="#d0e2ff"/></g>'
};

function variantOverlay(type, variant) {
  const comparison = /多系列|对比/.test(variant);
  const stacked = /堆叠/.test(variant);
  if (type.art === 'line' && comparison) {
    return '<path class="chart-line secondary" d="M56 212C124 178 151 205 207 166S297 91 354 132 444 231 505 184 571 112 640 136"/>';
  }
  if (type.art === 'area' && comparison) {
    return '<path class="chart-area secondary" d="M56 238C118 197 149 208 204 169S299 89 354 132 441 222 503 182 572 113 640 137V290H56Z"/><path class="chart-line secondary" d="M56 238C118 197 149 208 204 169S299 89 354 132 441 222 503 182 572 113 640 137"/>';
  }
  if (type.art === 'area' && stacked) {
    return '<path class="chart-area secondary" d="M56 219C121 194 161 151 213 169S303 232 365 191 458 101 520 126 587 171 640 145V290H56Z"/><path class="chart-line secondary" d="M56 219C121 194 161 151 213 169S303 232 365 191 458 101 520 126 587 171 640 145"/>';
  }
  return '';
}

const tabs = [...document.querySelectorAll('[data-scenario]')];
const typeHost = document.querySelector('[data-chart-types]');
const variantHost = document.querySelector('[data-variants]');
const artHost = document.querySelector('[data-chart-art]');
const sceneLabel = document.querySelector('[data-scene-label]');
const dataShape = document.querySelector('[data-data-shape]');
const variantTitle = document.querySelector('[data-variant-title]');
const preview = document.querySelector('.chart-preview');
const compositionSummary = document.querySelector('[data-composition-summary]');

function renderButtons(host, items, onSelect) {
  host.replaceChildren(...items.map((item, index) => {
    const label = typeof item === 'string' ? item : item.name;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.classList.toggle('active', index === 0);
    button.addEventListener('click', () => {
      [...host.children].forEach((node) => node.classList.toggle('active', node === button));
      onSelect?.(item);
    });
    return button;
  }));
}

function renderSelection(scenario, type, variant) {
  sceneLabel.textContent = `${scenario.name} / ${type.name} / ${variant}`;
  dataShape.textContent = type.shape;
  artHost.innerHTML = art[type.art] + variantOverlay(type, variant);
  preview.dataset.art = type.art;
  compositionSummary.textContent = `${scenario.name} / ${type.name} / ${variant}`;
}

function selectType(scenario, type) {
  renderSelection(scenario, type, type.variants[0]);
  variantTitle.innerHTML = `<b>02</b> ${type.name}的图表变体`;
  renderButtons(variantHost, type.variants, (variant) => {
    renderSelection(scenario, type, variant);
  });
}

function showScenario(id) {
  const scenario = scenarios[id];
  if (!scenario) return;
  tabs.forEach((tab) => {
    const active = tab.dataset.scenario === id;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  renderButtons(typeHost, scenario.types, (type) => selectType(scenario, type));
  selectType(scenario, scenario.types[0]);
}

tabs.forEach((tab) => tab.addEventListener('click', () => showScenario(tab.dataset.scenario)));
document.querySelectorAll('.custom-options button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.custom-options button').forEach((item) => item.classList.toggle('active', item === button));
  });
});
showScenario('trend');
