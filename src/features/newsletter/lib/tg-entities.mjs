// Pure helpers for Telegram text + MessageEntity models.
// All offsets/lengths are UTF-16 code units == JS string indices.

export const ENTITY_TYPES = [
  'bold', 'italic', 'underline', 'strikethrough', 'spoiler',
  'code', 'pre', 'text_link', 'blockquote', 'expandable_blockquote',
];
export const BLOCK_TYPES = new Set(['pre', 'blockquote', 'expandable_blockquote']);
export const QUOTE_TYPES = new Set(['blockquote', 'expandable_blockquote']);
const MONO = new Set(['code', 'pre']);
const MERGEABLE = new Set(['bold', 'italic', 'underline', 'strikethrough', 'spoiler', 'code', 'pre', 'text_link']);
const RANK = {
  blockquote: 0, expandable_blockquote: 0, pre: 1, text_link: 2,
  bold: 3, italic: 4, underline: 5, strikethrough: 6, spoiler: 7, code: 8,
};

export const end = e => e.offset + e.length;

export const normalizeText = s => String(s).replace(/\r\n?/g, '\n').replace(/ /g, ' ');

export const sortEntities = es => [...es].sort((a, b) =>
  a.offset - b.offset || b.length - a.length || (RANK[a.type] ?? 9) - (RANK[b.type] ?? 9));

const sameAttrs = (a, b) =>
  a.type === b.type && (a.url ?? '') === (b.url ?? '') && (a.language ?? '') === (b.language ?? '');

// subtract [s,e) from entity -> 0..2 entities
const cut = (en, s, e) => {
  if (e <= en.offset || s >= end(en)) return [en];
  const out = [];
  if (s > en.offset) out.push({ ...en, length: s - en.offset });
  if (e < end(en)) out.push({ ...en, offset: e, length: end(en) - e });
  return out;
};

/** Clamp, drop invalid, keep mono entities free of other formatting, merge, sort. */
export function canonicalize(text, entities) {
  const len = text.length;
  let es = [];
  for (const raw of entities || []) {
    if (!ENTITY_TYPES.includes(raw.type)) continue;
    const offset = Math.max(0, raw.offset | 0);
    const e = Math.min(len, (raw.offset | 0) + (raw.length | 0));
    if (e <= offset) continue;
    const en = { type: raw.type, offset, length: e - offset };
    if (raw.type === 'text_link') {
      if (!raw.url) continue;
      en.url = raw.url;
    }
    if (raw.type === 'pre' && raw.language) en.language = raw.language;
    es.push(en);
  }

  // code/pre can not contain other entities (except pre inside blockquote)
  const mono = es.filter(e => MONO.has(e.type));
  if (mono.length) {
    es = es.flatMap(en => {
      if (MONO.has(en.type) || QUOTE_TYPES.has(en.type)) return [en];
      return mono.reduce((acc, m) => acc.flatMap(x => cut(x, m.offset, end(m))), [en]);
    });
    // overlapping code/pre: keep the earlier one only for the overlapping part
    const monoSorted = sortEntities(es.filter(e => MONO.has(e.type)));
    const keep = []; let lastEnd = -1;
    for (const m of monoSorted) {
      if (m.offset >= lastEnd) { keep.push(m); lastEnd = end(m); }
      else if (end(m) > lastEnd) { keep.push({ ...m, offset: lastEnd, length: end(m) - lastEnd }); lastEnd = end(m); }
    }
    es = es.filter(e => !MONO.has(e.type)).concat(keep);
  }

  // merge touching/overlapping same-type entities; overlapping quotes merge too
  es = sortEntities(es);
  const merged = [];
  for (const en of es) {
    let target = null;
    if (MERGEABLE.has(en.type)) {
      for (let i = merged.length - 1; i >= 0; i--) {
        const m = merged[i];
        if (sameAttrs(m, en) && end(m) >= en.offset) { target = m; break; }
      }
    } else if (QUOTE_TYPES.has(en.type)) {
      target = merged.find(m => QUOTE_TYPES.has(m.type) && end(m) >= en.offset) ?? null;
      if (target && en.type === 'expandable_blockquote') target.type = 'expandable_blockquote';
    }
    if (target) target.length = Math.max(end(target), end(en)) - target.offset;
    else merged.push({ ...en });
  }
  return sortEntities(merged);
}

export const makeModel = (text = '', entities = []) => {
  const t = normalizeText(text);
  return { text: t, entities: canonicalize(t, entities) };
};

/** Replace [s,e) of text by `str` (with optional entities relative to `str`). */
export function replaceRange(model, s, e, str, insEntities = []) {
  if (s > e) [s, e] = [e, s];
  str = normalizeText(str);
  const n = str.length;
  const delta = n - (e - s);
  const text = model.text.slice(0, s) + str + model.text.slice(e);
  const mapStart = p => (p < s ? p : p >= e ? (p === s && s === e ? p + n : p + delta) : s + n);
  const mapEnd = p => (p <= s ? (p === s && s === e ? p + n : p) : p >= e ? p + delta : s);
  const kept = [];
  for (const en of model.entities) {
    // Entities that merely touch the insertion point from the left grow when typing at their end
    // (text_link does not: link text stays what the user selected).
    const ns = mapStart(en.offset);
    let ne = mapEnd(end(en));
    if (s === e && end(en) === s && en.offset < s && en.type === 'text_link') ne = s;
    if (ne > ns) kept.push({ ...en, offset: ns, length: ne - ns });
  }
  for (const en of insEntities) kept.push({ ...en, offset: en.offset + s });
  return { text, entities: canonicalize(text, kept) };
}

/** Parts of [s,e) covered by entities of `type` (merged intervals). */
const coverage = (entities, type, s, e) => {
  const iv = entities.filter(x => x.type === type && end(x) > s && x.offset < e)
    .map(x => [Math.max(s, x.offset), Math.min(e, end(x))]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [a, b] of iv) {
    if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out;
};

export const isCovered = (entities, type, s, e) => {
  if (e <= s) return false;
  const c = coverage(entities, type, s, e);
  return c.length === 1 && c[0][0] <= s && c[0][1] >= e;
};

const removeType = (entities, types, s, e) => entities.flatMap(en => (types.has(en.type) ? cut(en, s, e) : [en]));

/** Expand [s,e) to whole lines (used for blocks). */
export function lineBounds(text, s, e) {
  if (e > s && text[e - 1] === '\n') e -= 1;
  const ls = text.lastIndexOf('\n', s - 1) + 1;
  let le = text.indexOf('\n', e);
  if (le < 0) le = text.length;
  return [ls, le];
}

/** Toggle an inline/block format on the selection. Returns a new model. */
export function toggleFormat(model, s, e, type, attrs = {}) {
  if (s > e) [s, e] = [e, s];
  if (BLOCK_TYPES.has(type)) [s, e] = lineBounds(model.text, s, e);
  if (e <= s) return model;
  let es = model.entities;
  if (isCovered(es, type, s, e)) {
    es = removeType(es, new Set([type]), s, e);
  } else {
    if (QUOTE_TYPES.has(type)) es = removeType(es, QUOTE_TYPES, s, e);
    es = [...es, { type, offset: s, length: e - s, ...attrs }];
  }
  return { text: model.text, entities: canonicalize(model.text, es) };
}

export function setLink(model, s, e, url) {
  if (s > e) [s, e] = [e, s];
  if (e <= s) return model;
  let es = removeType(model.entities, new Set(['text_link']), s, e);
  if (url) es = [...es, { type: 'text_link', offset: s, length: e - s, url }];
  return { text: model.text, entities: canonicalize(model.text, es) };
}

export function clearFormat(model, s, e) {
  if (s > e) [s, e] = [e, s];
  if (e <= s) return model;
  return { text: model.text, entities: canonicalize(model.text, removeType(model.entities, new Set(ENTITY_TYPES), s, e)) };
}

/** Types that fully cover [s,e) (for toolbar state). */
export const activeTypes = (model, s, e) => {
  const set = new Set();
  if (e <= s) return set;
  for (const t of ENTITY_TYPES) if (isCovered(model.entities, t, s, e)) set.add(t);
  return set;
};

export const linkAt = (model, s, e) =>
  model.entities.find(x => x.type === 'text_link' && x.offset <= s && end(x) >= Math.max(e, s + 1)) ?? null;

/** Pressing Enter at the very end of a quote/pre right after a "\n" leaves the block. */
export function exitBlockOnEnter(model, pos) {
  if (model.text[pos - 1] !== '\n') return null;
  const blk = model.entities.find(x => BLOCK_TYPES.has(x.type) && end(x) === pos);
  if (!blk) return null;
  return {
    text: model.text,
    entities: canonicalize(model.text, model.entities.map(x => (x === blk ? { ...x, length: x.length - 1 } : x))),
  };
}

/** Payload for Bot API: plain objects with only the official fields. */
export const toApiEntities = entities => sortEntities(entities).map(e => {
  const o = { type: e.type, offset: e.offset, length: e.length };
  if (e.type === 'text_link') o.url = e.url;
  if (e.type === 'pre' && e.language) o.language = e.language;
  return o;
});

export const safeUrl = u => {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^(https?:\/\/|tg:\/\/|mailto:)/i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(s)) return `https://${s}`;
  return '';
};
