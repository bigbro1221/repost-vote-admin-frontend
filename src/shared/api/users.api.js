import {api} from './axios'

export const fetchUsersInRange = async (params) => {
    try {
        const response = await api.get('user/range',{params})
        return response.data
    } catch (e) {
        console.log(e)
        return []
    }

}
