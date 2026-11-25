import {api} from './axios'
import {getYear} from '../store/edition.store'

// All helpers throw on error — callers surface it (toast / SWR error state).
export const fetchAllNominations = async (year = getYear()) => (await api.get('nomination', {params: {year}})).data
export const fetchNominationsFull = async (year = getYear()) => (await api.get('nomination/full', {params: {year}})).data
export const updateNomination = async (data) => (await api.put(`nomination/${data._id}`, data)).data
export const createNomination = async data => (await api.post('nomination', {year: getYear(), ...data})).data
export const deleteNomination = async id => (await api.delete(`nomination/${id}`)).data
// {ids:[...]} full new order (preferred) or legacy {id, sourceOrder, destinationOrder}
export const updateNominationOrder = async (data) => (await api.post('nomination/updateOrder', {year: getYear(), ...data})).data
