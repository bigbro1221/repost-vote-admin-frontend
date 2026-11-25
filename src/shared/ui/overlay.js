'use client';
import {useEffect, useRef} from 'react';

// Esc-to-close (top-most overlay only), body scroll lock, focus restore + initial focus.
const stack = [];
export const useOverlay = (open, onClose, panelRef) => {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        if (!open) return;
        const token = {};
        stack.push(token);
        const prevFocus = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = e => {
            if (e.key === 'Escape' && stack[stack.length - 1] === token) {
                e.stopPropagation();
                onCloseRef.current?.();
            }
        };
        window.addEventListener('keydown', onKey);
        const t = setTimeout(() => {
            const panel = panelRef?.current;
            if (panel && !panel.contains(document.activeElement)) {
                const auto = panel.querySelector('[data-autofocus]') || panel;
                auto.focus?.({preventScroll: true});
            }
        }, 30);
        return () => {
            clearTimeout(t);
            window.removeEventListener('keydown', onKey);
            stack.splice(stack.indexOf(token), 1);
            if (!stack.length) document.body.style.overflow = prevOverflow;
            prevFocus?.focus?.({preventScroll: true});
        };
    }, [open]);
};
