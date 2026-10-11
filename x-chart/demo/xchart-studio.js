(function () {
  'use strict';

  var schema = window.XChartFormSchema;
  if (!schema || !schema.getTaxonomy) return;

  var taxonomy = schema.getTaxonomy();
  var state = { baseId: null, variantId: null, applyingVariant: false };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function currentChartType() {
    var active = document.querySelector('.tools .icon_tools.icon_active');
    return (active && active.dataset.action) || window.activeChart ||
      (window.chartConfig && window.chartConfig.data && window.chartConfig.data.chartName) || 'lineChart';
  }

  function savedTaxonomy() {
    return window.chartConfig && window.chartConfig.data && window.chartConfig.data.taxonomy;
  }

  function resolveSelection() {
    var saved = savedTaxonomy();
    if (saved && taxonomy.bases[saved.baseId]) {
      var savedBase = taxonomy.bases[saved.baseId];
      var savedVariant = savedBase.variants.filter(function (item) { return item.id === saved.variantId; })[0];
      if (savedVariant) return { baseId: saved.baseId, variantId: savedVariant.id, chartType: savedVariant.chartType };
    }
    return schema.findTaxonomySelection(currentChartType()) || { baseId: 'line', variantId: 'single', chartType: 'lineChart' };
  }

  function variantFor(baseId, variantId) {
    var base = taxonomy.bases[baseId];
    if (!base) return null;
    return base.variants.filter(function (item) { return item.id === variantId; })[0] ||
      base.variants.filter(function (item) { return item.id === base.defaultVariant; })[0] || base.variants[0];
  }

  function iconFallback() {
    return '<path d="M30,30H4a2,2,0,0,1-2-2V2H4V28H30Z"/>';
  }

  // IBM Carbon 官方 @carbon/icons 11.89.0 的 16px 图标路径。
  // Carbon 图标原生 viewBox 为 32×32，统一由 taxonomy 主图表驱动语义。
  var CARBON_CHART_ICONS = {
    line: '<path d="M4.67,28l6.39-12,7.3,6.49a2,2,0,0,0,1.7.47,2,2,0,0,0,1.42-1.07L27,10.9,25.18,10,19.69,21l-7.3-6.49A2,2,0,0,0,10.71,14a2,2,0,0,0-1.42,1L4,25V2H2V28a2,2,0,0,0,2,2H30V28Z"/>',
    area: '<path d="M20.4761,8.0151,13.4473,4.2109a2.0076,2.0076,0,0,0-2.1158.2051L4,10.001V2H2V28a2,2,0,0,0,2,2H30V5.7354ZM28,20.209l-7.62,1.8022-7.0288-2.8838a1.99,1.99,0,0,0-2.022.37L4,25.8359v-4.455l8.375-9.4,7.0186,5.62a2.0155,2.0155,0,0,0,2.0459.2119L28,14.6025ZM12.5239,5.9849l7.03,3.8042a2.012,2.012,0,0,0,1.3408.16L28,8.2646v4.1138L20.6187,16.02,13.6,10.4a1.99,1.99,0,0,0-2.6885.2642L4,18.3838v-5.87ZM4.5513,28,12.62,20.9888l7.0288,2.8838a1.9977,1.9977,0,0,0,1.147.0771L28,22.2612V28Z"/>',
    column: '<path d="M27,28V6H19V28H15V14H7V28H4V2H2V28a2,2,0,0,0,2,2H30V28ZM13,28H9V16h4Zm12,0H21V8h4Z"/>',
    bar: '<path d="M4,2H2V28a2,2,0,0,0,2,2H30V28H4V25H26V17H4V13H18V5H4ZM24,19v4H4V19ZM16,7v4H4V7Z"/>',
    scatter: '<path d="M30,30H4a2,2,0,0,1-2-2V2H4V28H30Z"/><circle cx="10" cy="22" r="2"/><circle cx="14" cy="15" r="2"/><circle cx="22" cy="15" r="2"/><circle cx="26" cy="6" r="2"/><circle cx="14" cy="8" r="2"/>',
    bubble: '<path d="M30,30H4a2,2,0,0,1-2-2V2H4V28H30Z"/><path d="M10,16a2,2,0,1,1-2,2,2,2,0,0,1,2-2m0-2a4,4,0,1,0,4,4,4,4,0,0,0-4-4Z"/><path d="M21,6a4,4,0,1,1-4,4,4,4,0,0,1,4-4m0-2a6,6,0,1,0,6,6,6,6,0,0,0-6-6Z"/><path d="M24.5,21A1.5,1.5,0,1,1,23,22.5,1.5,1.5,0,0,1,24.5,21m0-2A3.5,3.5,0,1,0,28,22.5,3.5,3.5,0,0,0,24.5,19Z"/>',
    pie: '<path d="M16,4A12,12,0,1,0,28,16,12,12,0,0,0,16,4ZM26,15H17V6.05A10,10,0,0,1,26,15ZM15.42,26A10,10,0,0,1,15,6.05v9a2,2,0,0,0,2,2h9A10,10,0,0,1,15.42,26Z"/>',
    donut: '<path d="M16,4.0194c-6.6167,0-12,5.3833-12,12s5.3833,12,12,12,12-5.3833,12-12-5.3833-12-12-12ZM11,16.0194c0-2.7568,2.2432-5,5-5s5,2.2432,5,5-2.2432,5-5,5-5-2.2432-5-5ZM6,16.0194c0-5.1766,3.9537-9.4459,9-9.9493v3.0292c-3.3866.4878-6,3.4006-6,6.9202,0,1.5647.5223,3.0061,1.393,4.1729l-2.14,2.14c-1.4066-1.723-2.2531-3.9203-2.2531-6.3129h.0001ZM16,26.0194c-2.4028,0-4.6096-.8528-6.3358-2.2703l2.14-2.1399c1.1708.8811,2.6209,1.4102,4.1958,1.4102,3.8599,0,7-3.1401,7-7,0-3.5195-2.6134-6.4324-6-6.9202v-3.0292c5.0463.5034,9,4.7727,9,9.9493,0,5.5142-4.4858,10-10,10h0Z"/>',
    treemap: '<path d="M28,2H4A2.0023,2.0023,0,0,0,2,4V28a2.0023,2.0023,0,0,0,2,2H28a2.0023,2.0023,0,0,0,2-2V4A2.0023,2.0023,0,0,0,28,2Zm0,12H23V4h5ZM16,4h5V14H16ZM14,4V20H4V4ZM4,22H14v6H4Zm12,6V16H28V28Z"/>',
    gauge: '<path d="M16,30A14.0158,14.0158,0,0,1,2,16H4A12,12,0,1,0,16,4V2a14,14,0,0,1,0,28Z"/><path d="M16,26A10.0115,10.0115,0,0,1,6,16H8a8,8,0,1,0,8-8V6a10,10,0,0,1,0,20Z"/><path d="M16,22a6.0069,6.0069,0,0,1-6-6h2a4,4,0,1,0,4-4V10a6,6,0,0,1,0,12Z"/>',
    progressIndicator: '<path d="M30,22H16V21H14v1H2v6H14v1h2V28H30ZM4,26V24H14v2Zm24,0H16V24H28Z"/><path d="M30,13H24V12H22v1H2v6H22v1h2V19h6ZM4,17V15H22v2Zm24,0H24V15h4Z"/><path d="M30,4H10V3H8V4H2v6H8v1h2V10H30ZM4,8V6H8v2ZM28,8H10V6H28Z"/>',
    radar: '<path d="M16,2,2,13,8,30H24l6-17Zm2.5818,19.2651-5.9861,1.3306-1.4226-7.8252,4.91-4.209,5.4416,4.0816Zm.1977,2.0054L21.3264,28H10.6736l1.7912-3.3267ZM9.59,13.4937,5.74,12.605,15,5.3291V8.8569ZM17,8.75V5.3291l9.26,7.2759-3.15.727ZM4.6143,14.3979l4.6535,1.0738,1.4844,8.164-1.738,3.2281ZM22.9858,26.8638l-2.5766-4.7852,3.0063-6.7646,3.97-.9161Z"/>',
    funnel: '<path d="M29,8H9c-1.1,0-2,.9-2,2v3.6c0,.5.2,1,.6,1.4l7.4,7.4v5.6c0,1.1.9,2,2,2h4c1.1,0,2-.9,2-2v-5.6l7.4-7.4c.4-.4.6-.9.6-1.4v-3.6c0-1.1-.9-2-2-2ZM29,13.6l-8,8v6.4h-4v-6.4l-8-8v-3.6h20v3.6ZM4,7.6l1,1v2.8l-2.4-2.4c-.4-.4-.6-.9-.6-1.4v-3.6c0-1.1.9-2,2-2h20c1.1,0,2,.9,2,2v2h-2v-2H4v3.6h0Z"/>',
    combo: '<path d="M27,28V16H19V28H15V12H7V28H4V2H2V28a2,2,0,0,0,2,2H30V28ZM13,28H9V14h4Zm12,0H21V18h4Z"/><path d="M22.7856,14a1.9877,1.9877,0,0,1-1.1787-.3865L11.2041,5.987,8.2419,10,6.6374,8.8065l2.9812-4a1.9978,1.9978,0,0,1,2.749-.446l10.4214,7.64,3.6045-4.8613L28,8.3306l-3.6045,4.8611A2.0014,2.0014,0,0,1,22.7856,14Z"/>',
    stream: '<path d="M12.4326,20.0171l8.0376,4.68a1.958,1.958,0,0,0,1.0508.3012,2.2412,2.2412,0,0,0,.4888-.0556l7.2532-1.9769A1,1,0,0,0,30,22.0007V7.996A1,1,0,0,0,28.74,7.0305L21.5034,8.9829l-8.0371-4.68a1.9917,1.9917,0,0,0-1.8652-.1352L4,7.4727V2H2V28a2,2,0,0,0,2,2H30V28H4V23.6577ZM28,21.2344l-6.4966,1.75-8.0371-4.68a1.9931,1.9931,0,0,0-1.8652-.1353L4,21.4746V16.6572l8.4326-3.6416L20.47,17.6968a1.962,1.962,0,0,0,1.0508.3008,2.2112,2.2112,0,0,0,.4888-.0557L28,16.31ZM12.4326,6.0156l8.0376,4.68a2.0091,2.0091,0,0,0,1.54.2451L28,9.3081v4.9258l-6.4966,1.7505-8.0371-4.6812a1.9917,1.9917,0,0,0-1.8652-.1352L4,14.4736V9.6562Z"/>',
    sparkline: '<path d="M10.06,17.88A4.25,4.25,0,0,0,11,18a4,4,0,0,0,2.23-.68l3.22,2.87a3.88,3.88,0,0,0-.2,3.17A4,4,0,1,0,22.62,19l2.54-5.09a3.78,3.78,0,0,0,2.91-.53A4,4,0,1,0,23.38,13l-2.54,5.09A3.86,3.86,0,0,0,20,18a4,4,0,0,0-2.23.68l-3.22-2.87a3.88,3.88,0,0,0,.2-3.17A4,4,0,1,0,8.3,16.93L4,25V2H2V28a2,2,0,0,0,2,2H30V28H4.67ZM26,8a2,2,0,1,1-2,2A2,2,0,0,1,26,8ZM22,22a2,2,0,1,1-2-2A2,2,0,0,1,22,22ZM11,12a2,2,0,1,1-2,2A2,2,0,0,1,11,12Z"/>',
    histogram: '<path d="M6,16c2.9727,0,4.2324-2.251,5.3447-4.2373C12.4741,9.7441,13.45,8,16,8s3.5259,1.7441,4.6553,3.7627C21.7676,13.749,23.0273,16,26,16h4V14H26c-1.7129,0-2.4834-1.2207-3.5991-3.2144C21.2075,8.6543,19.7231,6,16,6s-5.2075,2.6543-6.4009,4.7856C8.4834,12.7793,7.7129,14,6,14H4V2H2V28a2,2,0,0,0,2,2H30V28H28V22H26v6H21.9992L22,20H20v8H16V16H14V28H9.9992L10,20H8v8H4V16Z"/>',
    heatmap: '<path d="M20 18H22V20H20z"/><path d="M28 16H30V18H28z"/><path d="M14 6H16V8H14z"/><path d="M16,22H12V16a2.0023,2.0023,0,0,0-2-2H4a2.0023,2.0023,0,0,0-2,2v6a2.0023,2.0023,0,0,0,2,2h6v4a2.0023,2.0023,0,0,0,2,2h4a2.0023,2.0023,0,0,0,2-2V24A2.0023,2.0023,0,0,0,16,22ZM4,22V16h6v6Zm8,6V24h4v4Z"/><path d="M28,30H24a2.0021,2.0021,0,0,1-2-2V24a2.0021,2.0021,0,0,1,2-2h4a2.0021,2.0021,0,0,1,2,2v4A2.0021,2.0021,0,0,1,28,30Zm-4-6v4h4V24Z"/><path d="M28,2H22a2.0023,2.0023,0,0,0-2,2v6H18a2.0023,2.0023,0,0,0-2,2v2a2.0023,2.0023,0,0,0,2,2h2a2.0023,2.0023,0,0,0,2-2V12h6a2.0023,2.0023,0,0,0,2-2V4A2.0023,2.0023,0,0,0,28,2ZM18,14V12h2v2Zm4-4V4h6v6Z"/><path d="M8,10H4A2.0021,2.0021,0,0,1,2,8V4A2.0021,2.0021,0,0,1,4,2H8a2.0021,2.0021,0,0,1,2,2V8A2.0021,2.0021,0,0,1,8,10ZM4,4V8H8V4Z"/>',
    candlestick: '<path d="M26,10H24V6H22v4H20V22h2v4h2V22h2ZM24,20H22V12h2Z"/><path d="M14,8H12V4H10V8H8V18h2v4h2V18h2Zm-2,8H10V10h2Z"/><path d="M30,30H4a2,2,0,0,1-2-2V2H4V28H30Z"/>'
  };

  function chartTitleIcon(baseId) {
    return '<svg class="chart-title-icon-svg" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">' + (CARBON_CHART_ICONS[baseId] || iconFallback()) + '</svg>';
  }

  function carbonChartIcon(baseId, chartType) {
    var iconId = baseId;
    if (!CARBON_CHART_ICONS[iconId]) {
      var chartIconMap = {
        lineChart: 'line', areaChart: 'area', verticalBarChart: 'column', groupedBarChart: 'column',
        horizontalBarChart: 'bar', groupedHorizontalBarChart: 'bar', scatterPlot: 'scatter',
        pieChart: 'pie', donutChart: 'donut', progressChart: 'progressIndicator', radarChart: 'radar',
        funnelChart: 'funnel', comboChart: 'combo', dualBarChart: 'combo', dualLineBarChart: 'combo',
        streamGraph: 'stream', sparkline: 'sparkline', histogram: 'histogram', stackedHistogram: 'histogram',
        heatmap: 'heatmap', candlestickChart: 'candlestick', treemap: 'treemap'
      };
      iconId = chartIconMap[chartType] || 'line';
    }
    return '<svg class="carbon-chart-icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">' +
      (CARBON_CHART_ICONS[iconId] || iconFallback()) + '</svg>';
  }

  function buildNavigation() {
    var tools = document.querySelector('.tools');
    if (!tools) return;

    var selection = resolveSelection();
    state.baseId = selection.baseId;
    state.variantId = selection.variantId;

    var fragment = document.createDocumentFragment();
    taxonomy.groups.forEach(function (group) {
      var heading = document.createElement('div');
      heading.className = 'tool-section taxonomy-section';
      heading.textContent = group.name;
      heading.dataset.group = group.id;
      fragment.appendChild(heading);

      group.bases.forEach(function (baseId) {
        var base = taxonomy.bases[baseId];
        if (!base) return;
        var selectedVariant = variantFor(baseId, baseId === state.baseId ? state.variantId : base.defaultVariant);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon_tools taxonomy-chart' + (baseId === state.baseId ? ' icon_active' : '');
        button.dataset.base = baseId;
        button.dataset.action = selectedVariant.chartType;
        button.dataset.variant = selectedVariant.id;
        button.title = base.name;
        button.setAttribute('aria-label', base.name);
        var hasSupportedVariant = base.variants.some(function (variant) { return !variant.disabled; });
        if (!hasSupportedVariant) {
          button.disabled = true;
          button.classList.add('taxonomy-chart-disabled');
          button.setAttribute('aria-disabled', 'true');
          button.title = base.name + '（渲染内核待支持）';
        }
        button.innerHTML = carbonChartIcon(baseId, selectedVariant.chartType) + '<span class="tool-label"></span>';
        var label = button.querySelector('.tool-label');
        label.textContent = base.name;
        button.addEventListener('click', function (event) {
          if (!hasSupportedVariant) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.showAlert === 'function') window.showAlert(selectedVariant.note || '该主图表尚未接入渲染内核');
            return;
          }
          var applyDefaultVariant = !state.applyingVariant;
          var next = null;
          if (!state.applyingVariant) {
            next = variantFor(baseId, base.defaultVariant);
            state.baseId = baseId;
            state.variantId = next.id;
            button.dataset.action = next.chartType;
            button.dataset.variant = next.id;
          }
          window.XChartTaxonomySelection = clone(state);
          setTimeout(function () {
            syncActiveButton();
            renderVariants();
            updateHeading();
            refreshInspector();
            if (applyDefaultVariant && next) {
              applyVariantControls(next);
              if (window.PreviewEngine && PreviewEngine.update) PreviewEngine.update();
            }
          }, 0);
        });
        fragment.appendChild(button);
      });
    });
    tools.replaceChildren(fragment);
    window.XChartTaxonomySelection = clone(state);
  }

  function ensureWindowBar() {
    if (document.querySelector('.studio-windowbar')) return;
    var webview = document.querySelector('.webview');
    if (!webview) return;
    document.body.classList.add('taxonomy-studio');
    var bar = document.createElement('div');
    bar.className = 'studio-windowbar';
    bar.innerHTML = '<span class="studio-window-title">X-Chart Studio</span><button type="button" class="studio-template-settings">模板设置</button>';
    webview.parentNode.insertBefore(bar, webview);
    bar.querySelector('.studio-template-settings').addEventListener('click', function () {
      var select = document.querySelector('select[name="template"]');
      if (select) {
        select.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(function () { select.focus(); }, 180);
      }
    });
  }

  function ensureVariantRow() {
    var preview = document.querySelector('.preview-panel');
    if (!preview) return null;
    var existing = document.querySelector('.studio-variant-block');
    if (existing) return existing;
    var block = document.createElement('div');
    block.className = 'studio-variant-block';
    block.innerHTML = '<div class="studio-variants" role="tablist" aria-label="数据表现变体"></div>';
    preview.parentNode.insertBefore(block, preview.nextSibling);
    return block;
  }

  function syncActiveButton() {
    var buttons = document.querySelectorAll('.tools .taxonomy-chart');
    Array.prototype.forEach.call(buttons, function (button) {
      button.classList.toggle('icon_active', button.dataset.base === state.baseId);
      if (button.dataset.base === state.baseId) {
        var variant = variantFor(state.baseId, state.variantId);
        button.dataset.action = variant.chartType;
        button.dataset.variant = variant.id;
      }
    });
  }

  function applyControl(name, value) {
    if (name === 'areaFillStyle') {
      var areaOption = document.querySelector('.area-style-option[data-style="' + value + '"]');
      if (areaOption) areaOption.click();
      return;
    }
    var node = document.querySelector('[name="' + name + '"]');
    if (!node) return;
    if (node.type === 'checkbox') node.checked = value === true || value === 'true' || value === 1 || value === '1';
    else node.value = value;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyVariantControls(variant) {
    Object.keys(variant.set || {}).forEach(function (name) { applyControl(name, variant.set[name]); });
    if (variant.dataPreset) {
      if (variant.dataPreset.categories != null) applyControl('categories', variant.dataPreset.categories);
      if (variant.dataPreset.items != null) applyControl('items', variant.dataPreset.items);
    }
  }

  function applyVariant(variant) {
    if (!variant || variant.disabled) {
      var message = (variant && variant.note) || '该数据表现变体尚未接入渲染内核';
      if (typeof window.showAlert === 'function') window.showAlert(message);
      return;
    }
    state.variantId = variant.id;
    window.XChartTaxonomySelection = clone(state);
    var active = document.querySelector('.tools .taxonomy-chart[data-base="' + state.baseId + '"]');
    if (!active) return;
    active.dataset.action = variant.chartType;
    active.dataset.variant = variant.id;
    state.applyingVariant = true;
    active.click();
    state.applyingVariant = false;

    setTimeout(function () {
      applyVariantControls(variant);
      renderVariants();
      updateHeading();
      refreshInspector();
      if (window.PreviewEngine && PreviewEngine.update) PreviewEngine.update();
    }, 0);
  }

  function renderVariants() {
    var base = taxonomy.bases[state.baseId];
    var block = document.querySelector('.studio-variant-block');
    if (!base || base.variants.length <= 1) {
      if (block) block.hidden = true;
      return;
    }
    block = ensureVariantRow();
    if (block) block.hidden = false;
    var row = block && block.querySelector('.studio-variants');
    if (!row) return;
    row.replaceChildren();
    base.variants.forEach(function (variant) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'studio-variant' + (variant.id === state.variantId ? ' active' : '') + (variant.disabled ? ' disabled' : '');
      item.dataset.value = variant.id;
      item.textContent = variant.name;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', variant.id === state.variantId ? 'true' : 'false');
      if (variant.disabled) {
        item.setAttribute('aria-disabled', 'true');
        item.title = variant.note || '待渲染内核支持';
      }
      item.addEventListener('click', function () { applyVariant(variant); });
      row.appendChild(item);
    });
  }

  function updateHeading() {
    var base = taxonomy.bases[state.baseId];
    var heading = document.querySelector('.chart_name');
    if (!base || !heading) return;
    heading.textContent = base.name;
  }

  function refreshInspector() {
    document.dispatchEvent(new CustomEvent('xchart:taxonomychange', { detail: clone(state) }));
    if (typeof window.refreshInspectorFields === 'function') window.refreshInspectorFields(currentChartType());
  }

  function selectSelection(selection, notify) {
    if (!selection || !taxonomy.bases[selection.baseId]) return false;
    var variant = variantFor(selection.baseId, selection.variantId);
    if (!variant || variant.disabled) return false;
    state.baseId = selection.baseId;
    state.variantId = variant.id;
    window.XChartTaxonomySelection = clone(state);
    syncActiveButton();
    renderVariants();
    updateHeading();
    if (notify !== false) refreshInspector();
    return true;
  }

  function init() {
    if (!document.querySelector('.tools')) return;
    document.body.classList.add('taxonomy-studio');
    buildNavigation();
    syncActiveButton();
    renderVariants();
    updateHeading();
    window.XChartStudio = {
      getSelection: function () { return clone(state); },
      getBase: function () { return schema.getTaxonomyBase(state.baseId); },
      selectVariant: function (variantId) { applyVariant(variantFor(state.baseId, variantId)); },
      selectSelection: selectSelection
    };
  }

  document.addEventListener('DOMContentLoaded', init);
}());
