(function(root, factory){
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XChartColors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  var FALLBACK = ['#0A84FF', '#30B0C7', '#FF9F0A', '#FF375F', '#5E5CE6', '#34C759'];

  function normalizeColor(value){
    var match = /^#?([0-9a-f]{6})$/i.exec(String(value || '').trim());
    return match ? '#' + match[1].toUpperCase() : null;
  }

  function uniqueColors(colors){
    var seen = {}, output = [];
    (colors || []).forEach(function(value){
      var color = normalizeColor(value);
      if (color && !seen[color]) { seen[color] = true; output.push(color); }
    });
    return output;
  }

  function normalizePalette(colors){
    return (colors || []).map(normalizeColor).filter(Boolean);
  }

  function colorGroup(chart){
    return ['progressChart', 'sparkline', 'scatterPlot', 'candlestickChart'].indexOf(chart) >= 0 ? chart : 'common';
  }

  function valuesForKey(value, key){
    var output = [];
    if (!value || typeof value !== 'object') return output;
    Object.keys(value).forEach(function(name){
      var child = value[name];
      if (child && typeof child === 'object') output = output.concat(valuesForKey(child, key));
      else if (name === key) output.push(child);
    });
    return output;
  }

  function selectedItems(items){
    return (items || []).filter(function(item){ return item && item.checked; });
  }

  function requiredCount(chart, data){
    if (chart === 'candlestickChart') return 2;
    if (chart === 'progressChart' || chart === 'sparkline' || chart === 'scatterPlot') return 1;
    if (chart === 'heatmap') return 1;
    data = data || {};
    var polar = chart === 'pieChart' || chart === 'donutChart' || chart === 'funnelChart' || chart === 'treemap';
    if (data.selected === 'json') {
      var keys = selectedItems(data.json && data.json.keys);
      if (polar && keys.length) return Math.max(1, valuesForKey(data.json.data, keys[0].name).length);
      return Math.max(1, keys.length);
    }
    var csv = data.csv || {};
    if (csv.type === null || csv.type === undefined) {
      var table = Array.isArray(csv.data) ? csv.data : [];
      if (polar) return Math.max(1, ((table[1] || table[0]) || []).length);
      return Math.max(1, table.length - 1);
    }
    if (polar) return Math.max(1, Array.isArray(csv.data) ? csv.data.length : 1);
    return Math.max(1, selectedItems(csv.columns).length);
  }

  function labelsFor(chart, data, count){
    var labels = [], i;
    if (chart === 'candlestickChart') return ['上涨', '下跌'];
    if (chart === 'progressChart') return ['进度'];
    if (chart === 'sparkline') return ['折线'];
    if (chart === 'scatterPlot') return [data && data.taxonomy && data.taxonomy.baseId === 'bubble' ? '气泡系列' : '散点系列'];
    if (chart === 'heatmap') return ['色阶'];
    data = data || {};
    var itemColored = chart === 'pieChart' || chart === 'donutChart' || chart === 'funnelChart' || chart === 'treemap';
    if (data.selected === 'json') {
      var jsonKeys = selectedItems(data.json && data.json.keys);
      if (itemColored) {
        var headers = selectedItems(data.json && data.json.header);
        if (headers.length) labels = valuesForKey(data.json.data, headers[0].name).map(String);
      } else labels = jsonKeys.map(function(item){ return item.name; });
    } else {
      var csv = data.csv || {};
      if (csv.type === null || csv.type === undefined) {
        if (itemColored && Array.isArray(csv.data) && csv.data[0]) labels = csv.data[0].map(String);
        else labels = (csv.seriesNames || []).map(String);
      } else if (itemColored) {
        var selectedHeader = selectedItems(csv.header)[0];
        if (selectedHeader && Array.isArray(csv.data)) labels = csv.data.map(function(row){ return String(row[selectedHeader.index] == null ? '' : row[selectedHeader.index]); });
      } else labels = selectedItems(csv.columns).map(function(item){ return item.name; });
    }
    for (i = labels.length; i < count; i++) labels.push((itemColored ? '数据项 ' : '系列 ') + (i + 1));
    return labels.slice(0, count).map(function(label, index){ return label || (itemColored ? '数据项 ' : '系列 ') + (index + 1); });
  }

  function fitPalette(palette, count, fallback){
    var source = normalizePalette(palette);
    if (!source.length) source = uniqueColors((fallback || []).concat(FALLBACK));
    if (!source.length) source = FALLBACK.slice();
    var output = [];
    for (var i = 0; i < Math.max(1, count); i++) output.push(source[i % source.length]);
    return output;
  }

  function mergeVisible(base, visible){
    var output = normalizePalette(base);
    normalizePalette(visible).forEach(function(color, index){ output[index] = color; });
    return output;
  }

  function templatePalette(template, chart){
    var colors = template && template.colors || {};
    var group = colorGroup(chart);
    var scoped = colors[group] || [];
    var common = colors.common || [];
    // A configured template is the source of truth. Appending the fallback
    // palette here made the default palette grow to 14 swatches.
    if (chart === 'scatterPlot') return uniqueColors(scoped.concat(common.length ? common : FALLBACK));
    return uniqueColors(scoped.length ? scoped : (common.length ? common : FALLBACK));
  }

  function createEditor(options){
    options = options || {};
    var container = document.getElementById(options.containerId || 'colorContainer');
    var paletteContainer = document.getElementById(options.paletteId || 'templateColorPalette');
    var countElement = document.getElementById(options.countId || 'colorUsageCount');
    if (!container) return null;
    container.dataset.colorEditor = 'managed';
    var fullPalette = [], activeIndex = 0, labels = [], count = 1, templateColors = FALLBACK.slice(), draggedRow = null;

    function visibleColors(){
      return Array.prototype.slice.call(container.querySelectorAll('.color_item')).map(function(item){ return normalizeColor(item.getAttribute('title')); }).filter(Boolean);
    }

    function sync(notify){
      fullPalette = mergeVisible(fullPalette, visibleColors());
      if (notify && typeof options.onChange === 'function') options.onChange(fullPalette.slice(), visibleColors());
    }

    function select(index){
      var rows = Array.prototype.slice.call(container.querySelectorAll('.color_item'));
      if (!rows.length) return;
      activeIndex = Math.max(0, Math.min(index, rows.length - 1));
      rows.forEach(function(row, rowIndex){
        row.classList.toggle('active', rowIndex === activeIndex);
        row.setAttribute('aria-selected', String(rowIndex === activeIndex));
      });
    }

    // F16 颜色来源标注：当前色在模板色板集合内 → 模板色，否则 → 实例色
    function updateSourceBadge(row){
      var badge = row.querySelector('.color-source-badge');
      if (!badge) return;
      var color = normalizeColor(row.getAttribute('title'));
      var fromTemplate = color && templateColors.indexOf(color) >= 0;
      badge.textContent = fromTemplate ? '模板色' : '实例色';
      badge.classList.toggle('is-template', !!fromTemplate);
      badge.classList.toggle('is-custom', !fromTemplate);
    }
    function updateAllSourceBadges(){
      Array.prototype.slice.call(container.querySelectorAll('.color_item')).forEach(updateSourceBadge);
    }

    function move(row, direction){
      var sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling) return;
      if (direction < 0) container.insertBefore(row, sibling);
      else container.insertBefore(sibling, row);
      activeIndex = Array.prototype.indexOf.call(container.children, row);
      sync(true);
      select(activeIndex);
      row.focus();
    }

    function makeRow(color, index){
      var row = document.createElement('div');
      row.className = 'color_item inspector-color-row drag-box';
      row.setAttribute('title', color);
      row.setAttribute('DragObj', container.getAttribute('DropObj') || '0');
      row.setAttribute('role', 'option');
      row.setAttribute('tabindex', '0');
      row.setAttribute('draggable', 'true');
      row.setAttribute('aria-label', (labels[index] || '颜色 ' + (index + 1)) + ' ' + color);
      row.style.setProperty('--swatch-color', color);

      var handle = document.createElement('span');
      handle.className = 'inspector-color-handle';
      handle.setAttribute('aria-hidden', 'true');
      handle.innerHTML = '<svg class="carbon-drag-icon" viewBox="0 0 16 16" fill="currentColor" focusable="false"><circle cx="5" cy="4" r="1.25"/><circle cx="11" cy="4" r="1.25"/><circle cx="5" cy="8" r="1.25"/><circle cx="11" cy="8" r="1.25"/><circle cx="5" cy="12" r="1.25"/><circle cx="11" cy="12" r="1.25"/></svg>';
      var swatch = document.createElement('span'); swatch.className = 'inspector-color-swatch'; swatch.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span'); name.className = 'inspector-color-name'; name.textContent = labels[index] || '颜色 ' + (index + 1); name.title = name.textContent;
      var value = document.createElement('label'); value.className = 'inspector-color-value';
      var hash = document.createElement('span'); hash.setAttribute('aria-hidden', 'true'); hash.textContent = '#';
      var input = document.createElement('input'); input.className = 'inspector-color-input'; input.value = color.slice(1); input.maxLength = 6; input.setAttribute('aria-label', name.textContent + ' HEX 颜色');
      value.appendChild(hash); value.appendChild(input);
      var badge = document.createElement('span'); badge.className = 'color-source-badge'; badge.setAttribute('aria-hidden', 'true');
      row.appendChild(handle); row.appendChild(swatch); row.appendChild(name); row.appendChild(value); row.appendChild(badge);

	  function selectRow(){ select(Array.prototype.indexOf.call(container.children, row)); }
	  row.addEventListener('mousedown', function(event){ if (event.target !== input) selectRow(); });
	  row.addEventListener('click', selectRow);
	  row.addEventListener('focus', selectRow);
      row.addEventListener('dragstart', function(event){
        draggedRow = row;
        row.classList.add('dragging');
        select(Array.prototype.indexOf.call(container.children, row));
        if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', color); }
      });
      row.addEventListener('dragend', function(){
        row.classList.remove('dragging');
        if (draggedRow !== row) return;
        draggedRow = null;
        sync(true);
        select(Array.prototype.indexOf.call(container.children, row));
        row.focus();
      });
      row.addEventListener('keydown', function(event){
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        event.preventDefault(); move(row, event.key === 'ArrowUp' ? -1 : 1);
      });
      input.setAttribute('draggable', 'false');
      ['mousedown', 'dblclick', 'dragstart'].forEach(function(eventName){ input.addEventListener(eventName, function(event){ event.stopPropagation(); }); });
      input.addEventListener('focus', function(){ select(Array.prototype.indexOf.call(container.children, row)); });
      input.addEventListener('input', function(){
        var raw = input.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6);
        if (input.value !== raw) input.value = raw;
        row.classList.toggle('invalid', raw.length !== 6);
        if (raw.length !== 6) return;
        var next = '#' + raw;
        row.setAttribute('title', next); row.style.setProperty('--swatch-color', next);
        updateSourceBadge(row);
        sync(true);
      });
      input.addEventListener('change', function(){
        if (normalizeColor(input.value)) return;
        var fallback = normalizeColor(row.getAttribute('title')) || FALLBACK[0];
        input.value = fallback.slice(1); row.classList.remove('invalid');
      });
      return row;
    }

    function renderPalette(){
      if (!paletteContainer) return;
      paletteContainer.textContent = '';
      templateColors.forEach(function(color){
        var button = document.createElement('button');
        button.type = 'button'; button.className = 'template-color-swatch'; button.style.setProperty('--palette-color', color);
        button.setAttribute('aria-label', '使用模板颜色 ' + color); button.title = color;
        button.addEventListener('click', function(){
          var row = container.children[activeIndex];
          if (!row) return;
          row.setAttribute('title', color); row.style.setProperty('--swatch-color', color);
          var input = row.querySelector('.inspector-color-input'); if (input) input.value = color.slice(1);
          updateSourceBadge(row);
          sync(true); row.focus();
        });
        paletteContainer.appendChild(button);
      });
    }

    function render(settings){
      settings = settings || {};
      count = Math.max(1, Number(settings.count) || 1);
      labels = (settings.labels || []).slice(0, count);
      templateColors = uniqueColors(settings.templateColors || FALLBACK);
      fullPalette = normalizePalette(settings.colors || fullPalette);
      var visible = fitPalette(fullPalette, count, templateColors);
      fullPalette = mergeVisible(fullPalette, visible);
      container.textContent = '';
      visible.forEach(function(color, index){ container.appendChild(makeRow(color, index)); });
      if (countElement) countElement.textContent = count + ' 个';
      renderPalette(); select(Math.min(activeIndex, count - 1));
      updateAllSourceBadges();
    }

    container.addEventListener('dragover', function(event){
      if (!draggedRow) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      var target = event.target && event.target.closest ? event.target.closest('.color_item') : null;
      if (!target || target === draggedRow || target.parentNode !== container) return;
      var rect = target.getBoundingClientRect();
      container.insertBefore(draggedRow, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
    });
    container.addEventListener('drop', function(event){ if (draggedRow) event.preventDefault(); });

    document.addEventListener('xchart:colors-reordered', function(event){
      var row = event.detail && event.detail.element;
      if (!row || row.parentNode !== container) return;
      sync(true);
      select(Array.prototype.indexOf.call(container.children, row));
      row.focus();
    });

    return {
      render: render,
      getVisibleColors: visibleColors,
      getFullColors: function(){ sync(false); return fullPalette.slice(); },
      select: select
    };
  }

  return {
    FALLBACK: FALLBACK.slice(),
    normalizeColor: normalizeColor,
    normalizePalette: normalizePalette,
    uniqueColors: uniqueColors,
    colorGroup: colorGroup,
    requiredCount: requiredCount,
    labelsFor: labelsFor,
    fitPalette: fitPalette,
    mergeVisible: mergeVisible,
    templatePalette: templatePalette,
    createEditor: createEditor
  };
});
