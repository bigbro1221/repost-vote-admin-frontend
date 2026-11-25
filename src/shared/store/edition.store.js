import { create } from "zustand";
import Cookies from 'universal-cookie';

const cookies = new Cookies(null, { path: '/', sameSite: 'lax' });
const YEAR_COOKIE = 'admin-year';

const readCookieYear = () => {
  const v = Number(cookies.get(YEAR_COOKIE));
  return Number.isInteger(v) && v > 2000 ? v : null;
};

export const useEditionStore = create((set) => ({
  year: readCookieYear(),
  editions: [],
  setEditions: editions => set({ editions }),
  setYear: year => {
    year = Number(year);
    cookies.set(YEAR_COOKIE, String(year), { maxAge: 60 * 60 * 24 * 365 });
    set({ year });
  },
}));

// non-hook accessor for api modules
export const getYear = () => useEditionStore.getState().year ?? undefined;
export const useYear = () => useEditionStore(s => s.year);
