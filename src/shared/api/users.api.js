import {api} from './axios'

export const fetchUsersInRange = async (params) => (await api.get('user/range', {params})).data
