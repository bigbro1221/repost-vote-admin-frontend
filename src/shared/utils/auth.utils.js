import Cookies from 'universal-cookie';

const cookies = new Cookies(null, { path: '/' });
const authTokenKey = process.env.NEXT_PUBLIC_AUTH_COOKIE || 'auth-token';

export const getAuthToken = () => cookies.get(authTokenKey);

export const setAuthToken = value => cookies.set(
  authTokenKey, value
);

export const deleteAuthToken = () => cookies.remove(authTokenKey);
