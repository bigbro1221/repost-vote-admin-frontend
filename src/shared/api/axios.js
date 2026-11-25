'use client';

import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// attach interceptors lazily (client-side only)
export const attachAuthInterceptors = (useAuthStore) => {
  api.interceptors.request.use(request => {
    const token = useAuthStore.getState().token;

    if (token) {
      request.headers.Authorization = token;
    }

    return request;
  });

  api.interceptors.response.use(
    response => {
      response.success =
        response.status >= 200 && response.status < 300;
      return response;
    },
    error => {
      // a 401 from the sign-in request itself means "wrong credentials", not "session expired"
      const isSignIn = /admin\/sign-(in|out)/.test(String(error?.config?.url ?? ''));
      if (error?.response?.status === 401 && !isSignIn) {
        useAuthStore.getState().signOut();
      }
      return Promise.reject(error);
    }
  );
};
