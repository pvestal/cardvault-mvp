import axios from 'axios';
import type { LoginCredentials, RegisterData, AuthResponse, Card, CreateCardData } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cardvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cardvault_token');
      localStorage.removeItem('cardvault_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

export const cardsAPI = {
  getAll: async (): Promise<Card[]> => {
    const response = await api.get('/cards');
    return response.data;
  },

  getById: async (id: string): Promise<Card> => {
    const response = await api.get(`/cards/${id}`);
    return response.data;
  },

  create: async (data: CreateCardData): Promise<Card> => {
    const response = await api.post('/cards', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateCardData>): Promise<Card> => {
    const response = await api.put(`/cards/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cards/${id}`);
  },
};

export default api;