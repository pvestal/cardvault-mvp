import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * Create a fresh Pinia instance for testing
 */
export function createTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Create a test router with minimal routes
 */
export function createTestRouter(routes: RouteRecordRaw[] = []) {
  const defaultRoutes: RouteRecordRaw[] = [
    {
      path: '/',
      name: 'Home',
      component: { template: '<div>Home</div>' },
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'Login',
      component: { template: '<div>Login</div>' },
      meta: { requiresAuth: false }
    },
    {
      path: '/cards/:id',
      name: 'CardDetail',
      component: { template: '<div>Card Detail</div>' },
      meta: { requiresAuth: true }
    }
  ]

  return createRouter({
    history: createWebHistory(),
    routes: routes.length > 0 ? routes : defaultRoutes
  })
}

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: '1',
  username: 'testuser'
}

/**
 * Mock card data for testing
 */
export const mockCard = {
  id: '1',
  name: 'Test Card',
  card_number: '1234567890',
  pin: '1234',
  barcode_format: 'CODE128',
  balance: 100,
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z'
}

/**
 * Mock auth response for testing
 */
export const mockAuthResponse = {
  user: mockUser,
  token: 'mock-jwt-token'
}

/**
 * Helper to wait for Vue's nextTick and any async operations
 */
export async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}