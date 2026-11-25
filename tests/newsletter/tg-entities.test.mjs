import test from 'node:test';
import assert from 'node:assert/strict';
import { doc, root, parseHTML, html } from './fake-dom.mjs';
import { renderModel, parseModel, isCanonicalDom, parseHtmlString } from '../../src/features/newsletter/lib/tg-dom.mjs';
import {
  canonicalize, makeModel, replaceRange, toggleFormat, setLink, toApiEntities, exitBlockOnEnter, activeTypes,
} from '../../src/features/newsletter/lib/tg-entities.mjs';

const E = (type, offset, length, extra = {}) => ({ type, offset, length, ...extra });
const roundTrip = model => {
  const r = root();
  renderModel(doc, r, model);
  return { dom: r, out: parseModel(r) };
};
const expectRT = (text, entities) => {
  const m = makeModel(text, entities);
  const { dom, out } = roundTrip(m);
  assert.equal(isCanonicalDom(dom), true, 'rendered DOM is canonical: ' + html(dom));
  assert.deepEqual(out, m, html(dom));
  return { dom, out };
};

test('plain text round trip, NBSP and CRLF are normalised', () => {
  expectRT('hello world', []);
  assert.equal(makeModel('a b\r\nc\rd').text, 'a b\nc\nd');
});

test('emoji count as 2 UTF-16 units in offsets/lengths', () => {
  assert.equal('😀'.length, 2);
  const text = '😀 hi 👨‍👩‍👧 bold';
  const off = text.indexOf('bold');
  const { out } = expectRT(text, [E('bold', off, 4), E('italic', 0, 2)]);
  assert.deepEqual(out.entities.find(e => e.type === 'italic'), E('italic', 0, 2));
  assert.equal(out.entities.find(e => e.type === 'bold').offset, off);
  assert.equal(off, 2 + 1 + 2 + 1 + 8 + 1); // 😀(2) ␣ hi(2) ␣ family(8 incl. 2 ZWJ) ␣
});

test('emoji with a surrogate pair parsed from DOM gives UTF-16 offsets', () => {
  const m = parseModel(parseHTML('😀<b>x</b>'));
  assert.deepEqual(m, { text: '😀x', entities: [E('bold', 2, 1)] });
});

test('nested bold + italic', () => {
  const { dom } = expectRT('abcdef', [E('bold', 0, 6), E('italic', 2, 2)]);
  assert.equal(html(dom), '<div><b>ab<i>cd</i>ef</b></div>');
});

test('link inside bold and bold inside link', () => {
  const a = expectRT('see site now', [E('bold', 0, 12), E('text_link', 4, 4, { url: 'https://repost.uz' })]);
  assert.match(html(a.dom), /<b>see <a>site<\/a> now<\/b>/);
  expectRT('see site now', [E('text_link', 4, 4, { url: 'https://repost.uz' }), E('bold', 4, 2)]);
});

test('partially overlapping entities survive the round trip', () => {
  const { out } = expectRT('0123456789', [E('bold', 0, 5), E('italic', 3, 5)]);
  assert.deepEqual(out.entities, [E('bold', 0, 5), E('italic', 3, 5)]);
});

test('same range with several types', () => {
  expectRT('xyz', [E('bold', 0, 3), E('italic', 0, 3), E('underline', 0, 3), E('strikethrough', 0, 3), E('spoiler', 0, 3)]);
});

test('code, pre (with language) and quotes', () => {
  expectRT('a code b', [E('code', 2, 4)]);
  expectRT('x\nline1\nline2\ny', [E('pre', 2, 11, { language: 'js' })]);
  expectRT('intro\nquote line 1\nquote line 2\noutro', [E('blockquote', 6, 25)]);
  expectRT('q1\nq2', [E('expandable_blockquote', 0, 5)]);
  expectRT('plain\nquote\n\nafter', [E('blockquote', 6, 5), E('bold', 6, 2)]);
});

test('newline right after a block is wrapped in span.tg-nl', () => {
  const { dom } = expectRT('a\nq\nb', [E('blockquote', 2, 1)]);
  assert.equal(html(dom), '<div>a\\n<blockquote.tg-quote>q</blockquote><span.tg-nl>\\n</span>b</div>');
});

test('trailing newlines get a sentinel <br> and round-trip', () => {
  expectRT('abc\n', []);
  expectRT('abc\n\n', []);
  expectRT('\n', []);
  expectRT('q\n', [E('blockquote', 0, 1)]);
  const r = root(); renderModel(doc, r, makeModel('abc\n'));
  assert.equal(html(r), '<div>abc\\n<br></div>');
});

test('property: random models round-trip (emoji, newlines, overlaps)', () => {
  let seed = 12345;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const alphabet = ['a', 'b', ' ', '😀', '\n', 'é', '👍🏽', 'z'];
  const types = ['bold', 'italic', 'underline', 'strikethrough', 'spoiler', 'code', 'pre', 'text_link', 'blockquote', 'expandable_blockquote'];
  for (let i = 0; i < 1500; i++) {
    let text = ''; const n = rnd(14);
    for (let k = 0; k < n; k++) text += alphabet[rnd(alphabet.length)];
    const ents = [];
    for (let k = rnd(5); k > 0; k--) {
      const type = types[rnd(types.length)];
      const offset = rnd(text.length + 1); const length = rnd(text.length - offset + 1);
      // keep offsets on code-point boundaries (Telegram clients never split surrogates)
      ents.push(E(type, offset, length, type === 'text_link' ? { url: 'https://e.x/' + rnd(3) } : {}));
    }
    const m = makeModel(text, ents);
    const r = root(); renderModel(doc, r, m);
    const back = parseModel(r);
    assert.deepEqual(back, m, `seed case ${i}: ${JSON.stringify({ text, ents })} -> ${html(r)}`);
  }
});

test('browser-style editor DOM: div/br/nbsp are normalised', () => {
  assert.deepEqual(parseModel(parseHTML('a<div>b</div>')), { text: 'a\nb', entities: [] });
  assert.deepEqual(parseModel(parseHTML('a<div><br></div><div>b</div>')), { text: 'a\n\nb', entities: [] });
  assert.deepEqual(parseModel(parseHTML('a<br><br>')), { text: 'a\n', entities: [] }); // trailing <br> = placeholder
  assert.deepEqual(parseModel(parseHTML('a&nbsp;&nbsp;b')), { text: 'a  b', entities: [] });
  assert.deepEqual(parseModel(parseHTML('<b>x</b>&nbsp;<i>y</i>')), { text: 'x y', entities: [E('bold', 0, 1), E('italic', 2, 1)] });
  assert.equal(isCanonicalDom(parseHTML('a<div>b</div>')), false);
  assert.equal(isCanonicalDom(parseHTML('a&nbsp;b')), false);
});

test('paste: HTML clipboard keeps b/strong i/em u s/del code pre a blockquote spoiler', () => {
  const p = h => parseHtmlString(h, parseHTML);
  assert.deepEqual(p('<b>a</b> <strong>b</strong>'), { text: 'a b', entities: [E('bold', 0, 1), E('bold', 2, 1)] });
  assert.deepEqual(p('<em>i</em> <u>u</u> <del>d</del> <s>s</s>'), {
    text: 'i u d s',
    entities: [E('italic', 0, 1), E('underline', 2, 1), E('strikethrough', 4, 1), E('strikethrough', 6, 1)],
  });
  assert.deepEqual(p('x <code>c</code>'), { text: 'x c', entities: [E('code', 2, 1)] });
  assert.deepEqual(p('<pre><code class="language-py">print(1)\nprint(2)</code></pre>'),
    { text: 'print(1)\nprint(2)', entities: [E('pre', 0, 17, { language: 'py' })] });
  assert.deepEqual(p('<a href="https://repost.uz/x">link</a> <a href="javascript:alert(1)">bad</a>'),
    { text: 'link bad', entities: [E('text_link', 0, 4, { url: 'https://repost.uz/x' })] });
  assert.deepEqual(p('before<blockquote>q1<br>q2</blockquote>after'),
    { text: 'before\nq1\nq2\nafter', entities: [E('blockquote', 7, 5)] });
  assert.deepEqual(p('<blockquote expandable>q</blockquote>'), { text: 'q', entities: [E('expandable_blockquote', 0, 1)] });
  assert.deepEqual(p('<tg-spoiler>s</tg-spoiler> <span class="tg-spoiler">t</span>'), { text: 's t', entities: [E('spoiler', 0, 1), E('spoiler', 2, 1)] });
  assert.deepEqual(p('<span style="font-weight:700">B</span><b style="font-weight:normal">n</b>'), { text: 'Bn', entities: [E('bold', 0, 1)] });
  assert.deepEqual(p('<meta charset="utf-8"><!--StartFragment--><p>one</p><p>two</p><!--EndFragment-->'), { text: 'one\ntwo', entities: [] });
  assert.deepEqual(p('<div>a\n   b</div>'), { text: 'a b', entities: [] }); // HTML whitespace collapses
});

test('paste: unknown markup degrades to plain text', () => {
  assert.deepEqual(parseHtmlString('<font color="red">hey</font> <img src="x"><table><tr><td>t</td></tr></table>', parseHTML).text, 'hey\nt');
});

test('canonicalize: merges touching same-type, strips formatting inside code/pre, drops invalid', () => {
  assert.deepEqual(canonicalize('abcdef', [E('bold', 0, 3), E('bold', 3, 3)]), [E('bold', 0, 6)]);
  assert.deepEqual(canonicalize('abcdef', [E('bold', 0, 6), E('code', 2, 2)]), [E('bold', 0, 2), E('code', 2, 2), E('bold', 4, 2)]);
  assert.deepEqual(canonicalize('abc', [E('bold', 0, 0), E('bold', 5, 2), E('text_link', 0, 2), E('nope', 0, 1)]), []);
  assert.deepEqual(canonicalize('abc', [E('bold', 1, 99)]), [E('bold', 1, 2)]);
  // two different links never merge
  assert.equal(canonicalize('abcd', [E('text_link', 0, 2, { url: 'https://a' }), E('text_link', 2, 2, { url: 'https://b' })]).length, 2);
});

test('toggleFormat adds, removes and splits', () => {
  let m = makeModel('hello world', []);
  m = toggleFormat(m, 0, 5, 'bold');
  assert.deepEqual(m.entities, [E('bold', 0, 5)]);
  m = toggleFormat(m, 2, 3, 'bold'); // un-bold the middle char
  assert.deepEqual(m.entities, [E('bold', 0, 2), E('bold', 3, 2)]);
  m = toggleFormat(m, 0, 11, 'bold'); // not fully covered -> apply to all
  assert.deepEqual(m.entities, [E('bold', 0, 11)]);
  m = toggleFormat(m, 0, 11, 'bold');
  assert.deepEqual(m.entities, []);
  m = toggleFormat(makeModel('a\nb\nc', []), 2, 3, 'blockquote'); // lines expand
  assert.deepEqual(m.entities, [E('blockquote', 2, 1)]);
  m = toggleFormat(makeModel('ab\ncd\nef', []), 1, 4, 'expandable_blockquote');
  assert.deepEqual(m.entities, [E('expandable_blockquote', 0, 5)]);
  m = toggleFormat(makeModel('abc', [E('bold', 0, 3)]), 1, 2, 'code');
  assert.deepEqual(m.entities, [E('bold', 0, 1), E('code', 1, 1), E('bold', 2, 1)]);
  assert.deepEqual([...activeTypes(makeModel('abc', [E('bold', 0, 3)]), 0, 2)], ['bold']);
});

test('setLink replaces and removes links', () => {
  let m = setLink(makeModel('abc def', []), 0, 3, 'https://a.b');
  assert.deepEqual(m.entities, [E('text_link', 0, 3, { url: 'https://a.b' })]);
  m = setLink(m, 0, 3, 'https://c.d');
  assert.deepEqual(m.entities, [E('text_link', 0, 3, { url: 'https://c.d' })]);
  assert.deepEqual(setLink(m, 0, 3, '').entities, []);
});

test('replaceRange shifts entities by UTF-16 length (emoji = 2)', () => {
  const m = makeModel('ab cd', [E('bold', 3, 2)]);
  const r = replaceRange(m, 0, 0, '😀');
  assert.equal(r.text, '😀ab cd');
  assert.deepEqual(r.entities, [E('bold', 5, 2)]);
  // typing at the end of bold continues bold; inside grows
  assert.deepEqual(replaceRange(m, 5, 5, '!').entities, [E('bold', 3, 3)]);
  assert.deepEqual(replaceRange(m, 4, 4, '\n').entities, [E('bold', 3, 3)]);
  // deleting across the start
  assert.deepEqual(replaceRange(m, 1, 4, '').entities, [E('bold', 1, 1)]);
  // pasted entities are offset to the insertion point
  assert.deepEqual(replaceRange(makeModel('xy'), 1, 1, 'ab', [E('italic', 0, 2)]).entities, [E('italic', 1, 2)]);
});

test('exitBlockOnEnter: Enter on an empty last quote line leaves the quote', () => {
  const m = makeModel('a\nb\n', [E('blockquote', 2, 2)]); // quote "b\n"
  const r = exitBlockOnEnter(m, 4);
  assert.deepEqual(r.entities, [E('blockquote', 2, 1)]);
  assert.equal(exitBlockOnEnter(makeModel('ab', [E('blockquote', 0, 2)]), 2), null);
});

test('toApiEntities emits only Bot API fields', () => {
  const out = toApiEntities(makeModel('ab', [E('text_link', 0, 2, { url: 'https://x.y' }), E('bold', 0, 1)]).entities);
  assert.deepEqual(out, [{ type: 'text_link', offset: 0, length: 2, url: 'https://x.y' }, { type: 'bold', offset: 0, length: 1 }]);
});
