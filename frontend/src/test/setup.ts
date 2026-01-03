import { vi } from 'vitest'

// Mock localStorage with proper implementation
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}

  return {
    getItem: vi.fn((key: string) => {
      return store[key] || null
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    }
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Mock window.location with full interface
const locationMock = {
  href: '',
  protocol: 'http:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
  origin: 'http://localhost',
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
  ancestorOrigins: [] as any,
}

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
})

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:3000/api',
    MODE: 'test',
    BASE_URL: '/cardvault/',
    DEV: false,
    PROD: false,
    SSR: false
  }
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Reset localStorage store
  localStorageMock.clear()
  // Reset location
  locationMock.href = ''
  locationMock.pathname = '/'
  locationMock.search = ''
  locationMock.hash = ''
})