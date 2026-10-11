(function(){
  var LABEL_FONTS = [
    { value: 'IBM Plex Sans', label: 'IBM Plex Sans' },
    { value: 'SF Pro Text', label: 'SF Pro Text' },
    { value: 'Helvetica Neue', label: 'Helvetica Neue' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Avenir Next', label: 'Avenir Next' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'PingFang SC', label: '苹方—简' },
    { value: 'Hiragino Sans GB', label: '冬青黑体—简' },
    { value: 'Source Han Sans SC', label: '思源黑体' },
    { value: 'Noto Sans CJK SC', label: 'Noto Sans CJK SC' }
  ];

  function addFontOption(select, value, custom){
    if (!value) return;
    var exists = Array.prototype.some.call(select.options, function(option){ return option.value === value; });
    if (exists) return;
    var option = document.createElement('option');
    option.value = value;
    option.textContent = custom ? value + ' (原设置)' : value;
    select.appendChild(option);
  }

  function setFontValue(value){
    value = value || 'IBM Plex Sans';
    document.querySelectorAll('select[name="labelFontName"]').forEach(function(select){
      addFontOption(select, value, true);
      select.value = value;
    });
  }

  function enhanceFontSelectors(){
    document.querySelectorAll('[name="labelFontName"]').forEach(function(control){
      if (control.tagName.toLowerCase() === 'select') return;
      var select = document.createElement('select');
      Array.prototype.slice.call(control.attributes).forEach(function(attr){
        if (attr.name !== 'type' && attr.name !== 'value' && attr.name !== 'placeholder' && attr.name !== 'spellcheck') {
          select.setAttribute(attr.name, attr.value);
        }
      });
      select.classList.add('select_height');
      LABEL_FONTS.forEach(function(font){
        var option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.label;
        select.appendChild(option);
      });
      addFontOption(select, control.value, true);
      select.value = control.value || 'IBM Plex Sans';
      var wrapper = document.createElement('div');
      wrapper.className = 'select-wraper';
      wrapper.appendChild(select);
      control.parentNode.replaceChild(wrapper, control);
    });
  }

  window.XChartFontPicker = { setValue: setFontValue };

  function identifyPage(){
    var body = document.body;
    if (!body) return;
    if (document.querySelector('.main-view')) body.classList.add('xchart-templates');
    if (document.querySelector('.webview.layout-edit')) body.classList.add('xchart-edit');
    else if (document.querySelector('.webview .tools')) body.classList.add('xchart-create');
  }

  function organizeChartNavigation(){
    var tools = document.querySelector('.xchart-create .tools, .webview .tools');
    var schema = window.XChartFormSchema;
    // 工作台的主图表导航由 taxonomy 中台统一生成；保留本函数只是兼容
    // 没有加载 xchart-studio 的旧页面，避免两套分类同时改造同一组按钮。
    if (schema && schema.getTaxonomy) return;
    if (!tools || !schema || !Array.isArray(schema.navigationGroups)) return;
    var buttons = {};
    Array.prototype.slice.call(tools.querySelectorAll('.icon_tools[data-action]')).forEach(function(button){
      buttons[button.getAttribute('data-action')] = button;
    });
    ['stackedAreaChart', 'percentStackedAreaChart'].forEach(function(chartId){
      if (buttons[chartId] || !buttons.areaChart) return;
      var clone = buttons.areaChart.cloneNode(true);
      clone.classList.remove('icon_active');
      clone.setAttribute('data-action', chartId);
      clone.removeAttribute('data-page-node-id');
      buttons[chartId] = clone;
    });
    var fragment = document.createDocumentFragment();
    schema.navigationGroups.forEach(function(group){
      var available = group.charts.filter(function(chartId){ return buttons[chartId]; });
      if (!available.length) return;
      var heading = document.createElement('div');
      heading.className = 'tool-section';
      heading.textContent = group.name;
      heading.dataset.family = group.family;
      fragment.appendChild(heading);
      available.forEach(function(chartId){
        var button = buttons[chartId];
        var chart = schema.getChart(chartId);
        button.dataset.family = group.family;
        if (chart && chart.variant) button.dataset.variant = JSON.stringify(chart.variant);
        if (chart) {
          button.title = chart.name;
          button.setAttribute('aria-label', chart.name);
          var label = button.querySelector('.tool-label');
          if (label) label.textContent = chart.navigationLabel || chart.name;
        }
        fragment.appendChild(button);
      });
    });
    tools.replaceChildren(fragment);
  }

  function unifyCreateView(){
    var styleTab = document.getElementById('settings');
    var legacyStyleView = document.querySelector('.settings');
    var scroller = document.querySelector('.content > .content-scroll');
    if (!styleTab || !legacyStyleView || !scroller) return;

    var tabList = styleTab.closest('.view-tabs');
    var dataTab = tabList && tabList.querySelector('.view-tab:not(#settings)');
    if (!tabList || !dataTab) return;

    dataTab.setAttribute('data-target', 'data');
    styleTab.setAttribute('data-target', 'style');

    var dataPanel = document.createElement('div');
    dataPanel.setAttribute('data-panel', 'data');
    dataPanel.className = 'active';
    while (tabList.nextSibling) dataPanel.appendChild(tabList.nextSibling);

    var stylePanel = document.createElement('div');
    stylePanel.setAttribute('data-panel', 'style');
    Array.prototype.slice.call(legacyStyleView.children).forEach(function(child){
      if (child.classList.contains('popup_header') || child.classList.contains('view-tabs')) return;
      stylePanel.appendChild(child);
    });

    scroller.appendChild(dataPanel);
    scroller.appendChild(stylePanel);
    legacyStyleView.remove();
  }

  function flattenChartSections(){
    document.querySelectorAll('.view-tabs').forEach(function(tabList){
      var tabs = Array.prototype.slice.call(tabList.querySelectorAll('.view-tab[data-target]'));
      if (!tabs.length) return;

      var labels = {};
      tabs.forEach(function(tab){
        labels[tab.getAttribute('data-target')] = tab.textContent.trim();
      });

      var parent = tabList.parentNode;
      var anchor = tabList;
      ['data', 'style'].forEach(function(target){
        var panel = parent.querySelector('[data-panel="' + target + '"]');
        if (!panel) return;

        panel.classList.add('active', 'view-section');
        if (!panel.querySelector('.view-section-title')) {
          var heading = document.createElement('h2');
          heading.className = 'view-section-title';
          heading.textContent = labels[target] || (target === 'data' ? '数据' : '样式');
          panel.insertBefore(heading, panel.firstChild);
        }
        parent.insertBefore(panel, anchor.nextSibling);
        anchor = panel;
      });

      tabList.remove();
    });
  }

  function activateTabs(rootSelector, tabSelector, panelAttribute){
    document.querySelectorAll(rootSelector).forEach(function(root){
      var tabs = Array.prototype.slice.call(root.querySelectorAll(tabSelector));
      tabs.forEach(function(tab, index){
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
        tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
        tab.addEventListener('keydown', function(event){
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          var next = event.key === 'ArrowRight' ? index + 1 : index - 1;
          tabs[(next + tabs.length) % tabs.length].focus();
          tabs[(next + tabs.length) % tabs.length].click();
        });
        tab.addEventListener('click', function(){
          var target = tab.getAttribute('data-target');
          tabs.forEach(function(item){
            var active = item === tab;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', active ? 'true' : 'false');
            item.tabIndex = active ? 0 : -1;
          });
          if (target) {
            document.querySelectorAll('[' + panelAttribute + ']').forEach(function(panel){
              panel.classList.toggle('active', panel.getAttribute(panelAttribute) === target);
            });
          }
          document.dispatchEvent(new CustomEvent('xchart:tabchange', { detail: { target: target } }));
        });
      });
      root.setAttribute('role', 'tablist');
    });
  }

  function connectLabels(){
    var counter = 0;
    document.querySelectorAll('.settings_input').forEach(function(field){
      var caption = field.querySelector(':scope > p');
      var control = field.querySelector('input:not([type="hidden"]), select, textarea, button');
      if (!caption || !control) return;
      if (!control.id) control.id = 'xchart-field-' + (++counter);
      var label = document.createElement('label');
      Array.prototype.slice.call(caption.attributes).forEach(function(attr){ label.setAttribute(attr.name, attr.value); });
      label.className = (label.className ? label.className + ' ' : '') + 'field-label';
      label.htmlFor = control.id;
      label.innerHTML = caption.innerHTML;
      caption.parentNode.replaceChild(label, caption);
    });
  }

  function enhanceActions(){
    document.querySelectorAll('span.link, div.link, .close_alert').forEach(function(el){
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      el.addEventListener('keydown', function(event){
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          el.click();
        }
      });
    });
    document.querySelectorAll('.close_alert').forEach(function(el){ el.setAttribute('aria-label', '关闭提示'); });
    document.querySelectorAll('.alert').forEach(function(el){ el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); });
  }

  function enhanceSegmentedControls(){
    document.querySelectorAll('.button_group').forEach(function(group){
      var items = Array.prototype.slice.call(group.querySelectorAll('.radio'));
      group.setAttribute('role', 'tablist');
      items.forEach(function(item, index){
        item.setAttribute('role', 'tab');
        item.setAttribute('aria-selected', item.classList.contains('active') ? 'true' : 'false');
        item.tabIndex = item.classList.contains('active') ? 0 : -1;
        item.addEventListener('click', function(){
          items.forEach(function(other){
            var active = other === item;
            other.setAttribute('aria-selected', active ? 'true' : 'false');
            other.tabIndex = active ? 0 : -1;
          });
        });
        item.addEventListener('keydown', function(event){
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            item.click();
            return;
          }
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          var next = event.key === 'ArrowRight' ? index + 1 : index - 1;
          var target = items[(next + items.length) % items.length];
          target.focus();
          target.click();
        });
      });
    });
  }

  function enhanceNumbers(){
    function percent(value){ return Math.round(value * 100) + '%'; }
    var definitions = (window.XChartFormSchema && window.XChartFormSchema.fields) || {};
    var refreshers = [];
    Object.keys(definitions).forEach(function(name){
      var conf = definitions[name];
      if (conf.component !== 'range') return;
      document.querySelectorAll('input[name="' + name + '"]').forEach(function(input){
        input.type = 'range';
        input.min = conf.min;
        input.max = conf.max;
        input.step = conf.step;
        var wrapper = document.createElement('div');
        wrapper.className = 'range-field';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        var output = document.createElement('output');
        output.className = 'range-value';
        wrapper.appendChild(output);
        function update(){
          output.value = conf.unit === '%' ? percent(Number(input.value)) : String(input.value);
          output.textContent = output.value;
        }
        input.addEventListener('input', update);
        input.addEventListener('change', update);
        refreshers.push(update);
        update();
      });
    });
    Object.keys(definitions).forEach(function(name){
      var conf = definitions[name];
      if (conf.component !== 'number') return;
      document.querySelectorAll('input[name="' + name + '"]').forEach(function(input){
        if (conf.min != null) input.min = conf.min;
        if (conf.max != null) input.max = conf.max;
        if (conf.step != null) input.step = conf.step;
      });
    });
    document.addEventListener('xchart:refresh-controls', function(){
      refreshers.forEach(function(refresh){ refresh(); });
    });
  }

  function enhanceColorRows(){
    var container = document.getElementById('colorContainer');
    if (!container) return;
    if (container.dataset.colorEditor === 'managed') return;
    var colorInput = document.getElementById('colorInput');
    var colorSection = container.closest('.form-element');
    var colorHeader = colorSection && colorSection.querySelector('.complex_title');

    if (colorSection && colorHeader && colorInput) {
      colorSection.classList.add('inspector-color-section');
      colorInput.setAttribute('aria-label', '添加 HEX 颜色');

      var actions = document.createElement('span');
      actions.className = 'inspector-color-actions';
      var reset = colorHeader.querySelector('.clear_all');
      if (reset) {
        reset.classList.add('inspector-color-reset');
        reset.setAttribute('aria-label', '恢复默认颜色');
        reset.setAttribute('title', '恢复默认颜色');
        actions.appendChild(reset);
      }

      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'inspector-color-add';
      add.setAttribute('aria-label', '添加颜色');
      add.setAttribute('title', '添加颜色');
      actions.appendChild(add);
      colorHeader.appendChild(actions);

      add.addEventListener('click', function(){
        var open = !colorSection.classList.contains('adding-color');
        colorSection.classList.toggle('adding-color', open);
        add.setAttribute('aria-expanded', String(open));
        if (open) colorInput.focus();
      });
      colorInput.addEventListener('keydown', function(event){
        if (event.key !== 'Escape') return;
        colorSection.classList.remove('adding-color');
        add.setAttribute('aria-expanded', 'false');
        add.focus();
      });
    }

    function normalizeHex(value){
      var raw = String(value || '').trim().replace(/^#/, '').replace(/[^0-9a-f]/gi, '').slice(0, 6);
      return raw.toUpperCase();
    }

    function refreshPreview(){
      document.dispatchEvent(new CustomEvent('preview:update'));
      if (window.PreviewEngine && typeof window.PreviewEngine.update === 'function') {
        window.PreviewEngine.update();
      }
    }

    function enhance(item){
      if (!item || item.dataset.inspectorColorRow === 'true') return;
      var value = normalizeHex(item.getAttribute('title'));
      if (value.length !== 6) return;

      item.dataset.inspectorColorRow = 'true';
      item.classList.add('inspector-color-row');
      if (container.getAttribute('DropObj') !== null) {
        item.setAttribute('DragObj', container.getAttribute('DropObj'));
      }
      item.style.setProperty('--swatch-color', '#' + value);
      item.style.backgroundColor = 'transparent';
      item.innerHTML =
        '<span class="inspector-color-swatch" aria-hidden="true"></span>' +
        '<label class="inspector-color-value"><span aria-hidden="true">#</span>' +
          '<input class="inspector-color-input" value="' + value + '" maxlength="6" aria-label="HEX 颜色">' +
        '</label>' +
        '<button type="button" class="inspector-color-delete" title="删除颜色" aria-label="删除颜色">×</button>';

      var input = item.querySelector('.inspector-color-input');
      ['mousedown', 'dblclick'].forEach(function(eventName){
        input.addEventListener(eventName, function(event){ event.stopPropagation(); });
      });
      input.addEventListener('input', function(){
        var normalized = normalizeHex(input.value);
        if (input.value !== normalized) input.value = normalized;
        var valid = normalized.length === 6;
        item.classList.toggle('invalid', !valid);
        if (!valid) return;
        var color = '#' + normalized;
        item.setAttribute('title', color);
        item.style.setProperty('--swatch-color', color);
        refreshPreview();
      });
      input.addEventListener('change', function(){
        var normalized = normalizeHex(input.value);
        if (normalized.length === 6) return;
        var fallback = normalizeHex(item.getAttribute('title')) || '0A84FF';
        input.value = fallback;
        item.classList.remove('invalid');
      });
      item.querySelector('.inspector-color-delete').addEventListener('click', function(event){
        event.stopPropagation();
        var chart = window.activeChart || (window.chartConfig && window.chartConfig.data && window.chartConfig.data.chartName);
        var minimum = chart === 'candlestickChart' ? 2 : 1;
        if (container.querySelectorAll('.color_item').length <= minimum) {
          if (typeof window.showAlert === 'function') window.showAlert(chart === 'candlestickChart' ? '蜡烛图至少需要上涨色和下跌色' : '至少保留一种图表颜色');
          return;
        }
        item.remove();
        refreshPreview();
      });
    }

    function enhanceAll(){
      Array.prototype.slice.call(container.querySelectorAll('.color_item')).forEach(enhance);
    }

    enhanceAll();
    new MutationObserver(enhanceAll).observe(container, { childList: true });
  }

  function organizeInspectorFields(){
    var schema = window.XChartFormSchema;

    document.querySelectorAll('.right-panel .settings_input_item').forEach(function(field){
      var control = field.querySelector('input, select, textarea');
      if (!control || field.classList.contains('area-style-picker')) return;

      var definition = schema && schema.fields[field.id];
      if (definition) {
        field.dataset.fieldComponent = definition.component || control.type || control.tagName.toLowerCase();
        field.dataset.fieldGroup = definition.group || '';
        field.dataset.fieldTier = definition.tier || 'basic';
        field.classList.toggle('inspector-wide-field', definition.layout === 'wide');
        if (definition.min != null) control.min = definition.min;
        if (definition.max != null) control.max = definition.max;
        if (definition.step != null) control.step = definition.step;
      } else if (control.tagName === 'TEXTAREA') {
        field.classList.add('inspector-wide-field');
      }

      if (control.type === 'checkbox') {
        Array.prototype.slice.call(control.closest('.checkbox').childNodes).forEach(function(node){
          if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
        });
      }

    });
  }

  function handleEscape(){
    document.addEventListener('keydown', function(event){
      if (event.key !== 'Escape') return;
      var settings = document.querySelector('.settings');
      if (settings && getComputedStyle(settings).display !== 'none') {
        var settingsClose = settings.querySelector('.close');
        if (settingsClose) settingsClose.click();
        return;
      }
      var activeOverlay = document.querySelector('.linkHTTP.active');
      if (activeOverlay) {
        var overlayClose = activeOverlay.querySelector('.closeHTTP');
        if (overlayClose) overlayClose.click();
        return;
      }
      var editView = document.querySelector('.edit-view');
      if (editView && getComputedStyle(editView).display !== 'none') {
        var back = document.getElementById('cancelEdit') || document.getElementById('backToList');
        if (back) back.click();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    identifyPage();
    organizeChartNavigation();
    unifyCreateView();
    flattenChartSections();
    enhanceFontSelectors();
    connectLabels();
    enhanceActions();
    enhanceSegmentedControls();
    enhanceNumbers();
    organizeInspectorFields();
    enhanceColorRows();
    activateTabs('.template-tabs', '.template-tab', 'data-template-pane');
    handleEscape();
  });
})();
