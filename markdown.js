import { lexer } from './vendor/marked.esm.js';

const blockTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'DIV', 'FOOTER', 'HEADER', 'MAIN', 'NAV', 'P', 'SECTION']);
const skippedTags = new Set(['HEAD', 'IFRAME', 'LINK', 'META', 'NOSCRIPT', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG']);

function node(tag, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

function decodeEntities(value = '') {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = String(value).replaceAll('<', '&lt;');
  return textarea.value;
}

function safeUrl(value, image = false) {
  try {
    const url = new URL(decodeEntities(value), location.href);
    if (image && !['http:', 'https:'].includes(url.protocol)) return '';
    if (!image && !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function appendInline(host, tokens = []) {
  for (const token of tokens || []) {
    let element;
    switch (token.type) {
      case 'text':
      case 'escape':
        if (token.tokens?.length) appendInline(host, token.tokens);
        else host.append(document.createTextNode(decodeEntities(token.text ?? token.raw ?? '')));
        break;
      case 'strong':
      case 'em':
      case 'del':
        element = node(token.type);
        appendInline(element, token.tokens);
        host.append(element);
        break;
      case 'codespan':
        element = node('code');
        element.textContent = decodeEntities(token.text || '');
        host.append(element);
        break;
      case 'br':
        host.append(node('br'));
        break;
      case 'link': {
        const href = safeUrl(token.href);
        if (!href) {
          appendInline(host, token.tokens);
          break;
        }
        element = node('a');
        element.href = href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        if (token.title) element.title = decodeEntities(token.title);
        appendInline(element, token.tokens);
        host.append(element);
        break;
      }
      case 'image': {
        const src = safeUrl(token.href, true);
        if (!src) {
          host.append(document.createTextNode(decodeEntities(token.text || token.href || '')));
          break;
        }
        element = node('img');
        element.src = src;
        element.alt = decodeEntities(token.text || '');
        element.loading = 'lazy';
        if (token.title) element.title = decodeEntities(token.title);
        host.append(element);
        break;
      }
      case 'html':
        host.append(document.createTextNode(token.raw || token.text || ''));
        break;
      default:
        if (token.tokens?.length) appendInline(host, token.tokens);
        else if (token.text || token.raw) host.append(document.createTextNode(decodeEntities(token.text || token.raw)));
    }
  }
}

function appendBlocks(host, tokens, context) {
  for (const token of tokens || []) {
    let element;
    switch (token.type) {
      case 'space':
      case 'def':
        break;
      case 'heading': {
        element = node(`h${Math.min(6, Math.max(1, token.depth || 1))}`);
        appendInline(element, token.tokens || [{ type: 'text', text: token.text }]);
        const heading = {
          id: `doc-heading-${context.headingIndex++}`,
          level: token.depth || 1,
          text: element.textContent.trim() || '未命名标题',
          offset: context.offset,
          element,
        };
        element.id = heading.id;
        context.headings.push(heading);
        host.append(element);
        break;
      }
      case 'paragraph':
        element = node('p');
        appendInline(element, token.tokens || [{ type: 'text', text: token.text }]);
        host.append(element);
        break;
      case 'text':
        if (token.tokens?.some((child) => ['list', 'paragraph', 'blockquote'].includes(child.type))) appendBlocks(host, token.tokens, context);
        else appendInline(host, token.tokens || [token]);
        break;
      case 'code': {
        const pre = node('pre');
        element = node('code');
        if (token.lang) element.dataset.language = token.lang.split(/\s+/)[0];
        element.textContent = token.text || '';
        pre.append(element);
        host.append(pre);
        break;
      }
      case 'hr':
        host.append(node('hr'));
        break;
      case 'blockquote':
        element = node('blockquote');
        appendBlocks(element, token.tokens, context);
        host.append(element);
        break;
      case 'list': {
        element = node(token.ordered ? 'ol' : 'ul');
        if (token.ordered && Number(token.start) > 1) element.start = Number(token.start);
        for (const item of token.items || []) {
          const li = node('li');
          if (item.task) {
            const checkbox = node('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!item.checked;
            checkbox.disabled = true;
            checkbox.setAttribute('aria-label', item.checked ? '已完成' : '未完成');
            li.classList.add('task-list-item');
            li.append(checkbox);
          }
          appendBlocks(li, (item.tokens || []).filter((child) => child.type !== 'checkbox'), context);
          element.append(li);
        }
        host.append(element);
        break;
      }
      case 'table': {
        const wrap = node('div', 'markdown-table-wrap');
        element = node('table');
        const head = node('thead');
        const headerRow = node('tr');
        for (const cell of token.header || []) {
          const th = node('th');
          if (cell.align) th.style.textAlign = cell.align;
          appendInline(th, cell.tokens || [{ type: 'text', text: cell.text }]);
          headerRow.append(th);
        }
        head.append(headerRow);
        element.append(head);
        const body = node('tbody');
        for (const row of token.rows || []) {
          const tr = node('tr');
          for (const cell of row) {
            const td = node('td');
            if (cell.align) td.style.textAlign = cell.align;
            appendInline(td, cell.tokens || [{ type: 'text', text: cell.text }]);
            tr.append(td);
          }
          body.append(tr);
        }
        element.append(body);
        wrap.append(element);
        host.append(wrap);
        break;
      }
      case 'html':
        element = node('pre', 'markdown-raw-html');
        element.textContent = token.raw || token.text || '';
        host.append(element);
        break;
      default:
        if (token.tokens?.length) appendBlocks(host, token.tokens, context);
        else if (token.text) host.append(document.createTextNode(decodeEntities(token.text)));
    }
    context.offset += String(token.raw || '').length;
  }
}

export function renderMarkdown(markdown, host) {
  host.replaceChildren();
  const context = { headings: [], headingIndex: 0, offset: 0 };
  try {
    appendBlocks(host, lexer(String(markdown || ''), { gfm: true, breaks: false }), context);
  } catch (error) {
    const message = node('p', 'markdown-render-error');
    message.textContent = `Markdown 预览失败：${error.message}`;
    host.append(message);
  }
  return context.headings;
}

function inlineMarkdown(root) {
  let output = '';
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      output += child.textContent.replace(/([\\`*_[\]<>])/g, '\\$1');
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE || skippedTags.has(child.tagName)) continue;
    const content = inlineMarkdown(child);
    if (child.tagName === 'BR') output += '\n';
    else if (['STRONG', 'B'].includes(child.tagName)) output += `**${content}**`;
    else if (['EM', 'I'].includes(child.tagName)) output += `*${content}*`;
    else if (['DEL', 'S', 'STRIKE'].includes(child.tagName)) output += `~~${content}~~`;
    else if (child.tagName === 'CODE') output += `\`${content.replaceAll('`', '\\`')}\``;
    else if (child.tagName === 'A') {
      const href = safeUrl(child.getAttribute('href'));
      output += href ? `[${content || href}](${href})` : content;
    } else if (child.tagName === 'IMG') {
      const src = safeUrl(child.getAttribute('src'), true);
      const alt = (child.getAttribute('alt') || '').replaceAll(']', '\\]');
      output += src ? `![${alt}](${src})` : alt;
    } else output += content;
  }
  return output;
}

function fenceFor(value) {
  const matches = value.match(/`+/g) || [];
  return '`'.repeat(Math.max(3, ...matches.map((item) => item.length + 1)));
}

function listMarkdown(element, depth = 0) {
  const ordered = element.tagName === 'OL';
  let index = Number(element.getAttribute('start')) || 1;
  const rows = [];
  for (const li of [...element.children].filter((child) => child.tagName === 'LI')) {
    const nested = [...li.children].filter((child) => ['UL', 'OL'].includes(child.tagName));
    const clone = li.cloneNode(true);
    for (const nestedList of [...clone.querySelectorAll(':scope > ul, :scope > ol')]) nestedList.remove();
    const prefix = ordered ? `${index++}. ` : '- ';
    const text = inlineMarkdown(clone).trim().replace(/\n+/g, ' ');
    rows.push(`${'  '.repeat(depth)}${prefix}${text}`);
    for (const child of nested) rows.push(listMarkdown(child, depth + 1));
  }
  return rows.join('\n');
}

function tableMarkdown(table) {
  const rows = [...table.rows].map((row) => [...row.cells].map((cell) => inlineMarkdown(cell).trim().replaceAll('|', '\\|')));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(width - row.length).fill('')]);
  return [normalized[0], Array(width).fill('---'), ...normalized.slice(1)]
    .map((row) => `| ${row.join(' | ')} |`).join('\n');
}

function blockMarkdown(root) {
  const blocks = [];
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim();
      if (text) blocks.push(text);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE || skippedTags.has(child.tagName)) continue;
    const tag = child.tagName;
    if (/^H[1-6]$/.test(tag)) blocks.push(`${'#'.repeat(Number(tag[1]))} ${inlineMarkdown(child).trim()}`);
    else if (['UL', 'OL'].includes(tag)) blocks.push(listMarkdown(child));
    else if (tag === 'PRE') {
      const value = child.textContent.replace(/\n$/, '');
      const fence = fenceFor(value);
      blocks.push(`${fence}\n${value}\n${fence}`);
    } else if (tag === 'BLOCKQUOTE') {
      blocks.push(blockMarkdown(child).split('\n').map((line) => `> ${line}`).join('\n'));
    } else if (tag === 'HR') blocks.push('---');
    else if (tag === 'TABLE') blocks.push(tableMarkdown(child));
    else if (blockTags.has(tag)) {
      const nestedBlocks = [...child.children].some((item) => blockTags.has(item.tagName) || /^H[1-6]$/.test(item.tagName) || ['UL', 'OL', 'PRE', 'TABLE', 'BLOCKQUOTE'].includes(item.tagName));
      blocks.push((nestedBlocks ? blockMarkdown(child) : inlineMarkdown(child)).trim());
    } else blocks.push(inlineMarkdown(child).trim());
  }
  return blocks.filter(Boolean).join('\n\n');
}

export function pastedMarkdown(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return blockMarkdown(parsed.body).replace(/\n{3,}/g, '\n\n').trim();
}
