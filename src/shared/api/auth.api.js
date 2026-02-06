import { api } from './axios';

export const signIn = async ({
  login,
  password
}) => {
  const { data } = await api
    .post('admin/sign-in', {
      login,
      password
    });

  return data;
};

export const signOut = async () => {
  const { success } = await api
    .delete('admin/sign-out');

  return success;
};
