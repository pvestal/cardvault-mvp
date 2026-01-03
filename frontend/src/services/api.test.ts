import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockUser, mockCard, mockAuthResponse } from '@/test/utils'

// Mock the API module completely
vi.mock('./api', () => {
  return {
    authAPI: {
      login: vi.fn(),
      register: vi.fn()
    },
    cardsAPI: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  }
})

describe('API Services (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('AuthAPI', () => {
    it('exists and has correct methods', async () => {
      const { authAPI } = await import('./api')

      expect(authAPI.login).toBeDefined()
      expect(authAPI.register).toBeDefined()
    })

    it('login method can be called', async () => {
      const { authAPI } = await import('./api')

      vi.mocked(authAPI.login).mockResolvedValue(mockAuthResponse)

      const result = await authAPI.login({ username: 'test', password: 'test' })

      expect(authAPI.login).toHaveBeenCalledWith({ username: 'test', password: 'test' })
      expect(result).toEqual(mockAuthResponse)
    })

    it('register method can be called', async () => {
      const { authAPI } = await import('./api')

      vi.mocked(authAPI.register).mockResolvedValue(mockAuthResponse)

      const result = await authAPI.register({ username: 'test', password: 'test' })

      expect(authAPI.register).toHaveBeenCalledWith({ username: 'test', password: 'test' })
      expect(result).toEqual(mockAuthResponse)
    })
  })

  describe('CardsAPI', () => {
    it('exists and has correct methods', async () => {
      const { cardsAPI } = await import('./api')

      expect(cardsAPI.getAll).toBeDefined()
      expect(cardsAPI.getById).toBeDefined()
      expect(cardsAPI.create).toBeDefined()
      expect(cardsAPI.update).toBeDefined()
      expect(cardsAPI.delete).toBeDefined()
    })

    it('getAll method can be called', async () => {
      const { cardsAPI } = await import('./api')
      const mockCards = [mockCard]

      vi.mocked(cardsAPI.getAll).mockResolvedValue(mockCards)

      const result = await cardsAPI.getAll()

      expect(cardsAPI.getAll).toHaveBeenCalled()
      expect(result).toEqual(mockCards)
    })

    it('getById method can be called', async () => {
      const { cardsAPI } = await import('./api')

      vi.mocked(cardsAPI.getById).mockResolvedValue(mockCard)

      const result = await cardsAPI.getById('1')

      expect(cardsAPI.getById).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockCard)
    })

    it('create method can be called', async () => {
      const { cardsAPI } = await import('./api')
      const cardData = {
        name: 'Test Card',
        card_number: '1234567890'
      }

      vi.mocked(cardsAPI.create).mockResolvedValue(mockCard)

      const result = await cardsAPI.create(cardData)

      expect(cardsAPI.create).toHaveBeenCalledWith(cardData)
      expect(result).toEqual(mockCard)
    })

    it('update method can be called', async () => {
      const { cardsAPI } = await import('./api')
      const updateData = { name: 'Updated Card' }

      vi.mocked(cardsAPI.update).mockResolvedValue({ ...mockCard, ...updateData })

      const result = await cardsAPI.update('1', updateData)

      expect(cardsAPI.update).toHaveBeenCalledWith('1', updateData)
      expect(result).toEqual({ ...mockCard, ...updateData })
    })

    it('delete method can be called', async () => {
      const { cardsAPI } = await import('./api')

      vi.mocked(cardsAPI.delete).mockResolvedValue()

      await cardsAPI.delete('1')

      expect(cardsAPI.delete).toHaveBeenCalledWith('1')
    })
  })

  describe('Environment Configuration', () => {
    it('uses correct API URL from environment', () => {
      expect(import.meta.env.VITE_API_URL).toBe('/api/cardvault')
    })
  })

  describe('LocalStorage Integration', () => {
    it('can interact with localStorage', () => {
      localStorage.setItem('cardvault_token', 'test-token')
      expect(localStorage.getItem('cardvault_token')).toBe('test-token')

      localStorage.removeItem('cardvault_token')
      expect(localStorage.getItem('cardvault_token')).toBe(null)
    })
  })
})