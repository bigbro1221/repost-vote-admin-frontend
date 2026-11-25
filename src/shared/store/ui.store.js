'use client';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

const safeStorage = createJSONStorage(() => {
    try { return window.localStorage; } catch { return undefined; }
});

// Per-browser UI prefs (sidebar, accordion open state per year, admin login label)
export const useUiStore = create(persist(
    (set, get) => ({
        sidebarCollapsed: false,
        open: {},          // { [year]: { [nominationId]: true } }
        login: '',
        setLogin: login => set({login}),
        toggleSidebar: () => set(s => ({sidebarCollapsed: !s.sidebarCollapsed})),
        isOpen: (year, id) => !!get().open[year]?.[id],
        setOpen: (year, id, value) => set(s => ({open: {...s.open, [year]: {...(s.open[year] ?? {}), [id]: value}}})),
        setAllOpen: (year, ids, value) => set(s => ({
            open: {...s.open, [year]: value ? Object.fromEntries(ids.map(id => [id, true])) : {}},
        })),
    }),
    {name: 'admin-ui', storage: safeStorage, version: 1},
));
