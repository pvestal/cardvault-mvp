import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import { authAPI } from '@/services/api'
import { mockUser, mockAuthResponse } from '@/test/utils'

// Mock the authAPI
vi.mock('@/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn()
  }
}))

describe('Auth Store', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('initializes with null user', () => {
      expect(authStore.user).toBeNull()
    })

    it('initializes with loading false', () => {
      expect(authStore.loading).toBe(false)
    })

    it('initializes with null error', () => {
      expect(authStore.error).toBeNull()
    })

    it('initializes isAuthenticated as false', () => {
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('localStorage Initialization', () => {
    it('loads user from localStorage on store creation', () => {
      const userData = JSON.stringify(mockUser)
      localStorage.setItem('cardvault_user', userData)

      // Create new store instance to trigger initialization
      setActivePinia(createPinia())
      authStore = useAuthStore()

      expect(authStore.user).toEqual(mockUser)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('cardvault_user', 'invalid-json')
      localStorage.setItem('cardvault_token', 'some-token')

      // Create new store instance
      setActivePinia(createPinia())
      authStore = useAuthStore()

      expect(authStore.user).toBeNull()
      expect(localStorage.getItem('cardvault_user')).toBeNull()
      expect(localStorage.getItem('cardvault_token')).toBeNull()
    })

    it('ignores empty localStorage', () => {
      // Create new store instance with empty localStorage
      setActivePinia(createPinia())
      authStore = useAuthStore()

      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('returns true for isAuthenticated when user exists', () => {
      authStore.user = mockUser
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('returns false for isAuthenticated when user is null', () => {
      authStore.user = null
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Login', () => {
    const credentials = { username: 'testuser', password: 'password123' }

    it('successfully logs in user', async () => {
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)

      const result = await authStore.login(credentials)

      expect(result).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.error).toBeNull()
      expect(authStore.loading).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('cardvault_user', JSON.stringify(mockUser))
      expect(localStorage.setItem).toHaveBeenCalledWith('cardvault_token', mockAuthResponse.token)
    })

    it('handles login failure with API error message', async () => {
      const errorMessage = 'Invalid credentials'
      vi.mocked(authAPI.login).mockRejectedValue({
        response: { data: { error: errorMessage } }
      })

      const result = await authStore.login(credentials)

      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.error).toBe(errorMessage)
      expect(authStore.loading).toBe(false)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('handles login failure with generic error', async () => {
      vi.mocked(authAPI.login).mockRejectedValue(new Error('Network error'))

      const result = await authStore.login(credentials)

      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.error).toBe('Login failed')
      expect(authStore.loading).toBe(false)
    })

    it('sets loading state during login', async () => {
      let resolveLogin: any
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })
      vi.mocked(authAPI.login).mockReturnValue(loginPromise)

      const loginCall = authStore.login(credentials)

      expect(authStore.loading).toBe(true)
      expect(authStore.error).toBeNull()

      resolveLogin(mockAuthResponse)
      await loginCall

      expect(authStore.loading).toBe(false)
    })

    it('clears error before login attempt', async () => {
      authStore.error = 'Previous error'
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)

      await authStore.login(credentials)

      expect(authStore.error).toBeNull()
    })
  })

  describe('Register', () => {
    const registerData = { username: 'newuser', password: 'newpassword' }

    it('successfully registers user', async () => {
      vi.mocked(authAPI.register).mockResolvedValue(mockAuthResponse)

      const result = await authStore.register(registerData)

      expect(result).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.error).toBeNull()
      expect(authStore.loading).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('cardvault_user', JSON.stringify(mockUser))
      expect(localStorage.setItem).toHaveBeenCalledWith('cardvault_token', mockAuthResponse.token)
    })

    it('handles registration failure with API error message', async () => {
      const errorMessage = 'Username already exists'
      vi.mocked(authAPI.register).mockRejectedValue({
        response: { data: { error: errorMessage } }
      })

      const result = await authStore.register(registerData)

      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.error).toBe(errorMessage)
      expect(authStore.loading).toBe(false)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('handles registration failure with generic error', async () => {
      vi.mocked(authAPI.register).mockRejectedValue(new Error('Network error'))

      const result = await authStore.register(registerData)

      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.error).toBe('Registration failed')
      expect(authStore.loading).toBe(false)
    })

    it('sets loading state during registration', async () => {
      let resolveRegister: any
      const registerPromise = new Promise(resolve => {
        resolveRegister = resolve
      })
      vi.mocked(authAPI.register).mockReturnValue(registerPromise)

      const registerCall = authStore.register(registerData)

      expect(authStore.loading).toBe(true)
      expect(authStore.error).toBeNull()

      resolveRegister(mockAuthResponse)
      await registerCall

      expect(authStore.loading).toBe(false)
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      // Set up authenticated state
      authStore.user = mockUser
      localStorage.setItem('cardvault_user', JSON.stringify(mockUser))
      localStorage.setItem('cardvault_token', 'some-token')
    })

    it('clears user state', () => {
      authStore.logout()

      expect(authStore.user).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('removes data from localStorage', () => {
      authStore.logout()

      expect(localStorage.removeItem).toHaveBeenCalledWith('cardvault_user')
      expect(localStorage.removeItem).toHaveBeenCalledWith('cardvault_token')
    })

    it('can be called multiple times safely', () => {
      authStore.logout()
      authStore.logout()

      expect(authStore.user).toBeNull()
    })
  })

  describe('clearError', () => {
    it('clears the error message', () => {
      authStore.error = 'Some error'

      authStore.clearError()

      expect(authStore.error).toBeNull()
    })

    it('can be called when no error exists', () => {
      expect(authStore.error).toBeNull()

      authStore.clearError()

      expect(authStore.error).toBeNull()
    })
  })

  describe('Integration Tests', () => {
    it('handles complete login flow', async () => {
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)

      expect(authStore.isAuthenticated).toBe(false)

      const result = await authStore.login({
        username: 'testuser',
        password: 'password123'
      })

      expect(result).toBe(true)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.error).toBeNull()
      expect(authStore.loading).toBe(false)
    })

    it('handles complete logout flow', async () => {
      // Setup authenticated state
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)
      await authStore.login({ username: 'testuser', password: 'password123' })

      expect(authStore.isAuthenticated).toBe(true)

      authStore.logout()

      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('handles error clearing between operations', async () => {
      // Fail login first
      vi.mocked(authAPI.login).mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } }
      })

      await authStore.login({ username: 'wrong', password: 'wrong' })
      expect(authStore.error).toBe('Invalid credentials')

      // Clear error
      authStore.clearError()
      expect(authStore.error).toBeNull()

      // Successful login should not have error
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)
      await authStore.login({ username: 'correct', password: 'correct' })

      expect(authStore.error).toBeNull()
      expect(authStore.isAuthenticated).toBe(true)
    })
  })

  describe('State Persistence', () => {
    it('persists authentication state across store recreations', async () => {
      // Login and persist state
      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)
      await authStore.login({ username: 'testuser', password: 'password123' })

      expect(authStore.isAuthenticated).toBe(true)

      // Simulate page reload by creating new store
      setActivePinia(createPinia())
      const newAuthStore = useAuthStore()

      expect(newAuthStore.isAuthenticated).toBe(true)
      expect(newAuthStore.user).toEqual(mockUser)
    })

    it('handles corrupted localStorage data during reconstruction', () => {
      // Manually set corrupted data
      localStorage.setItem('cardvault_user', 'corrupted-data')
      localStorage.setItem('cardvault_token', 'some-token')

      // Create new store - should handle corruption gracefully
      setActivePinia(createPinia())
      const newAuthStore = useAuthStore()

      expect(newAuthStore.user).toBeNull()
      expect(newAuthStore.isAuthenticated).toBe(false)
      expect(localStorage.getItem('cardvault_user')).toBeNull()
      expect(localStorage.getItem('cardvault_token')).toBeNull()
    })
  })
})