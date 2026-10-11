(function(root, factory){
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XChartData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  var NON_NEGATIVE_CHARTS = {
    stackedAreaChart: true,
    percentStackedAreaChart: true,
    streamGraph: true,
    verticalBarChart: true,
    horizontalBarChart: true
  };

  function parseNumber(value){
    if (value === null || value === undefined) return { ok: false, reason: 'empty' };
    var text = String(value).trim();
    if (!text) return { ok: false, reason: 'empty' };

    var percent = /%$/.test(text);
    if (percent) text = text.slice(0, -1).trim();
    text = text.replace(/^[\$\u00a5\uffe5\u20ac\u00a3]\s*/, '');

    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)) {
      text = text.replace(/,/g, '');
    }
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      return { ok: false, reason: 'format' };
    }

    var number = Number(text);
    if (!isFinite(number)) return { ok: false, reason: 'range' };
    return { ok: true, value: number, percent: percent };
  }

  function dataError(code, message, row, column, path){
    var error = new Error(message);
    error.xchart = { code: code, row: row, column: column, path: path || null, message: message };
    return error;
  }

  function numberAt(value, row, column, path){
    var parsed = parseNumber(value);
    if (!parsed.ok) {
      var message = parsed.reason === 'empty' ? '数据中存在空值' : '无效数字：' + String(value);
      throw dataError(parsed.reason, message, row, column, path);
    }
    return parsed.value;
  }

  function tableMin(table){
    var min = Infinity;
    table.forEach(function(row){ row.forEach(function(value){ min = Math.min(min, value); }); });
    return min === Infinity ? 0 : min;
  }

  function tableMax(table){
    var max = -Infinity;
    table.forEach(function(row){ row.forEach(function(value){ max = Math.max(max, value); }); });
    return max === -Infinity ? 0 : max;
  }

  function processData(csv){
    csv = csv || {};
    var raw = Array.isArray(csv.data) ? csv.data : [];
    if (!raw.length || !Array.isArray(raw[0])) throw dataError('shape', '表格数据不能为空');
    var header = false;
    var table;
    var seriesNames = [];
    if (csv.type === null || csv.type === undefined) {
      var width = raw[0].length;
      header = csv.headers === true ? raw[0].slice() : false;
      table = (csv.headers === true ? raw.slice(1) : raw).map(function(row, rowIndex){
        if (!Array.isArray(row) || row.length !== width) throw dataError('length', '第 ' + (rowIndex + 1) + ' 行长度与表头不一致', rowIndex, null);
        if (row.every(function(value){ return value === null || value === undefined || String(value).trim() === ''; })) return null;
        return row.map(function(value, columnIndex){ return numberAt(value, rowIndex, columnIndex); });
      }).filter(function(row){ return row !== null; });
      seriesNames = (csv.seriesNames || []).slice(0, table.length).map(function(name, index){
        var text = String(name == null ? '' : name).trim();
        return text || '系列 ' + (index + 1);
      });
    } else {
      var columns = (csv.columns || []).filter(function(column){ return column.checked; });
      if (!columns.length) throw dataError('selection', '请至少选择一列图表数据');
      var selectedIndexes = columns.map(function(column){ return Number(column.index); });
      var selectedSeries = selectedIndexes.map(function(columnIndex, seriesIndex){
        var values = raw.map(function(row, rowIndex){
          if (!Array.isArray(row) || columnIndex < 0 || columnIndex >= row.length) throw dataError('length', '第 ' + (rowIndex + 1) + ' 行缺少数据列', rowIndex, columnIndex);
          return row[columnIndex];
        });
        if (values.every(function(value){ return value === null || value === undefined || String(value).trim() === ''; })) return null;
        return {
          values: values.map(function(value, rowIndex){ return numberAt(value, rowIndex, columnIndex); }),
          name: columns[seriesIndex].name || '系列 ' + (seriesIndex + 1)
        };
      }).filter(function(series){ return series !== null; });
      table = selectedSeries.map(function(series){ return series.values; });
      seriesNames = selectedSeries.map(function(series){ return series.name; });
      var selectedHeader = (csv.header || []).filter(function(item){ return item.checked; })[0];
      header = selectedHeader ? raw.map(function(row){ return row[selectedHeader.index]; }) : [];
    }
    var columnsCount = table[0] ? table[0].length : 0;
    while (seriesNames.length < table.length) seriesNames.push('系列 ' + (seriesNames.length + 1));
    return { table: table, rows: table.length, columns: columnsCount, min: tableMin(table), max: tableMax(table), header: header, seriesNames: seriesNames };
  }

  function pathParts(path){
    if (Array.isArray(path)) return path;
    return String(path || '').split('.').filter(function(part){ return part !== ''; });
  }

  function valueAtPath(object, path){
    var value = object;
    pathParts(path).forEach(function(part){
      if (value !== null && value !== undefined) value = value[part];
      else value = undefined;
    });
    return value;
  }

  function valuesForLegacyKey(object, key, path, out){
    out = out || [];
    if (!object || typeof object !== 'object') return out;
    Object.keys(object).forEach(function(name){
      var value = object[name];
      var nextPath = path ? path + '.' + name : name;
      if (value && typeof value === 'object' && !Array.isArray(value)) valuesForLegacyKey(value, key, nextPath, out);
      else if (name === key) out.push({ value: value, path: nextPath });
    });
    return out;
  }

  function selectedJsonValues(records, key){
    var path = key && (key.path || key.namePath);
    if (path) return records.map(function(record){ return { value: valueAtPath(record, path), path: path }; });
    var values = [];
    records.forEach(function(record){ values = values.concat(valuesForLegacyKey(record, key && key.name)); });
    return values;
  }

  function processJSON(records, rawKeys, rawHeader){
    if (!Array.isArray(records) || !records.length) throw dataError('json-shape', 'JSON 顶层必须是非空对象数组');
    if (!records.every(function(record){ return record && Object.prototype.toString.call(record) === '[object Object]'; })) throw dataError('json-shape', 'JSON 每一项必须是对象');
    var keys = (rawKeys || []).filter(function(key){ return key.checked === true; });
    if (!keys.length) throw dataError('selection', '请至少选择一个数据字段');
    var selectedHeader = (rawHeader || []).filter(function(item){ return item.checked === true; })[0];
    var headerValues = selectedHeader ? selectedJsonValues(records, selectedHeader) : [];
    var header = headerValues.map(function(item){ return item.value; });
    var selectedSeries = keys.map(function(key, seriesIndex){
      var values = selectedJsonValues(records, key);
      if (values.length !== records.length) throw dataError('length', 'JSON 字段“' + key.name + '”长度与数据记录不一致', seriesIndex, null, key.path || key.name);
      if (values.every(function(item){ return item.value === null || item.value === undefined || String(item.value).trim() === ''; })) return null;
      return {
        values: values.map(function(item, rowIndex){ return numberAt(item.value, rowIndex, seriesIndex, item.path); }),
        name: key.name || '系列 ' + (seriesIndex + 1)
      };
    }).filter(function(series){ return series !== null; });
    var table = selectedSeries.map(function(series){ return series.values; });
    return {
      table: table,
      rows: table.length,
      columns: table[0] ? table[0].length : 0,
      min: tableMin(table),
      max: tableMax(table),
      header: header,
      seriesNames: selectedSeries.map(function(series){ return series.name; })
    };
  }

  function parseCSV(text){
    var input = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    var rows = [], row = [], field = '', quoted = false;

    for (var i = 0; i < input.length; i++) {
      var char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
      } else if (char === '"' && field === '') {
        quoted = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && input[i + 1] === '\n') i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (quoted) throw new Error('CSV 中存在未闭合的引号');
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    while (rows.length && rows[rows.length - 1].every(function(cell){ return cell === ''; })) rows.pop();
    return rows;
  }

  function isBubble(taxonomySelection){
    return !!(taxonomySelection && taxonomySelection.baseId === 'bubble');
  }

  function validateSeriesTable(table, chartId, taxonomySelection){
    var errors = [];
    if (!Array.isArray(table) || table.length < 2 || !Array.isArray(table[0]) || table[0].length === 0) {
      return { valid: false, errors: [{ code: 'shape', message: '请至少填写一列标签和一列数据' }] };
    }

    var columns = table[0].length;
    if (chartId === 'scatterPlot') {
      var expectedSeries = isBubble(taxonomySelection) ? 3 : 2;
      if (table.length !== expectedSeries + 1) {
        errors.push({
          code: 'series-count',
          message: isBubble(taxonomySelection) ? '气泡图需要 X、Y、权重 3 个数据系列' : '散点图需要 X、Y 2 个数据系列'
        });
      }
    }
    for (var rowIndex = 1; rowIndex < table.length; rowIndex++) {
      var row = table[rowIndex];
      if (!Array.isArray(row) || row.length !== columns) {
        errors.push({ code: 'length', row: rowIndex, message: '第 ' + rowIndex + ' 个数据系列长度与标签列不一致' });
        continue;
      }
      for (var columnIndex = 0; columnIndex < columns; columnIndex++) {
        var parsed = parseNumber(row[columnIndex]);
        if (!parsed.ok) {
          errors.push({
            code: parsed.reason,
            row: rowIndex,
            column: columnIndex,
            message: '第 ' + (columnIndex + 1) + ' 个数据点不是有效数字'
          });
        } else if (isBubble(taxonomySelection) && rowIndex === 3 && parsed.value < 0) {
          errors.push({
            code: 'negative-weight',
            row: rowIndex,
            column: columnIndex,
            message: '气泡权重不能小于 0'
          });
        } else if (NON_NEGATIVE_CHARTS[chartId] && parsed.value < 0) {
          errors.push({
            code: 'negative-stack',
            row: rowIndex,
            column: columnIndex,
            message: '当前堆叠图不支持负数，请改用普通折线图或面积图'
          });
        }
      }
    }

    if (chartId === 'percentStackedAreaChart' && errors.length === 0) {
      for (var column = 0; column < columns; column++) {
        var total = 0;
        for (var series = 1; series < table.length; series++) total += parseNumber(table[series][column]).value;
        if (total <= 0) {
          errors.push({ code: 'zero-total', column: column, message: '百分比堆叠图的每个数据点合计必须大于 0' });
        }
      }
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateJsonRecords(value){
    if (!Array.isArray(value) || value.length === 0) {
      return { valid: false, message: 'JSON 顶层必须是非空对象数组' };
    }
    for (var i = 0; i < value.length; i++) {
      if (!value[i] || Object.prototype.toString.call(value[i]) !== '[object Object]') {
        return { valid: false, message: 'JSON 第 ' + (i + 1) + ' 项不是对象' };
      }
    }
    return { valid: true };
  }

  function validateImportedTable(csv, chartId, taxonomySelection){
    if (!csv || !Array.isArray(csv.data) || csv.data.length === 0) {
      return { valid: false, errors: [{ code: 'shape', message: '请先导入 CSV 数据' }] };
    }
    var columns = (csv.columns || []).filter(function(column){ return column.checked; });
    if (columns.length === 0) {
      return { valid: false, errors: [{ code: 'selection', message: '请至少选择一列图表数据' }] };
    }
    var labels = csv.data.map(function(_, index){ return String(index + 1); });
    var table = [labels].concat(columns.map(function(column){
      return csv.data.map(function(row){ return Array.isArray(row) ? row[column.index] : undefined; });
    }));
    return validateSeriesTable(table, chartId, taxonomySelection);
  }

  function convertImportedTableToManual(csv){
    var rows = csv && Array.isArray(csv.data) ? csv.data : [];
    var selectedColumns = (csv && csv.columns || []).filter(function(column){ return column.checked; });
    var selectedHeader = (csv && csv.header || []).find(function(header){ return header.checked; });
    var labels = rows.map(function(row, index){
      return selectedHeader && Array.isArray(row) ? row[selectedHeader.index] : String(index + 1);
    });
    var data = [labels].concat(selectedColumns.map(function(column){
      return rows.map(function(row){ return Array.isArray(row) ? row[column.index] : ''; });
    }));
    return {
      name: null,
      type: null,
      data: data,
      headers: true,
      seriesNames: selectedColumns.map(function(column, index){ return column.name || '系列 ' + (index + 1); }),
      columns: [],
      header: []
    };
  }

  function validateJsonSeries(records, keys, chartId, taxonomySelection){
    var recordsValidation = validateJsonRecords(records);
    if (!recordsValidation.valid) {
      return { valid: false, errors: [{ code: 'json-shape', message: recordsValidation.message }] };
    }
    var selectedKeys = (keys || []).filter(function(key){ return key.checked; });
    if (selectedKeys.length === 0) {
      return { valid: false, errors: [{ code: 'selection', message: '请至少选择一个数据字段' }] };
    }
    var labels = records.map(function(_, index){ return String(index + 1); });
    var table = [labels].concat(selectedKeys.map(function(key){
      return selectedJsonValues(records, key).map(function(item){ return item.value; });
    }));
    return validateSeriesTable(table, chartId, taxonomySelection);
  }

  return {
    parseNumber: parseNumber,
    processData: processData,
    processJSON: processJSON,
    getJsonValues: function(records, key){
      return selectedJsonValues(records, typeof key === 'string' ? { name: key } : key).map(function(item){ return item.value; });
    },
    dataError: dataError,
    parseCSV: parseCSV,
    validateSeriesTable: validateSeriesTable,
    validateJsonRecords: validateJsonRecords,
    validateImportedTable: validateImportedTable,
    convertImportedTableToManual: convertImportedTableToManual,
    validateJsonSeries: validateJsonSeries
  };
});
