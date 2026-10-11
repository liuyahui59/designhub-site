/* Canvas 2D adapter for XChartCore Scene. No chart calculations belong here. */
var XChartCanvasAdapter = (function () {
  'use strict';

  function applyStyle(ctx, style) {
    style = style || {};
    ctx.globalAlpha = style.opacity == null ? 1 : style.opacity;
    ctx.fillStyle = style.fill || 'transparent';
    ctx.strokeStyle = style.stroke || 'transparent';
    ctx.lineWidth = style.strokeWidth == null ? 1 : style.strokeWidth;
    ctx.lineCap = style.lineCap || 'butt';
    ctx.lineJoin = style.lineJoin || 'miter';
  }

  function gradientFill(ctx, node, gradient) {
    if (!gradient || !ctx.createLinearGradient) return null;
    var bounds = nodeBounds(node, 0);
    if (!bounds) return null;
    var x1 = bounds.x + bounds.width * (gradient.x1 == null ? 0 : gradient.x1);
    var y1 = bounds.y + bounds.height * (gradient.y1 == null ? 0 : gradient.y1);
    var x2 = bounds.x + bounds.width * (gradient.x2 == null ? 1 : gradient.x2);
    var y2 = bounds.y + bounds.height * (gradient.y2 == null ? 1 : gradient.y2);
    var fill = ctx.createLinearGradient(x1, y1, x2, y2);
    (gradient.stops || []).forEach(function (stop) {
      if (stop && stop.color != null) fill.addColorStop(Math.max(0, Math.min(1, Number(stop.offset) || 0)), stop.color);
    });
    return fill;
  }

  function traceCommands(ctx, commands) {
    ctx.beginPath();
    (commands || []).forEach(function (command) {
      if (command.op === 'M') ctx.moveTo(command.x, command.y);
      else if (command.op === 'L') ctx.lineTo(command.x, command.y);
      else if (command.op === 'C') ctx.bezierCurveTo(command.c1x, command.c1y, command.c2x, command.c2y, command.x, command.y);
      else if (command.op === 'Z') ctx.closePath();
    });
  }

  function roundedRect(ctx, node) {
    var radius = Math.max(0, Math.min(node.radius || 0, node.width / 2, node.height / 2));
    ctx.beginPath();
    ctx.moveTo(node.x + radius, node.y);
    ctx.lineTo(node.x + node.width - radius, node.y);
    ctx.quadraticCurveTo(node.x + node.width, node.y, node.x + node.width, node.y + radius);
    ctx.lineTo(node.x + node.width, node.y + node.height - radius);
    ctx.quadraticCurveTo(node.x + node.width, node.y + node.height, node.x + node.width - radius, node.y + node.height);
    ctx.lineTo(node.x + radius, node.y + node.height);
    ctx.quadraticCurveTo(node.x, node.y + node.height, node.x, node.y + node.height - radius);
    ctx.lineTo(node.x, node.y + radius);
    ctx.quadraticCurveTo(node.x, node.y, node.x + radius, node.y);
    ctx.closePath();
  }

  function arcPath(ctx, node) {
    ctx.beginPath();
    if (node.gap > 0) {
      var halfGap = node.gap / 2;
      var outerInset = Math.asin(Math.min(1, halfGap / node.outerRadius));
      ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle + outerInset, node.endAngle - outerInset, false);
      if (node.innerRadius > 0) {
        var innerInset = Math.asin(Math.min(1, halfGap / node.innerRadius));
        ctx.arc(node.cx, node.cy, node.innerRadius, node.endAngle - innerInset, node.startAngle + innerInset, true);
      } else {
        var tipRadius = halfGap / Math.sin((node.endAngle - node.startAngle) / 2);
        var middle = (node.startAngle + node.endAngle) / 2;
        ctx.lineTo(node.cx + Math.cos(middle) * tipRadius, node.cy + Math.sin(middle) * tipRadius);
      }
      ctx.closePath();
      return;
    }
    if (node.innerRadius > 0) {
      ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle, false);
      ctx.arc(node.cx, node.cy, node.innerRadius, node.endAngle, node.startAngle, true);
      ctx.closePath();
    } else if (node.style && node.style.fill) {
      ctx.moveTo(node.cx, node.cy);
      ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle, false);
      ctx.closePath();
    } else {
      ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle, false);
    }
  }

  function drawNode(ctx, node) {
    var style = node.style || {};
    ctx.save();
    applyStyle(ctx, style);
    if (node.kind === 'path') traceCommands(ctx, node.commands);
    else if (node.kind === 'rect') roundedRect(ctx, node);
    else if (node.kind === 'circle') { ctx.beginPath(); ctx.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2); }
    else if (node.kind === 'arc') arcPath(ctx, node);
    else if (node.kind === 'text') {
      ctx.font = (style.fontSize || 12) + 'px "' + (style.fontName || 'sans-serif') + '", sans-serif';
      ctx.textAlign = style.align || 'left';
      ctx.textBaseline = style.baseline || 'alphabetic';
      ctx.fillStyle = style.fill || '#161616';
      ctx.fillText(node.text, node.x, node.y);
      ctx.restore();
      return;
    }
    if (style.fillGradient) {
      var gradient = gradientFill(ctx, node, style.fillGradient);
      if (gradient) ctx.fillStyle = gradient;
    }
    if (style.fill || style.fillGradient) ctx.fill();
    if (style.stroke && (style.strokeWidth == null || style.strokeWidth > 0)) ctx.stroke();
    ctx.restore();
  }

  function draw(ctx, scene, options) {
    options = options || {};
    if (!ctx || !scene) return;
    if (options.clear !== false) ctx.clearRect(0, 0, scene.width, scene.height);
    scene.layers.forEach(function (node) { drawNode(ctx, node); });
    return scene;
  }

  function nodeBounds(node, minimumSize) {
    minimumSize = minimumSize == null ? 8 : minimumSize;
    if (node.kind === 'rect') return { x: node.x, y: node.y, width: node.width, height: node.height };
    if (node.kind === 'circle') return { x: node.cx - node.radius, y: node.cy - node.radius, width: node.radius * 2, height: node.radius * 2 };
    if (node.kind === 'arc') return { x: node.cx - node.outerRadius, y: node.cy - node.outerRadius, width: node.outerRadius * 2, height: node.outerRadius * 2 };
    var points = [];
    (node.commands || []).forEach(function (command) { if (command.x != null) points.push({ x: command.x, y: command.y }); });
    if (!points.length) return null;
    var xs = points.map(function (point) { return point.x; });
    var ys = points.map(function (point) { return point.y; });
    var minX = Math.min.apply(Math, xs), maxX = Math.max.apply(Math, xs);
    var minY = Math.min.apply(Math, ys), maxY = Math.max.apply(Math, ys);
    return { x: minX, y: minY, width: Math.max(minimumSize, maxX - minX), height: Math.max(minimumSize, maxY - minY) };
  }

  function hoverTargets(scene) {
    return (scene.hoverTargets || []).map(function (node) {
      return { bounds: nodeBounds(node), meta: node.meta, name: node.name, node: node };
    }).filter(function (target) { return target.bounds; });
  }

  return { draw: draw, drawNode: drawNode, hoverTargets: hoverTargets };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = XChartCanvasAdapter;
