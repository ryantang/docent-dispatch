import { authHandlers } from './auth'
import { tagRequestHandlers } from './tag-requests'

// Combine all MSW handlers
export const handlers = [
  ...authHandlers,
  ...tagRequestHandlers,
]