import { renderMarkdown } from './markdown.js';

const article = document.getElementById('documentArticle');
const preview = document.getElementById('documentPreview');
const toc = document.getElementById('documentToc');
const copyButton = document.getElementById('copyContextBtn');
const count = document.getElementById('documentCount');
const updatedAt = document.getElementById('updatedAt');

let headings = [];
let markdown = '';

function setActive(id) {
  document.querySelectorAll('.document-toc-link').forEach((link) => link.classList.toggle('active', link.dataset.heading === id));
}

function renderToc() {
  toc.replaceChildren();
  const lowestLevel = headings.length ? Math.min(...headings.map((heading) => heading.level)) : 1;
  for (const heading of headings) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'document-toc-link';
    button.dataset.heading = heading.id;
    button.style.setProperty('--toc-depth', Math.min(3, Math.max(0, heading.level - lowestLevel)));
    button.textContent = heading.text;
    button.title = heading.text;
    button.addEventListener('click', () => {
      setActive(heading.id);
      heading.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    toc.append(button);
  }
  setActive(headings[0]?.id);
}

async function init() {
  try {
    const response = await fetch('./assets/demo-workorder/workspace.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const workspace = await response.json();
    markdown = workspace.document?.markdown || '';
    headings = renderMarkdown(markdown, article);
    renderToc();
    count.textContent = `${markdown.length.toLocaleString('zh-CN')} 字符`;
    if (workspace.updatedAt) {
      const date = new Date(workspace.updatedAt);
      updatedAt.textContent = `公开快照 · ${date.toLocaleDateString('zh-CN')}`;
    }
  } catch (error) {
    article.replaceChildren();
    const message = document.createElement('p');
    message.className = 'markdown-render-error';
    message.textContent = `无法读取项目文档：${error.message}`;
    article.append(message);
    count.textContent = '读取失败';
  }
}

let scrolling;
preview.addEventListener('scroll', () => {
  clearTimeout(scrolling);
  scrolling = setTimeout(() => {
    const top = preview.getBoundingClientRect().top + 54;
    const active = [...headings].reverse().find((heading) => heading.element.getBoundingClientRect().top <= top) || headings[0];
    if (active) setActive(active.id);
  }, 60);
});

copyButton.addEventListener('click', async () => {
  const original = copyButton.textContent;
  try {
    await navigator.clipboard.writeText(markdown);
    copyButton.textContent = '已复制';
  } catch {
    copyButton.textContent = '复制失败';
  }
  setTimeout(() => { copyButton.textContent = original; }, 1500);
});

init();
