import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginCredentials, RegisterData } from '@/types';
import { authAPI } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Initialize from localStorage
  const savedUser = localStorage.getItem('cardvault_user');
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('cardvault_user');
      localStorage.removeItem('cardvault_token');
    }
  }

  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = null;

    try {
      const response = await authAPI.login(credentials);

      user.value = response.user;
      localStorage.setItem('cardvault_user', JSON.stringify(response.user));
      localStorage.setItem('cardvault_token', response.token);

      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(data: RegisterData) {
    loading.value = true;
    error.value = null;

    try {
      const response = await authAPI.register(data);

      user.value = response.user;
      localStorage.setItem('cardvault_user', JSON.stringify(response.user));
      localStorage.setItem('cardvault_token', response.token);

      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    localStorage.removeItem('cardvault_user');
    localStorage.removeItem('cardvault_token');
  }

  function clearError() {
    error.value = null;
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    clearError,
  };
});