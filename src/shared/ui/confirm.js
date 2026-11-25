'use client';
import {create} from 'zustand';

export const useConfirmStore = create(set => ({
    request: null,
    open: request => set({request}),
    close: () => set({request: null}),
}));

/**
 * Promise-based confirm dialog.
 * confirmAction({title, description, confirmText, tone:'danger'|'default', icon}) → Promise<boolean>
 */
export const confirmAction = opts => new Promise(resolve => {
    useConfirmStore.getState().open({...opts, resolve});
});
