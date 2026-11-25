import { api } from './axios';

// Nothing long-polls any more (iOS kills long requests when switching to Telegram) → short timeouts.
const TIMEOUT = 15_000;

export const signIn = async ({
  login,
  password
}) => {
  const { data } = await api
    .post('admin/sign-in', {
      login,
      password
    }, {
      timeout: TIMEOUT
    });

  return data;
};

/**
 * Ticket-based Telegram 2FA sign-in.
 * → {token} (2FA bypass, logged in immediately) | {status:'pending', ticket, expiresIn}
 */
export const signInTicket = async ({ login, password }) =>
  (await api.post('admin/sign-in', { login, password, mode: 'ticket' }, { timeout: TIMEOUT })).data;

// → {status:'pending'} | {status:'approved', token} | {status:'denied'|'timeout'|'cancelled'}; 404 {status:'expired'}
export const signInStatus = async ticket =>
  (await api.post('admin/sign-in/status', { ticket }, { timeout: TIMEOUT })).data;

export const signInCancel = async ticket =>
  (await api.post('admin/sign-in/cancel', { ticket }, { timeout: TIMEOUT })).data;

export const signOut = async () => {
  const { success } = await api
    .delete('admin/sign-out');

  return success;
};
