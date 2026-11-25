import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { deleteAuthToken, getAuthToken, setAuthToken } from "../utils/auth.utils";
import { signIn, signOut } from "../api/auth.api";

const createState = (set) => {
  const token = getAuthToken();

  return {
    isAuth: !!token,
    token,
    signIn: async ({ login, password }) => {
      const { token } = await signIn({ login, password });
      const isAuth = !!token;
  
      set({ isAuth, token });
      isAuth && setAuthToken(token);

      return isAuth;
    },
    signOut: async () => {
      set({ isAuth: false });
      deleteAuthToken();
      signOut().catch(() => {});
    }
  };
};

export const useAuthStore = create(devtools(createState));