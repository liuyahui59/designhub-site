const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

function mountProductView(host, className, title, interactive = false) {
  if (!host) return;
  const frame = document.createElement('iframe');
  frame.className = className;
  frame.src = './demo.html?v=inspect-4&layer=EA07F084-1F14-4BF7-A8B9-4F747C51DF5E';
  frame.title = title;
  frame.loading = className === 'product-live-frame' ? 'eager' : 'lazy';
  if (!interactive) frame.tabIndex = -1;
  host.setAttribute('aria-label', title);
  host.replaceChildren(frame);
}

mountProductView(qs('.demo-shell'), 'demo-live-frame', 'DesignHub 完整交互演示', true);

const designFacts = {
  structure: {
    number: '01',
    html: '<small>结构</small><h3>图层树成为语义图</h3><p>页面、区块和组件拥有稳定角色，位置变化不会改变它们的业务身份。</p><div class="fact-values"><span>页面</span><span>区块</span><span>组件</span><span>数值</span></div>'
  },
  layout: {
    number: '02',
    html: '<small>布局</small><h3>间距来自同一套坐标</h3><p>Stack、父边距、兄弟间距和任意两层距离共享测量逻辑，不受画布缩放影响。</p><div class="fact-values"><span>堆叠</span><span>间距</span><span>内边距</span><span>距离</span></div>'
  },
  tokens: {
    number: '03',
    html: '<small>设计变量</small><h3>变量保留引用关系</h3><p>颜色、排版、圆角与阴影不仅有数值，也保留变量名称与来源。</p><div class="fact-values fact-colors"><span><i style="background:#0f62fe"></i>颜色</span><span><i style="background:#161616"></i>排版</span><span><i style="background:#da1e28"></i>圆角</span><span>阴影</span></div>'
  },
  product: {
    number: '04',
    html: '<small>产品上下文</small><h3>文档补足设计没表达的部分</h3><p>业务范围、页面状态、权限和验收标准来自产品文档，不让实现者自行猜测。</p><div class="fact-values"><span>范围</span><span>状态</span><span>权限</span><span>验收</span></div>'
  },
  agent: {
    number: '05',
    html: '<small>AGENT 读取</small><h3>按需读取，不吞整棵树</h3><p>Agent 先读结构大纲定位目标，再取图层、间距、变量和切图资源。</p><div class="fact-values"><span>大纲</span><span>图层</span><span>间距</span><span>代码</span></div>'
  }
};

const anatomy = qs('[data-fact-anatomy]');
const factContent = qs('[data-fact-content]', anatomy);
const factNumber = qs('[data-fact-number]', anatomy);
const factMap = qs('[data-fact-map]', anatomy);
function showDesignFact(name) {
  const fact = designFacts[name];
  if (!fact || !factContent || !factNumber || !factMap) return;
  factMap.dataset.mode = name;
  factNumber.textContent = fact.number;
  factContent.innerHTML = fact.html;
  qsa('[data-fact]', anatomy).forEach((control) => {
    const active = control.dataset.fact === name;
    control.classList.toggle('active', active);
    if (control.getAttribute('role') === 'tab') control.setAttribute('aria-selected', String(active));
  });
}
qsa('[data-fact]', anatomy).forEach((control) => control.addEventListener('click', () => showDesignFact(control.dataset.fact)));
showDesignFact('structure');

const menu = qs('[data-menu]');
const nav = qs('[data-nav]');
menu?.addEventListener('click', () => nav.classList.toggle('open'));
qsa('.nav-links a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

const inspector = {
  layout: '<div class="inspector-title"><b>↕</b><span><strong>价格与操作</strong><small>Stack / Horizontal</small></span></div><dl><dt>方向</dt><dd>横向</dd><dt>间距</dt><dd class="blue-text">8 px</dd><dt>内边距</dt><dd>16 / 16 / 16 / 16</dd><dt>主轴对齐</dt><dd>space-between</dd><dt>尺寸策略</dt><dd>填充父容器</dd></dl><hr><code><em>display</em>: flex;<br><em>gap</em>: 8px;<br><em>padding</em>: 16px;</code>',
  style: '<div class="inspector-title"><b style="color:#f2b64e;background:#d99a2b1f">◈</b><span><strong>视觉样式</strong><small>Fill / Border / Radius</small></span></div><dl><dt>填充</dt><dd>#FFFFFF</dd><dt>描边</dt><dd>1 px · #E4E7EB</dd><dt>圆角</dt><dd>8 px</dd><dt>阴影</dt><dd>0 4 16 / 8%</dd></dl><hr><code><em>border-radius</em>: 8px;<br><em>border</em>: 1px solid #E4E7EB;</code>',
  code: '<div class="inspector-title"><b style="color:#8cb9ff;background:#1477ff21">&lt;/&gt;</b><span><strong>代码参考</strong><small>CSS / React Native</small></span></div><code style="display:block;margin-top:20px;line-height:2.1"><em>.price-actions</em> {<br>　<em>display</em>: flex;<br>　<em>gap</em>: 8px;<br>　<em>padding</em>: 16px;<br>}</code>'
};
qsa('[data-inspector]').forEach((button) => button.addEventListener('click', () => {
  qsa('[data-inspector]').forEach((b) => b.classList.toggle('active', b === button));
  qs('[data-inspector-content]').innerHTML = inspector[button.dataset.inspector];
}));

qsa('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  const name = button.dataset.tab;
  qsa('[data-tab]').forEach((b) => b.classList.toggle('active', b === button));
  qsa('[data-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== name));
}));

qs('[data-copy]')?.addEventListener('click', async (event) => {
  try { await navigator.clipboard.writeText('.product-card { display: flex; align-items: center; gap: 12px; padding: 12px; }'); } catch { /* clipboard is optional */ }
  const button = event.currentTarget;
  const old = button.innerHTML;
  button.innerHTML = '已复制 <span>✓</span>';
  setTimeout(() => { button.innerHTML = old; }, 1400);
});
