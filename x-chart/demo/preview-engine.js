/* Canvas preview controller.
 * Data/config collection and interaction live here. All chart geometry comes
 * from XChartCore; drawing is delegated to XChartCanvasAdapter.
 */
var PreviewEngine = (function(){
	var canvas, ctx, rafId = null, tooltip = null, hoverTargets = [], keyboardIndex = 0;
	var targetSize = { width: 320, height: 200 };

	function normalizeSize(value){
		if (!value) return null;
		var width = Number(value.width), height = Number(value.height);
		if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) return null;
		return { width: width, height: height };
	}

	function resolveTargetSize(){
		var explicit = normalizeSize(window.xchartStudioSize);
		if (explicit) return explicit;
		var source = window.xchartCanvasData && window.xchartCanvasData[0];
		return normalizeSize(source) || targetSize;
	}

	function fitSize(containerWidth, containerHeight, size){
		var ratio = size.width / size.height;
		var width = Math.max(1, containerWidth), height = Math.max(1, containerHeight);
		if (width / height > ratio) width = height * ratio;
		else height = width / ratio;
		return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) };
	}

	function init(){
		canvas = document.getElementById('previewCanvas');
		if (!canvas) return;
		canvas.setAttribute('tabindex', '0');
		canvas.setAttribute('data-preview-focusable', 'true');
		canvas.setAttribute('role', 'img');
		canvas.setAttribute('aria-label', '图表预览；可用鼠标悬浮或方向键查看数值');
		var panel = canvas.parentElement;
		if (!tooltip && panel) {
			tooltip = document.createElement('div');
			tooltip.className = 'xchart-tooltip';
			tooltip.setAttribute('role', 'status');
			tooltip.setAttribute('aria-live', 'polite');
			tooltip.setAttribute('aria-hidden', 'true');
			panel.appendChild(tooltip);
		}
		if (!canvas.__xchartHoverBound) {
			canvas.addEventListener('pointermove', handlePointerMove);
			canvas.addEventListener('pointerleave', hideTooltip);
			canvas.addEventListener('focus', showKeyboardTarget);
			canvas.addEventListener('blur', hideTooltip);
			canvas.addEventListener('keydown', handleTooltipKeydown);
			canvas.__xchartHoverBound = true;
		}
		// 双保险：同步执行一次 + RAF 再执行一次。
		// ready 同步链触发时 canvas 已在 DOM 但 layout 未完成，clientWidth 会读出 0，
		// RAF 后 layout 完成才能拿到真实尺寸。
		function applySize(){
			var panel = canvas.parentElement;
			var dpr = window.devicePixelRatio || 1;
			// 预览使用选区矩形的宽高比，在面板内等比缩放并居中。
			var containerWidth = (panel && panel.clientWidth) || canvas.clientWidth || 400;
			var containerHeight = (panel && panel.clientHeight) || canvas.clientHeight || 216;
			var fitted = fitSize(containerWidth, containerHeight, resolveTargetSize());
			var w = fitted.width, h = fitted.height;
			canvas.style.width  = w + 'px';
			canvas.style.height = h + 'px';
			canvas.width  = Math.max(1, Math.floor(w * dpr));
			canvas.height = Math.max(1, Math.floor(h * dpr));
			ctx = canvas.getContext('2d');
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
		}
		applySize();
		requestAnimationFrame(function(){
			applySize();
			render();
		});
	}

	function currentChart(){
		var el = document.querySelector('.icon_active');
		if (el) return el.getAttribute('data-action');
		var sel = document.querySelector('[name=chartType]');
		return sel && sel.value ? sel.value : 'lineChart';
	}
	function currentSource(){
		var tab = document.querySelector('.data-tab.active');
		if (tab) return tab.getAttribute('data-target');
		var el = document.querySelector('.button_group .active');
		if (el) return el.getAttribute('data-name');
		if (window.chartConfig && chartConfig.data && chartConfig.data.selected) return chartConfig.data.selected;
		return 'table';
	}
	function currentTaxonomy(){
		if (window.XChartStudio && XChartStudio.getSelection) return XChartStudio.getSelection();
		return (window.chartConfig && chartConfig.data && chartConfig.data.taxonomy) || window.XChartTaxonomySelection || null;
	}
	function getConfig(){
		// 兼容两种页面：创建页从 DOM 读，编辑页的全局字段（grid/labels/beginAtZero）已移除、需从 settings 读
		var s = (window.chartConfig && chartConfig.settings) || {};
		var defaults = window.XChartDefaultTemplate ? window.XChartDefaultTemplate.create() : {
			colors: { common: ['#0a84ff','#30b0c7','#ff9f0a','#ff375f','#5e5ce6','#34c759'] },
			grid: { type: 1, lineWidth: 1, color: '#e0e0e0', yAxisSegments: 0 },
			labels: { type: 1, fontName: 'IBM Plex Sans', fontSize: 12, color: '#525252' },
			lineChart: { lineWidth: 1.5, dotType: 1, dotDiameter: 5 },
			areaChart: { lineWidth: 2, opacity: 0.22, fillStyle: 'gradient-line' },
			verticalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0 },
			horizontalBarChart: { margin: 0.24, stackGap: 1, roundTop: 0 },
			groupedBarChart: { margin: 0.2, innerGap: 0.12, roundTop: 0 },
			groupedHorizontalBarChart: { margin: 0.2, innerGap: 0.12, roundTop: 0 },
			progressChart: { backgroundColor: '#e0e0e0', thicknessOfProgress: 12, endOfLine: 1 },
			sparkline: { lineWidth: 1.5, dotDiameter: 4 }, scatterPlot: { dotDiameter: 7 },
			candlestickChart: { margin: 0.2 }
		};
		function finiteNumber(value, fallback){
			var defaultValue = Number(fallback);
			if (!isFinite(defaultValue)) defaultValue = 0;
			if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
			var parsed = Number(value);
			return isFinite(parsed) ? parsed : defaultValue;
		}

		function num(sel, fallback){
			var el = $(sel);
			return el.length ? finiteNumber(el.val(), fallback) : finiteNumber(fallback, fallback);
		}
		function str(sel, fallback){ var el = $(sel); return el.length ? el.val() : fallback; }
		function bool(sel, fallback){ var el = $(sel); return el.length ? el.is(':checked') : fallback; }
		var colors = [];
		$('#colorContainer .drag-box').each(function(){ colors.push(this.title); });
		// 编辑页无 colorContainer：从 settings.colors 按图表类型取专用色。
		if (colors.length === 0 && s.colors) {
			var chartColors = s.colors[currentChart()];
			if (Array.isArray(chartColors)) colors = chartColors.slice();
			else if (Array.isArray(s.colors.common)) colors = s.colors.common.slice();
		}
		if (colors.length === 0) colors = window.XChartDefaultTemplate ? window.XChartDefaultTemplate.palette.slice() : ['#0a84ff','#30b0c7','#ff9f0a','#ff375f','#5e5ce6','#34c759'];
			var grid = s.grid || {};
			var labels = s.labels || {};
			var separateAxisStyles = bool('[name=separateAxisStyles]', labels.separateAxisStyles === true);
			var commonLabelsVisible = num('select[name=labels]', finiteNumber(labels.type, 1)) !== 0;
			function axisConfig(prefix){
				var stored = labels[prefix] || {};
				if (!separateAxisStyles) {
					return { labels: commonLabelsVisible, line: true, ticks: true, fontSize: finiteNumber(labels.fontSize, 12), lineColor: '#8d8d8d', color: labels.color || '#525252' };
				}
				return {
					labels: bool('[name='+prefix+'Labels]', stored.labels !== false),
					line: bool('[name='+prefix+'Line]', stored.line !== false),
					ticks: bool('[name='+prefix+'Ticks]', stored.ticks !== false),
					fontSize: num('input[name='+prefix+'FontSize]', finiteNumber(stored.fontSize, finiteNumber(labels.fontSize, 12))),
					lineColor: str('input[name='+prefix+'LineColor]', stored.lineColor || '#8d8d8d') || '#8d8d8d',
					color: str('input[name='+prefix+'Color]', stored.color || labels.color || '#525252') || '#525252'
				};
			}
			var xAxis = axisConfig('xAxis'), yAxis = axisConfig('yAxis');

			return {
				colors: colors,
			grid: {
				type: num('select[name=grid]', finiteNumber(grid.type, defaults.grid.type)),
				lineWidth: num('input[name=gridLineWidth]', finiteNumber(grid.lineWidth, defaults.grid.lineWidth)),
				color: str('input[name=gridColor]', grid.color || defaults.grid.color) || defaults.grid.color,
				yAxisSegments: num('input[name=yAxisSegments]', finiteNumber(grid.yAxisSegments, defaults.grid.yAxisSegments))
			},
				labels: {
					type: xAxis.labels ? (yAxis.labels ? 1 : 3) : (yAxis.labels ? 2 : 0),
					fontName: str('input[name=labelFontName]', labels.fontName || defaults.labels.fontName) || defaults.labels.fontName,
					fontSize: num('input[name=labelFontSize]', finiteNumber(labels.fontSize, defaults.labels.fontSize)),
					color: str('input[name=labelColor]', labels.color || defaults.labels.color) || defaults.labels.color,
					separateAxisStyles: separateAxisStyles,
					xAxis: xAxis,
					yAxis: yAxis
			},
			lineType: num('select[name=lineType]', (s.lineType != null ? Number(s.lineType) : 0)),
			dotType: num('select[name=dotType]', (s.lineChart ? Number(s.lineChart.dotType) : 1)),
			lineWidth: num('input[name=lineWidth]', (s.lineChart ? Number(s.lineChart.lineWidth) : defaults.lineChart.lineWidth)),
			dotDiameter: num('input[name=dotDiameter]', (s.lineChart ? Number(s.lineChart.dotDiameter) : defaults.lineChart.dotDiameter)),
				areaFillStyle: (function(){
					var active = document.querySelector('.area-style-option.active');
					return active ? active.getAttribute('data-style') : ((s.areaChart && s.areaChart.fillStyle) || 'solid');
				})(),
				areaLineWidth: num('input[name=areaLineWidth]', finiteNumber(s.areaChart && s.areaChart.lineWidth, defaults.areaChart.lineWidth)),
			areaOpacity: num('input[name=areaOpacity]', (s.areaChart ? Number(s.areaChart.opacity) : defaults.areaChart.opacity)),
			marginV: num('input[name=marginV]', (s.verticalBarChart ? Number(s.verticalBarChart.margin) : defaults.verticalBarChart.margin)),
			stackGapV: num('input[name=stackGapV]', (s.verticalBarChart ? Number(s.verticalBarChart.stackGap) : defaults.verticalBarChart.stackGap)),
			roundTopV: num('input[name=roundTopV]', (s.verticalBarChart ? Number(s.verticalBarChart.roundTop) : defaults.verticalBarChart.roundTop)),
			marginH: num('input[name=marginH]', (s.horizontalBarChart ? Number(s.horizontalBarChart.margin) : defaults.horizontalBarChart.margin)),
			stackGapH: num('input[name=stackGapH]', (s.horizontalBarChart ? Number(s.horizontalBarChart.stackGap) : defaults.horizontalBarChart.stackGap)),
			roundTopH: num('input[name=roundTopH]', (s.horizontalBarChart ? Number(s.horizontalBarChart.roundTop) : defaults.horizontalBarChart.roundTop)),
			groupMarginV: num('input[name=groupMarginV]', (s.groupedBarChart ? Number(s.groupedBarChart.margin) : defaults.groupedBarChart.margin)),
			groupInnerGapV: num('input[name=groupInnerGapV]', (s.groupedBarChart ? Number(s.groupedBarChart.innerGap) : defaults.groupedBarChart.innerGap)),
			groupRoundTopV: num('input[name=groupRoundTopV]', (s.groupedBarChart ? Number(s.groupedBarChart.roundTop) : defaults.groupedBarChart.roundTop)),
			groupMarginH: num('input[name=groupMarginH]', (s.groupedHorizontalBarChart ? Number(s.groupedHorizontalBarChart.margin) : defaults.groupedHorizontalBarChart.margin)),
			groupInnerGapH: num('input[name=groupInnerGapH]', (s.groupedHorizontalBarChart ? Number(s.groupedHorizontalBarChart.innerGap) : defaults.groupedHorizontalBarChart.innerGap)),
			groupRoundTopH: num('input[name=groupRoundTopH]', (s.groupedHorizontalBarChart ? Number(s.groupedHorizontalBarChart.roundTop) : defaults.groupedHorizontalBarChart.roundTop)),
			sorting: num('select[name=sorting]', (s.sorting != null ? Number(s.sorting) : 0)),
			typeOfCircle: num('select[name=typeOfCircle]', (s.typeOfCircle != null ? Number(s.typeOfCircle) : 0)),
			segmentGap: num('input[name=segmentGap]', (s.segmentGap != null ? Number(s.segmentGap) : 0)),
			spiderLabels: bool('[name=spiderLabels]', s.spiderLabels === true),
			thicknessOfDonut: num('input[name=thicknessOfDonut]', (s.donutChart ? Number(s.donutChart.thicknessOfDonut) : 30)),
			thicknessOfProgress: num('input[name=thicknessOfProgress]', (s.progressChart ? Number(s.progressChart.thicknessOfProgress) : defaults.progressChart.thicknessOfProgress)),
				progressBgColor: str('input[name=progressBgColor]', (s.progressChart ? s.progressChart.backgroundColor : '#e0e0e0')) || '#e0e0e0',
			endOfLine: num('select[name=endOfLine]', (s.progressChart ? Number(s.progressChart.endOfLine) : defaults.progressChart.endOfLine)),
			sparkLineWidth: num('input[name=sparkLineWidth]', (s.sparkline ? Number(s.sparkline.lineWidth) : defaults.sparkline.lineWidth)),
			sparkDotDiameter: num('input[name=sparkDotDiameter]', (s.sparkline ? Number(s.sparkline.dotDiameter) : defaults.sparkline.dotDiameter)),
			scatterDotDiameter: num('input[name=scatterDotDiameter]', (s.scatterPlot ? Number(s.scatterPlot.dotDiameter) : defaults.scatterPlot.dotDiameter)),
			candleMargin: num('input[name=candleMargin]', (s.candlestickChart ? Number(s.candlestickChart.margin) : defaults.candlestickChart.margin)),
			binMode: str('select[name=binMode]', (s.histogram && s.histogram.binMode) || 'auto'),
			binCount: num('input[name=binCount]', (s.histogram ? Number(s.histogram.binCount) : 8)),
			binWidth: num('input[name=binWidth]', (s.histogram ? Number(s.histogram.binWidth) : 0)),
			seriesStyles: (function(){
				var value = s.seriesStyles || s.combo && s.combo.seriesStyles;
				return Array.isArray(value) ? value : [];
			})(),
			axisAssignment: str('select[name=axisAssignment]', (s.combo && s.combo.axisAssignment) || 'auto'),
			showValueTooltip: bool('[name=showValueTooltip]', !s.interaction || s.interaction.showValueTooltip !== false),
			beginAtZero: num('select[name=beginAtZero]', (s.beginAtZero != null ? Number(s.beginAtZero) : 0)),
			radarLevels: num('input[name=radarLevels]', (s.radarChart ? Number(s.radarChart.levels) : 4)),
			radarFillOpacity: num('input[name=radarFillOpacity]', (s.radarChart ? Number(s.radarChart.fillOpacity) : 0.16)),
			radarGridShape: str('select[name=radarGridShape]', (s.radarChart && s.radarChart.grid) || 'polygon'),
			funnelGap: num('input[name=funnelGap]', (s.funnelChart ? Number(s.funnelChart.gap) : 6)),
			funnelShape: str('input[name=funnelShape]', (s.funnelChart && s.funnelChart.shape) || 'standard'),
			labelPosition: str('select[name=labelPosition]', (s.funnelChart && s.funnelChart.labelPosition) || 'inside'),
			colorScale: str('select[name=colorScale]', (s.heatmap && s.heatmap.colorScale) || 'blue'),
			cellGap: num('input[name=cellGap]', (s.heatmap ? Number(s.heatmap.cellGap) : 2)),
			showValues: bool('[name=showValues]', !!(s.heatmap && s.heatmap.showValues)),
			tileGap: num('input[name=tileGap]', (s.treemap ? Number(s.treemap.tileGap) : 2))
			};
		}



	// Mirror the label-space adjustments in the native createChart implementation.

		// 与原生引擎 common.js 的 createRandomData 逐行对齐，保证预览与实际创建用同一套数据。
	function generateChartData(type, rows, columns, min, max, distr){
		rows = Number(rows) || 1;
		columns = Number(columns) || 1;
		min = Number(min) || 0;
		max = Number(max) || 0;
		distr = String(distr == null ? '0' : distr);

		var dataTable = [], dataMax = [], dataMin = [], headers = [];

		function randNum(mn, mx, col){
			var data = [];
			for (var i = 0; i < col; i++) data[i] = Number(Math.random() * (mx - mn) + mn).toFixed(0);
			return data;
		}
		function trendUp(mn, mx, col){
			var step = (mx - mn) / col, data = [];
			for (var i = 0; i < col; i++){
				var tempNum = mn + step * (Math.random() * (1.3 - 0.5) + 0.5);
				mn += tempNum - mn;
				data[i] = tempNum.toFixed(0);
			}
			return data;
		}
		function trendDown(mn, mx, col){
			var step = (mx - mn) / col, data = [];
			for (var i = 0; i < col; i++){
				var tempNum = mx - step * (Math.random() * (1.3 - 0.5) + 0.5);
				mx -= mx - tempNum;
				data[i] = tempNum.toFixed(0);
			}
			return data;
		}
		function normalDistr(mn, mx, col){
			mx = Number(mx); mn = Number(mn); col = Number(col - 1);
			var data = [], originalMax = mx;
			for (var i = 0; i <= col; i++){
				mx = mx * Math.random();
				var c = mn, b = 4 * (mx - mn) / col, a = -b / col;
				var tempNum = a * (i * i) + b * i + c;
				data[i] = tempNum.toFixed(0);
				mx = originalMax;
			}
			return data;
		}

		if (type === 'candlestickChart'){
			function newRandom(mn, mx){ return Math.random() * (mx - mn) + mn; }
			var range = max - min,
				minTrend = min + newRandom(range * 0.1, range * 0.3),
				maxTrend = max - newRandom(range * 0.1, range * 0.3),
				trendStep = (maxTrend - minTrend) / columns,
				startUp = minTrend, startDown = maxTrend,
				centerPoint, high, close, open, low, delta,
				highArr = [], closeArr = [], openArr = [], lowArr = [];
			for (var j = 0; j < columns; j++){
				if (distr === '1'){ centerPoint = Number(startUp) + trendStep * newRandom(0.7, 1.3); startUp = centerPoint; }
				else if (distr === '2'){ centerPoint = Number(startDown) - trendStep * newRandom(0.7, 1.3); startDown = centerPoint; }
				else { centerPoint = newRandom(range * 0.1, range * 0.9); }
				high = centerPoint * newRandom(1.1, 1.3);
				low = centerPoint * newRandom(0.7, 0.9);
				delta = high - low;
				close = newRandom(Number(low) + 0.2 * delta, Number(high) - 0.2 * delta);
				if (close < high - (high - low) / 2){
					var openDelta = high - close;
					open = newRandom(Number(close) + 0.2 * openDelta, Number(high) - 0.2 * openDelta);
				} else {
					var openDelta = close - low;
					open = newRandom(Number(low) + 0.2 * openDelta, Number(close) - 0.2 * openDelta);
				}
				highArr[j] = high.toFixed(0);
				closeArr[j] = close.toFixed(0);
				openArr[j] = open.toFixed(0);
				lowArr[j] = low.toFixed(0);
			}
			dataTable[0] = highArr;
			dataTable[1] = closeArr;
			dataTable[2] = openArr;
			dataTable[3] = lowArr;
			dataMax[0] = Math.max.apply(null, highArr.map(Number));
			dataMin[0] = Math.min.apply(null, lowArr.map(Number));
		} else {
			var funcArr = [randNum, trendUp, trendDown, normalDistr];
			for (var i = 0; i < rows; i++){
				var dataRow;
				if (type === 'scatterPlot' && rows >= 3 && i === 2) dataRow = randNum(Math.max(0, min), Math.max(Math.max(0, min) + 1, max), columns);
				else if (distr === '0') dataRow = randNum(min, max, columns);
				else if (distr === '1') dataRow = trendUp(min, max, columns);
				else if (distr === '2') dataRow = (type === 'scatterPlot' && i === 0) ? trendUp(min, max, columns) : trendDown(min, max, columns);
				else if (distr === '3') dataRow = (type === 'scatterPlot' && i === 0) ? trendUp(min, max, columns) : normalDistr(min, max, columns);
				else { var fi = Number(Math.random() * (funcArr.length - 1)).toFixed(0); dataRow = funcArr[Number(fi)](min, max, columns); }
				dataTable[i] = dataRow;
				dataMax[i] = Math.max.apply(null, dataRow.map(Number));
				dataMin[i] = Math.min.apply(null, dataRow.map(Number));
			}
		}

		for (var h = 0; h < columns; h++) headers[h] = 'Text';

		return {
			table: dataTable,
			max: Math.max.apply(null, dataMax),
			min: Math.min.apply(null, dataMin),
			rows: dataTable.length,
			columns: dataTable[0].length,
			header: headers
		};
	}
	window.generateChartData = generateChartData;

	function randomParams(){
		var chart = currentChart();
		var taxonomy = currentTaxonomy();
		var taxonomyKey = taxonomy ? (taxonomy.baseId || '') + ':' + (taxonomy.variantId || '') : '';
		var defaultSeries = chart === 'scatterPlot' ? (taxonomy && taxonomy.baseId === 'bubble' ? 3 : 2) : (chart === 'candlestickChart' ? 4 : 2);
		var c = Math.max(1, Number($('input[name=categories]').val()) || defaultSeries);
		var n = Math.max(2, Number($('input[name=items]').val()) || 5);
		var min = Number($('input[name=randomMin]').val()) || 0;
		var max = Number($('input[name=randomMax]').val()) || 100;
		var t = String($('select[name=randomType]').val() == null ? '1' : $('select[name=randomType]').val());
		if (chart === 'pieChart' || chart === 'donutChart' || chart === 'progressChart' || chart === 'sparkline') c = 1;
		return { chart: chart, taxonomyKey: taxonomyKey, c: c, n: n, min: min, max: max, t: t };
	}

	function tableData(){
		var csv = window.chartConfig && chartConfig.data && chartConfig.data.csv;
		var t = (csv && csv.data) || [];
		if (!t || t.length === 0) return null;
		if (window.XChartData && XChartData.processData) return XChartData.processData(csv).table;
		var source;
		if (csv.type === null || csv.type === undefined) {
			source = t.slice(1);
		} else {
			var transposed = Object.keys(t[0]).map(function(c){ return t.map(function(row){ return row[c]; }); });
			var selected = (csv.columns || []).filter(function(column){ return column.checked; }).map(function(column){ return Number(column.index); });
			source = selected.map(function(index){ return transposed[index] || []; });
		}
		return normalizePreviewSeries(source, '表格');
	}
	function jsonData(){
		var json = window.chartConfig && chartConfig.data && chartConfig.data.json;
		if (!json || !json.data) return null;
		if (window.XChartData && XChartData.processJSON) return XChartData.processJSON(json.data, json.keys, json.header).table;
		function valuesForKey(obj, key){
			var values = [];
			Object.keys(obj || {}).forEach(function(name){
				var value = obj[name];
				if (value && typeof value === 'object') values = values.concat(valuesForKey(value, key));
				else if (name === key) values.push(value);
			});
			return values;
		}
		var source = (json.keys || []).filter(function(key){ return key.checked; }).map(function(key){
			return valuesForKey(json.data, key.name);
		});
		return normalizePreviewSeries(source, 'JSON');
	}
	var _randomKey = null, _randomCache = null;
	function parseNumeric(value){
		var parsed = window.XChartData && XChartData.parseNumber ? XChartData.parseNumber(value) : { ok: isFinite(Number(value)), value: Number(value) };
		return parsed.ok ? parsed.value : null;
	}
	function previewDataError(source, row, column, message){
		var error = new Error(message);
		error.xchart = { source: source, row: row, column: column };
		return error;
	}
	function normalizePreviewSeries(source, sourceName){
		var series = [];
		(source || []).forEach(function(row, rowIndex){
			if (!Array.isArray(row) || row.length === 0) return;
			var hasValue = false;
			var hasEmpty = false;
			var values = row.map(function(raw, columnIndex){
				if (raw === null || raw === undefined || String(raw).trim() === '') {
					hasEmpty = true;
					return null;
				}
				hasValue = true;
				var value = parseNumeric(raw);
				if (value === null) throw previewDataError(sourceName, rowIndex, columnIndex, sourceName + '第 ' + (rowIndex + 1) + ' 个系列的第 ' + (columnIndex + 1) + ' 个数据点不是有效数字');
				return value;
			});
			if (!hasValue) return;
			if (hasEmpty) throw previewDataError(sourceName, rowIndex, values.indexOf(null), sourceName + '第 ' + (rowIndex + 1) + ' 个系列包含空值');
			series.push(values);
		});
		return series.length ? series : null;
	}
	function valuesForKey(obj, key){
		if (window.XChartData && XChartData.getJsonValues) return XChartData.getJsonValues(obj, typeof key === 'string' ? { name: key } : key);
		var values = [];
		Object.keys(obj || {}).forEach(function(name){
			var value = obj[name];
			if (value && typeof value === 'object') values = values.concat(valuesForKey(value, key));
			else if (name === key) values.push(value);
		});
		return values;
	}
	function getDataMeta(data){
		var count = data && data[0] ? data[0].length : 0;
		var categories = [], series = [];
		for (var i = 0; i < count; i++) categories.push('第 ' + (i + 1) + ' 项');
		for (var s = 0; s < (data || []).length; s++) series.push('系列 ' + (s + 1));
		var source = currentSource();
		if (source === 'table') {
			var csv = window.chartConfig && chartConfig.data && chartConfig.data.csv;
			var table = csv && csv.data;
			if (Array.isArray(table) && table.length) {
				if (csv.type === null || csv.type === undefined) {
					categories = (table[0] || []).map(function(value, index){ return String(value == null || value === '' ? '第 ' + (index + 1) + ' 项' : value); });
					series = (csv.seriesNames || []).slice(0, Math.max(0, table.length - 1)).map(function(name, index){ return name || '系列 ' + (index + 1); });
				}
				else {
					var selectedHeader = (csv.header || []).filter(function(item){ return item.checked; })[0];
					if (selectedHeader) categories = table.map(function(row, index){ return String(row[selectedHeader.index] == null || row[selectedHeader.index] === '' ? '第 ' + (index + 1) + ' 项' : row[selectedHeader.index]); });
					series = (csv.columns || []).filter(function(item){ return item.checked; }).map(function(item, index){ return item.name || '系列 ' + (index + 1); });
				}
			}
		} else if (source === 'json') {
			var json = window.chartConfig && chartConfig.data && chartConfig.data.json;
			var header = json && (json.header || []).filter(function(item){ return item.checked; })[0];
			if (header) categories = valuesForKey(json.data, header).map(String);
			series = json ? (json.keys || []).filter(function(item){ return item.checked; }).map(function(item){ return item.name; }) : series;
		}
		return { categories: categories, series: series };
	}
	function getData(){
		if (currentSource() === 'random'){
			// 数据参数不变时复用同一份随机数据，避免预览闪烁，也保证与「创建图表」一致
			var p = randomParams();
				var key = p.chart + '|' + p.taxonomyKey + '|' + p.c + '|' + p.n + '|' + p.min + '|' + p.max + '|' + p.t;
			if (key !== _randomKey || !_randomCache){
				_randomKey = key;
				_randomCache = generateChartData(p.chart, p.c, p.n, p.min, p.max, p.t);
				window.__previewRandomData = _randomCache;
			}
			return _randomCache.table;
		}
		if (currentSource() === 'table') return tableData();
		if (currentSource() === 'json') return jsonData();
		return null;
	}






























	function pointInBox(point, box){ return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h; }
	function normalizedAngle(value){ while (value < 0) value += Math.PI * 2; while (value >= Math.PI * 2) value -= Math.PI * 2; return value; }
	function sceneHoverTargets(scene){
		return XChartCanvasAdapter.hoverTargets(scene).map(function(target){
			var bounds = target.bounds, meta = target.meta || {}, color = target.node.style.fill || target.node.style.stroke;
			var value = meta.value;
			var rows;
			if (meta.x != null && meta.y != null) {
				rows = [
					{ label: 'X', value: meta.x, color: color },
					{ label: 'Y', value: meta.y }
				];
				if (meta.weight != null) rows.push({ label: '权重', value: meta.weight });
			} else rows = [{ label: meta.series != null ? '系列 ' + (meta.series + 1) : '数值', value: value, color: color }];
			return {
				kind: 'box',
				box: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
				x: bounds.x + bounds.width / 2,
				y: bounds.y + bounds.height / 2,
				title: meta.label || target.name || '数据',
				rows: rows,
				node: target.node
			};
		});
	}
	function targetAt(point){
		var best = null, bestDistance = Infinity;
		hoverTargets.forEach(function(target){
			var distance = pointInBox(point, target.box) ? Math.hypot(point.x - target.x, point.y - target.y) : Infinity;
			if (distance !== Infinity && target.node && target.node.kind === 'arc') {
				var node = target.node, dx = point.x - node.cx, dy = point.y - node.cy, radius = Math.sqrt(dx * dx + dy * dy);
				var outer = node.outerRadius + ((node.style.strokeWidth || 0) / 2), inner = node.innerRadius;
				if (!node.style.fill) inner = Math.max(0, node.outerRadius - (node.style.strokeWidth || 1) / 2);
				var start = normalizedAngle(node.startAngle), angle = normalizedAngle(Math.atan2(dy, dx)), delta = node.endAngle - node.startAngle;
				if (delta < 0) { delta = -delta; angle = normalizedAngle(start - angle); } else angle = normalizedAngle(angle - start);
				distance = radius >= inner && radius <= outer && (delta >= Math.PI * 2 - 0.0001 || angle <= delta) ? 0 : Infinity;
			}
			if (distance < bestDistance) { best = target; bestDistance = distance; }
		});
		return best;
	}
	function renderTooltip(target){
		if (!tooltip || !target) return;
		tooltip.textContent = '';
		var title = document.createElement('div'); title.className = 'xchart-tooltip-title'; title.textContent = target.title; tooltip.appendChild(title);
		target.rows.forEach(function(row){
			var line = document.createElement('div'); line.className = 'xchart-tooltip-row';
			var label = document.createElement('span'); label.className = 'xchart-tooltip-label';
			if (row.color) { var swatch = document.createElement('i'); swatch.style.backgroundColor = row.color; label.appendChild(swatch); }
			label.appendChild(document.createTextNode(row.label));
			var value = document.createElement('strong'); value.textContent = row.value;
			line.appendChild(label); line.appendChild(value); tooltip.appendChild(line);
		});
		tooltip.setAttribute('aria-hidden', 'false');
		tooltip.classList.add('visible');
	}
	function placeTooltip(clientX, clientY){
		if (!tooltip || !canvas) return;
		var panel = canvas.parentElement, rect = panel.getBoundingClientRect();
		var left = clientX - rect.left + 12, top = clientY - rect.top + 12;
		left = Math.max(8, Math.min(left, rect.width - tooltip.offsetWidth - 8));
		top = Math.max(8, Math.min(top, rect.height - tooltip.offsetHeight - 8));
		tooltip.style.left = left + 'px'; tooltip.style.top = top + 'px';
	}
	function handlePointerMove(event){
		if (!getConfig().showValueTooltip) return hideTooltip();
		var rect = canvas.getBoundingClientRect();
		var point = { x: (event.clientX - rect.left) * canvas.clientWidth / rect.width, y: (event.clientY - rect.top) * canvas.clientHeight / rect.height };
		var target = targetAt(point);
		if (!target) return hideTooltip();
		renderTooltip(target); placeTooltip(event.clientX, event.clientY);
	}
	function hideTooltip(){
		if (!tooltip) return;
		tooltip.classList.remove('visible'); tooltip.setAttribute('aria-hidden', 'true');
	}
	function showKeyboardTarget(){
		if (!getConfig().showValueTooltip) return hideTooltip();
		if (!hoverTargets.length) return;
		keyboardIndex = Math.max(0, Math.min(keyboardIndex, hoverTargets.length - 1));
		var target = hoverTargets[keyboardIndex], rect = canvas.getBoundingClientRect();
		renderTooltip(target); placeTooltip(rect.left + target.x, rect.top + target.y);
	}
	function handleTooltipKeydown(event){
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Escape') return;
		if (event.key === 'Escape') { hideTooltip(); return; }
		if (!hoverTargets.length) return;
		event.preventDefault();
		keyboardIndex += (event.key === 'ArrowLeft' || event.key === 'ArrowUp') ? -1 : 1;
		if (keyboardIndex < 0) keyboardIndex = hoverTargets.length - 1;
		if (keyboardIndex >= hoverTargets.length) keyboardIndex = 0;
		showKeyboardTarget();
	}

	function render(){
		if (!ctx) return;
		var W = canvas.clientWidth, H = canvas.clientHeight;
		ctx.clearRect(0, 0, W, H);
		var chart, data, cfg;
		hoverTargets = [];
		hideTooltip();
		window.__xchartPreviewError = null;
		try {
			chart = currentChart();
			data = getData();
			cfg = getConfig();
			if (!data || data.length === 0 || data[0].length === 0) {
				ctx.fillStyle = '#8d8d8d';
				ctx.font = '12px "IBM Plex Sans", -apple-system, sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('调整参数实时查看预览', W / 2, H / 2);
				return;
			}
			var meta = getDataMeta(data);
			var scene = XChartCore.buildScene({ type: chart, data: data, categories: meta.categories, seriesNames: meta.series, config: cfg, width: W, height: H });
			window.__xchartScene = scene;
			XChartCanvasAdapter.draw(ctx, scene, { clear: false });
			hoverTargets = cfg.showValueTooltip ? sceneHoverTargets(scene) : [];
		} catch (e) {
			window.__xchartPreviewError = e;
			console.error('preview render error', e);
			ctx.fillStyle = '#b42318';
			ctx.font = '12px "IBM Plex Sans", -apple-system, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('预览失败：' + (e.message || '数据或配置无效'), W / 2, H / 2);
		}
	}

	var timer = null;
	function schedule(){
		if (timer) clearTimeout(timer);
		timer = setTimeout(function(){
			timer = null;
			if (rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(render);
		}, 120);
	}
	function update(){ schedule(); }

	$(document).on('input change', 'input, select', update);
	$(document).on('change', '#colorInput', update);
	window.addEventListener('resize', function(){
		if (timer) clearTimeout(timer);
		timer = setTimeout(function(){
			init();
			render();
		}, 100);
	});
	document.addEventListener('preview:update', update);

	function setTargetSize(size){
		var normalized = normalizeSize(size);
		if (!normalized) return;
		targetSize = normalized;
		if (canvas) { init(); render(); }
	}

	return { init: init, render: render, update: update, setTargetSize: setTargetSize, resize: function(){ init(); render(); }, getHoverTargets: function(){ return hoverTargets.slice(); } };
})();
