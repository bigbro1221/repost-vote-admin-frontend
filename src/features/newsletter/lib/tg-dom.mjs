// text+entities  <->  DOM. DOM-agnostic: everything goes through a tiny node interface
// (nodeType, nodeName, nodeValue, childNodes, getAttribute) and a `doc` factory
// (createElement, createTextNode) so it can be unit-tested with a fake DOM under node.
import {
  BLOCK_TYPES, QUOTE_TYPES, canonicalize, end, normalizeText, safeUrl, sortEntities,
} from './tg-entities.mjs';

const SKIP = new Set(['script', 'style', 'head', 'meta', 'title', 'template', 'noscript']);
const FOREIGN_BLOCKS = new Set([
  'div', 'p', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'table',
  'section', 'article', 'header', 'footer', 'figure', 'figcaption', 'main', 'nav', 'aside', 'hr',
]);

/* ------------------------------ render ------------------------------ */

function createElFor(doc, en, opts) {
  let el;
  switch (en.type) {
    case 'bold': el = doc.createElement('b'); break;
    case 'italic': el = doc.createElement('i'); break;
    case 'underline': el = doc.createElement('u'); break;
    case 'strikethrough': el = doc.createElement('s'); break;
    case 'spoiler': el = doc.createElement('span'); el.setAttribute('class', 'tg-spoiler'); break;
    case 'code': el = doc.createElement('code'); break;
    case 'pre':
      el = doc.createElement('pre'); el.setAttribute('class', 'tg-pre');
      if (en.language) el.setAttribute('data-language', en.language);
      break;
    case 'text_link':
      el = doc.createElement('a'); el.setAttribute('href', safeUrl(en.url) || en.url);
      if (opts.linkTarget) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
      break;
    case 'blockquote': el = doc.createElement('blockquote'); el.setAttribute('class', 'tg-quote'); break;
    case 'expandable_blockquote':
      el = doc.createElement('blockquote'); el.setAttribute('class', 'tg-quote tg-quote-exp');
      el.setAttribute('data-expandable', '1');
      break;
    default: el = doc.createElement('span');
  }
  return el;
}

/**
 * Render {text, entities} into `root` (children replaced).
 * Canonical DOM: only text nodes (with literal "\n"), b/i/u/s/code/pre/a/blockquote/span.tg-spoiler,
 * span.tg-nl (the newline right after a block, hidden by CSS) and one trailing <br data-sentinel>
 * when the text ends with "\n".
 */
export function renderModel(doc, root, model, opts = {}) {
  while (root.firstChild) root.removeChild(root.firstChild);
  const text = model.text;
  const ents = sortEntities(canonicalize(text, model.entities));
  const bounds = new Set([0, text.length]);
  for (const e of ents) { bounds.add(e.offset); bounds.add(end(e)); }
  const pts = [...bounds].sort((a, b) => a - b);
  const blockEnds = new Set(ents.filter(e => BLOCK_TYPES.has(e.type)).map(end));

  const stack = [];
  const parent = () => (stack.length ? stack[stack.length - 1].el : root);

  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i]; const e = pts[i + 1];
    if (e <= s) continue;
    const active = ents.filter(x => x.offset <= s && end(x) >= e);
    let k = 0;
    while (k < stack.length && k < active.length && stack[k].ent === active[k]) k++;
    stack.length = k;
    for (let j = k; j < active.length; j++) {
      const el = createElFor(doc, active[j], opts);
      parent().appendChild(el);
      stack.push({ ent: active[j], el });
    }
    let chunk = text.slice(s, e);
    if (chunk[0] === '\n' && blockEnds.has(s) && opts.hideNlAfterBlock !== false) {
      const nl = doc.createElement('span');
      nl.setAttribute('class', 'tg-nl');
      nl.appendChild(doc.createTextNode('\n'));
      parent().appendChild(nl);
      chunk = chunk.slice(1);
    }
    if (chunk) parent().appendChild(doc.createTextNode(chunk));
  }
  if (text.endsWith('\n')) {
    const br = doc.createElement('br');
    br.setAttribute('data-sentinel', '1');
    root.appendChild(br);
  }
  return root;
}

/* ------------------------------ parse ------------------------------ */

const attr = (el, name) => (el.getAttribute ? (el.getAttribute(name) ?? '') : '');
const hasClass = (el, c) => (' ' + attr(el, 'class') + ' ').toLowerCase().includes(c);

function stylesOf(el) {
  const st = attr(el, 'style').toLowerCase();
  if (!st) return {};
  const get = name => {
    const m = st.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`));
    return m ? m[1].trim() : '';
  };
  const fw = get('font-weight');
  const td = get('text-decoration') + ' ' + get('text-decoration-line');
  return {
    bold: /^(bold|bolder|[6-9]00)$/.test(fw), notBold: /^(normal|[1-5]00)$/.test(fw),
    italic: get('font-style') === 'italic' || get('font-style') === 'oblique',
    notItalic: get('font-style') === 'normal',
    underline: td.includes('underline'),
    strike: td.includes('line-through'),
    mono: /monospace|courier|consolas/.test(get('font-family')) && el.nodeName.toLowerCase() === 'span',
  };
}

/** Entity descriptors implied by an element (inline). */
function inlineTypes(el, tag) {
  const out = [];
  const st = stylesOf(el);
  if (tag === 'b' || tag === 'strong') { if (!st.notBold) out.push({ type: 'bold' }); }
  else if (st.bold) out.push({ type: 'bold' });
  if (tag === 'i' || tag === 'em' || tag === 'cite') { if (!st.notItalic) out.push({ type: 'italic' }); }
  else if (st.italic) out.push({ type: 'italic' });
  if (tag === 'u' || tag === 'ins' || st.underline) out.push({ type: 'underline' });
  if (tag === 's' || tag === 'strike' || tag === 'del' || st.strike) out.push({ type: 'strikethrough' });
  if (tag === 'tg-spoiler' || hasClass(el, 'tg-spoiler') || hasClass(el, 'spoiler')) out.push({ type: 'spoiler' });
  if (tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'tt' || st.mono) out.push({ type: 'code' });
  if (tag === 'a') {
    const url = safeUrl(attr(el, 'href'));
    if (url) out.push({ type: 'text_link', url });
  }
  return out;
}

/**
 * Parse a DOM subtree into a canonical {text, entities}.
 * mode 'editor' (default): the DOM is (nearly) our canonical DOM; text nodes are taken verbatim.
 * mode 'paste': foreign HTML; whitespace collapsed, blockquote/pre/div/p/... are real blocks.
 */
export function parseModel(root, { paste = false, stripTrailingBr = true } = {}) {
  const ctx = { text: '', ents: [], sep: 0 };

  const flush = () => { if (ctx.sep > 0) { ctx.text += '\n'.repeat(ctx.sep); ctx.sep = 0; } };
  const push = s => { if (!s) return; flush(); ctx.text += s; };
  const ensureBreak = () => {
    if (paste && ctx.text.endsWith(' ') && !ctx.ents.some(e => e.offset + e.length >= ctx.text.length)) {
      ctx.text = ctx.text.slice(0, -1);
    }
    if (ctx.text && !ctx.text.endsWith('\n') && ctx.sep === 0) ctx.sep = 1;
  };
  const atLineStart = () => !ctx.text || ctx.text.endsWith('\n') || ctx.sep > 0;

  const children = node => Array.from(node.childNodes || []);

  const walk = (node, inPre, parentBlock) => {
    if (node.nodeType === 3) {
      let v = node.nodeValue ?? '';
      if (paste && !inPre) {
        v = v.replace(/[ \t\r\n\f ]+/g, ' ');
        if (atLineStart()) v = v.replace(/^ /, '');
      } else v = normalizeText(v);
      push(v);
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    const tag = (node.nodeName || '').toLowerCase();
    if (SKIP.has(tag)) return;

    if (tag === 'br') {
      // placeholder <br> that is the only content of a foreign block = an empty line
      if (parentBlock && children(parentBlock).filter(c => c.nodeType !== 3 || c.nodeValue).length === 1) {
        if (ctx.sep > 0 || !ctx.text.endsWith('\n')) ctx.sep += 1;
        return;
      }
      push('\n');
      return;
    }

    const isQuote = tag === 'blockquote';
    const isPre = tag === 'pre';
    const foreignBlock = FOREIGN_BLOCKS.has(tag) || (paste && (isQuote || isPre));

    if (foreignBlock) ensureBreak();

    const descs = [];
    if (isQuote) descs.push({ type: (attr(node, 'data-expandable') || hasClass(node, 'tg-quote-exp') || node.hasAttribute?.('expandable')) ? 'expandable_blockquote' : 'blockquote' });
    else if (isPre) {
      const codeChild = children(node).find(c => (c.nodeName || '').toLowerCase() === 'code');
      const lang = (attr(codeChild || node, 'class').match(/language-([\w+#-]+)/) || [])[1] || attr(node, 'data-language');
      descs.push(lang ? { type: 'pre', language: lang } : { type: 'pre' });
    } else if (!inPre) descs.push(...inlineTypes(node, tag));

    if (descs.length) flush();
    const start = ctx.text.length;
    const childInPre = inPre || isPre;
    for (const c of children(node)) walk(c, childInPre, foreignBlock ? node : null);
    for (const d of descs) {
      const len = ctx.text.length - start;
      if (len > 0) ctx.ents.push({ ...d, offset: start, length: len });
    }
    if (foreignBlock) ensureBreak();
  };

  const kids = children(root);
  for (const c of kids) walk(c, false, null);
  if (ctx.sep >= 2) ctx.text += '\n'.repeat(ctx.sep - 1);

  let text = ctx.text;
  if (paste) {
    text = text.replace(/\n+$/, '');
  } else if (stripTrailingBr && kids.length) {
    const last = kids[kids.length - 1];
    if ((last.nodeName || '').toLowerCase() === 'br' && text.endsWith('\n')) text = text.slice(0, -1);
  }
  return { text, entities: canonicalize(text, ctx.ents) };
}

/** True if the DOM only contains what renderModel produces (so no re-render is needed). */
export function isCanonicalDom(root) {
  const kids = Array.from(root.childNodes || []);
  const ok = (n, top, idx, siblings) => {
    if (n.nodeType === 3) return !/[ \r]/.test(n.nodeValue || '');
    if (n.nodeType !== 1) return false;
    const tag = n.nodeName.toLowerCase();
    if (tag === 'br') return top && idx === siblings.length - 1 && n.getAttribute?.('data-sentinel') === '1';
    if (['b', 'i', 'u', 's', 'code', 'pre', 'a', 'blockquote'].includes(tag)) {
      return Array.from(n.childNodes).every((c, i, a) => ok(c, false, i, a));
    }
    if (tag === 'span') {
      const cls = attr(n, 'class');
      if (cls !== 'tg-spoiler' && cls !== 'tg-nl') return false;
      return Array.from(n.childNodes).every((c, i, a) => ok(c, false, i, a));
    }
    return false;
  };
  return kids.every((n, i, a) => ok(n, true, i, a));
}

/** Parse pasted HTML string with a browser DOMParser (or injected parser). */
export function parseHtmlString(html, parseFn) {
  const cleaned = html.replace(/<!--(Start|End)Fragment-->/g, '');
  const body = parseFn(cleaned);
  return parseModel(body, { paste: true });
}
