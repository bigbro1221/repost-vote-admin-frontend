'use client';
import './telegram.css';
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import classNames from "classnames";
import {isCanonicalDom, parseHtmlString, parseModel, renderModel} from "../lib/tg-dom.mjs";
import {
    activeTypes, clearFormat, exitBlockOnEnter, linkAt, makeModel, normalizeText, replaceRange, safeUrl, setLink,
    toggleFormat,
} from "../lib/tg-entities.mjs";

/* ---------- selection <-> offsets (UTF-16 offsets into model.text) ---------- */

const offsetOf = (root, node, off) => {
    const r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(node, off);
    return parseModel(r.cloneContents(), {stripTrailingBr: false}).text.length;
};

const domPoint = (root, off) => {
    let acc = 0;
    let last = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
        const len = n.nodeValue.length;
        const hidden = n.parentNode?.classList?.contains('tg-nl');
        if (!hidden && off <= acc + len) return [n, off - acc];
        acc += len;
        last = n;
    }
    const sentinel = root.querySelector(':scope > br[data-sentinel]');
    if (sentinel) return [root, Array.prototype.indexOf.call(root.childNodes, sentinel)];
    return last ? [last, last.nodeValue.length] : [root, 0];
};

const setSelection = (root, s, e) => {
    const sel = window.getSelection();
    const range = document.createRange();
    const [sn, so] = domPoint(root, s);
    const [en, eo] = s === e ? [sn, so] : domPoint(root, e);
    range.setStart(sn, so);
    range.setEnd(en, eo);
    sel.removeAllRanges();
    sel.addRange(range);
};

const EMOJI = '😀 😁 😂 🤣 😊 😍 🥰 😎 🤩 🥳 😉 🙂 🤔 😢 😭 😡 👍 👎 👏 🙏 💪 🔥 ✨ 🎉 🎁 ❤️ 💙 💚 💛 ⭐ ✅ ❌ ⚡ 🏆 🥇 🎤 🎬 📢 📅 🗳️ 👉 👇 ➡️ 🇺🇿'.split(' ');

const BUTTONS = [
    ['bold', <b key="b">B</b>, 'Жирный (Ctrl+B)'],
    ['italic', <i key="i">I</i>, 'Курсив (Ctrl+I)'],
    ['underline', <u key="u">U</u>, 'Подчёркнутый (Ctrl+U)'],
    ['strikethrough', <s key="s">S</s>, 'Зачёркнутый (Ctrl+Shift+X)'],
    ['spoiler', '▒', 'Спойлер (Ctrl+Shift+P)'],
    ['code', '</>', 'Моноширинный (Ctrl+Shift+M)'],
    ['pre', '{ }', 'Блок кода'],
    ['blockquote', '❝', 'Цитата'],
    ['expandable_blockquote', '❝…', 'Сворачиваемая цитата'],
];

const Editor = forwardRef(function Editor({onChange, placeholder = 'Напишите сообщение…'}, ref) {
    const rootRef = useRef(null);
    const modelRef = useRef(makeModel());
    const selRef = useRef({s: 0, e: 0});
    const undo = useRef({stack: [{model: makeModel(), sel: {s: 0, e: 0}}], i: 0, t: 0});
    const composing = useRef(false);
    const [active, setActive] = useState(new Set());
    const [linkUi, setLinkUi] = useState(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const readSel = useCallback(() => {
        const root = rootRef.current;
        const sel = window.getSelection();
        if (!root || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;
        const a = offsetOf(root, sel.anchorNode, sel.anchorOffset);
        const f = offsetOf(root, sel.focusNode, sel.focusOffset);
        const len = modelRef.current.text.length;
        return {s: Math.min(a, f, len), e: Math.min(Math.max(a, f), len)};
    }, []);

    const refreshActive = useCallback(() => {
        const sel = readSel();
        if (!sel) return;
        selRef.current = sel;
        setActive(activeTypes(modelRef.current, sel.s, sel.e));
    }, [readSel]);

    const pushUndo = (model, sel, coalesce) => {
        const u = undo.current;
        const now = Date.now();
        u.stack = u.stack.slice(0, u.i + 1);
        if (coalesce && now - u.t < 900 && u.i > 0) u.stack[u.i] = {model, sel};
        else { u.stack.push({model, sel}); u.i = u.stack.length - 1; }
        if (u.stack.length > 200) { u.stack.shift(); u.i = u.stack.length - 1; }
        u.t = now;
    };

    /** Replace the model, re-render DOM, restore selection. */
    const apply = useCallback((model, sel, {record = true, coalesce = false, focus = true} = {}) => {
        const root = rootRef.current;
        renderModel(document, root, model);
        modelRef.current = model;
        if (sel) {
            selRef.current = sel;
            if (focus) { root.focus(); setSelection(root, sel.s, sel.e); }
        }
        if (record) pushUndo(model, sel ?? selRef.current, coalesce);
        onChangeRef.current?.(model);
        setActive(sel ? activeTypes(model, sel.s, sel.e) : new Set());
    }, []);

    /** Called after native edits: DOM -> model (re-render only if the browser left foreign markup). */
    const syncFromDom = useCallback(() => {
        const root = rootRef.current;
        let model = parseModel(root);
        const sel = readSel();
        modelRef.current = model;
        if (!composing.current && !isCanonicalDom(root)) {
            renderModel(document, root, model);
            if (sel) setSelection(root, sel.s, sel.e);
        }
        if (sel) selRef.current = sel;
        pushUndo(model, sel ?? selRef.current, true);
        onChangeRef.current?.(model);
        setActive(sel ? activeTypes(model, sel.s, sel.e) : new Set());
    }, [readSel]);

    const fresh = () => {
        const m = parseModel(rootRef.current);
        modelRef.current = m;
        return m;
    };

    const insert = useCallback((str, entities = []) => {
        const m = fresh();
        const sel = readSel() ?? selRef.current;
        if (str === '\n' && sel.s === sel.e) {
            const ex = exitBlockOnEnter(m, sel.s);
            if (ex) return apply(ex, sel);
        }
        const text = normalizeText(str);
        const r = replaceRange(m, sel.s, sel.e, text, entities);
        const pos = sel.s + text.length;
        apply(r, {s: pos, e: pos});
    }, [apply, readSel]);

    const format = useCallback(type => {
        const m = fresh();
        const sel = readSel() ?? selRef.current;
        if (sel.s === sel.e) return;
        let t = type;
        if (t === 'code' && m.text.slice(sel.s, sel.e).includes('\n')) t = 'pre';
        apply(toggleFormat(m, sel.s, sel.e, t), sel);
    }, [apply, readSel]);

    const openLink = useCallback(() => {
        const m = fresh();
        const sel = readSel() ?? selRef.current;
        if (sel.s === sel.e) return;
        setLinkUi({...sel, url: linkAt(m, sel.s, sel.e)?.url ?? ''});
    }, [readSel]);

    const applyLink = () => {
        const {s, e, url} = linkUi;
        setLinkUi(null);
        apply(setLink(fresh(), s, e, safeUrl(url)), {s, e});
    };

    const doUndo = dir => {
        const u = undo.current;
        const i = u.i + dir;
        if (i < 0 || i >= u.stack.length) return;
        u.i = i;
        const {model, sel} = u.stack[i];
        apply(model, sel, {record: false});
    };

    useImperativeHandle(ref, () => ({
        setModel: m => {
            const model = makeModel(m.text, m.entities);
            undo.current = {stack: [{model, sel: {s: 0, e: 0}}], i: 0, t: 0};
            renderModel(document, rootRef.current, model);
            modelRef.current = model;
            onChangeRef.current?.(model);
        },
        getModel: () => fresh(),
        focus: () => rootRef.current?.focus(),
    }), []);

    /* native listeners that React does not expose (beforeinput) */
    useEffect(() => {
        const root = rootRef.current;
        const onBefore = ev => {
            if (ev.inputType === 'insertParagraph' || ev.inputType === 'insertLineBreak') {
                ev.preventDefault();
                insert('\n');
            } else if (ev.inputType === 'historyUndo') { ev.preventDefault(); doUndo(-1); }
            else if (ev.inputType === 'historyRedo') { ev.preventDefault(); doUndo(1); }
            else if (ev.inputType.startsWith('format')) ev.preventDefault(); // browser-native bold etc.
        };
        root.addEventListener('beforeinput', onBefore);
        document.addEventListener('selectionchange', refreshActive);
        return () => {
            root.removeEventListener('beforeinput', onBefore);
            document.removeEventListener('selectionchange', refreshActive);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [insert, refreshActive]);

    const onKeyDown = e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        const k = e.code?.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
        const sh = e.shiftKey;
        let handled = true;
        if (k === 'b' && !sh) format('bold');
        else if (k === 'i' && !sh) format('italic');
        else if (k === 'u' && !sh) format('underline');
        else if (k === 'x' && sh) format('strikethrough');
        else if (k === 'p' && sh) format('spoiler');
        else if (k === 'm' && sh) format('code');
        else if (k === 'k' && !sh) openLink();
        else if (k === 'n' && sh) {
            const sel = readSel() ?? selRef.current;
            apply(clearFormat(fresh(), sel.s, sel.e), sel);
        } else if (k === 'z' && !sh) doUndo(-1);
        else if ((k === 'z' && sh) || k === 'y') doUndo(1);
        else handled = false;
        if (handled) e.preventDefault();
    };

    const onPaste = e => {
        e.preventDefault();
        const cd = e.clipboardData;
        const html = cd.getData('text/html');
        const plain = cd.getData('text/plain');
        let pasted = null;
        if (html) {
            try {
                pasted = parseHtmlString(html, h => new DOMParser().parseFromString(h, 'text/html').body);
            } catch { pasted = null; }
            if (pasted && !pasted.text.trim()) pasted = null;
        }
        if (!pasted) pasted = {text: normalizeText(plain), entities: []};
        if (!pasted.text) return;
        insert(pasted.text, pasted.entities);
    };

    const onBtn = (e, fn) => { e.preventDefault(); fn(); };

    return (
        <div className="overflow-visible rounded-2xl border border-zinc-200 bg-white shadow-soft focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/10 transition">
            <div className="flex flex-wrap items-center gap-0.5 rounded-t-2xl border-b border-zinc-100 bg-zinc-50/70 p-1.5">
                {BUTTONS.map(([type, label, title]) => (
                    <button key={type} type="button" title={title}
                            onMouseDown={e => onBtn(e, () => format(type))}
                            className={classNames('min-w-[32px] h-8 px-2 rounded-lg text-sm transition',
                                active.has(type) ? 'bg-zinc-900 text-white shadow-soft' : 'text-zinc-600 hover:bg-white hover:text-zinc-900 hover:shadow-soft')}>
                        {label}
                    </button>
                ))}
                <button type="button" title="Ссылка (Ctrl+K)" onMouseDown={e => onBtn(e, openLink)}
                        className={classNames('min-w-[32px] h-8 px-2 rounded-lg text-sm transition',
                            active.has('text_link') ? 'bg-zinc-900 text-white shadow-soft' : 'text-zinc-600 hover:bg-white hover:text-zinc-900 hover:shadow-soft')}>
                    🔗
                </button>
                <button type="button" title="Убрать форматирование (Ctrl+Shift+N)"
                        onMouseDown={e => onBtn(e, () => {
                            const sel = readSel() ?? selRef.current;
                            apply(clearFormat(fresh(), sel.s, sel.e), sel);
                        })}
                        className="min-w-[32px] h-8 px-2 rounded-lg text-sm text-zinc-600 transition hover:bg-white hover:text-zinc-900 hover:shadow-soft">Tx</button>
                <div className="relative">
                    <button type="button" title="Эмодзи" onMouseDown={e => onBtn(e, () => setEmojiOpen(o => !o))}
                            className="min-w-[32px] h-8 px-2 rounded-lg text-sm transition hover:bg-white hover:shadow-soft">😊</button>
                    {emojiOpen && (
                        <div className="absolute z-20 top-10 left-0 w-72 p-2 bg-white border border-zinc-200 rounded-xl shadow-pop grid grid-cols-8 gap-1 animate-scale-in">
                            {EMOJI.map(em => (
                                <button key={em} type="button" className="text-xl hover:bg-gray-100 rounded"
                                        onMouseDown={e => onBtn(e, () => { insert(em); })}>{em}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {linkUi && (
                <form className="flex gap-2 p-2 border-b border-zinc-100 bg-sky-50/70"
                      onSubmit={e => { e.preventDefault(); applyLink(); }}>
                    <input autoFocus value={linkUi.url} placeholder="https://… (пусто — убрать ссылку)"
                           onChange={e => setLinkUi({...linkUi, url: e.target.value})}
                           onKeyDown={e => { if (e.key === 'Escape') { setLinkUi(null); rootRef.current.focus(); } }}
                           className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none"/>
                    <button className="px-3 py-1 rounded-lg bg-zinc-900 text-white text-sm">OK</button>
                    <button type="button" className="px-3 py-1 rounded-lg border border-zinc-200 bg-white text-sm"
                            onClick={() => { setLinkUi(null); rootRef.current.focus(); }}>Отмена</button>
                </form>
            )}

            <div
                ref={rootRef}
                className="tg-rich tg-editor"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                data-placeholder={placeholder}
                onInput={() => { if (!composing.current) syncFromDom(); }}
                onCompositionStart={() => { composing.current = true; }}
                onCompositionEnd={() => { composing.current = false; syncFromDom(); }}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onBlur={() => setEmojiOpen(false)}
            />
        </div>
    );
});

export default Editor;
