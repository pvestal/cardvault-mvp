<template>
  <div class="login-container">
    <div class="login-card">
      <h1>{{ isLogin ? 'Sign In' : 'Create Account' }}</h1>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            :disabled="authStore.loading"
          />
        </div>

        <div v-if="authStore.error" class="error">
          {{ authStore.error }}
        </div>

        <button type="submit" :disabled="authStore.loading" class="submit-btn">
          {{ authStore.loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account') }}
        </button>
      </form>

      <div class="toggle-mode">
        <button @click="toggleMode" type="button" class="link-btn">
          {{ isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const username = ref('');
const password = ref('');

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  authStore.clearError();
};

const handleSubmit = async () => {
  const success = isLogin.value
    ? await authStore.login({ username: username.value, password: password.value })
    : await authStore.register({ username: username.value, password: password.value });

  if (success) {
    router.push('/');
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8d7da;
  border-radius: 4px;
  font-size: 0.9rem;
}

.toggle-mode {
  text-align: center;
  margin-top: 1rem;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

.link-btn:hover {
  color: #5a6fd8;
}
</style>