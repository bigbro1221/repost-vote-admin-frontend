import { api } from './axios';

const unwrap = d => Array.isArray(d) ? { items: d, total: d.length } : { items: d?.items ?? [], total: d?.total ?? d?.items?.length ?? 0 };

export const fetchAdminNews = async (candidate, status) =>
  unwrap((await api.get('news/admin', { params: { candidate, ...(status ? { status } : {}), limit: 200 } })).data);
export const addNews = async (candidate, input) => (await api.post('news', { candidate, input })).data;
export const patchNews = async (id, data) => (await api.patch(`news/${id}`, data)).data;
export const deleteNews = async id => (await api.delete(`news/${id}`)).data;
export const fetchNews = async ({ candidate, year }) =>
  (await api.post('news/fetch', candidate ? { candidate } : { year })).data;
