(function(root, factory){
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XChartConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  var META_KEYS = { id: true, name: true, updatable: true };

  function isObject(value){
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function deepClone(value){
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepEqual(left, right){
    if (left === right) return true;
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
      for (var i = 0; i < left.length; i++) if (!deepEqual(left[i], right[i])) return false;
      return true;
    }
    if (isObject(left) || isObject(right)) {
      if (!isObject(left) || !isObject(right)) return false;
      var leftKeys = Object.keys(left), rightKeys = Object.keys(right);
      if (leftKeys.length !== rightKeys.length) return false;
      for (var k = 0; k < leftKeys.length; k++) {
        var key = leftKeys[k];
        if (!Object.prototype.hasOwnProperty.call(right, key) || !deepEqual(left[key], right[key])) return false;
      }
      return true;
    }
    return false;
  }

  function deepMerge(base, overrides){
    if (overrides === undefined) return deepClone(base);
    if (Array.isArray(overrides)) return deepClone(overrides);
    if (!isObject(overrides)) return overrides;
    var output = isObject(base) ? deepClone(base) : {};
    Object.keys(overrides).forEach(function(key){
      output[key] = isObject(overrides[key])
        ? deepMerge(isObject(output[key]) ? output[key] : {}, overrides[key])
        : deepClone(overrides[key]);
    });
    return output;
  }

  function cleanTemplate(template){
    var cleaned = {};
    Object.keys(template || {}).forEach(function(key){
      if (!META_KEYS[key]) cleaned[key] = deepClone(template[key]);
    });
    return cleaned;
  }

  function diffSettings(template, resolved){
    var base = cleanTemplate(template || {});
    var current = cleanTemplate(resolved || {});
    var diff = {};
    Object.keys(current).forEach(function(key){
      if (deepEqual(base[key], current[key])) return;
      if (isObject(base[key]) && isObject(current[key])) {
        var nested = diffSettings(base[key], current[key]);
        if (Object.keys(nested).length) diff[key] = nested;
      } else {
        diff[key] = deepClone(current[key]);
      }
    });
    return diff;
  }

  function findTemplate(templates, id){
    for (var i = 0; i < (templates || []).length; i++) {
      if (String(templates[i].id) === String(id)) return templates[i];
    }
    return null;
  }

  function resolveSettings(template, overrides, fallbackSnapshot, mode){
    if (mode === 'frozen' || mode === 'detached' || !template) return deepClone(fallbackSnapshot || {});
    var resolved = deepMerge(cleanTemplate(template), overrides || {});
    resolved.id = template.id;
    resolved.name = template.name;
    resolved.updatable = true;
    return resolved;
  }

  function migrateConfig(config, templates){
    var migrated = deepClone(config || {});
    var settings = migrated.settings || {};
    var templateRef = migrated.templateRef || {};
    var templateId = templateRef.id != null ? templateRef.id : settings.id;
    var template = findTemplate(templates, templateId);
    var mode = templateRef.mode;
    if (mode !== 'linked' && mode !== 'frozen' && mode !== 'detached') {
      mode = settings.updatable === true ? 'linked' : 'frozen';
    }
    migrated.schemaVersion = 2;
    migrated.templateRef = {
      id: template ? template.id : templateId,
      mode: template ? mode : 'detached',
      revision: Number(templateRef.revision) || 1
    };
    if (!migrated.overrides) {
      migrated.overrides = template && mode === 'linked' ? diffSettings(template, settings) : {};
    }
    migrated.settings = resolveSettings(template, migrated.overrides, settings, migrated.templateRef.mode);
    migrated.settings.updatable = migrated.templateRef.mode === 'linked';
    return migrated;
  }

  function prepareConfigForSave(config, templates, options){
    var prepared = deepClone(config || {});
    options = options || {};
    var settings = prepared.settings || {};
    var id = options.templateId != null ? options.templateId : (prepared.templateRef && prepared.templateRef.id != null ? prepared.templateRef.id : settings.id);
    var template = findTemplate(templates, id);
    var mode = options.mode || (prepared.templateRef && prepared.templateRef.mode) || 'linked';
    if (!template) mode = 'detached';
    var snapshot = deepClone(options.resolvedSettings || settings);
    prepared.schemaVersion = 2;
    prepared.templateRef = { id: template ? template.id : id, mode: mode, revision: Number(options.revision) || 1 };
    prepared.overrides = template && mode === 'linked' ? diffSettings(template, snapshot) : {};
    prepared.settings = resolveSettings(template, prepared.overrides, snapshot, mode);
    prepared.settings.updatable = mode === 'linked';
    return prepared;
  }

  function resetOverrides(config, template){
    var reset = deepClone(config || {});
    reset.overrides = {};
    reset.templateRef = reset.templateRef || { id: template && template.id, mode: 'linked', revision: 1 };
    reset.templateRef.mode = 'linked';
    reset.settings = resolveSettings(template, {}, reset.settings, 'linked');
    return reset;
  }

  return {
    deepClone: deepClone,
    deepMerge: deepMerge,
    diffSettings: diffSettings,
    findTemplate: findTemplate,
    resolveSettings: resolveSettings,
    migrateConfig: migrateConfig,
    prepareConfigForSave: prepareConfigForSave,
    resetOverrides: resetOverrides
  };
});
