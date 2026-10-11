/* X-Chart shared, platform-independent chart compiler.
 * Input: chart type, raw data, settings and viewport.
 * Output: a serializable Scene consumed by Canvas and Sketch adapters.
 */
var XChartCore = (function () {
  'use strict';

  var VERSION = '1.1.4';
  var DEFAULT_COLORS = (typeof XChartDefaultTemplate !== 'undefined' && XChartDefaultTemplate.palette) ? XChartDefaultTemplate.palette.slice() : ['#0a84ff', '#30b0c7', '#ff9f0a', '#ff375f', '#5e5ce6', '#34c759'];
  var CARTESIAN = {
    lineChart: true, areaChart: true, stackedAreaChart: true,
    percentStackedAreaChart: true, streamGraph: true,
    verticalBarChart: true, horizontalBarChart: true,
    percentStackedVerticalBarChart: true, percentStackedHorizontalBarChart: true,
    groupedBarChart: true, groupedHorizontalBarChart: true,
    histogram: true, stackedHistogram: true, comboChart: true,
    dualBarChart: true, dualLineBarChart: true,
    scatterPlot: true, candlestickChart: true
  };

  function isArray(value) { return Array.isArray(value); }
  function finite(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function copy(value) {
    if (isArray(value)) return value.map(copy);
    if (value && typeof value === 'object') {
      var output = {};
      Object.keys(value).forEach(function (key) { output[key] = copy(value[key]); });
      return output;
    }
    return value;
  }
  function at(object, path, fallback) {
    var current = object;
    for (var index = 0; index < path.length; index += 1) {
      if (!current || current[path[index]] == null) return fallback;
      current = current[path[index]];
    }
    return current;
  }
  function formatNumber(value) {
    if (!isFinite(value)) return '';
    return String(Math.round(value * 100) / 100);
  }
  function colorWithAlpha(color, opacity) {
    if (typeof color !== 'string') return color;
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      var alpha = Math.round(clamp(opacity, 0, 1) * 255).toString(16);
      return color + (alpha.length < 2 ? '0' + alpha : alpha);
    }
    return color;
  }

  function normalizeType(type) {
    var aliases = { groupedVerticalBarChart: 'groupedBarChart' };
    return aliases[type] || type || 'lineChart';
  }

  function isPercentStacked(type) {
    return type === 'percentStackedAreaChart' || type === 'percentStackedVerticalBarChart' || type === 'percentStackedHorizontalBarChart';
  }

  function normalizeData(input, options) {
    options = options || {};
    var source = input && isArray(input.table) ? input.table : input;
    if (!isArray(source)) throw new Error('Chart data must be a two-dimensional array');
    var rows = source.map(function (row) {
      if (!isArray(row)) throw new Error('Every chart series must be an array');
      return row.map(function (value) {
        var number = Number(value);
        if (!isFinite(number)) throw new Error('Chart data contains a non-numeric value');
        return number;
      });
    }).filter(function (row) { return row.length > 0; });
    if (!rows.length) throw new Error('Chart data is empty');
    var columns = rows[0].length;
    rows.forEach(function (row) {
      if (row.length !== columns) throw new Error('Chart series must have the same number of values');
    });
    var categories = copy(options.categories || (input && input.header) || []);
    while (categories.length < columns) categories.push('第 ' + (categories.length + 1) + ' 项');
    categories = categories.slice(0, columns).map(function (value) { return String(value); });
    var names = copy(options.seriesNames || (input && input.seriesNames) || []);
    while (names.length < rows.length) names.push('系列 ' + (names.length + 1));
    return { table: rows, rows: rows.length, columns: columns, categories: categories, seriesNames: names };
  }

  function normalizeConfig(settings, type) {
    settings = settings || {};
    var labels = settings.labels || {};
    var grid = settings.grid || {};
    var separate = labels.separateAxisStyles === true;
    var commonLabelType = finite(labels.type, 1);
    function axis(name) {
      var stored = labels[name] || {};
      return {
        labels: separate ? stored.labels !== false : commonLabelType !== 0,
        line: separate ? stored.line !== false : commonLabelType !== 0,
        ticks: separate ? stored.ticks !== false : commonLabelType !== 0,
        fontSize: finite(stored.fontSize, finite(labels.fontSize, 12)),
        color: stored.color || labels.color || '#525252',
        lineColor: stored.lineColor || '#8d8d8d',
        min: stored.min,
        max: stored.max
      };
    }
    var colors = at(settings, ['colors', type], null);
    if (!isArray(colors) || !colors.length) colors = at(settings, ['colors', 'common'], null);
    if (!isArray(colors) || !colors.length) colors = settings.colors;
    if (!isArray(colors) || !colors.length) colors = DEFAULT_COLORS;
    var chartSettings = settings[type] || {};
    var combo = settings.combo || {};
    var groupedVertical = settings.groupedBarChart || {};
    var groupedHorizontal = settings.groupedHorizontalBarChart || {};
    var stackedVertical = settings.verticalBarChart || {};
    var stackedHorizontal = settings.horizontalBarChart || {};
    var comboType = type === 'comboChart' || type === 'dualBarChart' || type === 'dualLineBarChart';
    var area = settings.areaChart || {};
    var line = settings.lineChart || {};
    var progress = settings.progressChart || {};
    var histogram = settings.histogram || {};
    return {
      colors: colors.slice(),
      fontName: labels.fontName || 'IBM Plex Sans',
      labels: { type: commonLabelType, xAxis: axis('xAxis'), yAxis: axis('yAxis') },
      grid: {
        type: finite(grid.type, 1),
        color: grid.color || '#e0e0e0',
        lineWidth: finite(grid.lineWidth, 1),
        yAxisSegments: finite(grid.yAxisSegments, 0)
      },
      beginAtZero: finite(settings.beginAtZero, 0) === 0,
      lineType: finite(settings.lineType, finite(line.lineType, 0)),
      lineWidth: finite(line.lineWidth, finite(settings.lineWidth, 2)),
      // 0 = hidden, 1 = filled, 2 = hollow (white fill, series-color stroke).
      dotType: finite(line.dotType, finite(settings.dotType, 1)),
      dotDiameter: finite(line.dotDiameter, finite(settings.dotDiameter, 8)),
      areaFillStyle: area.fillStyle || settings.areaFillStyle || 'solid',
      areaOpacity: finite(area.opacity, finite(settings.areaOpacity, 0.4)),
      areaLineWidth: finite(area.lineWidth, finite(settings.areaLineWidth, 2)),
      barMargin: type === 'histogram' || type === 'stackedHistogram' ? 0 : finite(chartSettings.margin, finite(
        comboType ? finite(combo.margin, finite(groupedVertical.margin, settings.groupMarginV)) :
        type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart' ? settings.marginH :
        type === 'groupedBarChart' ? settings.groupMarginV :
        type === 'groupedHorizontalBarChart' ? settings.groupMarginH : settings.marginV,
        0.4
      )),
      barRound: finite(chartSettings.roundTop, finite(
        comboType ? finite(combo.roundTop, finite(groupedVertical.roundTop, settings.groupRoundTopV)) :
        type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart' ? settings.roundTopH :
        type === 'groupedBarChart' ? settings.groupRoundTopV :
        type === 'groupedHorizontalBarChart' ? settings.groupRoundTopH : settings.roundTopV,
        0
      )),
      barInnerGap: finite(chartSettings.innerGap, finite(
        comboType ? finite(combo.innerGap, finite(groupedVertical.innerGap, settings.groupInnerGapV)) :
        type === 'groupedHorizontalBarChart' ? finite(groupedHorizontal.innerGap, settings.groupInnerGapH) :
        finite(groupedVertical.innerGap, settings.groupInnerGapV),
        0
      )),
      stackGap: finite(chartSettings.stackGap, finite(
        type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart' ? finite(stackedHorizontal.stackGap, settings.stackGapH) :
        finite(stackedVertical.stackGap, settings.stackGapV),
        0
      )),
      sorting: finite(settings.sorting, 0),
      circleType: finite(settings.typeOfCircle, 0),
      segmentGap: clamp(finite(settings.segmentGap, 0), 0, 20),
      donutThickness: finite(at(settings, ['donutChart', 'thicknessOfDonut'], settings.thicknessOfDonut), 30),
      progressThickness: finite(progress.thicknessOfProgress, finite(settings.thicknessOfProgress, 10)),
      progressBackground: isArray(progress.backgroundColor) ? progress.backgroundColor[0] : (progress.backgroundColor || settings.progressBgColor || '#e0e0e0'),
      lineEnd: finite(progress.endOfLine, finite(settings.endOfLine, 0)),
      sparkLineWidth: finite(at(settings, ['sparkline', 'lineWidth'], settings.sparkLineWidth), 1),
      sparkDotDiameter: finite(at(settings, ['sparkline', 'dotDiameter'], settings.sparkDotDiameter), 4),
      scatterDotDiameter: finite(at(settings, ['scatterPlot', 'dotDiameter'], settings.scatterDotDiameter), 8),
      candleMargin: finite(at(settings, ['candlestickChart', 'margin'], settings.candleMargin), 0.4),
      candleColors: copy(at(settings, ['colors', 'candlestickChart'], type === 'candlestickChart' ? colors : ['#da1e28', '#198038'])),
      binMode: histogram.binMode || settings.binMode || 'auto',
      binCount: finite(histogram.binCount, finite(settings.binCount, 8)),
      binWidth: finite(histogram.binWidth, finite(settings.binWidth, 0)),
      seriesStyles: copy(settings.seriesStyles || at(settings, ['combo', 'seriesStyles'], [])),
      axisAssignment: at(settings, ['combo', 'axisAssignment'], settings.axisAssignment) || 'auto',
      radarLevels: clamp(Math.round(finite(at(settings, ['radarChart', 'levels'], settings.radarLevels), 4)), 1, 12),
      radarFillOpacity: clamp(finite(at(settings, ['radarChart', 'fillOpacity'], settings.radarFillOpacity), 0.16), 0, 1),
      radarGridShape: at(settings, ['radarChart', 'grid'], settings.radarGridShape) || 'polygon',
      funnelGap: clamp(finite(at(settings, ['funnelChart', 'gap'], settings.funnelGap), 6), 0, 40),
      funnelShape: at(settings, ['funnelChart', 'shape'], settings.funnelShape) || 'standard',
      funnelLabelPosition: at(settings, ['funnelChart', 'labelPosition'], settings.labelPosition) || 'inside',
      heatmapCellGap: clamp(finite(at(settings, ['heatmap', 'cellGap'], settings.cellGap), 2), 0, 20),
      heatmapShowValues: at(settings, ['heatmap', 'showValues'], settings.showValues) === true,
      heatmapColorScale: at(settings, ['heatmap', 'colorScale'], settings.colorScale) || 'blue',
      treemapTileGap: clamp(finite(at(settings, ['treemap', 'tileGap'], settings.tileGap), 2), 0, 20)
    };
  }

  function histogram(data, config, aggregate) {
    var values = [];
    data.table.forEach(function (row) { row.forEach(function (value) { values.push(value); }); });
    var min = Math.min.apply(Math, values);
    var max = Math.max.apply(Math, values);
    var count = Math.max(1, Math.round(config.binCount || 8));
    var width = config.binWidth > 0 ? config.binWidth : (max - min || 1) / count;
    if (config.binMode === 'width' && config.binWidth > 0) count = Math.max(1, Math.ceil((max - min || width) / width));
    var rows = data.table.map(function (row) {
      var bins = [];
      for (var index = 0; index < count; index += 1) bins.push(0);
      row.forEach(function (value) {
        var bin = Math.floor((value - min) / width);
        bins[clamp(bin, 0, count - 1)] += 1;
      });
      return bins;
    });
    if (aggregate) {
      var combined = [];
      rows.forEach(function (row) { row.forEach(function (value, index) { combined[index] = (combined[index] || 0) + value; }); });
      rows = [combined];
    }
    var categories = [];
    for (var i = 0; i < count; i += 1) categories.push(formatNumber(min + (i + 0.5) * width));
    return { table: rows, rows: rows.length, columns: count, categories: categories, seriesNames: aggregate ? ['频数'] : data.seriesNames, histogram: true, histogramAggregated: aggregate === true, binWidth: width, binMin: min };
  }

  function cumulative(table) {
    var output = table.map(function (row) { return row.slice(); });
    for (var row = 1; row < output.length; row += 1) {
      for (var column = 0; column < output[row].length; column += 1) output[row][column] += output[row - 1][column];
    }
    return output;
  }

  function barBaseline(scaleValue) {
    if (scaleValue.min > 0) return scaleValue.min;
    if (scaleValue.max < 0) return scaleValue.max;
    return 0;
  }

  function prepareData(type, data, config) {
    if (type === 'histogram' || type === 'stackedHistogram') data = histogram(data, config, type === 'histogram');
    var nonNegative = type === 'stackedAreaChart' || isPercentStacked(type) ||
      type === 'streamGraph' || type === 'verticalBarChart' || type === 'horizontalBarChart' ||
      type === 'histogram' || type === 'stackedHistogram';
    if (nonNegative) data.table.forEach(function (row) { row.forEach(function (value) {
      if (value < 0) throw new Error('当前堆叠图不支持负数');
    }); });
    if (isPercentStacked(type)) {
      var normalized = data.table.map(function () { return []; });
      for (var column = 0; column < data.columns; column += 1) {
        var total = 0;
        for (var row = 0; row < data.rows; row += 1) total += data.table[row][column];
        if (total <= 0) throw new Error('百分比堆叠图的每个数据点合计必须大于 0');
        for (var r = 0; r < data.rows; r += 1) normalized[r][column] = data.table[r][column] / total * 100;
      }
      data.table = normalized;
    }
    if (type === 'stackedAreaChart' || isPercentStacked(type) || type === 'streamGraph' || type === 'verticalBarChart' || type === 'horizontalBarChart' || type === 'stackedHistogram') {
      data.stackedTable = cumulative(data.table);
    }
    return data;
  }

  function niceStep(range, target) {
    if (!isFinite(range) || range <= 0) return 1;
    var raw = range / Math.max(1, target);
    var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var fraction = raw / power;
    var nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * power;
  }

  function scale(values, length, beginAtZero, segments, explicitMin, explicitMax) {
    var min = Math.min.apply(Math, values);
    var max = Math.max.apply(Math, values);
    if (beginAtZero) { if (min > 0) min = 0; if (max < 0) max = 0; }
    if (isFinite(Number(explicitMin))) min = Number(explicitMin);
    if (isFinite(Number(explicitMax))) max = Number(explicitMax);
    if (min === max) { min -= 1; max += 1; }
    var count = segments > 0 ? Math.max(1, Math.round(segments)) : Math.max(2, Math.floor(length / 40));
    var step = segments > 0 ? (max - min) / count : niceStep(max - min, count);
    var niceMin = isFinite(Number(explicitMin)) ? min : Math.floor(min / step) * step;
    var niceMax = isFinite(Number(explicitMax)) ? max : Math.ceil(max / step) * step;
    count = Math.max(1, Math.round((niceMax - niceMin) / step));
    niceMax = niceMin + step * count;
    return { min: niceMin, max: niceMax, step: step, count: count };
  }

  function dataRange(type, data, stacked) {
    var table = stacked ? (data.stackedTable || cumulative(data.table)) : data.table;
    var flat = [];
    table.forEach(function (row) { row.forEach(function (value) { flat.push(value); }); });
    if (isPercentStacked(type)) return { values: [0, 100], table: table };
    return { values: flat.concat([0]), table: table };
  }

  function estimatedTextWidth(value, fontSize) {
    return Math.ceil(String(value == null ? '' : value).length * fontSize * 0.6);
  }

  function axisLabelWidth(scaleValue, config, percent) {
    var maxWidth = 0;
    for (var index = 0; index <= scaleValue.count; index += 1) {
      var label = formatNumber(scaleValue.min + scaleValue.step * index) + (percent ? '%' : '');
      maxWidth = Math.max(maxWidth, estimatedTextWidth(label, config.labels.yAxis.fontSize));
    }
    return Math.max(32, 10 + maxWidth);
  }

  function categoryEdgeInset(data, config) {
    if (!data || !data.categories || !data.categories.length) return 2;
    var first = data.categories[0];
    var last = data.categories[data.categories.length - 1];
    var edgeWidth = Math.max(estimatedTextWidth(first, config.labels.xAxis.fontSize), estimatedTextWidth(last, config.labels.xAxis.fontSize));
    return Math.max(2, Math.ceil(edgeWidth / 2) + 2);
  }

  function layout(width, height, type, config, scales, data) {
    var box = { x: 0, y: 0, width: width, height: height };
    if (!CARTESIAN[type]) return { viewport: copy(box), plot: copy(box) };
    var horizontal = type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart' || type === 'groupedHorizontalBarChart';
    var xVisible = config.labels.type === 1 || config.labels.type === 3;
    var yVisible = config.labels.type === 1 || config.labels.type === 2;
    var edgeInset = xVisible && !horizontal ? categoryEdgeInset(data, config) : 2;
    var left = yVisible ? Math.max(axisLabelWidth(horizontal ? scales.x : scales.y, config, isPercentStacked(type)), edgeInset) : edgeInset;
    var bottom = xVisible ? 10 + config.labels.xAxis.fontSize * 1.5 : 0;
    var top = yVisible ? config.labels.yAxis.fontSize / 2 : 0;
    var right = edgeInset;
    var dualAxis = type === 'dualBarChart' || type === 'dualLineBarChart';
    var distinctRightAxis = scales.rightY && (scales.rightY.min !== scales.y.min || scales.rightY.max !== scales.y.max);
    if (dualAxis || (type === 'comboChart' && distinctRightAxis)) {
      right = Math.max(right, yVisible ? axisLabelWidth(scales.rightY, config, false) + 8 : 8);
    }
    if (type === 'streamGraph') { left = Math.max(yVisible ? 30 : 0, edgeInset); right = Math.max(yVisible ? 30 : 0, edgeInset); top = 0; }
    box.x = left;
    box.y = top;
    box.width = Math.max(1, width - left - right);
    box.height = Math.max(1, height - top - bottom);
    return { viewport: { x: 0, y: 0, width: width, height: height }, plot: box };
  }

  function pathNode(commands, style, name, meta) { return { kind: 'path', commands: commands, style: style || {}, name: name || 'Path', meta: meta || null }; }
  function rectNode(x, y, width, height, radius, style, name, meta) { return { kind: 'rect', x: x, y: y, width: width, height: height, radius: radius || 0, style: style || {}, name: name || 'Rectangle', meta: meta || null }; }
  function circleNode(cx, cy, radius, style, name, meta) { return { kind: 'circle', cx: cx, cy: cy, radius: radius, style: style || {}, name: name || 'Circle', meta: meta || null }; }
  function textNode(x, y, text, style, name) { return { kind: 'text', x: x, y: y, text: String(text), style: style || {}, name: name || 'Label' }; }
  function arcNode(cx, cy, outerRadius, innerRadius, start, end, style, name, meta) { return { kind: 'arc', cx: cx, cy: cy, outerRadius: outerRadius, innerRadius: innerRadius || 0, startAngle: start, endAngle: end, style: style || {}, name: name || 'Arc', meta: meta || null }; }
  function move(x, y) { return { op: 'M', x: x, y: y }; }
  function lineTo(x, y) { return { op: 'L', x: x, y: y }; }
  function curveTo(c1x, c1y, c2x, c2y, x, y) { return { op: 'C', c1x: c1x, c1y: c1y, c2x: c2x, c2y: c2y, x: x, y: y }; }
  function close() { return { op: 'Z' }; }

  function roundedBarNode(x, y, width, height, radius, roundedEnd, style, name, meta) {
    var r = Math.max(0, Math.min(radius || 0, width / 2, height / 2));
    if (!r || !roundedEnd) return rectNode(x, y, width, height, 0, style, name, meta);
    var tl = roundedEnd === 'top' || roundedEnd === 'left';
    var tr = roundedEnd === 'top' || roundedEnd === 'right';
    var br = roundedEnd === 'bottom' || roundedEnd === 'right';
    var bl = roundedEnd === 'bottom' || roundedEnd === 'left';
    var k = 0.5522847498;
    var commands = [move(x + (tl ? r : 0), y)];
    commands.push(lineTo(x + width - (tr ? r : 0), y));
    if (tr) commands.push(curveTo(x + width - r + r * k, y, x + width, y + r - r * k, x + width, y + r));
    else commands.push(lineTo(x + width, y));
    commands.push(lineTo(x + width, y + height - (br ? r : 0)));
    if (br) commands.push(curveTo(x + width, y + height - r + r * k, x + width - r + r * k, y + height, x + width - r, y + height));
    else commands.push(lineTo(x + width, y + height));
    commands.push(lineTo(x + (bl ? r : 0), y + height));
    if (bl) commands.push(curveTo(x + r - r * k, y + height, x, y + height - r + r * k, x, y + height - r));
    else commands.push(lineTo(x, y + height));
    commands.push(lineTo(x, y + (tl ? r : 0)));
    if (tl) commands.push(curveTo(x, y + r - r * k, x + r - r * k, y, x + r, y));
    else commands.push(lineTo(x, y));
    commands.push(close());
    return pathNode(commands, style, name, meta);
  }

  function addAxes(scene, type, data, config, scales, horizontal, distributed) {
    var box = scene.layout.plot;
    var layers = scene.layers;
    var grid = config.grid;
    var xAxis = config.labels.xAxis;
    var yAxis = config.labels.yAxis;
    var numeric = horizontal ? scales.x : scales.y;
    var xLabels = config.labels.type === 1 || config.labels.type === 3;
    var yLabels = config.labels.type === 1 || config.labels.type === 2;
    var gridStyle = { stroke: grid.color, strokeWidth: grid.lineWidth, fill: null };
    var axisStyleX = { stroke: xAxis.lineColor, strokeWidth: 1, fill: null };
    var axisStyleY = { stroke: yAxis.lineColor, strokeWidth: 1, fill: null };
    if (grid.lineWidth > 0 && (grid.type === 1 || grid.type === 2)) {
      for (var tick = 0; tick <= numeric.count; tick += 1) {
        if (horizontal) {
          var gx = box.x + box.width * tick / numeric.count;
          layers.push(pathNode([move(gx, box.y), lineTo(gx, box.y + box.height)], gridStyle, 'Grid X ' + tick));
        } else if (type !== 'streamGraph') {
          var gy = box.y + box.height - box.height * tick / numeric.count;
          layers.push(pathNode([move(box.x, gy), lineTo(box.x + box.width, gy)], gridStyle, 'Grid Y ' + tick));
        }
      }
    }
    if (grid.lineWidth > 0 && (grid.type === 1 || grid.type === 3)) {
      var boundaryCount = distributed || horizontal ? data.columns : Math.max(1, data.columns - 1);
      for (var boundary = 0; boundary <= boundaryCount; boundary += 1) {
        var bx = box.x + box.width * boundary / boundaryCount;
        if (horizontal) {
          var by = box.y + box.height * boundary / Math.max(1, data.columns);
          layers.push(pathNode([move(box.x, by), lineTo(box.x + box.width, by)], gridStyle, 'Grid Category ' + boundary));
        } else {
          layers.push(pathNode([move(bx, box.y), lineTo(bx, box.y + box.height)], gridStyle, 'Grid Category ' + boundary));
        }
      }
    }
    if (yAxis.line) layers.push(pathNode([move(box.x, box.y), lineTo(box.x, box.y + box.height)], axisStyleY, 'Y Axis'));
    if (xAxis.line) layers.push(pathNode([move(box.x, box.y + box.height), lineTo(box.x + box.width, box.y + box.height)], axisStyleX, 'X Axis'));
    for (var numberIndex = 0; numberIndex <= numeric.count; numberIndex += 1) {
      var label = formatNumber(numeric.min + numeric.step * numberIndex) + (isPercentStacked(type) ? '%' : '');
      if (horizontal) {
        var nx = box.x + box.width * numberIndex / numeric.count;
        if (xAxis.ticks) layers.push(pathNode([move(nx, box.y + box.height), lineTo(nx, box.y + box.height + 3)], axisStyleX, 'X Tick ' + numberIndex));
        if (xLabels) layers.push(textNode(nx, box.y + box.height + 8, label, { fill: xAxis.color, fontSize: xAxis.fontSize, fontName: config.fontName, align: 'center', baseline: 'top' }, 'X Label ' + numberIndex));
      } else {
        var ny = box.y + box.height - box.height * numberIndex / numeric.count;
        if (yAxis.ticks) layers.push(pathNode([move(box.x - 3, ny), lineTo(box.x, ny)], axisStyleY, 'Y Tick ' + numberIndex));
        if (yLabels) layers.push(textNode(box.x - 6, ny, label, { fill: yAxis.color, fontSize: yAxis.fontSize, fontName: config.fontName, align: 'right', baseline: 'middle' }, 'Y Label ' + numberIndex));
      }
    }
    if (xLabels) {
      for (var category = 0; category < data.columns; category += 1) {
        if (horizontal) {
          var cy = box.y + box.height * (category + 0.5) / data.columns;
          if (yAxis.ticks) layers.push(pathNode([move(box.x - 3, cy), lineTo(box.x, cy)], axisStyleY, 'Category Tick ' + category));
          layers.push(textNode(box.x - 6, cy, data.categories[category], { fill: yAxis.color, fontSize: yAxis.fontSize, fontName: config.fontName, align: 'right', baseline: 'middle' }, 'Category ' + category));
        } else {
          var denominator = distributed ? data.columns : Math.max(1, data.columns - 1);
          var cx = box.x + box.width * (distributed ? category + 0.5 : category) / denominator;
          if (xAxis.ticks) layers.push(pathNode([move(cx, box.y + box.height), lineTo(cx, box.y + box.height + 3)], axisStyleX, 'Category Tick ' + category));
          layers.push(textNode(cx, box.y + box.height + 8, data.categories[category], { fill: xAxis.color, fontSize: xAxis.fontSize, fontName: config.fontName, align: 'center', baseline: 'top' }, 'Category ' + category));
        }
      }
    }
    var dualAxis = type === 'dualBarChart' || type === 'dualLineBarChart';
    var distinctRightAxis = scales.rightY && (scales.rightY.min !== scales.y.min || scales.rightY.max !== scales.y.max);
    if ((dualAxis || type === 'comboChart' && distinctRightAxis) && scales.rightY) {
      var rightAxis = config.labels.yAxis;
      var rightStyle = { stroke: rightAxis.lineColor, strokeWidth: 1, fill: null };
      if (rightAxis.line) layers.push(pathNode([move(box.x + box.width, box.y), lineTo(box.x + box.width, box.y + box.height)], rightStyle, 'Right Y Axis'));
      if (yLabels) {
        for (var rightTick = 0; rightTick <= scales.rightY.count; rightTick += 1) {
          var rightY = box.y + box.height - box.height * rightTick / scales.rightY.count;
          if (rightAxis.ticks) layers.push(pathNode([move(box.x + box.width, rightY), lineTo(box.x + box.width + 3, rightY)], rightStyle, 'Right Y Tick ' + rightTick));
          layers.push(textNode(box.x + box.width + 8, rightY, formatNumber(scales.rightY.min + scales.rightY.step * rightTick), { fill: rightAxis.color, fontSize: rightAxis.fontSize, fontName: config.fontName, align: 'left', baseline: 'middle' }, 'Right Y Label ' + rightTick));
        }
      }
    }
  }

  function pointCommands(points, lineType) {
    if (!points.length) return [];
    var commands = [move(points[0].x, points[0].y)];
    for (var index = 1; index < points.length; index += 1) {
      var previous = points[index - 1];
      var point = points[index];
      if (lineType === 2) {
        var middle = (previous.x + point.x) / 2;
        commands.push(lineTo(middle, previous.y), lineTo(middle, point.y), lineTo(point.x, point.y));
      } else if (lineType === 0) {
        var distance = (point.x - previous.x) / 2;
        commands.push(curveTo(previous.x + distance, previous.y, point.x - distance, point.y, point.x, point.y));
      } else commands.push(lineTo(point.x, point.y));
    }
    return commands;
  }

  function appendReversedBoundary(commands, points, lineType) {
    var boundary = pointCommands(points.slice().reverse(), lineType);
    boundary.forEach(function (command, index) {
      if (index === 0 && command.op === 'M') {
        commands.push(lineTo(command.x, command.y));
      } else {
        commands.push(command);
      }
    });
  }

  function cartesianPoints(row, box, scaleValue) {
    var step = box.width / Math.max(1, row.length - 1);
    return row.map(function (value, index) {
      return { x: box.x + index * step, y: box.y + box.height - (value - scaleValue.min) / (scaleValue.max - scaleValue.min) * box.height };
    });
  }

  function addLineSeries(scene, data, config, scaleValue, styles) {
    var box = scene.layout.plot;
    data.table.forEach(function (row, series) {
      var style = styles && styles[series] || {};
      var color = style.color || config.colors[series % config.colors.length];
      var points = cartesianPoints(row, box, scaleValue);
      scene.layers.push(pathNode(pointCommands(points, style.lineType == null ? config.lineType : style.lineType), { stroke: color, strokeWidth: finite(style.lineWidth, config.lineWidth), fill: null, lineCap: 'round', lineJoin: 'round' }, data.seriesNames[series], { series: series }));
      if (config.dotType !== 0) points.forEach(function (point, index) {
        var hollow = config.dotType !== 1;
        scene.layers.push(circleNode(point.x, point.y, config.dotDiameter / 2, { fill: hollow ? '#ffffff' : color, stroke: hollow ? color : null, strokeWidth: hollow ? config.lineWidth : 0 }, 'Point ' + (index + 1), { series: series, index: index, value: row[index], label: data.categories[index] }));
      });
    });
  }

  function addAreaSeries(scene, data, config, scaleValue, stacked, stream) {
    var box = scene.layout.plot;
    var outlines = [];
    var table = stacked ? (data.stackedTable || cumulative(data.table)) : data.table.map(function (row) { return row.slice(); });
    if (stream) {
      var top = table[table.length - 1];
      table.forEach(function (row) { row.forEach(function (_, column) { row[column] += (scaleValue.max - top[column]) / 2; }); });
    }
    for (var series = stacked ? table.length - 1 : 0; stacked ? series >= 0 : series < table.length; series += stacked ? -1 : 1) {
      var upper = cartesianPoints(table[series], box, scaleValue);
      var lowerValues = stacked && series > 0 ? table[series - 1] : table[series].map(function () { return Math.max(0, scaleValue.min); });
      if (stream && series === 0) lowerValues = table[series].map(function (_, column) { return (scaleValue.max - table[table.length - 1][column]) / 2; });
      var lower = cartesianPoints(lowerValues, box, scaleValue);
      var commands = pointCommands(upper, config.lineType);
      appendReversedBoundary(commands, lower, config.lineType);
      commands.push(close());
      var color = config.colors[series % config.colors.length];
      // Area fill is a shared visual modifier. Keep the scene explicit so Canvas
      // and Sketch render the same choice instead of each inferring it locally.
      var fillStyle = stream ? 'solid-line' : config.areaFillStyle;
      var style = { fill: null, stroke: null, strokeWidth: 0, lineJoin: 'round' };
      var outlineStyle = null;
      if (fillStyle === 'gradient-line') {
        style.fillGradient = {
          type: 'linear',
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0, color: colorWithAlpha(color, Math.min(config.areaOpacity * 0.1, 0.08)) },
            { offset: 1, color: colorWithAlpha(color, config.areaOpacity) }
          ]
        };
        outlineStyle = { stroke: color, strokeWidth: config.areaLineWidth, fill: null, lineJoin: 'round' };
      } else {
        style.fill = colorWithAlpha(color, config.areaOpacity);
        if (fillStyle === 'solid-line') {
          outlineStyle = { stroke: color, strokeWidth: config.areaLineWidth, fill: null, lineJoin: 'round' };
        }
      }
      scene.layers.push(pathNode(commands, style, data.seriesNames[series], { series: series }));
      // Keep the closed fill path separate from its open upper boundary.
      if (outlineStyle) {
        outlines.push(pathNode(pointCommands(upper, config.lineType), outlineStyle, data.seriesNames[series] + ' Top Border', { series: series, areaOutline: true }));
        if (stream && series === 0) {
          outlines.push(pathNode(pointCommands(lower, config.lineType), outlineStyle, data.seriesNames[series] + ' Bottom Border', { series: series, areaOutline: true, streamBottom: true }));
        }
      }
      upper.forEach(function (point, index) {
        scene.hoverTargets.push(circleNode(point.x, point.y, 10, { fill: color }, data.categories[index], { series: series, index: index, value: data.table[series][index], label: data.categories[index] }));
      });
    }
    Array.prototype.push.apply(scene.layers, outlines);
  }

  function addBars(scene, data, config, scaleValue, horizontal, stacked) {
    var box = scene.layout.plot;
    var table = stacked ? (data.stackedTable || cumulative(data.table)) : data.table;
    var band = (horizontal ? box.height : box.width) / data.columns;
    var margin = band * clamp(config.barMargin, 0, 0.95) / 2;
    var histogram = data.histogram === true;
    var available = band - margin * 2;
    var innerGapRatio = stacked || histogram ? 0 : clamp(config.barInnerGap, 0, 0.95);
    var groupSize = stacked || histogram ? available : available / Math.max(1, data.rows + innerGapRatio * (data.rows - 1));
    var innerGap = groupSize * innerGapRatio;
    var baseline = barBaseline(scaleValue);
    for (var column = 0; column < data.columns; column += 1) {
      for (var series = 0; series < data.rows; series += 1) {
        var value = table[series][column];
        var previous = stacked && series > 0 ? table[series - 1][column] : 0;
        var start = stacked ? previous : baseline;
        var color = config.colors[series % config.colors.length];
        if (horizontal) {
          var x0 = box.x + (start - scaleValue.min) / (scaleValue.max - scaleValue.min) * box.width;
          var x1 = box.x + (value - scaleValue.min) / (scaleValue.max - scaleValue.min) * box.width;
          var barX = Math.min(x0, x1), barWidth = Math.max(0.5, Math.abs(x1 - x0));
          var y = box.y + column * band + margin + (stacked || histogram ? 0 : series * (groupSize + innerGap));
          if (stacked && config.stackGap > 0) {
            var leftInset = series > 0 ? config.stackGap / 2 : 0;
            var rightInset = series < data.rows - 1 ? config.stackGap / 2 : 0;
            var insetScale = Math.min(1, Math.max(0, (barWidth - 0.5) / Math.max(0.5, leftInset + rightInset)));
            leftInset *= insetScale; rightInset *= insetScale;
            barX += leftInset; barWidth = Math.max(0.5, barWidth - leftInset - rightInset);
          }
          var horizontalEnd = x1 >= x0 ? 'right' : 'left';
          var horizontalRound = !stacked || series === data.rows - 1 ? horizontalEnd : null;
          scene.layers.push(roundedBarNode(barX, y, barWidth, groupSize, config.barRound, horizontalRound, { fill: color, stroke: null }, data.seriesNames[series] + ' ' + data.categories[column], { series: series, index: column, value: stacked ? value - previous : value, label: data.categories[column] }));
        } else {
          var y0 = box.y + box.height - (start - scaleValue.min) / (scaleValue.max - scaleValue.min) * box.height;
          var y1 = box.y + box.height - (value - scaleValue.min) / (scaleValue.max - scaleValue.min) * box.height;
          var x = box.x + column * band + margin + (stacked || histogram ? 0 : series * (groupSize + innerGap));
          var barY = Math.min(y0, y1), barHeight = Math.max(0.5, Math.abs(y1 - y0));
          if (stacked && config.stackGap > 0) {
            var topInset = series < data.rows - 1 ? config.stackGap / 2 : 0;
            var bottomInset = series > 0 ? config.stackGap / 2 : 0;
            var verticalInsetScale = Math.min(1, Math.max(0, (barHeight - 0.5) / Math.max(0.5, topInset + bottomInset)));
            topInset *= verticalInsetScale; bottomInset *= verticalInsetScale;
            barY += topInset; barHeight = Math.max(0.5, barHeight - topInset - bottomInset);
          }
          var verticalEnd = y1 <= y0 ? 'top' : 'bottom';
          var verticalRound = !stacked || series === data.rows - 1 ? verticalEnd : null;
          scene.layers.push(roundedBarNode(x, barY, groupSize, barHeight, config.barRound, verticalRound, { fill: color, stroke: null }, data.seriesNames[series] + ' ' + data.categories[column], { series: series, index: column, value: stacked ? value - previous : value, label: data.categories[column] }));
        }
      }
    }
  }

  function addCombo(scene, type, data, config, leftScale, rightScale) {
    var box = scene.layout.plot;
    var band = box.width / data.columns;
    var styles = config.seriesStyles || [];
    var descriptors = data.table.map(function (row, series) {
      var style = styles[series] || {};
      return {
        row: row,
        series: series,
        style: style,
        line: style.type === 'line' || (!style.type && (type === 'dualLineBarChart' || type === 'comboChart') && series === 1),
        right: style.axis === 'right' || (!style.axis && (type === 'dualBarChart' || type === 'dualLineBarChart') && series > 0) || (config.axisAssignment === 'right-second' && series > 0),
        color: style.color || config.colors[series % config.colors.length]
      };
    });
    var barDescriptors = descriptors.filter(function (descriptor) { return !descriptor.line; });
    descriptors.forEach(function (descriptor) {
      var row = descriptor.row, series = descriptor.series, style = descriptor.style;
      var lineSeries = descriptor.line;
      var right = descriptor.right;
      var useScale = right ? rightScale : leftScale;
      var color = descriptor.color;
      if (lineSeries) {
        var points = cartesianPoints(row, box, useScale).map(function (point, index) { point.x = box.x + band * (index + 0.5); return point; });
        scene.layers.push(pathNode(pointCommands(points, finite(style.lineType, config.lineType)), { stroke: color, strokeWidth: finite(style.lineWidth, config.lineWidth), fill: null, lineJoin: 'round', lineCap: 'round' }, data.seriesNames[series], { series: series, axis: right ? 'right' : 'left' }));
        var dotType = finite(style.dotType, config.dotType);
        var dotDiameter = finite(style.dotDiameter, config.dotDiameter);
        if (dotType !== 0) points.forEach(function (point, index) {
          var hollow = dotType !== 1;
          scene.layers.push(circleNode(point.x, point.y, dotDiameter / 2, { fill: hollow ? '#ffffff' : color, stroke: hollow ? color : null, strokeWidth: hollow ? finite(style.lineWidth, config.lineWidth) : 0 }, 'Point ' + (index + 1), { series: series, index: index, value: row[index], label: data.categories[index], axis: right ? 'right' : 'left' }));
        });
      } else {
        var comboAvailable = band * (1 - clamp(config.barMargin, 0, 0.95));
        var comboInnerRatio = clamp(config.barInnerGap, 0, 0.95);
        var width = comboAvailable / Math.max(1, barDescriptors.length + comboInnerRatio * (barDescriptors.length - 1));
        var comboInnerGap = width * comboInnerRatio;
        var barIndex = barDescriptors.indexOf(descriptor);
        var baseline = barBaseline(useScale);
        row.forEach(function (value, index) {
          var zero = box.y + box.height - (baseline - useScale.min) / (useScale.max - useScale.min) * box.height;
          var y = box.y + box.height - (value - useScale.min) / (useScale.max - useScale.min) * box.height;
          var barY = Math.min(zero, y), barHeight = Math.max(0.5, Math.abs(zero - y));
          scene.layers.push(roundedBarNode(box.x + band * index + band * config.barMargin / 2 + (width + comboInnerGap) * barIndex, barY, width, barHeight, config.barRound, y <= zero ? 'top' : 'bottom', { fill: color }, data.seriesNames[series], { series: series, index: index, value: value, axis: right ? 'right' : 'left' }));
        });
      }
    });
  }

  function addCircular(scene, type, data, config, seriesIndex) {
    var box = scene.layout.plot;
    var row = data.table[clamp(seriesIndex || 0, 0, data.rows - 1)].slice();
    var cx = box.x + box.width / 2;
    var cy = box.y + box.height / 2;
    var radius = Math.max(1, Math.min(box.width, box.height) / 2);
    if (type === 'progressChart') {
      var progress = clamp(row[0], 0, 100) / 100;
      var start = config.circleType === 0 ? -Math.PI / 2 : Math.PI;
      var total = config.circleType === 0 ? Math.PI * 2 : Math.PI;
      scene.layers.push(arcNode(cx, cy, radius - config.progressThickness / 2, 0, start, start + total, { stroke: config.progressBackground, strokeWidth: config.progressThickness, lineCap: config.lineEnd === 1 ? 'round' : 'butt', fill: null }, 'Progress Background'));
      scene.layers.push(arcNode(cx, cy, radius - config.progressThickness / 2, 0, start, start + total * progress, { stroke: config.colors[0], strokeWidth: config.progressThickness, lineCap: config.lineEnd === 1 ? 'round' : 'butt', fill: null }, 'Progress', { value: row[0] }));
      return;
    }
    var items = row.map(function (value, originalIndex) {
      return {
        value: value,
        originalIndex: originalIndex,
        label: data.categories[originalIndex],
        color: config.colors[originalIndex % config.colors.length]
      };
    });
    if (config.sorting === 0) items.sort(function (a, b) { return b.value - a.value; });
    var sum = items.reduce(function (total, item) { return total + Math.max(0, item.value); }, 0);
    if (sum <= 0) return;
    var full = config.circleType === 0 ? Math.PI * 2 : Math.PI;
    var angle = config.circleType === 0 ? -Math.PI / 2 : Math.PI;
    var visibleCount = items.filter(function (item) { return item.value > 0; }).length;
    var innerRadius = type === 'donutChart' ? Math.max(0, radius - config.donutThickness) : 0;
    var smallestAngle = items.reduce(function (smallest, item) {
      return item.value > 0 ? Math.min(smallest, full * item.value / sum) : smallest;
    }, full);
    var gap = visibleCount > 1 ? Math.min(config.segmentGap, 1.9 * (innerRadius || radius) * Math.sin(smallestAngle / 2)) : 0;
    items.forEach(function (item, index) {
      var value = item.value;
      var end = angle + full * Math.max(0, value) / sum;
      if (value > 0) {
        var segment = arcNode(cx, cy, radius, innerRadius, angle, end, { fill: item.color, stroke: null }, item.label, { index: item.originalIndex, displayIndex: index, value: value, label: item.label });
        if (gap > 0) segment.gap = gap;
        scene.layers.push(segment);
      }
      angle = end;
    });
  }

  function addSparkline(scene, data, config, seriesIndex) {
    var rowIndex = clamp(seriesIndex || 0, 0, data.rows - 1);
    var row = data.table[rowIndex];
    var range = scale(row, scene.layout.plot.height, false, 0);
    var points = cartesianPoints(row, scene.layout.plot, range);
    var color = config.colors[rowIndex % config.colors.length];
    scene.layers.push(pathNode(pointCommands(points, 1), { stroke: color, strokeWidth: config.sparkLineWidth, fill: null, lineJoin: 'round' }, data.seriesNames[rowIndex], { series: rowIndex }));
    points.forEach(function (point, index) { scene.layers.push(circleNode(point.x, point.y, config.sparkDotDiameter / 2, { fill: color }, 'Point ' + (index + 1), { series: rowIndex, index: index, value: row[index] })); });
  }

  function addScatter(scene, data, config, xScale, yScale) {
    var box = scene.layout.plot;
    var count = Math.min(data.table[0].length, data.table[1].length);
    var weights = data.table[2] || null;
    var minRadius = Math.max(3, config.scatterDotDiameter * 0.5);
    var maxRadius = Math.max(8, config.scatterDotDiameter * 2);
    var minWeight = 0, maxWeight = 0;
    if (weights) {
      minWeight = Math.min.apply(null, weights);
      maxWeight = Math.max.apply(null, weights);
    }
    for (var index = 0; index < count; index += 1) {
      var weight = weights ? Math.max(0, weights[index]) : null;
      var radius = config.scatterDotDiameter / 2;
      if (weights) {
        var normalizedWeight = maxWeight === minWeight ? 0.5 : clamp((weight - minWeight) / (maxWeight - minWeight), 0, 1);
        radius = minRadius + Math.sqrt(normalizedWeight) * (maxRadius - minRadius);
      }
      var x = box.x + (data.table[0][index] - xScale.min) / (xScale.max - xScale.min) * box.width;
      var y = box.y + box.height - (data.table[1][index] - yScale.min) / (yScale.max - yScale.min) * box.height;
      scene.layers.push(circleNode(x, y, radius, { fill: colorWithAlpha(config.colors[0], weights ? 0.58 : 0.75), stroke: config.colors[0], strokeWidth: 1 }, data.categories[index], { index: index, x: data.table[0][index], y: data.table[1][index], value: data.table[1][index], weight: weight, radius: radius, label: data.categories[index] }));
    }
  }

  function addCandles(scene, data, config, yScale) {
    if (data.rows < 4) return;
    var box = scene.layout.plot;
    var band = box.width / data.columns;
    var width = band * (1 - clamp(config.candleMargin, 0, 0.95));
    function y(value) { return box.y + box.height - (value - yScale.min) / (yScale.max - yScale.min) * box.height; }
    for (var index = 0; index < data.columns; index += 1) {
      var high = data.table[0][index], closeValue = data.table[1][index], openValue = data.table[2][index], low = data.table[3][index];
      var color = closeValue >= openValue ? config.candleColors[0] : config.candleColors[1];
      var x = box.x + band * (index + 0.5);
      scene.layers.push(pathNode([move(x, y(high)), lineTo(x, y(low))], { stroke: color, strokeWidth: 1 }, 'Wick ' + (index + 1)));
      scene.layers.push(rectNode(x - width / 2, Math.min(y(openValue), y(closeValue)), width, Math.max(1, Math.abs(y(openValue) - y(closeValue))), 0, { fill: color }, 'Candle ' + (index + 1), { index: index, open: openValue, high: high, low: low, close: closeValue, value: closeValue }));
    }
  }

  function addRadar(scene, data, config, scaleValue) {
    var box = scene.layout.plot, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    var radius = Math.max(8, Math.min(box.width, box.height) / 2 - 12), levels = config.radarLevels;
    for (var level = 1; level <= levels; level += 1) {
      var ringRadius = radius * level / levels;
      if (config.radarGridShape === 'circle') {
        scene.layers.push(circleNode(cx, cy, ringRadius, { stroke: config.grid.color, strokeWidth: config.grid.lineWidth, fill: null }, 'Grid Radar ' + level));
        continue;
      }
      var ring = [];
      for (var axis = 0; axis < data.columns; axis += 1) {
        var angle = -Math.PI / 2 + axis * Math.PI * 2 / data.columns;
        ring.push(axis === 0 ? move(cx + Math.cos(angle) * ringRadius, cy + Math.sin(angle) * ringRadius) : lineTo(cx + Math.cos(angle) * ringRadius, cy + Math.sin(angle) * ringRadius));
      }
      ring.push(lineTo(cx + Math.cos(-Math.PI / 2) * ringRadius, cy + Math.sin(-Math.PI / 2) * ringRadius));
      scene.layers.push(pathNode(ring, { stroke: config.grid.color, strokeWidth: config.grid.lineWidth, fill: null }, 'Grid Radar ' + level));
    }
    for (var axisIndex = 0; axisIndex < data.columns; axisIndex += 1) {
      var axisAngle = -Math.PI / 2 + axisIndex * Math.PI * 2 / data.columns;
      scene.layers.push(pathNode([move(cx, cy), lineTo(cx + Math.cos(axisAngle) * radius, cy + Math.sin(axisAngle) * radius)], { stroke: config.grid.color, strokeWidth: config.grid.lineWidth, fill: null }, 'Axis ' + data.categories[axisIndex]));
      scene.layers.push(textNode(cx + Math.cos(axisAngle) * (radius + 9), cy + Math.sin(axisAngle) * (radius + 9), data.categories[axisIndex], { fill: config.labels.xAxis.color, fontSize: config.labels.xAxis.fontSize, fontName: config.fontName, align: 'center', baseline: 'middle' }, 'Category ' + axisIndex));
    }
    data.table.forEach(function (row, series) {
      var points = row.map(function (value, index) {
        var angle = -Math.PI / 2 + index * Math.PI * 2 / data.columns;
        var ratio = scaleValue.max === scaleValue.min ? 0.5 : (value - scaleValue.min) / (scaleValue.max - scaleValue.min);
        return { x: cx + Math.cos(angle) * radius * clamp(ratio, 0, 1), y: cy + Math.sin(angle) * radius * clamp(ratio, 0, 1) };
      });
      var commands = points.map(function (point, index) { return index === 0 ? move(point.x, point.y) : lineTo(point.x, point.y); });
      commands.push(lineTo(points[0].x, points[0].y));
      var color = config.colors[series % config.colors.length];
      scene.layers.push(pathNode(commands, { stroke: color, strokeWidth: config.lineWidth, fill: colorWithAlpha(color, config.radarFillOpacity), lineJoin: 'round' }, 'Series ' + (series + 1), { series: series }));
      points.forEach(function (point, index) { scene.layers.push(circleNode(point.x, point.y, Math.max(2, config.dotDiameter / 3), { fill: color }, 'Point ' + (index + 1), { series: series, index: index, value: row[index], label: data.categories[index] })); });
    });
  }

  function addFunnel(scene, data, config) {
    var box = scene.layout.plot;
    // 漏斗语义即转化递减：数据与标签绑定后降序排列，避免随机/乱序数据画出"沙漏"
    var stages = data.table[0].map(function (value, index) { return { value: value, label: data.categories[index], index: index }; })
      .sort(function (a, b) { return b.value - a.value; });
    var max = stages.length ? stages[0].value || 1 : 1, gap = config.funnelGap, band = box.height / Math.max(1, stages.length);
    var rectangular = config.funnelShape === 'rectangular';
    var labelRight = config.funnelLabelPosition === 'right';
    var barArea = labelRight ? box.width * 0.72 : box.width;
    stages.forEach(function (stage, order) {
      var value = stage.value;
      var topWidth = barArea * (value / max), next = stages[order + 1] == null ? value * 0.72 : stages[order + 1].value, bottomWidth = rectangular ? topWidth : barArea * (next / max), y = box.y + order * band + gap / 2;
      var cx = labelRight ? box.x + barArea / 2 : box.x + box.width / 2;
      // 颜色跟随原始数据项，而不是排序后的显示位置。
      var color = config.colors[stage.index % config.colors.length];
      var height = Math.max(1, band - gap);
      if (rectangular) {
        scene.layers.push(rectNode(cx - topWidth / 2, y, Math.max(1, topWidth), height, 2, { fill: color }, stage.label, { index: stage.index, value: value, label: stage.label }));
      } else {
        var commands = [move(cx - topWidth / 2, y), lineTo(cx + topWidth / 2, y), lineTo(cx + bottomWidth / 2, y + height), lineTo(cx - bottomWidth / 2, y + height), lineTo(cx - topWidth / 2, y)];
        scene.layers.push(pathNode(commands, { fill: color, stroke: '#ffffff', strokeWidth: 1 }, stage.label, { index: stage.index, value: value, label: stage.label }));
      }
      if (labelRight) {
        scene.layers.push(textNode(box.x + barArea + 12, y + height / 2, stage.label + '  ' + formatNumber(value), { fill: config.labels.xAxis.color, fontSize: config.labels.xAxis.fontSize, fontName: config.fontName, align: 'left', baseline: 'middle' }, 'Stage ' + (order + 1)));
      } else {
        scene.layers.push(textNode(cx, y + height / 2, stage.label, { fill: '#ffffff', fontSize: config.labels.xAxis.fontSize, fontName: config.fontName, align: 'center', baseline: 'middle' }, 'Stage ' + (order + 1)));
      }
    });
  }

  var HEATMAP_SCALES = {
    blue: ['#edf5ff', '#0f62fe'],
    green: ['#defbe6', '#24a148'],
    red: ['#fdeceb', '#e5484d'],
    gray: ['#f0f0f2', '#55565c']
  };
  function hexLerp(from, to, ratio) {
    function channel(index) { return Math.round(parseInt(from.slice(index, index + 2), 16) + (parseInt(to.slice(index, index + 2), 16) - parseInt(from.slice(index, index + 2), 16)) * ratio); }
    function hex(value) { var text = value.toString(16); return text.length < 2 ? '0' + text : text; }
    return '#' + hex(channel(1)) + hex(channel(3)) + hex(channel(5));
  }

  function addHeatmap(scene, data, config) {
    var box = scene.layout.plot, rows = data.rows, cols = data.columns, cellWidth = box.width / cols, cellHeight = box.height / rows;
    var gap = config.heatmapCellGap, scaleColors = HEATMAP_SCALES[config.heatmapColorScale] || HEATMAP_SCALES.blue;
    var values = []; data.table.forEach(function (row) { row.forEach(function (value) { values.push(value); }); });
    var min = Math.min.apply(Math, values), max = Math.max.apply(Math, values), span = max - min || 1;
    data.table.forEach(function (row, rowIndex) { row.forEach(function (value, columnIndex) {
      var ratio = (value - min) / span, fill = hexLerp(scaleColors[0], scaleColors[1], ratio);
      var cellX = box.x + columnIndex * cellWidth + gap / 2, cellY = box.y + rowIndex * cellHeight + gap / 2;
      var cellW = Math.max(1, cellWidth - gap), cellH = Math.max(1, cellHeight - gap);
      scene.layers.push(rectNode(cellX, cellY, cellW, cellH, 3, { fill: fill }, 'Cell ' + (rowIndex + 1) + '-' + (columnIndex + 1), { row: rowIndex, index: columnIndex, value: value }));
      if (config.heatmapShowValues && cellW >= 24 && cellH >= 14) {
        scene.layers.push(textNode(cellX + cellW / 2, cellY + cellH / 2, formatNumber(value), { fill: ratio > 0.55 ? '#ffffff' : '#202124', fontSize: Math.min(11, config.labels.xAxis.fontSize), fontName: config.fontName, align: 'center', baseline: 'middle' }, 'Value ' + (rowIndex + 1) + '-' + (columnIndex + 1)));
      }
    }); });
  }

  function squarify(row, box, gap) {
    var items = row.map(function (value, index) { return { value: Math.max(0, value), index: index }; })
      .filter(function (item) { return item.value > 0; })
      .sort(function (a, b) { return b.value - a.value; });
    var total = items.reduce(function (sum, item) { return sum + item.value; }, 0) || 1;
    var area = box.width * box.height;
    items.forEach(function (item) { item.area = item.value / total * area; });
    function worst(rowAreas, side) {
      var sum = 0, max = 0, min = Infinity;
      rowAreas.forEach(function (a) { sum += a; max = Math.max(max, a); min = Math.min(min, a); });
      var side2 = side * side, sum2 = sum * sum;
      return Math.max(side2 * max / sum2, sum2 / (side2 * min));
    }
    var rects = [];
    var rowItems = [], i = 0;
    var container = { x: box.x, y: box.y, width: box.width, height: box.height };
    while (i < items.length) {
      var sideMin = Math.min(container.width, container.height);
      rowItems = [items[i]];
      var j = i + 1;
      while (j < items.length) {
        var current = rowItems.map(function (it) { return it.area; });
        var candidate = current.concat([items[j].area]);
        if (worst(candidate, sideMin) <= worst(current, sideMin)) { rowItems.push(items[j]); j += 1; }
        else break;
      }
      var horizontal = container.width >= container.height;
      var sum = rowItems.reduce(function (s, it) { return s + it.area; }, 0);
      var thickness = horizontal ? sum / container.height : sum / container.width;
      var offset = horizontal ? container.y : container.x;
      rowItems.forEach(function (it) {
        var length = it.area / thickness;
        if (horizontal) rects.push({ x: container.x, y: offset, width: thickness, height: length, index: it.index });
        else rects.push({ x: offset, y: container.y, width: length, height: thickness, index: it.index });
        offset += length;
      });
      if (horizontal) { container.x += thickness; container.width -= thickness; }
      else { container.y += thickness; container.height -= thickness; }
      i = j;
    }
    return rects.map(function (rect) {
      return { x: rect.x + gap / 2, y: rect.y + gap / 2, width: Math.max(1, rect.width - gap), height: Math.max(1, rect.height - gap), index: rect.index };
    });
  }

  function addTreemap(scene, data, config) {
    var box = scene.layout.plot, row = data.table[0];
    var rects = squarify(row, box, config.treemapTileGap);
    rects.forEach(function (rect) {
      var color = config.colors[rect.index % config.colors.length];
      var label = data.categories[rect.index];
      scene.layers.push(rectNode(rect.x, rect.y, rect.width, rect.height, 3, { fill: color }, label, { index: rect.index, value: row[rect.index], label: label }));
      if (rect.width >= 44 && rect.height >= 16) {
        scene.layers.push(textNode(rect.x + 6, rect.y + 6 + config.labels.xAxis.fontSize / 2, label, { fill: '#ffffff', fontSize: config.labels.xAxis.fontSize, fontName: config.fontName, align: 'left', baseline: 'middle' }, 'Tile ' + (rect.index + 1)));
      }
    });
  }

  function buildScene(input) {
    input = input || {};
    var type = normalizeType(input.type);
    var config = normalizeConfig(input.config || {}, type);
    var data = prepareData(type, normalizeData(input.data, { categories: input.categories, seriesNames: input.seriesNames }), config);
    var width = Math.max(1, finite(input.width, 400));
    var height = Math.max(1, finite(input.height, 240));
    var stacked = type === 'stackedAreaChart' || isPercentStacked(type) || type === 'streamGraph' || type === 'verticalBarChart' || type === 'horizontalBarChart' || type === 'stackedHistogram';
    var range = dataRange(type, data, stacked);
    var yScale = scale(range.values, height, config.beginAtZero || stacked, config.grid.yAxisSegments, config.labels.yAxis.min, config.labels.yAxis.max);
    var xScale = yScale;
    if (type === 'scatterPlot') {
      xScale = scale(data.table[0], width, config.beginAtZero, config.grid.yAxisSegments, config.labels.xAxis.min, config.labels.xAxis.max);
      yScale = scale(data.table[1], height, config.beginAtZero, config.grid.yAxisSegments, config.labels.yAxis.min, config.labels.yAxis.max);
    }
    var rightValues = [];
    var leftValues = [];
    if (type === 'comboChart' || type === 'dualBarChart' || type === 'dualLineBarChart') {
      data.table.forEach(function (row, index) {
        var style = config.seriesStyles[index] || {};
        var right = style.axis === 'right' || (!style.axis && type !== 'comboChart' && index > 0) || (config.axisAssignment === 'right-second' && index > 0);
        Array.prototype.push.apply(right ? rightValues : leftValues, row);
      });
      yScale = scale(leftValues.length ? leftValues : range.values, height, config.beginAtZero, config.grid.yAxisSegments);
    }
    var rightScale = scale(rightValues.length ? rightValues : range.values, height, config.beginAtZero, config.grid.yAxisSegments);
    var scene = {
      version: VERSION,
      type: type,
      width: width,
      height: height,
      data: data,
      config: config,
      scales: { x: xScale, y: yScale, rightY: rightScale },
      layout: null,
      layers: [],
      hoverTargets: []
    };
    scene.layout = layout(width, height, type, config, scene.scales, data);
    if (CARTESIAN[type]) {
      var horizontal = type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart' || type === 'groupedHorizontalBarChart';
      var distributed = horizontal || type === 'verticalBarChart' || type === 'groupedBarChart' || type === 'histogram' || type === 'stackedHistogram' || type === 'comboChart' || type === 'dualBarChart' || type === 'dualLineBarChart';
      addAxes(scene, type, data, config, scene.scales, horizontal, distributed);
    }
    if (type === 'lineChart') addLineSeries(scene, data, config, yScale);
    else if (type === 'areaChart') addAreaSeries(scene, data, config, yScale, false, false);
    else if (type === 'stackedAreaChart' || type === 'percentStackedAreaChart') addAreaSeries(scene, data, config, yScale, true, false);
    else if (type === 'streamGraph') addAreaSeries(scene, data, config, yScale, true, true);
    else if (type === 'verticalBarChart' || type === 'percentStackedVerticalBarChart' || type === 'stackedHistogram') addBars(scene, data, config, yScale, false, true);
    else if (type === 'horizontalBarChart' || type === 'percentStackedHorizontalBarChart') addBars(scene, data, config, xScale, true, true);
    else if (type === 'groupedBarChart' || type === 'histogram') addBars(scene, data, config, yScale, false, false);
    else if (type === 'groupedHorizontalBarChart') addBars(scene, data, config, xScale, true, false);
    else if (type === 'comboChart' || type === 'dualBarChart' || type === 'dualLineBarChart') addCombo(scene, type, data, config, yScale, rightScale);
    else if (type === 'pieChart' || type === 'donutChart' || type === 'progressChart') addCircular(scene, type, data, config, input.seriesIndex || 0);
    else if (type === 'sparkline') addSparkline(scene, data, config, input.seriesIndex || 0);
    else if (type === 'scatterPlot') addScatter(scene, data, config, xScale, yScale);
    else if (type === 'candlestickChart') addCandles(scene, data, config, yScale);
    else if (type === 'radarChart') addRadar(scene, data, config, yScale);
    else if (type === 'funnelChart') addFunnel(scene, data, config);
    else if (type === 'heatmap') addHeatmap(scene, data, config);
    else if (type === 'treemap') addTreemap(scene, data, config);
    scene.layers.forEach(function (layer) { if (layer.meta && layer.meta.value != null) scene.hoverTargets.push(layer); });
    return scene;
  }

  return {
    version: VERSION,
    normalizeData: normalizeData,
    normalizeConfig: normalizeConfig,
    buildScene: buildScene
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = XChartCore;
