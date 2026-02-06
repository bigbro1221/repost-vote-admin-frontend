import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(
    request => {
        const token = useAuthStore.getState().token;

        if (token) {
            request.headers.Authorization = token;
        }

        return request;
    }
);

api.interceptors.response.use(
    response => {
        response.success = response.status >= 200
            && response.status < 300;

        return response;
    },
    error => {
        if (error.response.status === 401) {
            useAuthStore.getState().signOut();
        }

        return Promise.reject(error);
    }
);
