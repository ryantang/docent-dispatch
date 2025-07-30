import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup MSW server for Node.js (test environment)
export const server = setupServer(...handlers)

// Export for test configuration
export { handlers }