import {api} from './axios'
import {getYear} from '../store/edition.store'

// All helpers throw on error — callers surface it (toast / SWR error state).
export const fetchAllCandidates = async (year = getYear()) => (await api.get('candidate', {params: {year}})).data
export const fetchCandidatesNames = async (id, year = getYear()) => (await api.get(`/candidate/nomination/${id}/names`, {params: {year}})).data
export const fetchOneCandidate = async (id, year = getYear()) => (await api.get(`/candidate/rating/${id}`, {params: {year}})).data
export const updateCandidate = async (id, data) => (await api.put(`candidate/${id}`, data)).data
export const createCandidate = async data => (await api.post('candidate', data)).data
export const deleteCandidate = async id => (await api.delete(`candidate/${id}`)).data
// {nomination, ids:[...]} full new order (preferred) or legacy {id, destinationIndex}
export const updateCandidateOrder = async (data) => (await api.post('candidate/updateOrder', {year: getYear(), ...data})).data
