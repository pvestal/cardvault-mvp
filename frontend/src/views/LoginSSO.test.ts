import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LoginSSO from './LoginSSO.vue'
import { createTestPinia, mockUser } from '@/test/utils'
import { useAuthStore } from '@/stores/auth'

// Mock the API module
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        providers: [
          { name: 'google', enabled: true },
          { name: 'apple', enabled: true }
        ]
      }
    })
  }
}))

// Mock router
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
      replace: mockRouterReplace
    }),
    useRoute: () => ({
      query: {}
    })
  }
})

describe('LoginSSO Component (Simplified)', () => {
  let wrapper: any
  let authStore: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset window.location
    window.location.href = ''

    // Create fresh instances for each test
    pinia = createTestPinia()
    authStore = useAuthStore(pinia)
  })

  const createWrapper = (routeQuery = {}) => {
    return mount(LoginSSO, {
      global: {
        plugins: [pinia],
        mocks: {
          $route: {
            query: routeQuery
          },
          $router: {
            push: mockRouterPush,
            replace: mockRouterReplace
          }
        },
        stubs: {
          RouterLink: true,
          RouterView: true
        }
      }
    })
  }

  describe('Basic Rendering', () => {
    it('renders login form by default', () => {
      wrapper = createWrapper()

      expect(wrapper.find('h1').text()).toBe('Sign In')
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('.submit-btn').text()).toBe('Sign In')
    })

    it('displays toggle button to switch modes', () => {
      wrapper = createWrapper()

      const toggleBtn = wrapper.find('.link-btn')
      expect(toggleBtn.exists()).toBe(true)
      expect(toggleBtn.text()).toBe('Need an account? Sign up')
    })

    it('has proper form structure', () => {
      wrapper = createWrapper()

      expect(wrapper.find('form').exists()).toBe(true)
      const formGroups = wrapper.findAll('.form-group')
      expect(formGroups.length).toBeGreaterThan(0)
    })
  })

  describe('Mode Switching', () => {
    it('switches to registration mode when toggle is clicked', async () => {
      wrapper = createWrapper()

      await wrapper.find('.link-btn').trigger('click')
      await nextTick()

      expect(wrapper.find('h1').text()).toBe('Create Account')
      expect(wrapper.find('.submit-btn').text()).toBe('Create Account')
      expect(wrapper.find('.link-btn').text()).toBe('Already have an account? Sign in')
    })

    it('clears errors when switching modes', async () => {
      wrapper = createWrapper()

      // Set an error
      authStore.error = 'Test error'
      await nextTick()

      expect(wrapper.find('.error').exists()).toBe(true)

      // Switch modes
      await wrapper.find('.link-btn').trigger('click')
      await nextTick()

      expect(authStore.error).toBeNull()
    })
  })

  describe('Form Validation and Input', () => {
    it('accepts user input in form fields', async () => {
      wrapper = createWrapper()

      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')

      expect(usernameInput.element.value).toBe('testuser')
      expect(passwordInput.element.value).toBe('password123')
    })

    it('has required attributes on form fields', () => {
      wrapper = createWrapper()

      expect(wrapper.find('input[type="text"]').attributes('required')).toBeDefined()
      expect(wrapper.find('input[type="password"]').attributes('required')).toBeDefined()
    })

    it('disables form fields when loading', async () => {
      wrapper = createWrapper()

      authStore.loading = true
      await nextTick()

      expect(wrapper.find('input[type="text"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('input[type="password"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined()
    })

    it('shows loading state in submit button', async () => {
      wrapper = createWrapper()

      authStore.loading = true
      await nextTick()

      expect(wrapper.find('.submit-btn').text()).toBe('Please wait...')
    })
  })

  describe('Form Submission', () => {
    it('calls login with correct credentials', async () => {
      wrapper = createWrapper()

      const loginSpy = vi.spyOn(authStore, 'login').mockResolvedValue(true)

      await wrapper.find('input[type="text"]').setValue('testuser')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit.prevent')

      expect(loginSpy).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      })
    })

    it('calls register when in registration mode', async () => {
      wrapper = createWrapper()

      // Switch to registration mode
      await wrapper.find('.link-btn').trigger('click')
      await nextTick()

      const registerSpy = vi.spyOn(authStore, 'register').mockResolvedValue(true)

      await wrapper.find('input[type="text"]').setValue('newuser')
      await wrapper.find('input[type="password"]').setValue('newpassword')
      await wrapper.find('form').trigger('submit.prevent')

      expect(registerSpy).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'newpassword'
      })
    })

    it('redirects to home on successful login', async () => {
      wrapper = createWrapper()

      vi.spyOn(authStore, 'login').mockResolvedValue(true)

      await wrapper.find('input[type="text"]').setValue('testuser')
      await wrapper.find('input[type="password"]').setValue('password123')
      await wrapper.find('form').trigger('submit.prevent')
      await nextTick()

      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })

    it('does not redirect on failed login', async () => {
      wrapper = createWrapper()

      vi.spyOn(authStore, 'login').mockResolvedValue(false)

      await wrapper.find('form').trigger('submit.prevent')
      await nextTick()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('displays authentication errors', async () => {
      wrapper = createWrapper()

      authStore.error = 'Invalid credentials'
      await nextTick()

      const errorElement = wrapper.find('.error')
      expect(errorElement.exists()).toBe(true)
      expect(errorElement.text()).toBe('Invalid credentials')
    })

    it('hides error when none exists', () => {
      wrapper = createWrapper()

      expect(wrapper.find('.error').exists()).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and IDs', () => {
      wrapper = createWrapper()

      const usernameLabel = wrapper.find('label[for="username"]')
      const usernameInput = wrapper.find('input#username')
      const passwordLabel = wrapper.find('label[for="password"]')
      const passwordInput = wrapper.find('input#password')

      expect(usernameLabel.exists()).toBe(true)
      expect(usernameInput.exists()).toBe(true)
      expect(passwordLabel.exists()).toBe(true)
      expect(passwordInput.exists()).toBe(true)

      expect(usernameLabel.text()).toBe('Username')
      expect(passwordLabel.text()).toBe('Password')
    })

    it('has proper autocomplete attributes', () => {
      wrapper = createWrapper()

      expect(wrapper.find('input#username').attributes('autocomplete')).toBe('username')
      expect(wrapper.find('input#password').attributes('autocomplete')).toBe('current-password')
    })
  })

  describe('Store Integration', () => {
    it('reflects auth store state correctly', async () => {
      wrapper = createWrapper()

      // Test initial state
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBe(null)

      // Test loading state
      authStore.loading = true
      await nextTick()

      expect(wrapper.find('.submit-btn').text()).toContain('Please wait')

      // Test error state
      authStore.loading = false
      authStore.error = 'Test error'
      await nextTick()

      expect(wrapper.find('.error').text()).toBe('Test error')
    })

    it('can clear errors through store methods', async () => {
      wrapper = createWrapper()

      authStore.error = 'Test error'
      await nextTick()

      expect(wrapper.find('.error').exists()).toBe(true)

      authStore.clearError()
      await nextTick()

      expect(wrapper.find('.error').exists()).toBe(false)
    })
  })

  describe('Component Lifecycle', () => {
    it('mounts without errors', () => {
      expect(() => {
        wrapper = createWrapper()
      }).not.toThrow()
    })

    it('unmounts without errors', () => {
      wrapper = createWrapper()

      expect(() => {
        wrapper.unmount()
      }).not.toThrow()
    })
  })
})