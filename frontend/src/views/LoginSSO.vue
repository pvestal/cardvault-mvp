<template>
  <div class="login-container">
    <div class="login-card">
      <h1>{{ isLogin ? 'Sign In' : 'Create Account' }}</h1>

      <!-- SSO Options -->
      <div class="sso-section" v-if="isLogin">
        <button
          @click="loginWithGoogle"
          class="sso-btn google-btn"
          v-if="hasGoogleSSO"
        >
          <svg viewBox="0 0 24 24" class="sso-icon">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          @click="loginWithApple"
          class="sso-btn apple-btn"
          v-if="hasAppleSSO"
        >
          <svg viewBox="0 0 24 24" class="sso-icon">
            <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>

        <div class="divider">
          <span>or</span>
        </div>
      </div>

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
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLogin = ref(true);
const username = ref('');
const password = ref('');
const ssoProviders = ref<any[]>([]);

// Check for SSO token in URL params (from OAuth callback)
onMounted(async () => {
  const token = route.query.token as string;
  const userStr = route.query.user as string;

  if (token && userStr) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr));

      // Set user and token in auth store
      authStore.user = user;
      localStorage.setItem('cardvault_user', JSON.stringify(user));
      localStorage.setItem('cardvault_token', token);

      router.replace('/');
    } catch (error) {
      console.error('Failed to parse SSO response:', error);
      authStore.error = 'Authentication failed. Please try again.';
    }
  }

  // Check for available SSO providers
  try {
    const response = await api.get('/auth/providers');
    ssoProviders.value = response.data.providers || [];
  } catch (error) {
    console.error('Failed to fetch SSO providers:', error);
  }
});

const hasGoogleSSO = computed(() =>
  ssoProviders.value.some(p => p.name === 'google')
);

const hasAppleSSO = computed(() =>
  ssoProviders.value.some(p => p.name === 'apple')
);

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

const loginWithGoogle = () => {
  // CardVault's own Google OAuth endpoint
  window.location.href = '/api/cardvault/auth/google';
};

const loginWithApple = () => {
  // CardVault's own Apple OAuth endpoint (when configured)
  window.location.href = '/api/cardvault/auth/apple';
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

.sso-section {
  margin-bottom: 1.5rem;
}

.sso-btn {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.sso-btn:hover {
  background: #f8f9fa;
  border-color: #d0d5db;
}

.google-btn:hover {
  border-color: #4285F4;
}

.apple-btn {
  background: #000;
  color: white;
  border-color: #000;
}

.apple-btn:hover {
  background: #333;
  border-color: #333;
}

.sso-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.divider {
  text-align: center;
  margin: 1.5rem 0 1rem;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e1e5e9;
}

.divider span {
  background: white;
  padding: 0 1rem;
  position: relative;
  color: #999;
  font-size: 0.9rem;
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