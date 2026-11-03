/**
 * Figma-side runtime for the token sync. NOT run by Node.
 *
 * `figma/build.js` reads this file as text and prepends `const PAYLOAD = …;` to
 * produce each script in `dist/figma/`. Those scripts run inside a Figma file
 * through the Plugin API — via the Figma MCP server's `use_figma` tool — with
 * top-level `await` and `return` (the tool wraps them in an async function).
 *
 * Every step is an idempotent upsert keyed by name, so re-running the whole
 * sequence after a token change updates Figma in place and keeps variable IDs
 * (and therefore every binding on the canvas) intact.
 */

/* global figma, PAYLOAD */

const report = { step: PAYLOAD.step, created: [], updated: 0, deleted: [], warnings: [] };

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPES = { C: 'COLOR', F: 'FLOAT', S: 'STRING', T: 'TIMING', E: 'EASING' };

function hexToRgba(hex) {
  const h = hex.slice(1);
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

async function localVariablesByName() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionName = new Map(collections.map((c) => [c.id, c.name]));
  const byName = new Map();
  for (const v of await figma.variables.getLocalVariablesAsync()) {
    byName.set(`${collectionName.get(v.variableCollectionId)}::${v.name}`, v);
  }
  return { collections, byName };
}

/** Find a variable in any managed collection by its Figma name. */
function lookup(byName, name) {
  for (const c of PAYLOAD.allCollections) {
    const v = byName.get(`${c}::${name}`);
    if (v) return v;
  }
  return null;
}

function decode(raw, type, byName) {
  if (typeof raw === 'string' && raw.startsWith('@')) {
    const target = lookup(byName, raw.slice(1));
    if (!target) throw new Error(`alias target not found: ${raw.slice(1)}`);
    return { type: 'VARIABLE_ALIAS', id: target.id };
  }
  if (type === 'COLOR') return hexToRgba(raw);
  if (type === 'EASING') {
    const [x1, y1, x2, y2] = raw;
    return { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1, y1, x2, y2 } };
  }
  return raw;
}

// ── Step: variables ──────────────────────────────────────────────────────────

async function syncVariables() {
  let { collections, byName } = await localVariablesByName();

  for (const spec of PAYLOAD.collections) {
    let collection = collections.find((c) => c.name === spec.name);
    if (!collection) {
      collection = figma.variables.createVariableCollection(spec.name);
      report.created.push(`collection ${spec.name} ${collection.id}`);
    }

    // Modes, by position: rename to match, add missing.
    spec.modes.forEach((modeName, i) => {
      if (collection.modes[i]) {
        if (collection.modes[i].name !== modeName) collection.renameMode(collection.modes[i].modeId, modeName);
      } else {
        collection.addMode(modeName);
      }
    });
    const modeIds = spec.modes.map((_, i) => collection.modes[i].modeId);

    for (const [name, typeCode, scopeIndex, values, description, figmaOnly] of spec.vars) {
      const type = TYPES[typeCode];
      const key = `${spec.name}::${name}`;
      let variable = byName.get(key);

      if (variable && variable.resolvedType !== type) {
        report.warnings.push(`${name}: type ${variable.resolvedType} → ${type}, recreated`);
        variable.remove();
        variable = null;
      }
      if (!variable) {
        variable = figma.variables.createVariable(name, collection, type);
        byName.set(key, variable);
        report.created.push(name);
      } else {
        report.updated++;
      }

      modeIds.forEach((modeId, i) => {
        const raw = values.length === 1 ? values[0] : values[i];
        variable.setValueForMode(modeId, decode(raw, type, byName));
      });

      if (type !== 'TIMING' && type !== 'EASING') {
        variable.scopes = PAYLOAD.scopeSets[scopeIndex];
      }

      // `figma/build.js` asserts this formula matches `buildTokenName` for every token.
      // Figma-only helpers (sixth tuple slot) have no CSS counterpart, so no syntax.
      if (!figmaOnly) {
        const cssName = [PAYLOAD.prefix, spec.tierId, ...name.split('/')].filter(Boolean).join('-');
        variable.setVariableCodeSyntax('WEB', `var(--${cssName})`);
      } else if (variable.codeSyntax.WEB) {
        variable.removeVariableCodeSyntax('WEB');
      }

      variable.description = description || '';
    }
  }
}

// ── Step: prune variables no longer in tokens.json ──────────────────────────

async function pruneVariables() {
  const { byName } = await localVariablesByName();
  const keep = new Set();
  for (const [collection, names] of Object.entries(PAYLOAD.keep)) {
    for (const n of names) keep.add(`${collection}::${n}`);
  }
  for (const [key, variable] of byName) {
    const [collection] = key.split('::');
    if (PAYLOAD.allCollections.includes(collection) && !keep.has(key)) {
      report.deleted.push(key);
      variable.remove();
    }
  }
}

// ── Step: text + effect styles ──────────────────────────────────────────────

async function syncStyles() {
  const { byName } = await localVariablesByName();
  const need = (name) => {
    const v = lookup(byName, name);
    if (!v) throw new Error(`variable not found: ${name}`);
    return v;
  };

  const textStyles = await figma.getLocalTextStylesAsync();
  for (const t of PAYLOAD.textStyles) {
    await figma.loadFontAsync({ family: t.family, style: t.style });
    let style = textStyles.find((s) => s.name === t.name);
    if (!style) {
      style = figma.createTextStyle();
      style.name = t.name;
      report.created.push(`text style ${t.name} ${style.id}`);
    } else {
      report.updated++;
    }
    // Clear old bindings first: a stale lineHeight binding would override the percent value.
    for (const field of Object.keys(style.boundVariables || {})) style.setBoundVariable(field, null);

    style.fontName = { family: t.family, style: t.style };
    style.fontSize = t.fontSize;
    style.lineHeight = { unit: 'PERCENT', value: +(t.lineHeight * 100).toFixed(3) };
    style.letterSpacing = { unit: 'PERCENT', value: +(t.letterSpacingEm * 100).toFixed(3) };
    style.description = t.description;

    style.setBoundVariable('fontFamily', need(t.vars.fontFamily));
    style.setBoundVariable('fontSize', need(t.vars.fontSize));
    style.setBoundVariable('fontWeight', need(t.vars.fontWeight));
  }

  const effectStyles = await figma.getLocalEffectStylesAsync();
  for (const e of PAYLOAD.effectStyles) {
    let style = effectStyles.find((s) => s.name === e.name);
    if (!style) {
      style = figma.createEffectStyle();
      style.name = e.name;
      report.created.push(`effect style ${e.name} ${style.id}`);
    } else {
      report.updated++;
    }
    let effect = {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 0 },
      radius: 0,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
      showShadowBehindNode: false,
    };
    for (const [field, varName] of Object.entries(e.bind)) {
      effect = figma.variables.setBoundVariableForEffect(effect, field, need(varName));
    }
    style.effects = [effect];
    style.description = e.description;
  }
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

if (PAYLOAD.step === 'variables') await syncVariables();
else if (PAYLOAD.step === 'prune') await pruneVariables();
else if (PAYLOAD.step === 'styles') await syncStyles();
else throw new Error(`unknown step ${PAYLOAD.step}`);

return { ...report, createdCount: report.created.length, created: report.created.slice(0, 40) };
