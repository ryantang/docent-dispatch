import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Global test configuration
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// MSW server setup
beforeAll(() => {
  // Start the MSW server
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  // Reset any request handlers that may have been added during tests
  server.resetHandlers()
})

afterAll(() => {
  // Clean up after all tests are done
  server.close()
})