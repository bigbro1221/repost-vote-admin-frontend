// Minimal DOM for node --test (no jsdom available).
export class FNode {
  constructor(nodeType, nodeName, nodeValue = null) {
    this.nodeType = nodeType; this.nodeName = nodeName; this.nodeValue = nodeValue;
    this.childNodes = []; this.attrs = {}; this.parentNode = null;
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; }
  removeChild(c) { this.childNodes.splice(this.childNodes.indexOf(c), 1); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
}
export const doc = {
  createElement: t => new FNode(1, t.toUpperCase()),
  createTextNode: v => new FNode(3, '#text', v),
};
export const root = () => doc.createElement('div');

const ENT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
const VOID = new Set(['br', 'hr', 'meta', 'img']);

/** tiny HTML parser: enough for tests (balanced tags, quoted attributes). */
export function parseHTML(html) {
  const r = root();
  const stack = [r];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*\/?>|[^<]+/g;
  let m;
  while ((m = re.exec(html))) {
    const tok = m[0];
    const top = stack[stack.length - 1];
    if (tok.startsWith('<!--')) continue;
    if (tok[0] !== '<') {
      top.appendChild(doc.createTextNode(tok.replace(/&\w+;/g, x => ENT[x] ?? x)));
    } else if (tok[1] === '/') {
      stack.pop();
    } else {
      const el = doc.createElement(m[1]);
      for (const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(a[1], a[2] ?? '');
      top.appendChild(el);
      if (!VOID.has(m[1].toLowerCase())) stack.push(el);
    }
  }
  return r;
}

export const html = n => n.nodeType === 3 ? n.nodeValue.replace(/\n/g, '\\n')
  : n.nodeName === 'BR' ? '<br>'
  : `<${n.nodeName.toLowerCase()}${n.attrs.class ? `.${n.attrs.class.replace(/ /g, '.')}` : ''}>${n.childNodes.map(html).join('')}</${n.nodeName.toLowerCase()}>`;
