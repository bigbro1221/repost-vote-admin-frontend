import { api } from './axios';

export const fetchEditions = async () => (await api.get('edition')).data;
export const fetchCurrentEdition = async () => (await api.get('edition/current')).data;
export const createEdition = async data => (await api.post('edition', data)).data;
export const updateEdition = async (year, data) => (await api.put(`edition/${year}`, data)).data;
export const cloneEdition = async (year, sourceYear, force = false) =>
  (await api.post(`edition/${year}/clone-from/${sourceYear}`, null, { params: force ? { force: 1 } : {} })).data;

export {errorMessage} from './errors';
