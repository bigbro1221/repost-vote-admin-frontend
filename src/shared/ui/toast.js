'use client';
import {create} from 'zustand';
import {errorMessage} from '@/shared/api/errors';

let seq = 0;
export const useToastStore = create(set => ({
    toasts: [],
    push: t => {
        const id = ++seq;
        set(s => ({toasts: [...s.toasts.slice(-4), {id, ...t}]}));
        setTimeout(() => set(s => ({toasts: s.toasts.filter(x => x.id !== id)})), t.duration ?? (t.type === 'error' ? 7000 : 3500));
        return id;
    },
    dismiss: id => set(s => ({toasts: s.toasts.filter(x => x.id !== id)})),
}));

const push = (type, title, description, opts) => useToastStore.getState().push({type, title, description, ...opts});
export const toast = {
    success: (title, description, opts) => push('success', title, description, opts),
    error: (title, description, opts) => push('error', title, description, opts),
    info: (title, description, opts) => push('info', title, description, opts),
    /** show API error (code → human message) */
    fromError: (e, title = 'Ошибка') => push('error', title, errorMessage(e)),
};

/** run an async mutation and toast its outcome; returns result or undefined on error */
export const withToast = async (fn, {success, error = 'Не удалось выполнить действие'} = {}) => {
    try {
        const r = await fn();
        if (success) toast.success(typeof success === 'function' ? success(r) : success);
        return r;
    } catch (e) {
        toast.fromError(e, error);
        return undefined;
    }
};
