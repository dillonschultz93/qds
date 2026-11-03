/**
 * Build the Figma sync scripts from `tokens.json`.
 *
 *   node figma/build.js        → dist/figma/NN-*.js + dist/figma/manifest.json
 *
 * Each output is a self-contained Plugin API script (`figma/runtime.js` with a
 * payload prepended) for the Figma MCP server's `use_figma` tool. Run them in
 * manifest order against the Quieto Tokens file. Every step upserts by name, so
 * re-running after a token change updates Figma in place and keeps bindings.
 *
 * The sync is one-way: code → Figma. `tokens.json` is the source of truth.
 *
 * ## Shape in Figma
 *
 *   Primitives  (Value)        every primitive/* set
 *   Semantic    (Light, Dark)  semantic/base (same in both) + semantic/light|dark
 *   Component   (Default)      every component/* set, aliasing the two above
 *
 * Variable names are token paths with `/` (`color/blue/400`), as
 * docs/nomenclature.md specifies. Code syntax is the exact CSS name `name/qds`
 * produces, asserted below.
 *
 * ## Values Figma cannot hold as variables
 *
 * - `typography` composites → text styles (font family, size and weight bound).
 * - `shadow` composites → effect styles, each field bound to a variable. The
 *   elevation colour differs per mode, so each shadow gets a Figma-only Semantic
 *   helper (`elevation/<name>/color`) that the style binds to.
 * - Line heights are unitless and letter spacing is in `em`; Figma reads a bound
 *   variable as pixels for both. Those variables are code-only (no scopes) and the
 *   text styles carry them as percentages instead.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PREFIX, TIER_IDENTIFIERS } from '../nomenclature.js';
import { flattenTokens, loadTokensFile } from '../lib/source.js';
import { buildTokenName } from '../transforms/name-qds.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'dist', 'figma');

/** use_figma accepts at most 50 000 characters of code; leave headroom. */
const MAX_SCRIPT_CHARS = 45_000;
const REM = 16;

const COLLECTIONS = {
  primitive: { name: 'Primitives', modes: ['Value'] },
  semantic: { name: 'Semantic', modes: ['Light', 'Dark'] },
  component: { name: 'Component', modes: ['Default'] },
};

// ── Load ─────────────────────────────────────────────────────────────────────

const { sets } = await loadTokensFile(join(root, 'tokens.json'));
const setNames = Object.keys(sets);
const tokensOf = (name) => flattenTokens(sets[name]).map((t) => ({ ...t, set: name }));
const tierOf = (setName) => setName.split('/')[0];

// ── Value conversion ─────────────────────────────────────────────────────────

const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refPath = (v) => v.slice(1, -1);
const figmaName = (path) => (Array.isArray(path) ? path : path.split('.')).join('/');

function normalizeHex(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  if (!/^[0-9a-f]{8}$/.test(h)) throw new Error(`bad colour ${hex}`);
  return `#${h}`;
}

function parseDimension(value, where) {
  const m = /^(-?[\d.]+)(rem|px|em)?$/.exec(String(value));
  if (!m) throw new Error(`${where}: unsupported dimension ${value}`);
  const n = Number(m[1]);
  return m[2] === 'rem' ? +(n * REM).toFixed(4) : n;
}

const firstFamily = (stack) => stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '');

function figmaType(token) {
  switch (token.type) {
    case 'color': return 'C';
    case 'dimension':
    case 'fontWeight':
    case 'number': return 'F';
    case 'fontFamily': return 'S';
    case 'duration': return 'T';
    case 'cubicBezier': return 'E';
    default: return null; // composite: handled as a style
  }
}

function literal(token, where) {
  const v = token.value;
  switch (token.type) {
    case 'color': return normalizeHex(v);
    case 'dimension': return parseDimension(v, where);
    case 'fontWeight':
    case 'number': return Number(v);
    case 'fontFamily': return firstFamily(v);
    case 'duration': {
      const m = /^([\d.]+)ms$/.exec(v);
      if (!m) throw new Error(`${where}: unsupported duration ${v}`);
      return Number(m[1]) / 1000;
    }
    case 'cubicBezier': return v;
    default: throw new Error(`${where}: no literal conversion for ${token.type}`);
  }
}

// ── Scopes ───────────────────────────────────────────────────────────────────

const scopeSets = [];
const scopeIndex = (scopes) => {
  const key = JSON.stringify(scopes);
  let i = scopeSets.findIndex((s) => JSON.stringify(s) === key);
  if (i === -1) i = scopeSets.push(scopes) - 1;
  return i;
};

const FILL = ['FRAME_FILL', 'SHAPE_FILL'];

function scopesFor(token) {
  const { path, type } = token;
  const tier = tierOf(token.set);
  const joined = path.join('.');
  const last = path.at(-1);

  if (type === 'color') {
    if (tier === 'primitive') return path[1] === 'black' ? ['EFFECT_COLOR'] : [];
    const role = path[path.indexOf('color') + 1];
    if (role === 'background') return FILL;
    if (role === 'content') return ['TEXT_FILL', 'SHAPE_FILL'];
    if (role === 'border') return ['STROKE_COLOR'];
    return ['ALL_FILLS', 'STROKE_COLOR'];
  }
  if (type === 'fontWeight') return ['FONT_WEIGHT'];
  if (type === 'fontFamily') return ['FONT_FAMILY'];
  if (type === 'number') {
    if (joined.includes('line-height')) return []; // unitless; Figma would read px
    if (joined.includes('opacity')) return ['OPACITY'];
    throw new Error(`${joined}: no scope rule for number`);
  }
  if (type === 'dimension') {
    if (joined.includes('letter-spacing')) return []; // em; Figma would read px
    if (joined.includes('radius')) return ['CORNER_RADIUS'];
    if (joined.includes('font-size')) return ['FONT_SIZE'];
    if (path[0] === 'shadow') return ['EFFECT_FLOAT'];
    if (path[0] === 'spacing') return ['GAP', 'WIDTH_HEIGHT'];
    if (tier === 'semantic' && path[0] === 'border') return ['STROKE_FLOAT'];
    if (joined.includes('border-width') || (path[0] === 'border' && path[1] === 'width')) return ['STROKE_FLOAT'];
    if (/gap|padding|margin/.test(last)) return ['GAP'];
    if (/width|height|size/.test(last) || path[0] === 'size') return ['WIDTH_HEIGHT'];
    throw new Error(`${joined}: no scope rule for dimension`);
  }
  return [];
}

// ── Resolve every token into Figma variables ────────────────────────────────

/** Figma name → { collection, type } for alias checking. */
const index = new Map();
const vars = { primitive: new Map(), semantic: new Map(), component: new Map() };
const skipped = [];

function register(tier, token, values) {
  const name = figmaName(token.path);
  const type = figmaType(token);
  const existing = vars[tier].get(name);
  if (existing) {
    // semantic/light and semantic/dark both define the same names.
    existing.values.push(...values);
    return;
  }
  const entry = { name, type, scopes: scopesFor(token), values, description: token.description ?? '', path: token.path, tier };
  vars[tier].set(name, entry);
  index.set(name, { tier, type });
}

const encode = (token) => (isRef(token.value) ? `@${figmaName(refPath(token.value))}` : literal(token, token.path.join('.')));

for (const setName of setNames.filter((s) => tierOf(s) === 'primitive')) {
  for (const t of tokensOf(setName)) register('primitive', t, [encode(t)]);
}

for (const t of tokensOf('semantic/base')) {
  if (!figmaType(t)) { skipped.push(t); continue; }
  register('semantic', t, [encode(t)]);
}
for (const mode of ['semantic/light', 'semantic/dark']) {
  for (const t of tokensOf(mode)) {
    if (!figmaType(t)) { skipped.push(t); continue; }
    register('semantic', t, [encode(t)]);
  }
}

// Elevation: one Figma-only colour helper per shadow, switching with the mode.
const shadows = {};
for (const mode of ['semantic/light', 'semantic/dark']) {
  for (const t of tokensOf(mode).filter((x) => x.type === 'shadow')) {
    (shadows[t.path.join('/')] ??= {})[mode] = t;
  }
}
for (const [name, byMode] of Object.entries(shadows)) {
  const light = byMode['semantic/light'].value;
  const dark = byMode['semantic/dark'].value;
  for (const f of ['offsetX', 'offsetY', 'blur', 'spread']) {
    if (light[f] !== dark[f]) throw new Error(`${name}.${f} differs between modes; effect styles cannot follow that`);
  }
  const helper = `${name}/color`;
  vars.semantic.set(helper, {
    name: helper, type: 'C', scopes: ['EFFECT_COLOR'], figmaOnly: true, tier: 'semantic',
    values: [`@${figmaName(refPath(light.color))}`, `@${figmaName(refPath(dark.color))}`],
    description: `Figma-only: the colour of the ${name.replaceAll('/', '.')} shadow, split out so the effect style follows Light/Dark. In CSS the whole shadow is var(--${PREFIX}-semantic-${name.replaceAll('/', '-')}).`,
  });
  index.set(helper, { tier: 'semantic', type: 'C' });
}

for (const setName of setNames.filter((s) => tierOf(s) === 'component')) {
  for (const t of tokensOf(setName)) {
    if (!figmaType(t)) { skipped.push(t); continue; }
    register('component', t, [encode(t)]);
  }
}

// ── Checks ───────────────────────────────────────────────────────────────────

const problems = [];
for (const [tier, map] of Object.entries(vars)) {
  for (const v of map.values()) {
    const expected = COLLECTIONS[tier].modes.length;
    if (v.values.length !== 1 && v.values.length !== expected) problems.push(`${v.name}: ${v.values.length} values for ${expected} modes`);
    if (tier === 'semantic' && v.values.length === 1) v.values = [v.values[0]]; // base: same in both modes
    for (const raw of v.values) {
      if (typeof raw !== 'string' || !raw.startsWith('@')) continue;
      const target = index.get(raw.slice(1));
      if (!target) problems.push(`${v.name}: alias target ${raw.slice(1)} is not a variable`);
      else if (target.type !== v.type) problems.push(`${v.name}: ${v.type} aliases ${target.type} ${raw.slice(1)}`);
    }
    if (!v.figmaOnly) {
      const css = buildTokenName({ tier, path: v.path });
      const ours = [PREFIX, TIER_IDENTIFIERS[tier], ...v.path].filter(Boolean).join('-');
      if (css !== ours) problems.push(`${v.name}: runtime would emit --${ours}, build emits --${css}`);
    }
  }
}
if (problems.length) throw new Error(`figma/build.js:\n  ${problems.join('\n  ')}`);

// ── Styles ───────────────────────────────────────────────────────────────────

const primitive = (path) => {
  const name = figmaName(refPath(path));
  const v = vars.primitive.get(name);
  if (!v) throw new Error(`text style references ${name}, which is not a primitive`);
  return { name, value: v.values[0] };
};
const WEIGHT_STYLE = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };

const textStyles = tokensOf('semantic/base')
  .filter((t) => t.type === 'typography')
  .map((t) => {
    const f = primitive(t.value.fontFamily);
    const s = primitive(t.value.fontSize);
    const w = primitive(t.value.fontWeight);
    const lh = primitive(t.value.lineHeight);
    const ls = primitive(t.value.letterSpacing);
    return {
      name: figmaName(t.path),
      description: t.description ?? '',
      family: f.value,
      style: WEIGHT_STYLE[w.value],
      fontSize: s.value,
      lineHeight: lh.value,
      letterSpacingEm: ls.value,
      vars: { fontFamily: f.name, fontSize: s.name, fontWeight: w.name },
    };
  });

const effectStyles = Object.entries(shadows).map(([name, byMode]) => {
  const v = byMode['semantic/light'].value;
  return {
    name,
    description: `var(--${PREFIX}-semantic-${name.replaceAll('/', '-')}). Colour follows the Semantic collection's mode.`,
    bind: {
      color: `${name}/color`,
      offsetX: figmaName(refPath(v.offsetX)),
      offsetY: figmaName(refPath(v.offsetY)),
      radius: figmaName(refPath(v.blur)),
      spread: figmaName(refPath(v.spread)),
    },
  };
});

// ── Emit ─────────────────────────────────────────────────────────────────────

const runtime = await readFile(join(here, 'runtime.js'), 'utf8');
const allCollections = Object.values(COLLECTIONS).map((c) => c.name);
const script = (payload) => `const PAYLOAD = ${JSON.stringify(payload)};\n${runtime}`;
const tuple = (v) => {
  const t = [v.name, v.type, scopeIndex(v.scopes), v.values, v.description];
  if (v.figmaOnly) t.push(true);
  return t;
};

// Scopes must be fully indexed before any payload is serialised.
for (const map of Object.values(vars)) for (const v of map.values()) scopeIndex(v.scopes);

const base = { prefix: PREFIX, allCollections, scopeSets };
const steps = [];

for (const [tier, map] of Object.entries(vars)) {
  const { name, modes } = COLLECTIONS[tier];
  const tierId = TIER_IDENTIFIERS[tier];
  let chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    steps.push({ label: `variables-${tier}`, payload: { ...base, step: 'variables', collections: [{ name, tierId, modes, vars: chunk }] } });
    chunk = [];
  };
  for (const v of map.values()) {
    chunk.push(tuple(v));
    const size = script({ ...base, step: 'variables', collections: [{ name, tierId, modes, vars: chunk }] }).length;
    if (size > MAX_SCRIPT_CHARS) { chunk.pop(); flush(); chunk.push(tuple(v)); }
  }
  flush();
}

steps.push({
  label: 'prune',
  payload: { ...base, step: 'prune', keep: Object.fromEntries(Object.entries(vars).map(([tier, map]) => [COLLECTIONS[tier].name, [...map.keys()]])) },
});
steps.push({ label: 'styles', payload: { ...base, step: 'styles', textStyles, effectStyles } });

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const manifest = [];
for (const [i, s] of steps.entries()) {
  const file = `${String(i + 1).padStart(2, '0')}-${s.label}.js`;
  const code = script(s.payload);
  if (code.length > 50_000) throw new Error(`${file} is ${code.length} chars; use_figma accepts 50 000`);
  await writeFile(join(outDir, file), code);
  manifest.push({ file, chars: code.length });
}
await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const count = (tier) => vars[tier].size;
console.log(
  `figma: ${count('primitive')} primitive, ${count('semantic')} semantic, ${count('component')} component variables; ` +
    `${textStyles.length} text styles, ${effectStyles.length} effect styles; ` +
    `${skipped.length} composites skipped as variables (${[...new Set(skipped.map((t) => t.type))].join(', ')}).`,
);
for (const m of manifest) console.log(`  ${m.file}  ${m.chars} chars`);
