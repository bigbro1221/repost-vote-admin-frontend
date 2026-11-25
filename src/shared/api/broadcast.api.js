import { api } from './axios';

export const listBroadcasts = async () => (await api.get('broadcast')).data;
export const getBroadcast = async id => (await api.get(`broadcast/${id}`)).data;
export const createBroadcast = async data => (await api.post('broadcast', data)).data;
export const updateBroadcast = async (id, data) => (await api.put(`broadcast/${id}`, data)).data;
// confirmTotal must equal the current audience size (server guard, 400 CONFIRMATION_MISMATCH)
export const sendBroadcast = async (id, confirmTotal) => (await api.post(`broadcast/${id}/send`, {confirmTotal})).data;
export const cancelBroadcast = async id => (await api.post(`broadcast/${id}/cancel`)).data;
export const sendTestBroadcast = async data => (await api.post('broadcast/test', data)).data;

// exact recipient count: GET /broadcast/audience -> {total}. No fallback: the send guard needs the server's number.
export const countRecipients = async () => {
  const { data } = await api.get('broadcast/audience');
  if (typeof data?.total !== 'number') throw new Error('Не удалось получить число получателей');
  return data.total;
};

// "Delete for everyone": confirmTotal must equal the number of delivered messages (409 codes: BROADCAST_STILL_SENDING,
// RECALL_IN_PROGRESS, ALREADY_RECALLED, RECALL_WINDOW_EXPIRED, NOTHING_TO_RECALL)
export const recallBroadcast = async (id, confirmTotal) => (await api.post(`broadcast/${id}/recall`, {confirmTotal})).data;
