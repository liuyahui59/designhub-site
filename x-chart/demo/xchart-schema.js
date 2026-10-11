(function(global){
  'use strict';

  var F = {
    grid: { tier: 'advanced', capability: 'axes' },
    gridLineWidth: { tier: 'advanced', capability: 'axes' },
    gridColor: { tier: 'advanced', capability: 'axes' },
    yAxisSegments: { tier: 'advanced', capability: 'axes' },
    labels: { tier: 'advanced', capability: 'axes' },
    labelFontName: { tier: 'advanced', capability: 'axes' },
    labelFontSize: { tier: 'advanced', capability: 'axes' },
    labelColor: { tier: 'advanced', capability: 'axes' },
    separateAxisStyles: { tier: 'advanced', capability: 'axes' },
    xAxisLabels: { tier: 'advanced', capability: 'axes', when: separateAxes },
    xAxisLine: { tier: 'advanced', capability: 'axes', when: separateAxes },
    xAxisTicks: { tier: 'advanced', capability: 'axes', when: separateAxes },
    xAxisFontSize: { tier: 'advanced', capability: 'axes', when: separateAxes },
    xAxisLineColor: { tier: 'advanced', capability: 'axes', when: separateAxes },
    xAxisColor: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisLabels: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisLine: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisTicks: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisFontSize: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisLineColor: { tier: 'advanced', capability: 'axes', when: separateAxes },
    yAxisColor: { tier: 'advanced', capability: 'axes', when: separateAxes },
    beginAtZero: { tier: 'advanced', capability: 'axes', when: function(state, chartId){
      return chartId !== 'percentStackedAreaChart' && chartId !== 'percentStackedVerticalBarChart' && chartId !== 'percentStackedHorizontalBarChart' && chartId !== 'candlestickChart';
    } },

    lineType: { tier: 'basic' },
    lineWidth: { tier: 'basic' },
    dotType: { tier: 'basic' },
    dotDiameter: { tier: 'basic' },
    areaFillStyle: { tier: 'basic' },
    areaOpacity: { tier: 'basic' },
    areaLineWidth: { tier: 'basic', when: function(state){ return state.areaFillStyle !== 'solid'; } },
    marginV: { tier: 'basic' },
    roundTopV: { tier: 'basic' },
    marginH: { tier: 'basic' },
    roundTopH: { tier: 'basic' },
    groupMarginV: { tier: 'basic' },
    groupInnerGapV: { tier: 'basic' },
    groupRoundTopV: { tier: 'basic' },
    groupMarginH: { tier: 'basic' },
    groupInnerGapH: { tier: 'basic' },
    groupRoundTopH: { tier: 'basic' },
    stackGapV: { tier: 'basic' },
    stackGapH: { tier: 'basic' },
    sorting: { tier: 'basic' },
    typeOfCircle: { tier: 'basic' },
    segmentGap: { tier: 'basic' },
    spiderLabels: { tier: 'basic' },
    thicknessOfDonut: { tier: 'basic' },
    thicknessOfProgress: { tier: 'basic' },
    progressBgColor: { tier: 'basic' },
    progressColor: { tier: 'basic' },
    endOfLine: { tier: 'basic' },
    sparkLineWidth: { tier: 'basic' },
    sparkDotDiameter: { tier: 'basic' },
    sparklineColor: { tier: 'basic' },
    scatterDotDiameter: { tier: 'basic' },
    scatterColor: { tier: 'basic' },
    candleMargin: { tier: 'basic' },
    candleUp: { tier: 'basic' },
    candleDown: { tier: 'basic' },

    seriesStyles: { tier: 'basic' },
    axisAssignment: { tier: 'basic' },
    binMode: { tier: 'basic' },
    binCount: { tier: 'basic' },
    binWidth: { tier: 'basic' },
    showOutliers: { tier: 'basic' },
    positiveColor: { tier: 'basic' },
    negativeColor: { tier: 'basic' },
    totalColor: { tier: 'basic' },
    funnelGap: { tier: 'basic' },
    labelPosition: { tier: 'basic' },
    colorScale: { tier: 'basic' },
    cellGap: { tier: 'basic' },
    showValues: { tier: 'basic' },
    radarLevels: { tier: 'basic' },
    radarFillOpacity: { tier: 'basic' },
    radarGridShape: { tier: 'basic' },
    hierarchyFields: { tier: 'basic' },
    tileGap: { tier: 'basic' },
    sourceField: { tier: 'basic' },
    targetField: { tier: 'basic' },
    flowField: { tier: 'basic' },
    taskField: { tier: 'basic' },
    startField: { tier: 'basic' },
    endField: { tier: 'basic' }
  };

  function separateAxes(state){ return state && state.separateAxisStyles === true; }

  var FIELD_UI = {
    grid: { label: '网格', group: 'axes', component: 'select', layout: 'wide' },
    gridLineWidth: { label: '网格线宽', group: 'axes', component: 'number', layout: 'half', unit: 'px', min: 0, max: 10, step: 1 },
    gridColor: { label: '网格颜色', group: 'axes', component: 'color', layout: 'wide' },
    yAxisSegments: { label: 'Y 轴分段', group: 'axes', component: 'number', layout: 'half', min: 0, max: 20, step: 1 },
    labels: { label: '显示标签', group: 'labels', component: 'select', layout: 'wide' },
    labelFontName: { label: '字体', group: 'labels', component: 'font', layout: 'wide' },
    labelFontSize: { label: '标签字号', group: 'labels', component: 'number', layout: 'half', unit: 'px', min: 6, max: 72, step: 1 },
    labelColor: { label: '文字颜色', group: 'labels', component: 'color', layout: 'wide' },
    separateAxisStyles: { label: '分别设置 X/Y 轴', group: 'labels', component: 'checkbox', layout: 'wide' },
    xAxisLabels: { label: 'X 轴标签', group: 'x-axis', component: 'checkbox', layout: 'half' },
    xAxisLine: { label: 'X 轴轴线', group: 'x-axis', component: 'checkbox', layout: 'half' },
    xAxisTicks: { label: 'X 轴刻度', group: 'x-axis', component: 'checkbox', layout: 'half' },
    xAxisFontSize: { label: 'X 轴字号', group: 'x-axis', component: 'number', layout: 'half', unit: 'px', min: 6, max: 72, step: 1 },
    xAxisLineColor: { label: 'X 轴线颜色', group: 'x-axis', component: 'color', layout: 'wide' },
    xAxisColor: { label: 'X 轴文字颜色', group: 'x-axis', component: 'color', layout: 'wide' },
    yAxisLabels: { label: 'Y 轴标签', group: 'y-axis', component: 'checkbox', layout: 'half' },
    yAxisLine: { label: 'Y 轴轴线', group: 'y-axis', component: 'checkbox', layout: 'half' },
    yAxisTicks: { label: 'Y 轴刻度', group: 'y-axis', component: 'checkbox', layout: 'half' },
    yAxisFontSize: { label: 'Y 轴字号', group: 'y-axis', component: 'number', layout: 'half', unit: 'px', min: 6, max: 72, step: 1 },
    yAxisLineColor: { label: 'Y 轴线颜色', group: 'y-axis', component: 'color', layout: 'wide' },
    yAxisColor: { label: 'Y 轴文字颜色', group: 'y-axis', component: 'color', layout: 'wide' },
    beginAtZero: { label: '从零开始', group: 'axes', component: 'select', layout: 'wide' },
    lineType: { label: '线条类型', group: 'line', component: 'select', layout: 'wide' },
    lineWidth: { label: '线宽', group: 'line', component: 'number', layout: 'half', unit: 'px', min: 1, max: 20, step: 1 },
    dotType: { label: '圆点类型', group: 'points', component: 'select', layout: 'wide' },
    dotDiameter: { label: '圆点大小', group: 'points', component: 'number', layout: 'half', unit: 'px', min: 0, max: 48, step: 1 },
    areaFillStyle: { label: '填充样式', group: 'area', component: 'visual-picker', layout: 'wide' },
    areaOpacity: { label: '透明度', group: 'area', component: 'range', layout: 'wide', unit: '%', min: 0, max: 1, step: 0.05 },
    areaLineWidth: { label: '描边宽度', group: 'area', component: 'number', layout: 'half', unit: 'px', min: 0.5, max: 20, step: 0.5 },
    marginV: { label: '柱间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    roundTopV: { label: '圆角', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    marginH: { label: '柱间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    roundTopH: { label: '圆角', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    groupMarginV: { label: '分组间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    groupInnerGapV: { label: '组内柱间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    groupRoundTopV: { label: '圆角', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    groupMarginH: { label: '分组间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    groupInnerGapH: { label: '组内条间距', group: 'bar', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    groupRoundTopH: { label: '圆角', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    stackGapV: { label: '堆叠段间距', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    stackGapH: { label: '堆叠段间距', group: 'bar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 100, step: 1 },
    sorting: { label: '排序', group: 'polar', component: 'select', layout: 'half' },
    typeOfCircle: { label: '圆形类型', group: 'polar', component: 'select', layout: 'half' },
    segmentGap: { label: '区块间距', group: 'polar', component: 'number', layout: 'half', unit: 'px', min: 0, max: 20, step: 1 },
    spiderLabels: { label: '蜘蛛标签', group: 'polar', component: 'checkbox', layout: 'wide' },
    thicknessOfDonut: { label: '环形厚度', group: 'polar', component: 'number', layout: 'wide', unit: 'px', min: 1, max: 200, step: 1 },
    thicknessOfProgress: { label: '进度条厚度', group: 'progress', component: 'number', layout: 'wide', unit: 'px', min: 1, max: 100, step: 1 },
    progressBgColor: { label: '背景色', group: 'progress', component: 'color', layout: 'wide' },
    progressColor: { label: '进度色', group: 'progress', component: 'color', layout: 'wide' },
    endOfLine: { label: '线端', group: 'progress', component: 'select', layout: 'half' },
    sparkLineWidth: { label: '线宽', group: 'sparkline', component: 'number', layout: 'half', unit: 'px', min: 1, max: 20, step: 1 },
    sparkDotDiameter: { label: '末端圆点', group: 'sparkline', component: 'number', layout: 'half', unit: 'px', min: 0, max: 48, step: 1 },
    sparklineColor: { label: '迷你图颜色', group: 'sparkline', component: 'color', layout: 'wide' },
    scatterDotDiameter: { label: '圆点大小', group: 'points', component: 'number', layout: 'wide', unit: 'px', min: 1, max: 64, step: 1 },
    scatterColor: { label: '散点颜色', group: 'points', component: 'color', layout: 'wide' },
    candleMargin: { label: '蜡烛间距', group: 'candlestick', component: 'range', layout: 'wide', unit: '%', min: 0, max: 0.9, step: 0.05 },
    candleUp: { label: '上涨颜色', group: 'candlestick', component: 'color', layout: 'wide' },
    candleDown: { label: '下跌颜色', group: 'candlestick', component: 'color', layout: 'wide' },

    seriesStyles: { label: '系列与坐标轴', group: 'series', component: 'series-editor', layout: 'wide' },
    axisAssignment: { label: '坐标轴归属', group: 'series', component: 'select', layout: 'wide' },
    binMode: { label: '分箱方式', group: 'bins', component: 'select', layout: 'wide' },
    binCount: { label: '分箱数量', group: 'bins', component: 'number', layout: 'half', min: 1, max: 100, step: 1 },
    binWidth: { label: '分箱宽度', group: 'bins', component: 'number', layout: 'half', min: 0, step: 0.1 },
    showOutliers: { label: '显示异常值', group: 'distribution', component: 'checkbox', layout: 'wide' },
    positiveColor: { label: '正值颜色', group: 'waterfall', component: 'color', layout: 'wide' },
    negativeColor: { label: '负值颜色', group: 'waterfall', component: 'color', layout: 'wide' },
    totalColor: { label: '汇总颜色', group: 'waterfall', component: 'color', layout: 'wide' },
    funnelGap: { label: '层级间距', group: 'funnel', component: 'number', layout: 'half', unit: 'px', min: 0, max: 40, step: 1 },
    labelPosition: { label: '标签位置', group: 'labels', component: 'select', layout: 'wide' },
    colorScale: { label: '色阶', group: 'heatmap', component: 'color-scale', layout: 'wide' },
    cellGap: { label: '单元格间距', group: 'heatmap', component: 'number', layout: 'half', unit: 'px', min: 0, max: 20, step: 1 },
    showValues: { label: '显示数值', group: 'heatmap', component: 'checkbox', layout: 'half' },
    radarLevels: { label: '网格层数', group: 'radar', component: 'number', layout: 'half', min: 1, max: 12, step: 1 },
    radarFillOpacity: { label: '填充透明度', group: 'radar', component: 'range', layout: 'half', unit: '%', min: 0, max: 1, step: 0.05 },
    radarGridShape: { label: '背景网格', group: 'radar', component: 'select', layout: 'wide' },
    hierarchyFields: { label: '层级字段', group: 'hierarchy', component: 'multi-select', layout: 'wide' },
    tileGap: { label: '区块间距', group: 'hierarchy', component: 'number', layout: 'half', unit: 'px', min: 0, max: 20, step: 1 },
    sourceField: { label: '来源字段', group: 'flow', component: 'field-select', layout: 'wide' },
    targetField: { label: '目标字段', group: 'flow', component: 'field-select', layout: 'wide' },
    flowField: { label: '流量字段', group: 'flow', component: 'field-select', layout: 'wide' },
    taskField: { label: '任务字段', group: 'schedule', component: 'field-select', layout: 'wide' },
    startField: { label: '开始时间', group: 'schedule', component: 'field-select', layout: 'wide' },
    endField: { label: '结束时间', group: 'schedule', component: 'field-select', layout: 'wide' }
  };

  Object.keys(FIELD_UI).forEach(function(id){
    Object.keys(FIELD_UI[id]).forEach(function(key){ F[id][key] = FIELD_UI[id][key]; });
  });

  var dataShapes = {
    'category-series': { roles: ['category', 'series', 'value'], minSeries: 1 },
    'category-value': { roles: ['category', 'value'], minSeries: 1, maxSeries: 1 },
    'xy-points': { roles: ['x', 'y', 'series'], requiredMeasures: 2 },
    scalar: { roles: ['value', 'target'], requiredMeasures: 1, maxSeries: 1 },
    ohlc: { roles: ['date', 'open', 'high', 'low', 'close'], requiredMeasures: 4 },
    'category-series-measures': { roles: ['category', 'series', 'measure', 'value'], minMeasures: 2 },
    'raw-values': { roles: ['value'], requiredMeasures: 1 },
    'raw-values-by-group': { roles: ['group', 'value'], requiredMeasures: 1 },
    matrix: { roles: ['x-category', 'y-category', 'value'], requiredDimensions: 2, requiredMeasures: 1 },
    hierarchy: { roles: ['level', 'value'], minDimensions: 1, requiredMeasures: 1 },
    'source-target': { roles: ['source', 'target', 'value'], requiredDimensions: 2, requiredMeasures: 1 },
    interval: { roles: ['task', 'start', 'end', 'group'], requiredDimensions: 3 }
  };

  var families = {
    line: { name: '折线图', variants: { interpolation: ['curve', 'straight', 'step'], series: ['single', 'multiple'] } },
    area: { name: '面积图', variants: { arrangement: ['regular', 'stacked', 'percent'], fill: ['solid', 'solid-line', 'gradient-line'] } },
    stream: { name: '流图', variants: { interpolation: ['curve', 'straight'] } },
    bar: { name: '柱状图', variants: { orientation: ['vertical', 'horizontal'], arrangement: ['stacked', 'grouped'] } },
    combo: { name: '组合图', variants: { axes: ['shared', 'dual'], marks: ['bar-line', 'bar-bar'], composition: ['bar-line', 'bar-bar'] } },
    distribution: { name: '分布图', variants: { arrangement: ['regular', 'stacked'], bins: ['auto', 'fixed'], mark: ['histogram', 'box-plot'], orientation: ['vertical'] } },
    'part-to-whole': { name: '饼环图', variants: { shape: ['pie', 'donut'], sweep: ['full', 'half'] } },
    kpi: { name: '进度图', variants: { shape: ['full-ring', 'half-ring'] } },
    sparkline: { name: '迷你图', variants: { mark: ['line'] } },
    relationship: { name: '关系图', variants: { mark: ['scatter'] } },
    finance: { name: '金融图', variants: { mark: ['candlestick'] } },
    comparison: { name: '增减比较图', variants: { orientation: ['vertical', 'horizontal'] } },
    process: { name: '流程转化图', variants: { shape: ['standard', 'rectangular'] } },
    matrix: { name: '矩阵图', variants: { layout: ['matrix', 'calendar'] } },
    'polar-comparison': { name: '极坐标比较图', variants: { grid: ['polygon', 'circle'] } },
    hierarchy: { name: '层级图', variants: { layout: ['squarified'] } },
    flow: { name: '流向图', variants: { direction: ['left-to-right'] } },
    schedule: { name: '排期图', variants: { layout: ['timeline'] } }
  };

  var AXES = ['lineChart', 'areaChart', 'stackedAreaChart', 'percentStackedAreaChart', 'streamGraph',
    'verticalBarChart', 'horizontalBarChart', 'percentStackedVerticalBarChart', 'percentStackedHorizontalBarChart', 'groupedBarChart', 'groupedHorizontalBarChart',
    'histogram', 'stackedHistogram', 'comboChart', 'dualBarChart', 'dualLineBarChart',
    'scatterPlot', 'candlestickChart'];

  var charts = {
    lineChart: {
      family: 'line', name: '折线图', navigationLabel: '折线', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { interpolation: 'curve', series: 'multiple' },
      fields: ['lineType', 'lineWidth', 'dotType', 'dotDiameter']
    },
    areaChart: {
      family: 'area', name: '普通面积图', navigationLabel: '普通面积', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { arrangement: 'regular' },
      fields: ['lineType', 'areaFillStyle', 'areaOpacity', 'areaLineWidth']
    },
    stackedAreaChart: {
      family: 'area', name: '堆叠面积图', navigationLabel: '堆叠面积', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { arrangement: 'stacked' },
      fields: ['lineType', 'areaFillStyle', 'areaOpacity', 'areaLineWidth']
    },
    percentStackedAreaChart: {
      family: 'area', name: '百分比堆叠面积图', navigationLabel: '百分比堆叠', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { arrangement: 'percent' },
      fields: ['lineType', 'areaFillStyle', 'areaOpacity', 'areaLineWidth']
    },
    streamGraph: {
      family: 'stream', name: '流图', navigationLabel: '流图', dataShape: 'category-series', capabilities: ['axes', 'legend'],
      variant: { interpolation: 'curve' },
      fields: ['lineType', 'areaOpacity']
    },
    verticalBarChart: {
      family: 'bar', name: '垂直堆叠柱状图', navigationLabel: '垂直堆叠', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'vertical', arrangement: 'stacked' },
      fields: ['marginV', 'stackGapV', 'roundTopV']
    },
    percentStackedVerticalBarChart: {
      family: 'bar', name: '百分比堆叠柱状图', navigationLabel: '百分比堆叠柱', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'vertical', arrangement: 'percent' },
      fields: ['marginV', 'stackGapV', 'roundTopV']
    },
    horizontalBarChart: {
      family: 'bar', name: '水平堆叠柱状图', navigationLabel: '水平堆叠', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'horizontal', arrangement: 'stacked' },
      fields: ['marginH', 'stackGapH', 'roundTopH']
    },
    percentStackedHorizontalBarChart: {
      family: 'bar', name: '百分比堆叠条形图', navigationLabel: '百分比堆叠条', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'horizontal', arrangement: 'percent' },
      fields: ['marginH', 'stackGapH', 'roundTopH']
    },
    groupedBarChart: {
      family: 'bar', name: '垂直分组柱状图', navigationLabel: '垂直分组', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'vertical', arrangement: 'grouped' },
      fields: ['groupMarginV', 'groupInnerGapV', 'groupRoundTopV']
    },
    groupedHorizontalBarChart: {
      family: 'bar', name: '水平分组柱状图', navigationLabel: '水平分组', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { orientation: 'horizontal', arrangement: 'grouped' },
      fields: ['groupMarginH', 'groupInnerGapH', 'groupRoundTopH']
    },
    histogram: {
      family: 'distribution', name: '直方图', navigationLabel: '直方图', dataShape: 'raw-values', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { arrangement: 'regular' },
      fields: ['binMode', 'binCount', 'binWidth', 'roundTopV']
    },
    stackedHistogram: {
      family: 'distribution', name: '堆叠直方图', navigationLabel: '堆叠直方', dataShape: 'raw-values', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { arrangement: 'stacked' },
      fields: ['binMode', 'binCount', 'binWidth', 'roundTopV']
    },
    comboChart: {
      family: 'combo', name: '柱线混合图', navigationLabel: '柱线混合', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { axes: 'shared', marks: 'bar-line' },
      fields: ['seriesStyles', 'axisAssignment', 'lineType', 'groupMarginV', 'groupRoundTopV', 'lineWidth', 'dotType', 'dotDiameter']
    },
    dualBarChart: {
      family: 'combo', name: '双轴柱状图', navigationLabel: '双轴柱状', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { axes: 'dual', marks: 'bar-bar' },
      fields: ['seriesStyles', 'axisAssignment', 'groupMarginV', 'groupInnerGapV', 'groupRoundTopV']
    },
    dualLineBarChart: {
      family: 'combo', name: '双轴折线柱状图', navigationLabel: '双轴折线柱状', dataShape: 'category-series', capabilities: ['axes', 'legend', 'dataLabels'],
      variant: { axes: 'dual', marks: 'bar-line' },
      fields: ['seriesStyles', 'axisAssignment', 'lineType', 'groupMarginV', 'groupRoundTopV', 'lineWidth', 'dotType', 'dotDiameter']
    },
    pieChart: {
      family: 'part-to-whole', name: '饼图', navigationLabel: '饼图', dataShape: 'category-value', capabilities: ['legend', 'dataLabels', 'polar'],
      variant: { shape: 'pie' },
      fields: ['sorting', 'typeOfCircle', 'segmentGap', 'spiderLabels']
    },
    donutChart: {
      family: 'part-to-whole', name: '环形图', navigationLabel: '环形图', dataShape: 'category-value', capabilities: ['legend', 'dataLabels', 'polar'],
      variant: { shape: 'donut' },
      fields: ['sorting', 'typeOfCircle', 'segmentGap', 'spiderLabels', 'thicknessOfDonut']
    },
    progressChart: {
      family: 'kpi', name: '进度图', navigationLabel: '进度图', dataShape: 'scalar', capabilities: ['polar'],
      variant: { shape: 'full-ring' },
      fields: ['typeOfCircle', 'thicknessOfProgress', 'progressBgColor', 'endOfLine']
    },
    sparkline: {
      family: 'sparkline', name: '迷你图', navigationLabel: '迷你图', dataShape: 'category-series', capabilities: [],
      variant: { mark: 'line' },
      fields: ['sparkLineWidth', 'sparkDotDiameter']
    },
    scatterPlot: {
      family: 'relationship', name: '散点图', navigationLabel: '散点图', dataShape: 'xy-points', capabilities: ['axes', 'legend'],
      variant: { mark: 'scatter' },
      fields: ['scatterDotDiameter']
    },
    candlestickChart: {
      family: 'finance', name: 'K 线图', navigationLabel: 'K 线图', dataShape: 'ohlc', capabilities: ['axes'],
      variant: { mark: 'candlestick' },
      fields: ['candleMargin']
    },
    radarChart: {
      family: 'polar-comparison', name: '雷达图', navigationLabel: '雷达图', dataShape: 'category-series', capabilities: ['polar', 'legend'],
      variant: { grid: 'polygon' }, fields: ['radarLevels', 'radarFillOpacity', 'radarGridShape']
    },
    funnelChart: {
      family: 'process', name: '漏斗图', navigationLabel: '漏斗图', dataShape: 'category-value', capabilities: ['legend'],
      variant: { shape: 'standard' }, fields: ['funnelGap', 'labelPosition']
    },
    heatmap: {
      family: 'matrix', name: '热力图', navigationLabel: '热力图', dataShape: 'matrix', capabilities: ['legend'],
      variant: { layout: 'matrix' }, fields: ['colorScale', 'cellGap', 'showValues']
    },
    treemap: {
      family: 'hierarchy', name: '矩形树图', navigationLabel: '树图', dataShape: 'hierarchy', capabilities: ['legend'],
      variant: { layout: 'squarified' }, fields: ['hierarchyFields', 'tileGap']
    }
  };

  // 图表分类中台：主图表决定数据模型；variant 只决定数据转换与几何拓扑；
  // modifier 只决定视觉渲染。旧 chart id 继续作为渲染协议，避免破坏 Sketch 原生层。
  var taxonomy = {
    groups: [
      { id: 'trend', name: '趋势', bases: ['line', 'area'] },
      { id: 'comparison', name: '对比', bases: ['column', 'bar', 'scatter', 'bubble'] },
      { id: 'composition', name: '占比', bases: ['pie', 'donut', 'treemap'] },
      { id: 'progress', name: '进程', bases: ['gauge', 'progressIndicator'] },
      { id: 'multi', name: '多维', bases: ['radar', 'funnel'] },
      { id: 'combo', name: '组合图', bases: ['combo'] },
      { id: 'extended', name: '更多', bases: ['stream', 'sparkline', 'histogram', 'heatmap', 'candlestick'] }
    ],
    bases: {
      line: {
        name: '折线图', iconChart: 'lineChart', defaultVariant: 'single', dataShape: 'category-series',
        variants: [
          { id: 'single', name: '基础单系列', chartType: 'lineChart', dataPreset: { categories: 1 }, fixedCategories: true },
          { id: 'multiple', name: '多系列对比', chartType: 'lineChart', dataPreset: { categories: 3 } }
        ],
        modifiers: ['lineType', 'lineWidth', 'dotType', 'dotDiameter']
      },
      area: {
        name: '面积图', iconChart: 'areaChart', defaultVariant: 'single', dataShape: 'category-series',
        variants: [
          { id: 'single', name: '基础单系列', chartType: 'areaChart', dataPreset: { categories: 1 }, fixedCategories: true },
          { id: 'multiple', name: '多系列对比', chartType: 'areaChart', dataPreset: { categories: 3 } },
          { id: 'stacked', name: '堆叠面积图', chartType: 'stackedAreaChart', dataPreset: { categories: 3 } },
          { id: 'percent', name: '百分比堆叠面积图', chartType: 'percentStackedAreaChart', dataPreset: { categories: 3 } },
          { id: 'range', name: '区间范围带面积图', chartType: 'areaChart', disabled: true, note: '渲染内核待支持区间上下界' }
        ],
        modifiers: ['lineType', 'areaFillStyle', 'areaOpacity', 'areaLineWidth']
      },
      column: {
        name: '柱状图', iconChart: 'verticalBarChart', defaultVariant: 'basic', dataShape: 'category-series',
        variants: [
          { id: 'basic', name: '基础单柱', chartType: 'verticalBarChart', dataPreset: { categories: 1 }, fixedCategories: true },
          { id: 'grouped', name: '分组并列', chartType: 'groupedBarChart', dataPreset: { categories: 3 } },
          { id: 'stacked', name: '堆叠', chartType: 'verticalBarChart', dataPreset: { categories: 3 } },
          { id: 'percent', name: '百分比堆叠', chartType: 'percentStackedVerticalBarChart', dataPreset: { categories: 3 } },
          { id: 'diverging', name: '正负双向', chartType: 'verticalBarChart', disabled: true, note: '渲染内核待支持负值柱' }
        ],
        modifiers: ['marginV', 'stackGapV', 'roundTopV', 'groupMarginV', 'groupInnerGapV', 'groupRoundTopV']
      },
      bar: {
        name: '条形图', iconChart: 'horizontalBarChart', defaultVariant: 'basic', dataShape: 'category-series',
        variants: [
          { id: 'basic', name: '基础单条', chartType: 'horizontalBarChart', dataPreset: { categories: 1 }, fixedCategories: true },
          { id: 'grouped', name: '分组并列', chartType: 'groupedHorizontalBarChart', dataPreset: { categories: 3 } },
          { id: 'stacked', name: '堆叠', chartType: 'horizontalBarChart', dataPreset: { categories: 3 } },
          { id: 'percent', name: '百分比堆叠', chartType: 'percentStackedHorizontalBarChart', dataPreset: { categories: 3 } },
          { id: 'diverging', name: '正负双向', chartType: 'horizontalBarChart', disabled: true, note: '渲染内核待支持负值条' }
        ],
        modifiers: ['marginH', 'stackGapH', 'roundTopH', 'groupMarginH', 'groupInnerGapH', 'groupRoundTopH']
      },
      scatter: { name: '散点图', iconChart: 'scatterPlot', defaultVariant: 'xy', dataShape: 'xy-points', variants: [{ id: 'xy', name: '二维散点', chartType: 'scatterPlot' }], modifiers: ['scatterDotDiameter'] },
      bubble: { name: '气泡图', iconChart: 'scatterPlot', defaultVariant: 'weighted', dataShape: 'xy-points', variants: [{ id: 'weighted', name: '权重气泡', chartType: 'scatterPlot' }], modifiers: ['scatterDotDiameter'] },
      pie: {
        name: '饼图', iconChart: 'pieChart', defaultVariant: 'full', dataShape: 'category-value',
        variants: [
          { id: 'full', name: '全圆占比', chartType: 'pieChart', set: { typeOfCircle: '0' } },
          { id: 'half', name: '半圆占比', chartType: 'pieChart', set: { typeOfCircle: '1' } },
          { id: 'nested', name: '嵌套同心环', chartType: 'pieChart', disabled: true, note: '渲染内核待支持多层半径' }
        ],
        modifiers: ['sorting', 'segmentGap', 'spiderLabels']
      },
      donut: {
        name: '环图', iconChart: 'donutChart', defaultVariant: 'full', dataShape: 'category-value',
        variants: [
          { id: 'full', name: '全圆占比', chartType: 'donutChart', set: { typeOfCircle: '0' } },
          { id: 'half', name: '半圆占比', chartType: 'donutChart', set: { typeOfCircle: '1' } },
          { id: 'nested', name: '嵌套同心环', chartType: 'donutChart', disabled: true, note: '渲染内核待支持多层半径' }
        ],
        modifiers: ['thicknessOfDonut', 'sorting', 'segmentGap', 'spiderLabels']
      },
      treemap: { name: '矩形树图', iconChart: 'treemap', defaultVariant: 'flat', dataShape: 'hierarchy', variants: [{ id: 'flat', name: '平铺树图', chartType: 'treemap' }, { id: 'nested', name: '嵌套树图', chartType: 'treemap', disabled: true, note: '渲染内核待支持多层布局' }], modifiers: ['tileGap'] },
      gauge: { name: '仪表盘', iconChart: 'progressChart', defaultVariant: 'continuous', dataShape: 'scalar', variants: [{ id: 'continuous', name: '连续刻度', chartType: 'progressChart', set: { typeOfCircle: '1' } }, { id: 'segmented', name: '分段刻度', chartType: 'progressChart', disabled: true, note: '渲染内核待支持刻度分段' }], modifiers: ['thicknessOfProgress', 'progressBgColor', 'endOfLine'] },
      progressIndicator: { name: '进度条 / 环', iconChart: 'progressChart', defaultVariant: 'continuous', dataShape: 'scalar', variants: [{ id: 'continuous', name: '连续单指标', chartType: 'progressChart', set: { typeOfCircle: '0' } }, { id: 'steps', name: '步进 / 分段', chartType: 'progressChart', disabled: true, note: '渲染内核待支持步进分段' }], modifiers: ['thicknessOfProgress', 'progressBgColor', 'endOfLine'] },
      radar: { name: '雷达图', iconChart: 'radarChart', defaultVariant: 'single', dataShape: 'category-series', variants: [{ id: 'single', name: '单指标画像', chartType: 'radarChart', dataPreset: { categories: 1 }, fixedCategories: true }, { id: 'multiple', name: '多主体对比', chartType: 'radarChart', dataPreset: { categories: 3 } }], modifiers: ['radarGridShape', 'radarLevels', 'radarFillOpacity'] },
      funnel: { name: '漏斗图', iconChart: 'funnelChart', defaultVariant: 'trapezoid', dataShape: 'category-value', variants: [{ id: 'trapezoid', name: '梯形平铺', chartType: 'funnelChart', set: { funnelShape: 'standard' } }, { id: 'symmetric', name: '分段对称', chartType: 'funnelChart', set: { funnelShape: 'rectangular' } }], modifiers: ['funnelGap', 'labelPosition'] },
      combo: { name: '柱线混合', iconChart: 'comboChart', defaultVariant: 'bar-line', dataShape: 'category-series-measures', variants: [{ id: 'bar-line', name: '柱线混合', chartType: 'comboChart' }, { id: 'dual-bar', name: '双轴柱状', chartType: 'dualBarChart' }, { id: 'dual-line-bar', name: '双轴折线柱', chartType: 'dualLineBarChart' }], modifiers: ['axisAssignment', 'lineType', 'lineWidth', 'dotType', 'dotDiameter', 'groupMarginV', 'groupInnerGapV', 'groupRoundTopV'] },
      stream: { name: '流图', iconChart: 'streamGraph', defaultVariant: 'default', variants: [{ id: 'default', name: '标准流图', chartType: 'streamGraph' }], modifiers: ['lineType', 'areaOpacity'] },
      sparkline: { name: '迷你图', iconChart: 'sparkline', defaultVariant: 'default', variants: [{ id: 'default', name: '标准迷你图', chartType: 'sparkline' }], modifiers: ['sparkLineWidth', 'sparkDotDiameter'] },
      histogram: { name: '直方图', iconChart: 'histogram', defaultVariant: 'regular', variants: [{ id: 'regular', name: '基础直方图', chartType: 'histogram' }, { id: 'stacked', name: '堆叠直方图', chartType: 'stackedHistogram' }], modifiers: ['binMode', 'binCount', 'binWidth', 'roundTopV'] },
      heatmap: { name: '热力图', iconChart: 'heatmap', defaultVariant: 'matrix', variants: [{ id: 'matrix', name: '矩阵热力', chartType: 'heatmap' }], modifiers: ['colorScale', 'cellGap', 'showValues'] },
      candlestick: { name: 'K 线图', iconChart: 'candlestickChart', defaultVariant: 'ohlc', variants: [{ id: 'ohlc', name: 'OHLC 蜡烛', chartType: 'candlestickChart' }], modifiers: ['candleMargin'] }
    }
  };

  function getTaxonomy(){ return clone(taxonomy); }
  function getTaxonomyBase(baseId){ return clone(taxonomy.bases[baseId] || null); }
  function findTaxonomySelection(chartId, variantId){
    var candidates = [];
    taxonomy.groups.forEach(function(group){
      group.bases.forEach(function(baseId){
        var base = taxonomy.bases[baseId];
        if (!base) return;
        base.variants.forEach(function(variant){
          if (variant.chartType !== chartId) return;
          if (variantId && variant.id !== variantId) return;
          candidates.push({
            baseId: baseId,
            variantId: variant.id,
            chartType: variant.chartType,
            disabled: !!variant.disabled,
            isDefault: base.defaultVariant === variant.id
          });
        });
      });
    });
    if (!candidates.length) return null;
    candidates.sort(function(a, b){
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      if (chartId === 'progressChart') {
        if (a.baseId === 'progressIndicator') return -1;
        if (b.baseId === 'progressIndicator') return 1;
      }
      if (chartId === 'scatterPlot') {
        if (a.baseId === 'scatter') return -1;
        if (b.baseId === 'scatter') return 1;
      }
      return 0;
    });
    return {
      baseId: candidates[0].baseId,
      variantId: candidates[0].variantId,
      chartType: candidates[0].chartType
    };
  }
  function getDisplayVariants(chartId){
    var selection = findTaxonomySelection(chartId);
    return selection ? clone(taxonomy.bases[selection.baseId].variants) : [];
  }

  var planned = {
    waterfallChart: { name: '瀑布图', family: 'comparison', dataShape: 'category-value', status: 'planned', priority: 1, variants: ['vertical', 'horizontal'], fields: ['positiveColor', 'negativeColor', 'totalColor'] },
    boxPlot: { name: '箱线图', family: 'distribution', dataShape: 'raw-values-by-group', status: 'planned', priority: 2, variants: ['vertical', 'horizontal'], fields: ['showOutliers'] },
    sankey: { name: '桑基图', family: 'flow', dataShape: 'source-target', status: 'planned', priority: 2, variants: ['left-to-right'], fields: ['sourceField', 'targetField', 'flowField'] },
    gantt: { name: '甘特图', family: 'schedule', dataShape: 'interval', status: 'planned', priority: 2, variants: ['timeline'], fields: ['taskField', 'startField', 'endField'] }
  };

  // 业务目的（导航筛选唯一事实来源）：顶部 chips 与左侧图族都从这里派生，
  // 成员按图族聚合，不再单独维护第二套分类。
  var purposes = [
    { id: 'trend', name: '趋势', charts: ['lineChart', 'areaChart', 'stackedAreaChart', 'percentStackedAreaChart', 'streamGraph', 'sparkline'] },
    { id: 'comparison', name: '对比', charts: ['verticalBarChart', 'horizontalBarChart', 'percentStackedVerticalBarChart', 'percentStackedHorizontalBarChart', 'groupedBarChart', 'groupedHorizontalBarChart', 'histogram', 'stackedHistogram', 'comboChart', 'dualBarChart', 'dualLineBarChart'] },
    { id: 'proportion', name: '构成', charts: ['pieChart', 'donutChart', 'treemap'] },
    { id: 'kpi', name: '指标与进度', charts: ['progressChart'] },
    { id: 'multi', name: '多维与金融', charts: ['radarChart', 'candlestickChart'] },
    { id: 'relation', name: '关系与流动', charts: ['scatterPlot', 'heatmap', 'funnelChart'] }
  ];

  function getPurposes(){
    return clone(purposes);
  }

  var navigationGroups = [
    { family: 'line', name: '折线图族', charts: ['lineChart'] },
    { family: 'area', name: '面积图族', charts: ['areaChart', 'stackedAreaChart', 'percentStackedAreaChart'] },
    { family: 'stream', name: '流图族', charts: ['streamGraph'] },
    { family: 'bar', name: '柱状图族', charts: ['verticalBarChart', 'horizontalBarChart', 'percentStackedVerticalBarChart', 'percentStackedHorizontalBarChart', 'groupedBarChart', 'groupedHorizontalBarChart'] },
    { family: 'distribution', name: '直方图族', charts: ['histogram', 'stackedHistogram'] },
    { family: 'combo', name: '组合图族', charts: ['comboChart', 'dualBarChart', 'dualLineBarChart'] },
    { family: 'part-to-whole', name: '饼环图族', charts: ['pieChart', 'donutChart'] },
    { family: 'kpi', name: '进度图族', charts: ['progressChart'] },
    { family: 'sparkline', name: '迷你图族', charts: ['sparkline'] },
    { family: 'relationship', name: '关系图族', charts: ['scatterPlot'] },
    { family: 'finance', name: '金融图族', charts: ['candlestickChart'] },
    { family: 'polar', name: '极坐标图族', charts: ['radarChart'] },
    { family: 'flow', name: '流程图族', charts: ['funnelChart'] },
    { family: 'matrix', name: '矩阵图族', charts: ['heatmap'] },
    { family: 'hierarchy', name: '层级图族', charts: ['treemap'] }
  ];

  var dataRules = {
    lineChart: { categories: { visible: true, label: '线条数', value: 1 }, items: { visible: true, label: '数据点数', value: 5 } },
    areaChart: { categories: { visible: true, label: '面积数', value: 1 }, items: { visible: true, label: '数据点数', value: 7 } },
    stackedAreaChart: { categories: { visible: true, label: '面积数', value: 3 }, items: { visible: true, label: '数据点数', value: 7 } },
    percentStackedAreaChart: { categories: { visible: true, label: '面积数', value: 3 }, items: { visible: true, label: '数据点数', value: 7 } },
    streamGraph: { categories: { visible: true, label: '面积数', value: 2 }, items: { visible: true, label: '数据点数', value: 5 } },
    verticalBarChart: { categories: { visible: true, label: '分类数', value: 1 }, items: { visible: true, label: '柱数', value: 5 } },
    horizontalBarChart: { categories: { visible: true, label: '分类数', value: 1 }, items: { visible: true, label: '柱数', value: 5 } },
    percentStackedVerticalBarChart: { categories: { visible: true, label: '分类数', value: 3 }, items: { visible: true, label: '柱数', value: 5 } },
    percentStackedHorizontalBarChart: { categories: { visible: true, label: '分类数', value: 3 }, items: { visible: true, label: '条数', value: 5 } },
    groupedBarChart: { categories: { visible: true, label: '分类数', value: 2 }, items: { visible: true, label: '柱数', value: 5 } },
    groupedHorizontalBarChart: { categories: { visible: true, label: '分类数', value: 2 }, items: { visible: true, label: '柱数', value: 5 } },
    histogram: { categories: { visible: true, label: '数据组数', value: 1 }, items: { visible: true, label: '样本数', value: 24 } },
    stackedHistogram: { categories: { visible: true, label: '数据组数', value: 3 }, items: { visible: true, label: '样本数', value: 24 } },
    comboChart: { categories: { visible: true, label: '系列数', value: 2 }, items: { visible: true, label: '数据点数', value: 7 } },
    dualBarChart: { categories: { visible: true, label: '系列数', value: 2 }, items: { visible: true, label: '分类数', value: 7 } },
    dualLineBarChart: { categories: { visible: true, label: '系列数', value: 2 }, items: { visible: true, label: '数据点数', value: 7 } },
    pieChart: { categories: { visible: false, label: '饼图数', value: 1 }, items: { visible: true, label: '扇区数', value: 5 } },
    donutChart: { categories: { visible: false, label: '环形图数', value: 1 }, items: { visible: true, label: '扇区数', value: 5 } },
    progressChart: { categories: { visible: false, label: '进度图数', value: 1 }, items: { visible: false, label: '值', value: 1 } },
    sparkline: { categories: { visible: false, label: '迷你图数', value: 1 }, items: { visible: true, label: '数据点数', value: 20 } },
    scatterPlot: { categories: { visible: false, label: '坐标轴', value: 2 }, items: { visible: true, label: '数据点数', value: 20 }, seriesLabels: ['X', 'Y'] },
    candlestickChart: { categories: { visible: false, label: '数据参数', value: 4 }, items: { visible: true, label: '蜡烛数', value: 20 }, seriesLabels: ['开', '高', '低', '收'] }
    ,radarChart: { categories: { visible: true, label: '系列数', value: 2 }, items: { visible: true, label: '维度数', value: 6 } }
    ,funnelChart: { categories: { visible: false, label: '漏斗数', value: 1 }, items: { visible: true, label: '阶段数', value: 5 } }
    ,heatmap: { categories: { visible: true, label: '行数', value: 5 }, items: { visible: true, label: '列数', value: 7 } }
    ,treemap: { categories: { visible: false, label: '树图数', value: 1 }, items: { visible: true, label: '区块数', value: 6 } }
  };

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function chart(id){ return charts[id] || null; }
  function fieldAvailable(fieldId, chartId, state){
    var item = F[fieldId];
    var current = chart(chartId);
    if (!item || !current) return false;
    if (item.capability) return current.capabilities.indexOf(item.capability) >= 0;
    var baseId = state && state.taxonomyBaseId;
    var base = baseId && taxonomy.bases[baseId];
    if (base) return base.modifiers.indexOf(fieldId) >= 0 && current.fields.indexOf(fieldId) >= 0;
    return current.fields.indexOf(fieldId) >= 0;
  }
  function visible(fieldId, chartId, advanced, state){
    var item = F[fieldId];
    if (!fieldAvailable(fieldId, chartId, state)) return false;
    if (item.tier === 'advanced' && !advanced) return false;
    return !item.when || item.when(state || {}, chartId);
  }
  function fieldIds(chartId, advanced, state){
    var current = chart(chartId);
    if (!current) return [];
    return Object.keys(F).filter(function(id){ return visible(id, chartId, advanced, state); });
  }
  function hasAdvancedFields(chartId, state){
    return fieldIds(chartId, true, state).some(function(id){ return F[id].tier === 'advanced'; });
  }
  function applyInspector(root, chartId, advanced, state){
    if (!root) return [];
    var visibleIds = [];
    Array.prototype.slice.call(root.querySelectorAll('.settings-section')).forEach(function(section){
      var sectionVisible = false;
      Array.prototype.slice.call(section.querySelectorAll('.settings_input_item')).forEach(function(field){
        var show = visible(field.id, chartId, advanced, state || {});
        field.style.display = show ? (field.classList.contains('area-style-picker') ? 'block' : 'grid') : 'none';
        field.setAttribute('aria-hidden', show ? 'false' : 'true');
        if (show) {
          sectionVisible = true;
          visibleIds.push(field.id);
        }
      });
      section.style.display = sectionVisible ? 'block' : 'none';
      section.setAttribute('aria-hidden', sectionVisible ? 'false' : 'true');
    });
    return visibleIds;
  }
  function getDataRules(chartId, taxonomySelection){
    var rules = clone(dataRules[chartId] || dataRules.lineChart);
    if (chartId === 'scatterPlot' && taxonomySelection && taxonomySelection.baseId === 'bubble') {
      rules.categories.value = 3;
      rules.seriesLabels = ['X', 'Y', '权重'];
    }
    return rules;
  }
  function templateChartFields(chartId){
    var map = {
      lineChart: ['lineType','lineWidth','dotType','dotDiameter'],
      areaChart: ['lineType','areaFillStyle','areaOpacity','areaLineWidth'],
      stackedAreaChart: ['lineType','areaFillStyle','areaOpacity','areaLineWidth'],
      percentStackedAreaChart: ['lineType','areaFillStyle','areaOpacity','areaLineWidth'],
      streamGraph: ['lineType','areaOpacity'],
      verticalBarChart: ['marginV','stackGapV','roundTopV'], percentStackedVerticalBarChart: ['marginV','stackGapV','roundTopV'], horizontalBarChart: ['marginH','stackGapH','roundTopH'], percentStackedHorizontalBarChart: ['marginH','stackGapH','roundTopH'],
      groupedBarChart: ['groupMarginV','groupInnerGapV','groupRoundTopV'], groupedHorizontalBarChart: ['groupMarginH','groupInnerGapH','groupRoundTopH'],
      histogram: ['binMode','binCount','binWidth','roundTopV'], stackedHistogram: ['binMode','binCount','binWidth','roundTopV'],
      comboChart: ['seriesStyles','lineType','groupMarginV','groupRoundTopV','lineWidth','dotType','dotDiameter'],
      dualBarChart: ['seriesStyles','groupMarginV','groupInnerGapV','groupRoundTopV'],
      dualLineBarChart: ['seriesStyles','lineType','groupMarginV','groupRoundTopV','lineWidth','dotType','dotDiameter'],
      pieChart: ['sorting','typeOfCircle','segmentGap','spiderLabels'], donutChart: ['sorting','typeOfCircle','segmentGap','spiderLabels','thicknessOfDonut'],
      progressChart: ['typeOfCircle','thicknessOfProgress','progressBgColor','progressColor','endOfLine'],
      sparkline: ['sparkLineWidth','sparkDotDiameter','sparklineColor'], scatterPlot: ['scatterDotDiameter','scatterColor'],
      candlestickChart: ['candleMargin','candleUp','candleDown'],
      radarChart: ['radarLevels','radarFillOpacity','radarGridShape'],
      funnelChart: ['funnelGap','funnelShape','labelPosition'],
      heatmap: ['colorScale','cellGap','showValues'],
      treemap: ['hierarchyFields','tileGap']
    };
    return map[chartId] || [];
  }

  // 尺寸预设：中台统一输出，预览联动与创建输出共用同一份定义
  // [id, 名称, 宽, 高]；看板模块应大于桌面卡片（修正旧值 480×280 比桌面还小的错误）
  var sizePresets = [
    ['mobile', '移动卡片', 320, 200],
    ['desktop', '桌面卡片', 600, 360],
    ['dashboard', '看板模块', 800, 480]
  ];
  function getSizePresets(){ return clone(sizePresets); }

  global.XChartFormSchema = {
    fields: F,
    dataShapes: dataShapes,
    families: families,
    charts: charts,
    plannedCharts: planned,
    navigationGroups: navigationGroups,
    axesCharts: AXES,
    getChart: chart,
    isFieldVisible: visible,
    getFieldIds: fieldIds,
    hasAdvancedFields: hasAdvancedFields,
    applyInspector: applyInspector,
    getDataRules: getDataRules,
    getDisplayVariants: getDisplayVariants,
    taxonomy: taxonomy,
    getTaxonomy: getTaxonomy,
    getTaxonomyBase: getTaxonomyBase,
    findTaxonomySelection: findTaxonomySelection,
    getPurposes: getPurposes,
    getSizePresets: getSizePresets,
    getTemplateChartFields: templateChartFields,
    getCommonTemplateFields: function(){
      return ['grid','gridLineWidth','gridColor','yAxisSegments','labels','labelFontName','labelFontSize','labelColor','separateAxisStyles',
        'xAxisLabels','xAxisLine','xAxisTicks','xAxisFontSize','xAxisLineColor','xAxisColor',
        'yAxisLabels','yAxisLine','yAxisTicks','yAxisFontSize','yAxisLineColor','yAxisColor','beginAtZero'];
    }
  };
})(window);
