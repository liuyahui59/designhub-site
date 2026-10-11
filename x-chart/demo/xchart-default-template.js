/*
 * Single source of truth for the built-in Apple chart template.
 *
 * The browser entry points load this file before their page logic. Native
 * Sketch entry points receive the same values from the generated bundle.
 * Call create() whenever a mutable copy is needed.
 */
(function (root) {
  'use strict';

  var DEFAULT_TEMPLATE = {
    name: 'Default template',
    id: 0,
    templateVersion: 3,
    colors: {
      common: ['#0a84ff', '#30b0c7', '#ff9f0a', '#ff375f', '#5e5ce6', '#34c759'],
      progressChart: ['#0a84ff'],
      sparkline: ['#0a84ff'],
      scatterPlot: ['#0a84ff', '#30b0c7', '#ff9f0a', '#ff375f', '#5e5ce6', '#34c759'],
      candlestickChart: ['#da1e28', '#198038']
    },
    grid: { type: 1, lineWidth: 1, color: '#e0e0e0', yAxisSegments: 0 },
    labels: {
      type: 1,
      fontName: 'IBM Plex Sans',
      fontSize: 12,
      color: '#525252',
      yAxisPosition: 'left',
      xAxisPosition: 'bottom',
      xAxis: { line: true, ticks: true, fontSize: 12, color: '#525252' },
      yAxis: { line: true, ticks: true, fontSize: 12, color: '#525252' }
    },
    beginAtZero: 0,
    lineType: 0,
    spiderLabels: false,
    histogram: { binMode: 'auto', binCount: 8, binWidth: 0 },
    combo: { axisAssignment: 'auto', margin: 0.24, innerGap: 0.12, roundTop: 0 },
    sorting: 0,
    typeOfCircle: 0,
    segmentGap: 0,
    interaction: { showValueTooltip: true },
    lineChart: { lineWidth: 1.5, dotType: 1, dotDiameter: 5 },
    areaChart: { lineWidth: 2, opacity: 0.22, fillStyle: 'gradient-line' },
    verticalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0, useOneColor: false },
    horizontalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0, useOneColor: false },
    percentStackedVerticalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0 },
    percentStackedHorizontalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0 },
    groupedBarChart: { margin: 0.2, innerGap: 0.12, roundTop: 0 },
    groupedHorizontalBarChart: { margin: 0.2, innerGap: 0.12, roundTop: 0 },
    donutChart: { thicknessOfDonut: 28 },
    progressChart: { backgroundColor: '#e0e0e0', thicknessOfProgress: 12, endOfLine: 1 },
    sparkline: { lineWidth: 1.5, dotDiameter: 4 },
    scatterPlot: { dotDiameter: 7 },
    candlestickChart: { margin: 0.2, unfilledNegativeBoxes: false }
  };

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === 'object') {
      var copy = {};
      Object.keys(value).forEach(function (key) { copy[key] = clone(value[key]); });
      return copy;
    }
    return value;
  }

  root.XChartDefaultTemplate = {
    version: 3,
    value: DEFAULT_TEMPLATE,
    palette: DEFAULT_TEMPLATE.colors.common,
    create: function () { return clone(DEFAULT_TEMPLATE); }
  };
}(typeof window !== 'undefined' ? window : this));
