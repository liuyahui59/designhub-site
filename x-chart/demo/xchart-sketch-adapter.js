/* Sketch adapter for XChartCore Scene. No chart calculations belong here. */
var XChartSketchAdapter = (function () {
  'use strict';

  function number(value) { return Math.round(Number(value) * 1000) / 1000; }
  function pointOnArc(cx, cy, radius, angle) { return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }; }

  function commandsToSvg(commands, offsetX, offsetY) {
    return (commands || []).map(function (command) {
      if (command.op === 'M' || command.op === 'L') return command.op + ' ' + number(command.x + offsetX) + ' ' + number(command.y + offsetY);
      if (command.op === 'C') return 'C ' + [command.c1x + offsetX, command.c1y + offsetY, command.c2x + offsetX, command.c2y + offsetY, command.x + offsetX, command.y + offsetY].map(number).join(' ');
      return 'Z';
    }).join(' ');
  }

  function arcToSvg(node, offsetX, offsetY) {
    if (node.gap > 0) {
      var halfGap = node.gap / 2;
      var outerInset = Math.asin(Math.min(1, halfGap / node.outerRadius));
      var start = node.startAngle + outerInset;
      var end = node.endAngle - outerInset;
      var outerStart = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.outerRadius, start);
      var outerEnd = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.outerRadius, end);
      var path = ['M', outerStart.x, outerStart.y, 'A', node.outerRadius, node.outerRadius, 0, end - start > Math.PI ? 1 : 0, 1, outerEnd.x, outerEnd.y];
      if (node.innerRadius > 0) {
        var innerInset = Math.asin(Math.min(1, halfGap / node.innerRadius));
        var innerEnd = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.endAngle - innerInset);
        var innerStart = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.startAngle + innerInset);
        path.push('L', innerEnd.x, innerEnd.y, 'A', node.innerRadius, node.innerRadius, 0, node.endAngle - node.startAngle - 2 * innerInset > Math.PI ? 1 : 0, 0, innerStart.x, innerStart.y);
      } else {
        var tipRadius = halfGap / Math.sin((node.endAngle - node.startAngle) / 2);
        var tip = pointOnArc(node.cx + offsetX, node.cy + offsetY, tipRadius, (node.startAngle + node.endAngle) / 2);
        path.push('L', tip.x, tip.y);
      }
      path.push('Z');
      return path.map(numberOrString).join(' ');
    }
    var delta = node.endAngle - node.startAngle;
    var full = Math.abs(delta) >= Math.PI * 2 - 0.0001;
    var sweep = delta >= 0 ? 1 : 0;
    var large = Math.abs(delta) > Math.PI ? 1 : 0;
    var outerStart = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.outerRadius, node.startAngle);
    var outerEnd = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.outerRadius, node.endAngle);
    if (full) {
      var middle = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.outerRadius, node.startAngle + delta / 2);
      if (node.innerRadius > 0) {
        var innerEnd = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.endAngle);
        var innerMiddle = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.endAngle - delta / 2);
        var innerStart = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.startAngle);
        return ['M', outerStart.x, outerStart.y, 'A', node.outerRadius, node.outerRadius, 0, 1, sweep, middle.x, middle.y, 'A', node.outerRadius, node.outerRadius, 0, 1, sweep, outerEnd.x, outerEnd.y, 'L', innerEnd.x, innerEnd.y, 'A', node.innerRadius, node.innerRadius, 0, 1, sweep ? 0 : 1, innerMiddle.x, innerMiddle.y, 'A', node.innerRadius, node.innerRadius, 0, 1, sweep ? 0 : 1, innerStart.x, innerStart.y, 'Z'].map(numberOrString).join(' ');
      }
      return ['M', outerStart.x, outerStart.y, 'A', node.outerRadius, node.outerRadius, 0, 1, sweep, middle.x, middle.y, 'A', node.outerRadius, node.outerRadius, 0, 1, sweep, outerEnd.x, outerEnd.y].map(numberOrString).join(' ');
    }
    var path = ['M', outerStart.x, outerStart.y, 'A', node.outerRadius, node.outerRadius, 0, large, sweep, outerEnd.x, outerEnd.y];
    if (node.innerRadius > 0) {
      var innerFinish = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.endAngle);
      var innerBeginning = pointOnArc(node.cx + offsetX, node.cy + offsetY, node.innerRadius, node.startAngle);
      path.push('L', innerFinish.x, innerFinish.y, 'A', node.innerRadius, node.innerRadius, 0, large, sweep ? 0 : 1, innerBeginning.x, innerBeginning.y, 'Z');
    } else if (node.style && node.style.fill) path.push('L', node.cx + offsetX, node.cy + offsetY, 'Z');
    return path.map(numberOrString).join(' ');
  }
  function numberOrString(value) { return typeof value === 'number' ? number(value) : value; }

  function shapeFromSvg(sketch, pathData) {
    var ShapePath = sketch.ShapePath;
    var version = parseInt(String(sketch.version.sketch).match(/\d+/)[0], 10);
    if (version < 58) return ShapePath.fromSVGPath(pathData);
    return new ShapePath({ sketchObject: MSShapePathLayer.layerWithPath(MSPath.pathWithBezierPath(SVGPathInterpreter.bezierPathFromCommands(pathData))) });
  }

  function sketchStyle(style, sketch) {
    style = style || {};
    var result = { fills: [], borders: [] };
    if (style.fillGradient) {
      result.fills = [{
        fillType: 'Gradient',
        enabled: true,
        gradient: {
          gradientType: 'Linear',
          from: { x: style.fillGradient.x1 == null ? 0 : style.fillGradient.x1, y: style.fillGradient.y1 == null ? 0 : style.fillGradient.y1 },
          to: { x: style.fillGradient.x2 == null ? 1 : style.fillGradient.x2, y: style.fillGradient.y2 == null ? 1 : style.fillGradient.y2 },
          stops: (style.fillGradient.stops || []).map(function (stop) {
            return { position: Number(stop.offset) || 0, color: stop.color };
          })
        }
      }];
    } else if (style.fill) result.fills = [style.fill];
    if (style.stroke) result.borders = [{ color: style.stroke, thickness: style.strokeWidth == null ? 1 : style.strokeWidth }];
    else result.borders = [{ enabled: false }];
    if ((style.lineCap === 'round' || style.lineJoin === 'round') && sketch.Style) {
      result.borderOptions = {};
      if (style.lineCap === 'round') result.borderOptions.lineEnd = sketch.Style.LineEnd.Round;
    }
    return result;
  }

  function renderNode(node, options) {
    var sketch = options.sketch;
    var Rectangle = sketch.Rectangle;
    var ShapePath = sketch.ShapePath;
    var offsetX = options.offsetX || 0;
    var offsetY = options.offsetY || 0;
    var layer;
    if (node.kind === 'text') {
      layer = new sketch.Text({
        fixedWidth: false,
        frame: new Rectangle(node.x + offsetX, node.y + offsetY - (node.style.baseline === 'middle' ? 8 : 0), 1, Math.max(18, (node.style.fontSize || 12) * 1.5)),
        text: node.text,
        style: {
          fontSize: node.style.fontSize || 12,
          fontFamily: node.style.fontName || 'IBM Plex Sans',
          textColor: node.style.fill || '#161616',
          alignment: node.style.align === 'center' ? 'center' : node.style.align === 'right' ? 'right' : 'left',
          fills: [], borders: [{ enabled: false }]
        }
      });
      if (typeof layer.adjustToFit === 'function') layer.adjustToFit();
      var textWidth = layer.frame.width;
      if (node.style.align === 'center') layer.frame.x = node.x + offsetX - textWidth / 2;
      else if (node.style.align === 'right') layer.frame.x = node.x + offsetX - textWidth;
    } else if (node.kind === 'rect') {
      layer = new ShapePath({ shapeType: ShapePath.ShapeType.Rectangle, frame: new Rectangle(node.x + offsetX, node.y + offsetY, Math.max(0.5, node.width), Math.max(0.5, node.height)) });
      if (node.radius && layer.points) layer.points.forEach(function (point) { point.cornerRadius = node.radius; });
      layer.style = sketchStyle(node.style, sketch);
    } else if (node.kind === 'circle') {
      layer = new ShapePath({ shapeType: ShapePath.ShapeType.Oval, frame: new Rectangle(node.cx + offsetX - node.radius, node.cy + offsetY - node.radius, node.radius * 2, node.radius * 2) });
      layer.style = sketchStyle(node.style, sketch);
    } else {
      var svg = node.kind === 'arc' ? arcToSvg(node, offsetX, offsetY) : commandsToSvg(node.commands, offsetX, offsetY);
      layer = shapeFromSvg(sketch, svg);
      layer.style = sketchStyle(node.style, sketch);
    }
    layer.name = node.name || node.kind;
    options.parent.layers.push(layer);
    return layer;
  }

  function renderScene(scene, options) {
    var buckets = {};
    function bucketFor(node) {
      var name = String(node.name || '').toLowerCase();
      if (name.indexOf('grid') >= 0) return 'Grid';
      if (name.indexOf('axis') >= 0 || name.indexOf('tick') >= 0 || name.indexOf('label') >= 0 || name.indexOf('category') >= 0 || name.indexOf('stage') >= 0) return 'Axes';
      if (node.meta && node.meta.areaOutline) return 'Area Outlines';
      if (node.kind === 'circle' || (node.meta && node.meta.index != null && node.name && name.indexOf('point') >= 0)) return 'Data Points';
      if (node.meta && node.meta.series != null) return 'Series ' + (Number(node.meta.series) + 1);
      if (node.meta && node.meta.index != null) return 'Series 1';
      return 'Chart Marks';
    }
    scene.layers.forEach(function (node) {
      var bucket = bucketFor(node);
      if (!buckets[bucket]) buckets[bucket] = new options.sketch.Group({ name: bucket, parent: options.parent });
      renderNode(node, { sketch: options.sketch, parent: buckets[bucket], offsetX: options.offsetX, offsetY: options.offsetY });
    });
    return options.parent;
  }

  function selectedData(configuration, processors, dataApi) {
    var dataConfig = configuration.data || {};
    if (dataConfig.selected === 'random') {
      var random = dataConfig.random || {};
      if (random.data && random.data.table) return random.data;
      if (Array.isArray(random.data) && random.data.length > 1) return { header: random.data[0], table: random.data.slice(1) };
      return processors.createRandomData(random.categories.value, random.items.value, random.min, random.max, random.randType, dataConfig.chartName);
    }
    if (dataConfig.selected === 'table') return dataApi && dataApi.processData
      ? dataApi.processData(dataConfig.csv)
      : processors.processData(dataConfig.csv);
    return dataApi && dataApi.processJSON
      ? dataApi.processJSON(dataConfig.json.data, dataConfig.json.keys, dataConfig.json.header)
      : processors.processJSON(dataConfig.json.data, dataConfig.json.keys, dataConfig.json.header);
  }

  function resourceCanvas(raw, document) {
    var parent = raw.parent && raw.parent.layers ? raw.parent : document.getLayerWithID(raw.parent);
    var layer = raw.layer && raw.layer.frame ? raw.layer : document.getLayerWithID(raw.layer);
    if (raw.conf !== undefined) {
      var oldCanvas = layer.layers[0];
      parent.layers.push(oldCanvas);
      oldCanvas.frame.x = layer.frame.x + oldCanvas.frame.x;
      oldCanvas.frame.y = layer.frame.y + oldCanvas.frame.y;
      layer.remove();
      layer = oldCanvas;
    }
    layer.selected = false;
    return { layer: layer, parent: parent, x: layer.frame.x, y: layer.frame.y, width: layer.frame.width, height: layer.frame.height };
  }

  function renderCharts(options) {
    var configuration = options.configuration;
    var chartType = configuration.data.chartName;
    var sourceData = selectedData(configuration, options.processors, options.data);
    var circular = chartType === 'pieChart' || chartType === 'donutChart' || chartType === 'progressChart' || chartType === 'sparkline';
    options.canvases.forEach(function (rawCanvas, index) {
      var canvas = resourceCanvas(rawCanvas, options.document);
      var group = new options.sketch.Group({ name: configuration.data.fullChartName, parent: canvas.parent });
      group.layers.push(canvas.layer);
      var scene = options.core.buildScene({
        type: chartType,
        data: sourceData,
        categories: sourceData.header,
        seriesNames: sourceData.seriesNames,
        config: configuration.settings,
        width: canvas.width,
        height: canvas.height,
        seriesIndex: circular ? index : 0
      });
      renderScene(scene, { sketch: options.sketch, parent: group, offsetX: canvas.x, offsetY: canvas.y });
      options.Settings.setLayerSettingForKey(group, 'localConf', configuration);
      options.Settings.setLayerSettingForKey(group, 'xchartSceneVersion', scene.version);
      group.adjustToFit();
    });
  }

  return { renderScene: renderScene, renderCharts: renderCharts };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = XChartSketchAdapter;
