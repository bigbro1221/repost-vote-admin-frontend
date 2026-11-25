'use client';
import './telegram.css';
import {useEffect, useRef} from "react";
import {renderModel} from "../lib/tg-dom.mjs";

const URL_RE = /https?:\/\/[^\s<>]+/i;

const Preview = ({model, disablePreview}) => {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;
        renderModel(document, ref.current, model, {linkTarget: true, hideNlAfterBlock: true});
        // preview: trailing sentinel br is only needed for caret placement
        ref.current.querySelectorAll('br[data-sentinel]').forEach(b => b.remove());
    }, [model]);

    const onClick = e => {
        const sp = e.target.closest?.('.tg-spoiler');
        if (sp) {
            // reveal the whole spoiler run (siblings created by overlapping splits too)
            sp.classList.toggle('revealed');
            return;
        }
        const q = e.target.closest?.('.tg-quote-exp');
        if (q) q.classList.toggle('open');
    };

    const firstUrl = (model.text.match(URL_RE) || [])[0];
    let host = '';
    try { host = firstUrl ? new URL(firstUrl).hostname : ''; } catch { /* ignore */ }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return (
        <div className="tg-chat">
            <div className="tg-bubble">
                {model.text
                    ? <div ref={ref} className="tg-rich" onClick={onClick}/>
                    : <div className="tg-rich text-gray-400">Предпросмотр сообщения</div>}
                {firstUrl && !disablePreview && (
                    <div className="tg-linkcard">
                        <div className="u">{host}</div>
                        <div className="d">Превью ссылки (подгружается Telegram)</div>
                    </div>
                )}
                <span className="tg-time">{time} ✓✓</span>
                <div style={{clear: 'both'}}/>
            </div>
        </div>
    );
};

export default Preview;
